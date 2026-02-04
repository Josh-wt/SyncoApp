import { registerRootComponent } from 'expo';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import App from './App';
import { syncLocalReminderSchedules } from './lib/notifications';

// Must be called before app renders to handle OAuth redirect
WebBrowser.maybeCompleteAuthSession();

const BACKGROUND_NOTIFICATION_TASK = 'REMINDER-NOTIFICATION-TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background notification task error:', error);
    return;
  }
  console.log('Background notification task triggered with data:', data);

  const payload = data as { notification?: { request?: { content?: { data?: Record<string, unknown> } } } } | undefined;
  const contentData = payload?.notification?.request?.content?.data;
  if (contentData && typeof contentData === 'object' && (contentData as { type?: string }).type !== 'resync') {
    return;
  }

  await syncLocalReminderSchedules();
});

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch((error) => {
  console.error('Failed to register background notification task:', error);
});

function Root() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}

registerRootComponent(Root);
