import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const STATUS_COLORS: any = {
  aman: '#3B6D11',
  waspada: '#EF9F27',
  siaga: '#E24B4A',
  awas: '#791F1F',
};

const STATUS_LABELS_ID: any = { aman: 'Aman', waspada: 'Waspada', siaga: 'Siaga', awas: 'Awas' };
const STATUS_LABELS_EN: any = { aman: 'Safe', waspada: 'Alert', siaga: 'Warning', awas: 'Danger' };

interface DisasterStatus {
  type: string;
  name: string;
  name_en: string;
  status: string;
  icon: string;
  detail?: string;
}

interface Earthquake {
  Tanggal: string;
  Jam: string;
  Magnitude: string;
  Kedalaman: string;
  Wilayah: string;
  Lintang: string;
  Bujur: string;
  Potensi: string;
}

interface DisasterReport {
  id: string;
  user_nama: string;
  type: string;
  description: string;
  location: { lat: number; lng: number };
  alamat: string;
  rw: string;
  rt: string;
  created_at: string;
}

export default function BencanaScreen() {
  const { user } = useAuth();
  const lang = user?.language || 'id';
  const [statuses, setStatuses] = useState<DisasterStatus[]>([]);
  const [earthquake, setEarthquake] = useState<Earthquake | null>(null);
  const [reports, setReports] = useState<DisasterReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [reportType, setReportType] = useState('banjir');
  const [reportDesc, setReportDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statusRes, eqRes, reportsRes] = await Promise.all([
        api.get('/api/bencana/status'),
        api.get('/api/bencana/earthquakes'),
        api.get('/api/bencana/reports'),
      ]);
      setStatuses(statusRes.data);
      setEarthquake(eqRes.data.latest);
      setReports(reportsRes.data);
    } catch (e) {
      console.error('Bencana load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const submitReport = async () => {
    if (!reportDesc.trim()) return;
    setSubmitting(true);
    try {
      // Get location (with web fallback)
      let location = { lat: -6.9175, lng: 107.6191 }; // Bandung default
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<any>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch {}
      }

      await api.post('/api/bencana/reports', {
        type: reportType,
        description: reportDesc,
        location,
        alamat: user?.alamat || '',
      });
      setReportModal(false);
      setReportDesc('');
      loadData();
    } catch (e) {
      console.error('Report submit error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B6D11" />
        </View>
      </SafeAreaView>
    );
  }

  const getOverallLevel = () => {
    if (statuses.some((s) => s.status === 'awas')) return 'awas';
    if (statuses.some((s) => s.status === 'siaga')) return 'siaga';
    if (statuses.some((s) => s.status === 'waspada')) return 'waspada';
    return 'aman';
  };
  const overallLevel = getOverallLevel();

  // Build OpenStreetMap HTML with markers
  const mapHtml = `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>html,body,#map{margin:0;padding:0;height:100%;width:100%;}</style>
  </head><body>
    <div id="map"></div>
    <script>
      var map = L.map('map').setView([-6.9175, 107.6191], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);
      var reports = ${JSON.stringify(reports.map((r) => ({
        lat: r.location?.lat,
        lng: r.location?.lng,
        type: r.type,
        desc: r.description,
        nama: r.user_nama,
      })))};
      var colors = {banjir:'#185FA5',longsor:'#BA7517',gempa:'#E24B4A',kebakaran:'#E24B4A',lainnya:'#666'};
      reports.forEach(function(r){
        if(r.lat && r.lng){
          L.circleMarker([r.lat, r.lng], {radius:10, color:colors[r.type]||'#666', fillOpacity:0.7})
            .bindPopup('<b>'+r.type.toUpperCase()+'</b><br>'+r.desc+'<br><i>'+r.nama+'</i>')
            .addTo(map);
        }
      });
    </script>
  </body></html>`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              {lang === 'id' ? 'Peringatan Bencana' : 'Disaster Alerts'}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={12} color="#666" />
              <Text style={styles.locationText}>
                Kota Bandung & sekitarnya
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.overallBadge,
              { backgroundColor: STATUS_COLORS[overallLevel] },
            ]}
            testID="overall-status-badge"
          >
            <Ionicons name="warning" size={12} color="#fff" />
            <Text style={styles.overallBadgeText}>
              {lang === 'id' ? STATUS_LABELS_ID[overallLevel] : STATUS_LABELS_EN[overallLevel]}
            </Text>
          </View>
        </View>

        {/* Latest Earthquake from BMKG */}
        {earthquake && (
          <View style={styles.eqCard}>
            <View style={styles.eqHeader}>
              <Ionicons name="pulse" size={20} color="#E24B4A" />
              <Text style={styles.eqHeaderText}>
                {lang === 'id' ? 'Gempa Terbaru — BMKG' : 'Latest Earthquake — BMKG'}
              </Text>
            </View>
            <Text style={styles.eqMag}>M {earthquake.Magnitude}</Text>
            <Text style={styles.eqWilayah}>{earthquake.Wilayah}</Text>
            <View style={styles.eqDetailRow}>
              <View style={styles.eqDetailItem}>
                <Text style={styles.eqDetailLabel}>
                  {lang === 'id' ? 'Kedalaman' : 'Depth'}
                </Text>
                <Text style={styles.eqDetailValue}>{earthquake.Kedalaman}</Text>
              </View>
              <View style={styles.eqDetailItem}>
                <Text style={styles.eqDetailLabel}>
                  {lang === 'id' ? 'Waktu' : 'Time'}
                </Text>
                <Text style={styles.eqDetailValue}>{earthquake.Jam}</Text>
              </View>
            </View>
            <Text style={styles.eqPotensi}>{earthquake.Potensi}</Text>
          </View>
        )}

        {/* Disaster Status Grid */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            {lang === 'id' ? 'Status Bencana' : 'Disaster Status'}
          </Text>
          <View style={styles.statusGrid}>
            {statuses.map((s) => (
              <View
                key={s.type}
                style={[
                  styles.statusCard,
                  { borderLeftColor: STATUS_COLORS[s.status] },
                ]}
                testID={`bencana-status-${s.type}`}
              >
                <View
                  style={[
                    styles.statusIcon,
                    { backgroundColor: `${STATUS_COLORS[s.status]}20` },
                  ]}
                >
                  <Ionicons
                    name={s.icon as any}
                    size={20}
                    color={STATUS_COLORS[s.status]}
                  />
                </View>
                <Text style={styles.statusName}>
                  {lang === 'id' ? s.name : s.name_en}
                </Text>
                <Text
                  style={[
                    styles.statusValue,
                    { color: STATUS_COLORS[s.status] },
                  ]}
                >
                  {lang === 'id' ? STATUS_LABELS_ID[s.status] : STATUS_LABELS_EN[s.status]}
                </Text>
                {s.detail && <Text style={styles.statusDetail}>{s.detail}</Text>}
              </View>
            ))}
          </View>
        </View>

        {/* Live Map of Reports */}
        <View style={styles.sectionContainer}>
          <View style={styles.mapHeader}>
            <Text style={styles.sectionTitle}>
              {lang === 'id' ? 'Peta Laporan Warga' : 'Citizen Reports Map'}
            </Text>
            <TouchableOpacity
              style={styles.reportBtn}
              onPress={() => setReportModal(true)}
              testID="open-report-button"
            >
              <Ionicons name="add-circle" size={16} color="#fff" />
              <Text style={styles.reportBtnText}>
                {lang === 'id' ? 'Lapor' : 'Report'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.mapContainer}>
            {Platform.OS === 'web' ? (
              <iframe
                srcDoc={mapHtml}
                style={{ width: '100%', height: 300, border: 'none', borderRadius: 12 }}
                title="map"
              />
            ) : (
              <WebView
                originWhitelist={['*']}
                source={{ html: mapHtml }}
                style={{ height: 300, borderRadius: 12 }}
              />
            )}
          </View>
        </View>

        {/* Recent Reports */}
        {reports.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              {lang === 'id' ? 'Laporan Terbaru' : 'Recent Reports'}
            </Text>
            {reports.slice(0, 5).map((r) => (
              <View key={r.id} style={styles.reportItem}>
                <View
                  style={[
                    styles.reportIcon,
                    {
                      backgroundColor:
                        r.type === 'banjir'
                          ? '#E3F2FD'
                          : r.type === 'longsor'
                          ? '#FFF3E0'
                          : '#FFEBEE',
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      r.type === 'banjir'
                        ? 'water'
                        : r.type === 'longsor'
                        ? 'trending-down'
                        : r.type === 'gempa'
                        ? 'pulse'
                        : 'flame'
                    }
                    size={18}
                    color={
                      r.type === 'banjir'
                        ? '#185FA5'
                        : r.type === 'longsor'
                        ? '#BA7517'
                        : '#E24B4A'
                    }
                  />
                </View>
                <View style={styles.reportContent}>
                  <Text style={styles.reportType}>{r.type.toUpperCase()}</Text>
                  <Text style={styles.reportDesc} numberOfLines={2}>
                    {r.description}
                  </Text>
                  <Text style={styles.reportMeta}>
                    {r.user_nama} · RT {r.rt}/RW {r.rw}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Report Modal */}
      <Modal
        visible={reportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {lang === 'id' ? 'Laporkan Bencana' : 'Report Disaster'}
            </Text>
            <Text style={styles.modalLabel}>{lang === 'id' ? 'Jenis' : 'Type'}</Text>
            <View style={styles.typeRow}>
              {['banjir', 'longsor', 'kebakaran', 'lainnya'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChip,
                    reportType === t && styles.typeChipActive,
                  ]}
                  onPress={() => setReportType(t)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      reportType === t && styles.typeChipTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalLabel}>
              {lang === 'id' ? 'Deskripsi' : 'Description'}
            </Text>
            <TextInput
              style={styles.descInput}
              placeholder={
                lang === 'id'
                  ? 'Jelaskan situasi...'
                  : 'Describe the situation...'
              }
              value={reportDesc}
              onChangeText={setReportDesc}
              multiline
              testID="report-description-input"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setReportModal(false)}
              >
                <Text style={styles.modalCancelText}>
                  {lang === 'id' ? 'Batal' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSend]}
                onPress={submitReport}
                disabled={submitting}
                testID="submit-report-button"
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSendText}>
                    {lang === 'id' ? 'Kirim' : 'Submit'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, color: '#666' },
  overallBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  overallBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  eqCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E24B4A',
  },
  eqHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  eqHeaderText: { fontSize: 12, fontWeight: '600', color: '#666' },
  eqMag: { fontSize: 32, fontWeight: 'bold', color: '#E24B4A', marginBottom: 4 },
  eqWilayah: { fontSize: 14, color: '#333', marginBottom: 12 },
  eqDetailRow: { flexDirection: 'row', gap: 24, marginBottom: 8 },
  eqDetailItem: {},
  eqDetailLabel: { fontSize: 10, color: '#999' },
  eqDetailValue: { fontSize: 13, fontWeight: '600', color: '#333' },
  eqPotensi: { fontSize: 11, color: '#666', fontStyle: 'italic' },
  sectionContainer: { padding: 16 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusCard: {
    width: '48.5%',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusName: { fontSize: 13, fontWeight: '600', color: '#333' },
  statusValue: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  statusDetail: { fontSize: 10, color: '#666', marginTop: 4 },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E24B4A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  reportBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  mapContainer: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  reportItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 12,
    alignItems: 'flex-start',
  },
  reportIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportContent: { flex: 1 },
  reportType: { fontSize: 12, fontWeight: '700', color: '#333' },
  reportDesc: { fontSize: 13, color: '#666', marginTop: 2 },
  reportMeta: { fontSize: 11, color: '#999', marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  modalLabel: { fontSize: 13, color: '#666', marginBottom: 8, marginTop: 8 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
  },
  typeChipActive: { backgroundColor: '#3B6D11' },
  typeChipText: { fontSize: 12, color: '#666', fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  descInput: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  modalCancel: { backgroundColor: '#F5F5F5' },
  modalCancelText: { color: '#666', fontWeight: '600' },
  modalSend: { backgroundColor: '#3B6D11' },
  modalSendText: { color: '#fff', fontWeight: '600' },
});
