import { Floorplan as FloorplanConfig } from './floorplan-config';

export namespace Lovelace {

  export class CardConfig {
    title?: string;
    type?: string;
    config?: FloorplanConfig.FloorplanConfig
  }

}