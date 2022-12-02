import OuiDomEvents from './oui-dom-events';
const E = OuiDomEvents;

export class LongClicks {
  static observe(elem: HTMLElement | SVGElement): void {
    const longClickDuration = 400;

    let timer: NodeJS.Timeout;
    let isLongClick = false;

    const onTapStart = () => {
      // console.log('onTapStart: isLongClick:', isLongClick);

      isLongClick = false;

      timer = setTimeout(() => {
        isLongClick = true;
        // console.log('timer timed out: isLongClick:', isLongClick);
        // console.log('timer timed out: dispatching event:', 'longClick');
        elem.dispatchEvent(new Event('longClick'));
      }, longClickDuration);
    };

    const onTapEnd = (evt: Event) => {
      clearTimeout(timer);

      if (isLongClick) {
        // console.log('onTapEnd: isLongClick:', isLongClick);
        // have already triggered long click
      } else {
        // trigger shortClick, shortMouseup etc
        // console.log(
        //   'onTapEnd: dispatching event:',
        //   'short' + evt.type[0].toUpperCase() + evt.type.slice(1)
        // );
        elem.dispatchEvent(
          new Event('short' + evt.type[0].toUpperCase() + evt.type.slice(1))
        );
      }
    };

    const onTap = (evt: Event) => {
      if (isLongClick) {
        // console.log('onTap: isLongClick:', isLongClick);
        evt.preventDefault();
        if (evt.stopImmediatePropagation) evt.stopImmediatePropagation();
      }
    };

    const onClick = (evt: Event) => {
      // console.log('onClick: isLongClick:', isLongClick);
      evt.preventDefault();
      if (evt.stopImmediatePropagation) evt.stopImmediatePropagation();
    };

    E.on(elem, 'mousedown', onTapStart.bind(this));
    E.on(elem, 'tapstart', onTapStart.bind(this));

    // [Violation] Added non-passive event listener to a scroll-blocking 'touchstart' event.
    // Consider marking event handler as 'passive' to make the page more responsive.
    // See https://www.chromestatus.com/feature/5745543795965952
    E.on(elem, 'touchstart', onTapStart.bind(this), { passive: true });

    E.on(elem, 'click', onTapEnd.bind(this));

    E.on(elem, 'mouseup', onTapEnd.bind(this));
    E.on(elem, 'tapend', onTapEnd.bind(this));
    E.on(elem, 'touchend', onTapEnd.bind(this));

    E.on(elem, 'tap', onTap.bind(this));
    E.on(elem, 'touch', onTap.bind(this));
    E.on(elem, 'mouseup', onTap.bind(this));
    E.on(elem, 'tapend', onTap.bind(this));
    E.on(elem, 'touchend', onTap.bind(this));

    E.on(elem, 'click', onClick.bind(this));
  }
}
