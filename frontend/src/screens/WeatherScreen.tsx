import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Weather {
  temp: number;
  feels_like: number;
  condition: string;
  condition_en: string;
  icon: string;
  humidity: number;
  wind_speed: number;
  visibility: number;
  uv_index: number;
  uv_level: string;
  uv_level_en: string;
  rain_chance: number;
  aqi: number;
  aqi_level: string;
  aqi_level_en: string;
  location: string;
  updated_at: string;
}

interface ForecastItem {
  day: string;
  day_en: string;
  temp: number;
  icon: string;
}

interface Recommendations {
  sunscreen: { needed: boolean; level: string; level_en: string };
  payung: { needed: boolean; level: string; level_en: string };
  masker: { needed: boolean; level: string; level_en: string };
}

const getWeatherIcon = (icon: string): any => {
  const iconMap: { [key: string]: string } = {
    sun: 'sunny',
    cloud: 'cloud',
    'cloud-rain': 'rainy',
    rain: 'rainy',
    storm: 'thunderstorm',
  };
  return iconMap[icon] || 'partly-sunny';
};

const getAQIColor = (aqi: number) => {
  if (aqi <= 50) return '#3B6D11';
  if (aqi <= 100) return '#EF9F27';
  if (aqi <= 150) return '#E24B4A';
  return '#791F1F';
};

