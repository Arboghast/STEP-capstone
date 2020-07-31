const { conversation, Canvas } = require("@assistant/conversation");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://reading-dc6dd.firebaseio.com",
// });

const textData = require("./mockTextData.json");

const app = conversation({ debug: true });

app.handle("welcome", (conv) => {
  const supportsInteractiveCanvas = conv.device.capabilities.includes("INTERACTIVE_CANVAS");
  if (!supportsInteractiveCanvas) {
    conv.add("Sorry, this device does not support Interactive Canvas!");
    conv.scene.next.name = "actions.page.END_CONVERSATION";
    return;
  }
  conv.add('Welcome to Reading with the Google Assistant!');
  conv.add(
    new Canvas({
      url: 'https://reading-dc6dd.web.app'
    })
  );
});

app.handle("fallback", (conv) => {
  conv.add(`I don't understand. You can read a book or cancel.`);
  conv.add(new Canvas());
});

app.handle("bookSelected", (conv) => {
  const bookTitle = conv.session.params.bookTitle; //cannot be null

  //Using user storage to keep track of book progress
  const chunkNumber = conv.user.params.books[booktitle] //json objet
  ? conv.user.params.books[booktitle] : 0; //start of the book

  let chunkNumber;
  if(conv.user.params.books.hasOwnProperty(bookTitle)){
    chunkNumber = conv.user.params.books[booktitle];
  }else{
    chunkNumber = 0; 
    Object.defineProperty(conv.user.params.books, bookTitle, {
      value: 0,
      writable: true
    })
  }

    conv.add('Loading Book...');
    conv.add(new Canvas({
      data: {
        command: "BOOK_SELECTED",
        text: textData["Child Stories"][0]
      }
    }));
});

app.handle("analyseUserInput", (conv) => {

});

app.handle("openLibrary", (conv) => {

});

app.handle("openText", (conv) => {

});

// app.handle("change_color", (conv) => {
//   const color = conv.intent.params.color
//     ? conv.intent.params.color.resolved
//     : null;
//   if (!(color in tints)) {
//     conv.add(`Sorry, I don't know that color. Try red, blue, or green!`);
//     conv.add(new Canvas());
//     return;
//   }
//   conv.add(`Ok, I changed my color to ${color}. What else?`);
//   conv.add(
//     new Canvas({
//       data: {
//         command: "TINT",
//         tint: tints[color],
//       },
//     })
//   );
// });

// app.handle("start_spin", (conv) => {
//   conv.add(`Ok, I'm spinning. What else?`);
//   conv.add(
//     new Canvas({
//       data: {
//         command: "SPIN",
//         spin: true,
//       },
//     })
//   );
// });

// app.handle("stop_spin", (conv) => {
//   conv.add("Ok, I paused spinning. What else?");
//   conv.add(
//     new Canvas({
//       data: {
//         command: "SPIN",
//         spin: false,
//       },
//     })
//   );
// });

// app.handle("instructions", (conv) => {
//   conv.add(INSTRUCTIONS);
//   conv.add(new Canvas());
// });

// app.handle("restart", (conv) => {
//   conv.add(INSTRUCTIONS);
//   conv.add(
//     new Canvas({
//       data: {
//         command: "RESTART_GAME",
//       },
//     })
//   );
// });

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
