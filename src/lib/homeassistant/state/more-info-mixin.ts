import type { MoreInfoDialogParams } from '../dialogs/more-info/ha-more-info-dialog';

declare global {
  // for fire event
  interface HASSDomEvents {
    'hass-more-info': MoreInfoDialogParams;
  }
}
