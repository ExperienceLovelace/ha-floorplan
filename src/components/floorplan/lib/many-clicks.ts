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
    const touchMoveThreshold = 10; // pixels

    let timer: ReturnType<typeof setTimeout>;

    let clickCount = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let isValidClick = true;

    const onClickEvent = () => {
      // Only proceed if this is a valid click (not from a swipe/scroll)
      if (!isValidClick) {
        isValidClick = true;
        return;
      }

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

    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isValidClick = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
      const deltaY = Math.abs(e.touches[0].clientY - touchStartY);

      if (deltaX > touchMoveThreshold || deltaY > touchMoveThreshold) {
        isValidClick = false;
      }
    };

    E.on(elem, 'touchstart', onTouchStart.bind(this));
    E.on(elem, 'touchmove', onTouchMove.bind(this));
    E.on(elem, 'click', onClickEvent.bind(this));
  }
}
