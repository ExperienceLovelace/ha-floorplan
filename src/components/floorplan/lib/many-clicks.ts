import OuiDomEvents from './oui-dom-events';

const E = OuiDomEvents;

const elements = new Set<HTMLElement | SVGElement>();

export class ManyClicks {
  static observe(elem: HTMLElement | SVGElement): void {
    if (elements.has(elem)) {
      return;
    }
    elements.add(elem);

    const doubleClickDuration = 400;

    let timer: NodeJS.Timeout;

    let clickCount = 0;

    const onClickEvent = () => {
      clickCount++;

      timer = setTimeout(() => {
        if (clickCount === 1) {
          clickCount = 0;
          elem.dispatchEvent(new Event('singleClick'));
        }
      }, doubleClickDuration);

      if (clickCount === 2) {
        clearTimeout(timer);
        clickCount = 0;
        elem.dispatchEvent(new Event('doubleClick'));
      }
    };

    E.on(elem, 'click', onClickEvent.bind(this));
  }
}
