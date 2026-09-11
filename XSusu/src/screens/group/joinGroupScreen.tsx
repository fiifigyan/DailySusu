import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { inviteApi } from '../../services/inviteApi';

export function JoinGroupScreen({ navigation }: any) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [groupPreview, setGroupPreview] = useState<any>(null);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    setLoading(true);
    try {
      const result = await inviteApi.joinByCode(inviteCode.trim().toUpperCase());
      
      Alert.alert(
        '🎉 Joined Successfully!',
        `You are now member #${result.position} of "${result.group.name}".\n\nYour payout day is Day ${result.position}.`,
        [
          { text: 'Go to Dashboard', onPress: () => navigation.navigate('Main') },
        ]
      );
    } catch (error: any) {
      Alert.alert('Join Failed', error.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="people-circle" size={80} color="#2563EB" />
        <Text style={styles.title}>Join a Susu Group</Text>
        <Text style={styles.subtitle}>
          Enter the invite code you received from the group admin
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Invite Code</Text>
        <TextInput
          style={styles.codeInput}
          placeholder="XSU-ABC-123"
          value={inviteCode}
          onChangeText={(text) => setInviteCode(text.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.joinButton, loading && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={loading || !inviteCode}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.joinButtonText}>Join Group</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.helpText}>
          Don't have an invite code? Ask your group admin for one.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', marginTop: 16 },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 },
  form: { gap: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  codeInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2563EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
    color: '#2563EB',
  },
  joinButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  joinButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  helpText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});