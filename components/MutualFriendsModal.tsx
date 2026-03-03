// components/MutualFriendsModal.tsx
import React from 'react';
import {
    Modal, View, TouchableOpacity, FlatList, Image,
    StyleSheet, Pressable,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { getAvatarSource } from '@/src/utils/avatarMap';
import { MutualFriend } from '@/src/services/social';
import { colors, fonts, fontSizes, spacing, radius } from '@/src/theme';

interface Props {
    visible: boolean;
    friends: MutualFriend[];
    onClose: () => void;
}

export default function MutualFriendsModal({ visible, friends, onClose }: Props) {
    const router = useRouter();

    const handlePress = (uid: string) => {
        onClose();
        router.push(`/profile/${uid}`);
    };

    const renderItem = ({ item }: { item: MutualFriend }) => {
        const avatarSrc = getAvatarSource(item.photoURL);
        return (
            <TouchableOpacity style={styles.row} onPress={() => handlePress(item.uid)}>
                <View style={styles.rowAvatar}>
                    {avatarSrc ? (
                        <Image source={avatarSrc} style={styles.rowAvatarImg} />
                    ) : (
                        <ThemedText style={styles.rowAvatarText}>
                            {item.displayName.charAt(0).toUpperCase()}
                        </ThemedText>
                    )}
                </View>
                <ThemedText style={styles.rowName}>{item.displayName}</ThemedText>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={() => {}}>
                    <View style={styles.header}>
                        <ThemedText style={styles.title}>Mutual Friends</ThemedText>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={friends}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.uid}
                        contentContainerStyle={styles.list}
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
        backgroundColor: colors.surface,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        maxHeight: '60%',
        paddingBottom: 34,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.base,
        paddingTop: spacing.base,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        fontSize: fontSizes.lg,
        fontFamily: fonts.heading,
        color: colors.text,
    },
    list: {
        paddingHorizontal: spacing.base,
        paddingTop: spacing.sm,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    rowAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        overflow: 'hidden',
    },
    rowAvatarImg: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    rowAvatarText: {
        color: colors.text,
        fontSize: fontSizes.base,
        fontFamily: fonts.bodySemiBold,
    },
    rowName: {
        flex: 1,
        fontSize: fontSizes.base,
        color: colors.text,
        fontFamily: fonts.bodyMedium,
    },
});
