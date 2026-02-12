# Privacy Policy for Remmy

**Effective date:** February 12, 2026  
**Last updated:** February 12, 2026

Remmy ("**Remmy**," "**we**," "**us**," or "**our**") provides a reminder and productivity application with optional voice, notification, subscription, and cross-device synchronization features.

This Privacy Policy explains how we collect, use, disclose, and protect personal information when you use the Remmy mobile app and related backend services (collectively, the "**Service**").

`IMPORTANT:` Replace bracketed placeholders before publishing:
- `[CONTACT_EMAIL]`

By using the Service, you acknowledge the practices described in this Privacy Policy.

## 1. Data Controller

For purposes of applicable privacy law, the data controller is:

- **Entity:** Remmy  
- **Product:** Remmy  
- **Contact email:** [CONTACT_EMAIL]  

## 2. Scope

This Privacy Policy applies to personal information processed through:
- The Remmy mobile application.
- Remmy backend services hosted with Supabase.
- Remmy edge functions used for parsing reminders, voice processing, subscription checks, and push resync.

This Privacy Policy does not govern third-party websites, platforms, or services you access through external links or actions (for example, opening a `mailto:` link, phone dialer link, or map link).

## 3. Categories of Personal Information We Process

Depending on how you use the Service, we may process the following categories:

### 3.1 Account and identity data
- User ID (UUID) and account metadata.
- Email address (for authenticated users).
- Sign-in metadata from Google OAuth and email sign-in flows.

### 3.2 Reminder and content data
- Reminder title, description, schedule, status, priority, and recurrence settings.
- Reminder actions and attachments metadata, including user-provided action payloads (for example phone numbers, email addresses, URLs, or addresses, if you enter them).
- User preferences (notification settings, snooze settings, appearance settings, quick templates, advanced flags).

### 3.3 Voice and audio data
- Microphone audio that you explicitly choose to record for voice reminder features.
- Audio MIME type and file metadata needed to process the request.
- Voice transcript and model outputs (for reminder parsing or conversational responses).

### 3.4 Device and technical data
- Push token(s) (Expo token and/or FCM token).
- Device identifiers and attributes used for sync and notifications (for example device name/model, platform, app/environment identifiers).
- App/session technical data needed for authentication/session management.

### 3.5 Subscription and billing-related data
- Subscription entitlement status, expiration, and product metadata via RevenueCat.
- App user identifier used for entitlement checks.
- `Note:` Payment card and billing account details are processed by Apple App Store / Google Play and not directly by Remmy.

### 3.6 Notification and sync metadata
- Notification scheduling records (device-local schedule metadata mirrored in backend records).
- Account sync code metadata and device sync history.

## 4. Sources of Data

We collect personal information:
- Directly from you (for example account sign-in, reminder text, voice recordings, settings).
- Automatically from your device and app interactions (for example push token registration).
- From integrated service providers and identity/payment platforms (for example subscription status and authentication/session details).

## 5. How We Use Personal Information

We process personal information for the following purposes:

- Provide core reminder functionality.
- Authenticate users and maintain secure sessions.
- Register and deliver notifications, including reminder actions and resync triggers.
- Process voice requests (transcription, intent detection, reminder parsing, conversational responses).
- Check and enforce subscription entitlements and usage limits.
- Maintain app settings and synchronization state across devices.
- Troubleshoot, secure, and maintain service performance.
- Comply with legal obligations and enforce our terms.

## 6. Legal Bases (EEA/UK/Similar Jurisdictions)

Where required, we rely on one or more legal bases:

- **Contract performance:** to provide the Service you request.
- **Consent:** for microphone access and push notifications where required.
- **Legitimate interests:** security, abuse prevention, diagnostics, product reliability.
- **Legal obligation:** to comply with applicable law, regulation, or lawful requests.

## 7. App Permissions

Remmy may request the following permissions:

- **Microphone (`RECORD_AUDIO`):** to record voice reminders you initiate.
- **Notifications (`POST_NOTIFICATIONS` on Android):** to deliver reminders.

Remmy does not require camera access for core functionality.

You can revoke permissions in your device OS settings at any time.

## 8. How We Share Personal Information

We do not sell personal information. We share data only as needed to operate the Service:

- With service providers/processors described in Section 9.
- With platform providers (for example Google for authentication/notifications and Apple/Google for billing workflows).
- With legal authorities if required by law or legal process.
- In connection with corporate transactions (for example merger/acquisition), subject to lawful safeguards.

## 9. Third-Party Services, SDKs, and Processors

The Service integrates third-party services that may process personal information.

### 9.1 Core processors and external services

1. **Supabase** (authentication, database, edge functions, data APIs)  
   - Data: account/session data, reminders, preferences, push tokens, sync records, subscription-check requests.  
   - Privacy: https://supabase.com/privacy

2. **OpenAI API** (voice transcription and language model processing via edge functions)  
   - Data: user-provided voice content, transcripts, reminder text prompts, model outputs.  
   - Privacy: https://openai.com/policies/privacy-policy

3. **RevenueCat** (subscription management and entitlements)  
   - Data: app user ID, entitlement/subscription metadata, product/package and restore status.  
   - Privacy: https://www.revenuecat.com/privacy

4. **Expo Push Service** (for Expo push token delivery paths)  
   - Data: push tokens and notification payload metadata needed for delivery.  
   - Privacy: https://expo.dev/privacy

