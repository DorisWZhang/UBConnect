// app/(tabs)/posting.tsx — Create event with location input and categories
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

// Conditionally import DateTimePicker to avoid Web crashes
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { validateEvent } from '@/components/models/ConnectEvent';
import { createEvent, isPermissionDenied } from '@/src/services/social';
import { logEvent } from '@/src/telemetry';
import { colors, fonts, fontSizes, spacing, radius } from '@/src/theme';
import GradientButton from '@/components/ui/GradientButton';

const CATEGORIES = [
  'Sports', 'Esports', 'Music', 'Arts', 'Food',
  'Academic', 'Social', 'Volunteering', 'Outdoors', 'Fitness', 'Indoor',
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
  const [placeId, setPlaceId] = useState('');
  const [locationGeo, setLocationGeo] = useState<{ latitude: number, longitude: number } | null>(null);
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
        placeId,
        locationGeo,
        startTime: startDate,
        endTime: endDate,
        capacity: capacity ? Number(capacity) : null,
        createdBy: user.uid,
        createdByName: name,
      });

      await logEvent('event_created', { eventId, categoryId });
      Alert.alert('Success!', 'Your event has been posted.', [
        { text: 'View Event', onPress: () => router.push(`/event/${eventId}`) },
        { text: 'OK', onPress: () => router.push('/(protected)/(tabs)/explore') },
      ]);

      // Reset form
      setTitle('');
      setDescription('');
      setCategoryId('');
      setLocationName('');
      setPlaceId('');
      setLocationGeo(null);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.pageTitle}>Create Event</Text>

      {/* Title */}
      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="What's happening?"
        maxLength={80}
        placeholderTextColor={colors.textMuted}
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
        placeholderTextColor={colors.textMuted}
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

      {/* Divider */}
      <View style={styles.divider} />

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
              color={visibility === v ? '#fff' : colors.textMuted}
            />
            <Text style={[styles.visText, visibility === v && styles.visTextActive]}>
              {v === 'public' ? 'Public' : 'Friends Only'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Location */}
      <Text style={styles.label}>Location</Text>
      <GooglePlacesAutocomplete
        placeholder="Where is this event?"
        disableScroll={true}
        debounce={400}
        onFail={(error: any) => {
          if (error !== 'request could not be completed or has been aborted') {
            console.warn('GooglePlacesAutocomplete error:', error);
          }
        }}
        onPress={(data: any, details: any = null) => {
          if (details) {
            setLocationName(data.description);
            setPlaceId(data.place_id || '');
            if (details.geometry?.location) {
              setLocationGeo({
                latitude: details.geometry.location.lat,
                longitude: details.geometry.location.lng,
              });
            }
          }
        }}
        query={{
          key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
          language: 'en',
        }}
        fetchDetails={true}
        styles={{
          textInputContainer: {
            width: '100%',
          },
          textInput: {
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.glassBorder,
            paddingHorizontal: spacing.md,
            height: 44,
            fontSize: fontSizes.md,
            color: colors.text,
            fontFamily: fonts.body,
          },
          predefinedPlacesDescription: {
            color: colors.accent,
          },
          listView: {
            backgroundColor: colors.surfaceLight,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.glassBorder,
            marginTop: spacing.xs,
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
          },
          row: {
            backgroundColor: colors.surfaceLight,
          },
          description: {
            color: colors.text,
          },
          separator: {
            backgroundColor: colors.border,
          },
          poweredContainer: {
            backgroundColor: colors.surfaceLight,
            borderTopColor: colors.border,
          },
        }}
        textInputProps={{
          placeholderTextColor: colors.textMuted,
        }}
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
            borderRadius: '12px',
            border: `1px solid ${colors.glassBorder}`,
            backgroundColor: colors.surface,
            fontSize: '15px',
            color: colors.text,
            fontFamily: 'inherit',
            width: '100%',
            boxSizing: 'border-box',
            colorScheme: 'dark',
          },
        })
      ) : (
        <>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(!showStartPicker)}>
            <Ionicons name="time-outline" size={18} color={colors.textMuted} />
            <Text style={styles.dateText}>{formatDate(startDate)}</Text>
          </TouchableOpacity>
          {showStartPicker && DateTimePicker && (
            <DateTimePicker
              value={startDate}
              mode="datetime"
              themeVariant="dark"
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
            borderRadius: '12px',
            border: `1px solid ${colors.glassBorder}`,
            backgroundColor: colors.surface,
            fontSize: '15px',
            color: colors.text,
            fontFamily: 'inherit',
            width: '100%',
            boxSizing: 'border-box',
            colorScheme: 'dark',
          },
        })
      ) : (
        <>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(!showEndPicker)}>
            <Ionicons name="time-outline" size={18} color={colors.textMuted} />
            <Text style={styles.dateText}>{formatDate(endDate)}</Text>
          </TouchableOpacity>
          {showEndPicker && DateTimePicker && (
            <DateTimePicker
              value={endDate}
              mode="datetime"
              themeVariant="dark"
              onChange={(e: any, d: any) => {
                setShowEndPicker(Platform.OS === 'ios');
                if (d) setEndDate(d);
              }}
            />
          )}
        </>
      )}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Capacity */}
      <Text style={styles.label}>Capacity (optional)</Text>
      <TextInput
        style={styles.input}
        value={capacity}
        onChangeText={setCapacity}
        placeholder="Max attendees"
        keyboardType="numeric"
        placeholderTextColor={colors.textMuted}
      />

      {/* Submit */}
      <GradientButton
        title="Post Event"
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        size="lg"
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.base, paddingTop: 60, paddingBottom: 40 },
  pageTitle: {
    fontSize: fontSizes.xxl,
    fontFamily: fonts.display,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSizes.md,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    fontSize: fontSizes.md,
    fontFamily: fonts.body,
    color: colors.text,
  },
  charCount: {
    fontSize: fontSizes.xs,
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  catChip: {
    backgroundColor: colors.glass,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catChipText: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
  },
  catChipTextActive: {
    color: '#fff',
    fontFamily: fonts.bodySemiBold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  visRow: { flexDirection: 'row', gap: 10 },
  visChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, borderRadius: radius.sm,
    borderWidth: 1.5, borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
  },
  visChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  visText: {
    marginLeft: 6,
    fontSize: fontSizes.sm,
    fontFamily: fonts.bodyMedium,
    color: colors.textMuted,
  },
  visTextActive: {
    color: '#fff',
    fontFamily: fonts.bodySemiBold,
  },
  dateButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
  },
  dateText: {
    fontSize: fontSizes.md,
    fontFamily: fonts.body,
    color: colors.text,
    marginLeft: spacing.sm,
  },
});
