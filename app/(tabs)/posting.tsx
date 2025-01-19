import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select'; // Importing the picker select
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../../firebaseConfig.js';
import { addDoc } from 'firebase/firestore';  // Import these functions



export default function PostingPage() {
  const [eventName, setEventName] = useState('');
  const [startDateTime, setStartDateTime] = useState(null); // null by default
  const [endDateTime, setEndDateTime] = useState(null); // null by default
  const [pickerConfig, setPickerConfig] = useState({
    show: false,
    mode: 'datetime', // 'datetime' picker for both date and time
    type: '', // 'startDateTime' or 'endDateTime'
  });
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState(''); // Set default to 'Public'
  const [capacity, setCapacity] = useState(''); // Capacity state
  const [category, setCategory] = useState(''); // Category state
  

  const formatDateTime = (date) => {
    if (!date) return ''; // If no date is selected, return an empty string
    return `${date.toLocaleDateString('en-US')} ${date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  const handlePickerPress = (type) => {
    setPickerConfig({ show: true, type });
  };

  const handlePickerChange = (event, selectedDate) => {
    if (event.type === 'set') {
      const currentDate = selectedDate || new Date();
      if (pickerConfig.type === 'startDateTime') setStartDateTime(currentDate);
      if (pickerConfig.type === 'endDateTime') setEndDateTime(currentDate);
    }
    setPickerConfig({ ...pickerConfig, show: false });
  };

  const handleSubmit = async () => {
    // Format the date and time
   
    
    // Combine the start and end dateTime into a single "dateTime" field or store them separately
    
  
    // Collect the data (excluding visibility, capacity, and category)
    const eventData = {
      title: eventName, // Store event name as 'title'
      description, // Store description
      location, // Store location
       // Store combined dateTime range
    };
  
    try {
      // Use addDoc() with the collection and eventData
      await addDoc(collection(db, 'connectEvents'), eventData);
  
      // Log the event data for testing
      console.log('Event Data Submitted:', eventData);
  
      // Optionally, reset the form after successful submission
      setEventName('');
      setStartDateTime(null);
      setEndDateTime(null);
      setLocation('');
      setDescription('');
  
      // You can show a success message here, or navigate to another screen if needed
    } catch (error) {
      console.error('Error adding event to Firestore: ', error);
      // Optionally, handle errors by showing an error message to the user
    }
  };
  

  return (
    <View style={styles.mainContainer}>
      <Text style={[styles.title, {fontWeight: 600, marginTop: 100}]}>Create Event</Text>
      <TextInput
        style={styles.input}
        placeholder="Event Name"
        placeholderTextColor="#aaa"
        value={eventName}
        onChangeText={setEventName}
      />

      {/* Start Date and Time */}
      <View>
        <TouchableOpacity onPress={() => handlePickerPress('startDateTime')}>
          <TextInput
            style={[styles.input, { color: startDateTime ? '#333' : '#aaa' }]} // Adjust text color based on selection
            value={startDateTime ? formatDateTime(startDateTime) : 'Select Start Date & Time'}
            editable={false}
            placeholder="Select Start Date & Time"
            placeholderTextColor="#aaa"
          />
        </TouchableOpacity>
      </View>

      {/* End Date and Time */}
      <View>
        <TouchableOpacity onPress={() => handlePickerPress('endDateTime')}>
          <TextInput
            style={[styles.input, { color: endDateTime ? '#333' : '#aaa' }]} // Adjust text color based on selection
            value={endDateTime ? formatDateTime(endDateTime) : 'Select End Date & Time'}
            editable={false}
            placeholder="Select End Date & Time"
            placeholderTextColor="#aaa"
          />
        </TouchableOpacity>
      </View>

      {/* DateTime Picker */}
      {pickerConfig.show && (
        <DateTimePicker
          mode="datetime"
          value={pickerConfig.type === 'startDateTime' ? startDateTime || new Date() : endDateTime || new Date()}
          display="spinner"
          onChange={handlePickerChange}
          textColor="black" // Ensures black text
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
          placeholder={{
            label: 'Select Visibility',
            value: '',
          }}
          value={visibility}
          onValueChange={(value) => setVisibility(value)}
          items={[
            { label: 'Public', value: 'Public' },
            { label: 'Friends Only', value: 'Friends Only' },
          ]}
          style={{
            inputAndroid: styles.input, // Style for Android
            inputIOS: styles.input, // Style for iOS
            placeholder: {
              color: '#aaa', // Set placeholder color to match other inputs
            },
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
          placeholder={{
            label: 'Select Category',
            value: '',
          }}
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
            inputAndroid: styles.input, // Style for Android
            inputIOS: styles.input, // Style for iOS
            placeholder: {
              color: '#aaa', // Set placeholder color to match other inputs
            },
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
    color: '#333', // Default text color for inputs
  },
  button: {
    backgroundColor: '#866FD8', // Blue background color
    paddingVertical: 12,
    borderRadius: 25, // Rounded corners
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff', // White text color
    fontSize: 16,
    fontWeight: 'bold',
  },
});
