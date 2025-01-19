// notifications.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';

const Notifications = () => {

  const mockNotifications = [
    {
      id: '1',
      title: 'New Friend Request',
      description: 'Kim Jong Il has sent you a friend request.',
      time: '2 hours ago',
    },
    {
      id: '2',
      title: 'Event Reminder',
      description: 'Don’t forget the volleyball game tomorrow at 6 PM!',
      time: '1 day ago',
    },
    {
      id: '3',
      title: 'Activity Liked',
      description: 'Gregor liked your post.',
      time: '3 days ago',
    },
  ];


  // useEffect(() => {
  //   fetchNotifications();
  // }, []);

  // const fetchNotifications = async () => {
  //   try {
  //     const data = await getNotifications();
  //     setNotifications(data);
  //   } catch (error) {
  //     console.error('Error fetching notifications:', error);
  //   }
  // };

  const renderNotification = ({ item }: { item: { id: string; title: string; description: string; time: string } }) => (
    <TouchableOpacity style={styles.notificationItem}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
      <Text style={styles.time}>{item.time}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Notifications</Text>
      {mockNotifications.length > 0 ? (
        <FlatList
          data={mockNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
        />
      ) : (
        <Text style={styles.noNotifications}>No notifications yet!</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 16,
  },
  notificationItem: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
  time: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },
  noNotifications: {
    textAlign: 'center',
    fontSize: 16,
    color: '#aaa',
    marginTop: 20,
  },
});

export default Notifications;
