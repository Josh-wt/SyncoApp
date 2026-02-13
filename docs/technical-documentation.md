# Remmy (Synco) Technical Documentation

## 1. Overview
This document describes the current implementation of Remmy’s technology stack, system architecture, and RevenueCat subscription flow as implemented in this repository.

Remmy is an Expo/React Native mobile app with Supabase as backend, edge functions for AI and subscription verification, and RevenueCat for in-app purchase management.

## 2. Tech Stack
### Client (Mobile)
1. Framework: React Native + Expo (`expo` ~54, `react-native` 0.81, `react` 19).
2. Language: TypeScript.
3. Styling: NativeWind + React Native styles.
4. Local capabilities:
   - Notifications: `expo-notifications`
   - Audio recording: `expo-audio`
   - Haptics: `expo-haptics`
   - Auth/session storage: AsyncStorage
5. Purchases:
   - `react-native-purchases` (RevenueCat SDK)
   - `react-native-purchases-ui` (available dependency)

### Backend and Data
1. Backend platform: Supabase.
2. Auth: Supabase Auth (Google OAuth + email OTP/magic link).
3. Database: Postgres with Row Level Security policies.
4. Edge Functions (Deno):
   - `check-subscription`
   - `parse-reminder`
   - `voice-to-reminder`
   - `send-resync-push`
   - `validate-account-code`
   - `send-reminder-notifications` (currently disabled early in function body)

### AI Services
1. OpenAI API for:
   - Speech transcription (Whisper endpoint)
   - Text/intent parsing for reminder extraction
   - Conversational fallback responses

### Notification Delivery
1. Device-local scheduling via `expo-notifications` is the primary path.
2. Push token management supports Expo push tokens and Android FCM tokens.
3. Resync push events are sent to other devices when reminders change.

## 3. High-Level Architecture
### 3.1 App Layers
1. Presentation layer:
Screens and components in `screens/` and `components/`.
2. Domain/data access layer:
`lib/` modules for reminders, notifications, auth, preferences, RevenueCat, limits.
3. State and orchestration:
Custom hooks in `hooks/` (for reminders, subscriptions, voice, notifications).
4. Backend integration:
Supabase client (`lib/supabase.ts`) + edge function invocations.

### 3.2 Core Product Flows
1. Authentication:
`lib/auth.ts` handles Google OAuth and email OTP flows using Supabase Auth.

2. Reminder CRUD:
`lib/reminders.ts` handles create/read/update/delete and status processing.

3. Notification sync:
`lib/notifications.ts` schedules local notifications per reminder and stores device schedule records in `notification_schedules`.

4. Voice and natural language input:
Client invokes Supabase edge functions that call OpenAI APIs for parsing and transcription.

5. Subscription gating:
Client checks Pro state via edge function and enforces free-tier limits before reminder creation.

## 4. Data Model (Relevant Tables)
The app relies on existing tables plus migrations in `supabase/migrations`.

Key tables used by the current app:
1. `reminders`
Core reminder records (title, schedule, status, notify timing, priority).

2. `recurring_rules`
Recurring cadence definitions for reminders.

3. `push_tokens`
Per-user push tokens (with `platform` and `token_type` columns).

4. `notification_schedules`
Tracks per-device locally scheduled notification IDs for reminders.

5. `user_preferences`
Snooze mode, notification preferences, appearance settings, and other app settings.

6. `account_codes` and `device_sync_history`
Cross-device sync code flow and sync history.

7. `reminder_actions` and `reminder_attachments`
Actionable metadata attached to reminders.

Security posture:
1. RLS is enabled on migrated tables with user-scoped policies.
2. Edge functions validate authorization headers before user-scoped operations.

## 5. Notification Architecture
Remmy currently prioritizes local scheduling reliability over server-triggered reminder pushes.

Primary behavior:
1. On authenticated app launch, the app registers push tokens and calls `syncLocalReminderSchedules()`.
2. The sync process:
   - Loads future reminders.
   - Computes effective notify times.
   - Schedules local notifications.
   - Upserts schedule metadata into `notification_schedules`.
   - Cancels stale/outdated scheduled notifications.
3. On reminder create/edit/delete, the app triggers:
   - Local resync
   - Cross-device resync push via `send-resync-push`

