import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SearchBar } from '@rneui/themed';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getDocs, collection } from 'firebase/firestore';
import { ConnectEvent, fromFirestoreDoc } from '@/components/models/ConnectEvent';
import { db } from '../../firebaseConfig';
import { captureException, logEvent } from '@/src/telemetry';

const connectEventsCollection = collection(db, 'connectEvents');

// Category icons
const interests: Record<string, { iconLibrary: string; iconName: string }> = {
  Fitness: { iconLibrary: 'Ionicons', iconName: 'fitness-outline' },
  Outdoors: { iconLibrary: 'Ionicons', iconName: 'leaf-outline' },
  Food: { iconLibrary: 'Ionicons', iconName: 'restaurant-menu' },
  Reading: { iconLibrary: 'Ionicons', iconName: 'book' },
  Technology: { iconLibrary: 'Ionicons', iconName: 'laptop' },
  Music: { iconLibrary: 'Ionicons', iconName: 'musical-notes-outline' },
};

export default function ExplorePage() {
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState<ConnectEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  // UI-only comments state keyed by event id (never mutate event objects)
  const [commentsByEvent, setCommentsByEvent] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const fetchEvents = async () => {
      const startTime = Date.now();
      try {
        const querySnapshot = await getDocs(connectEventsCollection);
        const eventsList: ConnectEvent[] = [];

        querySnapshot.docs.forEach((doc) => {
          const event = fromFirestoreDoc(doc.id, doc.data());
          if (event && event.title) {
            eventsList.push(event);
          }
        });

        setEvents(eventsList);
        logEvent('explore_fetch_success', {
          count: eventsList.length,
          latencyMs: Date.now() - startTime,
        });
      } catch (error) {
        captureException(error, { flow: 'explore_fetch', latencyMs: Date.now() - startTime });
      }
    };

    fetchEvents();
  }, []);

  const handleSearch = (text: string) => {
    setSearch(text);
  };

  const filteredEvents = events.filter((event) => {
    const searchTerm = search.toLowerCase();
    return (
      (event.title || '').toLowerCase().includes(searchTerm) ||
      (event.description || '').toLowerCase().includes(searchTerm) ||
      (event.location || '').toLowerCase().includes(searchTerm)
    );
  });

  const toggleEventExpansion = (eventId: string) => {
    setSelectedEventId((prev) => (prev === eventId ? null : eventId));
  };

  const handleAddComment = (eventId: string) => {
    if (!comment.trim()) return;

    setCommentsByEvent((prev) => ({
      ...prev,
      [eventId]: [...(prev[eventId] || []), `User: ${comment.trim()}`],
    }));
    setComment('');
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <ScrollView horizontal style={styles.categoryContainer}>
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

      <View style={{ flex: 1 }}>
        <Text style={styles.headers}>Events</Text>
        <ScrollView>
          {filteredEvents.map((event) => {
            const isSelected = selectedEventId === event.id;
            const eventComments = commentsByEvent[event.id] || [];

            return (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventsBox, isSelected && styles.expandedEventBox]}
                onPress={() => toggleEventExpansion(event.id)}
              >
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text>{event.description}</Text>
                <Text>{event.location || 'Location not available'}</Text>
                {event.startAt && (
                  <Text style={styles.eventDate}>
                    {formatDate(event.startAt)}
                    {event.endAt ? ` — ${formatDate(event.endAt)}` : ''}
                  </Text>
                )}
                {event.category ? (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{event.category}</Text>
                  </View>
                ) : null}

                {isSelected && (
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
                        onPress={() => handleAddComment(event.id)}
                        style={styles.arrowButton}
                      >
                        <Ionicons name="arrow-forward-circle" size={32} color="#fff" />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.attendButton}>
                      <Text style={styles.attendButtonText}>Attend Activity</Text>
                    </TouchableOpacity>
                    <Text style={{ marginTop: 10, fontSize: 15, fontWeight: '600' }}>
                      Comments
                    </Text>
                    <View style={styles.commentList}>
                      {eventComments.map((c, idx) => (
                        <Text key={idx} style={styles.commentText}>
                          {c}
                        </Text>
                      ))}
                      {eventComments.length === 0 && (
                        <Text style={styles.commentText}>No comments yet</Text>
                      )}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          {filteredEvents.length === 0 && (
            <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>
              No events found
            </Text>
          )}
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
    minHeight: 300,
  },
  eventTitle: {
    fontSize: 24,
  },
  eventDate: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  categoryBadge: {
    backgroundColor: '#866FD8',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 12,
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
