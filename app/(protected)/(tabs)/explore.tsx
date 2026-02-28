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
      style={styles.eventCard}
      onPress={() => router.push(`/event/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.eventHeader}>
        <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
        {item.visibility === 'friends' && (
          <Ionicons name="lock-closed" size={14} color="#FF9800" />
        )}
      </View>
      <Text style={styles.eventDesc} numberOfLines={2}>{item.description}</Text>
      <View style={styles.eventMeta}>
        {item.locationName ? (
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.metaText} numberOfLines={1}>{item.locationName}</Text>
          </View>
        ) : null}
        {item.startTime && (
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.metaText}>{formatDate(item.startTime)}</Text>
          </View>
        )}
        {item.categoryId ? (
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{item.categoryId}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Explore</Text>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search events..."
          placeholderTextColor="#aaa"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); loadFeed(); }} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryBar}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.catChip, categoryFilter === item.id && styles.catChipActive]}
            onPress={() => setCategoryFilter(item.id)}
          >
            <Ionicons
              name={item.icon}
              size={16}
              color={categoryFilter === item.id ? '#fff' : '#666'}
            />
            <Text style={[styles.catChipText, categoryFilter === item.id && styles.catChipTextActive]}>
              {item.id}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Feed */}
      {feedError ? (
        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          <InlineNotice message={feedError} type="error" />
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" color="#866FD8" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          onRefresh={() => loadFeed(true)}
          refreshing={refreshing}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#866FD8" style={{ marginVertical: 10 }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No events found</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  pageTitle: { fontSize: 24, fontWeight: '700', paddingHorizontal: 16, marginBottom: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  searchInput: {
    flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
  },
  clearBtn: { marginLeft: 8 },
  categoryBar: { maxHeight: 50, marginBottom: 12 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#eee',
    borderRadius: 20,
    marginRight: 10,
  },
  catChipActive: { backgroundColor: '#866FD8' },
  catChipText: { fontSize: 14, color: '#666', fontWeight: '500' },
  catChipTextActive: { color: '#fff', fontWeight: '600' },
  eventCard: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fafafa',
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#eee',
  },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eventTitle: { fontSize: 17, fontWeight: '600', color: '#333', flex: 1, marginRight: 8 },
  eventDesc: { fontSize: 14, color: '#666', marginTop: 4, lineHeight: 20 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  metaText: { fontSize: 13, color: '#666', marginLeft: 4, maxWidth: 140 },
  categoryChip: {
    backgroundColor: '#e8e0ff', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  categoryChipText: { fontSize: 11, color: '#866FD8' },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#999', fontSize: 16, marginTop: 12 },
});
