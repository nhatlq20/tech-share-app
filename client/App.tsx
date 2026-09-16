import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';
import { ProfileScreen } from './src/screens/user/ProfileScreen';

export type ScreenType = 'login' | 'register' | 'profile';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login' as ScreenType);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#070B13" />

      {/* THANH CHUYỂN MÀN HÌNH PREVIEW DÀNH CHO ANDROID (Đăng nhập / Đăng ký / Profile) */}
      <View style={styles.topTabBar}>
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
            Đăng nhập
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
            Đăng ký
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

      {/* NỘI DUNG MÀN HÌNH ĐANG CHỌN */}
      <View style={styles.screenContainer}>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  tabButtonActive: {
    backgroundColor: '#2563EB',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  screenContainer: {
    flex: 1,
  },
});
