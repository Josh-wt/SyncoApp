import { useCallback, useEffect, useState } from 'react';
import {
  createReminder,
  deleteReminder,
  getAllFutureReminders,
  getPriorityCount,
  getTodayReminders,
  getUpcomingCount,
  processRemindersStatus,
  updateReminder,
} from '../lib/reminders';
import { createReminderActions } from '../lib/reminderActions';
import { CreateReminderActionInput, CreateReminderInput, Reminder, UpdateReminderInput } from '../lib/types';
import { supabase } from '../lib/supabase';
import { sendResyncPush, syncLocalReminderSchedules } from '../lib/notifications';

type AddReminderOptions = {
  actions?: CreateReminderActionInput[];
};

interface UseRemindersReturn {
  reminders: Reminder[];
  priorityCount: number;
  upcomingCount: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  addReminder: (input: CreateReminderInput, options?: AddReminderOptions) => Promise<Reminder>;
  editReminder: (id: string, input: UpdateReminderInput) => Promise<Reminder>;
  removeReminder: (id: string) => Promise<void>;
}

export function useReminders(): UseRemindersReturn {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [priorityCount, setPriorityCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    try {
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);

      const [upcomingReminders, priority, upcoming] = await Promise.all([
        getAllFutureReminders(),
        getPriorityCount(),
        getUpcomingCount(),
      ]);

      // Process reminders to compute their status based on current time
      const processedReminders = processRemindersStatus(upcomingReminders);

      // Limit to 6 upcoming reminders for the homepage
      const limitedReminders = processedReminders.slice(0, 6);

      setReminders(limitedReminders);
      setPriorityCount(priority);
      setUpcomingCount(upcoming);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch reminders'));
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchData();

    // Set up real-time subscription
    const subscription = supabase
      .channel('reminders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminders',
        },
        () => {
          // Keep home UI stable while syncing realtime changes.
          void fetchData({ silent: true });
        }
      )
      .subscribe();

    // Refresh status every minute to update current/upcoming states
    const intervalId = setInterval(() => {
      void fetchData({ silent: true });
    }, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, [fetchData]);

  const addReminder = useCallback(async (input: CreateReminderInput, options?: AddReminderOptions): Promise<Reminder> => {
    const newReminder = await createReminder(input);
    const actions = options?.actions ?? [];

    if (actions.length > 0) {
      await createReminderActions(newReminder.id, actions);
    }

    // Keep create UX snappy: refresh/sync in background.
    setReminders((prev) => {
      const merged = processRemindersStatus([...prev, newReminder])
        .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime())
        .slice(0, 6);
      return merged;
    });

    void fetchData({ silent: true });
    void syncLocalReminderSchedules();
    void sendResyncPush();

    return newReminder;
  }, [fetchData]);

  const editReminder = useCallback(async (id: string, input: UpdateReminderInput): Promise<Reminder> => {
    const updated = await updateReminder(id, input);
    await fetchData({ silent: true });
    await syncLocalReminderSchedules();
    await sendResyncPush();
    return updated;
  }, [fetchData]);

  const removeReminder = useCallback(async (id: string): Promise<void> => {
    await deleteReminder(id);
    await fetchData({ silent: true });
    await syncLocalReminderSchedules();
    await sendResyncPush();
  }, [fetchData]);

  return {
    reminders,
    priorityCount,
    upcomingCount,
    isLoading,
    error,
    refresh: fetchData,
    addReminder,
    editReminder,
    removeReminder,
  };
}
