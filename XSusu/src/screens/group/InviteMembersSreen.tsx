import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, Share, ActivityIndicator, RefreshControl, Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { inviteApi, PendingInvite } from '../../services/inviteApi';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'InviteMembers'>;

export function InviteMembersScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  
  const [group, setGroup] = useState<any>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'INVITE' | 'PENDING'>('INVITE');

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [groupId])
  );

  const fetchData = async () => {
    try {
      const [groupResponse, invitesResponse, shareResponse] = await Promise.all([
        api.get(`/groups/${groupId}`),
        inviteApi.getPendingInvites(groupId),
        inviteApi.generateShareLink(groupId),
      ]);

      setGroup(groupResponse.data.group);
      setPendingInvites(invitesResponse);
      setShareUrl(shareResponse);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleInviteByPhone = async () => {
    if (!phone || !position) {
      Alert.alert('Error', 'Phone number and position are required');
      return;
    }

    setAdding(true);
    try {
      const result = await inviteApi.inviteByPhone(
        groupId,
        phone,
        parseInt(position),
        name || undefined
      );

      if (result.status === 'ADDED') {
        Alert.alert('Success', 'Member added directly!');
      } else {
        Alert.alert('Invite Sent', `Invite code ${result.inviteCode} sent via SMS`);
      }

      // Clear form
      setPhone('');
      setName('');
      setPosition('');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to invite member');
    } finally {
      setAdding(false);
    }
  };

  const handleShareLink = async () => {
    if (!shareUrl) return;
    
    try {
      await Share.share({
        message: `🇬🇭 Join my Susu group!\n\nGroup: ${group?.name}\nDaily Pay: GHS ${group?.dailyContribution}\nPayout: GHS ${group?.dailyPayout}\nMembers: ${group?.memberCount}\n\nJoin here: ${shareUrl}\n\nDownload XSusu to join!`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    await Clipboard.setStringAsync(shareUrl);
    Alert.alert('Copied', 'Invite link copied to clipboard');
  };

  const handleCancelInvite = async (inviteId: string) => {
    Alert.alert('Cancel Invite', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await inviteApi.cancelInvite(inviteId);
            fetchData();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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
  const pendingPositions = pendingInvites.map(i => i.position);
  const unavailablePositions = [...takenPositions, ...pendingPositions];
  const availablePositions = Array.from(
    { length: group?.memberCount || 0 },
    (_, i) => i + 1
  ).filter((p: number) => !unavailablePositions.includes(p));

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Group Info */}
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{group?.name}</Text>
        <Text style={styles.progressText}>
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

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'INVITE' && styles.tabActive]}
          onPress={() => setActiveTab('INVITE')}
        >
          <Text style={[styles.tabText, activeTab === 'INVITE' && styles.tabTextActive]}>
            Invite Members
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'PENDING' && styles.tabActive]}
          onPress={() => setActiveTab('PENDING')}
        >
          <Text style={[styles.tabText, activeTab === 'PENDING' && styles.tabTextActive]}>
            Pending ({pendingInvites.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'INVITE' ? (
        <>
          {/* Share Link Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Share Invite Link</Text>
            <View style={styles.shareCard}>
              <Text style={styles.shareDescription}>
                Share this link via WhatsApp, SMS, or social media.
                Anyone with the link can view group details and request to join.
              </Text>
              <View style={styles.shareUrlContainer}>
                <Text style={styles.shareUrl} numberOfLines={1}>
                  {shareUrl || 'Generating...'}
                </Text>
              </View>
              <View style={styles.shareButtons}>
                <TouchableOpacity style={styles.shareButton} onPress={handleShareLink}>
                  <Ionicons name="share-social" size={20} color="#FFFFFF" />
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.copyButton} onPress={handleCopyLink}>
                  <Ionicons name="copy" size={20} color="#2563EB" />
                  <Text style={styles.copyButtonText}>Copy</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Add by Phone Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add by Phone Number</Text>
            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Abena Mensah"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0244123456"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  maxLength={10}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Position (1-{group?.memberCount})</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 5"
                  keyboardType="numeric"
                  value={position}
                  onChangeText={setPosition}
                />
                <Text style={styles.hint}>
                  Available: {availablePositions.slice(0, 10).join(', ')}
                  {availablePositions.length > 10 ? '...' : ''}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.addButton, adding && styles.buttonDisabled]}
                onPress={handleInviteByPhone}
                disabled={adding || !phone || !position}
              >
                {adding ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={20} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>Invite Member</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : (
        /* Pending Invites Tab */
        <View style={styles.section}>
          {pendingInvites.length > 0 ? (
            pendingInvites.map((invite) => (
              <View key={invite.id} style={styles.pendingCard}>
                <View style={styles.pendingHeader}>
                  <View style={styles.pendingInfo}>
                    <Text style={styles.pendingName}>
                      {invite.name || invite.phone}
                    </Text>
                    <Text style={styles.pendingPhone}>{invite.phone}</Text>
                    <Text style={styles.pendingPosition}>
                      Position #{invite.position}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleCancelInvite(invite.id)}
                    style={styles.cancelButton}
                  >
                    <Ionicons name="close-circle" size={24} color="#DC2626" />
                  </TouchableOpacity>
                </View>
                <View style={styles.pendingFooter}>
                  <Text style={styles.pendingCode}>
                    Code: {invite.inviteCode}
                  </Text>
                  <Text style={styles.pendingExpiry}>
                    Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="mail-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No pending invites</Text>
            </View>
          )}
        </View>
      )}

      {/* Current Members */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Current Members ({currentMemberCount})
        </Text>
        {group?.members?.map((member: any) => (
          <View key={member.id} style={styles.memberRow}>
            <Text style={styles.memberPosition}>#{member.position}</Text>
            <Text style={styles.memberName}>
              {member.user?.firstName} {member.user?.lastName}
            </Text>
            {member.position === 1 && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>ADMIN</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ... styles (comprehensive)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  groupInfo: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 16 },
  groupName: { fontSize: 22, fontWeight: '700' },
  progressText: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  progressBar: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, marginTop: 12 },
  progressFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 4 },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#2563EB' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#FFFFFF' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  shareCard: { backgroundColor: '#EFF6FF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  shareDescription: { fontSize: 14, color: '#4B5563', marginBottom: 12 },
  shareUrlContainer: { backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, marginBottom: 12 },
  shareUrl: { fontSize: 13, color: '#2563EB' },
  shareButtons: { flexDirection: 'row', gap: 10 },
  shareButton: { flex: 1, flexDirection: 'row', backgroundColor: '#2563EB', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 6 },
  shareButtonText: { color: '#FFFFFF', fontWeight: '600' },
  copyButton: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#2563EB' },
  copyButtonText: { color: '#2563EB', fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  formCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 16 },
  hint: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  addButton: { flexDirection: 'row', backgroundColor: '#2563EB', padding: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8 },
  buttonDisabled: { opacity: 0.5 },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  pendingCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 10 },
  pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pendingInfo: { flex: 1 },
  pendingName: { fontSize: 16, fontWeight: '600' },
  pendingPhone: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  pendingPosition: { fontSize: 14, color: '#2563EB', fontWeight: '500', marginTop: 4 },
  cancelButton: { padding: 4 },
  pendingFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  pendingCode: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  pendingExpiry: { fontSize: 12, color: '#9CA3AF' },
  emptyState: { alignItems: 'center', padding: 30 },
  emptyText: { color: '#6B7280', marginTop: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, marginBottom: 6, gap: 10 },
  memberPosition: { fontSize: 14, fontWeight: '600', color: '#2563EB', width: 30 },
  memberName: { fontSize: 15, flex: 1 },
  adminBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  adminBadgeText: { fontSize: 10, fontWeight: '700', color: '#D97706' },
});