import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth/AuthContext';
import InlineNotice from '@/components/InlineNotice';
import { friendlyAuthError, validateLoginFields } from '@/src/auth/firebaseErrorMap';
import { colors, fonts, fontSizes, spacing, radius } from '@/src/theme';
import { ThemedText } from '@/components/ThemedText';
import GradientButton from '@/components/ui/GradientButton';

export default function LoginScreen() {
    const router = useRouter();
    const { logIn } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

    const handleLogin = async () => {
        setNotice(null);

        const validationError = validateLoginFields(email, password);
        if (validationError) {
            setNotice({ message: validationError, type: 'error' });
            return;
        }

        setLoading(true);
        try {
            await logIn(email.trim(), password);
            router.replace('/(protected)/(tabs)/explore');
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
            <ThemedText type="heading" style={styles.title}>Welcome Back</ThemedText>
            <ThemedText style={styles.subtitle}>Log in with your UBC email</ThemedText>

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
            <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(t) => { setPassword(t); setNotice(null); }}
                secureTextEntry
                textContentType="password"
            />

            <GradientButton
                title="Log In"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                size="lg"
                style={styles.button}
            />

            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                <ThemedText type="link" style={styles.link}>Forgot password?</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace('/(auth)/signup')}>
                <ThemedText type="link" style={styles.link}>Don't have an account? Sign up</ThemedText>
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
