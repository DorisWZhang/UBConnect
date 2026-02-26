// app/(tabs)/explore.tsx — Events feed with category filter and event detail navigation
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import { useAuth } from '@/src/auth/AuthContext';
import { useProfile } from '../ProfileContext';
import { ConnectEvent } from '@/components/models/ConnectEvent';
import {
  fetchEventsFeed, fetchInterestsFeed, searchEvents,
  isPermissionDenied, FeedResult,
} from '@/src/services/social';
import { captureException } from '@/src/telemetry';

const CATEGORIES = [
  'All', 'Sports', 'Esports', 'Music', 'Arts', 'Food',
  'Academic', 'Social', 'Volunteering', 'Outdoors', 'Fitness',
];

export default function ExplorePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { interests } = useProfile();

  const [events, setEvents] = useState<ConnectEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const loadFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      let result: FeedResult;
      if (categoryFilter !== 'All') {
        result = await fetchEventsFeed({ pageSize: 25, categoryId: categoryFilter });
      } else if (interests && interests.length > 0) {
        result = await fetchInterestsFeed(interests, { pageSize: 25 });
      } else {
        result = await fetchEventsFeed({ pageSize: 25 });
      }
      setEvents(result.events);
      setCursor(result.lastDoc);
      setHasMore(result.events.length >= 25);
    } catch (err) {
      if (isPermissionDenied(err)) {
        Alert.alert('Access Denied', 'Please verify your email to browse events.');
      } else {
        captureException(err, { flow: 'loadFeed' });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryFilter, interests]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const result = await fetchEventsFeed({ pageSize: 25, cursor, categoryId: categoryFilter !== 'All' ? categoryFilter : undefined });
      setEvents((prev) => [...prev, ...result.events]);
      setCursor(result.lastDoc);
      setHasMore(result.events.length >= 25);
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
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryBar}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.catChip, categoryFilter === item && styles.catChipActive]}
            onPress={() => setCategoryFilter(item)}
          >
            <Text style={[styles.catChipText, categoryFilter === item && styles.catChipTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Feed */}
      {loading ? (
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
  categoryBar: { maxHeight: 40, paddingHorizontal: 12, marginBottom: 8 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#f0f0f0', marginHorizontal: 4,
  },
  catChipActive: { backgroundColor: '#866FD8' },
  catChipText: { fontSize: 13, color: '#666' },
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
