# CLAUDE.md - AI Assistant Guide for SyncoApp

This document provides comprehensive guidance for AI assistants working with the SyncoApp codebase.

## Project Overview

**Synco** is a cross-platform mobile reminder/notification management application built with React Native and Expo. Users can create, schedule, and manage reminders with recurring patterns and push notifications.

- **Package Manager**: Bun (see `bun.lock`)
- **Version**: 1.0.0
- **Bundle IDs**: `com.synco.app` (iOS and Android)
- **Platforms**: iOS, Android, Web

## Tech Stack

### Frontend
- **React**: 19.1.0
- **React Native**: 0.81.5
- **Expo**: ~54.0.32
- **TypeScript**: ~5.9.2

### Backend
- **Supabase**: PostgreSQL database with real-time channels
- **Authentication**: Google OAuth, Apple Sign-in via Supabase Auth
- **Edge Functions**: Deno-based serverless functions for push notifications

### Key Expo Packages
- `expo-notifications` - Push notification handling
- `expo-auth-session` - OAuth authentication flow
- `expo-apple-authentication` - Apple sign-in
- `expo-font` - Custom font loading (DMSans, BBH Hegarty)

## Directory Structure

```
SyncoApp/
├── assets/
│   └── fonts/              # DMSans and BBH-Hegarty font files
├── components/             # Reusable UI components
│   ├── Animated*.tsx       # Animation-enabled components
│   ├── BottomNavBar.tsx    # Navigation with FAB
│   ├── *Modal.tsx          # Modal components
│   ├── Timeline*.tsx       # Timeline display components
│   └── icons/              # Custom SVG icon library
├── hooks/
│   └── useReminders.ts     # Reminder state management hook
├── lib/                    # Service layer and utilities
│   ├── auth.ts             # OAuth and session management
│   ├── notifications.ts    # Push notification registration
│   ├── reminders.ts        # Reminder CRUD operations
│   ├── supabase.ts         # Supabase client initialization
│   └── types.ts            # TypeScript interfaces and constants
├── screens/                # Application screens
│   ├── HomeScreen.tsx      # Main dashboard
│   ├── ManualCreateScreen.tsx  # Reminder creation form
│   └── OnboardingScreen.tsx    # Sign-in screen
├── supabase/
│   ├── functions/          # Deno edge functions
│   └── migrations/         # Database schema migrations
├── App.tsx                 # Root component with auth setup
└── index.tsx               # App entry point
```

## Development Commands

```bash
# Start development server
bun start           # or: expo start

# Run on specific platforms
bun run ios         # iOS simulator
bun run android     # Android emulator
bun run web         # Web browser
```

## Code Conventions

### TypeScript
- Strict mode enabled (`tsconfig.json`)
- All types defined in `lib/types.ts`
- Use explicit type annotations for function parameters and return types

### Component Patterns

1. **Functional components with hooks**:
```tsx
export default function ComponentName({
  prop1,
  prop2 = defaultValue,
}: ComponentNameProps) {
  // Implementation
}
```

2. **Props interface naming**: `ComponentNameProps`

3. **Default exports** for components

### Styling
- Use `StyleSheet.create()` for all styles
- Styles defined at the bottom of component files
- **Color scheme**:
  - Primary: `#2F00FF` (purple)
  - Accent: `#00FFFF` (cyan)
  - Glow effects use cyan with transparency

### Animation Patterns
- Use React Native's `Animated` API
- Spring animations preferred for interactive feedback
- Common pattern:
```tsx
const scaleAnim = useRef(new Animated.Value(1)).current;
Animated.spring(scaleAnim, {
  toValue: 0.97,
  useNativeDriver: true,
  tension: 300,
  friction: 10,
}).start();
```

### Data Layer

1. **Service functions** (`lib/reminders.ts`):
   - Async functions that interact with Supabase
   - Throw errors on failure (caller handles)
   - Return typed data

2. **Custom hooks** (`hooks/useReminders.ts`):
   - Manage state with `useState`
   - Subscribe to real-time updates via Supabase channels
   - Expose loading/error states
   - Return interface with data and methods

### Supabase Patterns

```tsx
// Reading data
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .order('column', { ascending: true });

if (error) throw error;
return data ?? [];

// Real-time subscription
const subscription = supabase
  .channel('channel_name')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'table_name' }, callback)
  .subscribe();
```

## Environment Variables

Required environment variables (set in `.env` file, excluded from git):

```
EXPO_PUBLIC_SUPABASE_URL=<supabase-project-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

## Key Data Types

```typescript
// Core reminder interface
interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  scheduled_time: string;        // ISO date string
  status: ReminderStatus;        // 'completed' | 'current' | 'upcoming' | 'future' | 'placeholder'
  is_priority: boolean;
  notify_before_minutes: number; // 0, 5, 15, 30, or 60
  recurring_rule_id: string | null;
}

// Recurring rule interface
interface RecurringRule {
  id: string;
  name: string;
  frequency: number;
  frequency_unit: FrequencyUnit; // 'days' | 'weeks' | 'months' | 'years'
  selected_days: DayOfWeek[];    // 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
}
```

## Application Flow

1. **App startup** (`App.tsx`):
   - Load custom fonts
   - Check authentication session
   - Initialize push notifications (if authenticated)
   - Route to OnboardingScreen or HomeScreen

2. **Authentication** (`lib/auth.ts`):
   - Google: OAuth via expo-web-browser
   - Apple: Native Apple authentication framework

3. **Reminder lifecycle**:
   - Creation via ManualCreateScreen
   - Status computed dynamically based on `scheduled_time`
   - Real-time sync via Supabase channels
   - Push notifications via edge function

## Important Files

| File | Purpose |
|------|---------|
| `App.tsx` | Root component, auth and notification initialization |
| `lib/types.ts` | All TypeScript type definitions |
| `lib/reminders.ts` | Reminder CRUD operations |
| `hooks/useReminders.ts` | Reminder state management |
| `components/AnimatedButton.tsx` | Primary button component with 3D effects |
| `screens/ManualCreateScreen.tsx` | Main reminder creation interface |

## Testing

No testing framework is currently configured. When adding tests, consider:
- Jest for unit tests
- React Native Testing Library for component tests
- Detox for E2E tests

## Build & Deployment

### EAS Build Profiles (`eas.json`)
- `development`: Development client builds
- `preview`: Internal distribution
- `production`: App store builds

### Build Commands
```bash
# Development build
eas build --profile development

# Production build
eas build --profile production
```

## Common Patterns to Follow

### Adding a New Screen
1. Create component in `screens/` directory
2. Use functional component with TypeScript
3. Import hooks from `hooks/`
4. Add navigation in `App.tsx` if needed

### Adding a New Component
1. Create in `components/` directory
2. Define props interface
3. Use `StyleSheet.create()` for styles
4. Export as default

### Adding Database Operations
1. Add types to `lib/types.ts`
2. Create service functions in appropriate `lib/*.ts` file
3. Use Supabase client patterns established in codebase
4. Update hooks if state management needed

### Adding a New Icon
1. Add SVG component to `components/icons/index.tsx`
2. Use `react-native-svg` components
3. Accept `size` and `color` props

## Security Notes

- Never commit `.env` files
- Supabase Row Level Security (RLS) is enabled
- Push tokens are user-scoped
- OAuth tokens managed by Expo/Supabase
