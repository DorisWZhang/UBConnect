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
import { friendlyAuthError, validateLoginFields } from '@/src/auth/firebaseErrorMap';

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
            router.replace('/(tabs)/explore');
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Log in with your UBC email</Text>

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
            <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={(t) => { setPassword(t); setNotice(null); }}
                secureTextEntry
                textContentType="password"
            />

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Log In</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace('/(auth)/signup')}>
                <Text style={styles.link}>Don't have an account? Sign up</Text>
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
