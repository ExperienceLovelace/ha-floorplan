import { PanelInfo } from '../../lib/homeassistant/frontend-types';
import { FloorplanConfig } from '../floorplan/lib/floorplan-config';

export interface FloorplanPanelInfo extends PanelInfo<FloorplanPanelConfig> {
  component_name: string;
  icon: string;
  require_admin: boolean;
  title: string;
  url_path: string;
  config: FloorplanPanelConfig;
}

export interface FloorplanPanelConfig {
  show_side_bar: boolean;
  show_app_header: boolean;
  config: FloorplanConfig | string;
}
