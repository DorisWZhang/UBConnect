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
        return unsubscribe;
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
