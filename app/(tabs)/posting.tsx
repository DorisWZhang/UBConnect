import { StyleSheet, Image, Platform, View, Text } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Collapsible } from '@/components/Collapsible';
import { ExternalLink } from '@/components/ExternalLink';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import React from 'react';

export default function PostingPage() {

    const router = useRouter();
  return (
    <View >
        <Text>Posting page
            </Text></View>
  );
}