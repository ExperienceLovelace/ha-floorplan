import yaml from 'js-yaml';

export class Utils {
  /***************************************************************************************************************************/
  /* HTML DOM functions
  /***************************************************************************************************************************/

  static hasClass(element: Element, className: string): boolean {
    return element.classList
      ? element.classList.contains(className)
      : new RegExp('(^| )' + className + '( |$)', 'gi').test(element.className);
  }

  static removeClass(element: Element, className: string): void {
    element.classList
      ? element.classList.remove(className)
      : (element.className = element.className.replace(
        new RegExp(
          '(^|\\b)' + className.split(' ').join('|') + '(\\b|$)',
          'gi'
        ),
        ' '
      ));
  }

  static hassClass(element: Element, className: string): boolean {
    return element.classList.contains(className);
  }

  static addClass(element: Element, className: string): void {
    element.classList.add(className);
  }

  static setClass(element: Element, className: string): void {
    element.setAttribute('class', className);
  }

  static toggleClass(element: Element, className: string): void {
    if (this.hasClass(element, className)) {
      this.removeClass(element, className);
    } else {
      this.addClass(element, className);
    }
  }

  static datasetSet(
    element: SVGGraphicsElement | HTMLElement,
    key: string,
    value: string
  ): void {
    element.dataset[key] = value;
  }

  static getStyles(
    element: HTMLElement | SVGGraphicsElement
  ): Record<string, unknown> {
    const styles: Record<string, unknown> = {};

    let styleName: string;

    for (let i = 0; i < element.style.length; i++) {
      styleName = element.style.item(i);
      styles[styleName] = element.style.getPropertyValue(styleName);
      //element.style.removeProperty(styleName);
      //element.style.setProperty(styleName, styleValue);
    }

    return styles;
  }

  static setStyle(
    element: HTMLElement | SVGGraphicsElement,
    style: string
  ): void {
    const styles = (style ?? [])
      .split(';')
      .map((x) => x.trim())
      .filter((x) => x.length);

    for (let i = 0; i < styles.length; i++) {
      const parts = styles[i].split(':').map((x) => x.trim());
      const isImportant = parts[1].includes('!important');
      parts[1] = parts[1].replace(/!important/g, '').trim();
      element.style.setProperty(parts[0], parts[1], isImportant ? 'important' : '');
    }
  }

  static setText(
    textElement: HTMLElement | SVGGraphicsElement,
    text: string,
    shiftAxisY: string
  ): void {
    // If textElement is not a text element, try to find the first text element
    if (!(textElement instanceof SVGTextElement)) {
      textElement = textElement.querySelector('text') || textElement;
    }
    // If text contains linebreakes, let's split the text into multiple tspans, cause tspans doesnt allow linebreakes
    // Replace all \\n, as it's a excape character for \n in YAML handled through Home Assistant 
    const texts = text.replace(/\\n/g, '\n').split('\n');
    const textContainsLinebreaks = texts.length > 1;

    // Get existing tspan element if exists
    const currentTspanElement = textElement.querySelector('tspan');

    // If more than one tspan required, we'd need to make some adjustments
    if (textContainsLinebreaks) {
      // Check if textElement has a tspan and if it does, get the x and y attributes
      const tspanX = currentTspanElement?.getAttribute('x');
      const tspanY = currentTspanElement?.getAttribute('y');
      
      // If tspan has x and y attributes, set the text element to the same values
      if (tspanX && !textElement.getAttribute('x')) textElement.setAttribute('x', tspanX);
      if (tspanY && !textElement.getAttribute('y')) textElement.setAttribute('y', tspanY);

      // Save existing tspan element if exists
      const existingTspanElement = textElement.querySelector('tspan') || false;

      // Empty the current text element
      textElement.textContent = ''; 

      // Note the user about the intended change in a dataset
      textElement.dataset.ha_floorplan_notice = 'The text_set function split your text into multiple tspans. Only the style of the first tspan is preserved. The style from the original tspan is reused on every tspan. The x and y are calculated on the basis of the first tspan or text-element.';

      // Get x location of text, if no found, set to 0
      const textXPosition = textElement.getAttribute('x') || '0';

      // Dy indicates a shift along the y-axis, for every tspan in the text element except the first one
      const dy = shiftAxisY ? shiftAxisY : '1em'

      texts.forEach((textPart, i) => {
        const tspanElement = document.createElementNS(
          'http://www.w3.org/2000/svg', 'tspan'
        );
        tspanElement.textContent = textPart;

        // Add x + dy if more than one string (linebreakes)
        tspanElement.setAttribute('x', textXPosition);
        tspanElement.setAttribute('dy', (i >= 1 ? dy : '0'));

        // If existing tspan element contains a style, set it to the new tspan element
        if (existingTspanElement) {
          const style = existingTspanElement.getAttribute('style');
          if (style) tspanElement.setAttribute('style', style);
        }
        textElement.appendChild(tspanElement);
      })
    }else{
      const textTarget = currentTspanElement || textElement;
      textTarget.textContent = text;
    }
  }

  static waitForChildNodes(
    element: Node,
    initializeNode: () => void,
    timeout: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject('Timeout waiting for child element(s) to load'),
        timeout
      );

