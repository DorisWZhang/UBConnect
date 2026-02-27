import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth/AuthContext';
import InlineNotice from '@/components/InlineNotice';
import { friendlyAuthError, validateSignupFields } from '@/src/auth/firebaseErrorMap';

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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Use your @student.ubc.ca or @ubc.ca email</Text>

            <InlineNotice message={notice?.message ?? null} type={notice?.type} />

            <TextInput
                style={styles.input}
                placeholder="UBC Email"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={(t) => { setEmail(t); clearNotice(); }}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={(t) => { setPassword(t); clearNotice(); }}
                secureTextEntry
                textContentType="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#aaa"
                value={confirm}
                onChangeText={(t) => { setConfirm(t); clearNotice(); }}
                secureTextEntry
                textContentType="none"
            />

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Sign Up</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.link}>Already have an account? Log in</Text>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
        backgroundColor: '#fff',
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
