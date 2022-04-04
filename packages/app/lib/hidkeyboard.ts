/*
 *
 * Heavily inspired from:
 * https://github.com/Moddable-OpenSource/moddable/blob/public/contributed/ble/hid-peripheral/host/hidkeyboard.js
 *
 */

const HID_A = 0x04;
const ASCII_a = 0x61;
const ASCII_1 = 0x31;
const HID_1 = 0x1e;
const HID_0 = 0x27;

const HID_ENTER = 0x28;
const HID_DOT = 0x37;
const HID_SEMICOLON = 0x33;
const HID_FORWARD_SLASH = 0x38;
const HID_SPACE = 0x2C;
const HID_BACKSPACE = 0x2A;

const HID_BT = 0x35;
const HID_MINUS = 0x2D;
const HID_EQUAL = 0x2E;
const HID_BACKSLASH = 0x31;
const HID_SINGLEQUOTE = 0x34;
const HID_COMMA = 0x36;

const HID_MODIFIERS = Object.freeze({
  LEFT_CONTROL: 0b00000001,
  LEFT_SHIFT: 0b00000010,
  LEFT_ALT: 0b00000100,
  LEFT_GUI: 0b00001000,
  RIGHT_CONTROL: 0b00010000,
  RIGHT_SHIFT: 0b00100000,
  RIGHT_ALT: 0b01000000,
  RIGHT_GUI: 0b10000000
})

export type Options = {
  /**
   * Specifies an HID code point to send to the BLE Central.
   */
  hidCode?: { id: number, page: number },
  /**
   * A single-character string indicating an ASCII character
   * to send via a keyboard report to the BLE Central.
   */
  character?: string,

  /**
   * A number with a standard keyboard 8-bit modifier mask.
   */
  modifiers?: number,
};

function getShiftedCharacter(char: string) {
  switch (char) {
    case "!":
      return "1";
    case "@":
      return "2";
    case "#":
      return "3";
    case "$":
      return "4";
    case "%":
      return "5";
    case "^":
      return "6";
    case "&":
      return "7";
    case "*":
      return "8";
    case "(":
      return "9";
    case ")":
      return "0";
    case "_":
      return "-";
    case "+":
      return "=";
    case "?":
      return "/"
    case ">":
      return ".";
    case "<":
      return ",";
    case "~":
      return "`";
    case ":":
      return ";";
    case '"':
      return "'";
    case "{":
      return "[";
    case "}":
      return "]";
    case "|":
      return "\\";
    default:
      return undefined;
  }
}

function getHIDCode(character: string) {
  let shift = false;

  const testChar = getShiftedCharacter(character);
  if (testChar !== undefined) {
    character = testChar;
    shift = true;
  }

  let value = character.charCodeAt(0);

  // Shift capital letters into lowercase letter range
  if (value <= 90 && value >= 65) {
    shift = true;
    value += 32;
  }

  if (value <= 122 && value >= 97) { // Letters
    value -= ASCII_a;
    value += HID_A;
  } else if (value == 32) { // Space
    value = HID_SPACE;
  } else if (value <= 57 && value >= 49) { // Numbers
    value -= ASCII_1;
    value += HID_1;
  } else if (value == 48) { // Zero is all alone
    value = HID_0;
  } else if (value == 59) { // Symbols are all over the place
    value = HID_SEMICOLON;
  } else if (value == 46) {
    value = HID_DOT;
  } else if (value == 47) {
    value = HID_FORWARD_SLASH;
  } else if (value == 61) {
    value = HID_EQUAL;
  } else if (value == 96) {
    value = HID_BT;
  } else if (value == 45) {
    value = HID_MINUS;
  } else if (value == 92) {
    value = HID_BACKSLASH;
  } else if (value == 39) {
    value = HID_SINGLEQUOTE;
  } else if (value == 44) {
    value = HID_COMMA;
  } else if (value == 8) {
    value = HID_BACKSPACE;
  } else if (value == 13) {
    value = HID_ENTER;
  } else {
    return undefined;
  }

  return { shift, value };
}

class HIDKeyboard {

  public report: Uint8Array;

  constructor(
  ) {
    this.report = Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 0]);
  }

  canHandle(options?: Options) {
    if (options?.hidCode?.page === 0x07) {
      return true;
    }
    if (options?.character == undefined) {
      return false;
    }
    if (getHIDCode(options.character) == undefined) {
      return false;
    }
    return true;
  }

  onKeyDown(options: Options) {
    if (options.character !== undefined) {
      const info = getHIDCode(options.character);
      if (info === undefined) {
        return;
      }
      if (info.shift) {
        this.report[0] = 0x02;
      }
      if (options.modifiers) {
        this.report[0] |= options.modifiers;
      }

      this.report[2] = info.value;
    } else if (options.hidCode?.page === 0x07) {
      this.report[0] = 0;
      this.report[2] = options.hidCode.id;
    }

  }

  onKeyUp(options: Options) {
    this.report[0] = 0;
    this.report[2] = 0;
  }
}

export { HIDKeyboard, HID_MODIFIERS };
