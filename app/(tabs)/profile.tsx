import React from 'react';
import { StyleSheet, Image, View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function ProfilePage() {
  const router = useRouter();

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };

  const handleLogout = () => {
    // Add logout logic here (e.g., Firebase authentication logout)
    console.log('User logged out');
    router.replace('/login');
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://i.imgur.com/4OLE27o.png' }} // Replace with user's profile picture URL
          style={styles.profileImage}
        />
        <ThemedText style={styles.name} variant="title">John Doe</ThemedText>
        <ThemedText style={styles.email} variant="secondary">
          johndoe@student.ubc.ca
        </ThemedText>
      </View>

      {/* Content Section */}
      <ScrollView style={styles.contentSection}>
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle} variant="title">
            Friends
          </ThemedText>
          <ThemedText style={styles.sectionContent}>
            You have 10 friends.{' '}
            <ThemedText
              style={styles.link}
              onPress={() => router.push('/friends')}
            >
              View all
            </ThemedText>
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle} variant="title">
            Interests
          </ThemedText>
          <ThemedText style={styles.sectionContent}>
            Hiking, Programming, Soccer
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle} variant="title">
            Feed
          </ThemedText>
          <ThemedText style={styles.sectionContent}>
            Check out the latest activities from your network.{' '}
            <ThemedText
              style={styles.link}
              onPress={() => router.push('/feed')}
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
    // color handled by ThemedText or pass a color if needed
  },
  email: {
    fontSize: 16,
    // color handled by ThemedText or pass a color if needed
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
    // color handled by ThemedText or pass a color if needed
  },
  sectionContent: {
    fontSize: 16,
    // color handled by ThemedText or pass a color if needed
  },
  link: {
    fontSize: 16,
    textDecorationLine: 'underline',
    // color handled by ThemedText or pass a color if needed
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
    // color handled by ThemedText or pass a color if needed
  },
});
