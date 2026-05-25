# SISKAMLING Developer Guide

## Project Overview

SISKAMLING adalah aplikasi mobile berbasis React Native untuk Sistem Keamanan Lingkungan di tingkat RT/RW/Kelurahan yang memungkinkan warga untuk:

1. **Menerima informasi cuaca** dan rekomendasi kesehatan
2. **Melaporkan situasi darurat** dengan lokasi real-time
3. **Berkomunikasi dengan koordinator** melalui chat
4. **Mengakses menu** dengan profil dan notifikasi

## Tech Stack

### Frontend
- **Framework**: React Native dengan Expo
- **Language**: TypeScript
- **Navigation**: React Navigation
- **State Management**: React Hooks (useState, useEffect)
- **Styling**: React Native StyleSheet
- **HTTP Client**: Axios
- **Location**: Expo Location API
- **Icons**: Material Community Icons

### Backend (To Be Implemented)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MySQL
- **ORM**: Sequelize
- **Authentication**: JWT
- **Real-time**: Socket.io
- **Validation**: Joi

## File Structure & Explanations

### Frontend - Weather Tab
**Path**: `frontend/app/(tabs)/weather.tsx`

**Key Components**:
- `WeatherTab` - Main component
- `WeatherDetailItem` - Display weather details (humidity, wind, clouds)
- `RecommendationCard` - Recommendation cards based on weather
- `AQIComponent` - Air quality indicator

**Key Features**:
```typescript
// Location permission request
const { status } = await Location.requestForegroundPermissionsAsync();

// Weather API call
const response = await axios.get(
  `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`
);

// Dynamic recommendations based on weather conditions
generateRecommendations(weather: WeatherData)
```

### Frontend - Emergency Tab
**Path**: `frontend/app/(tabs)/emergency.tsx`

**Key Components**:
- `EmergencyTab` - Main component with 2 tabs (Send Signal, History)
- `DetailRow` - Display emergency details in modal
- Emergency type buttons (Kecelakaan, Kebakaran, Pencurian, Medis)

**Key Features**:
```typescript
// Send emergency signal
handleSendEmergency = async (type: string) => {
  // Get current location
  // Reverse geocode to get address
  // Send to backend with coordinates
}

// Load emergency history from backend
loadEmergencyLogs = () => {
  // Fetch from API
  // Filter by user
}

// Open location in Google Maps
openGoogleMaps = (lat, lon) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  Linking.openURL(url);
}
```

### Frontend - Chat Tab
**Path**: `frontend/app/(tabs)/chat.tsx`

**Key Components**:
- `ChatTab` - Main chat component
- `renderMessage` - Render individual message bubble
- Chat input with attachment button

**Key Features**:
```typescript
// Message state management
const [messages, setMessages] = useState<ChatMessage[]>([]);

// Keyboard handling
useEffect(() => {
  const keyboardDidShow = Keyboard.addListener('keyboardDidShow', () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  });
}, []);

// Send message
handleSendMessage = () => {
  if (!inputMessage.trim()) return;
  
  const newMessage = {
    id: String(messages.length + 1),
    sender: 'user',
    message: inputMessage,
    timestamp: new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
  
  setMessages([...messages, newMessage]);
  setInputMessage('');
}
```

### Frontend - Menu Tab
**Path**: `frontend/app/(tabs)/menu.tsx`

**Key Components**:
- `MenuTab` - Main menu component
- `renderNotification` - Notification list
- `renderFAQItem` - FAQ accordion
- Various modals (Profile, Notifications, FAQ, Coordinator Request)

**Key Features**:
```typescript
// State management
const [showProfileModal, setShowProfileModal] = useState(false);
const [notifications, setNotifications] = useState<Notification[]>([]);
const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

// Mark notification as read
handleNotificationPress = (id: string) => {
  setNotifications(
    notifications.map((notif) =>
      notif.id === id ? { ...notif, read: true } : notif
    )
  );
}

// Toggle FAQ accordion
toggleFAQ = (id: string) => {
  setExpandedFAQ(expandedFAQ === id ? null : id);
}
```

## Component Architecture

### Tab Navigation Structure
```
App Navigator (Bottom Tab)
├── Weather Tab
│   ├── Header Card (City, Temp, Weather)
│   ├── Recommendation Section
│   └── Air Quality Section
├── Emergency Tab
│   ├── Tab Switcher (Send Signal / History)
│   ├── Send Signal Section
│   │   └── 4 Emergency Type Buttons
│   ├── History Section (FlatList)
│   └── Detail Modal
├── Chat Tab
│   ├── Header (Coordinator info)
│   ├── Message List (FlatList)
│   └── Input Section
└── Menu Tab
    ├── Profile Section
    ├── Menu Items (Notifications, Coordinator, FAQ, Logout)
    └── Modals (Profile, Notifications, FAQ, Coordinator Request)
```

