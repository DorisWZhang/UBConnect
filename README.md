# UBConnect

**Tagline:** Bringing UBC Together, One Activity at a Time!

## Overview
UBConnect is a social app designed exclusively for UBC students to connect and collaborate. Whether you're looking for study buddies, intramural teammates, or people to explore Vancouver with, UBConnect makes it easy to post activities and find like-minded peers to join you. Create or browse posts for everything from group hikes to movie nights, and build meaningful connections on and off campus. With UBConnect, you'll never have to do anything alone-unless you want to!

---

## Getting Started

### Prerequisites
- **Node.js** ≥ 18 and **npm**
- **Expo CLI** (`npx expo`)
- A Firebase project with Firestore and Authentication enabled

### Environment Setup
1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
2. Fill in your Firebase project values in `.env` (from the Firebase console → Project Settings → General → Your apps):
   - `EXPO_PUBLIC_FIREBASE_API_KEY`
   - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
   - `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `EXPO_PUBLIC_FIREBASE_APP_ID`
   - `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional)
   - `EXPO_PUBLIC_SENTRY_DSN` (optional — telemetry is no-op when missing)

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the dev server:
   ```bash
   npx expo start
   ```

### Running Tests
```bash
# All unit tests
npm test

# Firestore rules tests (requires Firebase emulator)
npm run test:rules
```

---

## Features

### Core Features
- **UBC Student Verification:** Register with your UBC email (`@student.ubc.ca` or `@ubc.ca`) to ensure the app remains exclusive to UBC students.
- **Email Verification:** Firebase email verification gating for posting events.
- **Post Activities:** Share activities with details like time, location, description, category, and visibility.
- **Explore Events:** Browse and search activities posted by other UBC students.
- **Map Integration:** See event locations on an interactive native map.
- **Privacy Controls:** Share posts as public or friends-only.
- **Profiles:** View and edit your profile, including interests.
- **Comments:** Interact with event posts through comments.

### Engagement and Recommendations
- **Activity Categories:** Organize posts into categories based on interests.
- **Community Feed:** A relaxed, student-focused feed.

### Enhanced User Experience
- **Explore Page:** Discover trending or recommended activities.
- **Map View:** See UBC campus event locations on a native map.

---

## Tech Stack

### Front-End
- **Framework:** React Native (Expo / Expo Router)
- **Purpose:** Provides a seamless and intuitive mobile user interface.

### Back-End
- **Platform:** Firebase
  - **Authentication:** Secure, UBC email-verified registration.
  - **Database (Firestore):** Manages events, user data, and metadata.
  - **Security Rules:** Server-side validation for data integrity.

---

## Project Structure
```
├── app/
│   ├── _layout.tsx          # Root layout with AuthProvider
│   ├── landing.tsx          # Landing page (login/signup)
│   ├── (auth)/              # Auth screens
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/              # Main app tabs
│   │   ├── explore.tsx      # Browse events
│   │   ├── posting.tsx      # Create events
│   │   ├── map.tsx          # Native map view
│   │   ├── profile.tsx      # User profile
│   │   └── notifications.tsx
│   └── edit-profile.tsx
├── components/models/
│   └── ConnectEvent.tsx     # Schema, validation, mapping
├── src/
│   ├── auth/AuthContext.tsx  # Auth state management
│   └── telemetry/index.ts   # Monitoring hooks
├── firebaseConfig.js        # Single Firebase initialization
├── firestore.rules          # Security rules
└── firebase.json            # Emulator config
```