import Timer from "timer";
import { HID_MODIFIERS } from "./hidkeyboard";
import { KeyLayer, ModifyLayer } from "./morse-consts";
import { KeyCountBuffer } from "./morse-buffer";

/**
 * 0b00000000
 */
type KeyMapBuffer = number;

const FORCE_EMPTY_KEY_STRICT_PATTERN = 0b00110011;
const FORCE_EMPTY_KEY_PATTERNS = [
  FORCE_EMPTY_KEY_STRICT_PATTERN, 0b00110010, 0b00110001, 0b00100011, 0b00010011,
];
Object.freeze(FORCE_EMPTY_KEY_PATTERNS);

const SEBT_KEY_PATTERNS = [
  0b01100000, 0b00110000, 0b00000110, 0b00000011,
];
Object.freeze(SEBT_KEY_PATTERNS);

const KEYLAYER_CHANGE_STRICT_PATTERN = 0b11001100;
const KEYLAYER_CHANGE_PATTERNS = [
  KEYLAYER_CHANGE_STRICT_PATTERN, 0b01001100, 0b10001100, 0b11000100, 0b11001000,
];
Object.freeze(KEYLAYER_CHANGE_PATTERNS);

const MODIFYLAYER_CHANGE_PATTERN = 0b10001000;
Object.freeze(MODIFYLAYER_CHANGE_PATTERN);

const MODIFYLAYER_CHANGE_REVERSE = ~MODIFYLAYER_CHANGE_PATTERN + 256;
Object.freeze(MODIFYLAYER_CHANGE_REVERSE);


const dashDots2NumArr: {
  [key: string]: (ctx: KeyCountBuffer) => void,
} = {
  '1': (ctx: KeyCountBuffer) => ctx.dashDots.push(1),
  '5': (ctx: KeyCountBuffer) => ctx.dashDots.push(0),
  '3': (ctx: KeyCountBuffer) => {
    ctx.dashDots.push(1);
    ctx.dashDots.push(1);
  },
  '2': (ctx: KeyCountBuffer) => {
    ctx.dashDots.push(1);
    ctx.dashDots.push(0);
  },
  '6': (ctx: KeyCountBuffer) => {
    ctx.dashDots.push(0);
    ctx.dashDots.push(1);
  },
  '7': (ctx: KeyCountBuffer) => {
    ctx.dashDots.push(0);
    ctx.dashDots.push(0);
  },
};
Object.freeze(dashDots2NumArr);

function sebtKeyTemplate(ctx: KeyCountBuffer, keyExpect: KeyMapBuffer,
  holdKey: () => void, releaseKey: () => void) {
  trace(`${ctx.changeFlag} -> sebtKeyTemplate!\n`);
  if (ctx.keyLayer !== KeyLayer.DASHDOTS) {
    return false;
  }
  if (ctx.dashDots.length > 0) {
    trace(`${ctx.changeFlag} -> sebtKeyTemplate Rejected: dashdots is not empty\n`);
    return false;
  }
  trace(`${ctx.changeFlag} -> Keypair: ${keyExpect.toString(2)}\n`);
  if ((ctx.keyPushed & 0b01110111) !== keyExpect) {
    return false;
  }
  let flagSnapshot: number | undefined = ctx.changeFlag;
  let initTimer: Timer | undefined = Timer.set(() => {
    if (initTimer) {
      Timer.clear(initTimer);
    }
    initTimer = undefined;
    if (ctx.changeFlag !== flagSnapshot) {
      return false;
    }
    if ((ctx.keyPushed & 0b01110111) !== keyExpect) {
      return false;
    }
    trace(`${ctx.changeFlag} -> SEBT Key! (Hold Key)\n`);
    holdKey();
  }, 10);
  // https://www.researchgate.net/publication/345984016_How_long_is_a_long_key_press
  let repeatTimer: Timer | undefined = Timer.repeat(() => {
    if (ctx.changeFlag === flagSnapshot
      && (ctx.keyPushed & 0b01110111) === keyExpect) {
      return true;
    }
    if (repeatTimer) {
      Timer.clear(repeatTimer);
    }
    repeatTimer = undefined;
    flagSnapshot = undefined;
    releaseKey();
    return false;
  }, 50);
  return true;
}

