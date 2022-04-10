import {
  resetKeyCountHistory, bumpChangeFlag, dashDots2Char,
  attemptSpaceKey, attemptBackspaceKey, attemptEnterKey, attemptTabKey,
} from "./morse-util";
import {
  attemptStoreDashdots, attemptCommitHistory, attemptOccupyForceEmpty,
  removeLastDown,
} from "./morse-util";
import type { Options } from "./hidkeyboard";
import type { KeyCountHistory } from "./morse-util";

export function createMorseContext() {

  const _cbs = {
    sendKey: function (options: Options) {
      return;
    },
    holdKey: function (options: Options) {
      return;
    },
    releaseKey: function (options: Options) {
      return;
    },
    onForceHistoryEmpty: function () {
      return;
    }
  };

  const keyCountHistory: KeyCountHistory = {
    dashDots: [],
    keySequence: [],
    keyDownCount: [],
    keyLocks: {
      shift: false,
      ctrl: false,
      OS: false,
      searchShortcuts: false,
    },
    keyLayer: 'dashDots',
    changeFlag: 0,
  };

  class MorseContext {

    private attemptsOnKeyDown = {
      0: () => { _cbs.holdKey({ character: ' ' }); return true; },
      1: () => attemptTabKey(keyCountHistory, () => _cbs.holdKey({ character: '\t' }), () => _cbs.releaseKey({ character: '\t' })),
      2: () => attemptOccupyForceEmpty(keyCountHistory)
        || attemptTabKey(keyCountHistory, () => _cbs.holdKey({ character: '\t' }), () => _cbs.releaseKey({ character: '\t' }))
        || attemptBackspaceKey(keyCountHistory, () => _cbs.holdKey({ character: '\b' }), () => _cbs.releaseKey({ character: '\b' })),
      3: () => attemptOccupyForceEmpty(keyCountHistory)
        || attemptBackspaceKey(keyCountHistory, () => _cbs.holdKey({ character: '\b' }), () => _cbs.releaseKey({ character: '\b' })),
      4: () => true,
      5: () => attemptSpaceKey(keyCountHistory, () => _cbs.holdKey({ character: ' ' }), () => _cbs.releaseKey({ character: ' ' }))
        || attemptCommitHistory(keyCountHistory, () => this.attemptSendCharacterFromMorse()),
      6: () => attemptOccupyForceEmpty(keyCountHistory)
        || attemptSpaceKey(keyCountHistory, () => _cbs.holdKey({ character: ' ' }), () => _cbs.releaseKey({ character: ' ' }))
        || attemptEnterKey(keyCountHistory, () => _cbs.holdKey({ character: '\r' }), () => _cbs.releaseKey({ character: '\r' }))
        || attemptCommitHistory(keyCountHistory, () => this.attemptSendCharacterFromMorse()),
      7: () => attemptOccupyForceEmpty(keyCountHistory)
        || attemptEnterKey(keyCountHistory, () => _cbs.holdKey({ character: '\r' }), () => _cbs.releaseKey({ character: '\r' })),
    } as { [key: number]: () => boolean };

    private attemptsOnKeyUp = {
      0: () => { _cbs.releaseKey({ character: ' ' }); return true; },
      1: () => attemptStoreDashdots(keyCountHistory),
      2: () => this.attemptForceHistoryEmpty()
        || attemptStoreDashdots(keyCountHistory),
      3: () => this.attemptForceHistoryEmpty()
        || attemptStoreDashdots(keyCountHistory),
      4: () => true,
      5: () => attemptStoreDashdots(keyCountHistory),
      6: () => this.attemptForceHistoryEmpty()
        || attemptStoreDashdots(keyCountHistory),
      7: () => this.attemptForceHistoryEmpty()
        || attemptStoreDashdots(keyCountHistory),
    } as { [key: number]: () => boolean };

    /**
     * recordKeyDown
     */
    public recordKeyDown(keyName: number) {
      if (keyName < 0 || keyName >= 8) {
        trace(`Impossible Key index: [${keyName}]\n`);
        return;
      }
      bumpChangeFlag(keyCountHistory);
      keyCountHistory.keySequence.push(keyName);
      keyCountHistory.keyDownCount.push(keyName);
      trace(JSON.stringify(keyCountHistory), '\n');
      this.attemptsOnKeyDown[keyName]();
    }

    public recordKeyUp(keyName: number) {
      if (keyName < 0 || keyName >= 8) {
        trace(`Impossible Key index: [${keyName}]\n`);
        return;
      }
      bumpChangeFlag(keyCountHistory);
      keyCountHistory.keySequence.push(keyName + 10);
      removeLastDown(keyCountHistory, keyName);
      this.attemptsOnKeyUp[keyName]();
    }

    public onKeySend(callback: (options: Options) => void) {
      _cbs.sendKey = callback;
    }

    public onKeyPressing(callback: (options: Options) => void) {
      _cbs.holdKey = callback;
    }
    public onKeyReleased(callback: (options: Options) => void) {
      _cbs.releaseKey = callback;
    }

    public onForceHistoryEmpty(callback: () => void) {
      _cbs.onForceHistoryEmpty = callback;
    }

    private attemptSendCharacterFromMorse() {
      trace(`Current DashDots: ${keyCountHistory.dashDots}\n`);
      const character = dashDots2Char(keyCountHistory.dashDots.join(''));
      if (character === undefined) {
        trace(`${keyCountHistory.dashDots} is not implemented.\n`);
        return;
      }
      _cbs.sendKey({ character });
    }

    private attemptForceHistoryEmpty() {
      const { keySequence: _keySeq } = keyCountHistory;
      trace('Force History Empty! 1', JSON.stringify(keyCountHistory), '\n');
      if (keyCountHistory.keyDownCount.length > 0) {
        return false;
      }
      if (_keySeq.length < 8) {
        return false;
      }
      const positionCheck = {
        '2': -1, '3': -1, '6': -1, '7': -1,
        '12': -1, '13': -1, '16': -1, '17': -1,
      } as { [key: string]: number };
      for (let index = 0; index < 8; index++) {
        const position = _keySeq.length - index - 1;
        const record = _keySeq[position];
        if (positionCheck[record + ''] === undefined) {
          return false;
        }
        positionCheck[record + ''] === position;
      }
      trace('Force History Empty! 1\n');
      if ([2, 3, 6, 7].some(v => {
        return positionCheck[v] - positionCheck[10 + v] > 0;
      })) {
        return false;
      }
      trace('Force History Empty!\n');
      resetKeyCountHistory(keyCountHistory);
      _cbs.onForceHistoryEmpty();
      trace('Force History Empty!', JSON.stringify(keyCountHistory), '\n');
      return true;
    }

  }

  return Object.freeze(new MorseContext());
}
