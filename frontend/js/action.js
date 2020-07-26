export class Action {
    /**
     * @param {*} scene which serves as a container of all visual elements
     */
    constructor(scene) {
        this.canvas = window.interactiveCanvas;
        this.scene = scene;
        this.commands = {
            TINT: (data) => {
                this.scene.sprite.tint = data.tint;
            },
            SPIN: (data) => {
                this.scene.sprite.spin = data.spin;
            },
            RESTART_GAME: (data) => {
                this.scene.button.texture = this.scene.button.textureButton;
                this.scene.sprite.spin = true;
                this.scene.sprite.tint = 0x00FF00; // green
                this.scene.sprite.rotation = 0;
            },
        };
        this.commands.TINT.bind(this);
        this.commands.SPIN.bind(this);
        this.commands.RESTART_GAME.bind(this);
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
        };
        callbacks.onUpdate.bind(this);
        // called by the Interactive Canvas web app once web app has loaded to
        // register callbacks
        this.canvas.ready(callbacks);
    }
}
