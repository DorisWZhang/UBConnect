import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    reauthenticateWithCredential,
    updatePassword,
    EmailAuthProvider,
} from 'firebase/auth';
import { useAuth } from '@/src/auth/AuthContext';
import InlineNotice from '@/components/InlineNotice';
import { friendlyAuthError, validateChangePasswordFields } from '@/src/auth/firebaseErrorMap';
import { logEvent, captureException } from '@/src/telemetry';

export default function ChangePasswordScreen() {
    const router = useRouter();
    const { user } = useAuth();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

    const clearNotice = () => setNotice(null);

    const handleChangePassword = async () => {
        setNotice(null);

        const validationError = validateChangePasswordFields(currentPassword, newPassword, confirmPassword);
        if (validationError) {
            setNotice({ message: validationError, type: 'error' });
            return;
        }

        if (!user || !user.email) {
            setNotice({ message: 'You must be logged in to change your password.', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
        } catch (err: any) {
            captureException(err, { flow: 'change_password_reauth' });
            await logEvent('AUTH_CHANGE_PASSWORD_REAUTH_FAIL');
            setNotice({ message: 'Incorrect current password. Please try again.', type: 'error' });
            setLoading(false);
            return;
        }

        try {
            await updatePassword(user, newPassword);
            await logEvent('AUTH_CHANGE_PASSWORD_SUCCESS');
            setNotice({ message: 'Password updated successfully!', type: 'success' });
            setTimeout(() => router.back(), 2000);
        } catch (err: any) {
            captureException(err, { flow: 'change_password_update' });
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
            <Text style={styles.title}>Change Password</Text>
            <Text style={styles.subtitle}>Enter your current password and choose a new one.</Text>

            <InlineNotice message={notice?.message ?? null} type={notice?.type} />

            <TextInput
                style={styles.input}
                placeholder="Current Password"
                placeholderTextColor="#aaa"
                value={currentPassword}
                onChangeText={(t) => { setCurrentPassword(t); clearNotice(); }}
                secureTextEntry
                textContentType="password"
            />
            <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor="#aaa"
                value={newPassword}
                onChangeText={(t) => { setNewPassword(t); clearNotice(); }}
                secureTextEntry
                textContentType="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                placeholderTextColor="#aaa"
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); clearNotice(); }}
                secureTextEntry
                textContentType="none"
            />

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleChangePassword}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Update Password</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.link}>Cancel</Text>
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
