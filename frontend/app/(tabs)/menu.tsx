import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'approval' | 'status' | 'general';
  read: boolean;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const MenuTab = () => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showCoordinatorRequest, setShowCoordinatorRequest] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Persetujuan Keanggotaan',
      message: 'Profil Anda telah disetujui oleh koordinator RT',
      timestamp: '2 jam yang lalu',
      type: 'approval',
      read: false,
    },
    {
      id: '2',
      title: 'Perubahan Status Laporan',
      message: 'Laporan pencurian Anda telah ditandai selesai',
      timestamp: '5 jam yang lalu',
      type: 'status',
      read: false,
    },
  ]);

  const [faqItems] = useState<FAQItem[]>([
    {
      id: '1',
      question: 'Bagaimana cara menggunakan fitur sinyal darurat?',
      answer: 'Buka tab Darurat, pilih jenis darurat, dan tekan tombol yang sesuai. Lokasi Anda akan dikirim ke koordinator RT secara otomatis.',
    },
    {
      id: '2',
      question: 'Apakah saya perlu izin untuk membuat laporan?',
      answer: 'Tidak, semua warga dapat membuat laporan. Namun profil harus diverifikasi oleh koordinator RT terlebih dahulu.',
    },
    {
      id: '3',
      question: 'Bagaimana cara menjadi koordinator?',
      answer: 'Ajukan permohonan melalui Menu > Ajukan Koordinator. Tunggu persetujuan dalam 3-5 hari kerja.',
    },
  ]);

  const [userProfile] = useState({
    name: 'Ahmad Riyandi',
    email: 'ahmad.riyandi@example.com',
    phone: '08123456789',
    address: 'Jl. Sudirman No. 45, Jakarta',
    rt: '05',
    rw: '02',
    status: 'verified',
  });

  const handleNotificationPress = (id: string) => {
    setNotifications(
      notifications.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const submitCoordinatorRequest = (level: string) => {
    Alert.alert('Sukses', `Permohonan menjadi koordinator ${level} telah dikirim.`, [
      { text: 'OK', onPress: () => setShowCoordinatorRequest(false) },
    ]);
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.notificationUnread,
      ]}
      onPress={() => handleNotificationPress(item.id)}
    >
      <View
        style={[
          styles.notificationIcon,
          {
            backgroundColor:
              item.type === 'approval'
                ? '#E3F2FD'
                : item.type === 'status'
                ? '#F3E5F5'
                : '#E8F5E9',
          },
        ]}
      >
        <MaterialCommunityIcons
          name={
            item.type === 'approval'
              ? 'check-circle'
              : item.type === 'status'
              ? 'information'
              : 'bell'
          }
          size={20}
          color={
            item.type === 'approval'
              ? '#2196F3'
              : item.type === 'status'
              ? '#9C27B0'
              : '#4CAF50'
          }
        />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>{item.timestamp}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const renderFAQItem = ({ item }: { item: FAQItem }) => (
    <View style={styles.faqCard}>
      <TouchableOpacity
        style={styles.faqQuestion}
        onPress={() => toggleFAQ(item.id)}
      >
        <Text style={styles.faqQuestionText}>{item.question}</Text>
        <MaterialCommunityIcons
          name={expandedFAQ === item.id ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#007AFF"
        />
      </TouchableOpacity>
      {expandedFAQ === item.id && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>{item.answer}</Text>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity
        style={styles.profileSection}
        onPress={() => setShowProfileModal(true)}
      >
        <View style={styles.profileAvatar}>
          <Text style={styles.avatarText}>{userProfile.name.charAt(0)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{userProfile.name}</Text>
          <Text style={styles.profileEmail}>{userProfile.email}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
      </TouchableOpacity>

      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setShowNotifications(true)}
        >
          <View
            style={[
              styles.menuIcon,
              { backgroundColor: 'rgba(33, 150, 243, 0.1)' },
            ]}
          >
            <MaterialCommunityIcons name="bell" size={20} color="#2196F3" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Notifikasi</Text>
            <Text style={styles.menuSubtitle}>
              {notifications.filter((n) => !n.read).length} belum dibaca
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {notifications.filter((n) => !n.read).length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setShowCoordinatorRequest(true)}
        >
          <View
            style={[
              styles.menuIcon,
              { backgroundColor: 'rgba(156, 39, 176, 0.1)' },
            ]}
          >
            <MaterialCommunityIcons
              name="shield-account"
              size={20}
              color="#9C27B0"
            />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Ajukan Koordinator</Text>
            <Text style={styles.menuSubtitle}>
              Menjadi koordinator RT/RW/Kelurahan
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setShowFAQ(true)}>
          <View
            style={[
              styles.menuIcon,
              { backgroundColor: 'rgba(76, 175, 80, 0.1)' },
            ]}
          >
            <MaterialCommunityIcons
              name="help-circle"
              size={20}
              color="#4CAF50"
            />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>FAQ</Text>
            <Text style={styles.menuSubtitle}>
              Pertanyaan yang sering diajukan
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View
            style={[
              styles.menuIcon,
              { backgroundColor: 'rgba(244, 67, 54, 0.1)' },
            ]}
          >
            <MaterialCommunityIcons name="logout" size={20} color="#F44336" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Logout</Text>
            <Text style={styles.menuSubtitle}>Keluar dari akun</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profil Pengguna</Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <ProfileField label="Nama" value={userProfile.name} />
              <ProfileField label="Email" value={userProfile.email} />
              <ProfileField label="Nomor HP" value={userProfile.phone} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showNotifications}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifikasi</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={notifications}
              renderItem={renderNotification}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFAQ}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFAQ(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pertanyaan & Jawaban</Text>
              <TouchableOpacity onPress={() => setShowFAQ(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={faqItems}
              renderItem={renderFAQItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.faqList}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCoordinatorRequest}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCoordinatorRequest(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajukan Menjadi Koordinator</Text>
              <TouchableOpacity onPress={() => setShowCoordinatorRequest(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <TouchableOpacity
                style={styles.coordinatorButton}
                onPress={() => submitCoordinatorRequest('RT')}
              >
                <MaterialCommunityIcons
                  name="home"
                  size={24}
                  color="white"
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.coordinatorButtonTitle}>
                    Koordinator RT
                  </Text>
                  <Text style={styles.coordinatorButtonDesc}>
                    Mengelola keamanan tingkat RT
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.coordinatorButton}
                onPress={() => submitCoordinatorRequest('RW')}
              >
                <MaterialCommunityIcons
                  name="home-group"
                  size={24}
                  color="white"
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.coordinatorButtonTitle}>
                    Koordinator RW
                  </Text>
                  <Text style={styles.coordinatorButtonDesc}>
                    Mengelola keamanan tingkat RW
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const ProfileField = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.profileField}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={styles.fieldValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  profileSection: { backgroundColor: 'white', padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  profileAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  profileEmail: { fontSize: 12, color: '#999', marginTop: 2 },
  menuSection: { backgroundColor: 'white', marginTop: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuIcon: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  menuSubtitle: { fontSize: 12, color: '#999', marginTop: 2 },
  badge: { backgroundColor: '#FF1744', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  modalContent: { padding: 16 },
  profileField: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  fieldLabel: { fontSize: 12, color: '#999', fontWeight: '600', marginBottom: 4 },
  fieldValue: { fontSize: 14, color: '#333' },
  notificationItem: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  notificationUnread: { backgroundColor: '#F8F8F8' },
  notificationIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 13, fontWeight: '600', color: '#333' },
  notificationMessage: { fontSize: 12, color: '#666', marginTop: 2 },
  notificationTime: { fontSize: 11, color: '#999', marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#007AFF', marginLeft: 8 },
  faqList: { padding: 16 },
  faqCard: { backgroundColor: '#F5F5F5', borderRadius: 8, marginBottom: 12, overflow: 'hidden' },
  faqQuestion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  faqQuestionText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#333' },
  faqAnswer: { backgroundColor: 'white', padding: 12, borderTopWidth: 1, borderTopColor: '#EEE' },
  faqAnswerText: { fontSize: 12, color: '#666', lineHeight: 18 },
  coordinatorButton: { flexDirection: 'row', backgroundColor: '#007AFF', borderRadius: 8, padding: 16, marginBottom: 12, alignItems: 'center' },
  coordinatorButtonTitle: { fontSize: 14, fontWeight: '600', color: 'white' },
  coordinatorButtonDesc: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2 },
});

export default MenuTab;
