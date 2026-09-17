import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Provider } from "react-redux";
import { store } from "./src/store";
import { HomeScreen } from "./src/screens/home/HomeScreen";
import { DeviceDetailScreen } from "./src/screens/device/DeviceDetailScreen";
import { PostDeviceScreen } from "./src/screens/device/PostDeviceScreen";
import { LoginScreen } from "./src/screens/auth/LoginScreen";
import { RegisterScreen } from "./src/screens/auth/RegisterScreen";
import { ProfileScreen } from "./src/screens/user/ProfileScreen";

export type ScreenType =
  | "home"
  | "postDevice"
  | "login"
  | "register"
  | "profile";

const ReduxProvider = Provider as any;

export default function App() {
  const [currentScreen, setCurrentScreen] = useState("home" as ScreenType);
  const [selectedDeviceId, setSelectedDeviceId] = useState(
    null as string | null,
  );

  const handleNavigateToDeviceDetail = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  const handleBackFromDetail = () => {
    setSelectedDeviceId(null);
  };

  return (
    <ReduxProvider store={store}>
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#070B13" />

        {/* THANH CHUYỂN MÀN HÌNH PREVIEW SPRINT 1 (Trang chủ / Đăng nhập / Đăng ký / Profile) */}
        {!selectedDeviceId && (
          <View style={styles.topTabBar}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                currentScreen === "home" && styles.tabButtonActive,
              ]}
              onPress={() => setCurrentScreen("home")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="home-outline"
                size={16}
                color={currentScreen === "home" ? "#FFFFFF" : "#94A3B8"}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  currentScreen === "home" && styles.tabButtonTextActive,
                ]}
              >
                Trang chủ
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                currentScreen === "postDevice" && styles.tabButtonActive,
              ]}
              onPress={() => setCurrentScreen("postDevice")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="add-circle-outline"
                size={16}
                color={currentScreen === "postDevice" ? "#FFFFFF" : "#94A3B8"}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  currentScreen === "postDevice" && styles.tabButtonTextActive,
                ]}
              >
                List Device
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                currentScreen === "login" && styles.tabButtonActive,
              ]}
              onPress={() => setCurrentScreen("login")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="log-in-outline"
                size={16}
                color={currentScreen === "login" ? "#FFFFFF" : "#94A3B8"}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  currentScreen === "login" && styles.tabButtonTextActive,
                ]}
              >
                Đăng nhập
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                currentScreen === "register" && styles.tabButtonActive,
              ]}
              onPress={() => setCurrentScreen("register")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="person-add-outline"
                size={16}
                color={currentScreen === "register" ? "#FFFFFF" : "#94A3B8"}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  currentScreen === "register" && styles.tabButtonTextActive,
                ]}
              >
                Đăng ký
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                currentScreen === "profile" && styles.tabButtonActive,
              ]}
              onPress={() => setCurrentScreen("profile")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="person-circle-outline"
                size={16}
                color={currentScreen === "profile" ? "#FFFFFF" : "#94A3B8"}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  currentScreen === "profile" && styles.tabButtonTextActive,
                ]}
              >
                Profile
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
          ) : (
            <>
              {currentScreen === "home" && (
                <HomeScreen
                  onNavigateToDeviceDetail={handleNavigateToDeviceDetail}
                  onNavigateToSearch={() => {
                    console.log("Điều hướng Search");
                  }}
                  onNavigateToNotifications={() => {
                    console.log("Điều hướng Notifications");
                  }}
                />
              )}

              {currentScreen === "postDevice" && (
                <PostDeviceScreen
                  onBack={() => setCurrentScreen("home")}
                  onPublished={() => setCurrentScreen("home")}
                />
              )}

              {currentScreen === "login" && (
                <LoginScreen
                  onNavigateToRegister={() => setCurrentScreen("register")}
                  onNavigateToProfile={() => setCurrentScreen("profile")}
                />
              )}

              {currentScreen === "register" && (
                <RegisterScreen
                  onNavigateToLogin={() => setCurrentScreen("login")}
                  onRegisterSuccess={() => setCurrentScreen("profile")}
                />
              )}

              {currentScreen === "profile" && (
                <ProfileScreen
                  onLogout={() => setCurrentScreen("login")}
                  onNavigateToLogin={() => setCurrentScreen("login")}
                />
              )}
            </>
          )}
        </View>
      )}

      <View style={styles.screenContainer}>
        {bookingDeviceId ? (
          <BookingCreateScreen 
            deviceId={bookingDeviceId} 
            onBack={() => setBookingDeviceId(null)} 
          />
        ) : selectedDeviceId ? (
          <DeviceDetailScreen 
            deviceId={selectedDeviceId} 
            onBack={handleBackFromDetail} 
            onBookNow={(id) => setBookingDeviceId(id)}
          />
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
    backgroundColor: "#070B13",
  },
  topTabBar: {
    flexDirection: "row",
    backgroundColor: "#0F172A",
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    gap: 6,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 40,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#1E293B",
  },
  tabButtonActive: {
    backgroundColor: "#2563EB",
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },
  screenContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#070B13',
  },
});
