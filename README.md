# UBConnect

**Bringing UBC Together, One Activity at a Time!**

UBConnect is a social app for UBC students to discover campus events, connect with peers, and build community. Post activities, find like-minded people, and never miss what's happening on campus.

---

## Getting Started

### Prerequisites
- **Node.js** >= 18 and **npm**
- **Expo CLI** (`npx expo`)
- A Firebase project with Firestore and Authentication enabled

### Environment Setup
1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
2. Fill in your Firebase project values in `.env` (from Firebase console > Project Settings > Your apps):
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
npm test                # All unit tests
npm run test:rules      # Firestore rules tests (requires Firebase emulator)
```

---

## Features

### Authentication
- **UBC-only registration** — sign up with `@student.ubc.ca` or `@ubc.ca` email
- **Email verification** — required before posting events
- **Password reset** — forgot-password flow via Firebase Auth

### Events
- **Create events** — title, description, time, location (Google Places), category, capacity, and visibility (public or friends-only)
- **11 categories** — Sports, Esports, Music, Arts, Food, Academic, Social, Volunteering, Outdoors, Fitness, Indoor
- **Explore feed** — browse and search events with category filters
- **Interest-based ranking** — events matching your interests are boosted to the top of the feed
- **Event detail & comments** — view full event info and interact via comments
- **Map view** — see event locations on an interactive map

### Social
- **Friend system** — send/accept friend requests with bidirectional connections
- **Mutual friends** — see shared connections when viewing other profiles
- **Friends-only events** — create events visible only to your friends
- **Notifications** — friend requests and activity updates

### Profiles
- **Avatar picker** — choose from 60 bundled DiceBear avatars (Adventurer and Notionists styles)
- **Interests** — select from 41 interests to personalize your feed
- **Bio, program, and year** — share your academic info
- **View other profiles** — see other students' events and mutual friends

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (managed workflow) |
| Language | TypeScript (strict) |
| Routing | Expo Router (file-based) |
| Backend | Firebase (Firestore, Auth, Crashlytics) |
| Maps | react-native-maps + Google Places |
| Testing | Jest |
| Build | EAS Build |

---

## Project Structure
```
app/
  _layout.tsx                    # Root layout with AuthProvider
  index.tsx                      # Auth gate
  landing.tsx                    # Landing page
  (auth)/                        # Auth screens
    login.tsx
    signup.tsx
    forgot-password.tsx
    verify-email.tsx
  (protected)/                   # Auth-gated screens
    (tabs)/                      # Main tab bar
      explore.tsx                # Event feed with interest ranking
      posting.tsx                # Create events
      map.tsx                    # Map view
      friends.tsx                # Friend list & requests
      notifications.tsx          # Notifications
      profile.tsx                # Own profile
    edit-profile.tsx             # Edit profile & interests
    change-password.tsx          # Change password
    event/[eventId].tsx          # Event detail & comments
    profile/[uid].tsx            # Other user's profile
components/
  models/
    ConnectEvent.tsx             # Event schema, validation
    UserProfile.ts               # User profile interface
  AvatarPickerModal.tsx          # Avatar selection modal
  MutualFriendsModal.tsx         # Mutual friends bottom sheet
  InlineNotice.tsx               # Error/success banners
  MapScreen.native.tsx           # Native map component
  MapScreen.web.tsx              # Web map fallback
contexts/
  ProfileContext.tsx              # Global profile state
src/
  auth/AuthContext.tsx            # Auth state management
  constants/interestMapping.ts   # Interest-to-category mapping
  services/social.ts             # Firestore service layer
  services/notifications.ts      # Push notification helpers
  telemetry/index.ts             # Analytics event tracking
  utils/avatarMap.ts             # Avatar key-to-image mapping
firebaseConfig.js                # Firebase initialization
firestore.rules                  # Firestore security rules
firestore.indexes.json           # Composite index definitions
```

---

## Firebase Collections
```
users/{uid}
  displayName, email, program, year, photoURL, interests[], bio
  /friends/{friendUid}        # Bidirectional friend edges
  /friendRequests/{id}        # Pending friend requests

connectEvents/{eventId}
  title, description, categoryId, visibility, capacity,
  startTime, endTime, createdAt, createdBy,
  locationName, placeId, locationGeo

comments/{commentId}          # Event comments
```

---

## Migration Notes

### Legacy Events
Events created before Phase 2 may lack `createdBy` or `visibility` fields. The Firestore rules now require these on creation, but existing documents are unaffected. The UI shows "Host info unavailable" for missing `createdBy`.

### Deploying Rules & Indexes
After pulling changes, deploy rules and indexes together:
```bash
firebase deploy --only firestore:rules,firestore:indexes
```
If a query fails with `failed-precondition`, the app shows a banner directing you to create the missing index.
