import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SearchBar } from '@rneui/themed';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getDocs, collection } from 'firebase/firestore';
import ConnectEventClass from '@/components/models/ConnectEvent';
import { db } from '../../firebaseConfig.js';

// Reference to the 'connectEvents' collection
const connectEventsCollection = collection(db, 'connectEvents');


// Updated interests object with icon details
const interests = {
  Fitness: { iconLibrary: 'Ionicons', iconName: 'fitness-outline' },
  Outdoors: { iconLibrary: 'Ionicons', iconName: 'leaf-outline' },
  Food: { iconLibrary: 'MaterialIcons', iconName: 'restaurant-menu' },
  Reading: { iconLibrary: 'FontAwesome', iconName: 'book' },
  Technology: { iconLibrary: 'FontAwesome', iconName: 'laptop' },
  Music: { iconLibrary: 'Ionicons', iconName: 'musical-notes-outline' },
};

export default function ExplorePage() {
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState<ConnectEventClass[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ConnectEventClass | null>(null); // State to track the selected event
  const [comment, setComment] = useState(''); // State to handle comments input

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const querySnapshot = await getDocs(connectEventsCollection);
        const eventsList = querySnapshot.docs.map((doc) => {
          const eventData = doc.data();
    
          // Check if the event has a valid date
          //const eventDate = eventData.dateTime ? eventData.dateTime.toDate() : null;
    
          // Only return events with a valid date
         
          return new ConnectEventClass(
              eventData.title,
              eventData.description,
              eventData.location,
              eventData.notes,
             
          );
          
          return null; // Ignore events without a date
        }).filter(event => event !== null); // Filter out null events
    
        setEvents(eventsList);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };
    

    fetchEvents();
  }, []);

  const handleSearch = (text) => {
    setSearch(text);
  };

  const filteredEvents = events.filter((event) => {
    const searchTerm = search.toLowerCase();
    return (
      event.title.toLowerCase().includes(searchTerm) ||
      event.description.toLowerCase().includes(searchTerm) ||
      event.location.toLowerCase().includes(searchTerm)
    );
  });

  const toggleEventExpansion = (event) => {
    setSelectedEvent((prev) => (prev === event ? null : event));
  };

  const handleAttend = (event) => {
    console.log(`Attending event: ${event.title}`);
    console.log(`Comment: ${comment}`);

    // Add the comment to the event's comments array
    event.comments = event.comments || []; // Initialize comments if not already done
    event.comments.push(`John Doe: ${comment}`); // Format the comment with the user's name

    // Update the state with the modified event list
    setEvents([...events]);

    // Reset comment input
    setComment('');
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.topContainer}>
        <SearchBar
          value={search}
          onChangeText={handleSearch}
          containerStyle={styles.searchBarContainer}
          inputContainerStyle={styles.searchBarInputContainer}
          inputStyle={styles.searchBarInput}
        />
      </View>

      <View>
        <Text style={styles.headers}>Categories</Text>
        <ScrollView horizontal={true} style={styles.categoryContainer}>
          {Object.entries(interests).map(([key, { iconLibrary, iconName }]) => {
            const IconComponent = require('@expo/vector-icons')[iconLibrary];
            return (
              <View key={key} style={styles.interestsBox}>
                <IconComponent name={iconName} size={40} color="#866FD8" />
                <Text style={styles.iconLabel}>{key}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <View>
        <Text style={styles.headers}>Events</Text>
        <ScrollView horizontal={false}>
          {filteredEvents.map((event, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.eventsBox, selectedEvent === event && styles.expandedEventBox]}
              onPress={() => toggleEventExpansion(event)}
            >
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text>{event.description}</Text>
              <Text>{event.location || 'Location not available'}</Text>

              {selectedEvent === event && (
                <View style={styles.expandedContent}>
                  <View style={styles.commentContainer}>
                    <TextInput
                      style={styles.commentInput}
                      value={comment}
                      placeholder="Add a comment"
                      placeholderTextColor="#aaa"
                      onChangeText={setComment}
                    />
                    <TouchableOpacity
                      onPress={() => handleAttend(event)}
                      style={styles.arrowButton}
                    >
                      <Ionicons name="arrow-forward-circle" size={32} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleAttend(event)}
                    style={styles.attendButton}
                  >
                    <Text style={styles.attendButtonText}>Attend Activity</Text>
                  </TouchableOpacity>
                  <Text style={{ marginTop: 10, fontSize: 15, fontWeight: 600 }}>Comments</Text>
                  {/* Displaying the comments */}
                  <View style={styles.commentList}>
                    {event.comments && event.comments.map((comment, idx) => (
                      <Text key={idx} style={styles.commentText}>
                        {comment}
                      </Text>
                    ))}
                  </View>
                </View>
              )}
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
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  interestsBox: {
    backgroundColor: '#EAEAEA',
    borderRadius: 10,
    marginBottom: 10,
    padding: 15,
    marginRight: 10,
    alignItems: 'center',
  },
  iconLabel: {
    marginTop: 5,
    fontSize: 14,
    textAlign: 'center',
    color: '#000',
  },
  eventsBox: {
    backgroundColor: '#EAEAEA',
    borderRadius: 10,
    marginBottom: 10,
    width: '95%',
    padding: 15,
    marginRight: 10,
    borderColor: 'black',
  },
  expandedEventBox: {
    height: 300, // Increased height for expanded cards to accommodate comments
  },
  eventTitle: {
    fontSize: 24,
  },
  expandedContent: {
    marginTop: 10,
  },
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  arrowButton: {
    marginLeft: 10,
    backgroundColor: '#866FD8',
    borderRadius: 10,
    padding: 10,
  },
  attendButton: {
    backgroundColor: '#866FD8',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  attendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchBarContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
    padding: 0,
    width: '100%',
    maxWidth: 350,
    alignSelf: 'center',
  },
  searchBarInputContainer: {
    backgroundColor: '#EAEAEA',
    borderRadius: 20,
    height: 50,
    paddingHorizontal: 10,
  },
  searchBarInput: {
    color: 'black',
    fontSize: 16,
  },
  commentList: {
    marginTop: 10,
  },
  commentText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
});
