import { KeyName } from "./morse-consts";
import { KeyCountBuffer } from "./morse-buffer";
import {
  attemptSpaceKey, attemptBackspaceKey, attemptEnterKey, attemptTabKey,
  attemptOccupySebtRelease,
  attemptOccupyForceEmpty, attemptForceEmpty,
  attemptOccupyKeyLayerChange, attemptKeyLayerChange,
} from "./morse-util";
import {
  modifierBits, attemptModifyLayerChange,
  attemptCtrlModify, attemptShiftModify, attemptGuiModify,
  dashDots2Char, attemptStoreDashdots, attemptCommitHistory,
  attemptArrowPageKey,
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
        // attemptOccupyKeyLayerChange skipped here will only have ctrl,shift conflict
        // This conflict will be fixed by attemptKeyLayerChange.
        attemptModifyLayerChange(history);
        attemptCtrlModify(history) || attemptShiftModify(history);
        return true;
      },
      1: () => attemptOccupyKeyLayerChange(history)
        || attemptTabKey(history, () => _cbs.holdKey({ modifiers: modifierBits(history), character: '\t' }), () => _cbs.releaseKey({ modifiers: modifierBits(history), character: '\t' }))
        || attemptArrowPageKey(history, () => _cbs.holdKey({ modifiers: modifierBits(history), character: 'pageUp' }), () => _cbs.releaseKey({ modifiers: modifierBits(history), character: 'pageUp' })),
      2: () => attemptOccupyForceEmpty(history)
        || attemptTabKey(history, () => _cbs.holdKey({ modifiers: modifierBits(history), character: '\t' }), () => _cbs.releaseKey({ modifiers: modifierBits(history), character: '\t' }))
        || attemptBackspaceKey(history, () => _cbs.holdKey({ modifiers: modifierBits(history), character: '\b' }), () => _cbs.releaseKey({ modifiers: modifierBits(history), character: '\b' }))
        || attemptArrowPageKey(history, () => _cbs.holdKey({ modifiers: modifierBits(history), character: 'upArrow' }), () => _cbs.releaseKey({ modifiers: modifierBits(history), character: 'upArrow' })),
      3: () => attemptOccupyForceEmpty(history)
        || attemptBackspaceKey(history, () => _cbs.holdKey({ modifiers: modifierBits(history), character: '\b' }), () => _cbs.releaseKey({ modifiers: modifierBits(history), character: '\b' }))
        || attemptArrowPageKey(history, () => _cbs.holdKey({ modifiers: modifierBits(history), character: 'pageDown' }), () => _cbs.releaseKey({ modifiers: modifierBits(history), character: 'pageDown' })),
      4: () => {
        // attemptOccupyKeyLayerChange skipped here will only have shift,gui conflict
        // This conflict will be fixed by attemptKeyLayerChange.
        attemptModifyLayerChange(history);
        attemptShiftModify(history) || attemptGuiModify(history);
        return true;
      },
      5: () => attemptOccupyKeyLayerChange(history)
        || attemptSpaceKey(history, () => _cbs.holdKey({ modifiers: modifierBits(history), character: ' ' }), () => _cbs.releaseKey({ modifiers: modifierBits(history), character: ' ' }))
        || attemptCommitHistory(history, () => this.attemptSendCharacterFromMorse())
        || attemptArrowPageKey(history, () => _cbs.holdKey({ modifiers: modifierBits(history), character: 'leftArrow' }), () => _cbs.releaseKey({ modifiers: modifierBits(history), character: 'leftArrow' })),
      6: () => attemptOccupyForceEmpty(history)
        || attemptSpaceKey(history, () => _cbs.holdKey({ modifiers: modifierBits(history), character: ' ' }), () => _cbs.releaseKey({ modifiers: modifierBits(history), character: ' ' }))
        || attemptEnterKey(history, () => _cbs.holdKey({ modifiers: modifierBits(history), character: '\r' }), () => _cbs.releaseKey({ modifiers: modifierBits(history), character: '\r' }))
        || attemptCommitHistory(history, () => this.attemptSendCharacterFromMorse())
        || attemptArrowPageKey(history, () => _cbs.holdKey({ modifiers: modifierBits(history), character: 'downArrow' }), () => _cbs.releaseKey({ modifiers: modifierBits(history), character: 'downArrow' })),
      7: () => attemptOccupyForceEmpty(history)
        || attemptEnterKey(history, () => _cbs.holdKey({ modifiers: modifierBits(history), character: '\r' }), () => _cbs.releaseKey({ modifiers: modifierBits(history), character: '\r' }))
        || attemptArrowPageKey(history, () => _cbs.holdKey({ modifiers: modifierBits(history), character: 'rightArrow' }), () => _cbs.releaseKey({ modifiers: modifierBits(history), character: 'rightArrow' })),
    } as { [key: number]: () => boolean };

    private attemptsOnKeyUp = {
      0: () => attemptKeyLayerChange(history)
        || attemptCtrlModify(history) || attemptShiftModify(history),
      1: () => attemptKeyLayerChange(history)
        || attemptOccupySebtRelease(history)
        || attemptStoreDashdots(history),
      2: () => attemptForceEmpty(history, _cbs.onForceHistoryEmpty)
        || attemptOccupySebtRelease(history)
        || attemptStoreDashdots(history),
      3: () => attemptForceEmpty(history, _cbs.onForceHistoryEmpty)
        || attemptOccupySebtRelease(history)
        || attemptStoreDashdots(history),
      4: () => attemptKeyLayerChange(history)
        || attemptShiftModify(history) || attemptGuiModify(history),
      5: () => attemptKeyLayerChange(history)
        || attemptOccupySebtRelease(history)
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
