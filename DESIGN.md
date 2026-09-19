# Design

## Direction

Vigilance uses a native mobile operating language: system typography, soft layered surfaces, restrained controls, and state color as the main signal. The interface is implemented with React Native components for Android and iOS.

## Visual System

Use neutral app backgrounds with a single accent channel and mostly unframed content. Normal and disarmed states use iOS blue. Armed states transition to an elegant red. Backgrounds remain light or dark; color appears in controls, animated icons, indicators, and focused details.

## Typography

Use the Apple system stack: `-apple-system`, `BlinkMacSystemFont`, `SF Pro Display`, `SF Pro Text`, `Segoe UI`, and sans-serif fallbacks. Keep large titles tight and confident, with smaller supporting text for operational detail.

## Components

The app avoids card containers except for the bottom screen-switching navigation. Primary actions are large native pressable controls. Theme selection uses lightweight icon controls. Bottom navigation stays fixed to the mobile app shell and keeps the only elevated floating surface.

## Motion

State changes animate through color, scale, soft shadow, and opacity using the React Native Animated API. Armed mode adds a subtle red pulse around the main indicator. Alarm mode increases the visual urgency and shows the live sensor intensity without hiding content.

## Interaction

Activation shows a short arming phase before the app becomes armed. Deactivation opens the device biometric prompt rather than disarming directly. History appears as one unified chronological stream in the bottom navigation. Main status uses an animated icon library for the lock/protection indicator.
