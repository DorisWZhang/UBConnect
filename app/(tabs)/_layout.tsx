import { Tabs } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ProfileProvider } from "../ProfileContext";

export default () => {
  return (
    <ProfileProvider>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          // Set default icons and styles for all screens here:
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
          // Optionally define tabBarActiveTintColor, tabBarInactiveTintColor, etc.
          tabBarActiveTintColor: '#00AAFF', 
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Map',
          }}
        />
        <Tabs.Screen
          name="posting"
          options={{
            title: 'Post',
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Notifications',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
          }}
        />
      </Tabs>
    </ProfileProvider>
  );
};
