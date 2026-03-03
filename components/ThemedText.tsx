import { Text, type TextProps, StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from '@/src/theme';

export type ThemedTextProps = TextProps & {
    type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'muted' | 'heading';
};

export function ThemedText({ style, type = 'default', ...rest }: ThemedTextProps) {
    return (
        <Text
            style={[
                styles.base,
                type === 'default' ? styles.default : undefined,
                type === 'title' ? styles.title : undefined,
                type === 'heading' ? styles.heading : undefined,
                type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
                type === 'subtitle' ? styles.subtitle : undefined,
                type === 'link' ? styles.link : undefined,
                type === 'muted' ? styles.muted : undefined,
                style,
            ]}
            {...rest}
        />
    );
}

const styles = StyleSheet.create({
    base: {
        color: colors.text,
    },
    default: {
        fontSize: fontSizes.base,
        lineHeight: 24,
        fontFamily: fonts.body,
    },
    defaultSemiBold: {
        fontSize: fontSizes.base,
        lineHeight: 24,
        fontFamily: fonts.bodySemiBold,
        fontWeight: '600',
    },
    title: {
        fontSize: fontSizes.hero,
        fontFamily: fonts.display,
        fontWeight: 'bold',
        lineHeight: 40,
    },
    heading: {
        fontSize: fontSizes.xl,
        fontFamily: fonts.heading,
        fontWeight: '600',
        lineHeight: 28,
    },
    subtitle: {
        fontSize: fontSizes.lg,
        fontFamily: fonts.heading,
        fontWeight: '600',
    },
    link: {
        fontSize: fontSizes.base,
        fontFamily: fonts.bodyMedium,
        color: colors.accent,
    },
    muted: {
        fontSize: fontSizes.sm,
        fontFamily: fonts.body,
        color: colors.textMuted,
    },
});
