// Typography system: Outfit for display, DM Sans for body
export const fonts = {
    display: 'Outfit_700Bold',
    heading: 'Outfit_600SemiBold',
    headingMedium: 'Outfit_500Medium',
    body: 'DMSans_400Regular',
    bodyMedium: 'DMSans_500Medium',
    bodySemiBold: 'DMSans_600SemiBold',
    bodyBold: 'DMSans_700Bold',
} as const;

export const fontSizes = {
    xs: 11,
    sm: 13,
    md: 15,
    base: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    hero: 34,
} as const;

export const lineHeights = {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
} as const;
