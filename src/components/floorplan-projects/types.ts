import { HassEntity } from './homeassistant';

export interface FloorplanProject {
  dir: string;
  configFile: string;
  simulationFile: string
}

export interface HassSimulatorConfig {
  simulations: HassSimulation[];
}

export interface HassSimulation {
  entity: HassEntity;
  states: TimedHassEntity[];
  enabled: boolean;
}

export interface TimedHassEntity extends HassEntity {
  duration: number;
}
