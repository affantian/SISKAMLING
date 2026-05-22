import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nama: '',
    alamat: '',
    kelurahan: 'Sukamaju',
    rw: '',
    rt: '',
    role: 'warga',
    language: 'id',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigation = useNavigation();

  const handleRegister = async () => {
    const { email, password, nama, alamat, rw, rt } = formData;

    if (!email || !password || !nama || !alamat || !rw || !rt) {
      Alert.alert('Error', 'Mohon isi semua field');
      return;
    }

    setLoading(true);
    try {
      await register(formData);
    } catch (error: any) {
      Alert.alert('Pendaftaran Gagal', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#3B6D11" />
          </TouchableOpacity>
          <Text style={styles.title}>Daftar Akun Baru</Text>
          <Text style={styles.subtitle}>Bergabung dengan Siskamling</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nama Lengkap"
              value={formData.nama}
              onChangeText={(value) => updateField('nama', value)}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={formData.password}
              onChangeText={(value) => updateField('password', value)}
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="home-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Alamat Lengkap"
              value={formData.alamat}
              onChangeText={(value) => updateField('alamat', value)}
              multiline
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfInput]}>
              <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="RW"
                value={formData.rw}
                onChangeText={(value) => updateField('rw', value)}
              />
            </View>

            <View style={[styles.inputContainer, styles.halfInput]}>
              <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="RT"
                value={formData.rt}
                onChangeText={(value) => updateField('rt', value)}
              />
            </View>
          </View>

          {/* Role Selection */}
          <Text style={styles.roleLabel}>Peran Anda</Text>
          <View style={styles.roleRow}>
            {[
              { v: 'warga', label: 'Warga' },
              { v: 'koordinator_rw', label: 'Koord. RW' },
              { v: 'koordinator_kelurahan', label: 'Koord. Kel.' },
            ].map((r) => (
              <TouchableOpacity
                key={r.v}
                style={[
                  styles.roleChip,
                  formData.role === r.v && styles.roleChipActive,
                ]}
                onPress={() => updateField('role', r.v)}
                testID={`role-${r.v}`}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    formData.role === r.v && styles.roleChipTextActive,
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            testID="register-submit-button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Daftar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.linkText}>
              Sudah punya akun? <Text style={styles.linkTextBold}>Masuk</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3B6D11',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  roleLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    marginBottom: 8,
    fontWeight: '600',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  roleChipActive: {
    backgroundColor: '#3B6D11',
    borderColor: '#3B6D11',
  },
  roleChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  roleChipTextActive: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#3B6D11',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 56,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#666',
  },
  linkTextBold: {
    color: '#3B6D11',
    fontWeight: '600',
  },
});
