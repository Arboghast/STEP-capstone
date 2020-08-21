/**
 * Text Viewer Scene
 */
export class Text {

  textContainer;
  text;
  interval;
  index;
  ranges;
  words;
  instance;
  pageFlip;
  

  constructor() {
    this.createTextContainer();
    this.instance = new Mark(this.text); //init Mark.js
  }

  //init page-flip.js
  loadPageFlipper(){
    this.pageFlip = new St.PageFlip(this.textContainer, { 
      width: 800, 
      height: 600,
    });
    this.pageFlip.loadFromHTML(document.querySelectorAll(".my-page"));
  }

  createTextContainer(){
    this.textContainer = document.createElement("div");
    this.textContainer.classList.add("text-container");
    this.textContainer.id = "book";
    let page1 = document.createElement("div");
    page1.classList.add("my-page");
    let page2 = document.createElement("div");
    page2.classList.add("my-page");

    let container = document.createElement("div");
    container.classList.add("contain");

    this.text = document.createElement("p");
    this.text.id = "special";
    this.text.classList.add("text");

    container.appendChild(this.text);
    page2.appendChild(container);
    this.textContainer.appendChild(page1);
    this.textContainer.appendChild(page2);
  }

  flip() {
    this.pageFlip.turnToPrevPage();
    this.pageFlip.flipNext({ corner: "top" });
  }

  setText(newText) {
    this.text.innerText = newText;
  }

  setRanges(newRanges){
      this.index = 0;
      this.ranges = newRanges;
  }

  setWords(newWords){
      this.words = newWords;
  }

  startHighlighting() {
    this.interval = setInterval(() => {
        if(this.ranges[this.index]["length"] > this.ranges[this.index]["chars"])
        {
          this.index++;
          if(this.index >= this.ranges.length)
          {
            clearInterval(this.interval);
          }
        }
        else{
          this.ranges[this.index]["length"] += 1;
          this.highlight();
        }
      }, 50);
  }

  highlight() {
    this.instance.unmark();
    this.instance.markRanges(this.ranges);
    for (let i = 0; i < this.words.length; i++) {
      this.instance.mark(this.words[i], { className: "red-highlight" });
    }
  }

  clearHighlights(){
      this.instance.unmark();
  }

  getText() {
    return this.textContainer;
  }

}

