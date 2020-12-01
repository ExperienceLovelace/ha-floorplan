import { FloorplanConfig } from '../../components/floorplan/lib/floorplan-config';

export class CardConfig {
  title!: string;
  type!: string;
  config!: FloorplanConfig | string;
}
