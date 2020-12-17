import { HomeAssistant } from '../../../lib/homeassistant/frontend-types';
import { HassEntity, HassEntities } from '../../../lib/homeassistant/core-types';
import { FloorplanConfig } from './/floorplan-config';
import { ColorUtil } from './color-util';

export class EvalHelper {
  static evaluateFunctionCache: { [key: string]: EvaluateFunction } = {};

  static evaluate(expression: string, hass: HomeAssistant, config: FloorplanConfig, entityId?: string, svgElement?: SVGGraphicsElement): unknown {
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

    let targetFunc: EvaluateFunction;

    if (this.evaluateFunctionCache[functionBody]) {
      //console.log('Getting function from cache:', functionBody);
      targetFunc = this.evaluateFunctionCache[functionBody];
    }
    else {
      //console.log('Adding function to cache:', functionBody);
      const func = new Function('entity', 'entities', 'hass', 'config', 'element', 'util', functionBody) as EvaluateFunction;
      this.evaluateFunctionCache[functionBody] = func;
      targetFunc = func;
    }

    const util = {
      color: ColorUtil,
    };

    const result = targetFunc(entityState as HassEntity, hass.states, hass, config, svgElement, util);

    return result;
  }
}

type EvaluateFunction =
  (
    entityState: HassEntity,
    states: HassEntities,
    hass: HomeAssistant,
    config: FloorplanConfig,
    svgElement: SVGGraphicsElement | undefined,
    util: { color: ColorUtil },
  ) => unknown;