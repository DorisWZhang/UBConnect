// app/(tabs)/posting.tsx — Create event with location input and categories
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

// Conditionally import DateTimePicker to avoid Web crashes
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth/AuthContext';
import { useProfile } from '@/app/ProfileContext';
import { validateEvent } from '@/components/models/ConnectEvent';
import { createEvent, isPermissionDenied } from '@/src/services/social';
import { logEvent } from '@/src/telemetry';

const CATEGORIES = [
  'Sports', 'Esports', 'Music', 'Arts', 'Food',
  'Academic', 'Social', 'Volunteering', 'Outdoors', 'Fitness',
];

const VISIBILITY_OPTIONS = ['public', 'friends'] as const;

export default function PostingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { name } = useProfile();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends'>('public');
  const [locationName, setLocationName] = useState('');
  const [capacity, setCapacity] = useState('');

  // Date/Time
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000)); // +2h
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !user.emailVerified) {
      Alert.alert('Verify Email', 'You must verify your email before posting.');
      return;
    }

    // Validate
    const validation = validateEvent({
      title,
      description,
      locationName,
      capacity: capacity ? Number(capacity) : null,
      startTime: startDate,
      endTime: endDate,
    });
    if (!validation.valid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }
    if (!categoryId) {
      Alert.alert('Category Required', 'Please select a category for your event.');
      return;
    }

    setSubmitting(true);
    try {
      const eventId = await createEvent({
        title: title.trim(),
        description: description.trim(),
        categoryId,
        visibility,
        locationName: locationName.trim(),
        placeId: '', // no Google Places integration yet
        locationGeo: null, // will be populated when Places API is added
        startTime: startDate,
        endTime: endDate,
        capacity: capacity ? Number(capacity) : null,
        createdBy: user.uid,
        createdByName: name,
      });

      await logEvent('event_created', { eventId, categoryId });
      Alert.alert('Success!', 'Your event has been posted.', [
        { text: 'View Event', onPress: () => router.push(`/event/${eventId}`) },
        { text: 'OK', onPress: () => router.push('/(tabs)/explore') },
      ]);

      // Reset form
      setTitle('');
      setDescription('');
      setCategoryId('');
      setLocationName('');
      setCapacity('');
    } catch (err) {
      if (isPermissionDenied(err)) {
        Alert.alert('Permission Denied', 'Please verify your email to post events.');
      } else {
        Alert.alert('Error', 'Failed to create event. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>Create Event</Text>

      {/* Title */}
      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="What's happening?"
        maxLength={80}
        placeholderTextColor="#aaa"
      />
      <Text style={styles.charCount}>{title.length}/80</Text>

      {/* Description */}
      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Tell people about your event..."
        multiline
        maxLength={2000}
        placeholderTextColor="#aaa"
      />
      <Text style={styles.charCount}>{description.length}/2000</Text>

      {/* Category */}
      <Text style={styles.label}>Category *</Text>
      <View style={styles.chipsRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.catChip, categoryId === cat && styles.catChipActive]}
            onPress={() => setCategoryId(cat)}
          >
            <Text style={[styles.catChipText, categoryId === cat && styles.catChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Visibility */}
      <Text style={styles.label}>Visibility</Text>
      <View style={styles.visRow}>
        {VISIBILITY_OPTIONS.map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.visChip, visibility === v && styles.visChipActive]}
            onPress={() => setVisibility(v)}
          >
            <Ionicons
              name={v === 'public' ? 'globe-outline' : 'lock-closed-outline'}
              size={16}
              color={visibility === v ? '#fff' : '#666'}
            />
            <Text style={[styles.visText, visibility === v && styles.visTextActive]}>
              {v === 'public' ? 'Public' : 'Friends Only'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Location */}
      <Text style={styles.label}>Location</Text>
      <TextInput
        style={styles.input}
        value={locationName}
        onChangeText={setLocationName}
        placeholder="Where is this event?"
        maxLength={120}
        placeholderTextColor="#aaa"
      />

      {/* Start / End Time */}
      <Text style={styles.label}>Start Time</Text>
      {Platform.OS === 'web' ? (
        React.createElement('input', {
          type: 'datetime-local',
          value: new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
          onChange: (e: any) => setStartDate(new Date(e.target.value)),
          style: {
            padding: '12px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: '#f5f5f5',
            fontSize: '15px',
            color: '#333',
            fontFamily: 'inherit',
            width: '100%',
            boxSizing: 'border-box',
          },
        })
      ) : (
        <>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(!showStartPicker)}>
            <Ionicons name="time-outline" size={18} color="#666" />
            <Text style={styles.dateText}>{formatDate(startDate)}</Text>
          </TouchableOpacity>
          {showStartPicker && DateTimePicker && (
            <DateTimePicker
              value={startDate}
              mode="datetime"
              onChange={(e: any, d: any) => {
                setShowStartPicker(Platform.OS === 'ios');
                if (d) setStartDate(d);
              }}
            />
          )}
        </>
      )}

      <Text style={styles.label}>End Time</Text>
      {Platform.OS === 'web' ? (
        React.createElement('input', {
          type: 'datetime-local',
          value: new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
          onChange: (e: any) => setEndDate(new Date(e.target.value)),
          style: {
            padding: '12px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: '#f5f5f5',
            fontSize: '15px',
            color: '#333',
            fontFamily: 'inherit',
            width: '100%',
            boxSizing: 'border-box',
          },
        })
      ) : (
        <>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(!showEndPicker)}>
            <Ionicons name="time-outline" size={18} color="#666" />
            <Text style={styles.dateText}>{formatDate(endDate)}</Text>
          </TouchableOpacity>
          {showEndPicker && DateTimePicker && (
            <DateTimePicker
              value={endDate}
              mode="datetime"
              onChange={(e: any, d: any) => {
                setShowEndPicker(Platform.OS === 'ios');
                if (d) setEndDate(d);
              }}
            />
          )}
        </>
      )}

      {/* Capacity */}
      <Text style={styles.label}>Capacity (optional)</Text>
      <TextInput
        style={styles.input}
        value={capacity}
        onChangeText={setCapacity}
        placeholder="Max attendees"
        keyboardType="numeric"
        placeholderTextColor="#aaa"
      />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Post Event</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#f5f5f5', borderRadius: 10, padding: 12,
    fontSize: 15, color: '#333',
  },
  charCount: { fontSize: 11, color: '#999', textAlign: 'right', marginTop: 2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  catChip: {
    backgroundColor: '#f0f0f0', borderRadius: 16, paddingHorizontal: 12,
    paddingVertical: 6, marginRight: 8, marginBottom: 8,
  },
  catChipActive: { backgroundColor: '#866FD8' },
  catChipText: { fontSize: 13, color: '#666' },
  catChipTextActive: { color: '#fff', fontWeight: '600' },
  visRow: { flexDirection: 'row', gap: 10 },
  visChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#ddd',
  },
  visChipActive: { backgroundColor: '#866FD8', borderColor: '#866FD8' },
  visText: { marginLeft: 6, fontSize: 14, color: '#666' },
  visTextActive: { color: '#fff', fontWeight: '600' },
  dateButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5',
    borderRadius: 10, padding: 12,
  },
  dateText: { fontSize: 15, color: '#333', marginLeft: 8 },
  submitBtn: {
    backgroundColor: '#866FD8', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 24,
  },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
