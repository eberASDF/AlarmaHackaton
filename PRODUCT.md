# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Inferred from the brief: people evaluating a mobile-first prototype for Vigilance, an iOS-style phone-protection interface used when someone leaves a device unattended and wants an obvious protected state.

## Product Purpose

Vigilance lets a user activate a vigilance mode prototype, see that the device is protected, authenticate before disabling protection, and review one unified chronological event history.

## Positioning

Vigilance is a frontend prototype that emphasizes state clarity: the main screen must answer immediately whether the phone is protected and what action is available next.

## Operating Context

The primary workflow is mobile and short-session: activate vigilance, confirm that the protected state is obvious, then authenticate to disarm. The prototype stores one local history stream and preferences in the browser.

## Capabilities and Constraints

The app is frontend-only. Biometric authentication, PIN checks, and persistence are mocked or local-only and must not be represented as real hardware access. The service layer must remain replaceable by real implementations later.

## Brand Commitments

The product name is Vigilance. The interface should feel premium, minimal, modern, and iOS-inspired, with Light, Dark, and Automatic themes. Normal state uses iOS blue accents; armed state uses elegant red accents.

## Evidence on Hand

No existing assets, backend, biometric APIs, or production copy are present in the repository. Event data in this prototype is local.

## Product Principles

Protection state is always visually obvious.

Simulated behavior is useful for prototyping but clearly separated from real hardware capability.

Disarming is intentionally gated by authentication.

History explains what happened in chronological order.

The interface stays calm and premium while making the protected state unmistakable.

## Accessibility & Inclusion

Use clear contrast, visible focus states, semantic controls, motion that is smooth but not essential, and responsive safe-area spacing for mobile devices.
