// app/index.tsx — Auth-aware entry point redirect
import { Redirect } from 'expo-router';
import React from 'react';
import { useAuth } from '@/src/auth/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="#866FD8" />
      </View>
    );
  }

  // Not logged in → landing
  if (!user) {
    return <Redirect href="/landing" />;
  }

  // Logged in but email not verified → verify screen
  if (!user.emailVerified) {
    return <Redirect href="/(auth)/verify-email" />;
  }

  // Fully authenticated → explore
  return <Redirect href="/(protected)/(tabs)/explore" />;
}
