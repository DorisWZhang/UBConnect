// app/_layout.tsx — Root layout with AuthProvider
import { Stack } from 'expo-router';
import React from 'react';
import { AuthProvider } from '@/src/auth/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="landing" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(protected)" />
      </Stack>
    </AuthProvider>
  );
}
