import { CardConfig } from '../floorplan/card-config';
import { FloorplanElement } from './floorplan-element';

export class FloorplanCard extends FloorplanElement {
  ensureFloorplanContainer(): HTMLElement {
    const card = document.createElement('ha-card') as HTMLElement;
    (card as any).header = (this._config as CardConfig).title;
    this.shadowRoot!.appendChild(card);
    return card;
  }

  /*
  getCardSize(): number {
    return 3;
  }
  */
}

if (!customElements.get('floorplan-card')) {
  customElements.define('floorplan-card', FloorplanCard);
}
