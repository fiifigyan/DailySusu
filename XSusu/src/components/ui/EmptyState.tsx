import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color="#D1D5DB" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 40 },
  title: { fontSize: 18, fontWeight: '600', marginTop: 16, color: '#1F2937' },
  message: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 },
  button: {
    backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, marginTop: 16,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
});