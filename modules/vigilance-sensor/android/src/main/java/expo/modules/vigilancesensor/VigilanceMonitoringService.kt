package expo.modules.vigilancesensor

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import kotlin.math.sqrt

class VigilanceMonitoringService : Service(), SensorEventListener {
  private lateinit var sensorManager: SensorManager
  private var accelerometer: Sensor? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var mediaPlayer: MediaPlayer? = null
  private var vibrator: Vibrator? = null

  private var threshold = DEFAULT_THRESHOLD
  private var audioUri = ""
  private var armedAtElapsed = 0L
  private var armedAtWall = 0L
  private var alarming = false
  private var previousX: Float? = null
  private var previousY: Float? = null
  private var previousZ: Float? = null
  private var smoothedMotion = 0f
  private var consecutiveHits = 0
  private var lastPersistedAt = 0L
  private var lastNotificationState = ""

  override fun onCreate() {
    super.onCreate()
    sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
    accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    vibrator = resolveVibrator()
    createNotificationChannels()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      markStopped(this)
      stopSelf()
      return START_NOT_STICKY
    }

    val preferences = preferences(this)
    val requestedState = preferences.getString(KEY_STATE, STATE_STOPPED) ?: STATE_STOPPED
    if (intent == null && requestedState == STATE_STOPPED) {
      stopSelf()
      return START_NOT_STICKY
    }

    threshold = intent?.getFloatExtra(EXTRA_THRESHOLD, DEFAULT_THRESHOLD)
      ?: preferences.getFloat(KEY_THRESHOLD, DEFAULT_THRESHOLD)
    audioUri = intent?.getStringExtra(EXTRA_AUDIO_URI)
      ?: preferences.getString(KEY_AUDIO_URI, "").orEmpty()

    val graceMs = intent?.getLongExtra(EXTRA_GRACE_MS, DEFAULT_GRACE_MS)
      ?: DEFAULT_GRACE_MS
    armedAtWall = preferences.getLong(KEY_ARMED_AT, System.currentTimeMillis() + graceMs)
    val remainingGrace = (armedAtWall - System.currentTimeMillis()).coerceAtLeast(0L)
    armedAtElapsed = SystemClock.elapsedRealtime() + remainingGrace

    startInForeground(requestedState)
    acquireWakeLock()

    if (requestedState == STATE_ALARMING) {
      alarming = true
      startAlarmPlayback()
      updateNotification(STATE_ALARMING)
      return START_STICKY
    }

    val sensor = accelerometer
    if (sensor == null) {
      writeStatus(STATE_ERROR, error = "El dispositivo no tiene acelerómetro.")
      updateNotification(STATE_ERROR)
      stopSelf()
      return START_NOT_STICKY
    }

