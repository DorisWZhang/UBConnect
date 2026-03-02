import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
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
            await logEvent('AUTH_FORGOT_PASSWORD_SENT', { email: email.trim() });
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
            <View style={styles.container}>
                <Text style={styles.icon}>✓</Text>
                <Text style={styles.title}>Check Your Email</Text>
                <Text style={styles.subtitle}>
                    We've sent a password reset link to{'\n'}
                    <Text style={styles.emailHighlight}>{email.trim()}</Text>
                </Text>
                <Text style={styles.description}>
                    Click the link in the email to set a new password, then come back here to log in.
                </Text>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => router.replace('/(auth)/login')}
                >
                    <Text style={styles.buttonText}>Back to Login</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter your UBC email and we'll send a reset link.</Text>

            <InlineNotice message={notice?.message ?? null} type={notice?.type} />

            <TextInput
                style={styles.input}
                placeholder="UBC Email"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={(t) => { setEmail(t); setNotice(null); }}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendReset}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Send Reset Email</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.link}>Back to Login</Text>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
        backgroundColor: '#fff',
    },
    icon: {
        fontSize: 60,
        color: '#866FD8',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#888',
        marginBottom: 10,
        textAlign: 'center',
    },
    emailHighlight: {
        fontWeight: '600',
        color: '#866FD8',
    },
    description: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
        marginBottom: 10,
        lineHeight: 20,
    },
    input: {
        height: 48,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        fontSize: 16,
        marginBottom: 14,
        backgroundColor: '#f9f9f9',
        color: '#333',
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
    },
    button: {
        backgroundColor: '#866FD8',
        paddingVertical: 14,
        borderRadius: 25,
        alignItems: 'center',
        marginTop: 10,
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    link: {
        color: '#866FD8',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 14,
    },
});
