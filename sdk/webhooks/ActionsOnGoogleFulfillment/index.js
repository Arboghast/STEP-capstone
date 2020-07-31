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
  //USER STORAGE NOT WORKING AS INTENDED
  let chunkNumber;
  if(conv.user.params[bookTitle] != undefined)
  {
    chunkNumber = conv.user.params[bookTitle];
  }else{
    chunkNumber = 0; 
    conv.user.params[bookTitle] = 0;
  }

  conv.user.params.currentBook = bookTitle;

    conv.add('Loading Book...');
    conv.add(new Canvas({
      data: {
        command: "BOOK_SELECTED",
        text: textData[bookTitle][chunkNumber]
      }
    }));
});

app.handle("analyseUserInput", (conv) => {

});

app.handle("openLibrary", (conv) => {
    conv.user.params.currentBook = null;
    conv.add(new Canvas({
      data: {
        command: "OPEN_LIBRARY"
      }
    }));
});

//HANDLE OUT OF BOUNDS ERROR
app.handle("nextChunk", (conv) => {
  const bookTitle = conv.user.params.currentBook;
    conv.user.params[bookTitle] += 1;
    let chunkNumber = conv.user.params[bookTitle];
    conv.add(new Canvas({
      data: {
        command: "CHANGE_TEXT",
        text: textData[bookTitle][chunkNumber]
      }
    }));
})

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
