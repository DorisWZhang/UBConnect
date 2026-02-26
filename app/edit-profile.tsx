// edit-profile.tsx — saves to Firestore via ProfileContext
import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useProfile } from './ProfileContext';
import { ScrollView } from 'react-native';
import { logEvent } from '@/src/telemetry';

export default function EditProfilePage() {
  const router = useRouter();
  const { name, interests, bio, saveProfile } = useProfile();

  const ALL_INTERESTS = [
    'Anime', 'Board Games', 'Bowling', 'Billiards', 'Cars', 'Chess',
    'Cooking', 'Cycling', 'Dancing', 'Drawing', 'Driving', 'Esports',
    'Gaming', 'Go Karting', 'Golf', 'Gym', 'Hiking', 'Horseback Riding',
    'Ice Skating', 'Karaoke', 'Martial Arts', 'Movies', 'Music', 'Painting',
    'Photography', 'Programming', 'Reading', 'Rock Climbing', 'Rollerblading',
    'Running', 'Shopping', 'Shooting Sports', 'Skiing', 'Skateboarding',
    'Snowboarding', 'Sports', 'Surfing', 'Swimming', 'Squash', 'Traveling', 'Yoga',
  ];

  const [tempName, setTempName] = useState(name);
  const [tempBio, setTempBio] = useState(bio || '');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(interests);
  const [saving, setSaving] = useState(false);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSave = async () => {
    if (!tempName.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await saveProfile({
        displayName: tempName.trim(),
        displayNameLower: tempName.trim().toLowerCase(),
        bio: tempBio.trim(),
        interests: selectedInterests,
      });
      await logEvent('profile_edit_saved');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedText style={styles.title} type="title">
          Edit Profile
        </ThemedText>

        {/* Name Input */}
        <View style={styles.fieldContainer}>
          <ThemedText style={styles.label}>Name</ThemedText>
          <TextInput
            style={styles.input}
            value={tempName}
            onChangeText={setTempName}
            placeholder="Your Name"
            maxLength={50}
          />
        </View>

        {/* Bio Input */}
        <View style={styles.fieldContainer}>
          <ThemedText style={styles.label}>Bio</ThemedText>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={tempBio}
            onChangeText={setTempBio}
            placeholder="Tell us about yourself"
            multiline
            maxLength={280}
          />
          <ThemedText style={styles.charCount}>{tempBio.length}/280</ThemedText>
        </View>

        {/* Multiple-choice Interests */}
        <View style={styles.fieldContainer}>
          <ThemedText style={styles.label}>Interests</ThemedText>
          <View style={styles.interestsGrid}>
            {ALL_INTERESTS.map((interest) => {
              const isSelected = selectedInterests.includes(interest);
              return (
                <TouchableOpacity
                  key={interest}
                  style={[
                    styles.interestChip,
                    isSelected && styles.interestChipSelected,
                  ]}
                  onPress={() => toggleInterest(interest)}
                >
                  <ThemedText
                    style={[
                      styles.interestChipText,
                      isSelected && styles.interestChipTextSelected,
                    ]}
                  >
                    {interest}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Button Section */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.saveButton, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <ThemedText style={styles.buttonText}>
              {saving ? 'Saving...' : 'Save'}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
            <ThemedText style={styles.buttonText}>Cancel</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { padding: 20 },
  title: { fontSize: 22, marginBottom: 20 },
  fieldContainer: { marginBottom: 16 },
  label: { marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    fontSize: 16,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interestChip: {
    backgroundColor: '#ccc',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  interestChipSelected: {
    backgroundColor: '#866FD8',
  },
  interestChipText: {
    color: '#333',
    fontWeight: '500',
  },
  interestChipTextSelected: {
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  saveButton: { backgroundColor: '#866FD8' },
  cancelButton: { backgroundColor: '#777' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});