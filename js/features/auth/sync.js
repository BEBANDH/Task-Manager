/**
 * Data Synchronization Module - Firebase Firestore
 */

import { getCurrentUser } from './auth.js';

// Sync data to Firestore
export async function syncToCloud(folders, tasksByFolder) {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const { db, doc, setDoc, writeBatch } = window.firebaseDb;
        const userRef = doc(db, 'users', user.uid);
        
        // Start a batched write
        const batch = writeBatch(db);

        // Update the root document (folders and metadata)
        batch.set(userRef, {
            folders: folders,
            lastModified: Date.now(),
            email: user.email,
            displayName: user.displayName,
            tasks: null // Nullify the old monolithic tasks field to save space
        }, { merge: true });

        // Update tasks in the 'lists' subcollection per folder
        for (const folderId in tasksByFolder) {
            const listRef = doc(db, 'users', user.uid, 'lists', folderId);
            batch.set(listRef, {
                tasks: tasksByFolder[folderId]
            }, { merge: true });
        }

        // Optional: We should ideally delete subcollection documents for folders that were deleted, 
        // but for safety and simplicity, we just overwrite active ones.
        
        await batch.commit();

        console.log('✅ Data synced to cloud (subcollections)');
    } catch (error) {
        console.error('❌ Sync to cloud failed:', error);
    }
}

// Load data from Firestore
export async function loadFromCloud() {
    const user = getCurrentUser();
    if (!user) return null;

    try {
        const { db, doc, getDoc, collection, getDocs } = window.firebaseDb;
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Check for legacy monolithic tasks
            let tasks = {};
            if (data.tasks) {
                console.log('ℹ️ Found legacy monolithic tasks, preparing to migrate.');
                tasks = data.tasks;
            }

            // Migrate category to labels if present
            if (Array.isArray(data.folders)) {
                data.folders.forEach(f => {
                    if (f.category !== undefined) {
                        if (!f.labels) f.labels = f.category.trim() ? [f.category.trim()] : ['General'];
                        delete f.category;
                    }
                    if (!f.labels || f.labels.length === 0) f.labels = ['General'];
                });
            }

            // Load subcollections
            const listsRef = collection(db, 'users', user.uid, 'lists');
            const listsSnap = await getDocs(listsRef);
            
            listsSnap.forEach(listDoc => {
                const listData = listDoc.data();
                if (listData.tasks) {
                    tasks[listDoc.id] = listData.tasks;
                }
            });

            console.log('✅ Data loaded from cloud');
            return {
                folders: data.folders || [],
                tasks: tasks,
                lastModified: data.lastModified || 0
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

        let isInitialLoad = true;
        const unsubscribe = onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // Skip initial fire since we already load manually on startup
                if (isInitialLoad) {
                    isInitialLoad = false;
                    return;
                }
                
                // When root document changes (e.g. from another tab), fetch all data
                // This keeps logic simple without complex subcollection listeners
                const cloudData = await loadFromCloud();
                if (cloudData) {
                    console.log('🔄 Real-time update received');
                    callback(cloudData.folders, cloudData.tasks, cloudData.lastModified);
                }
            }
        });

        return unsubscribe;
    } catch (error) {
        console.error('❌ Real-time sync setup failed:', error);
        return null;
    }
}
