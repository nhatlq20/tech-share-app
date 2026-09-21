import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { HomeScreen } from "../screens/home/HomeScreen";
import { ProfileScreen } from "../screens/user/ProfileScreen";
import { PostDeviceScreen } from "../screens/device/PostDeviceScreen";

const Tab = createBottomTabNavigator();

interface BottomTabNavigatorProps {
  onLogout: () => void;
  onOpenDevice: (deviceId: string) => void;
}

export function BottomTabNavigator({
  onLogout,
  onOpenDevice,
}: BottomTabNavigatorProps) {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: string } }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#38BDF8",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: {
          backgroundColor: "#0F172A",
          borderTopColor: "#1E293B",
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarIcon: ({ color, size }: { color: string; size: number }) => {
          const iconName =
            route.name === "Home" ? "home-outline" : "person-circle-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home">
        {() => (
          <HomeScreen
            onNavigateToDeviceDetail={onOpenDevice}
            onNavigateToSearch={() => undefined}
            onNavigateToNotifications={() => undefined}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {() => (
          <ProfileScreen
            onLogout={onLogout}
            onNavigateToLogin={onLogout}
            onNavigateToPostDevice={() => navigation.navigate("PostDevice")}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="PostDevice"
        options={{
          tabBarButton: () => null,
        }}
      >
        {({ navigation }) => (
          <PostDeviceScreen
            onBack={() => navigation.navigate("Profile")}
            onPublished={() => navigation.navigate("Profile")}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
