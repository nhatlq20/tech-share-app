import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { HomeScreen } from './src/screens/home/HomeScreen';
import { DeviceDetailScreen } from './src/screens/device/DeviceDetailScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';
import { ProfileScreen } from './src/screens/user/ProfileScreen';

export type ScreenType = 'home' | 'login' | 'register' | 'profile';

const ReduxProvider = Provider as any;

export default function App() {
  return (
    <ReduxProvider store={store}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ReduxProvider>
  );
}

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState('home' as ScreenType);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null as string | null);
  const insets = useSafeAreaInsets();

  const handleNavigateToDeviceDetail = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  const handleBackFromDetail = () => {
    setSelectedDeviceId(null);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#070B13" />

      {!selectedDeviceId && (
        <View
          style={[
            styles.topTabBar,
            { paddingTop: Math.max(8, insets.top + 4) },
          ]}
        >
          <TouchableOpacity
            style={[styles.tabButton, currentScreen === 'home' && styles.tabButtonActive]}
            onPress={() => setCurrentScreen('home')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="home-outline"
              size={16}
              color={currentScreen === 'home' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text
              style={[styles.tabButtonText, currentScreen === 'home' && styles.tabButtonTextActive]}
            >
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, currentScreen === 'login' && styles.tabButtonActive]}
            onPress={() => setCurrentScreen('login')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="log-in-outline"
              size={16}
              color={currentScreen === 'login' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text
              style={[styles.tabButtonText, currentScreen === 'login' && styles.tabButtonTextActive]}
            >
              Login
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, currentScreen === 'register' && styles.tabButtonActive]}
            onPress={() => setCurrentScreen('register')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="person-add-outline"
              size={16}
              color={currentScreen === 'register' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text
              style={[styles.tabButtonText, currentScreen === 'register' && styles.tabButtonTextActive]}
            >
              Register
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, currentScreen === 'profile' && styles.tabButtonActive]}
            onPress={() => setCurrentScreen('profile')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="person-circle-outline"
              size={16}
              color={currentScreen === 'profile' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text
              style={[styles.tabButtonText, currentScreen === 'profile' && styles.tabButtonTextActive]}
            >
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.screenContainer}>
        {selectedDeviceId ? (
          <DeviceDetailScreen deviceId={selectedDeviceId} onBack={handleBackFromDetail} />
        ) : (
          <>
            {currentScreen === 'home' && (
              <HomeScreen
                onNavigateToDeviceDetail={handleNavigateToDeviceDetail}
                onNavigateToSearch={() => {
                  console.log('Điều hướng Search');
                }}
                onNavigateToNotifications={() => {
                  console.log('Điều hướng Notifications');
                }}
              />
            )}

            {currentScreen === 'login' && (
              <LoginScreen
                onNavigateToRegister={() => setCurrentScreen('register')}
                onNavigateToProfile={() => setCurrentScreen('profile')}
              />
            )}

            {currentScreen === 'register' && (
              <RegisterScreen
                onNavigateToLogin={() => setCurrentScreen('login')}
                onRegisterSuccess={() => setCurrentScreen('profile')}
              />
            )}

            {currentScreen === 'profile' && (
              <ProfileScreen
                onLogout={() => setCurrentScreen('login')}
                onNavigateToLogin={() => setCurrentScreen('login')}
              />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070B13',
  },
  topTabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 6,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 40,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  tabButtonActive: {
    backgroundColor: '#2563EB',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  screenContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#070B13',
  },
});
