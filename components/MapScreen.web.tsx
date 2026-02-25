import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

export default function MapScreenWeb() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>🗺️ Map</Text>
            <Text style={styles.message}>
                The interactive map is available on the mobile app.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#fff',
    },
    title: { fontSize: 28, fontWeight: '700', marginBottom: 12 },
    message: { fontSize: 16, textAlign: 'center', color: '#555' },
});
