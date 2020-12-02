import { FloorplanConfig } from '../floorplan/lib/floorplan-config';

export interface FloorplanCardConfig {
  title: string;
  type: string;
  config: FloorplanConfig | string;
}
