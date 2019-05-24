import { Hass } from '../hass/hass';
import { Floorplan as Config } from './floorplan-config';

export namespace Floorplan {

  export class FloorplanOptions {
    root?: Node;
    element?: HTMLElement;
    hassObject?: Hass.HassObject;
    config?: Config.ConfigBase;
    openMoreInfo = (entityId: string) => { };
    setIsLoading = (isLoading: boolean) => { };
  }

}
