import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { colors, radius, spacing } from '@/src/theme';

interface GlassCardProps extends ViewProps {
    glow?: boolean;
    noPadding?: boolean;
}

export default function GlassCard({ style, glow, noPadding, children, ...props }: GlassCardProps) {
    return (
        <View
            style={[
                styles.card,
                glow && styles.glow,
                noPadding && styles.noPadding,
                style,
            ]}
            {...props}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.glass,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        padding: spacing.base,
    },
    glow: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
    },
    noPadding: {
        padding: 0,
    },
});