## Styling Guide

### Color Palette
```typescript
const colors = {
  primary: '#007AFF',      // Blue
  success: '#4CAF50',      // Green
  warning: '#FFC107',      // Yellow
  danger: '#FF1744',       // Red
  light: '#F5F5F5',        // Light Gray
  dark: '#333',            // Dark Gray
  border: '#DDD',          // Border Gray
};
```

### Common Styles
```typescript
// Card style
{
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
}

// Button style
{
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
}

// Text styles
heading: { fontSize: 16, fontWeight: 'bold' }
body: { fontSize: 14 }
caption: { fontSize: 12, color: '#999' }
```

## Data Flow & State Management

### Emergency Signal Flow
```
User Tap Button
  ↓
Request Location Permission
  ↓
Get Current Location + Address
  ↓
Create Emergency Object
  ↓
Send to Backend API
  ↓
Show Success Alert
  ↓
Reload Emergency List
  ↓
Update UI with new signal
```

### Chat Message Flow
```
User Type Message
  ↓
User Tap Send Button
  ↓
Validate Message (not empty)
  ↓
Create Message Object
  ↓
Add to Local State (optimistic update)
  ↓
Send to Backend API (should be done)
  ↓
Scroll to Bottom
  ↓
Clear Input
```

## API Integration Points

### Current Mock Data
Semua fitur saat ini menggunakan mock data yang bisa di-replace dengan API calls:

```typescript
// Weather - Replace dengan actual API
fetchWeather = async (latitude, longitude) => {
  const response = await axios.get(
    `https://api.openweathermap.org/data/2.5/weather?...`
  );
  setWeatherData(response.data);
}

// Emergency - Replace dengan actual API
loadEmergencyLogs = async () => {
  const response = await axios.get('/api/v1/emergency/signals', {
    headers: { Authorization: `Bearer ${token}` }
  });
  setEmergencyLogs(response.data);
}

// Chat - Replace dengan actual API & WebSocket
handleSendMessage = async () => {
  const response = await axios.post('/api/v1/chat/messages', {
    message: inputMessage,
    recipientId: coordinatorId
  });
  // For real-time: Use Socket.io
}
```

## Testing Strategy

### Manual Testing Checklist
- [ ] Test location permission (allow & deny)
- [ ] Test emergency signal with mock location
- [ ] Test chat message input & display
- [ ] Test all modal opens & closes
- [ ] Test notifications mark as read
- [ ] Test FAQ accordion toggle
- [ ] Test offline behavior
- [ ] Test large screen (tablet) layout
- [ ] Test keyboard handling in chat

### Unit Test Example
```typescript
import { render, screen } from '@testing-library/react-native';
import WeatherTab from './weather';

describe('WeatherTab', () => {
  it('should render loading state initially', () => {
    render(<WeatherTab />);
    expect(screen.getByText('Loading weather data...')).toBeTruthy();
  });

  it('should display weather information after loading', async () => {
    render(<WeatherTab />);
    await waitFor(() => {
      expect(screen.getByText(/Jakarta/)).toBeTruthy();
    });
  });
});
```

## Performance Optimization

### Current Implementation
- ✅ FlatList for long lists (Emergency history)
- ✅ Memo for preventing unnecessary re-renders (if needed)
- ✅ Local state management dengan React Hooks

### Future Improvements
- [ ] Implement React Query for data fetching
- [ ] Add image optimization
- [ ] Implement pagination for large lists
- [ ] Cache API responses
- [ ] Lazy load modals
- [ ] Code splitting per tab

## Troubleshooting

### Common Issues

**Issue**: Location permission denied
```
Solution: Check app permissions in Settings > Apps > SISKAMLING > Permissions
```

**Issue**: API calls not working
```
Solution: 
1. Check internet connection
2. Verify API key in .env
3. Check CORS settings on backend
4. Verify API endpoint URLs
```

**Issue**: Chat messages not appearing
```
Solution:
1. Check message state update
2. Verify FlatList keyExtractor
3. Check keyboard height calculations
```

## Contributing Guidelines

1. **Branch naming**: `feature/feature-name` or `fix/bug-name`
2. **Commit messages**: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`
3. **Code style**: Use Prettier + ESLint
4. **Testing**: Add tests for new features
5. **PR description**: Explain changes clearly

## Resources & References

- [React Native Docs](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Navigation Docs](https://reactnavigation.org/)
- [Material Community Icons](https://materialdesignicons.com/)

---

**Last Updated**: 25 May 2026
**Maintained By**: Development Team
