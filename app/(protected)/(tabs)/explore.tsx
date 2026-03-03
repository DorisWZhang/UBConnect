// app/(tabs)/explore.tsx — Events feed with category filter and event detail navigation
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/auth/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { ConnectEvent } from '@/components/models/ConnectEvent';
import {
  fetchEventsFeed, fetchInterestsFeed, searchEvents,
  listFriends, isPermissionDenied, FeedResult,
  isFailedPrecondition, getFirestoreErrorMessage,
} from '@/src/services/social';
import InlineNotice from '@/components/InlineNotice';
import { captureException } from '@/src/telemetry';
import GlassCard from '@/components/ui/GlassCard';
import { colors, fonts, fontSizes, spacing, radius } from '@/src/theme';

const CATEGORIES = [
  { id: 'All', icon: 'grid-outline' },
  { id: 'Sports', icon: 'football-outline' },
  { id: 'Esports', icon: 'game-controller-outline' },
  { id: 'Music', icon: 'musical-notes-outline' },
  { id: 'Arts', icon: 'color-palette-outline' },
  { id: 'Food', icon: 'restaurant-outline' },
  { id: 'Academic', icon: 'school-outline' },
  { id: 'Social', icon: 'people-outline' },
  { id: 'Volunteering', icon: 'heart-outline' },
  { id: 'Outdoors', icon: 'leaf-outline' },
  { id: 'Fitness', icon: 'barbell-outline' },
  { id: 'Indoor', icon: 'home-outline' },
] as const;

export default function ExplorePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { interests } = useProfile();

  const [events, setEvents] = useState<ConnectEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageSizeRef = useRef(25);
  const [feedError, setFeedError] = useState<string | null>(null);

  const [friendUids, setFriendUids] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Load friend UIDs once on mount for safe feed queries
  useEffect(() => {
    const loadFriendUids = async () => {
      if (!user) return;
      try {
        const edges = await listFriends(user.uid);
        setFriendUids(edges.map(e => e.friendUid));
      } catch {
        // Non-critical — feed still works for public + own events
      }
    };
    loadFriendUids();
  }, [user]);

  const loadFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    if (isRefresh) pageSizeRef.current = 25;

    try {
      let result: FeedResult;
      const feedOpts = {
        pageSize: pageSizeRef.current,
        currentUid: user?.uid,
        friendUids,
      };

      if (categoryFilter !== 'All') {
        result = await fetchEventsFeed({ ...feedOpts, categoryId: categoryFilter });
      } else if (interests && interests.length > 0) {
        result = await fetchInterestsFeed(interests, feedOpts);
      } else {
        result = await fetchEventsFeed(feedOpts);
      }
      setEvents(result.events);
      setHasMore(result.events.length >= pageSizeRef.current);
      setFeedError(null);
    } catch (err) {
      if (isPermissionDenied(err)) {
        setFeedError('Please verify your email to browse events.');
      } else if (isFailedPrecondition(err)) {
        setFeedError(getFirestoreErrorMessage(err));
      } else {
        captureException(err, { flow: 'loadFeed' });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryFilter, interests, user, friendUids]);

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [loadFeed])
  );

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      // Increase page size and re-fetch (merged queries don't support cursors)
      pageSizeRef.current += 25;
      const feedOpts = {
        pageSize: pageSizeRef.current,
        currentUid: user?.uid,
        friendUids,
      };
      let result: FeedResult;
      if (categoryFilter !== 'All') {
        result = await fetchEventsFeed({ ...feedOpts, categoryId: categoryFilter });
      } else if (interests && interests.length > 0) {
        result = await fetchInterestsFeed(interests, feedOpts);
      } else {
        result = await fetchEventsFeed(feedOpts);
      }
      setEvents(result.events);
      setHasMore(result.events.length >= pageSizeRef.current);
    } catch { }
    setLoadingMore(false);
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      loadFeed();
      return;
    }
    setLoading(true);
    try {
      const results = await searchEvents(q);
      setEvents(results);
      setHasMore(false);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderEvent = ({ item }: { item: ConnectEvent }) => (
    <TouchableOpacity
      onPress={() => router.push(`/event/${item.id}`)}
      activeOpacity={0.7}
      style={styles.eventCardWrapper}
    >
      <GlassCard style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
          {item.visibility === 'friends' && (
            <Ionicons name="lock-closed" size={14} color={colors.warning} />
          )}
        </View>
        <Text style={styles.eventDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.eventMeta}>
          {item.locationName ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>{item.locationName}</Text>
            </View>
          ) : null}
          {item.startTime && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>{formatDate(item.startTime)}</Text>
            </View>
          )}
          {item.categoryId ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.categoryId}</Text>
            </View>
          ) : null}
        </View>
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Explore</Text>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search events..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); loadFeed(); }} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryBar}
        contentContainerStyle={styles.categoryBarContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.catChip, categoryFilter === item.id && styles.catChipActive]}
            onPress={() => setCategoryFilter(item.id)}
          >
            <Ionicons
              name={item.icon}
              size={16}
              color={categoryFilter === item.id ? '#fff' : colors.textSecondary}
            />
            <Text style={[styles.catChipText, categoryFilter === item.id && styles.catChipTextActive]}>
              {item.id}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Feed */}
      {feedError ? (
        <View style={styles.feedErrorContainer}>
          <InlineNotice message={feedError} type="error" />
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loadingIndicator} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          onRefresh={() => loadFeed(true)}
          refreshing={refreshing}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={styles.footerLoader} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No events found</Text>
            </View>
          }
          contentContainerStyle={styles.feedContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  pageTitle: {
    fontSize: fontSizes.xxl,
    fontFamily: fonts.display,
    color: colors.text,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },

  // Search
  searchRow: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.base,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.md,
    fontFamily: fonts.body,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  clearBtn: {
    marginLeft: spacing.sm,
  },

  // Category chips
  categoryBar: {
    marginBottom: spacing.md,
    flexGrow: 0,
  },
  categoryBarContent: {
    paddingHorizontal: spacing.base,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.glass,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginRight: spacing.sm + 2,
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catChipText: {
    fontSize: fontSizes.sm + 1,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
  },
  catChipTextActive: {
    color: '#fff',
    fontFamily: fonts.bodySemiBold,
  },

  // Event cards
  eventCardWrapper: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  eventCard: {
    // GlassCard provides bg, border, borderRadius, and padding
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fonts.heading,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  eventDesc: {
    fontSize: fontSizes.sm + 1,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginLeft: spacing.xs,
    maxWidth: 140,
  },
  categoryBadge: {
    backgroundColor: colors.primaryGlow,
    borderRadius: radius.sm + 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    fontSize: fontSizes.xs,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },

  // States
  feedErrorContainer: {
    marginHorizontal: spacing.base,
    marginTop: spacing.lg,
  },
  loadingIndicator: {
    marginTop: 40,
  },
  footerLoader: {
    marginVertical: spacing.sm + 2,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSizes.base,
    fontFamily: fonts.bodyMedium,
    marginTop: spacing.md,
  },
  feedContent: {
    paddingBottom: spacing.lg,
  },
});
