import { KeyLayer, ModifyLayer, KeyName, PUSH_KEY, RELEASE_KEY } from "./morse-consts";

class KeySequenceBuffer {

  /**
   * keys: allocates[0-49];
   * length: allocates[50].
   */
  private allocates: Uint8Array;

  constructor() {
    this.allocates = new Uint8Array(51);
    this.allocates.fill(0);
  }

  public get length(): number {
    return this.allocates[50];
  }

  /**
   * push
   */
  public push(key: KeyName) {
    this.allocates[(this.allocates[50]++) % 50] = key;
  }

  /**
   * latestFrames
   */
  public frameFromLast(...sizeFromLast: number[]) {
    let resultFrame = 0;
    let lastIndex = this.length % 50 - 1;
    return sizeFromLast.map(size => {
      resultFrame = this.allocates[lastIndex] < 10 ? 0 : 255;
      for (let index = 0; index < size; index++) {
        if (lastIndex < 0) {
          return null;
        }
        if (this.allocates[lastIndex] < 10) {
          resultFrame |= PUSH_KEY[this.allocates[lastIndex]];
        } else {
          resultFrame &= RELEASE_KEY[this.allocates[lastIndex] - 10];
        }
        lastIndex--;
        if (lastIndex < 0 && this.length > 49) {
          lastIndex = 49;
        }
      }
      return resultFrame;
    });
  }

  /**
   * resetBuffer
   */
  public resetBuffer() {
    this.allocates.fill(0);
  }

  public recentThumb() {
    if (this.length % 50 > 9) {
      return this.allocates.subarray(this.length % 50 - 9, this.length % 50);
    } else if (this.length > 49) {
      const history = new Uint8Array(9);
      history.set(this.allocates.subarray(50 - (9 - this.length % 50), 50), 0);
      history.set(this.allocates.subarray(0, this.length % 50), 9 - this.length % 50);
      return history;
    } else {
      return this.allocates.slice(0, this.length);
    }
  }

}

class DashDotsBuffer {
  constructor(
    private allocates: Uint8Array,
  ) {
    allocates[5] = 0;
  }


  public get length(): number {
    return this.allocates[5];
  }

  private set length(v: number) {
    this.allocates[5] = v;
  }

  /**
   * push
   */
  public push(dashdot: 0 | 1) {
    if (this.length > 9) {
      return;
    }
    this.allocates[6 + this.length++] = dashdot;
  }

  /**
   * empty
   */
  public resetBuffer() {
    this.length = 0;
  }

  /**
   * toString
   */
  public toString() {
    let result = '';
    for (let index = 6; index < this.length + 6; index++) {
      result += this.allocates[index];
    }
    return result;
  }
}

class KeyLocksBuffer {

  constructor(
    // shift, ctrl, gui
    private allocates: Uint8Array,
  ) {
    allocates[4] = 0;
  }

  public get _keyLocks(): number {
    return this.allocates[4];
  }

  public set _keyLocks(v: number) {
    this.allocates[4] = v;
  }

  public get shift(): boolean {
    return (this._keyLocks & 0b100) === 0b100;
  }

  public set shift(v: boolean) {
    if (v) {
      this._keyLocks |= 0b100;
    } else {
      this._keyLocks &= 0b011;
    }
  }

  public get ctrl(): boolean {
    return (this._keyLocks & 0b010) === 0b010;
  }

  public set ctrl(v: boolean) {
    if (v) {
      this._keyLocks |= 0b010;
    } else {
      this._keyLocks &= 0b101;
    }
  }

  public get gui(): boolean {
    return (this._keyLocks & 0b001) === 0b001;
  }

  public set gui(v: boolean) {
    if (v) {
      this._keyLocks |= 0b001;
    } else {
      this._keyLocks &= 0b110;
    }
  }

  /**
   * resetBuffer
   */
  public resetBuffer() {
    this._keyLocks = 0;
  }

}

export class KeyCountBuffer {
  private _allocates = new Uint8Array(16);
  public readonly keyLocks: KeyLocksBuffer;
  public readonly dashDots: DashDotsBuffer;
  public readonly keySequence: KeySequenceBuffer;

  constructor() {
    this._allocates[0] = 0; // changeFlag
    this._allocates[1] = ModifyLayer.CT_SH;
    this._allocates[2] = KeyLayer.DASHDOTS;
    this._allocates[3] = 0b00000000; // Key Pushed
    this.keyLocks = new KeyLocksBuffer(this._allocates); // keyLocks 4
    this.dashDots = new DashDotsBuffer(this._allocates); // dashDots 5, 6-15
    this.keySequence = new KeySequenceBuffer();
  }

  public get keyPushed(): number {
    return this._allocates[3];
  }

  public get changeFlag(): number {
    return this._allocates[0];
  }

  public get modifyLayer(): ModifyLayer {
    return this._allocates[1];
  }

  public set modifyLayer(v: ModifyLayer) {
    this._allocates[1] = v;
  }

  public get keyLayer(): KeyLayer {
    return this._allocates[2];
  }


  public set keyLayer(v: KeyLayer) {
    this._allocates[2] = v;
  }

  /**
   * bumpChange
   */
  public bumpChange() {
    this._allocates[0]++;
  }

  /**
   * resetAll
   */
  public resetAll() {
    this._allocates[0] = 0;
    this._allocates[1] = ModifyLayer.CT_SH;
    this._allocates[2] = KeyLayer.DASHDOTS;
    this._allocates[3] = 0;
    this.keyLocks.resetBuffer();
    this.dashDots.resetBuffer();
    this.keySequence.resetBuffer();
  }

  /**
   * releaseKey
   */
  public releaseKey(keyName: KeyName) {
    this._allocates[3] &= RELEASE_KEY[keyName];
  }

  /**
   * pushKey
   */
  public pushKey(keyName: KeyName) {
    this._allocates[3] |= PUSH_KEY[keyName];
  }

  /**
   * toString
   */
  public toString() {
    return JSON.stringify({
      dashDots: this.dashDots.toString(),
      keySequence: this.keySequence.recentThumb().join(),
      changeFlag: this._allocates[0],
      modifyLayer: this._allocates[1],
      keyLayer: this._allocates[2],
      keyPushed: this._allocates[3].toString(2),
      keyLocks: {
        ctrl: this.keyLocks.ctrl,
        shift: this.keyLocks.shift,
        gui: this.keyLocks.gui,
      }
    });
  }

}

