// app/_layout.tsx — Root layout with font loading and AuthProvider
import 'react-native-get-random-values';
import { Stack } from 'expo-router';
import React from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { AuthProvider } from '@/src/auth/AuthContext';
import { useFonts, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { colors } from '@/src/theme';

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        Outfit_500Medium,
        Outfit_600SemiBold,
        Outfit_700Bold,
        DMSans_400Regular,
        DMSans_500Medium,
        DMSans_600SemiBold,
        DMSans_700Bold,
    });

    if (!fontsLoaded) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <AuthProvider>
            <StatusBar barStyle="light-content" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                    animation: 'fade',
                }}
            >
                <Stack.Screen name="landing" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(protected)" />
            </Stack>
        </AuthProvider>
    );
}
