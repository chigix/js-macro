import { BLEServer } from "bleserver";
import { uuid } from "btutils";
import { HIDKeyboard } from "./hidkeyboard";
import type { Characteristic, Client } from "gatt";
import type { Options } from "./hidkeyboard";

export function createKeyboardService(_params: {
  deviceName: string,
  onKeyboardBound: (kb: BLEServer) => void,
  onKeyboardUnbound: (kb: BLEServer) => void,
}) {

  const _keyboard = new HIDKeyboard();
  let _bound = false;
  const keyboardAdvertise = {
    advertisingData: {
      flags: 6, completeName: _params.deviceName,
      incompleteUUID16List: [uuid('1812'), uuid('180f')],
      appearance: 0x03C1, // Keyboard Appearance
    },
  };

  class KeyboardService extends BLEServer {

    private keyboardReportCharacteristic?: Characteristic;
    private mediaReportCharacteristic?: Characteristic;
    private batteryCharacteristic?: Characteristic;

    onReady(): void {
      this.deviceName = _params.deviceName;
      this.securityParameters = { encryption: true, bonding: true };
      this.keyboardReportCharacteristic = undefined;
      this.mediaReportCharacteristic = undefined;
      this.startAdvertising(keyboardAdvertise);
    }


    onConnected(device: Client): void {
      trace(`Device Connected: [${device.address}]\n`);
      this.stopAdvertising();
    }

    onDisconnected(device: Client): void {
      trace(`Device Disconnected: [${device.address}]\n`);
      _params.onKeyboardUnbound(this);
      this.keyboardReportCharacteristic = undefined;
      this.mediaReportCharacteristic = undefined;
      this.startAdvertising(keyboardAdvertise);
    }

    onCharacteristicNotifyEnabled(ch: Characteristic): void {
      if ('keyboard_input_report' === ch.name) {
        this.keyboardReportCharacteristic = ch;
        trace(`keyboard Report bound by request: [${ch.name}]\n`);
        if (!_bound) {
          _bound = true;
          _params.onKeyboardBound(this);
        }
      } else if ('media_input_report' === ch.name) {
        this.mediaReportCharacteristic = ch;
        trace(`media Report bound by request: [${ch.name}]\n`);
        if (!_bound) {
          _bound = true;
          _params.onKeyboardBound(this);
        }
      } else if ('battery' === ch.name) {
        this.batteryCharacteristic = ch;
        this.notifyValue(this.batteryCharacteristic, 85);
        trace(`battery bound by request: [${ch.name}]\n`);
      } else {
        trace(`request to bind characteristic: ${JSON.stringify(ch)}\n`);
      }
    }

    onCharacteristicRead(ch: Characteristic): Uint8Array | undefined | number[] {
      switch (ch.name) {
        case 'media_input_report':
          trace('media_input_report is still not implemented\n');
          return _keyboard.mediaReport;
        case 'keyboard_input_report':
          trace('keyboard_input_report is still not implemented\n');
          return _keyboard.report;
        case 'control_point':
          return [0, 0];
        default:
          trace(`unhandled read of characteristic: ${ch.name}\n`);
          break;
      }
    }

    /**
     * notifyKeyboard
     */
    public notifyKeyboard() {
      if (this.keyboardReportCharacteristic) {
        this.notifyValue(this.keyboardReportCharacteristic, _keyboard.report);
      } else {
        trace(`not connected ${_keyboard.report}\n`);
      }
    }

    /**
     * notifyMedia
     */
    public notifyMedia() {
      if (this.mediaReportCharacteristic) {
        this.notifyValue(this.mediaReportCharacteristic, _keyboard.mediaReport);
      } else {
        trace(`not connected ${_keyboard.mediaReport}\n`);
      }
    }

    /**
     * onKeyUp
     */
    public onKeyUp() {
      _keyboard.onKeyUp();
      this.notifyKeyboard();
    }

    /**
     * onKeyDown
     */
    public onKeyDown(options: Options) {
      if (_keyboard.canHandle(options)) {
        _keyboard.onKeyDown(options);
        this.notifyKeyboard();
      }
    }

    /**
     * onKeyTap
     */
    public onKeyTap(options: Options) {
      this.onKeyDown(options);
      this.onKeyUp();
    }

    /**
     * onMediaDown
     */
    public onMediaSend(code: number) {
      trace(`Sending Media Key Code: ${code}\n`);
      _keyboard.onMediaDown(code);
      this.notifyMedia();
      _keyboard.onMediaUp();
      this.notifyMedia();
    }

  }

  return new KeyboardService();

}
