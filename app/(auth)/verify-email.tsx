// verify-email.tsx — Screen shown to unverified users
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { sendEmailVerification } from 'firebase/auth';
import { useAuth } from '@/src/auth/AuthContext';
import { logEvent } from '@/src/telemetry';
import InlineNotice from '@/components/InlineNotice';
import { colors, fonts, fontSizes, spacing, radius } from '@/src/theme';
import { ThemedText } from '@/components/ThemedText';
import GradientButton from '@/components/ui/GradientButton';
import GlassCard from '@/components/ui/GlassCard';
import ScreenContainer from '@/components/ui/ScreenContainer';

export default function VerifyEmailScreen() {
    const router = useRouter();
    const { user, logOut } = useAuth();
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

    const handleResend = async () => {
        if (!user) return;
        setLoading(true);
        setNotice(null);
        try {
            await sendEmailVerification(user);
            setNotice({ message: 'A new verification email has been sent. Please check your inbox.', type: 'success' });
            await logEvent('verify_email_resent');
        } catch (err: any) {
            setNotice({ message: err.message || 'Failed to send verification email.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        if (!user) return;
        setLoading(true);
        setNotice(null);
        try {
            await user.reload();
            // Force token refresh so the ID token carries email_verified: true
            await user.getIdToken(true);
            if (user.emailVerified) {
                await logEvent('email_verified');
                router.replace('/(protected)/(tabs)/explore');
            } else {
                setNotice({
                    message: 'Your email is not verified yet. Please check your inbox and click the verification link.',
                    type: 'info',
                });
            }
        } catch (err: any) {
            setNotice({ message: err.message || 'Failed to check verification status.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleBackToLogin = async () => {
        try {
            await logOut();
        } catch {
            // best-effort logout
        }
        router.replace('/landing');
    };

    return (
        <ScreenContainer style={styles.container}>
            <GlassCard glow style={styles.card}>
                <Text style={styles.icon}>{'\uD83D\uDCE7'}</Text>
                <ThemedText type="heading" style={styles.title}>Verify Your Email</ThemedText>
                <ThemedText style={styles.subtitle}>
                    We've sent a verification email to{'\n'}
                    <Text style={styles.email}>{user?.email || 'your email'}</Text>
                </ThemedText>
                <ThemedText style={styles.description}>
                    Please check your inbox and click the verification link to access all features of UBConnect.
                </ThemedText>

                <InlineNotice message={notice?.message ?? null} type={notice?.type} />

                {loading && <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />}
            </GlassCard>

            <View style={styles.buttonGroup}>
                <GradientButton
                    title="I've Verified My Email"
                    onPress={handleRefresh}
                    disabled={loading}
                    size="lg"
                    style={styles.button}
                />

                <GradientButton
                    title="Re-send Verification Email"
                    onPress={handleResend}
                    disabled={loading}
                    variant="outline"
                    size="lg"
                    style={styles.button}
                />
            </View>

            <TouchableOpacity
                style={styles.linkButton}
                onPress={handleBackToLogin}
            >
                <ThemedText type="link" style={styles.linkText}>Back to Login</ThemedText>
            </TouchableOpacity>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        alignItems: 'center',
        width: '100%',
        maxWidth: 500,
        marginBottom: spacing.xl,
    },
    icon: {
        fontSize: 60,
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: fontSizes.xxl,
        fontFamily: fonts.display,
        color: colors.text,
        marginBottom: spacing.md,
    },
    subtitle: {
        fontSize: fontSizes.base,
        fontFamily: fonts.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    email: {
        fontWeight: '600',
        fontFamily: fonts.bodySemiBold,
        color: colors.accent,
    },
    description: {
        fontSize: fontSizes.sm,
        fontFamily: fonts.body,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing.md,
        lineHeight: 20,
    },
    loader: {
        marginVertical: spacing.lg,
    },
    buttonGroup: {
        width: '100%',
        maxWidth: 320,
        gap: spacing.md,
    },
    button: {
        width: '100%',
    },
    linkButton: {
        marginTop: spacing.lg,
    },
    linkText: {
        fontSize: fontSizes.sm,
    },
});
