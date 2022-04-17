import Timer from "timer";
import { KeyLayer, PUSH_KEY, RELEASE_KEY } from "./morse-consts";
import { KeyCountBuffer } from "./morse-buffer";

/**
 * 0b00000000
 */
type KeyMapBuffer = number;

const FORCE_EMPTY_KEY_PATTERNS = [
  0b00110011, 0b00110010, 0b00110001, 0b00100011, 0b00010011,
];
Object.freeze(FORCE_EMPTY_KEY_PATTERNS);

const SEBT_KEY_PATTERNS = [
  0b01100000, 0b00110000, 0b00000110, 0b00000011,
];
Object.freeze(SEBT_KEY_PATTERNS);

const SEBT_KEY_REVERSE = SEBT_KEY_PATTERNS.map(p => ~p + 256);
Object.freeze(SEBT_KEY_REVERSE);

const dashDots2NumArr: {
  [key: string]: (ctx: KeyCountBuffer) => void,
} = {
  '1': (ctx: KeyCountBuffer) => ctx.dashDots.push(0),
  '5': (ctx: KeyCountBuffer) => ctx.dashDots.push(1),
  '3': (ctx: KeyCountBuffer) => {
    ctx.dashDots.push(0);
    ctx.dashDots.push(0);
  },
  '2': (ctx: KeyCountBuffer) => {
    ctx.dashDots.push(0);
    ctx.dashDots.push(1);
  },
  '6': (ctx: KeyCountBuffer) => {
    ctx.dashDots.push(1);
    ctx.dashDots.push(0);
  },
  '7': (ctx: KeyCountBuffer) => {
    ctx.dashDots.push(1);
    ctx.dashDots.push(1);
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
  let _keySeq: Uint8Array | undefined = ctx.keySequence.recentThumb();
  let prevPatternExpect: number | undefined = 0;
  for (let index = _keySeq.length - 3; index > _keySeq.length - 5; index--) {
    if (_keySeq[index] < 10) {
      prevPatternExpect |= PUSH_KEY[_keySeq[index]];
    } else {
      _keySeq = undefined;
      return false;
    }
  }
  if (SEBT_KEY_PATTERNS.indexOf(prevPatternExpect & 0b01110111) === -1) {
    _keySeq = undefined;
    return false;
  }
  prevPatternExpect = undefined;
  let lastPatternExpect: number | undefined = 255;
  for (let index = _keySeq.length - 1; index > _keySeq.length - 3; index--) {
    if (_keySeq[index] >= 10) {
      lastPatternExpect &= RELEASE_KEY[_keySeq[index] - 10];
    } else {
      _keySeq = undefined;
      return false;
    }
  }
  _keySeq = undefined;
  if (SEBT_KEY_REVERSE.indexOf(lastPatternExpect & 0b01110111) === -1) {
    lastPatternExpect = undefined;
    return false;
  }
  lastPatternExpect = undefined;
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

export function attemptCommitHistory(ctx: KeyCountBuffer, commit: () => void) {
  if (ctx.dashDots.length < 1) {
    return false;
  }
  if (ctx.keyLayer !== KeyLayer.DASHDOTS) {
    return false;
  }
  if ((ctx.keyPushed & 0b01110111) !== 0b00000110) {
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
