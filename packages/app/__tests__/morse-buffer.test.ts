import { KeyCountBuffer } from "../lib/morse-buffer";

function randomDashDots(length: number) {
  const result: Array<0 | 1> = [];
  for (let index = 0; index < length; index++) {
    result.push(Math.round(Math.random()) as 0 | 1);
  }
  return result;
}

describe('Given KeyCountBuffer', () => {

  const history = new KeyCountBuffer();

  beforeEach(() => {
    history.resetAll();
  });

  test('When 10 dashdots are pushed', () => {
    const dashdots = randomDashDots(10);
    dashdots.forEach(v => history.dashDots.push(v));
    expect(history.dashDots.toString()).toBe(dashdots.join(''));
  });

  test('When 4 keys are pushed', () => {
    const sequence = [4, 5, 6, 7, 16, 15, 17, 14,];
    sequence.forEach(v => history.keySequence.push(v));
    expect(
      history.keySequence.recentThumb()
    ).toEqual(Uint8Array.from(sequence));
    expect(
      history.keySequence.frameFromLast(0, 4)
    ).toEqual([255, 0b11110000]);
  });

  test('When 9 keys are tapped', () => {
    const sequence = [4, 5, 6, 7, 16, 15, 17, 14, 4,];
    sequence.forEach(v => history.keySequence.push(v));
    expect(
      history.keySequence.recentThumb()
    ).toEqual(Uint8Array.from(sequence));
    expect(
      history.keySequence.frameFromLast(1, 4, 4, 1)
    ).toEqual([0b00001000, 0b11110000, 0b00001111, null]);
  });

  test('When 10 keys are tapped', () => {
    const sequence = [4, 5, 6, 7, 16, 15, 17, 14, 2, 12,];
    const sequenceEnding = [3, 4, 2, 12, 13, 14, 7, 17, 1];
    sequence.forEach(v => history.keySequence.push(v));
    sequenceEnding.forEach(v => history.keySequence.push(v));
    expect(
      history.keySequence.recentThumb()
    ).toEqual(Uint8Array.from(sequenceEnding));
    expect(
      history.keySequence.frameFromLast(2, 2, 2, 3, 1)
    ).toEqual([0b01000000, 0b00000001, 0b11001111, 0b00111000, 0b11011111]);
  });

  test('When 55 keys are tapped', () => {
    const sequence = [
      4, 5, 6, 7, 16, 15, 17, 14, 2, 12,
      4, 5, 6, 7, 16, 15, 17, 14, 2, 12,
      4, 5, 6, 7, 16, 15, 17, 14, 2, 12,
      4, 5, 6, 7, 16, 15, 17, 14, 2, 12,
      4, 5, 6, 16, 15, 14,
    ];
    const sequenceEnding = [13, 12, 7, 6, 17, 16, 6, 2, 1];
    sequence.forEach(v => history.keySequence.push(v));
    sequenceEnding.forEach(v => history.keySequence.push(v));
    expect(
      history.keySequence.recentThumb()
    ).toEqual(Uint8Array.from(sequenceEnding));
    expect(
      history.keySequence.frameFromLast(0, 3, 2, 2, 2)
    ).toEqual([0, 0b01100010, 0b11111100, 0b00000011, 0b11001111]);
  });

});
