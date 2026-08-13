import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

interface MemberRowProps {
  name: string;
  phone: string;
  status: 'PAID' | 'VERIFIED' | 'PENDING' | 'MISSED';
  position: number;
  onCheckIn?: () => void;
  onVerify?: () => void;
  isVerifying?: boolean;
  showAutoVerify?: boolean;
}

export function MemberRow({
  name, phone, status, position,
  onCheckIn, onVerify, isVerifying = false,
  showAutoVerify = false,
}: MemberRowProps) {
  const statusConfig = {
    PAID: { icon: '✅', color: '#10B981', bg: '#DCFCE7', label: 'Paid' },
    VERIFIED: { icon: '🔒', color: '#2563EB', bg: '#EFF6FF', label: 'Verified' },
    PENDING: { icon: '⏳', color: '#D97706', bg: '#FEF3C7', label: 'Pending' },
    MISSED: { icon: '❌', color: '#DC2626', bg: '#FEE2E2', label: 'Missed' },
  };

  const config = statusConfig[status];

  return (
    <View style={[styles.container, { borderLeftColor: config.color }]}>
      <View style={styles.info}>
        <Text style={styles.position}>#{position}</Text>
        <View style={styles.nameSection}>
          <Text style={styles.name}>{name}</Text>
          {phone ? <Text style={styles.phone}>{phone}</Text> : null}
        </View>
      </View>

      <View style={styles.actions}>
        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
          <Text style={styles.statusIcon}>{config.icon}</Text>
          <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>

        {status === 'PENDING' && (
          <View style={styles.buttonGroup}>
            {onCheckIn && (
              <TouchableOpacity style={styles.checkInButton} onPress={onCheckIn}>
                <Text style={styles.checkInText}>Check In</Text>
              </TouchableOpacity>
            )}
            {showAutoVerify && onVerify && (
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={onVerify}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <Text style={styles.verifyText}>Verify</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10, marginBottom: 8,
    borderLeftWidth: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  position: { fontSize: 14, fontWeight: '600', color: '#6B7280', width: 30 },
  nameSection: { flex: 1 },
  name: { fontSize: 15, fontWeight: '500' },
  phone: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  actions: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusIcon: { fontSize: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  buttonGroup: { flexDirection: 'row', gap: 6 },
  checkInButton: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  checkInText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  verifyButton: {
    backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#2563EB',
  },
  verifyText: { color: '#2563EB', fontSize: 12, fontWeight: '600' },
});