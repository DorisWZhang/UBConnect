"use client";

import { Text } from 'react-native';
import React, { useEffect, useState } from 'react';
import { Link, useRouter } from 'expo-router';;
import { AdvancedMarker, APIProvider, InfoWindow, Map, Pin, useMap } from '@vis.gl/react-google-maps';
import { db } from '../../firebaseConfig.js';
import ConnectEventClass from '@/components/models/ConnectEvent';
import { getDocs, collection } from 'firebase/firestore';
import type { Marker } from '@googlemaps/markerclusterer';

const connectEventsCollection = collection(db, 'connectEvents');

export default function MapPage() {

  const position = { lat: 49.2606, lng: -123.2460 }; 
  const [events, setEvents] = useState<ConnectEventClass[]>([]);

  useEffect(() => {
    // Function to fetch events from Firestore
    const fetchEvents = async () => {
      try {
        const querySnapshot = await getDocs(connectEventsCollection);
        const eventsList = querySnapshot.docs.map((doc) => {
          const eventData = doc.data();
          return new ConnectEventClass(
            eventData.title,
            eventData.description,
            eventData.location,
            eventData.notes,
            eventData.dateTime.toDate() // Convert Firestore timestamp to JavaScript Date
          );
        });
        setEvents(eventsList);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, []); // Empty array ensures this runs only once when the component mounts

  return (
    <APIProvider apiKey='AIzaSyAyZ8Q7D-1RDQGbjRZxIApOAND_9ovuKhA'>
      <div style={{ height: '100vh' }}>
        <Map defaultZoom={13} center={ position } mapId={ '5616403b42848ff7' }>
          <Markers points={events} />
        </Map>
      </div>
      </APIProvider>
  );
}

  type Point = google.maps.LatLngLiteral & { key: string };
  type Props = { points: Point[] };

  const Markers = ({points}: Props) => {
    const map = useMap();
    const [markers, setMarkers] = useState<{[key: string]: Marker}>([]);
    // const clusterer = useRef<MarkerClusterer | null>(null);

    return (
      <>
      {points.map((point) => (
        <AdvancedMarker position={{ lat: 49.2606, lng: -123.2460 }}>
          <span style={{fontSize: "2rem"}}>📍</span>
          <AdvancedMarker position={{lat: 49.266562, lng: -123.250062}}>
          <span style={{fontSize: "2rem"}}>📍</span>
          <AdvancedMarker position={{lat: 49.264312, lng: -123.255938}}>
          <span style={{fontSize: "2rem"}}>📍</span>
        </AdvancedMarker>
        </AdvancedMarker>
        </AdvancedMarker>))}
      </>
    )
  };

