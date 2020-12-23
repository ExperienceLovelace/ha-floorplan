import { PanelInfo } from '../../lib/homeassistant/types';
import { FloorplanConfig } from '../floorplan/lib/floorplan-config';

export interface FloorplanPanelInfo extends PanelInfo<FloorplanPanelConfig> {
  config: FloorplanPanelConfig;
}

export interface FloorplanPanelConfig {
  show_side_bar: boolean;
  show_app_header: boolean;
  config: FloorplanConfig | string;
}
