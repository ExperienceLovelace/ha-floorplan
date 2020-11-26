import { HassObject } from '../hass/hass';
import { FloorplanConfigBase } from './floorplan-config';

export class FloorplanOptions {
  root?: Node;
  element?: HTMLElement;
  hassObject?: HassObject;
  config?: FloorplanConfigBase;
  openMoreInfo = (entityId: string) => { };
  setIsLoading = (isLoading: boolean) => { };
}
