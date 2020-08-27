"use strict";

var _require = require("@assistant/conversation"),
    conversation = _require.conversation,
    Canvas = _require.Canvas;

var functions = require("firebase-functions");

var Diff = require("diff");

var database = require("./reformattedX.json");

var app = conversation({
  debug: true
});
app.handle("welcome", function (conv) {
  var supportsInteractiveCanvas = conv.device.capabilities.includes("INTERACTIVE_CANVAS");

  if (!supportsInteractiveCanvas) {
    conv.add("Sorry, this device does not support Interactive Canvas!");
    conv.scene.next.name = "actions.page.END_CONVERSATION";
    return;
  }

  var books = [];
  var keys = Object.keys(database);

  for (i in keys) {
    var imgSrc = database[keys[i]]["Image"];
    var title = keys[i];
    var chunkNumber = getProgress(title, conv);
    var book = {
      imgSrc: imgSrc,
      title: title,
      chunkNumber: chunkNumber
    };
    books.push(book);
  }

  conv.add(new Canvas({
    url: "https://reading-dc6dd.web.app",
    data: {
      command: "WRITE_TO_LIBRARY",
      books: books
    }
  }));
  conv.add("Welcome to Reading with the Google Assistant!");
});
app.handle("fallback", function (conv) {
  conv.add("I don't understand, please repeat yourself.");
  conv.add(new Canvas());
});
app.handle("bookSelected", function (conv) {
  //Selection of a book from the library scene
  var bookTitle = toTitleCase(conv.session.params.bookTitle); //user input

  if (conv.user.params[bookTitle] == undefined || conv.user.params[bookTitle]["chunk"] == undefined) {
    //define key value pair if it doesnt exist
    conv.user.params[bookTitle] = {
      chunk: 0,
      size: database[bookTitle]["Text"].length
    };
  }

  conv.user.params.currentBook = bookTitle;
  var text = getText(conv);
  checkForchapter(conv, text);
  conv.add(new Canvas({
    data: {
      command: "BOOK_SELECTED",
      text: text
    }
  }));
});
app.handle("analyseUserInput", function (conv) {
  var bookTitle = conv.user.params.currentBook;
  var chunk = conv.user.params[bookTitle]["chunk"];
  var bookText = database[bookTitle]["Text"][chunk]; //An Array of Sentences

  var userInput = splitIntoSentences(conv.session.params.userInput); //split by puncuation

  var response = analyseText(bookText, userInput);

  if (response.assistantOutput != "") {
    conv.add(new Canvas({
      data: {
        command: "TEXT_FEEDBACK",
        words: response.words,
        ranges: response.ranges
      }
    }));
    var ssml = "<speak><mark name=\"OK\"/>".concat(response.assistantOutput, "<mark name=\"FIN\"/></speak>");
    conv.add(ssml);
  } else {
    //go next logic
    conv.user.params[bookTitle]["chunk"] += 1;
    var text = getText(conv);
    conv.add(new Canvas({
      data: {
        command: "CHANGE_TEXT",
        text: text
      }
    })); //audio feedback + google requires some text in an ssml object, so we add "filler text" to the audio tag

    var _ssml = "<speak>\n        <audio src=\"https://rpg.hamsterrepublic.com/wiki-images/1/12/Ping-da-ding-ding-ding.ogg\">text\n        </audio>\n      </speak>";
    conv.add(_ssml);
  }
});
app.handle("openLibrary", function (conv) {
  //scene progression handled by AOG GOTO_LIBRARY intent
  var progress = [];
  var keys = Object.keys(database);

  for (i in keys) {
    var title = keys[i];
    var chunkNumber = getProgress(title, conv);
    progress.push(chunkNumber);
  }

  conv.user.params.currentBook = null;
  conv.add(new Canvas({
    data: {
      command: "OPEN_LIBRARY",
      progress: progress
    }
  }));
});
app.handle("nextChunk", function (conv) {
  //scene progression handled by AOG NEXT intent
  var bookTitle = conv.user.params.currentBook;
  conv.user.params[bookTitle]["chunk"] += 1; //increment page

  var text = getText(conv); //send appropriate response based on user's position in the book

  conv.add(new Canvas({
    data: {
      command: "CHANGE_TEXT",
      text: text
    }
  }));
  checkForchapter(conv, text);
});
app.handle("restartBook", function (conv) {
  var bookTitle = conv.user.params.currentBook;
  conv.user.params[bookTitle]["chunk"] = 0; //setting the chunk number to 0

  conv.scene.next.name = "TEXT";
  var text = getText(conv);
  conv.add(new Canvas({
    data: {
      command: "CHANGE_TEXT",
      text: text
    }
  }));
  checkForchapter(conv, text);
});

function getProgress(title, conv) {
  if (conv.user.params[title] != undefined && conv.user.params[title]["chunk"] != undefined) {
    return conv.user.params[title]["chunk"] / conv.user.params[title]["size"]; //percentage
  } else {
    return 0;
  }
}