    alarming = false
    previousX = null
    previousY = null
    previousZ = null
    smoothedMotion = 0f
    consecutiveHits = 0
    sensorManager.unregisterListener(this)
    sensorManager.registerListener(this, sensor, SENSOR_INTERVAL_US)
    val currentState = if (remainingGrace > 0L) STATE_ARMING else STATE_ARMED
    writeStatus(currentState)
    updateNotification(currentState)
    return START_STICKY
  }

  override fun onSensorChanged(event: SensorEvent) {
    if (event.sensor.type != Sensor.TYPE_ACCELEROMETER || alarming) return

    val x = event.values[0] / SensorManager.GRAVITY_EARTH
    val y = event.values[1] / SensorManager.GRAVITY_EARTH
    val z = event.values[2] / SensorManager.GRAVITY_EARTH
    val lastX = previousX
    val lastY = previousY
    val lastZ = previousZ
    val delta = if (lastX == null || lastY == null || lastZ == null) {
      0f
    } else {
      sqrt(
        ((x - lastX) * (x - lastX) +
          (y - lastY) * (y - lastY) +
          (z - lastZ) * (z - lastZ)).toDouble()
      ).toFloat()
    }

    previousX = x
    previousY = y
    previousZ = z
    smoothedMotion = if (smoothedMotion == 0f) delta else (smoothedMotion * 0.65f) + (delta * 0.35f)

    val nowElapsed = SystemClock.elapsedRealtime()
    val state = if (nowElapsed < armedAtElapsed) STATE_ARMING else STATE_ARMED

    if (state == STATE_ARMED) {
      consecutiveHits = if (smoothedMotion >= threshold) consecutiveHits + 1 else (consecutiveHits - 1).coerceAtLeast(0)
      if (consecutiveHits >= REQUIRED_HITS) {
        triggerAlarm(x, y, z, smoothedMotion)
        return
      }
    }

    if (nowElapsed - lastPersistedAt >= STATUS_UPDATE_MS) {
      writeStatus(state, x, y, z, smoothedMotion)
      if (state != lastNotificationState) updateNotification(state)
      lastPersistedAt = nowElapsed
    }
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

  private fun triggerAlarm(x: Float, y: Float, z: Float, motion: Float) {
    alarming = true
    sensorManager.unregisterListener(this)
    writeStatus(
      state = STATE_ALARMING,
      x = x,
      y = y,
      z = z,
      motion = motion,
      triggeredAt = System.currentTimeMillis()
    )
    startAlarmPlayback()
    startAlarmVibration()
    updateNotification(STATE_ALARMING)
  }

  private fun startAlarmPlayback() {
    if (mediaPlayer?.isPlaying == true || audioUri.isBlank()) return
    try {
      mediaPlayer?.release()
      mediaPlayer = MediaPlayer().apply {
        setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        )
        setDataSource(this@VigilanceMonitoringService, Uri.parse(audioUri))
        isLooping = true
        prepare()
        start()
      }
    } catch (error: Exception) {
      writeStatus(
        state = STATE_ALARMING,
        error = "No se pudo reproducir la alarma: ${error.message ?: "error desconocido"}"
      )
    }
  }

  @Suppress("DEPRECATION")
  private fun startAlarmVibration() {
    val pattern = longArrayOf(0, 650, 250, 650, 400)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
    } else {
      vibrator?.vibrate(pattern, 0)
    }
  }

  private fun startInForeground(state: String) {
    val notification = buildNotification(state)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun updateNotification(state: String) {
    lastNotificationState = state
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(NOTIFICATION_ID, buildNotification(state))
  }

  @Suppress("DEPRECATION")
  private fun buildNotification(state: String): Notification {
    val alarmingNow = state == STATE_ALARMING
    val channelId = if (alarmingNow) ALARM_CHANNEL_ID else MONITOR_CHANNEL_ID
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pendingIntent = launchIntent?.let {
      PendingIntent.getActivity(
        this,
        0,
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }
    val title = if (alarmingNow) "¡Movimiento detectado!" else "Vigilancia activa"
    val text = when (state) {
      STATE_ARMING -> "Coloca el teléfono. La vigilancia se activará en unos segundos."
      STATE_ARMED -> "El acelerómetro está vigilando el dispositivo."
      STATE_ALARMING -> "Abre Vigilance y autentícate para detener la alarma."
      STATE_ERROR -> "No se pudo iniciar el sensor de movimiento."
      else -> "Vigilance está funcionando."
    }
    val icon = if (applicationInfo.icon != 0) applicationInfo.icon else android.R.drawable.ic_lock_idle_alarm
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, channelId)
    } else {
      Notification.Builder(this)
    }
    return builder
      .setSmallIcon(icon)
      .setContentTitle(title)
      .setContentText(text)
      .setOngoing(true)
      .setCategory(if (alarmingNow) Notification.CATEGORY_ALARM else Notification.CATEGORY_SERVICE)
      .setContentIntent(pendingIntent)
      .setOnlyAlertOnce(!alarmingNow)
      .build()
  }

  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.createNotificationChannel(
      NotificationChannel(
        MONITOR_CHANNEL_ID,
        "Vigilancia del dispositivo",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Notificación permanente mientras el acelerómetro vigila el dispositivo."
        setSound(null, null)
      }
    )
    manager.createNotificationChannel(
      NotificationChannel(
        ALARM_CHANNEL_ID,
        "Alarma de movimiento",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Aviso cuando Vigilance detecta que el dispositivo fue movido."
        setSound(null, null)
      }
    )
  }

  private fun acquireWakeLock() {
    if (wakeLock?.isHeld == true) return
    val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = powerManager.newWakeLock(
      PowerManager.PARTIAL_WAKE_LOCK,
      "$packageName:VigilanceMotionLock"
    ).apply { acquire() }
  }

  @Suppress("DEPRECATION")
  private fun resolveVibrator(): Vibrator =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      getSystemService(VibratorManager::class.java).defaultVibrator
    } else {
      getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }

  private fun writeStatus(
    state: String,
    x: Float = previousX ?: 0f,
    y: Float = previousY ?: 0f,
    z: Float = previousZ ?: 0f,
    motion: Float = smoothedMotion,
    triggeredAt: Long = preferences(this).getLong(KEY_TRIGGERED_AT, 0L),
    error: String = ""
  ) {
    preferences(this).edit()
      .putString(KEY_STATE, state)
      .putFloat(KEY_X, x)
      .putFloat(KEY_Y, y)
      .putFloat(KEY_Z, z)
      .putFloat(KEY_MOTION, motion)
      .putFloat(KEY_THRESHOLD, threshold)
      .putLong(KEY_ARMED_AT, armedAtWall)
      .putLong(KEY_TRIGGERED_AT, triggeredAt)
      .putString(KEY_ERROR, error)
      .apply()
  }

  override fun onDestroy() {
    sensorManager.unregisterListener(this)
    mediaPlayer?.run {
      try {
        stop()
      } catch (_: IllegalStateException) {
      }
      release()
    }
    mediaPlayer = null
    vibrator?.cancel()
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  companion object {
    const val ACTION_START = "expo.modules.vigilancesensor.START"
    const val ACTION_STOP = "expo.modules.vigilancesensor.STOP"
    const val EXTRA_GRACE_MS = "graceMs"
    const val EXTRA_THRESHOLD = "threshold"
    const val EXTRA_AUDIO_URI = "audioUri"

    private const val PREFERENCES = "vigilance-native-monitor"
    private const val KEY_STATE = "state"
    private const val KEY_X = "x"
    private const val KEY_Y = "y"
    private const val KEY_Z = "z"
    private const val KEY_MOTION = "motion"
    private const val KEY_THRESHOLD = "threshold"
    private const val KEY_ARMED_AT = "armedAt"
    private const val KEY_TRIGGERED_AT = "triggeredAt"
    private const val KEY_AUDIO_URI = "audioUri"
    private const val KEY_ERROR = "error"

    private const val STATE_STOPPED = "stopped"
    private const val STATE_ARMING = "arming"
    private const val STATE_ARMED = "armed"
    private const val STATE_ALARMING = "alarming"
    private const val STATE_ERROR = "error"

    private const val MONITOR_CHANNEL_ID = "vigilance_monitoring"
    private const val ALARM_CHANNEL_ID = "vigilance_alarm"
    private const val NOTIFICATION_ID = 4172
    private const val SENSOR_INTERVAL_US = 50_000
    private const val STATUS_UPDATE_MS = 200L
    private const val REQUIRED_HITS = 2
    private const val DEFAULT_GRACE_MS = 5_000L
    private const val DEFAULT_THRESHOLD = 0.32f

    private fun preferences(context: Context) =
      context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

    fun prepareStart(context: Context, graceMs: Long, threshold: Float, audioUri: String) {
      val armedAt = System.currentTimeMillis() + graceMs
      preferences(context).edit()
        .putString(KEY_STATE, STATE_ARMING)
        .putFloat(KEY_THRESHOLD, threshold)
        .putLong(KEY_ARMED_AT, armedAt)
        .putLong(KEY_TRIGGERED_AT, 0L)
        .putString(KEY_AUDIO_URI, audioUri)
        .putString(KEY_ERROR, "")
        .apply()
    }

    fun markStopped(context: Context) {
      preferences(context).edit()
        .putString(KEY_STATE, STATE_STOPPED)
        .putLong(KEY_TRIGGERED_AT, 0L)
        .putString(KEY_ERROR, "")
        .apply()
    }

    fun readStatus(context: Context): Map<String, Any> {
      val prefs = preferences(context)
      return mapOf(
        "state" to (prefs.getString(KEY_STATE, STATE_STOPPED) ?: STATE_STOPPED),
        "x" to prefs.getFloat(KEY_X, 0f),
        "y" to prefs.getFloat(KEY_Y, 0f),
        "z" to prefs.getFloat(KEY_Z, 0f),
        "motion" to prefs.getFloat(KEY_MOTION, 0f),
        "threshold" to prefs.getFloat(KEY_THRESHOLD, DEFAULT_THRESHOLD),
        "armedAt" to prefs.getLong(KEY_ARMED_AT, 0L).toDouble(),
        "triggeredAt" to prefs.getLong(KEY_TRIGGERED_AT, 0L).toDouble(),
        "error" to (prefs.getString(KEY_ERROR, "") ?: "")
      )
    }
  }
}
