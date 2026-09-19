# Product

<!-- impeccable:product-schema 1 -->

## Platform

Expo / React Native for Android and iOS

## Users

People using Vigilance on a physical Android or iOS device when they leave the device unattended and want an obvious protected state.

## Product Purpose

Vigilance lets a user activate vigilance mode, monitor the physical accelerometer, trigger an audible and vibrating alarm when the device moves, authenticate before disabling protection, and review one unified chronological event history.

## Positioning

Vigilance is a frontend prototype that emphasizes state clarity: the main screen must answer immediately whether the phone is protected and what action is available next.

## Operating Context

The primary workflow is mobile and short-session: activate vigilance, confirm that the protected state is obvious, then authenticate to disarm. The app stores one local history stream and preferences with native asynchronous storage.

## Capabilities and Constraints

The app uses the device biometric prompt through Expo LocalAuthentication with device-credential fallback disabled, and persists preferences locally. Expo Go supports an in-app sensor mode; the Android development build adds a foreground service so monitoring, alarm playback, and vibration continue while the screen is locked. Operating-system force stop, revoked permissions, battery restrictions, or powering off the device can still interrupt protection.

## Brand Commitments

The product name is Vigilance. The interface should feel premium, minimal, modern, and iOS-inspired, with Light, Dark, and Automatic themes. Normal state uses iOS blue accents; armed state uses elegant red accents.

## Evidence on Hand

The alarm asset is bundled locally. Real alarm activations are stored in Cloud Firestore through `HistoryService` and `AlarmRepository`; preferences remain local and sensor code stays decoupled from the backend.

## Product Principles

Protection state is always visually obvious.

Simulated behavior is useful for prototyping but clearly separated from real hardware capability.

Disarming is intentionally gated by authentication.

History explains what happened in chronological order.

The interface stays calm and premium while making the protected state unmistakable.

## Accessibility & Inclusion

Use clear contrast, visible focus states, semantic controls, motion that is smooth but not essential, and responsive safe-area spacing for mobile devices.
