// verify-email.tsx — Screen shown to unverified users
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { sendEmailVerification } from 'firebase/auth';
import { useAuth } from '@/src/auth/AuthContext';
import { logEvent } from '@/src/telemetry';

export default function VerifyEmailScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleResend = async () => {
        if (!user) return;
        setLoading(true);
        try {
            await sendEmailVerification(user);
            Alert.alert('Email Sent', 'A new verification email has been sent. Please check your inbox.');
            await logEvent('verify_email_resent');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to send verification email.');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        if (!user) return;
        setLoading(true);
        try {
            await user.reload();
            if (user.emailVerified) {
                await logEvent('email_verified');
                router.replace('/(tabs)/explore');
            } else {
                Alert.alert('Not Yet Verified', 'Your email is not verified yet. Please check your inbox and click the verification link.');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to check verification status.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.icon}>📧</Text>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
                We've sent a verification email to{'\n'}
                <Text style={styles.email}>{user?.email || 'your email'}</Text>
            </Text>
            <Text style={styles.description}>
                Please check your inbox and click the verification link to access all features of UBConnect.
            </Text>

            {loading && <ActivityIndicator size="large" color="#866FD8" style={{ marginVertical: 20 }} />}

            <TouchableOpacity style={styles.button} onPress={handleRefresh} disabled={loading}>
                <Text style={styles.buttonText}>I've Verified My Email</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleResend} disabled={loading}>
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Re-send Verification Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.linkButton}
                onPress={() => router.replace('/landing')}
            >
                <Text style={styles.linkText}>Back to Login</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 30,
    },
    icon: {
        fontSize: 60,
        marginBottom: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        marginBottom: 10,
    },
    email: {
        fontWeight: '600',
        color: '#866FD8',
    },
    description: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 20,
    },
    button: {
        backgroundColor: '#866FD8',
        height: 50,
        width: 300,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 25,
        marginTop: 12,
    },
    buttonText: {
        fontSize: 16,
        color: 'white',
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#866FD8',
    },
    secondaryButtonText: {
        color: '#866FD8',
    },
    linkButton: {
        marginTop: 20,
    },
    linkText: {
        color: '#866FD8',
        fontSize: 14,
    },
});