function getText(conv) {
  var bookTitle = conv.user.params.currentBook;
  var _conv$user$params$boo = conv.user.params[bookTitle],
      chunk = _conv$user$params$boo.chunk,
      size = _conv$user$params$boo.size;
  var text = "";

  if (chunk >= size) {
    text = "The End.";
    conv.add("You can Reread this book or Go Back To The Library to find a new book.");
    conv.scene.next.name = "FINISH";
  } else {
    var temp = database[bookTitle]["Text"][chunk];

    for (var _i = 0; _i < temp.length; _i++) {
      text = text + temp[_i] + " ";
    }
  }

  return text;
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
} //assumes book paragraph and userParagraph are arrays of sentences


function analyseText(bookParagraph, userParagraph) {
  var anal = [];
  var wordsWrong = [];
  var sentencesWrong = [];
  var apostropheDictionary = {};

  for (var _i2 = 0; _i2 < bookParagraph.length; _i2++) {
    if (_i2 >= userParagraph.length) {
      //if true, the user did not say this sentence and will be considered wrong
      sentencesWrong.push(_i2);
      anal.push(false);
    } else {
      var apos = bookParagraph[_i2].match(/[\w]\w*'\w*/gm); //captures all words with an apostrophe


      if (apos != null) {
        for (var y = 0; y < apos.length; y++) {
          var key = apos[y].replace(/'/gm, "");
          apostropheDictionary[key] = apos[y]; //key value pairs-> hes : he's
        }
      }

      var bookText = removeMarks(stripPunctuation(bookParagraph[_i2])).trim();
      var userText = removeMarks(stripPunctuation(userParagraph[_i2])).trim();
      var analysis = Diff.diffWords(bookText, userText, {
        ignoreCase: true
      });
      anal.push(analysis);
      var toggle = false;

      for (var j = 0; j < analysis.length; j++) {
        //if user adds a word, we cant highlight that word on the screen so no
        //need to pass it into the wrong words array, just mark the sentence as wrong as compensation
        if (analysis[j].removed) {
          wordsWrong.push(analysis[j].value.trim());
          toggle = true;
        }
      }

      if (toggle) {
        sentencesWrong.push(_i2); //at least one wrong word in the sentence makes the entire sentence wrong
      }
    }
  }

  var sentenceRanges = [];

  for (var _i3 = 0; _i3 < sentencesWrong.length; _i3++) {
    var ans = findRange(bookParagraph, sentencesWrong[_i3]);
    sentenceRanges.push(ans);
  } //condenses book paragraph into one string, to easily index the paragraph


  var bookCollapsed = "";

  for (var _i4 = 0; _i4 < bookParagraph.length; _i4++) {
    bookCollapsed += bookParagraph[_i4];
  } //combine wrong sentences into one string so the assistant can read it


  var recompile = "";

  for (var x = 0; x < sentenceRanges.length; x++) {
    var _ans = sentenceRanges[x];

    for (var k = _ans.start; k < _ans.start + _ans.chars; k++) {
      recompile += bookCollapsed.charAt(k);
    }
  }

  for (var _i5 = 0; _i5 < wordsWrong.length; _i5++) {
    if (apostropheDictionary.hasOwnProperty(wordsWrong[_i5])) {
      wordsWrong[_i5] = apostropheDictionary[wordsWrong[_i5]]; //replacing hes with he's for example
    }
  }

  var responseJSON = {
    ranges: sentenceRanges,
    words: wordsWrong,
    assistantOutput: recompile,
    analysis: anal
  };
  return responseJSON;
} //given a paragraph, and a sentence number(index), return the starting index of the sentence and its length


function findRange(para, index) {
  //calculate the starting index of the given sentence by summing the length of all previous sentences.
  var startIndex = 0;

  for (var j = index - 1; j >= 0; j--) {
    startIndex += para[j].length;
  }

  var length = para[index].length;
  var ans = {
    start: startIndex,
    length: 0,
    chars: length
  };
  return ans;
}

function removeMarks(str) {
  return str.replace(/(?<=(mr|Mr|Ms|md|Md|Dr|dr|mrs|Mrs|Sr|Jr|jr|sr))\./g, "").replace(/\./, ". ");
}

function stripPunctuation(str) {
  return str.replace(/[,\/#!$%\^&\*;:'"{}=\_`~()]/g, "").replace(/-/g, " ");
}

function splitIntoSentences(str) {
  if (/[^.?!]+[.!?]+[\])'"`’”]*/g.test(str)) {
    //prevent null return on .match() call
    var split = str.replace(/(?<=(mr|Mr|Ms|md|Md|Dr|dr|mrs|Mrs|Sr|Jr|jr|sr))\./g, "@").match(/[^.?!]+[.!?]+[\])'"`’”]*/g);

    for (var _i6 = 0; _i6 < split.length; _i6++) {
      split[_i6] = split[_i6].replace(/\@/g, ".");
    }

    return split;
  } else {
    return [str];
  }
}

function checkForchapter(conv, text) {
  var bookTitle = conv.user.params.currentBook;

  if (/^CHAPTER/gi.test(text) || conv.user.params[bookTitle]["chunk"] == 0) {
    //if this chunk is a new chapter
    var ssml = "<speak><mark name=\"CHAP\"/>".concat(text, "<mark name=\"ENDCHAP\"/></speak>");
    conv.add(ssml);
  }
}

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);