// edit-profile.tsx — saves to Firestore via ProfileContext
import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/ThemedText';
import { useProfile } from '@/contexts/ProfileContext';
import { logEvent } from '@/src/telemetry';
import InlineNotice from '@/components/InlineNotice';
import GradientButton from '@/components/ui/GradientButton';
import { colors, fonts, fontSizes, spacing, radius } from '@/src/theme';

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
  const [notice, setNotice] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [showInterestsModal, setShowInterestsModal] = useState(false);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSave = async () => {
    setNotice(null);
    if (!tempName.trim()) {
      setNotice({ message: 'Name cannot be empty.', type: 'error' });
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
      setNotice({ message: err.message || 'Failed to save profile. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Edit Profile</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <InlineNotice message={notice?.message ?? null} type={notice?.type} />

          {/* Name Input */}
          <View style={styles.fieldContainer}>
            <ThemedText style={styles.label}>Name</ThemedText>
            <TextInput
              style={styles.input}
              value={tempName}
              onChangeText={setTempName}
              placeholder="Your Name"
              placeholderTextColor={colors.textMuted}
              maxLength={50}
            />
          </View>

          {/* Bio Input */}
          <View style={styles.fieldContainer}>
            <ThemedText style={styles.label}>Bio</ThemedText>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={tempBio}
              onChangeText={setTempBio}
              placeholder="Tell us about yourself"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={280}
            />
            <ThemedText style={styles.charCount}>{tempBio.length}/280</ThemedText>
          </View>

          {/* Multiple-choice Interests */}
          <View style={styles.fieldContainer}>
            <ThemedText style={styles.label}>Interests</ThemedText>
            <View style={styles.interestsGrid}>
              {selectedInterests.map((interest) => (
                <View key={interest} style={[styles.interestChip, styles.interestChipSelected]}>
                  <ThemedText style={[styles.interestChipText, styles.interestChipTextSelected]}>
                    {interest}
                  </ThemedText>
                </View>
              ))}
              <TouchableOpacity
                style={styles.editInterestsButton}
                onPress={() => setShowInterestsModal(true)}
              >
                <ThemedText style={styles.editInterestsButtonText}>Edit Interests</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Save Button */}
          <View style={styles.buttonSection}>
            <GradientButton
              title={saving ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              size="lg"
              style={styles.saveButton}
            />
            <TouchableOpacity style={styles.cancelTouchable} onPress={handleCancel}>
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Interests Modal */}
      <Modal
        visible={showInterestsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInterestsModal(false)}
      >
        <View style={styles.container}>
          <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Interests</ThemedText>
              <TouchableOpacity onPress={() => setShowInterestsModal(false)}>
                <ThemedText style={styles.doneText}>Done</ThemedText>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
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
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  headerSpacer: {
    width: 32,
  },
  scrollContainer: {
    padding: spacing.lg,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.sm,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.text,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  charCount: {
    fontSize: fontSizes.xs,
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interestChip: {
    backgroundColor: colors.glass,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  interestChipSelected: {
    backgroundColor: colors.primaryGlow,
    borderColor: colors.primary,
  },
  interestChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  interestChipTextSelected: {
    color: colors.primaryLight,
  },
  editInterestsButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderStyle: 'dashed',
  },
  editInterestsButtonText: {
    color: colors.primary,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
  },
  buttonSection: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.base,
  },
  saveButton: {
    width: '100%',
  },
  cancelTouchable: {
    paddingVertical: spacing.sm,
  },
  cancelText: {
    color: colors.textSecondary,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  doneText: {
    fontSize: fontSizes.base,
    fontFamily: fonts.bodySemiBold,
    color: colors.accent,
  },
});
