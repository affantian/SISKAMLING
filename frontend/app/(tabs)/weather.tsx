import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import axios from 'axios';

interface WeatherData {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
  clouds: {
    all: number;
  };
}

interface AirQualityData {
  main: {
    aqi: number;
  };
  components?: {
    pm2_5?: number;
    pm10?: number;
    o3?: number;
    no2?: number;
  };
}

interface Recommendation {
  icon: string;
  title: string;
  description: string;
  color: string;
}

const WEATHER_API_KEY = '35dd9978d3b899f5333e6bb7ea197f7e';

const WeatherTab = () => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [city, setCity] = useState('');

  useEffect(() => {
    getLocationAndWeather();
  }, []);

  const getLocationAndWeather = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Location permission not granted');
        return;
      }

      const currentLocation = await Location.getCurrentLocationAsync({});
      setLocation(currentLocation);

      const addressResult = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      if (addressResult.length > 0) {
        setCity(addressResult[0].city || addressResult[0].district || 'Unknown');
      }

      await Promise.all([
        fetchWeather(currentLocation.coords.latitude, currentLocation.coords.longitude),
        fetchAirQuality(currentLocation.coords.latitude, currentLocation.coords.longitude),
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch location data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async (latitude: number, longitude: number) => {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`
      );
      setWeatherData(response.data);
      generateRecommendations(response.data);
    } catch (error) {
      console.error('Weather fetch error:', error);
    }
  };

  const fetchAirQuality = async (latitude: number, longitude: number) => {
    try {
      const aqResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}`
      );
      setAirQuality(aqResponse.data);
    } catch (error) {
      console.error('Air quality fetch error:', error);
    }
  };

  const generateRecommendations = (weather: WeatherData) => {
    const recs: Recommendation[] = [];
    const temp = weather.main.temp;
    const humidity = weather.main.humidity;
    const hasRain = weather.weather.some((w) => w.main.includes('Rain'));

    if (temp > 25 && !hasRain) {
      recs.push({
        icon: 'sunscreen',
        title: 'Gunakan Sunscreen',
        description: 'UV indeks tinggi, lindungi kulit Anda dengan SPF 30+',
        color: '#FFB74D',
      });
    }

    if (hasRain || humidity > 80) {
      recs.push({
        icon: 'weather-rainy',
        title: 'Bawa Payung',
        description: 'Kemungkinan hujan tinggi, siapkan payung Anda',
        color: '#64B5F6',
      });
    }

    if (temp < 15) {
      recs.push({
        icon: 'face-mask',
        title: 'Gunakan Masker',
        description: 'Cuaca dingin, lindungi sistem pernapasan Anda',
        color: '#81C784',
      });
    }

    setRecommendations(recs);
  };

  const getAQIDescription = (aqi: number): { text: string; color: string } => {
    const descriptions = [
      { text: 'Baik', color: '#4CAF50' },
      { text: 'Moderat', color: '#FFC107' },
      { text: 'Tidak Sehat untuk Kelompok Sensitif', color: '#FF9800' },
      { text: 'Tidak Sehat', color: '#F44336' },
      { text: 'Sangat Tidak Sehat', color: '#7B1FA2' },
    ];
    return descriptions[aqi] || descriptions[0];
  };

  const openWeatherApp = () => {
    const urls = ['weather://', 'com.weather.Weather://'];
    urls.forEach((url) => {
      Linking.canOpenURL(url).then((supported) => {
        if (supported) Linking.openURL(url);
      });
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading weather data...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {weatherData && (
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.cityName}>{city}</Text>
              <Text style={styles.weatherDesc}>
                {weatherData.weather[0]?.description}
              </Text>
            </View>
            <MaterialCommunityIcons name="cloud" size={48} color="#FFB74D" />
          </View>
          <Text style={styles.tempLarge}>{Math.round(weatherData.main.temp)}°C</Text>
          <View style={styles.weatherDetails}>
            <WeatherDetailItem
              icon="water-percent"
              label="Kelembaban"
              value={`${weatherData.main.humidity}%`}
            />
            <WeatherDetailItem
              icon="wind"
              label="Angin"
              value={`${Math.round(weatherData.wind.speed)} m/s`}
            />
            <WeatherDetailItem
              icon="weather-cloudy"
              label="Awan"
              value={`${weatherData.clouds.all}%`}
            />
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rekomendasi Hari Ini</Text>
          <TouchableOpacity onPress={openWeatherApp}>
            <MaterialCommunityIcons name="open-in-new" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        {recommendations.length > 0 ? (
          recommendations.map((rec, index) => (
            <RecommendationCard key={index} rec={rec} />
          ))
        ) : (
          <Text style={styles.noDataText}>Tidak ada rekomendasi khusus</Text>
        )}
      </View>

      {airQuality && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Kualitas Udara</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.iqair.com')}>
              <MaterialCommunityIcons name="open-in-new" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.aqiCard,
              { borderLeftColor: getAQIDescription(airQuality.main.aqi).color },
            ]}
          >
            <View style={styles.aqiContent}>
              <Text style={styles.aqiLabel}>Indeks Kualitas Udara</Text>
              <Text
                style={[
                  styles.aqiValue,
                  { color: getAQIDescription(airQuality.main.aqi).color },
                ]}
              >
                {getAQIDescription(airQuality.main.aqi).text}
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const WeatherDetailItem = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <View style={styles.detailItem}>
    <MaterialCommunityIcons name={icon} size={20} color="#666" />
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const RecommendationCard = ({ rec }: { rec: Recommendation }) => (
  <View style={[styles.recommendationCard, { borderLeftColor: rec.color }]}>
    <MaterialCommunityIcons name={rec.icon} size={24} color={rec.color} />
    <View style={{ flex: 1, marginLeft: 12 }}>
      <Text style={styles.recTitle}>{rec.title}</Text>
      <Text style={styles.recDesc}>{rec.description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666' },
  headerCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cityName: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  weatherDesc: { fontSize: 14, color: '#666', marginTop: 4, textTransform: 'capitalize' },
  tempLarge: { fontSize: 48, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  weatherDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  detailItem: { alignItems: 'center', flex: 1 },
  detailLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  detailValue: { fontSize: 14, fontWeight: 'bold', color: '#333', marginTop: 2 },
  section: { marginHorizontal: 16, marginVertical: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  recommendationCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  recTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  recDesc: { fontSize: 12, color: '#666', marginTop: 4 },
  aqiCard: { backgroundColor: 'white', borderRadius: 8, padding: 12, borderLeftWidth: 4 },
  aqiContent: { flex: 1 },
  aqiLabel: { fontSize: 12, color: '#999' },
  aqiValue: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  noDataText: { textAlign: 'center', color: '#999', paddingVertical: 12 },
});

export default WeatherTab;
