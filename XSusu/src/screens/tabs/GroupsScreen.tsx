import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import { GroupCard } from '../../components/susu/GroupCard';

export function GroupsScreen({ navigation }: any) {
  const [groups, setGroups] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [])
  );

  const fetchGroups = async () => {
    try {
      const response: any = await api.get('/groups');
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  const filteredGroups = groups.filter((g) => {
    if (filter === 'ALL') return true;
    return g.status === filter;
  });

  const activeCount = groups.filter(g => g.status === 'ACTIVE').length;
  const completedCount = groups.filter(g => g.status === 'COMPLETED').length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {[
          { key: 'ALL' as const, label: 'All', count: groups.length },
          { key: 'ACTIVE' as const, label: 'Active', count: activeCount },
          { key: 'COMPLETED' as const, label: 'Completed', count: completedCount },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text style={[styles.filterText, filter === tab.key && styles.filterTextActive]}>
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => (
            <View key={group.id} style={styles.groupWrapper}>
              <GroupCard
                group={group}
                onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
              />
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No {filter.toLowerCase()} groups</Text>
            <Text style={styles.emptySubtitle}>
              Create a new Susu group to get started
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateGroup')}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateGroup')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', gap: 8,
  },
  filterTab: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  filterTabActive: { backgroundColor: '#2563EB' },
  filterText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  filterTextActive: { color: '#FFFFFF' },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  groupWrapper: { marginBottom: 8 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 },
  createButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563EB',
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 20, gap: 8,
  },
  createButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 20, right: 20, width: 56, height: 56,
    borderRadius: 28, backgroundColor: '#2563EB', justifyContent: 'center',
    alignItems: 'center', elevation: 5, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
  },
});