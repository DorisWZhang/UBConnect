import { Stack, Redirect } from 'expo-router';
import React from 'react';
import { useAuth } from '@/src/auth/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function AuthLayout() {
    const { user, loading } = useAuth();

    // Show loading spinner while auth state resolves
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
                <ActivityIndicator size="large" color="#866FD8" />
            </View>
        );
    }

    // Redirect fully authenticated users away from auth screens
    if (user && user.emailVerified) {
        return <Redirect href="/(protected)/(tabs)/explore" />;
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="verify-email" />
        </Stack>
    );
}
