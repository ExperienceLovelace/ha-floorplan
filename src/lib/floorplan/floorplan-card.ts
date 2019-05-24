import { FloorplanElement } from './floorplan-element';

export class FloorplanCard extends FloorplanElement {
  createAppendContainer(): HTMLElement {
    const card = document.createElement('ha-card') as any;
    card.header = (this._config as any).title;
    this.shadowRoot!.appendChild(card);

    const container = document.createElement('div');
    container.id = 'container';
    card.appendChild(container);

    return container;
  }
}

if (!customElements.get('floorplan-card')) {
  customElements.define('floorplan-card', FloorplanCard);
}
