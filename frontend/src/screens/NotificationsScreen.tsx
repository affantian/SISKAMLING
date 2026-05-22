import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const lang = user?.language || 'id';
  const [notifs, setNotifs] = useState<any[]>([]);
  const [pendings, setPendings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [n, p] = await Promise.all([
        api.get('/api/notifications'),
        api.get('/api/users/pending-approvals'),
      ]);
      setNotifs(n.data);
      setPendings(p.data);
    } catch (e) {
      setPendings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (userId: string, action: 'approve' | 'reject') => {
    try {
      await api.post('/api/users/approve', { user_id: userId, action });
      Alert.alert(lang === 'id' ? 'Berhasil' : 'Success',
        action === 'approve'
          ? (lang === 'id' ? 'Anggota disetujui' : 'Member approved')
          : (lang === 'id' ? 'Anggota ditolak' : 'Member rejected')
      );
      load();
    } catch (e) {
      Alert.alert('Error', lang === 'id' ? 'Gagal memproses' : 'Failed to process');
    }
  };

  const markRead = async (notifId: string) => {
    try {
      await api.post(`/api/notifications/${notifId}/read`);
      load();
    } catch {}
  };

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3B6D11" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} testID="back-button">
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {lang === 'id' ? 'Notifikasi' : 'Notifications'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {pendings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {lang === 'id' ? `Menunggu Persetujuan (${pendings.length})` : `Pending Approvals (${pendings.length})`}
            </Text>
            {pendings.map((p) => (
              <View key={p.id} style={styles.pendingCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingName}>{p.nama}</Text>
                  <Text style={styles.pendingMeta}>{p.email}</Text>
                  <Text style={styles.pendingMeta}>RT {p.rt}/RW {p.rw} · {p.role}</Text>
                </View>
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => approve(p.id, 'reject')} testID={`reject-${p.id}`}>
                    <Ionicons name="close" size={18} color="#E24B4A" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => approve(p.id, 'approve')} testID={`approve-${p.id}`}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {lang === 'id' ? 'Semua Notifikasi' : 'All Notifications'}
          </Text>
          {notifs.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off" size={48} color="#CCC" />
              <Text style={styles.emptyText}>
                {lang === 'id' ? 'Tidak ada notifikasi' : 'No notifications'}
              </Text>
            </View>
          ) : (
            notifs.map((n) => (
              <TouchableOpacity
                key={n.id}
                style={[styles.notifItem, !n.read && styles.notifItemUnread]}
                onPress={() => markRead(n.id)}
              >
                <View style={styles.notifIcon}>
                  <Ionicons name="notifications" size={20} color="#3B6D11" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifBody}>{n.body}</Text>
                  <Text style={styles.notifTime}>
                    {new Date(n.created_at).toLocaleString('id-ID')}
                  </Text>
                </View>
                {!n.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))
          )}
        </View>
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
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#666', marginBottom: 12 },
  pendingCard: {
    flexDirection: 'row', backgroundColor: '#FFF8E1', padding: 14,
    borderRadius: 10, marginBottom: 8, alignItems: 'center', gap: 12,
    borderLeftWidth: 3, borderLeftColor: '#BA7517',
  },
  pendingName: { fontSize: 14, fontWeight: '700', color: '#333' },
  pendingMeta: { fontSize: 11, color: '#666', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 6 },
  rejectBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFEBEE',
    justifyContent: 'center', alignItems: 'center',
  },
  approveBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#3B6D11',
    justifyContent: 'center', alignItems: 'center',
  },
  notifItem: {
    flexDirection: 'row', backgroundColor: '#fff', padding: 14,
    borderRadius: 10, marginBottom: 8, gap: 12, alignItems: 'flex-start',
  },
  notifItemUnread: { backgroundColor: '#F0F8E8' },
  notifIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
  },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  notifBody: { fontSize: 13, color: '#666', marginTop: 2 },
  notifTime: { fontSize: 10, color: '#999', marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B6D11', marginTop: 6 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 13, color: '#999', marginTop: 12 },
});
