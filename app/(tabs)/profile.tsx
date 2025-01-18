import React from 'react';
import { StyleSheet, Image, View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function ProfilePage() {
  const router = useRouter();

  // Example data for friends and interests
  const friendsList = [
    { id: 1, name: 'Alice', avatar: 'https://i.imgur.com/xT3UJDj.png' },
    { id: 2, name: 'Bob', avatar: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcnM4YjJlemlhM3BhenpmZjU1MWRweW9ocmxsbDF3bmVpeGdjdXhneSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/sRLzi9Y8P64ExwlcZt/giphy.gif' },
    { id: 3, name: 'Charlie', avatar: 'https://i.imgur.com/4OLE27o.png' },
    { id: 4, name: 'Diana', avatar: 'https://i.imgur.com/xT3UJDj.png' },
    { id: 5, name: 'Eve', avatar: 'https://i.imgur.com/4OLE27o.png' },
  ];

  const interests = ['Hiking', 'Programming', 'Soccer', 'Photography'];

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };

  const handleLogout = () => {
    // Add logout logic here (e.g., Firebase authentication logout)
    console.log('User logged out');
    router.replace('/landing');
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://i.imgur.com/4OLE27o.png' }} // Replace with user's profile picture URL
          style={styles.profileImage}
        />
        <ThemedText style={styles.name} type="title">
          John Doe
        </ThemedText>
        <ThemedText style={styles.email} type="subtitle">
          johndoe@student.ubc.ca
        </ThemedText>
      </View>

      {/* Content Section */}
      <ScrollView style={styles.contentSection}>
        {/* Friends Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="title">
            Friends
          </ThemedText>
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
            </ScrollView>
            {/* “View All” link or other text */}
            <ThemedText style={styles.link} onPress={() => router.push('/friends')}>
              View all
            </ThemedText>
          </View>
        </View>

        {/* Interests Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="title">
            Interests
          </ThemedText>
          <View style={styles.interestsContainer}>
            {interests.map((interest, index) => (
              <View key={index} style={styles.interestBubble}>
                <ThemedText style={styles.interestText}>{interest}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Feed Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="title">
            Feed
          </ThemedText>
          <ThemedText style={styles.sectionContent}>
            Check out the latest activities from your network.{' '}
            <ThemedText
              style={styles.link}
              onPress={() => router.push('/explore')}
            >
              Go to Feed
            </ThemedText>
          </ThemedText>
        </View>
      </ScrollView>

      {/* Button Section */}
      <View style={styles.buttonSection}>
        <TouchableOpacity style={styles.button} onPress={handleEditProfile}>
          <ThemedText style={styles.buttonText}>Edit Profile</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <ThemedText style={styles.buttonText}>Log Out</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  /* Header Section */
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
  },

  /* Content Section */
  contentSection: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sectionContent: {
    fontSize: 16,
  },
  link: {
    fontSize: 16,
    textDecorationLine: 'underline',
    paddingHorizontal: 5,
  },

  /* Friends Section */
  friendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  friendsContainer: {
    // Optional: if you want spacing between friend icons, use padding or margin
    paddingRight: 10,
  },
  friendItem: {
    marginRight: 10,
    // Additional styling can be added here
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },

  /* Interests Section */
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',       // allows wrapping to next line
  },
  interestBubble: {
    backgroundColor: '#007BFF20', // or any lighter shade of your theme color
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    fontSize: 14,
  },

  /* Button Section */
  buttonSection: {
    marginTop: 30,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
