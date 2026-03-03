import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
    reauthenticateWithCredential,
    updatePassword,
    EmailAuthProvider,
} from 'firebase/auth';
import { useAuth } from '@/src/auth/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import InlineNotice from '@/components/InlineNotice';
import GradientButton from '@/components/ui/GradientButton';
import { friendlyAuthError, validateChangePasswordFields } from '@/src/auth/firebaseErrorMap';
import { logEvent, captureException } from '@/src/telemetry';
import { colors, fonts, fontSizes, spacing, radius } from '@/src/theme';

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
            await logEvent('auth_change_password_reauth_fail');
            setNotice({ message: 'Incorrect current password. Please try again.', type: 'error' });
            setLoading(false);
            return;
        }

        try {
            await updatePassword(user, newPassword);
            await logEvent('auth_change_password_success');
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
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <ThemedText style={styles.headerTitle}>Change Password</ThemedText>
                    <View style={styles.headerSpacer} />
                </View>

                <KeyboardAvoidingView
                    style={styles.content}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.formContainer}>
                        <ThemedText style={styles.subtitle}>
                            Enter your current password and choose a new one.
                        </ThemedText>

                        <InlineNotice message={notice?.message ?? null} type={notice?.type} />

                        <View style={styles.fieldContainer}>
                            <ThemedText style={styles.label}>Current Password</ThemedText>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter current password"
                                placeholderTextColor={colors.textMuted}
                                value={currentPassword}
                                onChangeText={(t) => { setCurrentPassword(t); clearNotice(); }}
                                secureTextEntry
                                textContentType="password"
                            />
                        </View>

                        <View style={styles.fieldContainer}>
                            <ThemedText style={styles.label}>New Password</ThemedText>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter new password"
                                placeholderTextColor={colors.textMuted}
                                value={newPassword}
                                onChangeText={(t) => { setNewPassword(t); clearNotice(); }}
                                secureTextEntry
                                textContentType="none"
                            />
                        </View>

                        <View style={styles.fieldContainer}>
                            <ThemedText style={styles.label}>Confirm New Password</ThemedText>
                            <TextInput
                                style={styles.input}
                                placeholder="Re-enter new password"
                                placeholderTextColor={colors.textMuted}
                                value={confirmPassword}
                                onChangeText={(t) => { setConfirmPassword(t); clearNotice(); }}
                                secureTextEntry
                                textContentType="none"
                            />
                        </View>

                        <GradientButton
                            title="Update Password"
                            onPress={handleChangePassword}
                            loading={loading}
                            disabled={loading}
                            size="lg"
                            style={styles.updateButton}
                        />

                        <TouchableOpacity style={styles.cancelTouchable} onPress={() => router.back()}>
                            <ThemedText style={styles.cancelText}>Cancel</ThemedText>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: spacing.xs,
    },
    headerTitle: {
        fontSize: fontSizes.lg,
        fontFamily: fonts.heading,
        color: colors.text,
    },
    headerSpacer: {
        width: 32,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    formContainer: {
        paddingHorizontal: spacing.xl,
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
    },
    subtitle: {
        fontSize: fontSizes.md,
        fontFamily: fonts.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    fieldContainer: {
        marginBottom: spacing.base,
    },
    label: {
        marginBottom: spacing.sm,
        fontFamily: fonts.bodySemiBold,
        fontSize: fontSizes.sm,
        color: colors.textSecondary,
    },
    input: {
        height: 50,
        backgroundColor: colors.glass,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: radius.md,
        paddingHorizontal: spacing.base,
        fontSize: fontSizes.base,
        fontFamily: fonts.body,
        color: colors.text,
    },
    updateButton: {
        marginTop: spacing.lg,
        width: '100%',
    },
    cancelTouchable: {
        alignItems: 'center',
        paddingVertical: spacing.base,
    },
    cancelText: {
        color: colors.textSecondary,
        fontFamily: fonts.bodyMedium,
        fontSize: fontSizes.md,
    },
});
