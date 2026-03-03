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
import { colors, fonts, fontSizes, spacing, radius } from '@/src/theme';
import GradientButton from '@/components/ui/GradientButton';

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
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
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
              <Ionicons name="close" size={24} color={colors.textMuted} />
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
          <GradientButton
            title="Save"
            onPress={handleSave}
            disabled={!selected}
            size="lg"
            style={styles.saveButton}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: 34,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes.xl,
    fontFamily: fonts.heading,
    color: colors.text,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabInactive: {
    backgroundColor: colors.glass,
  },
  tabText: {
    fontSize: fontSizes.md,
    fontFamily: fonts.bodySemiBold,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabTextInactive: {
    color: colors.textSecondary,
  },

  // Grid
  gridContent: {
    paddingBottom: spacing.md,
  },
  gridItem: {
    flex: 1,
    alignItems: 'center',
    marginBottom: spacing.md,
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
    borderColor: colors.primary,
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
    backgroundColor: colors.surface,
    borderRadius: 10,
  },

  // Save button
  saveButton: {
    marginTop: spacing.xs,
  },
});
