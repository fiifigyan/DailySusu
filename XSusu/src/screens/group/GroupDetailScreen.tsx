import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { api } from '../../services/api';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupDetail'>;

export function GroupDetailScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchGroupDetails();
    }, [groupId])
  );

  const fetchGroupDetails = async () => {
    try {
      const response: any = await api.get(`/groups/${groupId}`);
      setGroup(response.data.group);
    } catch (error) {
      console.error('Failed to fetch group:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGroup = async () => {
    setStarting(true);
    try {
      await api.post(`/groups/${groupId}/start`);
      Alert.alert('Success', 'Group has started!');
      fetchGroupDetails();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.emptyContainer}>
        <Text>Group not found</Text>
      </View>
    );
  }

  const isForming = group.status === 'FORMING';
  const isActive = group.status === 'ACTIVE';

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isActive && styles.headerActive]}>
        <Text style={styles.headerTitle}>{group.name}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{group.status}</Text>
        </View>
        {group.description && <Text style={styles.description}>{group.description}</Text>}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{group.memberCount}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>GHS {group.dailyContribution}</Text>
          <Text style={styles.statLabel}>Daily Pay</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>GHS {group.dailyPayout}</Text>
          <Text style={styles.statLabel}>Payout</Text>
        </View>
      </View>

      {/* Start Button */}
      {isForming && (
        <TouchableOpacity
          style={[styles.startButton, starting && styles.buttonDisabled]}
          onPress={handleStartGroup}
          disabled={starting}
        >
          {starting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="play-circle" size={24} color="#FFFFFF" />
              <Text style={styles.startButtonText}>Start Group</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Active Actions */}
      {isActive && (
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Main', { screen: 'Today' } as any)}>
            <Ionicons name="today" size={20} color="#FFFFFF" />
            <Text style={styles.actionText}>Today's Check-in</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.scheduleButton]}
            onPress={() => navigation.navigate('InviteMembers', { groupId })}
          >
            <Ionicons name="person-add" size={20} color="#2563EB" />
            <Text style={[styles.actionText, styles.scheduleText]}>Invite</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Members */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Members ({group.members?.length || 0})</Text>
        {group.members?.map((member: any) => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberLeft}>
              <Text style={styles.memberPosition}>#{member.position}</Text>
              <View>
                <Text style={styles.memberName}>
                  {member.user?.firstName} {member.user?.lastName}
                </Text>
                <Text style={styles.memberPhone}>{member.user?.phone}</Text>
              </View>
            </View>
            {member.hasReceivedPayout && (
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            )}
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#F3F4F6', padding: 20 },
  headerActive: { backgroundColor: '#EFF6FF' },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  statusBadge: { backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'capitalize' },
  description: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: -16, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  startButton: {
    flexDirection: 'row', backgroundColor: '#10B981', marginHorizontal: 16, marginTop: 20,
    padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  startButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  quickActions: { flexDirection: 'row', marginHorizontal: 16, marginTop: 20, gap: 10 },
  actionButton: { flex: 1, flexDirection: 'row', backgroundColor: '#2563EB', padding: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 6 },
  scheduleButton: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#2563EB' },
  actionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  scheduleText: { color: '#2563EB' },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  memberCard: {
    backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, marginBottom: 6,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  memberLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memberPosition: { fontSize: 14, fontWeight: '600', color: '#2563EB', width: 30 },
  memberName: { fontSize: 15, fontWeight: '500' },
  memberPhone: { fontSize: 12, color: '#6B7280' },
});