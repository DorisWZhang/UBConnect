import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useRouter, useFocusEffect } from 'expo-router';
import { ConnectEvent } from '@/components/models/ConnectEvent';
import { fetchEventsFeed, listFriends } from '@/src/services/social';
import { useAuth } from '@/src/auth/AuthContext';
import { captureException } from '@/src/telemetry';
import { Text } from 'react-native';
import { colors, fonts, fontSizes, spacing, radius } from '@/src/theme';

// Dark map style for "Nightfall Campus" theme
const DARK_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#0B0B14' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#9B9BB0' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0B0B14' }] },
    {
        featureType: 'administrative',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#1E1E38' }],
    },
    {
        featureType: 'administrative.land_parcel',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#6B6B80' }],
    },
    {
        featureType: 'landscape',
        elementType: 'geometry',
        stylers: [{ color: '#16162A' }],
    },
    {
        featureType: 'poi',
        elementType: 'geometry',
        stylers: [{ color: '#1E1E38' }],
    },
    {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#6B6B80' }],
    },
    {
        featureType: 'poi.park',
        elementType: 'geometry.fill',
        stylers: [{ color: '#1A2A1A' }],
    },
    {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#6B6B80' }],
    },
    {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#1E1E38' }],
    },
    {
        featureType: 'road',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#252545' }],
    },
    {
        featureType: 'road',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9B9BB0' }],
    },
    {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#252545' }],
    },
    {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#1E1E38' }],
    },
    {
        featureType: 'transit',
        elementType: 'geometry',
        stylers: [{ color: '#16162A' }],
    },
    {
        featureType: 'transit.station',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#6B6B80' }],
    },
    {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#0a0a1a' }],
    },
    {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#6B6B80' }],
    },
];

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
    const { user } = useAuth();
    const [events, setEvents] = useState<ConnectEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const loadEvents = async () => {
                try {
                    // Load friend UIDs for safe feed
                    let friendUids: string[] = [];
                    if (user) {
                        try {
                            const edges = await listFriends(user.uid);
                            friendUids = edges.map(e => e.friendUid);
                        } catch { /* non-critical */ }
                    }

                    const result = await fetchEventsFeed({
                        pageSize: 50,
                        currentUid: user?.uid,
                        friendUids,
                    });
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
        }, [user])
    );

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                initialRegion={UBC_REGION}
                showsUserLocation
                showsMyLocationButton
                customMapStyle={DARK_MAP_STYLE}
                userInterfaceStyle="dark"
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
                        pinColor={colors.primary}
                        onCalloutPress={() => router.push(`/event/${event.id}`)}
                    >
                        <Callout>
                            <View style={styles.callout}>
                                <Text style={styles.calloutTitle}>{event.title}</Text>
                                {event.locationName ? (
                                    <Text style={styles.calloutSub}>{event.locationName}</Text>
                                ) : null}
                                <Text style={styles.calloutAction}>Tap for details</Text>
                            </View>
                        </Callout>
                    </Marker>
                ))}
            </MapView>
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    map: { flex: 1 },
    loadingOverlay: {
        position: 'absolute',
        top: 60,
        alignSelf: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        padding: spacing.sm,
    },
    callout: { width: 180, padding: spacing.xs },
    calloutTitle: {
        fontSize: fontSizes.sm,
        fontFamily: fonts.bodySemiBold,
        fontWeight: '600',
        color: colors.surface,
    },
    calloutSub: {
        fontSize: fontSizes.xs,
        fontFamily: fonts.body,
        color: colors.textMuted,
        marginTop: 2,
    },
    calloutAction: {
        fontSize: fontSizes.xs,
        fontFamily: fonts.bodyMedium,
        color: colors.primary,
        marginTop: spacing.xs,
    },
});
