import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';

export function CreateGroupScreen({ navigation }: any) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    memberCount: '35',
    dailyContribution: '21',
    dailyPayout: '700',
    surplusUse: 'App maintenance: GHS 10, Emergency fund: GHS 25',
    verificationMethod: 'MANUAL' as 'MANUAL' | 'AUTO_VERIFY',
    appFeePerMember: '2',
  });

  const dailyTotal = parseFloat(formData.dailyContribution || '0') * parseInt(formData.memberCount || '0');
  const dailySurplus = dailyTotal - parseFloat(formData.dailyPayout || '0');
  const monthlyRevenue = parseFloat(formData.appFeePerMember || '0') * parseInt(formData.memberCount || '0');

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setLoading(true);
    try {
      const response: any = await api.post('/groups', {
        name: formData.name,
        description: formData.description,
        memberCount: parseInt(formData.memberCount),
        dailyContribution: parseFloat(formData.dailyContribution),
        dailyPayout: parseFloat(formData.dailyPayout),
        surplusUse: formData.surplusUse,
        verificationMethod: formData.verificationMethod,
        appFeePerMember: parseFloat(formData.appFeePerMember),
      });

      Alert.alert('Success', 'Group created!', [
        { text: 'Invite Members', onPress: () => navigation.navigate('InviteMembers', { groupId: response.data.group.id }) },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.form}>
        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
                <Text style={[styles.stepNumber, step >= s && styles.stepNumberActive]}>{s}</Text>
              </View>
              {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
            </React.Fragment>
          ))}
        </View>
        <Text style={styles.stepLabel}>
          {step === 1 ? 'Basic Info' : step === 2 ? 'Money Setup' : 'Review'}
        </Text>

        {step === 1 && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Group Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Family Susu 2026"
                value={formData.name}
                onChangeText={(text) => updateField('name', text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your susu group..."
                value={formData.description}
                onChangeText={(text) => updateField('description', text)}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Number of Members *</Text>
              <TextInput
                style={styles.input}
                placeholder="35"
                keyboardType="numeric"
                value={formData.memberCount}
                onChangeText={(text) => updateField('memberCount', text)}
              />
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Daily Contribution (GHS) *</Text>
              <TextInput
                style={styles.input}
                placeholder="21"
                keyboardType="numeric"
                value={formData.dailyContribution}
                onChangeText={(text) => updateField('dailyContribution', text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Daily Payout (GHS) *</Text>
              <TextInput
                style={styles.input}
                placeholder="700"
                keyboardType="numeric"
                value={formData.dailyPayout}
                onChangeText={(text) => updateField('dailyPayout', text)}
              />
            </View>

            <View style={styles.calculationCard}>
              <Text style={styles.calcTitle}>Daily Breakdown</Text>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Total Collected</Text>
                <Text style={styles.calcValue}>GHS {dailyTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Payout</Text>
                <Text style={styles.calcValue}>- GHS {parseFloat(formData.dailyPayout || '0').toFixed(2)}</Text>
              </View>
              <View style={[styles.calcRow, styles.calcRowTotal]}>
                <Text style={styles.calcLabelBold}>Daily Surplus</Text>
                <Text style={styles.calcValueBold}>GHS {dailySurplus.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Surplus Usage</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g., App maintenance: GHS 10, Emergency fund: GHS 25"
                value={formData.surplusUse}
                onChangeText={(text) => updateField('surplusUse', text)}
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Verification Method</Text>
              <View style={styles.radioGroup}>
                {[
                  { value: 'MANUAL' as const, label: 'Manual Check-in' },
                  { value: 'AUTO_VERIFY' as const, label: 'Auto-Verify (MoMo API)' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.radioOption, formData.verificationMethod === option.value && styles.radioOptionActive]}
                    onPress={() => updateField('verificationMethod', option.value)}
                  >
                    <Ionicons
                      name={formData.verificationMethod === option.value ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={formData.verificationMethod === option.value ? '#2563EB' : '#9CA3AF'}
                    />
                    <Text style={styles.radioLabel}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Monthly App Fee per Member (GHS)</Text>
              <TextInput
                style={styles.input}
                placeholder="2"
                keyboardType="numeric"
                value={formData.appFeePerMember}
                onChangeText={(text) => updateField('appFeePerMember', text)}
              />
              <Text style={styles.hint}>
                Monthly revenue: GHS {monthlyRevenue.toFixed(2)} ({formData.memberCount} members × GHS {formData.appFeePerMember})
              </Text>
            </View>
          </>
        )}

        {step === 3 && (
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Review & Confirm</Text>
            {[
              ['Group Name', formData.name],
              ['Members', formData.memberCount],
              ['Daily Contribution', `GHS ${parseFloat(formData.dailyContribution || '0').toFixed(2)}`],
              ['Daily Payout', `GHS ${parseFloat(formData.dailyPayout || '0').toFixed(2)}`],
              ['Daily Surplus', `GHS ${dailySurplus.toFixed(2)}`],
              ['Verification', formData.verificationMethod === 'AUTO_VERIFY' ? 'Auto-Verify' : 'Manual'],
              ['Monthly Revenue', `GHS ${monthlyRevenue.toFixed(2)}`],
            ].map(([label, value]) => (
              <View key={label} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{label}</Text>
                <Text style={styles.summaryValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Navigation */}
        <View style={styles.buttonRow}>
          {step > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          {step < 3 ? (
            <TouchableOpacity style={styles.nextButton} onPress={() => setStep(step + 1)}>
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.createButton, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createButtonText}>Create Group</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  form: { flex: 1, padding: 16 },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4, paddingVertical: 16 },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: '#2563EB' },
  stepNumber: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  stepNumberActive: { color: '#FFFFFF' },
  stepLine: { width: 40, height: 2, backgroundColor: '#E5E7EB' },
  stepLineActive: { backgroundColor: '#2563EB' },
  stepLabel: { textAlign: 'center', fontSize: 13, color: '#6B7280', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  calculationCard: { backgroundColor: '#F0FDF4', padding: 16, borderRadius: 12, marginBottom: 16 },
  calcTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  calcRowTotal: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#DCFCE7' },
  calcLabel: { fontSize: 14, color: '#4B5563' },
  calcValue: { fontSize: 14, fontWeight: '500' },
  calcLabelBold: { fontSize: 15, fontWeight: '600' },
  calcValueBold: { fontSize: 16, fontWeight: '700', color: '#10B981' },
  radioGroup: { gap: 8 },
  radioOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF',
    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  radioOptionActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  radioLabel: { fontSize: 15 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  summaryCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 24, paddingBottom: 40 },
  backButton: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  backButtonText: { fontSize: 16, fontWeight: '600', color: '#4B5563' },
  nextButton: { flex: 2, padding: 16, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center' },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  createButton: { flex: 2, padding: 16, borderRadius: 12, backgroundColor: '#10B981', alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  createButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});