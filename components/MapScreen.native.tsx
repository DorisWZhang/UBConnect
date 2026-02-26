import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { ConnectEvent } from '@/components/models/ConnectEvent';
import { fetchEventsFeed } from '@/src/services/social';
import { captureException } from '@/src/telemetry';
import { Text } from 'react-native';

// Default UBC landmarks — shown alongside real events
const UBC_MARKERS = [
    { id: 'landmark-1', title: 'Nest', latitude: 49.2606, longitude: -123.246 },
    { id: 'landmark-2', title: 'Main Library', latitude: 49.266562, longitude: -123.250062 },
    { id: 'landmark-3', title: 'Wreck Beach Trail', latitude: 49.264312, longitude: -123.255938 },
];

const UBC_REGION = {
    latitude: 49.2606,
    longitude: -123.249,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
};

export default function MapScreenNative() {
    const router = useRouter();
    const [events, setEvents] = useState<ConnectEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadEvents = async () => {
            try {
                const result = await fetchEventsFeed({ pageSize: 50 });
                // Filter events with valid coordinates (locationGeo or legacy lat/lng)
                setEvents(result.events.filter((e) =>
                    e.locationGeo && e.locationGeo.latitude != null && e.locationGeo.longitude != null,
                ));
            } catch (err) {
                captureException(err, { flow: 'mapLoadEvents' });
            } finally {
                setLoading(false);
            }
        };
        loadEvents();
    }, []);

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                initialRegion={UBC_REGION}
                showsUserLocation
                showsMyLocationButton
            >
                {/* Real event markers — tap to navigate to event detail */}

                {/* Real event markers — tap to navigate to event detail */}
                {events.map((event) => (
                    <Marker
                        key={event.id}
                        coordinate={{
                            latitude: event.locationGeo!.latitude,
                            longitude: event.locationGeo!.longitude,
                        }}
                        title={event.title}
                        description={event.locationName || undefined}
                        pinColor="#FF6B6B"
                        onCalloutPress={() => router.push(`/event/${event.id}`)}
                    >
                        <Callout>
                            <View style={styles.callout}>
                                <Text style={styles.calloutTitle}>{event.title}</Text>
                                {event.locationName ? (
                                    <Text style={styles.calloutSub}>{event.locationName}</Text>
                                ) : null}
                                <Text style={styles.calloutAction}>Tap for details →</Text>
                            </View>
                        </Callout>
                    </Marker>
                ))}
            </MapView>
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color="#866FD8" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    loadingOverlay: {
        position: 'absolute',
        top: 60,
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 20,
        padding: 8,
    },
    callout: { width: 180, padding: 4 },
    calloutTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
    calloutSub: { fontSize: 12, color: '#666', marginTop: 2 },
    calloutAction: { fontSize: 11, color: '#866FD8', marginTop: 4 },
});
