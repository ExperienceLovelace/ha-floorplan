import { HassObject } from '../hass/hass';
import { FloorplanConfigBase } from './floorplan-config';

export class FloorplanOptions {
  root?: Node;
  element?: HTMLElement;
  hass?: HassObject;
  config?: FloorplanConfigBase;
  openMoreInfo = (entityId: string) => { };
  setIsLoading = (isLoading: boolean) => { };

  _isDemo: boolean = false; // whether running in demo Web page
}
