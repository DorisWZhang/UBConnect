import { View, type ViewProps } from 'react-native';
import { colors } from '@/src/theme';

export type ThemedViewProps = ViewProps & {
    variant?: 'default' | 'surface' | 'glass';
};

export function ThemedView({ style, variant = 'default', ...otherProps }: ThemedViewProps) {
    const bg = variant === 'surface' ? colors.surface
        : variant === 'glass' ? colors.glass
        : colors.background;

    return <View style={[{ backgroundColor: bg }, style]} {...otherProps} />;
}
