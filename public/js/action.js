/**
 * This class is used as a wrapper for Google Assistant Canvas Action class
 * along with its callbacks.
 */
export class Action {
  /**
   * @param {*} scene which serves as a container of all visual elements
   */
  constructor(scene) {
    this.canvas = window.interactiveCanvas;
    this.scene = scene;
    this.commands = {
      WRITE_TO_LIBRARY: (data) => {
        this.scene.getLibrary().clearLibrary();
        this.scene.getLibrary().addToLibrary(data.books);
      },
      BOOK_SELECTED: (data) => {
        if(data.title)
        {
          this.scene.getText().titleFont();
        }
        else
        {
          this.scene.getText().textFont();
        }
        this.scene.getText().setText(data.text);
        this.scene.openText();
      },
      CHANGE_TEXT: (data) => {
        this.scene.getText().flip();
        if(data.title)
        {
          this.scene.getText().titleFont();
        }
        else
        {
          this.scene.getText().textFont();
        }
        this.scene.getText().setText(data.text);
      },
      OPEN_LIBRARY: (data) => {
        this.scene.getLibrary().updateProgress(data.progress);
        this.scene.openLibrary();
      },
      TEXT_FEEDBACK: (data) => {
        this.scene.getText().setRanges(data.ranges);
        this.scene.getText().setWords(data.words);
      },
    };
    this.commands.WRITE_TO_LIBRARY.bind(this);
    this.commands.BOOK_SELECTED.bind(this);
    this.commands.CHANGE_TEXT.bind(this);
    this.commands.OPEN_LIBRARY.bind(this);
    this.commands.TEXT_FEEDBACK.bind(this);
  }

  /**
   * Register all callbacks used by Interactive Canvas
   * executed during scene creation time.
   *
   */
  setCallbacks() {
    // declare interactive canvas callbacks
    const callbacks = {
      onUpdate: (data) => {
        try {
          this.commands[data[0].command.toUpperCase()](data[0]);
        } catch (e) {
          // do nothing, when no command is sent or found
        }
      },
      //Synchronize Assistant dialogue with text highlighting and page transition
      onTtsMark: async (markName) => {
        if (markName === "FIN") {
          this.scene.getText().clearHighlights();
          await this.canvas.sendTextQuery("Go next"); //move to next page once assistant is done reading
        }
        if (markName ==='OK') { //begining of assistants speech
          this.scene.getText().startHighlighting();
        }
        if (markName === 'ENDCHAP') {
          await this.canvas.sendTextQuery("Go next");
          //this.scene.getText().textFont(); the function is not behaving asynchronously
        }
      }
    };
    callbacks.onUpdate.bind(this);
    // called by the Interactive Canvas web app once web app has loaded to
    // register callbacks
    this.canvas.ready(callbacks);
  }
}
