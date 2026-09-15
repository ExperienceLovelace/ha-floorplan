import { HomeAssistant } from '../../lib/homeassistant/types';

/**
 * `hass.formatEntityName` only resolves an entity's name from its registry
 * context from HA 2026.4. The helper has existed since 2025.10, but with an
 * incompatible signature - bare type strings then, and only structured items
 * between 2025.11 and 2026.3 - so feature detection is not enough and the
 * version has to be checked.
 */
const supportsEntityNames = (hass: HomeAssistant | undefined): boolean => {
  // This card's HomeAssistant type does not declare config; read it loosely.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const version: string = (hass as any)?.config?.version ?? '';
  const [major, minor] = version.split('.', 2);
  return Number(major) > 2026 || (Number(major) === 2026 && Number(minor) >= 4);
};

/**
 * Resolves an entity's display name from its registry context (entity, device,
 * area, floor), so hover titles match what the built-in cards show. Falls back
 * to the friendly name on Home Assistant versions without that support.
 */
export const computeEntityName = (
  hass: HomeAssistant | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stateObj: any
): string => {
  if (!stateObj) return '';
  if (hass && supportsEntityNames(hass)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (hass as any).formatEntityName(stateObj) || '';
  }
  return stateObj.attributes?.friendly_name ?? '';
};
