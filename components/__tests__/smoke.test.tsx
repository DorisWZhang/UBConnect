/**
 * Smoke render tests — verify that core screens render without crashing.
 * These are minimal sanity checks, not full integration tests.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';

// Mock Firebase and navigation before importing components
jest.mock('../../firebaseConfig', () => ({
    db: {},
    auth: {},
}));

jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
    addDoc: jest.fn(() => Promise.resolve({ id: 'test' })),
    serverTimestamp: jest.fn(() => new Date()),
    doc: jest.fn(),
    getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    query: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    startAfter: jest.fn(),
    writeBatch: jest.fn(() => ({
        set: jest.fn(),
        update: jest.fn(),
        commit: jest.fn(() => Promise.resolve()),
    })),
    Timestamp: { now: jest.fn() },
    deleteDoc: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
    onAuthStateChanged: jest.fn((auth, cb) => {
        cb(null);
        return jest.fn();
    }),
    getAuth: jest.fn(),
    sendEmailVerification: jest.fn(),
}));

jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
    }),
    Link: 'Link',
    Stack: {
        Screen: 'Screen',
    },
}));

jest.mock('@/src/auth/AuthContext', () => ({
    useAuth: () => ({
        user: { uid: 'test-uid', email: 'test@student.ubc.ca', emailVerified: true, displayName: 'Test' },
        loading: false,
        signUp: jest.fn(),
        logIn: jest.fn(),
        logOut: jest.fn(),
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/src/telemetry', () => ({
    captureException: jest.fn(),
    logEvent: jest.fn(),
    logFirestoreError: jest.fn(),
    isPermissionDenied: jest.fn(() => false),
    parseFirebaseErrorCode: jest.fn(() => 'unknown'),
}));

jest.mock('@/src/services/social', () => ({
    fetchEventsFeed: jest.fn(() => Promise.resolve({ events: [], lastDoc: null })),
    fetchEventComments: jest.fn(() => Promise.resolve({ comments: [], lastDoc: null })),
    addEventComment: jest.fn(),
    rsvpToEvent: jest.fn(),
    isPermissionDenied: jest.fn(() => false),
    getFirestoreErrorMessage: jest.fn(() => 'Error'),
    getOrCreateUserProfile: jest.fn(() => Promise.resolve({
        uid: 'test',
        displayName: 'Test User',
        interests: [],
        createdAt: new Date(),
    })),
    updateUserProfile: jest.fn(),
    listFriends: jest.fn(() => Promise.resolve([])),
}));

jest.mock('@rneui/themed', () => ({
    SearchBar: 'SearchBar',
}));

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('react-native-picker-select', () => 'RNPickerSelect');

// Mock @expo/vector-icons to avoid font loading issues in tests
jest.mock('@expo/vector-icons', () => {
    const { View } = require('react-native');
    const MockIcon = (props: any) => View;
    return {
        Ionicons: MockIcon,
        MaterialIcons: MockIcon,
        FontAwesome: MockIcon,
        __esModule: true,
        default: MockIcon,
    };
});

jest.mock('@expo/vector-icons/Ionicons', () => {
    const { View } = require('react-native');
    return View;
});

jest.mock('expo-font', () => ({
    isLoaded: () => true,
    loadAsync: jest.fn(),
}));

// Mock ProfileContext for profile-dependent screens
jest.mock('../../app/ProfileContext', () => ({
    useProfile: () => ({
        name: 'Test User',
        interests: ['Hiking'],
        bio: 'Test bio',
        program: 'CS',
        year: '3',
        profileLoading: false,
        saveProfile: jest.fn(),
        reloadProfile: jest.fn(),
        setName: jest.fn(),
        setInterests: jest.fn(),
        setBio: jest.fn(),
        setProgram: jest.fn(),
        setYear: jest.fn(),
    }),
    ProfileProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Smoke render tests', () => {
    it('Explore page renders without crashing', async () => {
        const ExplorePage = require('../../app/(tabs)/explore').default;
        let tree: any;
        await act(async () => {
            tree = renderer.create(<ExplorePage />);
        });
        // After async loading resolves, the component renders
        expect(tree.toJSON()).toBeTruthy();
    });

    it('Posting page renders without crashing', async () => {
        const PostingPage = require('../../app/(tabs)/posting').default;
        let tree: any;
        await act(async () => {
            tree = renderer.create(<PostingPage />);
        });
        expect(tree.toJSON()).toBeTruthy();
    });

    it('Profile page renders without crashing', () => {
        const ProfilePage = require('../../app/(tabs)/profile').default;
        expect(() => renderer.create(<ProfilePage />)).not.toThrow();
    });

    it('Notifications page renders without crashing', () => {
        const NotificationsPage = require('../../app/(tabs)/notifications').default;
        expect(() => renderer.create(<NotificationsPage />)).not.toThrow();
    });

    it('Login page renders without crashing', () => {
        const LoginPage = require('../../app/(auth)/login').default;
        expect(() => renderer.create(<LoginPage />)).not.toThrow();
    });

    it('Signup page renders without crashing', () => {
        const SignupPage = require('../../app/(auth)/signup').default;
        expect(() => renderer.create(<SignupPage />)).not.toThrow();
    });
});

