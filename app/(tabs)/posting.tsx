import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import React, { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '@/src/auth/AuthContext';
import { validateEvent } from '@/components/models/ConnectEvent';
import { captureException, logEvent } from '@/src/telemetry';

export default function PostingPage() {
  const { user } = useAuth();

  const [eventName, setEventName] = useState('');
  const [startDateTime, setStartDateTime] = useState<Date | null>(null);
  const [endDateTime, setEndDateTime] = useState<Date | null>(null);
  const [pickerConfig, setPickerConfig] = useState({
    show: false,
    mode: 'datetime' as const,
    type: '' as 'startDateTime' | 'endDateTime' | '',
  });
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends'>('public');
  const [capacity, setCapacity] = useState('');
  const [category, setCategory] = useState('');

  const formatDateTime = (date: Date | null) => {
    if (!date) return '';
    return `${date.toLocaleDateString('en-US')} ${date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  const handlePickerPress = (type: 'startDateTime' | 'endDateTime') => {
    setPickerConfig({ show: true, mode: 'datetime', type });
  };

  const handlePickerChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate) {
      if (pickerConfig.type === 'startDateTime') setStartDateTime(selectedDate);
      if (pickerConfig.type === 'endDateTime') setEndDateTime(selectedDate);
    }
    setPickerConfig({ ...pickerConfig, show: false });
  };

  const handleSubmit = async () => {
    // Build the event data object matching our schema
    const eventData = {
      title: eventName.trim(),
      description: description.trim(),
      location: location.trim(),
      category: category || '',
      visibility: visibility || 'public',
      capacity: capacity ? parseInt(capacity, 10) : null,
      startAt: startDateTime,
      endAt: endDateTime,
      createdBy: user?.uid ?? 'anonymous',
    };

    // Validate before writing
    const validation = validateEvent(eventData);
    if (!validation.valid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    // Gate posting behind email verification
    if (user && !user.emailVerified) {
      Alert.alert(
        'Email Not Verified',
        'Please verify your UBC email before posting events. Check your inbox for the verification link.',
      );
      return;
    }

    const startTime = Date.now();
    try {
      await addDoc(collection(db, 'connectEvents'), {
        ...eventData,
        createdAt: serverTimestamp(),
      });

      logEvent('posting_success', { latencyMs: Date.now() - startTime });

      // Reset form
      setEventName('');
      setStartDateTime(null);
      setEndDateTime(null);
      setLocation('');
      setDescription('');
      setVisibility('public');
      setCapacity('');
      setCategory('');

      Alert.alert('Success', 'Event created!');
    } catch (error) {
      captureException(error, { flow: 'posting', latencyMs: Date.now() - startTime });
      Alert.alert('Error', 'Failed to create event. Please try again.');
    }
  };

  return (
    <View style={styles.mainContainer}>
      <Text style={[styles.title, { fontWeight: '600', marginTop: 100 }]}>Create Event</Text>
      <TextInput
        style={styles.input}
        placeholder="Event Name"
        placeholderTextColor="#aaa"
        value={eventName}
        onChangeText={setEventName}
      />

      {/* Start Date and Time */}
      <TouchableOpacity onPress={() => handlePickerPress('startDateTime')}>
        <TextInput
          style={[styles.input, { color: startDateTime ? '#333' : '#aaa' }]}
          value={startDateTime ? formatDateTime(startDateTime) : 'Select Start Date & Time'}
          editable={false}
          placeholder="Select Start Date & Time"
          placeholderTextColor="#aaa"
        />
      </TouchableOpacity>

      {/* End Date and Time */}
      <TouchableOpacity onPress={() => handlePickerPress('endDateTime')}>
        <TextInput
          style={[styles.input, { color: endDateTime ? '#333' : '#aaa' }]}
          value={endDateTime ? formatDateTime(endDateTime) : 'Select End Date & Time'}
          editable={false}
          placeholder="Select End Date & Time"
          placeholderTextColor="#aaa"
        />
      </TouchableOpacity>

      {/* DateTime Picker */}
      {pickerConfig.show && (
        <DateTimePicker
          mode="datetime"
          value={
            pickerConfig.type === 'startDateTime'
              ? startDateTime || new Date()
              : endDateTime || new Date()
          }
          display="spinner"
          onChange={handlePickerChange}
          textColor="black"
        />
      )}

      {/* Location */}
      <TextInput
        style={styles.input}
        placeholder="Location"
        placeholderTextColor="#aaa"
        value={location}
        onChangeText={setLocation}
      />

      {/* Description */}
      <TextInput
        style={styles.input}
        placeholder="Description"
        placeholderTextColor="#aaa"
        value={description}
        onChangeText={setDescription}
      />

      <View>
        <Text style={styles.title}>Options</Text>

        <RNPickerSelect
          placeholder={{ label: 'Select Visibility', value: '' }}
          value={visibility}
          onValueChange={(value) => setVisibility(value || 'public')}
          items={[
            { label: 'Public', value: 'public' },
            { label: 'Friends Only', value: 'friends' },
          ]}
          style={{
            inputAndroid: styles.input,
            inputIOS: styles.input,
            placeholder: { color: '#aaa' },
          }}
        />

        {/* Capacity */}
        <TextInput
          style={styles.input}
          placeholder="Capacity (Number of People)"
          placeholderTextColor="#aaa"
          value={capacity}
          keyboardType="numeric"
          onChangeText={setCapacity}
        />

        {/* Category */}
        <RNPickerSelect
          placeholder={{ label: 'Select Category', value: '' }}
          value={category}
          onValueChange={(value) => setCategory(value)}
          items={[
            { label: 'Fitness', value: 'Fitness' },
            { label: 'Outdoors', value: 'Outdoors' },
            { label: 'Food', value: 'Food' },
            { label: 'Artsy', value: 'Artsy' },
            { label: 'Music', value: 'Music' },
            { label: 'Gaming', value: 'Gaming' },
            { label: 'Technology', value: 'Technology' },
          ]}
          style={{
            inputAndroid: styles.input,
            inputIOS: styles.input,
            placeholder: { color: '#aaa' },
          }}
        />
      </View>

      {/* Create Event Button */}
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Create Event</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    paddingLeft: 8,
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  button: {
    backgroundColor: '#866FD8',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
