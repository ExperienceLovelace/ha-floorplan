import { HassObject, HassEntityState } from './hass';

export class SimulatorConfig {
  simulations = new Array<Simulation>();
}

export class Simulation {
  entities = new Array<string | SimulationEntity>();
  states = new Array<SimulationState>();
  enabled: boolean = true;
}

export class SimulationEntity {
  entity?: string;
  attributes?: { [index: string]: any };
}

export class SimulationState {
  state: string = "";
  duration: number = 0;
}

export class Simulator {
  simulationProcessors = new Array<SimulationProcessor>();
  hass = new HassObject();

  constructor(simulatorConfig: SimulatorConfig, private hassChanged: (hass: HassObject) => void) {
    for (let simulation of simulatorConfig.simulations) {
      const simulationProcessor = new SimulationProcessor(simulation, this.entityStatesChanged.bind(this));
      this.simulationProcessors.push(simulationProcessor);
    }
  }

  entityStatesChanged(entityStates: Array<HassEntityState>) {
    for (let entityState of entityStates) {
      this.hass.states![entityState.entity_id!] = entityState;
    }

    this.hassChanged(this.hass);
  }
}

export class SimulationProcessor {
  currentIndex = 0;

  constructor(private simulation: Simulation, private entityStatesChanged: (entityStates: Array<HassEntityState>) => void) {
    if (!this.simulation.states.length) {
      console.error(simulation);
    }

    this.triggerState(this.simulation.states[0]);
  }

  triggerState(currentState: SimulationState) {
    if (this.simulation.enabled || (this.simulation.enabled === undefined)) {
      this.updateEntityStates(currentState.state);
    }

    const currentIndex = this.simulation.states.indexOf(currentState);
    const nextIndex = (currentIndex + 1) % this.simulation.states.length;
    const nextState = this.simulation.states[nextIndex];

    setTimeout(this.triggerState.bind(this), currentState.duration * 1000, nextState);
  }

  updateEntityStates(state: string) {
    const entityStates = this.simulation.entities.map((entity) => {
      const entityId = (typeof entity === 'string') ? entity : (entity as SimulationEntity).entity;

      let attributes = {} as { [index: string]: any };
      if ((entity as SimulationEntity).attributes) {
        attributes = (entity as SimulationEntity).attributes!;
      }
      attributes!.friendly_name = attributes!.friendly_name ? attributes!.friendly_name : entityId;

      return {
        entity_id: entityId,
        state: state,
        last_changed: new Date(),
        last_updated: new Date(),
        attributes: attributes,
        context: {},
      } as HassEntityState;
    });

    this.entityStatesChanged(entityStates);
  }
}
