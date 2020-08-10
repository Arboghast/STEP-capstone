import Mark from "mark.js";

/**
 * Book Text Viewer Scene
 */
export class Text{
    /**
     * Initializes the game with visual components.
     */

    textContainer = document.createElement("div");
    text = document.createElement("p");
    instance;

    constructor() {
        this.textContainer.appendChild(this.text);
        this.textContainer.classList.add("flex-center");
        this.textContainer.setAttribute("id","book-text");
        this.instance = new Mark(document.getElementById("book-text"));
    }

    setText(newText) {
        this.text.innerText = newText;
    }

    getText() {
        return this.textContainer;
    }

    setInstance(highlight){
        this.instance.mark(highlight);
    }

    hideText(){
        this.textContainer.setAttribute("style", "display:none");
    }

    showText(){
        this.textContainer.setAttribute("style", "display:flex");
    }
}