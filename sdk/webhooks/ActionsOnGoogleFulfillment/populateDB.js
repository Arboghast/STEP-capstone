const admin = require('firebase-admin');
const serviceAccount = require("serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://reading-dc6dd.firebaseio.com"
});

const db = admin.database();
const ref = db.ref(); //points to the root of the database

ref.set({json_here: ok}); //to put data in the database

//text points to the directory/file pointing to the book's json file
function textToArray(text){
    
}