export function attemptOccupySebtRelease(ctx: KeyCountBuffer) {
  let frames: Array<number | null> | undefined;
  trace(`${ctx.changeFlag} -> attempt Sebt Release 0\n`);
  if (ctx.keyPushed === 0) {
    // 2 Keys are perfectly released.
    frames = ctx.keySequence.frameFromLast(2, 2);
  } else {
    // Still one key is not released.
    frames = ctx.keySequence.frameFromLast(1, 2);
  }
  if (frames[1] === null) {
    return false;
  }
  trace(`${ctx.changeFlag} -> attempt Sebt Release 1\n`);
  if (SEBT_KEY_PATTERNS.indexOf(frames[1]) < 0) {
    frames = undefined;
    return false;
  }
  trace(`${ctx.changeFlag} -> attempt Sebt Release 2\n`);
  if (frames[0] === null) {
    return false;
  }
  trace(`${ctx.changeFlag} -> attempt Sebt Release: TRUE\n`);
  frames = undefined;
  return true;
}

export function attemptOccupyForceEmpty(ctx: KeyCountBuffer) {
  if (FORCE_EMPTY_KEY_PATTERNS.indexOf((ctx.keyPushed & 0b01110111)) > -1) {
    trace(`${ctx.changeFlag} -> attemptOccupyForceEmpty: TRUE\n`);
    return true;
  }
  trace(`${ctx.changeFlag} -> attemptOccupyForceEmpty: FALSE\n`);
  return false;
}

export function attemptForceEmpty(ctx: KeyCountBuffer, callback: () => void) {
  let releasedCount: number | undefined =
    ctx.keySequence.recentThumb().slice().reverse().findIndex(v => v < 10);
  if (releasedCount < 0) {
    releasedCount = undefined;
    return false;
  }
  let frames: Array<number | null> | undefined = ctx.keySequence.frameFromLast(releasedCount, 4);
  if (frames && frames[1] !== FORCE_EMPTY_KEY_STRICT_PATTERN) {
    releasedCount = undefined;
    frames = undefined;
    return false;
  }
  if (releasedCount < 4) {
    releasedCount = undefined;
    frames = undefined;
    return true;
  }
  releasedCount = undefined;
  frames = undefined;
  ctx.resetAll();
  trace(`${ctx.changeFlag} -> Force History Empty!`, ctx.toString(), '\n');
  callback();
  return true;
}

export function attemptOccupyKeyLayerChange(ctx: KeyCountBuffer) {
  if (KEYLAYER_CHANGE_PATTERNS.indexOf((ctx.keyPushed & 255)) > -1) {
    return true;
  }
  return false;
}

export function attemptKeyLayerChange(ctx: KeyCountBuffer) {
  let releasedCount: number | undefined =
    ctx.keySequence.recentThumb().slice().reverse().findIndex(v => v < 10);
  if (releasedCount < 0) {
    releasedCount = undefined;
    return false;
  }
  let frames: Array<number | null> | undefined = ctx.keySequence.frameFromLast(releasedCount, 4);
  if (frames && frames[1] !== KEYLAYER_CHANGE_STRICT_PATTERN) {
    releasedCount = undefined;
    frames = undefined;
    return false;
  }
  if (releasedCount < 4) {
    releasedCount = undefined;
    frames = undefined;
    return true;
  }
  frames = undefined;
  releasedCount = undefined;
  ctx.keyLayer = (ctx.keyLayer + 1) % 4;
  // Because this key combination conflicts with ctrl, shift, gui.
  ctx.keyLocks.resetBuffer();
  trace(`${ctx.changeFlag} -> KeyLayer Changed`);
  return true;
}

