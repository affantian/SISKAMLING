import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import EmergencyScreen from './EmergencyScreen';
import WeatherScreen from './WeatherScreen';
import { useAuth } from '../contexts/AuthContext';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { user } = useAuth();
  const lang = user?.language || 'id';

  const labels = {
    emergency: lang === 'id' ? 'Darurat' : 'Emergency',
    weather: lang === 'id' ? 'Cuaca' : 'Weather',
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3B6D11',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Emergency"
        component={EmergencyScreen}
        options={{
          tabBarLabel: labels.emergency,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alert-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Weather"
        component={WeatherScreen}
        options={{
          tabBarLabel: labels.weather,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cloud" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
