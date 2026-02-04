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
import { CreateReminderInput, Reminder, UpdateReminderInput } from '../lib/types';
import { supabase } from '../lib/supabase';
import { sendResyncPush, syncLocalReminderSchedules } from '../lib/notifications';

interface UseRemindersReturn {
  reminders: Reminder[];
  priorityCount: number;
  upcomingCount: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  addReminder: (input: CreateReminderInput) => Promise<Reminder>;
  editReminder: (id: string, input: UpdateReminderInput) => Promise<Reminder>;
  removeReminder: (id: string) => Promise<void>;
}

export function useReminders(): UseRemindersReturn {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [priorityCount, setPriorityCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [upcomingReminders, priority, upcoming] = await Promise.all([
        getAllFutureReminders(),
        getPriorityCount(),
        getUpcomingCount(),
      ]);

      // Process reminders to compute their status based on current time
      const processedReminders = processRemindersStatus(upcomingReminders);

      // Limit to 7 upcoming reminders for the homepage
      const limitedReminders = processedReminders.slice(0, 7);

      setReminders(limitedReminders);
      setPriorityCount(priority);
      setUpcomingCount(upcoming);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch reminders'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

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
          // Refresh data when any changes occur
          fetchData();
        }
      )
      .subscribe();

    // Refresh status every minute to update current/upcoming states
    const intervalId = setInterval(fetchData, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, [fetchData]);

  const addReminder = useCallback(async (input: CreateReminderInput): Promise<Reminder> => {
    const newReminder = await createReminder(input);
    await fetchData();
    await syncLocalReminderSchedules();
    await sendResyncPush();
    return newReminder;
  }, [fetchData]);

  const editReminder = useCallback(async (id: string, input: UpdateReminderInput): Promise<Reminder> => {
    const updated = await updateReminder(id, input);
    await fetchData();
    await syncLocalReminderSchedules();
    await sendResyncPush();
    return updated;
  }, [fetchData]);

  const removeReminder = useCallback(async (id: string): Promise<void> => {
    await deleteReminder(id);
    await fetchData();
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
