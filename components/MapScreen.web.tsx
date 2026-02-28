import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ConnectEvent } from '@/components/models/ConnectEvent';
import { fetchEventsFeed, listFriends } from '@/src/services/social';
import { useAuth } from '@/src/auth/AuthContext';
import { captureException } from '@/src/telemetry';

const UBC_REGION = {
    latitude: 49.2606,
    longitude: -123.249,
};

// Dynamic imports to avoid window/SSR crashes in Expo Web
let MapContainer: any = null;
let TileLayer: any = null;
let Marker: any = null;
let Popup: any = null;

export default function MapScreenWeb() {
    const router = useRouter();
    const { user } = useAuth();
    const [events, setEvents] = useState<ConnectEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [mapComponentsLoaded, setMapComponentsLoaded] = useState(false);

    useEffect(() => {
        // Only load on the client to avoid Next/Expo "window is not defined" SSR errors
        if (typeof window !== 'undefined') {
            // Append CSS via CDN to fix Metro "Importing local resources in CSS is not supported"
            if (!document.getElementById('leaflet-css')) {
                const link = document.createElement('link');
                link.id = 'leaflet-css';
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }

            Promise.all([
                import('react-leaflet'),
                // @ts-ignore
                import('leaflet')
            ]).then(([reactLeaflet, leaflet]) => {
                const L = leaflet.default || leaflet;

                // Fix Leaflet's default icon path issue with Webpack/Metro by using a CDN
                const LeafIcon = L.icon({
                    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });
                L.Marker.prototype.options.icon = LeafIcon;

                MapContainer = reactLeaflet.MapContainer;
                TileLayer = reactLeaflet.TileLayer;
                Marker = reactLeaflet.Marker;
                Popup = reactLeaflet.Popup;

                setMapComponentsLoaded(true);
            }).catch(err => {
                console.error("Failed to dynamically load leaflet:", err);
            });
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            const loadEvents = async () => {
                try {
                    let friendUids: string[] = [];
                    if (user) {
                        try {
                            const edges = await listFriends(user.uid);
                            friendUids = edges.map((e) => e.friendUid);
                        } catch { /* non-critical */ }
                    }

                    const result = await fetchEventsFeed({
                        pageSize: 50,
                        currentUid: user?.uid,
                        friendUids,
                    });

                    setEvents(result.events.filter((e) =>
                        e.locationGeo && e.locationGeo.latitude != null && e.locationGeo.longitude != null
                    ));
                } catch (err) {
                    captureException(err, { flow: 'mapLoadEventsWeb' });
                } finally {
                    setLoading(false);
                }
            };
            loadEvents();
        }, [user])
    );

    if (!mapComponentsLoaded) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#866FD8" />
                <Text style={{ marginTop: 12, color: '#666' }}>Loading Map...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapContainer
                center={[UBC_REGION.latitude, UBC_REGION.longitude]}
                zoom={14}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {events.map((event) => (
                    <Marker
                        key={event.id}
                        position={[event.locationGeo!.latitude, event.locationGeo!.longitude]}
                    >
                        <Popup>
                            <View style={styles.callout}>
                                <Text style={styles.calloutTitle}>{event.title}</Text>
                                {event.locationName ? (
                                    <Text style={styles.calloutSub}>{event.locationName}</Text>
                                ) : null}
                                <Text
                                    style={styles.calloutAction}
                                    onPress={() => router.push(`/event/${event.id}`)}
                                >
                                    Tap for details →
                                </Text>
                            </View>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
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
    loadingOverlay: {
        position: 'absolute',
        top: 60,
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 20,
        padding: 8,
        zIndex: 10,
    },
    callout: { width: 180, padding: 4 },
    calloutTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
    calloutSub: { fontSize: 12, color: '#666', marginTop: 2 },
    calloutAction: { fontSize: 11, color: '#866FD8', marginTop: 8, cursor: 'pointer' },
});
