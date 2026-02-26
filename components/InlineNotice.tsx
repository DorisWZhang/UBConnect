// InlineNotice — cross-platform error/success/info banner (works on web + native)
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

type NoticeType = 'error' | 'success' | 'info';

interface InlineNoticeProps {
    message: string | null;
    type?: NoticeType;
}

const COLORS: Record<NoticeType, { bg: string; border: string; text: string }> = {
    error: { bg: '#FEE2E2', border: '#F87171', text: '#991B1B' },
    success: { bg: '#D1FAE5', border: '#34D399', text: '#065F46' },
    info: { bg: '#DBEAFE', border: '#60A5FA', text: '#1E40AF' },
};

export default function InlineNotice({ message, type = 'error' }: InlineNoticeProps) {
    if (!message) return null;

    const palette = COLORS[type];

    return (
        <View style={[styles.container, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <Text style={[styles.text, { color: palette.text }]}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginVertical: 10,
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
    },
    text: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
});
