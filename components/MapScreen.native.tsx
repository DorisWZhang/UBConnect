import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const UBC_MARKERS = [
    { id: '1', title: 'Nest', latitude: 49.2606, longitude: -123.246 },
    { id: '2', title: 'Main Library', latitude: 49.266562, longitude: -123.250062 },
    { id: '3', title: 'Wreck Beach Trail', latitude: 49.264312, longitude: -123.255938 },
];

const UBC_REGION = {
    latitude: 49.2606,
    longitude: -123.249,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
};

export default function MapScreenNative() {
    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                initialRegion={UBC_REGION}
                showsUserLocation
                showsMyLocationButton
            >
                {UBC_MARKERS.map((marker) => (
                    <Marker
                        key={marker.id}
                        coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                        title={marker.title}
                        pinColor="#866FD8"
                    />
                ))}
            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
});
