import { HomeAssistant } from '../../../lib/homeassistant/types';
import { HassEntity } from '../../floorplan-examples/homeassistant';
import { FloorplanConfig } from './/floorplan-config';
import { ColorUtil } from './color-util';
import Sval from 'sval';

export class EvalHelper {
  static cache: { [key: string]: { interpreter: Sval, parsedFunction: () => void } } = {};
  static cacheItem: { interpreter: Sval, parsedFunction: () => void };

  static functionBody: string;
  static entityState: HassEntity | undefined;

  static interpreter: Sval;
  static parsedFunction: () => void;

  static util = {
    color: ColorUtil,
  }

  static evaluate(expression: string, hass: HomeAssistant, config: FloorplanConfig, entityId?: string,
    svgElement?: SVGGraphicsElement, svgElements?: { [elementId: string]: SVGGraphicsElement }, functions?: unknown): unknown {
    this.entityState = entityId ? hass.states[entityId] : undefined;

    this.functionBody = expression.trim();

    if (this.functionBody.startsWith(">")) {
      this.functionBody = this.functionBody.slice(">".length).trim(); // expression beginning with > is real JavaScript code
    }
    else if (this.functionBody.indexOf('${') >= 0) {
      if (this.functionBody.startsWith('"') && this.functionBody.endsWith('"')) {
        this.functionBody = this.functionBody.slice(1, this.functionBody.length - 2); // remove leading and trailing quotes
      }

      this.functionBody = this.functionBody.replace(/\\"/g, '"'); // change escaped quotes to just quotes

      this.functionBody = `\`${this.functionBody}\`;`;

      if (this.functionBody.indexOf('return') < 0) {
        this.functionBody = `return ${this.functionBody}`;
      }
    }

    this.cacheItem = this.cache[this.functionBody];
    if (this.cacheItem) {
      this.interpreter = this.cacheItem.interpreter;
      this.parsedFunction = this.cacheItem.parsedFunction;
    }
    else {
      // Create a interpreter
      this.interpreter = new Sval({ ecmaVer: 2019, sandBox: true });
      this.parsedFunction = this.interpreter.parse(`exports.result = (() => { ${this.functionBody} })();`);

      // Add global modules in interpreter (static data)
      this.interpreter.import('config', config);
      this.interpreter.import('functions', functions);
      this.interpreter.import('util', this.util);

      this.cacheItem = { interpreter: this.interpreter, parsedFunction: this.parsedFunction };
      this.cache[this.functionBody] = this.cacheItem;
    }

    // Add global modules in interpreter (dynamic data)
    this.interpreter.import('entity', this.entityState);
    this.interpreter.import('entities', hass.states);
    this.interpreter.import('hass', hass);
    this.interpreter.import('element', svgElement);
    this.interpreter.import('elements', svgElements);

    this.interpreter.run(this.parsedFunction);

    return this.interpreter.exports.result;
  }
}
