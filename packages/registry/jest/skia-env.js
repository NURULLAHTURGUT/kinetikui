const { TestEnvironment } = require('jest-environment-node');
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit');

/** Node environment with CanvasKit loaded, so @shopify/react-native-skia's Jest mock can draw. */
class SkiaEnvironment extends TestEnvironment {
  async setup() {
    await super.setup();
    this.global.CanvasKit = await CanvasKitInit({});
  }
}

module.exports = SkiaEnvironment;
