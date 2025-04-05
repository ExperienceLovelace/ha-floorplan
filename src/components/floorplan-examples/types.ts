import { HassEntity } from './homeassistant';

export interface FloorplanExample {
  name: string;
  dir: string;
  configFile?: string;
  configYaml?: string;
  simulationFile?: string;
  simulationYaml?: string;
  isCard: boolean;
}

export interface HassSimulatorConfig {
  simulations: HassSimulation[];
}

export interface HassSimulation {
  entity: string;
  entities: string[];
  state: HassEntity;
  states: HassEntity[];
  enabled: boolean;
}

export interface TimedHassEntity extends HassEntity {
  duration: number | string;
}
