/* ============================================================
   Firebase configuration
   ------------------------------------------------------------
   Paste your Firebase web-app config below (from the Firebase
   console → Project settings → General → Your apps → Web app → SDK setup).

   Until you replace the placeholder values, the app runs in
   LOCAL-ONLY mode (progress is saved on this device only).
   Once real values are present, accounts + cloud sync turn on
   automatically.

   NOTE: The apiKey here is NOT a secret — Firebase web keys are
   meant to live in client code. Your data is protected by
   Firebase Authentication + Firestore security rules, not by
   hiding this key.
   ============================================================ */
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
