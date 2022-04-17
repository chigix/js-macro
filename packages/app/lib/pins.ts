import Digital from 'pins/digital';
import Timer from 'timer';

const key_pins = [23, 22, 21, 19, 16, 17, 5, 18];

type keyListener = (key: Digital, index: number) => void;

export function initPinsCtx() {
  const led = new Digital(32, Digital.Output);

  const keys = key_pins.map(pin => new Digital(pin, Digital.InputPullUp));

  const risingListeners: Array<keyListener> = [];
  const fallingListeners: Array<keyListener> = [];

  keys.forEach((key, index) => {
    let previous = 0;
    Timer.repeat(() => {
      const current = key.read();
      if (current === previous) {
        return;
      }
      if (current === 0) {
        fallingListeners.forEach(l => l(key, index));
      } else {
        risingListeners.forEach(l => l(key, index));
      }
      // trace(`Key ${index} State Changed: ${previous} ==> ${current}\n`);
      previous = current;
    }, 50);
  });

  return Object.freeze({
    led, keys,
    addKeyUpListener: (l: keyListener) => risingListeners.push(l),
    addKeyDownListener: (l: keyListener) => fallingListeners.push(l),
  });
}
