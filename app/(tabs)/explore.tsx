import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SearchBar } from '@rneui/themed';
import React, { useState, useEffect } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import interests from "../../assets/Interests";
import { getDocs, collection } from 'firebase/firestore';
import ConnectEventClass from '@/components/models/ConnectEvent';
import { db } from '../../firebaseConfig.js';  // Import the firestore db reference

// Reference to the 'connectEvents' collection
const connectEventsCollection = collection(db, 'connectEvents');

export default function ExplorePage() {
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState<ConnectEventClass[]>([]); // State to store events data as ConnectEventClass instances

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

  // Function to handle search input changes
  const handleSearch = (text) => {
    setSearch(text);
  };

  // Filter events based on search input
  const filteredEvents = events.filter((event) => {
    const searchTerm = search.toLowerCase();
    return (
      event.title.toLowerCase().includes(searchTerm) ||
      event.description.toLowerCase().includes(searchTerm) ||
      event.location.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <View style={styles.mainContainer}>
      <View style={styles.topContainer}>
        <SearchBar
          value={search}
          onChangeText={handleSearch}
          containerStyle={{
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            borderBottomWidth: 0,
            padding: 0,
            width: '100%',
            maxWidth: 350,
            alignSelf: 'center',
          }}
          inputContainerStyle={{
            backgroundColor: '#EAEAEA',
            borderRadius: 20,
            height: 50,
            paddingHorizontal: 10,
          }}
          inputStyle={{
            color: 'black',
            fontSize: 16,
          }}
        />
      </View>

      <View>
        <Text style={styles.headers}>Categories</Text>
        <ScrollView horizontal={true}>
          {Object.entries(interests).map(([key, description]) => (
            <View key={key} style={styles.interestsBox}>
              <Text style={styles.title}>{key}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View>
        <Text style={styles.headers}>Events</Text>
        <ScrollView horizontal={false}>
          {filteredEvents.map((event, index) => (
            <TouchableOpacity
              key={index}
              style={styles.eventsBox}
              onPress={() => {
                // Handle event selection
                console.log(`Selected event: ${event.title}`);
              }}
            >
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text>{event.description}</Text>
              <Text>{event.location || 'Location not available'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  topContainer: {
    marginTop: 70,
    width: '100%',
    alignItems: 'center',
  },
  headers: {
    fontSize: 20,
    fontWeight: '600',
    paddingVertical: 10,
  },
  interestsBox: {
    backgroundColor: '#EAEAEA',
    borderRadius: 10,
    marginBottom: 10,
    padding: 15,
    marginRight: 10,
    borderColor: 'black',
  },
  eventsBox: {
    backgroundColor: '#EAEAEA',
    borderRadius: 10,
    marginBottom: 10,
    width: '95%',
    height: 125,
    padding: 15,
    marginRight: 10,
    borderColor: 'black',
  },
  eventTitle: {
    fontSize: 24,
  }
});
