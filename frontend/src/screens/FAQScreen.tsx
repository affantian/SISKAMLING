import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const FAQ_ID = [
  { q: 'Apa itu Siskamling?', a: 'Siskamling adalah aplikasi Sistem Keamanan Lingkungan yang menghubungkan warga RT/RW dengan koordinator untuk koordinasi keamanan, cuaca, bencana, dan komunikasi.' },
  { q: 'Bagaimana cara menggunakan tombol SOS?', a: 'Tekan tombol SOS merah di tab Darurat. Aplikasi mengirim notifikasi + lokasi GPS LIVE + link Google Maps + estimasi jarak ke warga RT/RW Anda, koordinator RT, RW, dan Kelurahan.' },
  { q: 'Mengapa akun saya menunggu persetujuan?', a: 'Untuk keamanan, anggota baru harus disetujui koordinator RT setempat untuk mencegah orang tak dikenal mengakses informasi sensitif warga.' },
  { q: 'Apa beda mode Di Rumah vs Pergi?', a: 'Di Rumah = Anda di lokasi terdaftar. Pergi = Anda di luar. Mode ini mempengaruhi routing notifikasi darurat.' },
  { q: 'Bagaimana menjadi koordinator?', a: 'Tab Darurat → nama Anda → Profil → Ajukan Naik Jabatan. Pilih jabatan (RT/RW/Kelurahan) dan berikan alasan.' },
  { q: 'Apakah lokasi saya aman?', a: 'Ya. GPS hanya dikirim saat tombol darurat ditekan. Tidak ada pelacakan terus-menerus.' },
  { q: 'Sumber data cuaca dan bencana?', a: 'Gempa dari BMKG (data.bmkg.go.id). Cuaca dari OpenWeatherMap. Bencana lain dari laporan warga terverifikasi.' },
  { q: 'Cara mengundang teman?', a: 'Tab Chat → sub-tab Anggota → tombol Undang Teman. Atau dari menu profil di tab Darurat.' },
];

const FAQ_EN = [
  { q: 'What is Siskamling?', a: 'Siskamling is a community safety system app connecting RT/RW residents with coordinators for security, weather, disaster coordination and communication.' },
  { q: 'How to use SOS button?', a: 'Press the red SOS button in Emergency tab. The app sends notification + LIVE GPS + Google Maps link + distance estimate to your RT/RW residents and coordinators.' },
  { q: 'Why is my account pending?', a: 'For security, new members must be approved by local RT coordinator to prevent strangers from accessing sensitive resident info.' },
  { q: 'Home vs Away mode?', a: 'Home = at registered location. Away = outside. Affects emergency notification routing.' },
  { q: 'How to become coordinator?', a: 'Emergency tab → your name → Profile → Request Role. Choose role and provide reason.' },
  { q: 'Is location safe?', a: 'Yes. GPS only sent when emergency button pressed. No continuous tracking.' },
  { q: 'Data sources?', a: 'Earthquakes from BMKG. Weather from OpenWeatherMap. Other disasters from verified citizen reports.' },
  { q: 'How to invite friends?', a: 'Chat tab → Members sub-tab → Invite Friend button.' },
];

export default function FAQScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const lang = user?.language || 'id';
  const data = lang === 'id' ? FAQ_ID : FAQ_EN;
  const [openIdx, setOpenIdx] = React.useState<number | null>(0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} testID="back-button">
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FAQ</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.introBox}>
          <Ionicons name="help-circle" size={32} color="#3B6D11" />
          <Text style={styles.introTitle}>
            {lang === 'id' ? 'Pertanyaan yang Sering Diajukan' : 'Frequently Asked Questions'}
          </Text>
        </View>
        {data.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.faqItem}
            onPress={() => setOpenIdx(openIdx === idx ? null : idx)}
            testID={`faq-${idx}`}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQ}>{item.q}</Text>
              <Ionicons
                name={openIdx === idx ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#3B6D11"
              />
            </View>
            {openIdx === idx && <Text style={styles.faqA}>{item.a}</Text>}
          </TouchableOpacity>
        ))}
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
  introBox: { alignItems: 'center', backgroundColor: '#E8F5E9', padding: 20, borderRadius: 12, marginBottom: 16 },
  introTitle: { fontSize: 15, fontWeight: '700', color: '#3B6D11', marginTop: 8, textAlign: 'center' },
  faqItem: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 8 },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '600', color: '#333', marginRight: 8 },
  faqA: { fontSize: 13, color: '#666', lineHeight: 20, marginTop: 12 },
});
