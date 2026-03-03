// app/(protected)/_layout.tsx — Verified-only gate + ProfileProvider wrapper
import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/src/auth/AuthContext';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { colors } from '@/src/theme';

export default function ProtectedLayout() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // Not logged in → landing
    if (!user) {
        return <Redirect href="/landing" />;
    }

    // Logged in but email not verified → verify-email
    if (!user.emailVerified) {
        return <Redirect href="/(auth)/verify-email" />;
    }

    // Verified — render protected screens wrapped in ProfileProvider
    return (
        <ProfileProvider>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="edit-profile" />
                <Stack.Screen name="event/[eventId]" options={{ presentation: 'card' }} />
                <Stack.Screen name="profile/[uid]" options={{ presentation: 'card' }} />
            </Stack>
        </ProfileProvider>
    );
}
