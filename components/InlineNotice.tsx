import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fonts, fontSizes, radius, spacing } from '@/src/theme';

type NoticeType = 'error' | 'success' | 'info';

interface InlineNoticeProps {
    message: string | null;
    type?: NoticeType;
}

const NOTICE_COLORS: Record<NoticeType, { bg: string; border: string; text: string }> = {
    error: { bg: colors.dangerGlow, border: colors.danger, text: colors.danger },
    success: { bg: colors.successGlow, border: colors.success, text: colors.success },
    info: { bg: colors.accentGlow, border: colors.accent, text: colors.accent },
};

export default function InlineNotice({ message, type = 'error' }: InlineNoticeProps) {
    if (!message) return null;

    const palette = NOTICE_COLORS[type];

    return (
        <View style={[styles.container, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <Text style={[styles.text, { color: palette.text }]}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.md,
        marginVertical: spacing.sm,
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
    },
    text: {
        fontSize: fontSizes.sm,
        fontFamily: fonts.bodyMedium,
        lineHeight: 20,
        textAlign: 'center',
    },
});
