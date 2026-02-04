/**
 * Authentication Module - Firebase Google Sign-In
 */

import { firebaseConfig } from '../../config/firebase-config.js';

// Firebase imports will be loaded from CDN
let auth = null;
let db = null;
let currentUser = null;
let isAuthenticated = false;

// Initialize Firebase
export async function initializeFirebase() {
    try {
        // Import Firebase from CDN
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } =
            await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        const { getFirestore, doc, setDoc, getDoc, onSnapshot } =
            await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        window.firebaseAuth = { auth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged };
        window.firebaseDb = { db, doc, setDoc, getDoc, onSnapshot };

        console.log('✅ Firebase initialized');
        return true;
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        return false;
    }
}

// Sign in with Google
export async function signInWithGoogle() {
    try {
        const { auth, GoogleAuthProvider, signInWithPopup } = window.firebaseAuth;
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        currentUser = result.user;
        isAuthenticated = true;
        console.log('✅ Signed in:', currentUser.displayName);
        return currentUser;
    } catch (error) {
        console.error('❌ Sign in failed:', error);
        throw error;
    }
}

// Sign out
export async function signOutUser() {
    try {
        const { auth, signOut } = window.firebaseAuth;
        await signOut(auth);
        currentUser = null;
        isAuthenticated = false;
        console.log('✅ Signed out');
    } catch (error) {
        console.error('❌ Sign out failed:', error);
        throw error;
    }
}

// Listen to auth state changes
export function onAuthChange(callback) {
    const { auth, onAuthStateChanged } = window.firebaseAuth;
    return onAuthStateChanged(auth, (user) => {
        currentUser = user;
        isAuthenticated = !!user;
        callback(user);
    });
}

// Get current user
export function getCurrentUser() {
    return currentUser;
}

export function isUserAuthenticated() {
    return isAuthenticated;
}
