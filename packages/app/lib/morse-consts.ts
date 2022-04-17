export const enum ModifyLayer {
  CT_SH = 0,
  CT_GUI = 1,
  SH_GUI = 2,
}

export const enum KeyLayer {
  DASHDOTS = 0,
  NUMBERS = 1,
  ARROWS = 2,
  MEDIA = 3,
}

export const enum KeyName {
  KEY_0 = 0,
  KEY_0_DOWN = 10,
  KEY_1 = 1,
  KEY_1_DOWN = 11,
  KEY_2 = 2,
  KEY_2_DOWN = 12,
  KEY_3 = 3,
  KEY_3_DOWN = 13,
  KEY_4 = 4,
  KEY_4_DOWN = 14,
  KEY_5 = 5,
  KEY_5_DOWN = 15,
  KEY_6 = 6,
  KEY_6_DOWN = 16,
  KEY_7 = 7,
  KEY_7_DOWN = 17,
}

export const PUSH_KEY = [
  0b10000000,
  0b01000000,
  0b00100000,
  0b00010000,
  0b00001000,
  0b00000100,
  0b00000010,
  0b00000001,
];
Object.freeze(PUSH_KEY);

export const RELEASE_KEY = PUSH_KEY.map(p => ~p + 256);
Object.freeze(RELEASE_KEY);
