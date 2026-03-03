import { Tabs } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { colors, fonts } from '@/src/theme';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    switch (route.name) {
                        case 'explore':
                            iconName = focused ? 'search' : 'search-outline';
                            break;
                        case 'map':
                            iconName = focused ? 'map' : 'map-outline';
                            break;
                        case 'posting':
                            iconName = focused ? 'add-circle' : 'add-circle-outline';
                            break;
                        case 'friends':
                            iconName = focused ? 'people' : 'people-outline';
                            break;
                        case 'notifications':
                            iconName = focused ? 'notifications' : 'notifications-outline';
                            break;
                        case 'profile':
                            iconName = focused ? 'person' : 'person-outline';
                            break;
                        default:
                            iconName = 'help';
                    }
                    return <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={size} color={color} />;
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    paddingTop: 4,
                },
                tabBarLabelStyle: {
                    fontFamily: fonts.bodyMedium,
                    fontSize: 11,
                },
            })}
        >
            <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
            <Tabs.Screen name="map" options={{ title: 'Map' }} />
            <Tabs.Screen name="posting" options={{ title: 'Post' }} />
            <Tabs.Screen name="friends" options={{ title: 'Friends' }} />
            <Tabs.Screen name="notifications" options={{ title: 'Alerts' }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        </Tabs>
    );
}
