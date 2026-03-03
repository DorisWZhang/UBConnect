import React, { useState } from 'react';
import {
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth/AuthContext';
import InlineNotice from '@/components/InlineNotice';
import { friendlyAuthError, validateSignupFields } from '@/src/auth/firebaseErrorMap';
import { colors, fonts, fontSizes, spacing, radius } from '@/src/theme';
import { ThemedText } from '@/components/ThemedText';
import GradientButton from '@/components/ui/GradientButton';

export default function SignupScreen() {
    const router = useRouter();
    const { signUp } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

    const clearNotice = () => setNotice(null);

    const handleSignup = async () => {
        setNotice(null);

        const validationError = validateSignupFields(email, password, confirm);
        if (validationError) {
            setNotice({ message: validationError, type: 'error' });
            return;
        }

        setLoading(true);
        try {
            await signUp(email.trim(), password);
            setNotice({
                message: 'Verification email sent! Please check your inbox and verify before logging in.',
                type: 'success',
            });
            // Navigate to login after a short delay so user sees the success message
            setTimeout(() => router.replace('/(auth)/login'), 2500);
        } catch (err: any) {
            setNotice({ message: friendlyAuthError(err), type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ThemedText type="heading" style={styles.title}>Create Account</ThemedText>
            <ThemedText style={styles.subtitle}>Use your @student.ubc.ca or @ubc.ca email</ThemedText>

            <InlineNotice message={notice?.message ?? null} type={notice?.type} />

            <TextInput
                style={styles.input}
                placeholder="UBC Email"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={(t) => { setEmail(t); clearNotice(); }}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(t) => { setPassword(t); clearNotice(); }}
                secureTextEntry
                textContentType="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={colors.textMuted}
                value={confirm}
                onChangeText={(t) => { setConfirm(t); clearNotice(); }}
                secureTextEntry
                textContentType="none"
            />

            <GradientButton
                title="Sign Up"
                onPress={handleSignup}
                loading={loading}
                disabled={loading}
                size="lg"
                style={styles.button}
            />

            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <ThemedText type="link" style={styles.link}>Already have an account? Log in</ThemedText>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.xxl,
        backgroundColor: colors.background,
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
