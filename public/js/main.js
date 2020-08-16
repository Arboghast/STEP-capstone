import {Action} from './Action.js';
import {Home} from './Home.js';

window.addEventListener('load', () => {
  window.scene = new Home();

  // Set Google Assistant Canvas Action at scene level
  window.scene.action = new Action(scene);
  // Call setCallbacks to register interactive canvas
  window.scene.action.setCallbacks();
});
