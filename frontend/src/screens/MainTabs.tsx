import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import EmergencyScreen from './EmergencyScreen';
import WeatherScreen from './WeatherScreen';
import BencanaScreen from './BencanaScreen';
import ChatScreen from './ChatScreen';
import { useAuth } from '../contexts/AuthContext';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { user } = useAuth();
  const lang = user?.language || 'id';

  const labels = {
    emergency: lang === 'id' ? 'Darurat' : 'Emergency',
    weather: lang === 'id' ? 'Cuaca' : 'Weather',
    bencana: lang === 'id' ? 'Bencana' : 'Disaster',
    chat: 'Chat',
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
          fontSize: 11,
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
      <Tab.Screen
        name="Bencana"
        component={BencanaScreen}
        options={{
          tabBarLabel: labels.bencana,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="warning" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: labels.chat,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
