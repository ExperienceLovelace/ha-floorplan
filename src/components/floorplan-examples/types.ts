import { HassEntity } from './homeassistant';

export interface FloorplanExanple {
  dir: string;
  configFile: string;
  simulationFile: string
}

export interface HassSimulatorConfig {
  simulations: HassSimulation[];
}

export interface HassSimulation {
  entity: string;
  entities: string[];
  states: TimedHassEntity[];
  enabled: boolean;
}

export interface TimedHassEntity extends HassEntity {
  duration: number;
}
