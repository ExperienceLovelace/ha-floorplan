import { PanelInfo } from './frontend-types';
import { FloorplanConfig } from '../../components/floorplan/lib/floorplan-config';

export class FloorplanPanel implements PanelInfo<FloorplanPanelConfig> {
  component_name!: string;
  icon!: string;
  require_admin!: boolean;
  title!: string;
  url_path!: string;
  config!: FloorplanPanelConfig;
}

export class FloorplanPanelConfig {
  show_side_bar!: boolean;
  show_app_header!: boolean;
  config!: FloorplanConfig | string;
}

export class FloorplanCardConfig {
  title!: string;
  type!: string;
  config!: FloorplanConfig | string;
}
