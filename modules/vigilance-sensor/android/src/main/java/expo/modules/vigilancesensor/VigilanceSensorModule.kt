package expo.modules.vigilancesensor

import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class VigilanceSensorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("VigilanceSensor")

    Function("isAvailable") {
      true
    }

    AsyncFunction("startMonitoring") { graceMs: Double, threshold: Double, audioUri: String ->
      val context = appContext.reactContext
        ?: throw Exceptions.ReactContextLost()

      VigilanceMonitoringService.prepareStart(
        context = context,
        graceMs = graceMs.toLong(),
        threshold = threshold.toFloat(),
        audioUri = audioUri
      )

      val intent = Intent(context, VigilanceMonitoringService::class.java).apply {
        action = VigilanceMonitoringService.ACTION_START
        putExtra(VigilanceMonitoringService.EXTRA_GRACE_MS, graceMs.toLong())
        putExtra(VigilanceMonitoringService.EXTRA_THRESHOLD, threshold.toFloat())
        putExtra(VigilanceMonitoringService.EXTRA_AUDIO_URI, audioUri)
      }
      ContextCompat.startForegroundService(context, intent)
      VigilanceMonitoringService.readStatus(context)
    }

    AsyncFunction("stopMonitoring") {
      val context = appContext.reactContext
        ?: throw Exceptions.ReactContextLost()
      VigilanceMonitoringService.markStopped(context)
      context.stopService(Intent(context, VigilanceMonitoringService::class.java))
      VigilanceMonitoringService.readStatus(context)
    }

    AsyncFunction("getStatus") {
      val context = appContext.reactContext
        ?: throw Exceptions.ReactContextLost()
      VigilanceMonitoringService.readStatus(context)
    }
  }
}
