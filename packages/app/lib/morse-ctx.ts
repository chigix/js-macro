import { KeyName } from "./morse-consts";
import { KeyCountBuffer } from "./morse-buffer";
import {
  attemptSpaceKey, attemptBackspaceKey, attemptEnterKey, attemptTabKey,
  attemptOccupySebtRelease,
  attemptOccupyForceEmpty, attemptForceEmpty,
} from "./morse-util";
import {
  modifierBits, attemptModifyLayerChange,
  attemptCtrlModify, attemptShiftModify, attemptGuiModify,
  dashDots2Char, attemptStoreDashdots, attemptCommitHistory,
} from "./morse-util";
import { Options } from "./hidkeyboard";

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
      2: () => attemptForceEmpty(history, _cbs.onForceHistoryEmpty)
        || attemptOccupySebtRelease(history)
        || attemptStoreDashdots(history),
      3: () => attemptForceEmpty(history, _cbs.onForceHistoryEmpty)
        || attemptOccupySebtRelease(history)
        || attemptStoreDashdots(history),
      4: () => attemptShiftModify(history) || attemptGuiModify(history),
      5: () => attemptOccupySebtRelease(history)
        || attemptStoreDashdots(history),
      6: () => attemptForceEmpty(history, _cbs.onForceHistoryEmpty)
        || attemptOccupySebtRelease(history)
        || attemptStoreDashdots(history),
      7: () => attemptForceEmpty(history, _cbs.onForceHistoryEmpty)
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

  }

  return Object.freeze(new MorseContext());
}
