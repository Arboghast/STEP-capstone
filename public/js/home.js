import {Library} from './components/Library.js';
import {Text} from './components/Text.js';

//The main class of the reading action
export class Home{

  view = document.getElementById('view');
  library = new Library();
  text = new Text();

  constructor() {
    this.view.appendChild(this.library.getLibrary());
    this.view.appendChild(this.text.getText());
    this.openLibrary();
  }

  openText(){
    this.text.showText();
    this.library.hideLibrary();
  }

  openLibrary(){
    this.text.hideText();
    this.library.showLibrary();
  }

  getLibrary(){
    return this.library;
  }

  getText(){
    return this.text;
  }
}
