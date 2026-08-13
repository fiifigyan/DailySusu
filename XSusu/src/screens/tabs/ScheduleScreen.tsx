import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';

export function ScheduleScreen() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [])
  );

  useEffect(() => {
    if (selectedGroupId) {
      fetchSchedule(selectedGroupId);
    }
  }, [selectedGroupId]);

  const fetchGroups = async () => {
    try {
      const response: any = await api.get('/groups');
      const allGroups = response.data.groups || [];
      setGroups(allGroups);
      const active = allGroups.find((g: any) => g.status === 'ACTIVE');
      if (active && !selectedGroupId) {
        setSelectedGroupId(active.id);
        setGroupInfo(active);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedule = async (groupId: string) => {
    try {
      const response: any = await api.get(`/groups/${groupId}/schedule`);
      setSchedule(response.data.schedule || []);
      
      const group = groups.find(g => g.id === groupId);
      if (group) setGroupInfo(group);
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!groupInfo) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No Active Group</Text>
        <Text style={styles.emptySubtitle}>
          Join an active Susu group to see the payout schedule
        </Text>
      </View>
    );
  }

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

      {/* Schedule Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payout Schedule</Text>
        <Text style={styles.headerSubtitle}>
          {groupInfo.totalDays} days · GHS {groupInfo.dailyPayout?.toFixed(2)} per payout
        </Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Paid Out</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
            <Text style={styles.legendText}>Today</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F3F4F6' }]} />
            <Text style={styles.legendText}>Upcoming</Text>
          </View>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {schedule.map((item) => (
          <View
            key={item.position}
            style={[
              styles.timelineItem,
              item.isToday && styles.timelineItemToday,
              item.isPast && styles.timelineItemPast,
            ]}
          >
            <View style={styles.timelineLeft}>
              <View style={[
                styles.timelineDot,
                item.isToday && styles.timelineDotToday,
                item.isPast && styles.timelineDotPast,
              ]}>
                {item.hasReceived ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : item.isToday ? (
                  <Text style={styles.dotTodayText}>●</Text>
                ) : (
                  <Text style={styles.dotNumber}>{item.position}</Text>
                )}
              </View>
              {item.position < schedule.length && (
                <View style={[
                  styles.timelineLine,
                  item.isPast && styles.timelineLinePast,
                ]} />
              )}
            </View>

            <View style={styles.timelineContent}>
              <View style={styles.timelineCard}>
                <View style={styles.timelineHeader}>
                  <Text style={[styles.timelineName, item.isToday && styles.timelineNameToday]}>
                    {item.name}
                  </Text>
                  {item.isToday && (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayBadgeText}>TODAY</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.timelinePhone}>{item.phone}</Text>
                <Text style={styles.timelineAmount}>
                  GHS {groupInfo.dailyPayout?.toFixed(2)}
                </Text>
                {item.hasReceived && item.payoutDate && (
                  <Text style={styles.timelineDate}>
                    Paid: {new Date(item.payoutDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 },
  groupSelector: { paddingHorizontal: 16, paddingVertical: 12 },
  groupChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  groupChipActive: { backgroundColor: '#2563EB' },
  groupChipText: { fontSize: 14, fontWeight: '500', color: '#4B5563' },
  groupChipTextActive: { color: '#FFFFFF' },
  header: { padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#6B7280' },
  timeline: { paddingHorizontal: 16 },
  timelineItem: { flexDirection: 'row', marginBottom: 4 },
  timelineItemToday: {},
  timelineItemPast: { opacity: 0.7 },
  timelineLeft: { alignItems: 'center', width: 36 },
  timelineDot: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center', zIndex: 1,
  },
  timelineDotToday: { backgroundColor: '#2563EB', width: 32, height: 32, borderRadius: 16 },
  timelineDotPast: { backgroundColor: '#10B981' },
  dotNumber: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  dotTodayText: { fontSize: 18, color: '#FFFFFF' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginTop: 4 },
  timelineLinePast: { backgroundColor: '#10B981' },
  timelineContent: { flex: 1, marginLeft: 12, paddingBottom: 16 },
  timelineCard: {
    backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2,
  },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineName: { fontSize: 16, fontWeight: '600' },
  timelineNameToday: { color: '#2563EB', fontSize: 18 },
  todayBadge: { backgroundColor: '#2563EB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  todayBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  timelinePhone: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  timelineAmount: { fontSize: 18, fontWeight: '700', color: '#10B981', marginTop: 6 },
  timelineDate: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
});