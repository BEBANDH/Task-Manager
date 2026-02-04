/**
 * Authentication UI Module
 * Handles all auth-related UI interactions
 */

import { initializeFirebase, signInWithGoogle, signOutUser, onAuthChange } from '../features/auth/auth.js';
import { syncToCloud, loadFromCloud } from '../features/auth/sync.js';

export async function initAuthUI() {
    // Check if Firebase config is set
    try {
        const { firebaseConfig } = await import('../config/firebase-config.js');

        // Check if config is still placeholder
        if (!firebaseConfig || firebaseConfig.apiKey === 'YOUR_API_KEY_HERE') {
            console.log('ℹ️ Firebase not configured - auth features hidden');
            // Hide auth buttons
            const signInBtn = document.getElementById('signInBtn');
            const profileBtn = document.getElementById('profileBtn');
            if (signInBtn) signInBtn.style.display = 'none';
            if (profileBtn) profileBtn.style.display = 'none';
            return;
        }
    } catch (error) {
        console.warn('⚠️ Firebase config error - auth features disabled');
        const signInBtn = document.getElementById('signInBtn');
        const profileBtn = document.getElementById('profileBtn');
        if (signInBtn) signInBtn.style.display = 'none';
        if (profileBtn) profileBtn.style.display = 'none';
        return;
    }

    // Initialize Firebase
    const firebaseReady = await initializeFirebase();

    if (!firebaseReady) {
        console.warn('⚠️ Firebase initialization failed - auth features disabled');
        return;
    }

    const signInBtn = document.getElementById('signInBtn');
    const profileBtn = document.getElementById('profileBtn');
    const profileModal = document.getElementById('profileModal');
    const profileModalClose = document.getElementById('profileModalClose');
    const signOutBtn = document.getElementById('signOutBtn');

    // Sign In button click
    signInBtn?.addEventListener('click', async () => {
        try {
            await signInWithGoogle();
        } catch (error) {
            alert('Sign in failed. Please try again.');
        }
    });

    // Profile button click
    profileBtn?.addEventListener('click', () => {
        openProfileModal();
    });

    // Profile modal close
    profileModalClose?.addEventListener('click', () => {
        profileModal.hidden = true;
    });

    // Sign out button
    signOutBtn?.addEventListener('click', async () => {
        if (confirm('Are you sure you want to sign out?')) {
            await signOutUser();
            profileModal.hidden = true;
        }
    });

    // Listen to auth state changes
    onAuthChange((user) => {
        updateUIForUser(user);

        if (user) {
            // Load data from cloud when signed in
            loadUserData();
        }
    });

    // Expose sync function globally so script.js can use it
    window.syncCurrentData = syncCurrentData;
}

function updateUIForUser(user) {
    const signInBtn = document.getElementById('signInBtn');
    const profileBtn = document.getElementById('profileBtn');
    const profilePhoto = document.getElementById('profilePhoto');
    const profileName = document.getElementById('profileName');

    if (user) {
        // User is signed in
        signInBtn.style.display = 'none';
        profileBtn.style.display = 'inline-flex';
        profilePhoto.src = user.photoURL || '';
        profileName.textContent = user.displayName?.split(' ')[0] || 'User';
    } else {
        // User is signed out
        signInBtn.style.display = 'inline-flex';
        profileBtn.style.display = 'none';
    }
}

function openProfileModal() {
    const user = window.firebaseAuth?.auth?.currentUser;
    if (!user) return;

    const profileModal = document.getElementById('profileModal');
    const profileModalPhoto = document.getElementById('profileModalPhoto');
    const profileModalName = document.getElementById('profileModalName');
    const profileModalEmail = document.getElementById('profileModalEmail');

    profileModalPhoto.src = user.photoURL || '';
    profileModalName.textContent = user.displayName || 'User';
    profileModalEmail.textContent = user.email || '';

    updateProfileStats();
    profileModal.hidden = false;
}

function updateProfileStats() {
    // Get task stats from localStorage or current state
    const tasks = JSON.parse(localStorage.getItem('tm_tasks_v2') || '{}');

    let totalTasks = 0;
    let completedTasks = 0;

    Object.values(tasks).forEach(folderTasks => {
        if (Array.isArray(folderTasks)) {
            totalTasks += folderTasks.length;
            completedTasks += folderTasks.filter(t => t.completed).length;
        }
    });

    const activeTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    document.getElementById('totalTasksStat').textContent = totalTasks;
    document.getElementById('completedTasksStat').textContent = completedTasks;
    document.getElementById('activeTasksStat').textContent = activeTasks;
    document.getElementById('completionRateStat').textContent = completionRate + '%';
}

async function loadUserData() {
    const cloudData = await loadFromCloud();

    if (cloudData && cloudData.folders && cloudData.tasks) {
        // Check if we should load from cloud
        const localLastModified = localStorage.getItem('tm_last_modified') || '0';

        if (cloudData.lastModified > parseInt(localLastModified)) {
            // Cloud data is newer - load it
            localStorage.setItem('tm_folders_v2', JSON.stringify(cloudData.folders));
            localStorage.setItem('tm_tasks_v2', JSON.stringify(cloudData.tasks));
            localStorage.setItem('tm_last_modified', cloudData.lastModified.toString());

            // Reload the page to apply cloud data
            window.location.reload();
        }
    }
}

// Export function to sync current data to cloud
export function syncCurrentData() {
    try {
        const folders = JSON.parse(localStorage.getItem('tm_folders_v2') || '[]');
        const tasks = JSON.parse(localStorage.getItem('tm_tasks_v2') || '{}');
        syncToCloud(folders, tasks);
        localStorage.setItem('tm_last_modified', Date.now().toString());
    } catch (error) {
        // Silently fail if not authenticated
    }
}
