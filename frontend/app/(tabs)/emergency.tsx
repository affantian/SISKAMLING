import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

interface EmergencyLog {
  id: string;
  type: 'kecelakaan' | 'kebakaran' | 'pencurian' | 'medis' | 'lainnya';
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    roadName: string;
    distance?: number;
  };
  status: 'pending' | 'in-progress' | 'resolved';
  description?: string;
  responseTeam?: string;
}

const EmergencyTab = () => {
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  const [emergencyLogs, setEmergencyLogs] = useState<EmergencyLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<EmergencyLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    requestLocationPermission();
    loadEmergencyLogs();
  }, []);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const location = await Location.getCurrentLocationAsync({});
      setUserLocation(location);
    }
  };

  const loadEmergencyLogs = () => {
    setEmergencyLogs([
      {
        id: '1',
        type: 'kecelakaan',
        timestamp: '2024-05-24 14:30',
        location: {
          latitude: -6.2088,
          longitude: 106.8456,
          address: 'Jl. Sudirman No. 45, Jakarta Pusat',
          roadName: 'Jalan Sudirman',
          distance: 250,
        },
        status: 'resolved',
        description: 'Kecelakaan lalu lintas 2 kendaraan',
        responseTeam: 'Patroli RT 05',
      },
      {
        id: '2',
        type: 'medis',
        timestamp: '2024-05-24 10:15',
        location: {
          latitude: -6.2100,
          longitude: 106.8470,
          address: 'Jl. Gatot Subroto No. 12, Jakarta Pusat',
          roadName: 'Jalan Gatot Subroto',
          distance: 180,
        },
        status: 'in-progress',
        description: 'Orang tiba-tiba pingsan',
      },
    ]);
  };

  const handleSendEmergency = async (type: EmergencyLog['type']) => {
    if (!userLocation) {
      Alert.alert('Error', 'Lokasi tidak dapat diakses');
      return;
    }

    setLoading(true);
    try {
      const address = await Location.reverseGeocodeAsync({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
      });

      const emergencyData = {
        type,
        location: {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
          address: `${address[0]?.street}, ${address[0]?.city}`,
          roadName: address[0]?.street || 'Unknown Road',
          timestamp: new Date().toLocaleString('id-ID'),
        },
      };

      Alert.alert(
        'Berhasil',
        'Sinyal darurat telah dikirim ke koordinator RT dan warga terdekat',
        [{ text: 'OK', onPress: () => loadEmergencyLogs() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Gagal mengirim sinyal darurat');
    } finally {
      setLoading(false);
    }
  };

  const openGoogleMaps = (latitude: number, longitude: number) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  const renderEmergencyTypeButton = (
    type: EmergencyLog['type'],
    icon: string,
    label: string,
    color: string
  ) => (
    <TouchableOpacity
      style={[styles.emergencyButton, { backgroundColor: color }]}
      onPress={() => handleSendEmergency(type)}
      disabled={loading}
    >
      <MaterialCommunityIcons name={icon} size={32} color="white" />
      <Text style={styles.emergencyButtonText}>{label}</Text>
    </TouchableOpacity>
  );

  const renderLogItem = ({ item }: { item: EmergencyLog }) => (
    <TouchableOpacity
      style={styles.logItem}
      onPress={() => {
        setSelectedLog(item);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.logItemHeader}>
        <MaterialCommunityIcons
          name={
            item.type === 'kecelakaan'
              ? 'car-crash'
              : item.type === 'kebakaran'
              ? 'fire'
              : 'hospital-box'
          }
          size={24}
          color={
            item.type === 'kecelakaan'
              ? '#FF6B6B'
              : item.type === 'kebakaran'
              ? '#FFA500'
              : '#4CAF50'
          }
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.logItemTitle}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
          <Text style={styles.logItemTime}>{item.timestamp}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === 'resolved'
                  ? '#4CAF50'
                  : item.status === 'in-progress'
                  ? '#FFC107'
                  : '#9E9E9E',
            },
          ]}
        >
          <Text style={styles.statusText}>
            {item.status === 'resolved'
              ? 'Selesai'
              : item.status === 'in-progress'
              ? 'Proses'
              : 'Pending'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'send' && styles.activeTab]}
          onPress={() => setActiveTab('send')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'send' && styles.activeTabText,
            ]}
          >
            Kirim Sinyal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'history' && styles.activeTabText,
            ]}
          >
            Riwayat
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'send' ? (
        <View style={styles.sendContainer}>
          <Text style={styles.sectionTitle}>Pilih Jenis Darurat</Text>
          <View style={styles.emergencyGrid}>
            {renderEmergencyTypeButton(
              'kecelakaan',
              'car-crash',
              'Kecelakaan',
              '#FF6B6B'
            )}
            {renderEmergencyTypeButton(
              'kebakaran',
              'fire',
              'Kebakaran',
              '#FFA500'
            )}
            {renderEmergencyTypeButton(
              'pencurian',
              'shield-alert',
              'Pencurian',
              '#FF1744'
            )}
            {renderEmergencyTypeButton('medis', 'hospital-box', 'Medis', '#4CAF50')}
          </View>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Mengirim sinyal darurat...</Text>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={emergencyLogs}
          renderItem={renderLogItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Sinyal Darurat</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedLog && (
              <View style={styles.detailContent}>
                <DetailRow
                  label="Jenis Darurat"
                  value={selectedLog.type.toUpperCase()}
                />
                <DetailRow label="Waktu" value={selectedLog.timestamp} />
                <DetailRow
                  label="Status"
                  value={
                    selectedLog.status === 'resolved'
                      ? 'Selesai'
                      : selectedLog.status === 'in-progress'
                      ? 'Dalam Proses'
                      : 'Pending'
                  }
                />
                <DetailRow
                  label="Lokasi"
                  value={selectedLog.location.address}
                />
                <DetailRow
                  label="Nama Jalan"
                  value={selectedLog.location.roadName}
                />
                {selectedLog.location.distance && (
                  <DetailRow
                    label="Estimasi Jarak"
                    value={`${selectedLog.location.distance}m`}
                  />
                )}
                {selectedLog.description && (
                  <DetailRow
                    label="Keterangan"
                    value={selectedLog.description}
                  />
                )}
                {selectedLog.responseTeam && (
                  <DetailRow
                    label="Tim Respons"
                    value={selectedLog.responseTeam}
                  />
                )}

                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={() => {
                    openGoogleMaps(
                      selectedLog.location.latitude,
                      selectedLog.location.longitude
                    );
                  }}
                >
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={20}
                    color="white"
                  />
                  <Text style={styles.mapButtonText}>
                    Buka di Google Maps
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowDetailModal(false)}
                >
                  <Text style={styles.closeButtonText}>Tutup</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  tabContainer: { flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#DDD' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#007AFF' },
  tabText: { fontSize: 14, color: '#666', fontWeight: '600' },
  activeTabText: { color: '#007AFF' },
  sendContainer: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#333' },
  emergencyGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  emergencyButton: { width: '48%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  emergencyButtonText: { color: 'white', marginTop: 8, fontSize: 12, fontWeight: '600' },
  loadingContainer: { marginTop: 32, alignItems: 'center' },
  loadingText: { marginTop: 8, color: '#666' },
  listContainer: { padding: 16 },
  logItem: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 12 },
  logItemHeader: { flexDirection: 'row', alignItems: 'center' },
  logItemTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  logItemTime: { fontSize: 12, color: '#999', marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: 'white', fontSize: 11, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  detailModal: { backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 16, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  detailContent: { padding: 16 },
  detailRow: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  detailLabel: { fontSize: 12, color: '#999', fontWeight: '600', marginBottom: 4 },
  detailValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  mapButton: { backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  mapButtonText: { color: 'white', fontWeight: '600', marginLeft: 8 },
  closeButton: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  closeButtonText: { color: '#333', fontWeight: '600' },
});

export default EmergencyTab;
