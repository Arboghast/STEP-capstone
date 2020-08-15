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
const rangesData = [
  {
    start: 0,
    length: 0,
    chars: 10,
  },
  {
    start: 15,
    length: 0,
    chars: 20,
  },
  {
    start: 50,
    length: 0,
    chars: 4,
  },
];
const wordsData = ["the", "old", "slim", "grumpy", "slender", "please"];

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
  conv.add(`I don't understand, please repeat yourself.`);
  conv.add(new Canvas());
});

app.handle("bookSelected", (conv) => {
  //Selection of a book from the library scene
  const bookTitle = conv.session.params.bookTitle; //user input

  if (conv.user.params[bookTitle]["chunk"] == undefined) {
    //define key value pair if it doesnt exist
    conv.user.params[bookTitle] = {
      chunk: 0,
      size: textData[bookTitle].length,
    };
  }

  conv.user.params.currentBook = bookTitle;

  let text = getText(conv);
  conv.add("Loading Book...");
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

  let bookText = textData[bookTitle][conv.user.params[bookTitle]["chunk"]]; //assume its an array of sentences
  let userInput = conv.session.params.userInput; //assume userInput is also an array of sentences

  //bookText = splitBySentences(bookText);

  //userInput = splitBySentences(userInput);

  //let response = analyseText(bookText, userInput);
  let response = { assistantOutput: "testing" };

  if (response.assistantOutput != "") {
    //TESTING
    conv.add(
      new Canvas({
        data: {
          command: "TEXT_FEEDBACK",
          words: wordsData,
          ranges: rangesData,
          //words: response.words,
          //ranges: response.ranges
        },
      })
    );
    let ssml = `<speak><mark name="OK"/>${response.assistantOutput}<mark name="FIN"/></speak>`;
    conv.add(ssml); //for onTtsMark callback
  } else {
    //audio feedback
    let ssml = `<speak><audio src=https://rpg.hamsterrepublic.com/wiki-images/1/12/Ping-da-ding-ding-ding.ogg></audio></speak>`;

    //go next logic
    conv.user.params[bookTitle]["chunk"] += 1;
    let text = getText(conv);
    conv.add(
      new Canvas({
        data: {
          command: "CHANGE_TEXT",
          text: text,
        },
      })
    );
    conv.add(ssml);
  }
});

app.handle("openLibrary", (conv) => {
  //scene progression handled by AOG GOTO_LIBRARY intent
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
  //scene progression handled by AOG NEXT intent
  const bookTitle = conv.user.params.currentBook;
  conv.user.params[bookTitle]["chunk"] += 1; //increment page

  let text = getText(conv); //send appropriate response based on user's position in the book
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
  conv.user.params[bookTitle]["chunk"] = 0; //setting the chunk number to 0
  conv.scene.next.name = "TEXT";

  conv.add(
    new Canvas({
      data: {
        command: "CHANGE_TEXT",
        text: textData[bookTitle][0],
      },
    })
  );
});

function getText(conv) {
  let bookTitle = conv.user.params.currentBook;
  console.log(conv.user.params);
  let { chunk, size } = conv.user.params[bookTitle];

  let text;
  if (chunk >= size) {
    text = "The End.";
    conv.add(
      "You can Reread this book or Go Back To The Library to find a new book."
    );
    conv.scene.next.name = "FINISH";
  } else {
    text = textData[bookTitle][chunk];
  }
  return text;
}

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
    assistantOutput: recompile,
  };

  return responseJSON;
}

//given a paragraph, and a sentence number(index), return the starting index of the sentence and its length
function findRange(str, index) {
  //replace important periods with a temp placeholder
  let chunk = splitBySentences(str);

  //calculate the starting index of the given sentence by summing the length of all previous sentences.
  let startIndex = 0;
  for (let j = index - 1; j >= 0; j--) {
    startIndex += chunk[j].length;
  }
  let length = chunk[index].length;

  let ans = { start: startIndex, length: 0, chars: length };
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
  let split = str
    .replace(/(?<=(mr|Mr|Ms|md|Md|Dr|dr|mrs|Mrs|Sr|Jr|jr|sr))\./g, "@")
    .match(/[^.?!]+[.!?]+[\])'"`’”]*/g);

  if (split == null) {
    return [str];
  } else {
    for (let i = 0; i < split.length; i++) {
      split[i] = split[i].replace(/\@/g, ".");
    }
    return split;
  }
}

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
