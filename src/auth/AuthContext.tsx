// AuthContext — wraps Firebase Auth state + UBC email enforcement
import React, { createContext, useContext, useEffect, useState, FC } from 'react';
import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendEmailVerification,
    User,
} from 'firebase/auth';
import { AppState, AppStateStatus } from 'react-native';
import { auth } from '../../firebaseConfig';
import { captureException, logEvent } from '../telemetry';

// ---------------------------------------------------------------------------
// Allowed email domains
// ---------------------------------------------------------------------------
const ALLOWED_DOMAINS = ['student.ubc.ca', 'ubc.ca'];

function isAllowedEmail(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    return ALLOWED_DOMAINS.some((d) => domain === d);
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface AuthContextType {
    user: User | null;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<void>;
    logIn: (email: string, password: string) => Promise<void>;
    logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signUp: async () => { },
    logIn: async () => { },
    logOut: async () => { },
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });

        // Force token refresh on app foreground if the user is unverified
        // This handles the case where they click the email link in a browser
        // and come back to the app. Firebase Auth caches the old unverified token for 1 hr.
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                const currentUser = auth.currentUser;
                if (currentUser && !currentUser.emailVerified) {
                    try {
                        await currentUser.reload();
                        // This updates the local token claim, which the `(protected)` gateway relies on
                        await currentUser.getIdToken(true);
                        setUser({ ...currentUser } as User); // force re-render
                    } catch (e) {
                        // ignore silently
                    }
                }
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            unsubscribe();
            subscription.remove();
        };
    }, []);

    const signUp = async (email: string, password: string) => {
        if (!isAllowedEmail(email)) {
            throw new Error('Please use a @student.ubc.ca or @ubc.ca email address.');
        }
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(cred.user);
            logEvent('auth_signup', { email });
        } catch (err) {
            captureException(err, { flow: 'signup', email });
            throw err;
        }
    };

    const logIn = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            logEvent('auth_login', { email });
        } catch (err) {
            captureException(err, { flow: 'login', email });
            throw err;
        }
    };

    const logOut = async () => {
        try {
            await firebaseSignOut(auth);
            logEvent('auth_logout');
        } catch (err) {
            captureException(err, { flow: 'logout' });
            throw err;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signUp, logIn, logOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
