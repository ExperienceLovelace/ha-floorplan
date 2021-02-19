import { HomeAssistant } from '../../../lib/homeassistant/types';
import { FloorplanConfig } from './/floorplan-config';
import { ColorUtil } from './color-util';
import Sval from 'sval';

export class EvalHelper {
  static evaluate(expression: string, hass: HomeAssistant, config: FloorplanConfig, entityId?: string,
    svgElement?: SVGGraphicsElement, svgElements?: { [elementId: string]: SVGGraphicsElement }, functions?: unknown): unknown {
    const entityState = entityId ? hass.states[entityId] : undefined;

    let functionBody = expression.trim();

    if (functionBody.startsWith(">")) {
      functionBody = functionBody.slice(">".length).trim(); // expression beginning with |- is real JavaScript code
    }
    else if (functionBody.indexOf('${') >= 0) {
      if (functionBody.startsWith('"') && functionBody.endsWith('"')) {
        functionBody = functionBody.slice(1, functionBody.length - 2); // remove leading and trailing quotes
      }

      functionBody = functionBody.replace(/\\"/g, '"'); // change escaped quotes to just quotes

      functionBody = `\`${functionBody}\`;`;

      if (functionBody.indexOf('return') < 0) {
        functionBody = `return ${functionBody}`;
      }
    }

    const util = {
      color: ColorUtil,
    };

    // Create a interpreter
    const interpreter = new Sval({ ecmaVer: 2019, sandBox: true });

    const funcWrapper = `
      function ___wrapper___() {
        ${functionBody}
      }
      const ___result___ = ___wrapper___();

      exports.result = ___result___;
    `;

    const parsedFunc = interpreter.parse(funcWrapper);

    // Add global modules in interpreter
    interpreter.import('entity', entityState);
    interpreter.import('entities', hass.states);
    interpreter.import('hass', hass);
    interpreter.import('config', config);
    interpreter.import('element', svgElement);
    interpreter.import('elements', svgElements);
    interpreter.import('functions', functions);
    interpreter.import('util', util);

    interpreter.run(parsedFunc);

    // Get exports from runs
    const resultNew = interpreter.exports.result;

    return resultNew;
  }
}
