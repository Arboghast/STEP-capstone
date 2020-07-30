
/**
 * Book Text Viewer Scene
 */
export class Text{
    /**
     * Initializes the game with visual components.
     */

    textContainer = document.createElement("div");
    text = document.createElement("p");

    constructor() {
        this.textContainer.appendChild(this.text);
        this.textContainer.classList.add("flex-center");
        this.textContainer.setAttribute("id","book-text");
    }

    setText(newText) {
        this.text.innerText = newText;
    }

    getText() {
        return this.textContainer;
    }
}