import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, Share, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { api } from '../../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'InviteMembers'>;

export function InviteMembersScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  const [group, setGroup] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchGroupDetails();
  }, [groupId]);

  const fetchGroupDetails = async () => {
    try {
      const response: any = await api.get(`/groups/${groupId}`);
      setGroup(response.data.group);
    } catch (error) {
      Alert.alert('Error', 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!name || !position) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setAdding(true);
    try {
      await api.post(`/groups/${groupId}/members`, {
        userId: 'placeholder', // In production, look up user by phone
        position: parseInt(position),
      });
      
      Alert.alert('Success', 'Member added!');
      setName('');
      setPhoneNumber('');
      setPosition('');
      fetchGroupDetails();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setAdding(false);
    }
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `Join my Susu group "${group?.name}"!\n\nDaily contribution: GHS ${group?.dailyContribution}\nDaily payout: GHS ${group?.dailyPayout}\n\nDownload XSusu to join!`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const currentMemberCount = group?.members?.length || 0;
  const remainingSpots = (group?.memberCount || 0) - currentMemberCount;
  const takenPositions = group?.members?.map((m: any) => m.position) || [];
  const availablePositions = Array.from(
    { length: group?.memberCount || 0 },
    (_, i) => i + 1
  ).filter((p: number) => !takenPositions.includes(p));

  return (
    <ScrollView style={styles.container}>
      {/* Group Info */}
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{group?.name}</Text>
        <Text style={styles.progress}>
          {currentMemberCount}/{group?.memberCount} members joined
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(currentMemberCount / (group?.memberCount || 1)) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Current Members */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Members</Text>
        {group?.members?.map((member: any) => (
          <View key={member.id} style={styles.memberRow}>
            <Text style={styles.memberPosition}>#{member.position}</Text>
            <Text style={styles.memberName}>
              {member.user?.firstName} {member.user?.lastName}
            </Text>
          </View>
        ))}
      </View>

      {/* Add Member Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add New Member</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} placeholder="Kwame Nkrumah" value={name} onChangeText={setName} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput style={styles.input} placeholder="0244123456" keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Position (1-{group?.memberCount})</Text>
          <TextInput style={styles.input} placeholder="e.g., 5" keyboardType="numeric" value={position} onChangeText={setPosition} />
          <Text style={styles.hint}>
            Available: {availablePositions.slice(0, 10).join(', ')}
            {availablePositions.length > 10 ? '...' : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addButton, adding && styles.buttonDisabled]}
          onPress={handleAddMember}
          disabled={adding}
        >
          {adding ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="person-add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Member</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Share */}
      <TouchableOpacity style={styles.shareButton} onPress={handleShareLink}>
        <Ionicons name="share-outline" size={20} color="#2563EB" />
        <Text style={styles.shareText}>Share Invite Link</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  groupInfo: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 20 },
  groupName: { fontSize: 22, fontWeight: '700' },
  progress: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  progressBar: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, marginTop: 12 },
  progressFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  memberRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, marginBottom: 6, gap: 10 },
  memberPosition: { fontSize: 14, fontWeight: '600', color: '#2563EB', width: 30 },
  memberName: { fontSize: 15 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 16 },
  hint: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  addButton: { flexDirection: 'row', backgroundColor: '#2563EB', padding: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8 },
  buttonDisabled: { opacity: 0.5 },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  shareButton: { flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#2563EB' },
  shareText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
});