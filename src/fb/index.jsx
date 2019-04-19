import * as firebase from "firebase/app";
import "firebase/storage";
import "firebase/auth";
// Must use google-cloud package instead of firebase for storage
// See https://stackoverflow.com/questions/41352150/typeerror-firebase-storage-is-not-a-function

const config = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  databaseURL: process.env.DATABASE_URL,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID
};

firebase.initializeApp(config);

// export let databaseFB = firebase.database(appFB);
export default firebase;
