import { HomeAssistant } from '../../../lib/homeassistant/frontend-types';
import { HassEntity, HassEntities } from '../../../lib/homeassistant/core-types';
import { FloorplanConfig } from './/floorplan-config';

export class EvalHelper {
  static evaluateFunctionCache: { [key: string]: EvaluateFunction } = {};

  static evaluate(code: string, hass: HomeAssistant, config: FloorplanConfig, entityId?: string, svgElement?: SVGGraphicsElement): unknown {
    const entityState = entityId ? hass.states[entityId] : undefined;

    let functionBody = (code.indexOf('${') >= 0) ? `\`${code}\`;` : code;
    functionBody = (functionBody.indexOf('return') >= 0) ? functionBody : `return ${functionBody}`;

    let targetFunc: EvaluateFunction;

    if (this.evaluateFunctionCache[functionBody]) {
      //console.log('Getting function from cache:', functionBody);
      targetFunc = this.evaluateFunctionCache[functionBody];
    }
    else {
      //console.log('Adding function to cache:', functionBody);
      const func = new Function('entity', 'entities', 'hass', 'config', 'element', functionBody) as EvaluateFunction;
      this.evaluateFunctionCache[functionBody] = func;
      targetFunc = func;
    }

    const result = targetFunc(entityState as HassEntity, hass.states, hass, config, svgElement);

    return result;
  }
}

type EvaluateFunction =
  (
    entityState: HassEntity,
    states: HassEntities,
    hass: HomeAssistant,
    config: FloorplanConfig,
    svgElement: SVGGraphicsElement | undefined
  ) => unknown;