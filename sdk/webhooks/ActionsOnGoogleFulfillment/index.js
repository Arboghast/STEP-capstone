const { conversation, Canvas } = require("@assistant/conversation");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const Diff = require("diff");

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
  const bookTitle = conv.user.params.currentBook;

  //In case user says something during the End of Book Screen.
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
    let bookText = textData[bookTitle][conv.user.params[bookTitle]]; //assume its an array of sentences
    let userInput = conv.session.params.userInput;//assume userInput is also an array of sentences

    let response = analyseText(bookText, userInput);

    if (response.assistantOutput != "") {
      conv.add(
        new Canvas({
          data: {
            command: "TEXT_FEEDBACK",
            words: response.words,
            ranges: response.ranges
          },
        })
      );
      let ssml = `<speak><mark name="OK"/>${response.assistantOutput}<mark name="FIN"/></speak>`;
      conv.add(ssml); //for onTtsMark callback
    } else {
      //audio feedback
      //let ssml = `<speak></speak>`
      conv.user.params[bookTitle] += 1;
      chunkNumber = conv.user.params[bookTitle];
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

//assumes book paragraph and userParagraph are arrays of sentences
function analyseText(bookParagraph, userParagraph) {
  let options = { ignoreCase: true };
  let wordsWrong = [];
  let sentencesWrong = [];
  let apostropheDictionary = {};
  for (let i = 0; i < bookParagraph.length; i++) {
    if (i >= userParagraph.length) {
      //if true, the user did not say this sentence and will be considered wrong
      sentencesWrong.push(i);
    } else {
      let apos = bookParagraph[i].match(/[\w]\w*'\w*/gm); //captures all words with an apostrophe
      if (apos != null) {
        for (let y = 0; y < apos.length; y++) {
          let key = apos[y].replace(/'/gm, "");
          apostropheDictionary[key] = apos[y]; //key value pairs-> hes : he's
        }
      }

      let bookText = removeMarks(stripPunctuation(bookParagraph[i]));
      let userText = removeMarks(stripPunctuation(userParagraph[i]));
      let analysis = Diff.diffWords(bookText, userText, options);

      let toggle = false;
      let override = true;

      let bt = bookText.split(" ").length;
      let ut = userText.split(" ").length;

      if (bt != ut) {
        sentencesWrong.push(i); //if they are not the same length, then at least one word was added/removed
        override = false; //to prevent repeat additions of this sentence
      }

      for (let j = 0; j < analysis.length; j++) {
        //if user adds a word, we cant highlight that word on the screen so no
        //need to pass it into the wrong words array, just mark the sentence as wrong as compensation
        if (analysis[j].removed) {
          wordsWrong.push(analysis[j].value);
          toggle = true;
        }
      }

      if (toggle && override) {
        sentencesWrong.push(i); //at least one wrong word in the sentence makes the entire sentence wrong
      }
    }
  }

  //condenses book paragraph into one string
  let bookCollapsed = "";
  for (let i = 0; i < bookParagraph.length; i++) {
    bookCollapsed += bookParagraph[i];
  }

  let sentenceRanges = [];
  for (let i = 0; i < sentencesWrong.length; i++) {
    let ans = findRange(bookCollapsed, sentencesWrong[i]);
    sentenceRanges.push(ans);
  }

  //combine wrong sentences into one string so the assistant can read it
  let recompile = "";
  for (let x = 0; x < sentenceRanges.length; x++) {
    let ans = sentenceRanges[x];
    for (let k = ans.start; k < ans.start + ans.length; k++) {
      recompile += bookCollapsed.charAt(k);
    }
  }

  for (let i = 0; i < wordsWrong.length; i++) {
    if (apostropheDictionary.hasOwnProperty(wordsWrong[i])) {
      wordsWrong[i] = apostropheDictionary[wordsWrong[i]]; //replacing hes with he's for example
    }
  }

  let responseJSON = {
    ranges: sentenceRanges,
    words: wordsWrong,
    assistantOutput: recompile
  };

  return responseJSON;
}

//given a paragraph, and a sentence number(index), return the starting index of the sentence and its length
function findRange(str, index) {
  //replace important periods with a temp placeholder
  let chunk = splitBySentences(str);
  for (let i = 0; i < chunk.length; i++) {
    chunk[i] = chunk[i].replace(/\@/g, ".");
  }

  //calculate the starting index of the given sentence by summing the length of all previous sentences.
  let startIndex = 0;
  for (let j = index - 1; j >= 0; j--) {
    startIndex += chunk[j].length;
  }
  let length = chunk[index].length;

  let ans = { start: startIndex, length: length };
  return ans;
}

function removeMarks(str) {
  return str
    .replace(/(?<=(mr|Mr|Ms|md|Md|Dr|dr|mrs|Mrs|Sr|Jr|jr|sr))\./g, "")
    .replace(/\./, ". ");
}

function stripPunctuation(str) {
  return str.replace(/[,\/#!$%\^&\*;:'{}=\_`~()]/g, "").replace(/-/g, " ");
}

function splitBySentences(str) {
  return str
    .replace(/(?<=(mr|Mr|Ms|md|Md|Dr|dr|mrs|Mrs|Sr|Jr|jr|sr))\./g, "@")
    .match(/[^.?!]+[.!?]+[\])'"`’”]*/g);
}

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
