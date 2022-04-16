import { KeyLayer, ModifyLayer, KeyName, PUSH_KEY, RELEASE_KEY } from "./morse-consts";

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
    trace(`dashdots push ${this.length} : ${dashdot} \n`);
    trace(`dashdots push ${this.toString()} \n`);
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
  private _keySequence: number[];
  private _allocates = new Uint8Array(16);
  public readonly keyLocks: KeyLocksBuffer;
  private readonly _dashDots: DashDotsBuffer;

  constructor() {
    this._keySequence = [];
    this._allocates[0] = 0; // changeFlag
    this._allocates[1] = ModifyLayer.CT_SH;
    this._allocates[2] = KeyLayer.DASHDOTS;
    this._allocates[3] = 0b00000000; // Key Pushed
    this.keyLocks = new KeyLocksBuffer(this._allocates); // keyLocks 4
    this._dashDots = new DashDotsBuffer(this._allocates); // dashDots 5, 6-15
  }

  public get dashDots(): DashDotsBuffer {
    return this._dashDots;
  }

  public get keySequence(): number[] {
    return this._keySequence;
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
    this._keySequence = [];
    this._allocates[0] = 0;
    this._allocates[1] = ModifyLayer.CT_SH;
    this._allocates[2] = KeyLayer.DASHDOTS;
    this._allocates[3] = 0;
    this.keyLocks.resetBuffer();
    this.dashDots.resetBuffer();
  }

  /**
   * emptyKeySequences
   */
  public emptyKeySequences() {
    this._keySequence = [];
    this._allocates[3] = 0;
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
      keySequence: this.keySequence,
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

