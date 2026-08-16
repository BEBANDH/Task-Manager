/**
 * Authentication UI Module
 * Handles all auth-related UI interactions
 */

import { initializeFirebase, signInWithGoogle, signOutUser, onAuthChange } from '../features/auth/auth.js';
import { syncToCloud, loadFromCloud, setupRealtimeSync } from '../features/auth/sync.js';
import { state } from '../state.js';
import { render } from '../main.js';
import { renderFolders } from '../folders.js';

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

    let realtimeUnsubscribe = null;
    // Listen to auth state changes
    onAuthChange((user) => {
        updateUIForUser(user);

        if (realtimeUnsubscribe) {
            realtimeUnsubscribe();
            realtimeUnsubscribe = null;
        }

        if (user) {
            // Load data from cloud when signed in
            loadUserData().then(() => {
                realtimeUnsubscribe = setupRealtimeSync((folders, tasks, lastModified) => {
                    const localLastModified = localStorage.getItem('tm_last_modified') || '0';
                    if (lastModified > parseInt(localLastModified)) {
                        localStorage.setItem('tm_folders_v2', JSON.stringify(folders));
                        localStorage.setItem('tm_tasks_v2', JSON.stringify(tasks));
                        localStorage.setItem('tm_last_modified', lastModified.toString());
                        
                        state.folders = folders;
                        state.tasksByFolder = tasks;
                        renderFolders();
                        render();
                    }
                });
            });
        }
    });

    // Force Cloud Sync Buttons
    const forcePullBtn = document.getElementById('forcePullBtn');
    const forcePushBtn = document.getElementById('forcePushBtn');

    forcePullBtn?.addEventListener('click', async () => {
        if (!window.firebaseAuth?.auth?.currentUser) {
            alert('You must be signed in to pull from the cloud.');
            return;
        }
        if (confirm('Are you sure you want to OVERWRITE your local data with the cloud backup? This cannot be undone.')) {
            const cloudData = await loadFromCloud();
            if (cloudData && cloudData.folders && cloudData.tasks) {
                localStorage.setItem('tm_folders_v2', JSON.stringify(cloudData.folders));
                localStorage.setItem('tm_tasks_v2', JSON.stringify(cloudData.tasks));
                localStorage.setItem('tm_last_modified', Date.now().toString());
                
                state.folders = cloudData.folders;
                state.tasksByFolder = cloudData.tasks;
                renderFolders();
                render();
                alert('Data successfully pulled from the cloud!');
            } else {
                alert('No cloud backup found.');
            }
        }
    });

    forcePushBtn?.addEventListener('click', async () => {
        if (!window.firebaseAuth?.auth?.currentUser) {
            alert('You must be signed in to push to the cloud.');
            return;
        }
        if (confirm('Are you sure you want to OVERWRITE the cloud backup with your local data? This cannot be undone.')) {
            const success = await syncCurrentData();
            if (success) {
                alert('Data successfully pushed to the cloud!');
            } else {
                alert('Failed to push data to the cloud. Check console for details.');
            }
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

            // Reactive UI update instead of reload
            state.folders = cloudData.folders;
            state.tasksByFolder = cloudData.tasks;
            renderFolders();
            render();
        } else if (parseInt(localLastModified) > cloudData.lastModified && parseInt(localLastModified) > 0) {
            // Local data is newer - prompt user
            const overwrite = confirm("You have local changes that conflict with your cloud backup. Do you want to overwrite your cloud backup with these local changes?\n\nClick 'OK' to upload local data.\nClick 'Cancel' to load your cloud backup.");
            if (overwrite) {
                syncCurrentData();
            } else {
                // Force load cloud data
                localStorage.setItem('tm_folders_v2', JSON.stringify(cloudData.folders));
                localStorage.setItem('tm_tasks_v2', JSON.stringify(cloudData.tasks));
                localStorage.setItem('tm_last_modified', Date.now().toString());
                
                state.folders = cloudData.folders;
                state.tasksByFolder = cloudData.tasks;
                renderFolders();
                render();
            }
        }
    } else {
        // No cloud data - sync local to cloud to seed the database
        syncCurrentData();
    }
}

// Export function to sync current data to cloud
export async function syncCurrentData() {
    try {
        const folders = JSON.parse(localStorage.getItem('tm_folders_v2') || '[]');
        const tasks = JSON.parse(localStorage.getItem('tm_tasks_v2') || '{}');
        const success = await syncToCloud(folders, tasks);
        if (success) {
            localStorage.setItem('tm_last_modified', Date.now().toString());
        }
        return success;
    } catch (error) {
        // Silently fail if not authenticated
        return false;
    }
}
