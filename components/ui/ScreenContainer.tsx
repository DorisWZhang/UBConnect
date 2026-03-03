import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { colors } from '@/src/theme';

interface ScreenContainerProps extends ViewProps {
    noPadding?: boolean;
}

export default function ScreenContainer({ style, noPadding, children, ...props }: ScreenContainerProps) {
    return (
        <View style={[styles.container, noPadding && styles.noPadding, style]} {...props}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: 16,
    },
    noPadding: {
        paddingHorizontal: 0,
    },
});
