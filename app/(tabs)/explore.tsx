import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { SearchBar } from '@rneui/themed';
import React, { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import interests from "../../assets/Interests";
import eventsData from '../../assets/Events.json';

export default function ExplorePage() {

  const [search, setSearch] = useState('');

  return (
    <View style={styles.mainContainer}>
      
      <View style={styles.topContainer}>
        <SearchBar
          value={search}
          onChangeText={(text) => setSearch(text)}

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
          {eventsData.map((event, index) => (
            <View key={index} style={styles.eventsBox}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text>{event.description}</Text>
              <Text>{event.location}</Text>
              
            
            </View>
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
