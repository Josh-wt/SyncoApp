import { registerRootComponent } from 'expo';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from './App';
// import * as TaskManager from 'expo-task-manager';
// import * as Notifications from 'expo-notifications';
// import { syncLocalReminderSchedules } from './lib/notifications';

// Must be called before app renders to handle OAuth redirect
WebBrowser.maybeCompleteAuthSession();

const BACKGROUND_NOTIFICATION_TASK = 'REMINDER-NOTIFICATION-TASK';

// Background task temporarily disabled for debugging
// TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
//   if (error) {
//     return;
//   }

//   const payload = data as { notification?: { request?: { content?: { data?: Record<string, unknown> } } } } | undefined;
//   const contentData = payload?.notification?.request?.content?.data;
//   if (contentData && typeof contentData === 'object' && (contentData as { type?: string }).type !== 'resync') {
//     return;
//   }

//   await syncLocalReminderSchedules();
// });

// Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch((error) => {
// });

function Root() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}

registerRootComponent(Root);