5. **Firebase Cloud Messaging (Google)** (Android push delivery)  
   - Data: device push token and push message metadata.  
   - Privacy: https://policies.google.com/privacy

6. **Google Sign-In / OAuth via Supabase Auth**  
   - Data: authentication tokens and identity attributes provided by Google identity flow.  
   - Privacy: https://policies.google.com/privacy

7. **Email Sign-In via Supabase Auth**  
   - Data: email address, one-time login tokens/links, and session/authentication metadata.  
   - Privacy: https://supabase.com/privacy

8. **Apple App Store / Google Play Billing** (store-managed payments)  
   - Data: purchase/transaction and subscription records managed by store platforms.  
   - Privacy:  
     - Apple: https://www.apple.com/legal/privacy/  
     - Google: https://policies.google.com/privacy

### 9.2 Integrated SDK/library inventory (direct dependencies)

The current mobile build includes these direct dependencies (from `package.json`):

- `@expo/vector-icons`
- `@react-native-async-storage/async-storage`
- `@react-native-community/blur`
- `@react-native-community/slider`
- `@shopify/react-native-skia`
- `@supabase/supabase-js`
- `expo`
- `expo-asset`
- `expo-audio`
- `expo-auth-session`
- `expo-blur`
- `expo-build-properties`
- `expo-clipboard`
- `expo-constants`
- `expo-crypto`
- `expo-dev-client`
- `expo-device`
- `expo-document-picker`
- `expo-file-system`
- `expo-font`
- `expo-haptics`
- `expo-image-picker`
- `expo-linear-gradient`
- `expo-notifications`
- `expo-splash-screen`
- `expo-status-bar`
- `expo-symbols`
- `expo-task-manager`
- `expo-web-browser`
- `nativewind`
- `prop-types`
- `react`
- `react-dom`
- `react-native`
- `react-native-gesture-handler`
- `react-native-purchases`
- `react-native-purchases-ui`
- `react-native-reanimated`
- `react-native-safe-area-context`
- `react-native-svg`
- `react-native-url-polyfill`
- `react-native-web`
- `react-native-worklets`
- `tailwindcss`

Some of these dependencies are UI/runtime libraries that typically operate on-device and do not independently receive personal data from us, while others (listed in Section 9.1) are service integrations that can process data as part of Service delivery.

## 10. International Data Transfers

Your information may be processed in jurisdictions outside your country of residence, including jurisdictions that may have different data protection laws. Where required, we apply appropriate transfer safeguards under applicable law.

## 11. Data Retention

We retain personal information only for as long as necessary for the purposes in this Privacy Policy, including legal, operational, and security reasons.

Retention principles in current implementation include:

- **Account codes:** generated with a 24-hour expiration window.
- **Push tokens:** retained while needed for notification delivery; deleted or updated when changed/removed.
- **Reminder and preference data:** retained until you delete content, close/delete account, or request deletion (unless legal retention applies).
- **Voice data:** processed for immediate voice features; Remmy does not intentionally store raw voice blobs in app database tables as part of normal reminder parsing flow, but transcripts/output may be stored if you save resulting reminders.
- **Provider-retained data:** third-party providers may retain data per their own policies and legal obligations.

## 12. Security Measures

We implement administrative, technical, and organizational measures appropriate to risk, including:

- Transport encryption (HTTPS/TLS).
- Role-based access controls and row-level security in backend tables.
- Authentication and authorization checks for edge functions.
- Limiting service-role operations to required backend functions.

No method of transmission or storage is 100% secure. We cannot guarantee absolute security.

## 13. Your Privacy Rights

Depending on your jurisdiction, you may have rights to:

- Access personal information we hold about you.
- Correct inaccurate personal information.
- Delete personal information.
- Port your personal information.
- Restrict or object to certain processing.
- Withdraw consent where processing is consent-based.
- Lodge a complaint with a supervisory authority.

### 13.1 US state law notices (where applicable)

Remmy does not sell personal information and does not share personal information for cross-context behavioral advertising as those terms are defined under certain US state laws.

You may request:
- Categories/specific pieces of information collected.
- Deletion of personal information (subject to exceptions).
- Correction of inaccuracies.
- Non-discrimination for exercising rights.

### 13.2 EEA/UK/Swiss users

You may also contact your local data protection authority.  
## 14. Children’s Privacy

The Service is not directed to children under 13 (or older age where required by local law), and we do not knowingly collect personal information from children in violation of applicable law. If you believe a child has provided us personal information, contact us and we will take appropriate steps.

## 15. Automated Decision-Making

Certain AI-assisted features (for example voice parsing and reminder extraction) involve automated processing of user input. These features are used to provide requested functionality and are not used for legally significant profiling decisions.

## 16. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will post the updated version with a revised "Last updated" date. Material changes may be communicated through in-app notice or other appropriate methods.

## 17. Contact Us

For privacy requests, questions, or complaints, contact:

- **Email:** [CONTACT_EMAIL]  

When contacting us, include enough information to verify your request and your relationship to the account.

## 18. App Store / Play Console Publication Note

For Google Play and similar distribution platforms, this Privacy Policy should be:
- Publicly accessible via an HTTPS URL.
- Non-edit gated (no login required).
- Associated with the same developer/entity identity shown in store listings.
