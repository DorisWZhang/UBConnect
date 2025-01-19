import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { SearchBar } from '@rneui/themed';
import React, { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import interests from "../../assets/Interests"

export default function ExplorePage() {

  const [search, setSearch] = useState('');
  const data = interests.food;

  return (
    <View style={styles.mainContainer}>
      
      <View style={styles.topContainer}>
      <SearchBar
        value={search}
        onChangeText={(text) => setSearch(text)}

        containerStyle={{
          backgroundColor: 'transparent', // Transparent to avoid any extra background
          borderTopWidth: 0, // Remove top border
          borderBottomWidth: 0, // Remove bottom border
          padding: 0,
          width: '100%', // Full width of the screen
          maxWidth: 350, // Limit max width for large screens
          alignSelf: 'center', // Center horizontally
        }}
        inputContainerStyle={{
          backgroundColor: '#EAEAEA', // Light gray background for the input
          borderRadius: 20, // Rounded corners
          height: 50, // Adjust height if needed
          paddingHorizontal: 10, // Add padding inside the input
        }}
        inputStyle={{
          color: 'black', // Ensure text is visible
          fontSize: 16, // Adjust text size if needed
        }}
      />

      </View>

      <View>
        <Text style = {styles.headers}>Categories</Text>
        <ScrollView horizontal={true}>
        {Object.entries(interests).map(([key, description]) => (
            <View key={key} style={styles.interestsBox}>
              <Text style={styles.title}>{key}</Text>
            </View>
          ))}
      
        </ScrollView>
      </View>

      <View> 
        <Text style = {styles.headers}>Events</Text>
        <ScrollView>

        </ScrollView>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,  // Take up the full screen height
    backgroundColor: 'white',
    paddingHorizontal: 20,  // Optional: Add padding to avoid content touching the edges
  },
  title: {
    fontSize: 24,
    marginBottom: 20,  // Optional: space between title and search bar
  },
  topContainer: {
    marginTop: 70,  // Set vertical spacing from the top
    width: '100%',  // Make sure the container takes full width
    alignItems: 'center',  // Center the search bar horizontally
  },
  headers: {
    fontSize: 20,
    fontWeight: 600,
    paddingVertical: 10,
  },
  interestsBox: {
    backgroundColor: '#EAEAEA',
    borderRadius: 10,
    marginBottom: 10,
    padding: 15,
    marginRight: 10,
  },
  eventsBox: {

  }
});

