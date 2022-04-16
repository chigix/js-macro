import { KeyLayer, ModifyLayer, KeyName, PUSH_KEY, RELEASE_KEY } from "./morse-consts";

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
  private _dashDots: number[];
  private _keySequence: number[];
  private _allocates = new Uint8Array(5);
  public readonly keyLocks: KeyLocksBuffer;

  constructor() {
    this._dashDots = [];
    this._keySequence = [];
    this._allocates[0] = 0; // changeFlag
    this._allocates[1] = ModifyLayer.CT_SH;
    this._allocates[2] = KeyLayer.DASHDOTS;
    this._allocates[3] = 0b00000000; // Key Pushed
    this.keyLocks = new KeyLocksBuffer(this._allocates); // keyLocks
  }

  public get dashDots(): number[] {
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
    this._dashDots = [];
    this._keySequence = [];
    this._allocates[0] = 0;
    this._allocates[1] = ModifyLayer.CT_SH;
    this._allocates[2] = KeyLayer.DASHDOTS;
    this._allocates[3] = 0;
    this.keyLocks.resetBuffer();
  }

  /**
   * emptyDashDots
   */
  public emptyDashDots() {
    this._dashDots = [];
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
      dashDots: this.dashDots,
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

