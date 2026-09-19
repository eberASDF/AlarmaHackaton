# Design

## Direction

Vigilance uses an iOS-native operating language: system typography, soft layered surfaces, restrained controls, and state color as the main signal. It avoids theatrical security visuals and keeps the product feeling like a real utility on a phone.

## Visual System

Use neutral app backgrounds with a single accent channel and mostly unframed content. Normal and disarmed states use iOS blue. Armed states transition to an elegant red. Backgrounds remain light or dark; color appears in controls, animated icons, indicators, and focused details.

## Typography

Use the Apple system stack: `-apple-system`, `BlinkMacSystemFont`, `SF Pro Display`, `SF Pro Text`, `Segoe UI`, and sans-serif fallbacks. Keep large titles tight and confident, with smaller supporting text for operational detail.

## Components

The app avoids card containers except for the bottom screen-switching navigation. Primary actions are large iOS-style buttons. Theme selection uses lightweight icon controls. Bottom navigation stays fixed to the mobile app shell and keeps the only elevated floating surface.

## Motion

State changes should animate through color, scale, soft shadow, and opacity. Armed mode adds a subtle red pulse around the main indicator. Alarm mode increases pulse strength and introduces a slide-in alert banner. Motion reinforces state but must not hide content.

## Interaction

Activation shows a short arming phase before the app becomes armed. Deactivation opens authentication rather than disarming directly. PIN entry uses digit indicators and a numeric keypad. History appears as one unified chronological stream. Main status uses an animated icon library for the lock/protection indicator.
