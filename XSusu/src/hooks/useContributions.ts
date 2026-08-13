import { useState, useCallback } from 'react';
import { api } from '../services/api';

export function useContributions(groupId?: string) {
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTodayStatus = useCallback(async () => {
    if (!groupId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response: any = await api.get(`/contributions/${groupId}/today`);
      setTodayStatus(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch today status');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const recordPayment = async (day: number, amount: number) => {
    if (!groupId) return;
    try {
      await api.post('/contributions/record', { groupId, day, amount });
      await fetchTodayStatus();
    } catch (err: any) {
      throw err;
    }
  };

  const verifyPayment = async (day: number, amount: number, transactionRef: string) => {
    if (!groupId) return;
    try {
      await api.post('/contributions/verify', { groupId, day, amount, transactionRef });
      await fetchTodayStatus();
    } catch (err: any) {
      throw err;
    }
  };

  const completePayout = async (day: number) => {
    if (!groupId) return;
    try {
      await api.post(`/contributions/${groupId}/complete-payout`, { day });
      await fetchTodayStatus();
    } catch (err: any) {
      throw err;
    }
  };

  return {
    todayStatus, loading, error,
    fetchTodayStatus, recordPayment, verifyPayment, completePayout,
  };
}