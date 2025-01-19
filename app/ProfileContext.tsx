// ProfileContext.tsx
import React, { createContext, useContext, useState, FC } from 'react';

type ProfileContextType = {
  name: string;
  setName: (name: string) => void;
  interests: string[];
  setInterests: (interests: string[]) => void;
};

// Default (initial) values
const ProfileContext = createContext<ProfileContextType>({
  name: 'John Doe',
  setName: () => {},
  interests: ['Hiking', 'Programming', 'Soccer', 'Photography'],
  setInterests: () => {},
});

interface ProfileProviderProps {
  children: React.ReactNode;
}

export const ProfileProvider: FC<ProfileProviderProps> = ({ children }) => {
  const [name, setName] = useState('John Doe');
  const [interests, setInterests] = useState([
    'Hiking',
    'Programming',
    'Soccer',
    'Photography',
  ]);

  return (
    <ProfileContext.Provider
      value={{
        name,
        setName,
        interests,
        setInterests,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
