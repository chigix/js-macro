import { initPinsCtx } from './pins';
import { createKeyboardService } from "./keyboard-service";

function bootstrap() {
  trace("Bootstraping...\n");
  const context = initPinsCtx();
  trace("Pins Initialized\n");
  trace("Initializing BLE HID\n");

  const kbService = createKeyboardService({
    deviceName: 'JS-Macro Keypad',
    onKeyboardBound: () => {
      trace(`Keyboard Bounded\n`);
    },
    onKeyboardUnbound: () => {
      trace(`Keyboard Unbounded\n`);
    }
  });

  context.addKeyDownListener((key, index) => {
    trace(`Key ${index} Pushed\n`);
    switch (index) {
      case 0:
        kbService.onKeyDown({ character: 'a' });
        break;
      case 1:
        kbService.onKeyDown({ character: 'b' });
        break;
      case 2:
        kbService.onKeyDown({ character: 'c' });
        break;
      case 3:
        kbService.onKeyDown({ character: 'd' });
        break;
      case 4:
        kbService.onKeyDown({ character: 'e' });
        break;
      case 5:
        kbService.onKeyDown({ character: 'f' });
        break;
      default:
        break;
    }
  });
  context.addKeyUpListener((key, index) => {
    trace(`Key ${index} Released\n`);
    switch (index) {
      case 0:
        kbService.onKeyUp({ character: 'a' });
        break;
      case 1:
        kbService.onKeyUp({ character: 'b' });
        break;
      case 2:
        kbService.onKeyUp({ character: 'c' });
        break;
      case 3:
        kbService.onKeyUp({ character: 'd' });
        break;
      case 4:
        kbService.onKeyUp({ character: 'e' });
        break;
      case 5:
        kbService.onKeyUp({ character: 'f' });
        break;
      default:
        break;
    }
  });
  trace("Listeners Working\n");
}

bootstrap();
