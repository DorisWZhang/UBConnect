/**
 * Smoke render tests — verify that core screens render without crashing.
 * These are minimal sanity checks, not full integration tests.
 */
import React from 'react';
import renderer from 'react-test-renderer';

// Mock Firebase and navigation before importing components
jest.mock('../../firebaseConfig', () => ({
    db: {},
    auth: {},
}));

jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
    addDoc: jest.fn(() => Promise.resolve()),
    serverTimestamp: jest.fn(() => new Date()),
}));

jest.mock('firebase/auth', () => ({
    onAuthStateChanged: jest.fn((auth, cb) => {
        cb(null);
        return jest.fn();
    }),
    getAuth: jest.fn(),
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
        user: null,
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

describe('Smoke render tests', () => {
    it('Explore page renders without crashing', () => {
        const ExplorePage = require('../../app/(tabs)/explore').default;
        const tree = renderer.create(<ExplorePage />);
        expect(tree.toJSON()).toBeTruthy();
    });

    it('Posting page renders without crashing', () => {
        const PostingPage = require('../../app/(tabs)/posting').default;
        const tree = renderer.create(<PostingPage />);
        expect(tree.toJSON()).toBeTruthy();
    });
});
