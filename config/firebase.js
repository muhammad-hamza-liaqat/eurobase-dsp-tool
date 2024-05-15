// Firebase.js
var admin = require("firebase-admin");
var serviceAccount = require("../acclem-social-firebase-adminsdk-t8sdb-4b56c0fa20.json");
var adminServiceAccount = require("../adminFirebaseConfig.json");

const defaultApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
}, "default");

const secondaryApp = admin.initializeApp({
  credential: admin.credential.cert(adminServiceAccount)  
}, "secondary");



const sendPushNotification = async (token, title, body) => {
  await defaultApp.messaging().send({
    token: token.toString(),
    notification: {
      title: title,
      body: body,
    },
  });
};



const sendAdminPushNotification = async (token, title, body) => {
  await secondaryApp.messaging().send({
    token: token.toString(),
    notification: {
      title: title,
      body: body,
    },
  });
};

module.exports = { sendAdminPushNotification: sendAdminPushNotification,sendPushNotification: sendPushNotification};
 

// const db = admin.firestore();

// module.exports = db;

// module.exports = {
//   db: db,
//   admin: admin,
// };
