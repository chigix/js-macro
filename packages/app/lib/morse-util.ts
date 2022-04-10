import Timer from "timer";

const FORCE_EMPTY_KEY_PAIR = Object.freeze([2, 3, 6, 7]);

export type KeyCountHistory = {
  dashDots: number[],
  keySequence: number[],
  keyDownCount: number[],
  keyLocks: {
    shift: boolean,
    ctrl: boolean,
    OS: boolean,
    searchShortcuts: boolean,
  },
  keyLayer: 'dashDots' | 'numbers' | 'arrows' | 'media',
  changeFlag: number,
};

export type KeyCountHistoryRemovable = {
  dashDots?: number[],
  keySequence?: number[],
  keyDownCount?: number[],
  keyLocks: {
    shift: boolean,
    ctrl: boolean,
    OS: boolean,
    searchShortcuts: boolean,
  },
  keyLayer?: 'dashDots' | 'numbers' | 'arrows' | 'media',
  changeFlag?: number,
};

const dashDots2NumArr: {
  [key: string]: (ctx: KeyCountHistory) => void,
} = Object.freeze({
  '1': (ctx: KeyCountHistory) => ctx.dashDots.push(0),
  '5': (ctx: KeyCountHistory) => ctx.dashDots.push(1),
  '3': (ctx: KeyCountHistory) => {
    let len: number | undefined = ctx.dashDots.length;
    ctx.dashDots[len] = 0;
    ctx.dashDots[len + 1] = 0;
    len = undefined;
  },
  '2': (ctx: KeyCountHistory) => {
    let len: number | undefined = ctx.dashDots.length;
    ctx.dashDots[len] = 0;
    ctx.dashDots[len + 1] = 1;
    len = undefined;
  },
  '6': (ctx: KeyCountHistory) => {
    let len: number | undefined = ctx.dashDots.length;
    ctx.dashDots[len] = 1;
    ctx.dashDots[len + 1] = 0;
    len = undefined;
  },
  '7': (ctx: KeyCountHistory) => {
    let len: number | undefined = ctx.dashDots.length;
    ctx.dashDots[len] = 1;
    ctx.dashDots[len + 1] = 1;
    len = undefined;
  },
});

function sebtKeyTemplate(ctx: KeyCountHistory, keyPair: number[],
  holdKey: () => void, releaseKey: () => void) {
  let pressing: boolean | undefined = false;
  if (ctx.keyLayer !== 'dashDots') {
    return false;
  }
  if (ctx.dashDots.length > 0) {
    return false;
  }
  trace('Keypair: ', keyPair.join(', '), '  \n');
  if (keyPair.some(
    v => {
      let occur: number | undefined = ctx.keyDownCount.lastIndexOf(v);
      let len: number | undefined = ctx.keyDownCount.length;
      if (occur < 0 || len - occur > 2) {
        occur = undefined;
        len = undefined;
        return true;
      }
      occur = undefined;
      len = undefined;
    })) {
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
    trace('SEBT Key! (Hold Key)\n');
    pressing = true;
    holdKey();
  }, 10);
  // https://www.researchgate.net/publication/345984016_How_long_is_a_long_key_press
  let repeatTimer: Timer | undefined = Timer.repeat(() => {
    if (ctx.changeFlag !== flagSnapshot) {
      if (repeatTimer) {
        Timer.clear(repeatTimer);
      }
      repeatTimer = undefined;
      flagSnapshot = undefined;
      if (pressing) {
        releaseKey();
        resetKeyCountHistory(ctx);
      }
      pressing = undefined;
      return false;
    }
  }, 50);
  return true;
}

export function resetKeyCountHistory(ctx: KeyCountHistoryRemovable) {
  // ctx.dashDots = undefined;
  ctx.dashDots = [];
  // ctx.keyDownCount = undefined;
  ctx.keyDownCount = [];
  ctx.keyLayer = 'dashDots';
  ctx.keyLocks.shift = false;
  ctx.keyLocks.ctrl = false;
  ctx.keyLocks.OS = false;
  ctx.keyLocks.searchShortcuts = false;
  // ctx.keySequence = undefined;
  ctx.keySequence = [];
}