export default function WeatherScreen() {
  const { user, updateUser } = useAuth();
  const [weather, setWeather] = useState<Weather | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const lang = user?.language || 'id';

  useEffect(() => {
    loadWeatherData();
  }, []);

  const loadWeatherData = async () => {
    try {
      const [weatherRes, forecastRes, recommendationsRes] = await Promise.all([
        api.get('/api/weather/current'),
        api.get('/api/weather/forecast'),
        api.get('/api/weather/recommendations'),
      ]);

      setWeather(weatherRes.data);
      setForecast(forecastRes.data);
      setRecommendations(recommendationsRes.data);
    } catch (error) {
      console.error('Error loading weather:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWeatherData();
  };

  const toggleLanguage = async () => {
    const newLang = lang === 'id' ? 'en' : 'id';
    try {
      await api.put('/api/users/profile', { language: newLang });
      updateUser({ language: newLang });
    } catch (error) {
      console.error('Error updating language:', error);
    }
  };

  if (loading || !weather || !recommendations) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B6D11" />
        </View>
      </SafeAreaView>
    );
  }

  const aqiColor = getAQIColor(weather.aqi);
  const aqiPercentage = Math.min((weather.aqi / 300) * 100, 100);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              {lang === 'id' ? 'Cuaca & Kualitas Udara' : 'Weather & Air Quality'}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={12} color="#666" />
              <Text style={styles.locationText}>{weather.location}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleLanguage} style={styles.langButton} testID="language-toggle-button">
              <Text style={styles.langButtonText}>
                {lang === 'id' ? 'EN' : 'ID'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <Ionicons name="refresh" size={18} color="#3B6D11" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Weather Card */}
        <View style={styles.weatherMain}>
          <View style={styles.weatherBig}>
            <View style={styles.weatherTop}>
              <View>
                <Text style={styles.weatherTemp}>{weather.temp}°C</Text>
                <Text style={styles.weatherCondition}>
                  {lang === 'id' ? weather.condition : weather.condition_en}
                </Text>
                <Text style={styles.weatherFeels}>
                  {lang === 'id' ? 'Terasa seperti' : 'Feels like'} {weather.feels_like}°C
                </Text>
              </View>
              <Ionicons
                name={getWeatherIcon(weather.icon)}
                size={70}
                color="#EF9F27"
              />
            </View>
            <Text style={styles.weatherUpdated}>
              {lang === 'id' ? 'Diperbarui baru saja' : 'Updated just now'}
            </Text>
          </View>
        </View>

        {/* Weather Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="water" size={20} color="#185FA5" />
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>
                {lang === 'id' ? 'Kelembaban' : 'Humidity'}
              </Text>
              <Text style={styles.statValue}>{weather.humidity}%</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="speedometer" size={20} color="#185FA5" />
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>
                {lang === 'id' ? 'Angin' : 'Wind'}
              </Text>
              <Text style={styles.statValue}>{weather.wind_speed} km/h</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="eye" size={20} color="#185FA5" />
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>
                {lang === 'id' ? 'Visibilitas' : 'Visibility'}
              </Text>
              <Text style={styles.statValue}>{weather.visibility} km</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="sunny" size={20} color="#EF9F27" />
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>UV Index</Text>
              <Text style={[styles.statValue, { color: '#E24B4A' }]}>
                {weather.uv_index} - {lang === 'id' ? weather.uv_level : weather.uv_level_en}
              </Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="rainy" size={20} color="#185FA5" />
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>
                {lang === 'id' ? 'Peluang Hujan' : 'Rain Chance'}
              </Text>
              <Text style={styles.statValue}>{weather.rain_chance}%</Text>
            </View>
          </View>
        </View>

        {/* AQI Card */}
        <View style={styles.aqiCard}>
          <View style={styles.aqiHeader}>
            <View>
              <Text style={styles.aqiTitle}>
                {lang === 'id' ? 'Kualitas Udara (AQI)' : 'Air Quality (AQI)'}
              </Text>
              <Text style={styles.aqiSub}>
                {lang === 'id' ? weather.aqi_level : weather.aqi_level_en} — AQI {weather.aqi}
              </Text>
            </View>
            <View style={[styles.aqiBadge, { backgroundColor: aqiColor }]}>
              <Text style={styles.aqiBadgeText}>
                {lang === 'id' ? weather.aqi_level : weather.aqi_level_en}
              </Text>
            </View>
          </View>
          <View style={styles.aqiBar}>
            <View
              style={[
                styles.aqiFill,
                { width: `${aqiPercentage}%`, backgroundColor: aqiColor },
              ]}
            />
          </View>
          <View style={styles.aqiLabels}>
            <Text style={styles.aqiLabel}>
              {lang === 'id' ? 'Baik' : 'Good'}
            </Text>
            <Text style={styles.aqiLabel}>
              {lang === 'id' ? 'Sedang' : 'Moderate'}
            </Text>
            <Text style={styles.aqiLabel}>
              {lang === 'id' ? 'Tidak Sehat' : 'Unhealthy'}
            </Text>
            <Text style={styles.aqiLabel}>
              {lang === 'id' ? 'Berbahaya' : 'Hazardous'}
            </Text>
          </View>
        </View>

        {/* Recommendations - The Key Feature! */}
        <View style={styles.adviceSection}>
          <Text style={styles.sectionTitle}>
            {lang === 'id' ? '💡 Rekomendasi Hari Ini' : '💡 Today\'s Recommendations'}
          </Text>
          <View style={styles.adviceGrid}>
            {/* Sunscreen */}
            <View
              style={[
                styles.adviceCard,
                recommendations.sunscreen.needed && styles.adviceCardActive,
              ]}
            >
              <View
                style={[
                  styles.adviceIcon,
                  { backgroundColor: '#FFF8E1' },
                ]}
              >
                <Ionicons name="sunny" size={28} color="#EF9F27" />
              </View>
              <Text style={styles.adviceLabel}>
                {lang === 'id' ? 'Sunscreen' : 'Sunscreen'}
              </Text>
              <View
                style={[
                  styles.adviceStatus,
                  {
                    backgroundColor: recommendations.sunscreen.needed
                      ? '#FFEBEE'
                      : '#E8F5E9',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.adviceStatusText,
                    {
                      color: recommendations.sunscreen.needed
                        ? '#E24B4A'
                        : '#3B6D11',
                    },
                  ]}
                >
                  {recommendations.sunscreen.needed
                    ? lang === 'id' ? 'WAJIB' : 'REQUIRED'
                    : lang === 'id' ? 'OPSIONAL' : 'OPTIONAL'}
                </Text>
              </View>
              <Text style={styles.adviceSub}>
                {lang === 'id'
                  ? recommendations.sunscreen.level
                  : recommendations.sunscreen.level_en}
              </Text>
            </View>

            {/* Umbrella */}
            <View
              style={[
                styles.adviceCard,
                recommendations.payung.needed && styles.adviceCardActive,
              ]}
            >
              <View
                style={[
                  styles.adviceIcon,
                  { backgroundColor: '#E3F2FD' },
                ]}
              >
                <Ionicons name="umbrella" size={28} color="#185FA5" />
              </View>
              <Text style={styles.adviceLabel}>
                {lang === 'id' ? 'Payung' : 'Umbrella'}
              </Text>
              <View
                style={[
                  styles.adviceStatus,
                  {
                    backgroundColor: recommendations.payung.needed
                      ? '#E3F2FD'
                      : '#E8F5E9',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.adviceStatusText,
                    {
                      color: recommendations.payung.needed
                        ? '#185FA5'
                        : '#3B6D11',
                    },
                  ]}
                >
                  {recommendations.payung.needed
                    ? lang === 'id' ? 'BAWA' : 'BRING'
                    : lang === 'id' ? 'TIDAK PERLU' : 'NOT NEEDED'}
                </Text>
              </View>
              <Text style={styles.adviceSub}>
                {lang === 'id'
                  ? recommendations.payung.level
                  : recommendations.payung.level_en}
              </Text>
            </View>

            {/* Mask */}
            <View
              style={[
                styles.adviceCard,
                recommendations.masker.needed && styles.adviceCardActive,
              ]}
            >
              <View
                style={[
                  styles.adviceIcon,
                  { backgroundColor: '#F3E5F5' },
                ]}
              >
                <Ionicons name="medkit" size={28} color="#7B1FA2" />
              </View>
              <Text style={styles.adviceLabel}>
                {lang === 'id' ? 'Masker' : 'Mask'}
              </Text>
              <View
                style={[
                  styles.adviceStatus,
                  {
                    backgroundColor: recommendations.masker.needed
                      ? '#FFF3E0'
                      : '#E8F5E9',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.adviceStatusText,
                    {
                      color: recommendations.masker.needed
                        ? '#BA7517'
                        : '#3B6D11',
                    },
                  ]}
                >
                  {recommendations.masker.needed
                    ? lang === 'id' ? 'DISARANKAN' : 'RECOMMENDED'
                    : lang === 'id' ? 'OPSIONAL' : 'OPTIONAL'}
                </Text>
              </View>
              <Text style={styles.adviceSub}>
                {lang === 'id'
                  ? recommendations.masker.level
                  : recommendations.masker.level_en}
              </Text>
            </View>
          </View>
        </View>

        {/* 5-Day Forecast */}
        <View style={styles.forecastSection}>
          <Text style={styles.sectionTitle}>
            {lang === 'id' ? '📅 Prakiraan 5 Hari' : '📅 5-Day Forecast'}
          </Text>
          <View style={styles.forecastRow}>
            {forecast.map((item, index) => (
              <View key={index} style={styles.forecastItem}>
                <Text style={styles.forecastDay}>
                  {lang === 'id' ? item.day : item.day_en}
                </Text>
                <Ionicons
                  name={getWeatherIcon(item.icon)}
                  size={28}
                  color={item.icon === 'sun' ? '#EF9F27' : '#185FA5'}
                />
                <Text style={styles.forecastTemp}>{item.temp}°</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  langButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#3B6D11',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weatherMain: {
    padding: 16,
  },
  weatherBig: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  weatherTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  weatherTemp: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 60,
  },
  weatherCondition: {
    fontSize: 18,
    color: '#666',
    marginTop: 4,
  },
  weatherFeels: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  weatherUpdated: {
    fontSize: 11,
    color: '#999',
    marginTop: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    width: '48.5%',
    marginBottom: 8,
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  aqiCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  aqiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aqiTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  aqiSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  aqiBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  aqiBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  aqiBar: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  aqiFill: {
    height: '100%',
    borderRadius: 4,
  },
  aqiLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aqiLabel: {
    fontSize: 9,
    color: '#999',
  },
  adviceSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  adviceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  adviceCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  adviceCardActive: {
    borderColor: '#3B6D11',
  },
  adviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  adviceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  adviceStatus: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  adviceStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  adviceSub: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    lineHeight: 14,
  },
  forecastSection: {
    padding: 16,
  },
  forecastRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
  },
  forecastItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  forecastDay: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  forecastTemp: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});
