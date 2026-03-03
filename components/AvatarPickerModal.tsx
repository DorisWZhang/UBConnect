// AvatarPickerModal — bottom sheet modal with tabbed avatar grid
import React, { useState, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Pressable,
  ListRenderItemInfo,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getAvatarKeys, getAvatarImage, AvatarStyle } from '@/src/utils/avatarMap';

interface Props {
  visible: boolean;
  currentAvatar: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}

const NUM_COLUMNS = 4;
const TABS: { label: string; style: AvatarStyle }[] = [
  { label: 'Adventurer', style: 'adventurer' },
  { label: 'Notionists', style: 'notionists' },
];

export default function AvatarPickerModal({
  visible,
  currentAvatar,
  onSelect,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<AvatarStyle>('adventurer');
  const [selected, setSelected] = useState<string | null>(null);

  const keys = useMemo(() => getAvatarKeys(activeTab), [activeTab]);

  const handleTabPress = useCallback((style: AvatarStyle) => {
    setActiveTab(style);
  }, []);

  const handleAvatarPress = useCallback((key: string) => {
    setSelected(key);
  }, []);

  const handleSave = useCallback(() => {
    if (selected) {
      onSelect(selected);
    }
  }, [selected, onSelect]);

  const handleClose = useCallback(() => {
    setSelected(null);
    onClose();
  }, [onClose]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<string>) => {
      const isSelected = item === selected;
      const isCurrent = item === currentAvatar;

      return (
        <TouchableOpacity
          style={styles.gridItem}
          activeOpacity={0.7}
          onPress={() => handleAvatarPress(item)}
        >
          <View
            style={[
              styles.avatarCircle,
              isSelected && styles.avatarCircleSelected,
            ]}
          >
            <Image source={getAvatarImage(item)} style={styles.avatarImage} />
          </View>
          {isCurrent && (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#34D399" />
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [selected, currentAvatar, handleAvatarPress],
  );

  const keyExtractor = useCallback((item: string) => item, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        {/* Prevent taps on the sheet from closing the modal */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.title}>Choose Avatar</ThemedText>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.style;
              return (
                <TouchableOpacity
                  key={tab.style}
                  style={[
                    styles.tabButton,
                    isActive ? styles.tabActive : styles.tabInactive,
                  ]}
                  onPress={() => handleTabPress(tab.style)}
                  activeOpacity={0.8}
                >
                  <ThemedText
                    style={[
                      styles.tabText,
                      isActive ? styles.tabTextActive : styles.tabTextInactive,
                    ]}
                  >
                    {tab.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Grid */}
          <FlatList
            data={keys}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            numColumns={NUM_COLUMNS}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Save button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              !selected && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!selected}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.saveButtonText}>Save</ThemedText>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 34,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#866FD8',
  },
  tabInactive: {
    backgroundColor: '#f0f0f0',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabTextInactive: {
    color: '#666',
  },

  // Grid
  gridContent: {
    paddingBottom: 12,
  },
  gridItem: {
    flex: 1,
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarCircleSelected: {
    borderColor: '#866FD8',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Current avatar check badge
  checkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
  },

  // Save button
  saveButton: {
    backgroundColor: '#866FD8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
