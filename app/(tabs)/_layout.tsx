import { Tabs } from "expo-router"
//import Ionicons from 'react-native-vector-icons/Ionicons';
import React from 'react';


export default () => {
    return(
        <Tabs screenOptions={{
            headerShown: false, // Hide the header on all screens
          }}>
            <Tabs.Screen 
                name='explore' 
                options={{ 
                    title: 'Explore',
                    
                }} 
            />
            <Tabs.Screen 
                name='profile' 
                options={{ 
                    title: 'Profile',
                    
                }}
            />
        </Tabs>
    )
}
