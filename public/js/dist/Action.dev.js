"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Action = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * This class is used as a wrapper for Google Assistant Canvas Action class
 * along with its callbacks.
 */
var Action =
/*#__PURE__*/
function () {
  /**
   * @param {*} scene which serves as a container of all visual elements
   */
  function Action(scene) {
    var _this = this;

    _classCallCheck(this, Action);

    this.canvas = window.interactiveCanvas;
    this.scene = scene;
    this.commands = {
      WRITE_TO_LIBRARY: function WRITE_TO_LIBRARY(data) {
        _this.scene.getLibrary().clearLibrary();

        _this.scene.getLibrary().addToLibrary(data.books);
      },
      BOOK_SELECTED: function BOOK_SELECTED(data) {
        _this.scene.getText().setText(data.text);

        _this.scene.openText();
      },
      CHANGE_TEXT: function CHANGE_TEXT(data) {
        _this.scene.getText().flip();

        _this.scene.getText().setText(data.text);
      },
      OPEN_LIBRARY: function OPEN_LIBRARY(data) {
        _this.scene.getLibrary().updateProgress(data.progress);

        _this.scene.openLibrary();
      },
      TEXT_FEEDBACK: function TEXT_FEEDBACK(data) {
        return regeneratorRuntime.async(function TEXT_FEEDBACK$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _this.scene.getText().setRanges(data.ranges);

                _this.scene.getText().setWords(data.words);

              case 2:
              case "end":
                return _context.stop();
            }
          }
        });
      }
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


  _createClass(Action, [{
    key: "setCallbacks",
    value: function setCallbacks() {
      var _this2 = this;

      // declare interactive canvas callbacks
      var callbacks = {
        onUpdate: function onUpdate(data) {
          try {
            _this2.commands[data[0].command.toUpperCase()](data[0]);
          } catch (e) {// do nothing, when no command is sent or found
          }
        },
        //Synchronize Assistant dialogue with text highlighting and page transition
        onTtsMark: function onTtsMark(markName) {
          return regeneratorRuntime.async(function onTtsMark$(_context2) {
            while (1) {
              switch (_context2.prev = _context2.next) {
                case 0:
                  if (!(markName === "FIN")) {
                    _context2.next = 4;
                    break;
                  }

                  _this2.scene.getText().clearHighlights();

                  _context2.next = 4;
                  return regeneratorRuntime.awrap(_this2.canvas.sendTextQuery("Go next"));

                case 4:
                  if (markName === 'OK') {
                    //begining of assistants speech
                    _this2.scene.getText().startHighlighting();
                  }

                  if (markName === 'CHAP') {
                    _this2.scene.getText().titleFont();
                  }

                  if (!(markName === 'ENDCHAP')) {
                    _context2.next = 10;
                    break;
                  }

                  _this2.scene.getText().textFont();

                  _context2.next = 10;
                  return regeneratorRuntime.awrap(_this2.canvas.sendTextQuery("Go next"));

                case 10:
                case "end":
                  return _context2.stop();
              }
            }
          });
        }
      };
      callbacks.onUpdate.bind(this); // called by the Interactive Canvas web app once web app has loaded to
      // register callbacks

      this.canvas.ready(callbacks);
    }
  }]);

  return Action;
}();

exports.Action = Action;