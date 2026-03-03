import { colors } from '@/src/theme';

const tintColorLight = colors.primary;
const tintColorDark = colors.primary;

export const Colors = {
    light: {
        text: colors.text,
        background: colors.background,
        tint: tintColorLight,
        icon: colors.textMuted,
        tabIconDefault: colors.textMuted,
        tabIconSelected: tintColorLight,
    },
    dark: {
        text: colors.text,
        background: colors.background,
        tint: tintColorDark,
        icon: colors.textMuted,
        tabIconDefault: colors.textMuted,
        tabIconSelected: tintColorDark,
    },
};
