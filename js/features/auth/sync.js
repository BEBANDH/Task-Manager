/**
 * Data Synchronization Module - Firebase Firestore
 */

import { getCurrentUser } from './auth.js';

// Sync data to Firestore
export async function syncToCloud(folders, tasksByFolder) {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const { db, doc, setDoc } = window.firebaseDb;
        const userRef = doc(db, 'users', user.uid);

        await setDoc(userRef, {
            folders: folders,
            tasks: tasksByFolder,
            lastModified: Date.now(),
            email: user.email,
            displayName: user.displayName
        }, { merge: true });

        console.log('✅ Data synced to cloud');
    } catch (error) {
        console.error('❌ Sync to cloud failed:', error);
    }
}

// Load data from Firestore
export async function loadFromCloud() {
    const user = getCurrentUser();
    if (!user) return null;

    try {
        const { db, doc, getDoc } = window.firebaseDb;
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('✅ Data loaded from cloud');
            return {
                folders: data.folders || [],
                tasks: data.tasks || {},
                lastModified: data.lastModified
            };
        }

        return null;
    } catch (error) {
        console.error('❌ Load from cloud failed:', error);
        return null;
    }
}

// Setup real-time sync listener
export function setupRealtimeSync(callback) {
    const user = getCurrentUser();
    if (!user) return null;

    try {
        const { db, doc, onSnapshot } = window.firebaseDb;
        const userRef = doc(db, 'users', user.uid);

        const unsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                console.log('🔄 Real-time update received');
                callback(data.folders, data.tasks);
            }
        });

        return unsubscribe;
    } catch (error) {
        console.error('❌ Real-time sync setup failed:', error);
        return null;
    }
}