Important implementation detail:
`supabase/functions/send-reminder-notifications/index.ts` currently returns early with a “Push notifications disabled (local scheduling enabled)” response to avoid duplicate reminders while local scheduling is primary.

## 6. RevenueCat Implementation
### 6.1 Current Entitlement Model
1. Entitlement used for premium access: `pro`.
2. Free tier reminder limit: 10 reminders/day.
3. Pro capability (as surfaced in UI): unlimited reminders and unlimited voice creation.

### 6.2 Client-Side RevenueCat SDK
Implemented in `lib/revenueCat.ts`.

Current behavior:
1. SDK keys are selected by platform (Android/iOS public SDK keys).
2. `initializeRevenueCat(userId)` configures SDK using Supabase user ID as `appUserID`.
3. `getOfferings()` fetches current offering packages for paywall rendering.
4. `purchasePackage(pkg)` executes purchase and validates active `pro` entitlement in `CustomerInfo`.
5. `restorePurchases()` restores prior transactions and checks for `pro`.

Where used:
1. `hooks/useSubscription.ts` initializes RevenueCat SDK on mount for authenticated users.
2. `components/PaywallModal.tsx` loads offerings, handles purchase and restore.
3. `screens/SettingsScreen.tsx` hosts plan card and opens paywall.

### 6.3 Server-Side Subscription Verification
Implemented in `supabase/functions/check-subscription/index.ts`.

Flow:
1. Client invokes `check-subscription` with authenticated Supabase session.
2. Function validates user identity using auth header and Supabase client.
3. Function calls RevenueCat REST API:
   - `GET https://api.revenuecat.com/v1/subscribers/{supabase_user_id}`
4. Active entitlements are computed by filtering non-expired entries.
5. Response returns:
   - `isProUser`
   - `entitlements`
   - `expiresDate` (for `pro`, if present)

Why this matters:
1. Purchase UI is client-side, but entitlement truth is verified server-side.
2. Free-tier limits rely on edge-verified subscription status.

### 6.4 Subscription Gating Enforcement
Implemented in `lib/reminderLimits.ts` and used by creation flows.

Runtime enforcement:
1. `canCreateReminder()` calls `check-subscription`.
2. If `isProUser = true`, reminder creation is always allowed.
3. If free user, today’s reminder count is queried from `reminders` and capped at 10/day.
4. `screens/ManualCreateScreen.tsx` blocks save and shows limit messaging when cap is reached.

## 7. RevenueCat Environment and Configuration Checklist
### 7.1 Required RevenueCat Setup
1. Create entitlement: `pro`.
2. Attach products/packages to current offering used by paywall.
3. Ensure app user ID mapping uses Supabase `auth.users.id`.

### 7.2 Required Secrets / Environment Variables
Client app:
1. `EXPO_PUBLIC_SUPABASE_URL`
2. `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Supabase edge functions:
1. `REVENUECAT_REST_API_KEY` (for `check-subscription`)
2. `SUPABASE_URL`
3. `SUPABASE_ANON_KEY`
4. `SUPABASE_SERVICE_ROLE_KEY` (functions requiring service-level DB writes)
5. `OPENAI_API_KEY` (AI parsing/transcription functions)
6. `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` (FCM push paths)

## 8. Operational Notes and Risks
1. Public SDK keys are currently hardcoded in `lib/revenueCat.ts`.
   - This is acceptable for RevenueCat public keys, but rotating via config/env can improve maintainability.

2. RevenueCat access is checked via edge function on demand.
   - Consider caching subscription status in user metadata for lower latency and API cost.

3. Send-reminder edge function is intentionally disabled.
   - If server-driven reminders are re-enabled later, duplicate-delivery protection must be revisited.

4. Free-tier enforcement currently gates reminder count/day.
   - Voice usage limits are product-defined in UI/positioning; enforce additional hard limits if required by policy.

## 9. Summary
The current implementation combines Expo mobile UX, Supabase backend infrastructure, and RevenueCat subscription infrastructure in a pragmatic architecture:
1. Fast client-side purchase flow.
2. Server-side entitlement validation.
3. Direct subscription-aware feature gating.
4. Local-first reminder scheduling with cross-device resync signaling.

This architecture is ready for early production use and can evolve to support additional monetization tiers without large structural changes.