export function attemptModifyLayerChange(ctx: KeyCountBuffer) {
  trace(`${ctx.changeFlag} -> attemptModifyLayer Change ${ctx.keyPushed}\n`);
  if (ctx.keyPushed !== MODIFYLAYER_CHANGE_PATTERN) {
    return false;
  }
  let waitingTimer: Timer | undefined = Timer.set(() => {
    if (waitingTimer) {
      Timer.clear(waitingTimer);
    }
    waitingTimer = undefined;
    trace(`${ctx.changeFlag} -> attemptModifyLayer Change Waiting\n`);
    if (ctx.keySequence.frameFromLast(2)[0] === MODIFYLAYER_CHANGE_REVERSE) {
      trace(`${ctx.changeFlag} -> ModifyLayer Changed`);
      ctx.modifyLayer = (ctx.modifyLayer + 1) % 3;
      ctx.keyLocks.resetBuffer();
    } else {
      trace(`${ctx.changeFlag} -> ModifyLayer Change Timeout`);
    }
  }, 150);
  return true;
}

export function attemptCommitHistory(ctx: KeyCountBuffer, commit: () => void) {
  if (ctx.dashDots.length < 1) {
    return false;
  }
  if (ctx.keyLayer !== KeyLayer.DASHDOTS) {
    return false;
  }
  if (ctx.keySequence.frameFromLast(2)[0] !== 0b00000110) {
    return false;
  }
  trace(`${ctx.changeFlag} -> Commit History!\n`);
  commit();
  // resetKeyCountHistory is forbidden, because key layer should be kept.
  ctx.dashDots.resetBuffer();
  ctx.keySequence.resetBuffer();
  trace(`${ctx.changeFlag} -> Commit History!`, ctx.toString(), '\n');
  return true;
}

export function attemptSpaceKey(ctx: KeyCountBuffer, spaceKey: () => void, spaceRelease: () => void) {
  return sebtKeyTemplate(ctx, 0b00000110, spaceKey, spaceRelease);
}
export function attemptBackspaceKey(ctx: KeyCountBuffer, backKey: () => void, backRelease: () => void) {
  return sebtKeyTemplate(ctx, 0b00110000, backKey, backRelease);
}
export function attemptTabKey(ctx: KeyCountBuffer, tabKey: () => void, tabRelease: () => void) {
  return sebtKeyTemplate(ctx, 0b01100000, tabKey, tabRelease);
}
export function attemptEnterKey(ctx: KeyCountBuffer, enterKey: () => void, enterRelease: () => void) {
  return sebtKeyTemplate(ctx, 0b00000011, enterKey, enterRelease);
}

export function attemptCtrlModify(ctx: KeyCountBuffer) {
  if (ctx.modifyLayer === ModifyLayer.SH_GUI) {
    return false;
  }
  if ((ctx.keyPushed & 0b10001000) === 0b10000000) {
    // Empty
  } else {
    ctx.keyLocks.ctrl = false;
    return true;
  }
  ctx.keyLocks.ctrl = true;
  return true;
}

export function attemptShiftModify(ctx: KeyCountBuffer) {
  if (ctx.modifyLayer === ModifyLayer.CT_SH) {
    if ((ctx.keyPushed & 0b10001000) === 0b00001000) {
      ctx.keyLocks.shift = true;
      return true;
    } else if (ctx.keySequence.frameFromLast(1)[0] === 0b11110111) {
      ctx.keyLocks.shift = false;
      return true;
    } else {
      return false;
    }
  } else if (ctx.modifyLayer === ModifyLayer.SH_GUI) {
    if ((ctx.keyPushed & 0b10001000) === 0b10000000) {
      ctx.keyLocks.shift = true;
      return true;
    } else if (ctx.keySequence.frameFromLast(1)[0] === 0b01111111) {
      ctx.keyLocks.shift = false;
      return true;
    } else {
      return false;
    }
  }
  return false;
}

export function attemptGuiModify(ctx: KeyCountBuffer) {
  if (ctx.modifyLayer === ModifyLayer.CT_SH) {
    return false;
  }
  if ((ctx.keyPushed & 0b10001000) === 0b00001000) {
    // Empty
  } else {
    ctx.keyLocks.gui = false;
    return true;
  }
  ctx.keyLocks.gui = true;
  return true;
}

