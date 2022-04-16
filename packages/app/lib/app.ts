import { initPinsCtx } from './pins';
import { createKeyboardService } from "./keyboard-service";
import { createMorseContext } from "./morse-ctx";

function bootstrap() {
  trace("Bootstraping...\n");
  const pinCtx = initPinsCtx();
  Object.freeze(pinCtx);
  trace("Pins Initialized\n");
  trace("Initializing BLE HID\n");

  pinCtx.led.write(1);

  const morseCtx = createMorseContext();

  const kbService = createKeyboardService(Object.freeze({
    deviceName: 'JS-Macro Keypad',
    onKeyboardBound: () => {
      trace(`Keyboard Bounded\n`);
    },
    onKeyboardUnbound: () => {
      trace(`Keyboard Unbounded\n`);
    },
  }));

  morseCtx.onKeySend(o => kbService.onKeyTap(o));
  morseCtx.onKeyPressing(o => kbService.onKeyDown(o));
  morseCtx.onKeyReleased(o => kbService.onKeyUp(o));
  morseCtx.onForceHistoryEmpty(() => {
    pinCtx.led.write(0);
  });

  pinCtx.addKeyDownListener((key, index) => {
    trace(`Key ${index} Pushed\n`);
    morseCtx.recordKeyDown(index);
  });
  pinCtx.addKeyUpListener((key, index) => {
    trace(`Key ${index} Released\n`);
    morseCtx.recordKeyUp(index);
  });
  trace("Listeners Working\n");
}

bootstrap();
