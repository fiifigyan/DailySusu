import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import { ProgressCircle } from '../../components/susu/ProgressCircle';
import { MemberRow } from '../../components/susu/MemberRow';
import { formatCurrency } from '../../utils/formatters';

export function TodayScreen({ navigation }: any) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [])
  );

  useEffect(() => {
    if (selectedGroupId) {
      fetchTodayStatus(selectedGroupId);
    }
  }, [selectedGroupId]);

  const fetchGroups = async () => {
    try {
      const response: any = await api.get('/groups');
      setGroups(response.data.groups || []);
      
      const activeGroup = response.data.groups?.find((g: any) => g.status === 'ACTIVE');
      if (activeGroup && !selectedGroupId) {
        setSelectedGroupId(activeGroup.id);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayStatus = async (groupId: string) => {
    try {
      const response: any = await api.get(`/contributions/${groupId}/today`);
      setTodayStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch today status:', error);
    }
  };

  const handleManualCheckIn = async (memberId: string) => {
    if (!selectedGroupId || !todayStatus) return;
    try {
      const group = groups.find(g => g.id === selectedGroupId);
      await api.post('/contributions/record', {
        groupId: selectedGroupId,
        day: todayStatus.day,
        amount: group?.dailyContribution,
      });
      fetchTodayStatus(selectedGroupId);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record payment');
    }
  };

  const handleAutoVerify = async (memberId: string) => {
    if (!selectedGroupId || !todayStatus) return;
    setVerifying(memberId);
    try {
      const group = groups.find(g => g.id === selectedGroupId);
      await api.post('/contributions/verify', {
        groupId: selectedGroupId,
        day: todayStatus.day,
        amount: group?.dailyContribution,
        transactionRef: `MOMO-${Date.now()}`,
      });
      fetchTodayStatus(selectedGroupId);
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message);
    } finally {
      setVerifying(null);
    }
  };

  const handleCompletePayout = async () => {
    if (!selectedGroupId || !todayStatus?.allPaid) return;
    try {
      await api.post(`/contributions/${selectedGroupId}/complete-payout`, {
        day: todayStatus.day,
      });
      Alert.alert('Success', 'Payout completed! Moving to next day.');
      fetchTodayStatus(selectedGroupId);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const activeGroup = groups.find(g => g.id === selectedGroupId && g.status === 'ACTIVE');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!activeGroup) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="today-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No Active Group</Text>
        <Text style={styles.emptySubtitle}>
          Join or create a Susu group to start daily check-ins
        </Text>
      </View>
    );
  }

  const progress = todayStatus
    ? (todayStatus.paidCount / todayStatus.totalMembers) * 100
    : 0;

  return (
    <ScrollView style={styles.container}>
      {/* Group Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupSelector}>
        {groups.filter(g => g.status === 'ACTIVE').map((group) => (
          <TouchableOpacity
            key={group.id}
            style={[styles.groupChip, selectedGroupId === group.id && styles.groupChipActive]}
            onPress={() => setSelectedGroupId(group.id)}
          >
            <Text style={[styles.groupChipText, selectedGroupId === group.id && styles.groupChipTextActive]}>
              {group.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Progress */}
      <View style={styles.progressSection}>
        <ProgressCircle progress={progress} size={120} strokeWidth={10} color="#10B981" />
        <Text style={styles.progressText}>
          {todayStatus?.paidCount || 0}/{todayStatus?.totalMembers || 0} paid
        </Text>
        <Text style={styles.dayText}>
          Day {activeGroup.currentDay} of {activeGroup.totalDays}
        </Text>
      </View>

      {/* Today's Recipient */}
      {todayStatus?.todayRecipient && (
        <View style={styles.recipientCard}>
          <Text style={styles.recipientLabel}>🎯 Today's Payout</Text>
          <Text style={styles.recipientName}>{todayStatus.todayRecipient.name}</Text>
          <Text style={styles.recipientAmount}>
            {formatCurrency(activeGroup.dailyPayout)}
          </Text>
          <Text style={styles.recipientInstruction}>
            Send {formatCurrency(activeGroup.dailyContribution)} to:
          </Text>
          <Text style={styles.recipientPhone}>
            {todayStatus.todayRecipient.phone}
          </Text>
        </View>
      )}

      {/* Member List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Members</Text>
        {todayStatus?.pendingMembers?.map((member: any) => (
          <MemberRow
            key={member.id}
            name={member.name}
            phone={member.phone}
            status="PENDING"
            position={member.position}
            onCheckIn={() => handleManualCheckIn(member.id)}
            onVerify={() => handleAutoVerify(member.id)}
            isVerifying={verifying === member.id}
          />
        ))}
        {todayStatus?.paidCount > 0 && (
          <Text style={styles.paidCount}>
            ✅ {todayStatus.paidCount} members have paid
          </Text>
        )}
      </View>

      {/* Complete Payout */}
      {todayStatus?.allPaid && (
        <TouchableOpacity style={styles.completeButton} onPress={handleCompletePayout}>
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
          <Text style={styles.completeButtonText}>
            Complete Payout - {formatCurrency(activeGroup.dailyPayout)}
          </Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 },
  groupSelector: { paddingHorizontal: 16, paddingVertical: 12 },
  groupChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  groupChipActive: { backgroundColor: '#2563EB' },
  groupChipText: { fontSize: 14, fontWeight: '500', color: '#4B5563' },
  groupChipTextActive: { color: '#FFFFFF' },
  progressSection: { alignItems: 'center', paddingVertical: 20 },
  progressText: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  dayText: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  recipientCard: { backgroundColor: '#FFFFFF', marginHorizontal: 16, padding: 20, borderRadius: 16, alignItems: 'center' },
  recipientLabel: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  recipientName: { fontSize: 24, fontWeight: '700' },
  recipientAmount: { fontSize: 32, fontWeight: '800', color: '#10B981', marginTop: 4 },
  recipientInstruction: { fontSize: 14, color: '#6B7280', marginTop: 16 },
  recipientPhone: { fontSize: 18, fontWeight: '600', color: '#2563EB', marginTop: 4 },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  paidCount: { textAlign: 'center', color: '#10B981', marginTop: 12, fontWeight: '500' },
  completeButton: {
    backgroundColor: '#10B981', marginHorizontal: 16, marginTop: 20,
    padding: 16, borderRadius: 12, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  completeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});