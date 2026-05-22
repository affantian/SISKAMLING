import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function ProfileScreen() {
  const { user, updateUser } = useAuth();
  const navigation = useNavigation();
  const lang = user?.language || 'id';
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nama: user?.nama || '',
    alamat: user?.alamat || '',
    rt: user?.rt || '',
    rw: user?.rw || '',
    kelurahan: user?.kelurahan || 'Sukamaju',
  });

  const save = async () => {
    setLoading(true);
    try {
      const res = await api.put('/api/users/profile', form);
      updateUser(res.data);
      setEditing(false);
      Alert.alert(lang === 'id' ? 'Berhasil' : 'Success', lang === 'id' ? 'Profil diperbarui' : 'Profile updated');
    } catch (e) {
      Alert.alert('Error', lang === 'id' ? 'Gagal menyimpan' : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const roleLabel: any = {
    warga: 'Warga',
    koordinator_rt: 'Koordinator RT',
    koordinator_rw: 'Koordinator RW',
    koordinator_kelurahan: 'Koordinator Kelurahan',
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} testID="back-button">
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{lang === 'id' ? 'Profil Saya' : 'My Profile'}</Text>
        <TouchableOpacity onPress={() => setEditing(!editing)} testID="edit-toggle">
          <Ionicons name={editing ? 'close' : 'create'} size={22} color="#3B6D11" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.nama?.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user?.nama}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleLabel[user?.role || 'warga']}</Text>
          </View>
          {user?.approval_status === 'pending' && (
            <View style={styles.pendingBadge}>
              <Ionicons name="time" size={12} color="#BA7517" />
              <Text style={styles.pendingText}>
                {lang === 'id' ? 'Menunggu Persetujuan' : 'Pending Approval'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{lang === 'id' ? 'Informasi Pribadi' : 'Personal Info'}</Text>

          <View style={styles.field}>
            <Text style={styles.label}>{lang === 'id' ? 'Nama' : 'Name'}</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={form.nama}
                onChangeText={(v) => setForm({ ...form, nama: v })}
                testID="profile-nama-input"
              />
            ) : (
              <Text style={styles.value}>{user?.nama}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{lang === 'id' ? 'Alamat' : 'Address'}</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={form.alamat}
                onChangeText={(v) => setForm({ ...form, alamat: v })}
                multiline
                testID="profile-alamat-input"
              />
            ) : (
              <Text style={styles.value}>{user?.alamat}</Text>
            )}
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>RT</Text>
              {editing ? (
                <TextInput style={styles.input} value={form.rt} onChangeText={(v) => setForm({ ...form, rt: v })} />
              ) : (
                <Text style={styles.value}>{user?.rt}</Text>
              )}
            </View>
            <View style={[styles.field, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>RW</Text>
              {editing ? (
                <TextInput style={styles.input} value={form.rw} onChangeText={(v) => setForm({ ...form, rw: v })} />
              ) : (
                <Text style={styles.value}>{user?.rw}</Text>
              )}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{lang === 'id' ? 'Kelurahan' : 'Kelurahan'}</Text>
            {editing ? (
              <TextInput style={styles.input} value={form.kelurahan} onChangeText={(v) => setForm({ ...form, kelurahan: v })} />
            ) : (
              <Text style={styles.value}>{user?.kelurahan}</Text>
            )}
          </View>

          {editing && (
            <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={loading} testID="save-profile-button">
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.saveBtnText}>{lang === 'id' ? 'Simpan' : 'Save'}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {!editing && user?.approval_status === 'approved' && (
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => navigation.navigate('RoleRequest' as never)}
            testID="upgrade-role-button"
          >
            <Ionicons name="arrow-up-circle" size={22} color="#3B6D11" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.upgradeTitle}>
                {lang === 'id' ? 'Ajukan Naik Jabatan' : 'Request Role Upgrade'}
              </Text>
              <Text style={styles.upgradeSub}>
                {lang === 'id' ? 'Jadi koordinator RT/RW/Kelurahan' : 'Become RT/RW coordinator'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </ScrollView>
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
  avatarSection: { alignItems: 'center', paddingVertical: 20 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#3B6D11' },
  userName: { fontSize: 18, fontWeight: '700', color: '#333' },
  roleBadge: { marginTop: 6, paddingVertical: 4, paddingHorizontal: 12, backgroundColor: '#3B6D11', borderRadius: 12 },
  roleBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  pendingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8,
    backgroundColor: '#FFF3E0', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10,
  },
  pendingText: { fontSize: 11, color: '#BA7517', fontWeight: '600' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#666', marginBottom: 12 },
  field: { marginBottom: 14 },
  row: { flexDirection: 'row' },
  label: { fontSize: 11, color: '#999', marginBottom: 4 },
  value: { fontSize: 14, color: '#333', fontWeight: '500' },
  input: {
    backgroundColor: '#F5F5F5', borderRadius: 8, padding: 10, fontSize: 14, color: '#333',
  },
  saveBtn: {
    backgroundColor: '#3B6D11', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 16, borderRadius: 12, marginTop: 12,
  },
  upgradeTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  upgradeSub: { fontSize: 11, color: '#666', marginTop: 2 },
});
