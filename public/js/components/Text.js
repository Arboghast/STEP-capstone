
/**
 * Book Text Viewer Scene
 */
export class Text{
    /**
     * Initializes the game with visual components.
     */

    textContainer = document.createElement("p");

    constructor() {
        this.textContainer.classList.add("flex-center");
        this.textContainer.setAttribute("id","book-text");
    }

    setText(newText) {
        this.textContainer.innerText = newText;
    }

    getText() {
        return this.textContainer;
    }
}