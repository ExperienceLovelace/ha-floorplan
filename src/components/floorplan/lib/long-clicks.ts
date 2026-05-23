import OuiDomEvents from './oui-dom-events';
const E = OuiDomEvents;

export class LongClicks {
  static observe(elem: HTMLElement | SVGElement): void {
    const longClickDuration = 400;
    const touchMoveThreshold = 10; // pixels - max allowed movement before canceling

    let timer: ReturnType<typeof setTimeout>;
    let isLongClick = false;
    let isTouchMoved = false;
    let touchStartX = 0;
    let touchStartY = 0;

    const onTapStart = (evt: Event) => {
      //console.log('onTapStart: isLongClick:', isLongClick);

      isLongClick = false;
      isTouchMoved = false;


      // Track touch position for movement detection
      if ('touches' in evt && evt instanceof TouchEvent && evt.touches.length > 0) {
        touchStartX = evt.touches[0].clientX;
        touchStartY = evt.touches[0].clientY;
        //console.log('onTapStart: touchStartX:', touchStartX, 'touchStartY:', touchStartY);
      }

      timer = setTimeout(() => {
        if (isTouchMoved) {
        //   console.log('timer timed out: movement detected, not a long click');
          return;
        }

        isLongClick = true;
        //console.log('timer timed out: isLongClick:', isLongClick);
        //console.log('timer timed out: dispatching event:', 'longClick');
        elem.dispatchEvent(new Event('longClick'));
      }, longClickDuration);
    };

    const onTouchmove = (evt: Event) => {
      var touchEndX = 0;
      var touchEndY = 0;
      if ('touches' in evt && evt instanceof TouchEvent && evt.touches.length > 0) {
        touchEndX = evt.touches[0].clientX;
        touchEndY = evt.touches[0].clientY;
        //console.log('onMove: touchEndX:', touchEndX, 'touchEndY:', touchEndY);
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        //console.log('OnMove: distance:', distance);
        if (distance > touchMoveThreshold) {
          //console.log('onTapEnd: movement detected, canceling long click');
          isTouchMoved = true;
        }
      }
};

    const onTapEnd = (evt: Event) => {
      clearTimeout(timer);

      if (isLongClick) {
        console.log('onTapEnd: isLongClick:', isLongClick);
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
        // Only prevent default if the event is cancelable
        if (evt.cancelable) {
          evt.preventDefault();
        }
        if (evt.stopImmediatePropagation) evt.stopImmediatePropagation();
      }
    };

    const onClick = (evt: Event) => {
      // Only prevent default if the event is cancelable
      if (evt.cancelable) {
        evt.preventDefault();
      }
      if (evt.stopImmediatePropagation) evt.stopImmediatePropagation();
    };

    E.on(elem, 'mousedown', onTapStart.bind(this));
    E.on(elem, 'tapstart', onTapStart.bind(this));

    // [Violation] Added non-passive event listener to a scroll-blocking 'touchstart' event.
    // Consider marking event handler as 'passive' to make the page more responsive.
    // See https://www.chromestatus.com/feature/5745543795965952
    E.on(elem, 'touchstart', onTapStart.bind(this), { passive: true });


    E.on(elem, 'click', onTapEnd.bind(this));

    E.on(elem, 'touchmove', onTouchmove.bind(this));

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
