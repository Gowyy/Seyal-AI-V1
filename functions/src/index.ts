
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export modules
export * from './modules/ai/orchestration';
// export * from './modules/coordination';
// export * from './modules/usage';
// export * from './modules/imports';
// export * from './modules/audit';

// Basic sanity check function
export const ping = functions.https.onRequest((request, response) => {
  response.send("Seyal AI Backend Online");
});
