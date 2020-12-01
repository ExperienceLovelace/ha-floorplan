import { FloorplanConfig } from '../../components/floorplan/lib/floorplan-config';

export class Panel {
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
