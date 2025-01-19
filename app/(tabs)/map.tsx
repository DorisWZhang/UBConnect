"use client";

import { Text } from 'react-native';
import { Link, useRouter } from 'expo-router';;
import React, {useState} from 'react';
import { AdvancedMarker, APIProvider, InfoWindow, Map, Pin } from '@vis.gl/react-google-maps';

export default function MapPage() {

  const position = { lat: 49.2606, lng: -123.2460 }; 
  const [open, setOpen] = useState(false);

  return (
    <APIProvider apiKey='AIzaSyAyZ8Q7D-1RDQGbjRZxIApOAND_9ovuKhA'>
      <div style={{ height: '100vh' }}>
        <Map zoom={13} center={ position } mapId={ '5616403b42848ff7' }>
          
        </Map>
      </div>
      </APIProvider>
  );
}