export function bumpChangeFlag(ctx: KeyCountHistory) {
  if (ctx.changeFlag > 1000) {
    ctx.changeFlag = 0;
  }
  ctx.changeFlag++;
}

export function attemptOccupyForceEmpty(ctx: KeyCountHistory) {
  let matchingCount: number | undefined = 0;
  for (const v of FORCE_EMPTY_KEY_PAIR) {
    let occur: number | undefined = ctx.keyDownCount.lastIndexOf(v);
    let len: number | undefined = ctx.keyDownCount.length;
    if (occur < 0 || len - occur > 4) {
      occur = undefined;
      len = undefined;
      continue;
    }
    matchingCount++;
  }
  if (matchingCount > 2) {
    trace('Attempt Occupy Force Empty! # 5\n');
    matchingCount = undefined;
    return true;
  } else {
    matchingCount = undefined;
    return false;
  }
}

export function attemptCommitHistory(ctx: KeyCountHistory, commit: () => void) {
  if (ctx.dashDots.length < 1) {
    return false;
  }
  if (ctx.keyDownCount.length !== 2) {
    return false;
  }
  if ([5, 6].some(
    v => ctx.keyDownCount.lastIndexOf(v) < 0)) {
    return false;
  }
  trace('Commit History!');
  commit();
  // resetKeyCountHistory is forbidden, because key layer should be kept.
  ctx.keyDownCount = [];
  ctx.dashDots = [];
  ctx.keySequence = [];
  trace('Commit History!', JSON.stringify(ctx), '\n');
  return true;
}

export function attemptSpaceKey(ctx: KeyCountHistory, spaceKey: () => void, spaceRelease: () => void) {
  return sebtKeyTemplate(ctx, [5, 6], spaceKey, spaceRelease);
}
export function attemptBackspaceKey(ctx: KeyCountHistory, backKey: () => void, backRelease: () => void) {
  return sebtKeyTemplate(ctx, [2, 3], backKey, backRelease);
}
export function attemptTabKey(ctx: KeyCountHistory, tabKey: () => void, tabRelease: () => void) {
  return sebtKeyTemplate(ctx, [1, 2], tabKey, tabRelease);
}
export function attemptEnterKey(ctx: KeyCountHistory, enterKey: () => void, enterRelease: () => void) {
  return sebtKeyTemplate(ctx, [6, 7], enterKey, enterRelease);
}

export function attemptStoreDashdots(ctx: KeyCountHistory) {
  if (ctx.keyLayer !== 'dashDots') {
    return false;
  }
  let len: number | undefined = ctx.keySequence.length;
  let shouldBeUpKey: number | undefined = ctx.keySequence[len - 1];
  let shouldBeDownKey: number | undefined = ctx.keySequence[len - 2];
  if (shouldBeUpKey - shouldBeDownKey === 10) {
    trace('Dashdots Stored\n');
    dashDots2NumArr[shouldBeDownKey](ctx);
    trace('Dashdots Stored', JSON.stringify(ctx), '\n');
  }
  len = undefined;
  shouldBeUpKey = undefined;
  shouldBeDownKey = undefined;
  return true;
}

export function removeLastDown(ctx: KeyCountHistory, keyName: number) {
  const { keyDownCount: _downCount } = ctx;
  const popped = [] as number[];
  while (_downCount.length > 0) {
    const checkNumber = _downCount.pop();
    if (checkNumber === undefined) {
      return false;
    }
    if (checkNumber === keyName) {
      break;
    }
    popped.push(checkNumber);
  }
  popped.forEach(v => _downCount.push(v));
  return true;
}

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
  }[dashdots];
}
