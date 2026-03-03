import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import InlineNotice from '@/components/InlineNotice';
import { friendlyAuthError, validateForgotPasswordField } from '@/src/auth/firebaseErrorMap';
import { logEvent, captureException } from '@/src/telemetry';
import { colors, fonts, fontSizes, spacing, radius } from '@/src/theme';
import { ThemedText } from '@/components/ThemedText';
import GradientButton from '@/components/ui/GradientButton';
import GlassCard from '@/components/ui/GlassCard';
import ScreenContainer from '@/components/ui/ScreenContainer';

export default function ForgotPasswordScreen() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [notice, setNotice] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

    const handleSendReset = async () => {
        setNotice(null);

        const validationError = validateForgotPasswordField(email);
        if (validationError) {
            setNotice({ message: validationError, type: 'error' });
            return;
        }

        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email.trim());
            await logEvent('auth_forgot_password_sent');
            setSent(true);
        } catch (err: any) {
            captureException(err, { flow: 'forgot_password', email: email.trim() });
            setNotice({ message: friendlyAuthError(err), type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <ScreenContainer style={styles.container}>
                <GlassCard glow style={styles.successCard}>
                    <Text style={styles.icon}>{'\u2713'}</Text>
                    <ThemedText type="heading" style={styles.title}>Check Your Email</ThemedText>
                    <ThemedText style={styles.subtitle}>
                        We've sent a password reset link to{'\n'}
                        <Text style={styles.emailHighlight}>{email.trim()}</Text>
                    </ThemedText>
                    <ThemedText style={styles.description}>
                        Click the link in the email to set a new password, then come back here to log in.
                    </ThemedText>
                </GlassCard>
                <GradientButton
                    title="Back to Login"
                    onPress={() => router.replace('/(auth)/login')}
                    size="lg"
                    style={styles.button}
                />
            </ScreenContainer>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ThemedText type="heading" style={styles.title}>Reset Password</ThemedText>
            <ThemedText style={styles.subtitle}>Enter your UBC email and we'll send a reset link.</ThemedText>

            <InlineNotice message={notice?.message ?? null} type={notice?.type} />

            <TextInput
                style={styles.input}
                placeholder="UBC Email"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={(t) => { setEmail(t); setNotice(null); }}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            <GradientButton
                title="Send Reset Email"
                onPress={handleSendReset}
                loading={loading}
                disabled={loading}
                size="lg"
                style={styles.button}
            />

            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <ThemedText type="link" style={styles.link}>Back to Login</ThemedText>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xxl,
        backgroundColor: colors.background,
    },
    successCard: {
        alignItems: 'center',
        marginBottom: spacing.xl,
        width: '100%',
        maxWidth: 500,
    },
    icon: {
        fontSize: 60,
        color: colors.primary,
        marginBottom: spacing.lg,
        fontFamily: fonts.display,
    },
    title: {
        fontSize: fontSizes.xxl,
        fontFamily: fonts.display,
        color: colors.text,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: fontSizes.sm,
        fontFamily: fonts.body,
        color: colors.textSecondary,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    emailHighlight: {
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
    input: {
        height: 50,
        borderColor: colors.glassBorder,
        borderWidth: 1,
        borderRadius: radius.md,
        paddingHorizontal: spacing.base,
        fontSize: fontSizes.base,
        fontFamily: fonts.body,
        marginBottom: spacing.base,
        backgroundColor: colors.glass,
        color: colors.text,
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
    },
    button: {
        marginTop: spacing.md,
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
    },
    link: {
        textAlign: 'center',
        marginTop: spacing.lg,
        fontSize: fontSizes.sm,
    },
});
