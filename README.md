# Task Manager with Google Sign-In

A modern, feature-rich task manager with Google authentication and cloud sync.

## ✨ Features

- ✅ **Google Sign-In** - Secure authentication
- ☁️ **Cloud Sync** - Tasks sync across all devices
- 📁 **Multiple Lists** - Organize tasks into folders
- ✔️ **Subtasks** - Break down complex tasks
- 📊 **Activity Chart** - Visualize your progress
- 🎨 **Dark/Light Mode** - Eye-friendly themes
- 📱 **Responsive** - Works on all devices
- 💾 **Import/Export** - Excel & JSON support
- ⌨️ **Keyboard Shortcuts** - Fast workflow

## 🚀 Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/task-manager.git
cd task-manager
```

### 2. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Google Sign-In**:
   - Authentication → Sign-in method → Google → Enable
4. Enable **Firestore Database**:
   - Firestore Database → Create database → Test mode
5. Get your config:
   - Project Settings → Your apps → Web app
6. Copy `js/config/firebase-config.example.js` to `js/config/firebase-config.js`
7. Replace with your actual Firebase config

**Security Rules** (Firestore → Rules):
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

### 3. Run Locally

```bash
# Using Python
python -m http.server 5500

# Using Node.js
npx serve

# Using VS Code
# Install "Live Server" extension and click "Go Live"
```

### 4. Add Authorized Domain

In Firebase Console → Authentication → Settings → Authorized domains:
- Add `localhost`
- Add `127.0.0.1`
- (When deploying) Add your GitHub Pages domain

## 📖 Firebase Setup Details

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed instructions.

## 🎯 Usage

1. **Sign In** - Click the Sign In button (top right)
2. **Create Lists** - Click "+" in the sidebar to create folders
3. **Add Tasks** - Type and press Enter to add tasks
4. **Subtasks** - Click "+" on any task to add subtasks
5. **Sync** - Your data automatically syncs to cloud!

## 🔒 Security

- Firebase config is client-side and safe to expose
- Security comes from Firestore Security Rules
- Each user can only access their own data
- All data is encrypted in transit (HTTPS)

## 📝 License

MIT License - Feel free to use this project!

## 🤝 Contributing

Pull requests are welcome!

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!
