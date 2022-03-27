/**
 * HID and scanReponse are still not supported in
 * Espruino for ESP32 at 27-Mar-2022.
 */
import type { PinKey, PinLED } from "./pins";
import * as hidKbd from "./ble_hid_keyboard";

// https://www.espruino.com/BLE+Keyboard

function initPins() {
  const led = D32 as PinLED;
  const keys = [D23, D22, D21, D19, D16, D17, D5, D18] as PinKey[];
  led.mode("output");
  led.reset();
  keys.forEach(key => {
    // https://www.espruino.com/Button
    key.mode("input_pullup");
    key.reset();
  });
  return { led, keys };
}

setTimeout(() => {
  console.log('5 seconds');
}, 1000);

setTimeout(() => {
  console.log(`D5 Mode: ${D5.getMode()}`);
  console.log(`D23 Mode: ${D23.getMode()}`);
  console.log('init start');
  const pins = initPins();

  setBusyIndicator(pins.led);

  let gatt: BluetoothRemoteGATTServer;
  let bleDev: BluetoothDevice;

  // NRF.setScanResponse([0x07,0x09, 'S', 'a', 'm', 'p', 'l', 'e']);

  NRF.setServices({
    0x1812: {
      0x2A4D: {
        value: hidKbd.reportData,
        maxLen: 1,
        writable: true,
      }
    }
  }, {uart: false});


  NRF.setAdvertising({}, {
    name: "JS-Macro Keypad",
    manufacturerData: "https://github.com/chigix/js-macro",
  });

  NRF.setAdvertising({
    // 0x1809: [Math.round(E.getTemperature())],
    0x1812: [
      0x05, 0x01,
      0x09, 0x06,
      // Advertise seems only support less than 4 bytes at present.
      // 0xA1, 0x01,       // Collection (Application)
      // 0xC0              // End Collection (Application)
    ],
  }, {
    name: "JS-Macro Keypad",
    manufacturerData: "https://github.com/chigix/js-macro",
  });

  NRF.on('connect', addr => {
    console.log(`Connected: [${addr}]`);
    NRF.requestDevice({ filters: [{ id: addr }], }).then(
      device => bleDev = device
    ).then(
      () => gatt = bleDev.gatt
    ).then(() => {
      console.log(`Connecting`);
      gatt.connect({maxInterval: 7.5, minInterval: 7.5});
    });
  });
  NRF.on('disconnect', addr => {
    console.log(`Disconnected: [${addr}]`);
  });

  pins.keys.forEach((key, i) => {
    setWatch(() => {
      console.log(`Key[${i}] rising`);
      hidKbd.tap(hidKbd.KEY.O, hidKbd.MODIFY.NONE);
    }, key, {
      repeat: false, edge: 'rising', debounce: 50
    });
    setWatch(() => {
      console.log(`Key[${i}] falling`);
      hidKbd.tap(hidKbd.KEY.O, hidKbd.MODIFY.NONE);
    }, key, {
      repeat: false, edge: 'falling', debounce: 50
    });
  });

}, 2000);
