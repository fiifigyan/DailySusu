import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GroupCardProps {
  group: any;
  onPress: () => void;
  compact?: boolean;
}

export function GroupCard({ group, onPress, compact = false }: GroupCardProps) {
  const progressPercent = group.totalDays > 0
    ? (group.currentDay / group.totalDays) * 100
    : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.nameSection}>
          <Ionicons
            name={group.status === 'ACTIVE' ? 'people' : 'checkmark-done'}
            size={20}
            color={group.status === 'ACTIVE' ? '#10B981' : '#6B7280'}
          />
          <Text style={styles.name}>{group.name}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          group.status === 'ACTIVE' ? styles.activeBadge : styles.completedBadge,
        ]}>
          <Text style={[
            styles.statusText,
            group.status === 'ACTIVE' ? styles.activeText : styles.completedText,
          ]}>
            {group.status}
          </Text>
        </View>
      </View>

      {!compact && (
        <>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            Day {group.currentDay} of {group.totalDays} ({Math.round(progressPercent)}%)
          </Text>

          <View style={styles.details}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Daily Pay</Text>
              <Text style={styles.detailValue}>GHS {group.dailyContribution}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Payout</Text>
              <Text style={styles.detailValue}>GHS {group.dailyPayout}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Members</Text>
              <Text style={styles.detailValue}>{group.memberCount}</Text>
            </View>
          </View>
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.myPosition}>
          Position: #{group.myPosition || '—'}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameSection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeBadge: { backgroundColor: '#DCFCE7' },
  completedBadge: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: 12, fontWeight: '600' },
  activeText: { color: '#10B981' },
  completedText: { color: '#6B7280' },
  progressBar: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, marginTop: 12 },
  progressFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 3 },
  progressLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  details: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 12, color: '#9CA3AF' },
  detailValue: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  myPosition: { fontSize: 14, color: '#2563EB', fontWeight: '500' },
});