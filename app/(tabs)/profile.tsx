import React from 'react';
import { StyleSheet, Image, View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useProfile } from '../ProfileContext'; // Use your ProfileContext

export default function ProfilePage() {
  const router = useRouter();

  // Grab profile info from context
  const { name, interests } = useProfile();

  // Example data for friends
  const friendsList = [
    { id: 1, name: 'Alice', avatar: 'https://i.imgur.com/xT3UJDj.png' },
    { id: 2, name: 'Bob', avatar: 'https://i.imgur.com/YUOiaWs.png' },
    { id: 3, name: 'Charlie', avatar: 'https://i.imgur.com/eSLPLrZ.png' },
    { id: 4, name: 'Diana', avatar: 'https://i.imgur.com/xT3UJDj.png' },
    { id: 5, name: 'Eve', avatar: 'https://i.imgur.com/Gef8swX.png' },
    { id: 6, name: 'Frank', avatar: 'https://i.imgur.com/YUOiaWs.png' },
    { id: 7, name: 'Grace', avatar: 'https://i.imgur.com/gUb6CDD.png' },
  ];

  // Example data for user events
  const userEvents = [
    {
      id: 1,
      title: 'Saturday BBQ',
      description: 'Meet at the local park with friends and family!',
      date: 'Jan 20, 1 PM',
      type: 'hosting',
    },
    {
      id: 2,
      title: 'Charity Fun Run',
      description: 'Join the 5K run for a good cause.',
      date: 'Jan 25, 9 AM',
      type: 'attending',
    },
    {
      id: 3,
      title: 'Music Jam Session',
      description: 'Bring your instruments! All are welcome.',
      date: 'Feb 2, 7 PM',
      type: 'hosting',
    },
  ];

  // Handlers
  const handleEditProfile = () => {
    router.push('../edit-profile');
  };

  const handleLogout = () => {
    console.log('User logged out');
    router.replace('/landing');
  };

  return ( 
    <ThemedView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://i.imgur.com/4OLE27o.png' }}
          style={styles.profileImage}
        />
        {/* Pencil + Name */}
        <View style={styles.nameWrapper}>
          <ThemedText style={styles.name} type="title">
            {name}
          </ThemedText>
          <TouchableOpacity onPress={handleEditProfile}>
            <ThemedText style={styles.pencilIcon}>🖊️</ThemedText>
          </TouchableOpacity>
        </View>

        <ThemedText style={styles.email} type="subtitle">
          johndoe@student.ubc.ca
        </ThemedText>
      </View>

      {/* Content Section */}
      <ScrollView style={styles.contentSection}>
        {/* Friends Section */}
        <View style={[styles.section, styles.friendsSection]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText style={styles.sectionTitle} type="title">
              Friends
            </ThemedText>
          </View>
          <View style={styles.friendsRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.friendsContainer}
            >
              {friendsList.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={styles.friendItem}
                  onPress={() => router.push(`/friends/${friend.id}`)}
                >
                  <Image
                    source={{ uri: friend.avatar }}
                    style={styles.friendAvatar}
                  />
                </TouchableOpacity>
              ))}
              {/* "..." bubble at the end */}
              <TouchableOpacity
                style={styles.moreBubble}
                onPress={() => router.push('/friends')}
              >
                <ThemedText style={styles.moreText}>...</ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>

        {/* Interests Section */}
        <View style={[styles.section, styles.interestsSection]}>
          <ThemedText style={styles.sectionTitle} type="title">
            Interests
          </ThemedText>
          <View style={styles.interestsContainer}>
            {interests.map((interest, index) => (
              <View key={index} style={styles.interestBubble}>
                <ThemedText style={styles.interestText}>{interest}</ThemedText>
              </View>
            ))}
            {/* Plus icon at the end */}
            <TouchableOpacity style={styles.interestPlus} onPress={handleEditProfile}>
              <ThemedText style={styles.plusText}>+</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Feed Section */}
        <View style={[styles.section, styles.feedSection]}>
          <ThemedText style={styles.sectionTitle} type="title">
            Feed
          </ThemedText>

          {/* If there are no events, show "Feed is empty :(" */}
          {userEvents.length === 0 ? (
            <ThemedText style={styles.sectionContent}>Feed is empty :(</ThemedText>
          ) : (
            userEvents.map((event) => (
              <View key={event.id} style={styles.eventContainer}>
                <ThemedText style={styles.eventTitle} type="subtitle">
                  {event.title}
                </ThemedText>
                <ThemedText style={styles.eventDescription}>
                  {event.description}
                </ThemedText>
                <ThemedText style={styles.eventDate}>
                  {event.date}
                </ThemedText>

                {/* Tag showing if "hosting" or "attending" */}
                <View
                  style={[styles.tag, event.type === 'hosting' ? styles.tagHosting : styles.tagAttending]}
                >
                  <ThemedText style={styles.tagText}>
                    {event.type.toUpperCase()}
                  </ThemedText>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Button Section - Log out button moved to the corner */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <ThemedText style={styles.buttonText}>Log Out</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    paddingTop: 70,
    backgroundColor: '#DAE2FF',
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 20 
  },
  profileImage: { 
    width: 150, 
    height: 150, 
    borderRadius: 75, 
    marginBottom: 10 
  },
  nameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  pencilIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  name: { 
    fontSize: 24, 
    fontWeight: 'bold',
    color: '#333'
  },
  email: { 
    fontSize: 16,
    color: '#333'
  },
  contentSection: { 
    flex: 1 
  },
  section: { 
    marginBottom: 20
  },
  friendsSection: {
    backgroundColor: '#E8F4FF',
    borderRadius: 8,
    padding: 12,
  },
  interestsSection: {
    backgroundColor: '#FFF4E8',
    borderRadius: 8,
    padding: 12,
  },
  feedSection: {
    backgroundColor: '#F2E8FF',
    borderRadius: 8,
    padding: 12,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 10, 
    color: '#333'
  },
  sectionContent: { 
    fontSize: 16 
  },
  friendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendsContainer: { 
    paddingRight: 10,
    alignItems: 'center',
  },
  friendItem: { 
    marginRight: 10 
  },
  friendAvatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25 
  },
  moreBubble: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  moreText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  interestBubble: {
    backgroundColor: '#E0E0E0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    fontSize: 14,
    color: '#333',
  },
  interestPlus: {
    backgroundColor: '#EEE',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  plusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  eventContainer: {
    marginBottom: 16,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventDescription: {
    fontSize: 14,
    marginTop: 5,
  },
  eventDate: {
    fontSize: 12,
    color: '#777',
    marginTop: 5,
  },
  tag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 10,
  },
  tagHosting: {
    backgroundColor: '#FF8C00',
  },
  tagAttending: {
    backgroundColor: '#4CAF50',
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
  },
  logoutButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 30,
  },
  buttonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
});