      const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList' && mutation.addedNodes.length) {
            clearTimeout(timeoutId);
            return resolve();
          }
        }
      });

      observer.observe(element, { childList: true, subtree: true });

      initializeNode();
    });
  }

  /***************************************************************************************************************************/
  /* General helper functions
  /***************************************************************************************************************************/

  static formatDate(date: Date | string): string {
    if (!date) return '';

    return typeof date === 'string'
      ? new Date(date).toLocaleString()
      : date.toLocaleString();
  }

  static parseYaml(yamlText: string): unknown {
    return yaml.load(yamlText);
  }

  static async fetchText(
    resourceUrl: string,
    isDemo: boolean,
    examplesPath: string,
    useCache: boolean
  ): Promise<string> {
    if (examplesPath) {
      resourceUrl = resourceUrl.replace(
        /^\/local\/floorplan\/examples\//g,
        `${examplesPath}/`
      );
    }

    resourceUrl = useCache ? resourceUrl : Utils.cacheBuster(resourceUrl);

    const request = new Request(resourceUrl, {
      cache: useCache ? 'default' : 'no-store',
      mode: isDemo ? 'no-cors' : undefined,
    });

    try {
      const response = await fetch(request);
      if (response.ok || (isDemo && response.type === 'opaque')) {
        const text = await response.text();
        return text;
      } else {
        throw new Error(`Error fetching resource`);
      }
    } catch (err) {
      throw new URIError(`${resourceUrl}: ${(err as Error).message}`);
    }
  }

  static async fetchImage(
    resourceUrl: string,
    isDemo: boolean,
    examplesPath: string,
    useCache: boolean
  ): Promise<string> {
    if (isDemo) {
      resourceUrl = resourceUrl.replace(
        /^\/local\/floorplan\/examples\//g,
        `${examplesPath}/`
      );
    }

    resourceUrl = useCache ? resourceUrl : Utils.cacheBuster(resourceUrl);

    const request = new Request(resourceUrl, {
      cache: useCache ? 'default' : 'no-store',
      headers: new Headers({
        'Content-Type': 'text/plain; charset=x-user-defined',
      }),
      mode: isDemo ? 'no-cors' : undefined,
    });

    try {
      const response = await fetch(request);
      if (response.ok || (isDemo && response.type === 'opaque')) {
        const result = await response.arrayBuffer();
        return `data:image/jpeg;base64,${Utils.arrayBufferToBase64(result)}`;
      } else {
        throw new Error(`Error fetching resource`);
      }
    } catch (err) {
      throw new URIError(`${resourceUrl}: ${(err as Error).message}`);
    }
  }

  /***************************************************************************************************************************/
  /* Utility functions
  /***************************************************************************************************************************/

  static singleToArray<T>(
    list: unknown[] | Record<string, unknown> | unknown | T
  ): T[] {
    if (list === undefined || list === null) {
      return [];
    } else if (Array.isArray(list)) {
      return list;
    } else {
      return [list as unknown as T] as Array<T>;
    }
  }

  static getArray<T>(
    list: unknown[] | Record<string, unknown> | unknown | T
  ): T[] {
    if (list === undefined || list === null) {
      return [];
    } else if (Array.isArray(list)) {
      return list;
    } else {
      const listObj = list as Record<string, unknown>;
      return Object.values(listObj) as Array<T>;
    }
  }

  static getSet<T>(
    list: unknown[] | Record<string, unknown> | unknown
  ): Set<T> {
    if (Array.isArray(list)) {
      return new Set<T>(list);
    } else {
      const listObj = list as Record<string, unknown>;
      return new Set<T>(Object.values(listObj) as Array<T>);
    }
  }

  static arrayBufferToBase64(buffer: ArrayBufferLike): string {
    let binary = '';
    const bytes = [].slice.call(new Uint8Array(buffer));

    bytes.forEach((b) => (binary += String.fromCharCode(b)));

    let base64 = window.btoa(binary);

    // IOS / Safari will not render base64 images unless length is divisible by 4
    while (base64.length % 4 > 0) {
      base64 += '=';
    }

    return base64;
  }

  static cacheBuster(url: string): string {
    return `${url}${url.includes('?') ? '&' : '?'}_=${new Date().getTime()}`;
  }

  static equal(a: unknown, b: unknown): boolean {
    if (a === b) return true;

    const arrA = Array.isArray(a);
    const arrB = Array.isArray(b);
    let i = 0;

    if (arrA && arrB) {
      if ((a as []).length != (b as []).length) return false;
      for (i = 0; i < (a as []).length; i++)
        if (!Utils.equal((a as [])[i], (b as [])[i])) return false;
      return true;
    }

    if (arrA != arrB) return false;

    if (a && b && typeof a === 'object' && typeof b === 'object') {
      const keys = Object.keys(a);
      if (keys.length !== Object.keys(b).length) return false;

      const dateA = a instanceof Date;
      const dateB = b instanceof Date;
      if (dateA && dateB) return (a as Date).getTime() == (b as Date).getTime();
      if (dateA != dateB) return false;

      const regexpA = a instanceof RegExp;
      const regexpB = b instanceof RegExp;
      if (regexpA && regexpB) return a.toString() == b.toString();
      if (regexpA != regexpB) return false;

      for (i = 0; i < keys.length; i++)
        if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

      for (i = 0; i < keys.length; i++)
        if (
          !Utils.equal(
            (a as Record<string, unknown>)[keys[i]],
            (b as Record<string, unknown>)[keys[i]]
          )
        )
          return false;

      return true;
    }

    return false;
  }

  static get isMobile(): boolean {
    const isMobile =
      // eslint-disable-next-line no-useless-escape
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(
        navigator.userAgent
      ) ||
      // eslint-disable-next-line no-useless-escape
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
        navigator.userAgent.substr(0, 4)
      );

    return isMobile;
  }

  static deviceId(): string {
    const ID_BROWER_KEY = 'ha-floorplan-device-id';

    if (!localStorage[ID_BROWER_KEY]) {
      const s4 = () => {
        return Math.floor((1 + Math.random()) * 100000)
          .toString(16)
          .substring(1);
      };
      localStorage[ID_BROWER_KEY] = `${s4()}${s4()}_${s4()}${s4()}`;
    }
    return localStorage[ID_BROWER_KEY];
  }
}
