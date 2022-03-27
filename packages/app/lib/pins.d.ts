export interface PinLED extends Pin {
  mode: (m: "output") => null,
}

export type PinKey = Pin & {
  mode: (m: "input") => null,
};
