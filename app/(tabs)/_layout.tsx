import { Tabs, Redirect } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ProfileProvider } from "../ProfileContext";
import { useAuth } from '@/src/auth/AuthContext';

export default () => {
  const { user, loading } = useAuth();

  // Show loading spinner while auth state resolves
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="#866FD8" />
      </View>
    );
  }

  // Redirect unauthenticated users to landing
  if (!user) {
    return <Redirect href="/landing" />;
  }

  // Redirect unverified users to verify-email screen
  if (!user.emailVerified) {
    return <Redirect href="/(auth)/verify-email" />;
  }

  return (
    <ProfileProvider>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            switch (route.name) {
              case 'explore':
                iconName = focused ? 'search' : 'search-outline';
                break;
              case 'map':
                iconName = focused ? 'map' : 'map-outline';
                break;
              case 'posting':
                iconName = focused ? 'add-circle' : 'add-circle-outline';
                break;
              case 'friends':
                iconName = focused ? 'people' : 'people-outline';
                break;
              case 'notifications':
                iconName = focused ? 'notifications' : 'notifications-outline';
                break;
              case 'profile':
                iconName = focused ? 'person' : 'person-outline';
                break;
              default:
                iconName = 'help';
            }
            return <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#866FD8',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
        <Tabs.Screen name="map" options={{ title: 'Map' }} />
        <Tabs.Screen name="posting" options={{ title: 'Post' }} />
        <Tabs.Screen name="friends" options={{ title: 'Friends' }} />
        <Tabs.Screen name="notifications" options={{ title: 'Alerts' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </ProfileProvider>
  );
};
