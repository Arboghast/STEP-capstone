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
  const supportsInteractiveCanvas = conv.device.capabilities.includes(
    "INTERACTIVE_CANVAS"
  );
  if (!supportsInteractiveCanvas) {
    conv.add("Sorry, this device does not support Interactive Canvas!");
    conv.scene.next.name = "actions.page.END_CONVERSATION";
    return;
  }
  conv.add("Welcome to Reading with the Google Assistant!");
  conv.add(
    new Canvas({
      url: "https://reading-dc6dd.web.app",
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
  if (conv.user.params[bookTitle] != undefined) {
    chunkNumber = conv.user.params[bookTitle];
  } else {
    chunkNumber = 0;
    conv.user.params[bookTitle] = 0;
  }

  conv.user.params.currentBook = bookTitle;

  conv.add("Loading Book...");
  let text;
  if (chunkNumber >= textData[bookTitle].length) {
    text = "The End.";
    conv.add("You can say Restart Book or Go Back To The Library.");
  } else {
    text = textData[bookTitle][chunkNumber];
  }
  conv.add(
    new Canvas({
      data: {
        command: "BOOK_SELECTED",
        text: text,
      },
    })
  );
});

app.handle("analyseUserInput", (conv) => {
  //TODO: Acount for user input in the ending screen
  const userInput = conv.session.params.userInput;
  const bookTitle = conv.user.params.currentBook;

  let chunkNumber = conv.user.params[bookTitle];
  let text;
  if (chunkNumber >= textData[bookTitle].length) {
    text = "The End.";
    conv.add("You can say Restart Book or Go Back To The Library.");
    conv.add(
      new Canvas({
        data: {
          command: "CHANGE_TEXT",
          text: text,
        },
      })
    );
  } else {
    text = textData[bookTitle][chunkNumber];

    let Booktext = textData[bookTitle][conv.user.params[bookTitle]];

    //TODO: A naive text matching algorithm
    let matchedText = userInput;
    let remainingText = Booktext;

    if (remainingText) {
      conv.add(
        new Canvas({
          data: {
            command: "TEXT_FEEDBACK",
            matched: matchedText,
            remaining: remainingText,
          },
        })
      );
      let ssml = `<speak>${remainingText}<mark name="FIN"/></speak>`;
      conv.add(ssml); //for onTtsMark callback
    } else {
      //audio feedback
      //let ssml = `<speak></speak>`
      conv.user.params[bookTitle] += 1;
      conv.add(
        new Canvas({
          data: {
            command: "CHANGE_TEXT",
            text: text,
          },
        })
      );
    }
  }
});

app.handle("openLibrary", (conv) => {
  conv.user.params.currentBook = null;
  conv.add(
    new Canvas({
      data: {
        command: "OPEN_LIBRARY",
      },
    })
  );
});

app.handle("nextChunk", (conv) => {
  const bookTitle = conv.user.params.currentBook;
  conv.user.params[bookTitle] += 1;
  let chunkNumber = conv.user.params[bookTitle];
  let text;
  if (chunkNumber >= textData[bookTitle].length) {
    text = "The End.";
    conv.add("You can say Restart Book or Go Back To The Library.");
  } else {
    text = textData[bookTitle][chunkNumber];
  }
  conv.add(
    new Canvas({
      data: {
        command: "CHANGE_TEXT",
        text: text,
      },
    })
  );
});

app.handle("restartBook", (conv) => {
  const bookTitle = conv.user.params.currentBook;
  conv.user.params[bookTitle] = 0;
  let chunkNumber = 0;
  conv.add(
    new Canvas({
      data: {
        command: "CHANGE_TEXT",
        text: textData[bookTitle][chunkNumber],
      },
    })
  );
});

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
