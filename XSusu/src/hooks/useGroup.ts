import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';

export function useGroup(groupId?: string) {
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroup = useCallback(async () => {
    if (!groupId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response: any = await api.get(`/groups/${groupId}`);
      setGroup(response.data.group);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch group');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      fetchGroup();
    }, [fetchGroup])
  );

  const startGroup = async () => {
    if (!groupId) return;
    try {
      await api.post(`/groups/${groupId}/start`);
      await fetchGroup();
    } catch (err: any) {
      throw err;
    }
  };

  const addMember = async (userId: string, position: number) => {
    if (!groupId) return;
    try {
      await api.post(`/groups/${groupId}/members`, { userId, position });
      await fetchGroup();
    } catch (err: any) {
      throw err;
    }
  };

  return { group, loading, error, refresh: fetchGroup, startGroup, addMember };
}