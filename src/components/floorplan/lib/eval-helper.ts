import { HomeAssistant } from '../../../lib/homeassistant/types';
import { HassEntity } from '../../floorplan-examples/homeassistant';
import { FloorplanConfig } from './/floorplan-config';
import { ColorUtil } from './color-util';
import { DateUtil } from './date-util';
import Sval from 'sval';

export class EvalHelper {
  static cache: { [key: string]: () => void } = {};

  static interpreter = new Sval({ ecmaVer: 2019, sandBox: true });
  static parsedFunction: () => void;

  static expression: string;
  static functionBody: string;
  static entityState: HassEntity | undefined;

  static util = {
    color: ColorUtil,
    date: DateUtil,
  };

  static isCode(expression: string): boolean {
    return this.isCodeBlock(expression) || this.isCodeLine(expression);
  }

  static isCodeBlock(expression: string): boolean {
    return expression.trim().startsWith('>');
  }

  static isCodeLine(expression: string): boolean {
    return expression.indexOf('${') >= 0 && expression.indexOf('}') >= 0;
  }

  static evaluate(
    expression: string,
    hass: HomeAssistant,
    config: FloorplanConfig,
    entityId?: string,
    svgElement?: SVGGraphicsElement,
    svgElements?: { [elementId: string]: SVGGraphicsElement },
    functions?: unknown
  ): unknown {
    this.expression = expression.trim();

    const cacheKey = `${this.expression}_${svgElement ?? ''}`;

    this.parsedFunction = this.cache[cacheKey];
    if (this.parsedFunction === undefined) {
      this.functionBody = this.expression;

      if (this.isCodeBlock(this.functionBody)) {
        this.functionBody = this.functionBody.slice('>'.length).trim(); // expression beginning with > is real JavaScript code
      } else if (this.isCodeLine(this.functionBody)) {
        if (
          this.functionBody.startsWith('"') &&
          this.functionBody.endsWith('"')
        ) {
          this.functionBody = this.functionBody.slice(
            1,
            this.functionBody.length - 2
          ); // remove leading and trailing quotes
        }

        this.functionBody = this.functionBody.replace(/\\"/g, '"'); // change escaped quotes to just quotes

        this.functionBody = `\`${this.functionBody}\`;`;

        if (this.functionBody.indexOf('return') < 0) {
          this.functionBody = `return ${this.functionBody}`;
        }
      }

      this.parsedFunction = this.interpreter.parse(
        `exports.result = (() => { ${this.functionBody} })();`
      );
      this.cache[cacheKey] = this.parsedFunction;

      // Add global modules in interpreter (static data)
      this.interpreter.import('config', config);
      this.interpreter.import('util', this.util);
    }

    this.entityState = entityId ? hass.states[entityId] : undefined;

    // Add global modules in interpreter (dynamic data)
    this.interpreter.import('functions', functions);
    this.interpreter.import('entity', this.entityState);
    this.interpreter.import('entities', hass.states);
    this.interpreter.import('states', hass.states);
    this.interpreter.import('hass', hass);
    this.interpreter.import('element', svgElement);
    this.interpreter.import('elements', svgElements);

    this.interpreter.run(this.parsedFunction);

    return this.interpreter.exports.result;
  }
}
