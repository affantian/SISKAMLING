import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function EmergencyScreen() {
  const { user, logout, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmAlert, setConfirmAlert] = useState<{ type: string; title: string } | null>(null);
  const [resultAlert, setResultAlert] = useState<{ title: string; message: string } | null>(null);
  const lang = user?.language || 'id';

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await api.get('/api/emergency/history');
      setHistory(response.data.slice(0, 5));
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const toggleMode = async () => {
    const newMode = user?.mode === 'rumah' ? 'pergi' : 'rumah';
    try {
      await api.put('/api/users/profile', { mode: newMode });
      updateUser({ mode: newMode });
    } catch (error) {
      Alert.alert('Error', 'Gagal mengubah mode');
    }
  };

  const sendEmergencyAlert = (type: string) => {
    const labels: any = {
      id: {
        sos: 'SOS - Darurat Umum',
        medis: 'Darurat Medis',
        kriminal: 'Darurat Kriminal',
        kebakaran: 'Darurat Kebakaran',
      },
      en: {
        sos: 'SOS - General Emergency',
        medis: 'Medical Emergency',
        kriminal: 'Criminal Emergency',
        kebakaran: 'Fire Emergency',
      },
    };
    setConfirmAlert({ type, title: labels[lang][type] });
  };

  const confirmSendAlert = async () => {
    if (!confirmAlert) return;
    const type = confirmAlert.type;
    setConfirmAlert(null);
    setLoading(true);
    try {
      await api.post('/api/emergency/alert', {
        type,
        location: user?.location || { lat: 0, lng: 0 },
        alamat: user?.alamat,
        rw: user?.rw,
        rt: user?.rt,
        mode: user?.mode,
      });
      setResultAlert({
        title: lang === 'id' ? 'Berhasil' : 'Success',
        message:
          lang === 'id'
            ? 'Notifikasi darurat telah dikirim!'
            : 'Emergency notification sent!',
      });
      loadHistory();
    } catch (error) {
      setResultAlert({
        title: lang === 'id' ? 'Gagal' : 'Failed',
        message:
          lang === 'id'
            ? 'Gagal mengirim notifikasi'
            : 'Failed to send notification',
      });
    } finally {
      setLoading(false);
    }
  };

  const getModeInfo = () => {
    const isHome = user?.mode === 'rumah';
    return {
      label: isHome
        ? lang === 'id' ? 'Di Rumah' : 'At Home'
        : lang === 'id' ? 'Pergi' : 'Away',
      icon: isHome ? 'home' : 'walk',
      color: isHome ? '#3B6D11' : '#BA7517',
      buttonText: isHome
        ? lang === 'id' ? 'Tandai Pergi' : 'Mark Away'
        : lang === 'id' ? 'Tandai Di Rumah' : 'Mark Home',
    };
  };

  const modeInfo = getModeInfo();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logo}>
              <Ionicons name="shield-checkmark" size={24} color="#3B6D11" />
            </View>
            <View>
              <Text style={styles.appTitle}>SISKAMLING</Text>
              <Text style={styles.appSubtitle}>
                {lang === 'id' ? 'Warga Jaga Warga' : 'Community Watch'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.userButton}
            onPress={() => setShowMenu(true)}
            testID="user-pill"
          >
            <View style={[styles.statusDot, { backgroundColor: modeInfo.color }]} />
            <Text style={styles.userName} numberOfLines={1}>
              {user?.nama}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mode Bar */}
        <View style={[styles.modeBar, { backgroundColor: `${modeInfo.color}15` }]}>
          <View style={[styles.modeIcon, { backgroundColor: `${modeInfo.color}30` }]}>
            <Ionicons name={modeInfo.icon as any} size={20} color={modeInfo.color} />
          </View>
          <View style={styles.modeInfo}>
            <Text style={styles.modeLabel}>{modeInfo.label}</Text>
            <Text style={styles.modeSub}>
              {user?.mode === 'rumah'
                ? lang === 'id'
                  ? 'Lokasi terdaftar'
                  : 'Registered location'
                : lang === 'id'
                ? 'Di luar lokasi'
                : 'Outside location'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.modeToggle, { backgroundColor: modeInfo.color }]}
            onPress={toggleMode}
            testID="mode-toggle-button"
          >
            <Text style={styles.modeToggleText}>{modeInfo.buttonText}</Text>
          </TouchableOpacity>
        </View>

        {/* Location Bar */}
        <View style={styles.locationBar}>
          <View style={[styles.locationPulse, { backgroundColor: modeInfo.color }]} />
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>
              {modeInfo.label} · GPS {lang === 'id' ? 'aktif' : 'active'}
            </Text>
            <Text style={styles.locationAddress}>{user?.alamat}</Text>
          </View>
          <View style={styles.rwBadge}>
            <Text style={styles.rwBadgeText}>RW {user?.rw}</Text>
          </View>
        </View>

        {/* SOS Button */}
        <View style={styles.sosContainer}>
          <TouchableOpacity
            style={styles.sosButton}
            onPress={() => sendEmergencyAlert('sos')}
            disabled={loading}
            testID="sos-button"
          >
            <View style={styles.sosInner}>
              <Text style={styles.sosLabel}>SOS</Text>
              <Text style={styles.sosSub}>
                {lang === 'id' ? 'Darurat umum' : 'General emergency'}
              </Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.sosHint}>
            {lang === 'id' ? 'Notifikasi → warga RW' : 'Notification → RW members'} {user?.rw}
          </Text>
        </View>

        {/* Emergency Types */}
        <View style={styles.emergencyGrid}>
          <TouchableOpacity
            style={[styles.emergencyButton, styles.medisButton]}
            onPress={() => sendEmergencyAlert('medis')}
            disabled={loading}
            testID="emergency-medis-button"
          >
            <Ionicons name="medical" size={32} color="#185FA5" />
            <Text style={styles.emergencyName}>
              {lang === 'id' ? 'MEDIS' : 'MEDICAL'}
            </Text>
            <Text style={styles.emergencyDesc}>
              {lang === 'id' ? 'Kecelakaan / sakit' : 'Accident / illness'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.emergencyButton, styles.kriminalButton]}
            onPress={() => sendEmergencyAlert('kriminal')}
            disabled={loading}
            testID="emergency-kriminal-button"
          >
            <Ionicons name="warning" size={32} color="#BA7517" />
            <Text style={styles.emergencyName}>
              {lang === 'id' ? 'KRIMINAL' : 'CRIMINAL'}
            </Text>
            <Text style={styles.emergencyDesc}>
              {lang === 'id' ? 'Maling / kejahatan' : 'Theft / crime'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.emergencyButton, styles.kebakaranButton]}
            onPress={() => sendEmergencyAlert('kebakaran')}
            disabled={loading}
            testID="emergency-kebakaran-button"
          >
            <Ionicons name="flame" size={32} color="#E24B4A" />
            <Text style={styles.emergencyName}>
              {lang === 'id' ? 'KEBAKARAN' : 'FIRE'}
            </Text>
            <Text style={styles.emergencyDesc}>
              {lang === 'id' ? 'Kebakaran / api' : 'Fire / flames'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Routing Info */}
        <View style={styles.routingBox}>
          <Text style={styles.routingTitle}>
            <Ionicons name="send" size={14} />{' '}
            {lang === 'id' ? 'Routing notifikasi aktif:' : 'Active notification routing:'}
          </Text>
          <View style={styles.routingSteps}>
            <View style={styles.routingStep}>
              <View style={[styles.stepDot, { backgroundColor: '#3B6D11' }]} />
              <Text style={styles.stepText}>
                {lang === 'id' ? 'Semua warga RW' : 'All RW members'} {user?.rw}
              </Text>
            </View>
            <View style={styles.routingStep}>
              <View style={[styles.stepDot, { backgroundColor: '#534AB7' }]} />
              <Text style={styles.stepText}>
                {lang === 'id' ? 'Ketua RW — koordinator respons' : 'RW Head — response coordinator'}
              </Text>
            </View>
            <View style={styles.routingStep}>
              <View style={[styles.stepDot, { backgroundColor: '#12122a' }]} />
              <Text style={styles.stepText}>
                {lang === 'id' ? 'Penjaga Patroli — siaga area' : 'Patrol Guard — area standby'}
              </Text>
            </View>
            <View style={styles.routingStep}>
              <View style={[styles.stepDot, { backgroundColor: '#185FA5' }]} />
              <Text style={styles.stepText}>
                {lang === 'id' ? 'Ketua Kelurahan — eskalasi otomatis' : 'Village Head — auto escalation'}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent History */}
        {history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>
              {lang === 'id' ? 'Riwayat Terbaru' : 'Recent History'}
            </Text>
            {history.map((item: any, index) => (
              <View key={index} style={styles.historyItem}>
                <Ionicons
                  name={
                    item.type === 'sos'
                      ? 'alert-circle'
                      : item.type === 'medis'
                      ? 'medical'
                      : item.type === 'kriminal'
                      ? 'warning'
                      : 'flame'
                  }
                  size={20}
                  color="#666"
                />
                <View style={styles.historyInfo}>
                  <Text style={styles.historyType}>{item.type.toUpperCase()}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.created_at).toLocaleString('id-ID')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={confirmAlert !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmAlert(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Ionicons name="alert-circle" size={48} color="#E24B4A" />
            <Text style={styles.confirmTitle}>
              {lang === 'id' ? 'Konfirmasi' : 'Confirm'}
            </Text>
            <Text style={styles.confirmMessage}>
              {lang === 'id'
                ? `Kirim notifikasi ${confirmAlert?.title}?`
                : `Send ${confirmAlert?.title} notification?`}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.cancelBtn]}
                onPress={() => setConfirmAlert(null)}
                testID="confirm-cancel-button"
              >
                <Text style={styles.cancelBtnText}>
                  {lang === 'id' ? 'Batal' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.sendBtn]}
                onPress={confirmSendAlert}
                testID="confirm-send-button"
              >
                <Text style={styles.sendBtnText}>
                  {lang === 'id' ? 'Kirim' : 'Send'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Result Modal */}
      <Modal
        visible={resultAlert !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setResultAlert(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Ionicons
              name={resultAlert?.title.includes('Berhasil') || resultAlert?.title.includes('Success') ? 'checkmark-circle' : 'close-circle'}
              size={48}
              color={resultAlert?.title.includes('Berhasil') || resultAlert?.title.includes('Success') ? '#3B6D11' : '#E24B4A'}
            />
            <Text style={styles.confirmTitle}>{resultAlert?.title}</Text>
            <Text style={styles.confirmMessage}>{resultAlert?.message}</Text>
            <TouchableOpacity
              style={[styles.confirmBtn, styles.sendBtn, { width: '100%' }]}
              onPress={() => setResultAlert(null)}
              testID="result-ok-button"
            >
              <Text style={styles.sendBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuItem}>
              <Text style={styles.menuLabel}>
                {lang === 'id' ? 'Email' : 'Email'}
              </Text>
              <Text style={styles.menuValue}>{user?.email}</Text>
            </View>
            <View style={styles.menuItem}>
              <Text style={styles.menuLabel}>
                {lang === 'id' ? 'Alamat' : 'Address'}
              </Text>
              <Text style={styles.menuValue}>{user?.alamat}</Text>
            </View>
            <View style={styles.menuItem}>
              <Text style={styles.menuLabel}>RW / RT</Text>
              <Text style={styles.menuValue}>
                {user?.rw} / {user?.rt}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                setShowMenu(false);
                logout();
              }}
              testID="logout-button"
            >
              <Ionicons name="log-out-outline" size={20} color="#E24B4A" />
              <Text style={styles.logoutText}>
                {lang === 'id' ? 'Keluar' : 'Logout'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3B6D11" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B6D11',
  },
  appSubtitle: {
    fontSize: 11,
    color: '#666',
  },
  userButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    maxWidth: 150,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  modeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    gap: 12,
  },
  modeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeInfo: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  modeSub: {
    fontSize: 12,
    color: '#666',
  },
  modeToggle: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  modeToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    gap: 12,
  },
  locationPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  rwBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  rwBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B6D11',
  },
  sosContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  sosButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#E24B4A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E24B4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sosInner: {
    alignItems: 'center',
  },
  sosLabel: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  sosSub: {
    fontSize: 12,
    color: '#fff',
  },
  sosHint: {
    marginTop: 16,
    fontSize: 12,
    color: '#666',
  },
  emergencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  emergencyButton: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  medisButton: {
    backgroundColor: '#E3F2FD',
  },
  kriminalButton: {
    backgroundColor: '#FFF3E0',
  },
  kebakaranButton: {
    backgroundColor: '#FFEBEE',
  },
  emergencyName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
    color: '#333',
  },
  emergencyDesc: {
    fontSize: 9,
    color: '#666',
    textAlign: 'center',
  },
  routingBox: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  routingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  routingSteps: {
    gap: 12,
  },
  routingStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  historySection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  historyDate: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  menuItem: {
    marginBottom: 16,
  },
  menuLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  menuValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E24B4A',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F5F5F5',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 15,
  },
  sendBtn: {
    backgroundColor: '#E24B4A',
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
