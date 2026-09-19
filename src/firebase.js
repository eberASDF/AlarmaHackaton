import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyASiiAcmpioq3IttQhSzNehGDn4Cd7lBck',
  authDomain: 'alarma-6285b.firebaseapp.com',
  projectId: 'alarma-6285b',
  storageBucket: 'alarma-6285b.firebasestorage.app',
  messagingSenderId: '305957475785',
  appId: '1:305957475785:web:185571f51fc94ce1b94418'
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseFirestore = getFirestore(firebaseApp);
