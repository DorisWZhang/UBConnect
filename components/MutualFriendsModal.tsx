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
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
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
                            <Ionicons name="close" size={24} color="#333" />
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
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        maxHeight: '60%', paddingBottom: 34,
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    title: { fontSize: 18, fontWeight: '700', color: '#333' },
    list: { paddingHorizontal: 16, paddingTop: 8 },
    row: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
    },
    rowAvatar: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#866FD8',
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
        overflow: 'hidden',
    },
    rowAvatarImg: { width: 40, height: 40, borderRadius: 20 },
    rowAvatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    rowName: { flex: 1, fontSize: 16, color: '#333', fontWeight: '500' },
});
