import { KeyName, PUSH_KEY, RELEASE_KEY } from "./morse-consts";
import { KeyCountBuffer } from "./morse-buffer";
import {
  attemptSpaceKey, attemptBackspaceKey, attemptEnterKey, attemptTabKey,
  attemptOccupySebtRelease, attemptOccupyForceEmpty,
} from "./morse-util";
import {
  modifierBits, attemptModifyLayerChange,
  attemptCtrlModify, attemptShiftModify, attemptGuiModify,
  dashDots2Char, attemptStoreDashdots, attemptCommitHistory,
} from "./morse-util";
import { Options, HID_MODIFIERS } from "./hidkeyboard";

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

  const history = new KeyCountBuffer();

  class MorseContext {

    private attemptsOnKeyDown = {
      0: () => {
        attemptModifyLayerChange(history);
        attemptCtrlModify(history) || attemptShiftModify(history);
        return true;
      },
      1: () => attemptTabKey(history, () => _cbs.holdKey({ modifiers: modifierBits(history), character: '\t' }), () => _cbs.releaseKey({ modifiers: modifierBits(history), character: '\t' })),
      2: () => attemptOccupyForceEmpty(history)
        || attemptTabKey(history, () => _cbs.holdKey({ modifiers: modifierBits(history), character: '\t' }), () => _cbs.releaseKey({ modifiers: modifierBits(history), character: '\t' }))
        || attemptBackspaceKey(history, () => _cbs.holdKey({ modifiers: modifierBits(history), character: '\b' }), () => _cbs.releaseKey({ modifiers: modifierBits(history), character: '\b' })),
      3: () => attemptOccupyForceEmpty(history)
        || attemptBackspaceKey(history, () => _cbs.holdKey({ modifiers: modifierBits(history), character: '\b' }), () => _cbs.releaseKey({ modifiers: modifierBits(history), character: '\b' })),
      4: () => {
        attemptModifyLayerChange(history);
        attemptShiftModify(history) || attemptGuiModify(history);
        return true;
      },
      5: () => attemptSpaceKey(history, () => _cbs.holdKey({ modifiers: 0, character: ' ' }), () => _cbs.releaseKey({ modifiers: 0, character: ' ' }))
        || attemptCommitHistory(history, () => this.attemptSendCharacterFromMorse()),
      6: () => attemptOccupyForceEmpty(history)
        || attemptSpaceKey(history, () => _cbs.holdKey({ modifiers: 0, character: ' ' }), () => _cbs.releaseKey({ modifiers: 0, character: ' ' }))
        || attemptEnterKey(history, () => _cbs.holdKey({ modifiers: 0, character: '\r' }), () => _cbs.releaseKey({ modifiers: 0, character: '\r' }))
        || attemptCommitHistory(history, () => this.attemptSendCharacterFromMorse()),
      7: () => attemptOccupyForceEmpty(history)
        || attemptEnterKey(history, () => _cbs.holdKey({ modifiers: 0, character: '\r' }), () => _cbs.releaseKey({ modifiers: 0, character: '\r' })),
    } as { [key: number]: () => boolean };

    private attemptsOnKeyUp = {
      0: () => attemptCtrlModify(history) || attemptShiftModify(history),
      1: () => attemptOccupySebtRelease(history)
        || attemptStoreDashdots(history),
      2: () => this.attemptForceHistoryEmpty()
        || attemptOccupySebtRelease(history)
        || attemptStoreDashdots(history),
      3: () => this.attemptForceHistoryEmpty()
        || attemptOccupySebtRelease(history)
        || attemptStoreDashdots(history),
      4: () => attemptShiftModify(history) || attemptGuiModify(history),
      5: () => attemptOccupySebtRelease(history)
        || attemptStoreDashdots(history),
      6: () => this.attemptForceHistoryEmpty()
        || attemptOccupySebtRelease(history)
        || attemptStoreDashdots(history),
      7: () => this.attemptForceHistoryEmpty()
        || attemptOccupySebtRelease(history)
        || attemptStoreDashdots(history),
    } as { [key: number]: () => boolean };

    /**
     * recordKeyDown
     */
    public recordKeyDown(keyName: KeyName) {
      if (keyName < 0 || keyName >= 8) {
        trace(`${history.changeFlag} -> Impossible Key index: [${keyName}]\n`);
        return;
      }
      history.bumpChange();
      history.keySequence.push(keyName);
      history.pushKey(keyName);
      trace(`${history.changeFlag} -> ${keyName} Down -- `, history.toString(), '\n');
      this.attemptsOnKeyDown[keyName]();
    }

    public recordKeyUp(keyName: number) {
      if (keyName < 0 || keyName >= 8) {
        trace(`${history.changeFlag} -> Impossible Key index: [${keyName}]\n`);
        return;
      }
      history.bumpChange();
      history.keySequence.push(keyName + 10);
      history.releaseKey(keyName);
      trace(`${history.changeFlag} -> ${keyName} Up -- `, history.toString(), '\n');
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
      trace(`${history.changeFlag} -> Current DashDots: ${history.dashDots}\n`);
      const character = dashDots2Char(history.dashDots.toString());
      if (character === undefined) {
        trace(`${history.changeFlag} -> ${history.dashDots} is not implemented.\n`);
        return;
      }
      _cbs.sendKey({ modifiers: modifierBits(history), character });
    }

    private attemptForceHistoryEmpty() {
      let _keySeq: Uint8Array | undefined = history.keySequence.recentThumb();
      if (history.keyPushed > 0) {
        return false;
      }
      if (_keySeq.length < 8) {
        _keySeq = undefined;
        return false;
      }
      let prevPatternExpect: number | undefined = 0;
      for (let index = _keySeq.length - 5; index > _keySeq.length - 9; index--) {
        if (_keySeq[index] < 10) {
          prevPatternExpect |= PUSH_KEY[_keySeq[index]];
        } else {
          _keySeq = undefined;
          return false;
        }
      }
      if (prevPatternExpect !== 0b00110011) {
        _keySeq = undefined;
        return false;
      }
      prevPatternExpect = undefined;
      let lastPatternExpect: number | undefined = 255;
      for (let index = _keySeq.length - 1; index > _keySeq.length - 5; index--) {
        if (_keySeq[index] >= 10) {
          lastPatternExpect &= RELEASE_KEY[_keySeq[index] - 10];
        } else {
          _keySeq = undefined;
          return false;
        }
      }
      _keySeq = undefined;
      if (lastPatternExpect !== 0b11001100) {
        return false;
      }
      lastPatternExpect = undefined;
      history.resetAll();
      _cbs.onForceHistoryEmpty();
      trace(`${history.changeFlag} -> Force History Empty!`, history.toString(), '\n');
      return true;
    }

  }

  return Object.freeze(new MorseContext());
}
