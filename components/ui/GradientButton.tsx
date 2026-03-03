import React from 'react';
import {
    TouchableOpacity, Text, StyleSheet, ActivityIndicator,
    type ViewStyle, type TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, fonts, fontSizes, radius, spacing } from '@/src/theme';

interface GradientButtonProps {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    style?: ViewStyle;
    textStyle?: TextStyle;
    icon?: React.ReactNode;
}

export default function GradientButton({
    title, onPress, loading, disabled, variant = 'primary',
    size = 'md', style, textStyle, icon,
}: GradientButtonProps) {
    const isDisabled = disabled || loading;

    if (variant === 'outline') {
        return (
            <TouchableOpacity
                style={[styles.outline, sizes[size], isDisabled && styles.disabled, style]}
                onPress={onPress}
                disabled={isDisabled}
                activeOpacity={0.7}
            >
                {icon}
                {loading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                    <Text style={[styles.outlineText, textSizes[size], textStyle]}>{title}</Text>
                )}
            </TouchableOpacity>
        );
    }

    if (variant === 'ghost') {
        return (
            <TouchableOpacity
                style={[styles.ghost, sizes[size], isDisabled && styles.disabled, style]}
                onPress={onPress}
                disabled={isDisabled}
                activeOpacity={0.7}
            >
                {icon}
                <Text style={[styles.ghostText, textSizes[size], textStyle]}>{title}</Text>
            </TouchableOpacity>
        );
    }

    if (variant === 'danger') {
        return (
            <TouchableOpacity
                style={[styles.dangerBtn, sizes[size], isDisabled && styles.disabled, style]}
                onPress={onPress}
                disabled={isDisabled}
                activeOpacity={0.7}
            >
                {icon}
                {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={[styles.primaryText, textSizes[size], textStyle]}>{title}</Text>
                )}
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.8}
            style={[isDisabled && styles.disabled, style]}
        >
            <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gradient, sizes[size]]}
            >
                {icon}
                {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={[styles.primaryText, textSizes[size], textStyle]}>{title}</Text>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );
}

const sizes: Record<string, ViewStyle> = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.base },
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
    lg: { paddingVertical: spacing.base, paddingHorizontal: spacing.xxl, minHeight: 52 },
};

const textSizes: Record<string, TextStyle> = {
    sm: { fontSize: fontSizes.sm },
    md: { fontSize: fontSizes.md },
    lg: { fontSize: fontSizes.base },
};

const styles = StyleSheet.create({
    gradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.xl,
        gap: spacing.sm,
    },
    primaryText: {
        color: '#fff',
        fontFamily: fonts.bodySemiBold,
        fontWeight: '600',
    },
    outline: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.xl,
        borderWidth: 1.5,
        borderColor: colors.primary,
        gap: spacing.sm,
    },
    outlineText: {
        color: colors.primary,
        fontFamily: fonts.bodySemiBold,
        fontWeight: '600',
    },
    ghost: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.xl,
        gap: spacing.sm,
    },
    ghostText: {
        color: colors.textSecondary,
        fontFamily: fonts.bodyMedium,
        fontWeight: '500',
    },
    dangerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.xl,
        backgroundColor: colors.danger,
        gap: spacing.sm,
    },
    disabled: {
        opacity: 0.5,
    },
});
