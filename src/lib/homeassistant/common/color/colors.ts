// Port of home-assistant/frontend src/common/color/colors.ts
//
// Home Assistant resolves graph colors from the theme CSS variables
// --graph-color-N and --color-N. The table below holds the default
// palette, which is used when the variables are not defined, for example
// outside Home Assistant.

export const COLORS = [
  '#4269d0',
  '#f4bd4a',
  '#ff725c',
  '#6cc5b0',
  '#a463f2',
  '#ff8ab7',
  '#9c6b4e',
  '#97bbf5',
  '#01ab63',
  '#094bad',
  '#c99000',
  '#d84f3e',
  '#49a28f',
  '#048732',
  '#d96895',
  '#8043ce',
  '#7599d1',
  '#7a4c31',
  '#6989f4',
  '#ffd444',
  '#ff957c',
  '#8fe9d3',
  '#62cc71',
  '#ffadda',
  '#c884ff',
  '#badeff',
  '#bf8b6d',
  '#927acc',
  '#97ee3f',
  '#bf3947',
  '#9f5b00',
  '#f48758',
  '#8caed6',
  '#f2b94f',
  '#eff26e',
  '#e43872',
  '#d9b100',
  '#9d7a00',
  '#698cff',
  '#00d27e',
  '#d06800',
  '#009f82',
  '#c49200',
  '#cbe8ff',
  '#fecddf',
  '#c27eb6',
  '#8cd2ce',
  '#c4b8d9',
  '#f883b0',
  '#a49100',
  '#f48800',
  '#27d0df',
  '#a04a9b',
  '#4269d0',
];

export const getColorByIndex = (index: number): string =>
  COLORS[index % COLORS.length];

/*
 * Resolves the color for a series like current HA: a theme's
 * --graph-color-N wins, then the theme's --color-N, then the built-in
 * default palette. Inside Home Assistant the variables are defined on the
 * document root by the active theme.
 */
export const getGraphColorByIndex = (
  index: number,
  style?: CSSStyleDeclaration
): string => {
  const computedStyle =
    style ??
    (typeof window !== 'undefined'
      ? window.getComputedStyle(document.documentElement)
      : undefined);
  const themeColor =
    computedStyle?.getPropertyValue(`--graph-color-${index + 1}`)?.trim() ||
    computedStyle
      ?.getPropertyValue(`--color-${(index % COLORS.length) + 1}`)
      ?.trim();
  return themeColor || getColorByIndex(index);
};
