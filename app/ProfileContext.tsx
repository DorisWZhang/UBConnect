// ProfileContext.tsx — Firestore-backed user profile
import React, { createContext, useContext, useState, useEffect, useCallback, FC } from 'react';
import { useAuth } from '@/src/auth/AuthContext';
import { getOrCreateUserProfile, updateUserProfile } from '@/src/services/social';
import { UserProfile, validateUserProfile } from '@/components/models/UserProfile';
import { captureException } from '@/src/telemetry';

type ProfileContextType = {
  name: string;
  setName: (name: string) => void;
  interests: string[];
  setInterests: (interests: string[]) => void;
  bio: string;
  setBio: (bio: string) => void;
  program: string;
  setProgram: (program: string) => void;
  year: string;
  setYear: (year: string) => void;
  profileLoading: boolean;
  saveProfile: (patch: Partial<UserProfile>) => Promise<void>;
  reloadProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType>({
  name: '',
  setName: () => { },
  interests: [],
  setInterests: () => { },
  bio: '',
  setBio: () => { },
  program: '',
  setProgram: () => { },
  year: '',
  setYear: () => { },
  profileLoading: true,
  saveProfile: async () => { },
  reloadProfile: async () => { },
});

interface ProfileProviderProps {
  children: React.ReactNode;
}

export const ProfileProvider: FC<ProfileProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [program, setProgram] = useState('');
  const [year, setYear] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      // Derive default displayName from email
      const emailPrefix = user.email?.split('@')[0] || 'UBC User';
      const profile = await getOrCreateUserProfile(user.uid, {
        displayName: user.displayName || emailPrefix,
        displayNameLower: (user.displayName || emailPrefix).toLowerCase(),
        interests: [],
      });
      if (profile) {
        setName(profile.displayName || emailPrefix);
        setInterests(profile.interests || []);
        setBio(profile.bio || '');
        setProgram(profile.program || '');
        setYear(profile.year || '');
      }
    } catch (err) {
      // Non-critical — use defaults
      captureException(err, { flow: 'loadProfile' });
      const emailPrefix = user.email?.split('@')[0] || 'UBC User';
      setName(emailPrefix);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = async (patch: Partial<UserProfile>) => {
    if (!user) throw new Error('Not logged in');

    // Validate
    const merged = {
      displayName: patch.displayName ?? name,
      bio: patch.bio ?? bio,
      interests: patch.interests ?? interests,
    };
    const validation = validateUserProfile(merged);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Auto-compute displayNameLower
    if (patch.displayName !== undefined) {
      patch.displayNameLower = patch.displayName.toLowerCase();
    }

    await updateUserProfile(user.uid, patch);

    // Update local state
    if (patch.displayName !== undefined) setName(patch.displayName);
    if (patch.interests !== undefined) setInterests(patch.interests);
    if (patch.bio !== undefined) setBio(patch.bio);
    if (patch.program !== undefined) setProgram(patch.program);
    if (patch.year !== undefined) setYear(patch.year);
  };

  return (
    <ProfileContext.Provider
      value={{
        name,
        setName,
        interests,
        setInterests,
        bio,
        setBio,
        program,
        setProgram,
        year,
        setYear,
        profileLoading,
        saveProfile,
        reloadProfile: loadProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
