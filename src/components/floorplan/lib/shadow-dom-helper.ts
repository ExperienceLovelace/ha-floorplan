export class ShadowDomHelper {
  static closestElement(selector: string, base: Element): Element | null {
    function __closestFrom(
      el: Element | Window | Document | HTMLSlotElement | null
    ): Element | null {
      if (!el || el === document || el === window) return null;
      if ((el as Slottable).assignedSlot) el = (el as Slottable).assignedSlot;
      const found = (el as Element).closest(selector);
      return found
        ? found
        : __closestFrom(((el as Element).getRootNode() as ShadowRoot).host);
    }
    return __closestFrom(base);
  }
}
