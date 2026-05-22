import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function RoleRequestScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const lang = user?.language || 'id';
  const [selectedRole, setSelectedRole] = useState('koordinator_rt');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const currentRole = user?.role || 'warga';

  const availableRoles: any = {
    warga: [{ v: 'koordinator_rt', label: 'Koordinator RT', desc: 'Pimpin & approve warga RT Anda' }],
    koordinator_rt: [{ v: 'koordinator_rw', label: 'Koordinator RW', desc: 'Pimpin koordinator RT se-RW' }],
    koordinator_rw: [{ v: 'koordinator_kelurahan', label: 'Koord. Kelurahan', desc: 'Pimpin koord. RW se-Kelurahan' }],
    koordinator_kelurahan: [],
  };

  const roles = availableRoles[currentRole] || [];

  React.useEffect(() => {
    if (roles.length > 0) setSelectedRole(roles[0].v);
  }, []);

  const submit = async () => {
    if (!reason.trim()) {
      Alert.alert('Error', lang === 'id' ? 'Mohon isi alasan' : 'Please provide reason');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/users/request-role', { requested_role: selectedRole, reason });
      Alert.alert(
        lang === 'id' ? 'Berhasil' : 'Success',
        lang === 'id' ? 'Pengajuan terkirim. Tunggu persetujuan.' : 'Request submitted.',
      );
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} testID="back-button">
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {lang === 'id' ? 'Ajukan Jabatan' : 'Request Role'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.currentBox}>
            <Text style={styles.currentLabel}>{lang === 'id' ? 'Jabatan saat ini' : 'Current role'}</Text>
            <Text style={styles.currentValue}>{currentRole.replace('koordinator_', 'KOORD. ').toUpperCase()}</Text>
          </View>

          {roles.length === 0 ? (
            <View style={styles.maxLevelBox}>
              <Ionicons name="trophy" size={48} color="#3B6D11" />
              <Text style={styles.maxText}>
                {lang === 'id' ? 'Anda sudah di jabatan tertinggi' : 'Highest role'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                {lang === 'id' ? 'Pilih Jabatan' : 'Select Role'}
              </Text>
              {roles.map((r: any) => (
                <TouchableOpacity
                  key={r.v}
                  style={[styles.roleCard, selectedRole === r.v && styles.roleCardActive]}
                  onPress={() => setSelectedRole(r.v)}
                  testID={`role-${r.v}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roleLabel}>{r.label}</Text>
                    <Text style={styles.roleDesc}>{r.desc}</Text>
                  </View>
                  {selectedRole === r.v && (
                    <Ionicons name="checkmark-circle" size={24} color="#3B6D11" />
                  )}
                </TouchableOpacity>
              ))}

              <Text style={styles.sectionTitle}>{lang === 'id' ? 'Alasan' : 'Reason'}</Text>
              <TextInput
                style={styles.reasonInput}
                value={reason}
                onChangeText={setReason}
                placeholder={lang === 'id' ? 'Jelaskan alasan...' : 'Explain reason...'}
                multiline
                numberOfLines={5}
                testID="reason-input"
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={submit}
                disabled={loading}
                testID="submit-role-request"
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.submitText}>{lang === 'id' ? 'Kirim Pengajuan' : 'Submit'}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#333' },
  currentBox: { backgroundColor: '#E8F5E9', padding: 14, borderRadius: 10, marginBottom: 16 },
  currentLabel: { fontSize: 11, color: '#666', marginBottom: 4 },
  currentValue: { fontSize: 16, fontWeight: '700', color: '#3B6D11' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 16, marginBottom: 10 },
  roleCard: {
    flexDirection: 'row', backgroundColor: '#fff', padding: 14,
    borderRadius: 10, marginBottom: 8, borderWidth: 2, borderColor: 'transparent', alignItems: 'center',
  },
  roleCardActive: { borderColor: '#3B6D11', backgroundColor: '#F0F8E8' },
  roleLabel: { fontSize: 14, fontWeight: '700', color: '#333' },
  roleDesc: { fontSize: 12, color: '#666', marginTop: 2 },
  reasonInput: {
    backgroundColor: '#fff', padding: 12, borderRadius: 10, fontSize: 14,
    minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#E0E0E0',
  },
  submitBtn: { backgroundColor: '#3B6D11', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  maxLevelBox: { alignItems: 'center', padding: 40 },
  maxText: { fontSize: 14, color: '#3B6D11', fontWeight: '600', marginTop: 12 },
});
