// Port of home-assistant/frontend src/common/number/round.ts (20220802.0)

export const round = (value: number, precision = 2): number =>
  Math.round(value * 10 ** precision) / 10 ** precision;