export function attemptArrowPageKey(ctx: KeyCountBuffer, holdKey: () => void, releaseKey: () => void) {
  if (ctx.keyLayer !== KeyLayer.ARROWS) {
    return false;
  }
  let flagSnapshot: number | undefined = ctx.changeFlag;
  let initTimer: Timer | undefined = Timer.set(() => {
    if (initTimer) {
      Timer.clear(initTimer);
    }
    initTimer = undefined;
    if (ctx.changeFlag !== flagSnapshot) {
      return false;
    }
    holdKey();
  });
  let repeatTimer: Timer | undefined = Timer.repeat(() => {
    if (ctx.changeFlag === flagSnapshot) {
      return true;
    }
    if (repeatTimer) {
      Timer.clear(repeatTimer);
    }
    repeatTimer = undefined;
    flagSnapshot = undefined;
    releaseKey();
    return false;
  }, 50);
  return true;
}

export function attemptStoreDashdots(ctx: KeyCountBuffer) {
  if (ctx.keyLayer !== KeyLayer.DASHDOTS) {
    return false;
  }
  let recent: Uint8Array | undefined = ctx.keySequence.recentThumb()
    .slice(-2);
  if (recent.length < 2) {
    recent = undefined;
    return false;
  }
  if (recent[1] - recent[0] === 10) {
    trace(`${ctx.changeFlag} -> Dashdots Stored\n`);
    dashDots2NumArr[recent[0]](ctx);
    trace(`${ctx.changeFlag} -> Dashdots Stored`, ctx.toString(), '\n');
  }
  recent = undefined;
  return true;
}

/**
 * @param dashdots
 * @returns
 * @url https://www.makoa.org/jlubin/morsecode.htm
 */
export function dashDots2Char(dashdots: string) {
  return {
    '01': 'a',
    '1000': 'b',
    '1010': 'c',
    '100': 'd',
    '0': 'e',
    '0010': 'f',
    '110': 'g',
    '0000': 'h',
    '00': 'i',
    '0111': 'j',
    '101': 'k',
    '0100': 'l',
    '11': 'm',
    '10': 'n',
    '111': 'o',
    '0110': 'p',
    '1101': 'q',
    '010': 'r',
    '000': 's',
    '1': 't',
    '001': 'u',
    '0001': 'v',
    '011': 'w',
    '1001': 'x',
    '1011': 'y',
    '1100': 'z',
    '011010': '@',
    '01000': '&',
    '01111': '1',
    '00111': '2',
    '00011': '3',
    '00001': '4',
    '00000': '5',
    '10000': '6',
    '11000': '7',
    '11100': '8',
    '11110': '9',
    '11111': '0',
    '101011': '!',
    '001100': '?',
    '111000': ':',
    '101010': ';',
    '010101': '.',
    '110011': ',',
    '011110': '\'',
    '010010': '"',
    '000000': '^',
    '001101': '_',
    '10101': '\\',
    '110101': '|',
    '11010': '#',
    '011100': '~',
    '10110': '(',
    '101101': ')',
    '10111': '<',
    '101111': '>',
    '01101': '{',
    '011011': '}',
    '01100': '[',
    '011001': ']',
    '11101': '%',
    '00010': '*',
    '01010': '+',
    '10010': '/',
    '100001': '-',
    '10001': '=',
    '100101': '`',
    '000100': '$',
    '110000': 'esc',
    '001001': 'prtscn',
  }[dashdots];
}

export function modifierBits(ctx: KeyCountBuffer) {
  let modifiers: number | undefined = 0;
  if (ctx.keyLocks.ctrl) {
    modifiers |= HID_MODIFIERS.LEFT_CONTROL;
  }
  if (ctx.keyLocks.shift) {
    modifiers |= HID_MODIFIERS.LEFT_SHIFT;
  }
  if (ctx.keyLocks.gui) {
    modifiers |= HID_MODIFIERS.LEFT_GUI;
  }
  return modifiers;
}
