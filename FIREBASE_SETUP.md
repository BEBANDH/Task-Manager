# Firebase Setup Instructions

## Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Add project" or "Create a project"
3. Enter project name (e.g., "Task Manager")
4. Disable Google Analytics (optional)
5. Click "Create project"

## Step 2: Add Web App

1. In your Firebase project, click the **Web** icon (</>)
2. Register app nickname: "Task Manager Web"
3. DON'T check "Set up Firebase Hosting"
4. Click "Register app"
5. **COPY the firebaseConfig object** - you'll need this!

## Step 3: Enable Google Sign-In

1. Go to **Authentication** in left sidebar
2. Click "Get started"
3. Click **Sign-in method** tab
4. Click **Google** provider
5. Enable the toggle
6. Select a support email
7. Click "Save"

## Step 4: Add Your Configuration

Open `js/config/firebase-config.js` and replace with your config:

```javascript
export const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## Step 5: Set Up Firestore Database

1. Go to **Firestore Database** in left sidebar
2. Click "Create database"
3. Choose "Start in test mode"
4. Select a location (closest to you)
5. Click "Enable"

## Step 6: Configure Security Rules

In Firestore Database, go to **Rules** tab and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Click "Publish"

## Step 7: Test Your App

1. Open your Task Manager app
2. Click "Sign In" button
3. Sign in with your Google account
4. Your tasks will now sync across all devices!

## Troubleshooting

**"Firebase not configured" warning:**
- Make sure you updated `firebase-config.js` with YOUR config

**Sign-in popup blocked:**
- Allow popups for your domain

**Auth errors:**
- Check if Google Sign-In is enabled in Firebase Console
- Make sure your domain is in authorized domains list

**Data not syncing:**
- Check Firestore rules are set correctly
- Check browser console for errors

## That's It!

Your app now has:
- ✅ Google Sign-In
- ✅ User profiles with stats
- ✅ Auto-sync across devices
- ✅ Cloud backup
