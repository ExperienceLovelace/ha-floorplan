import { HassObject, HassEntityState } from './hass';

export class SimulatorConfig {
  simulations = new Array<Simulation>();
}

export class Simulation {
  entity?: HassEntityState;
  states = new Array<TimedHassEntityState>();
  enabled: boolean = true;
}

export class TimedHassEntityState extends HassEntityState {
  duration: number = 0;
}

export class Simulator {
  simulationProcessors = new Array<SimulationProcessor>();
  hass = new HassObject(this.callService.bind(this));

  constructor(simulatorConfig: SimulatorConfig, private hassChanged: (hass: HassObject) => void) {
    for (const simulation of simulatorConfig.simulations) {
      const simulationProcessor = new SimulationProcessor(simulation, this.hass, this.onEntityStatesChanged.bind(this));
      this.simulationProcessors.push(simulationProcessor);
    }
  }

  onEntityStatesChanged(entityStates: Array<HassEntityState>) {
    for (let entityState of entityStates) {
      this.hass.states![entityState.entity_id!] = entityState;
    }

    this.hassChanged(this.hass.clone()); // clone the object!!!
  }

  callService(domain: string, service: string, data: any): void {
    console.log('callService', domain, service, data);

    switch (domain) {
      case 'homeassistant':
        switch (service) {
          case 'toggle':
            this.homeAssistantToggle(data);
            break;
        }
        break;
    }
  }

  homeAssistantToggle(data: any) {
    if (data.entity_id) {
      const entityType = (data.entity_id as string).split('.')[0];
      const state = this.hass.states![data.entity_id!].state;

      switch (entityType) {
        case 'switch':
        case 'light':
          const newState = (state === 'on') ? 'off' : 'on';

          for (const simulationProcessor of this.simulationProcessors) {
            simulationProcessor.updateEntityState(data.entity_id, newState, true);
          }
          break;
      }
    }
  }
}

export class SimulationProcessor {
  currentIndex = 0;

  constructor(private simulation: Simulation, private hass: HassObject, private onEntityStatesChanged: (entityStates: Array<HassEntityState>) => void) {
    if (!this.simulation.entity) {
      console.error('Simulation must contain an entity', simulation);
    }

    if (!this.simulation.states.length) {
      console.error('Simulation must contain at least one state', simulation);
    }

    this.triggerState(this.simulation.states[0]);
  }

  triggerState(currentState: TimedHassEntityState) {
    if (this.simulation.enabled || (this.simulation.enabled === undefined)) {
      this.updateEntityState(this.simulation.entity!, currentState, true);
    }

    const currentIndex = this.simulation.states.indexOf(currentState);
    const nextIndex = (currentIndex + 1) % this.simulation.states.length;
    const nextState = this.simulation.states[nextIndex];

    if (nextState.duration) {
      setTimeout(this.triggerState.bind(this), currentState.duration * 1000, nextState);
    }
  }

  updateEntityState(entity: string | HassEntityState, state: string | TimedHassEntityState, fireOnEntityStatesChanged: boolean) {
    const entityId = (typeof entity === 'string') ? entity : (entity as HassEntityState).entity_id;

    const existingHassState = this.hass.states![entityId!];

    let newHassState: HassEntityState;

    if (existingHassState) {
      // Clone the existing state
      newHassState = Object.assign({}, existingHassState);
      newHassState.attributes = Object.assign({}, existingHassState.attributes);
    }
    else {
      // Create a new state
      newHassState = new HassEntityState();
      newHassState.entity_id = entityId;
    }

    // Assign the new state
    if (typeof state === 'string') {
      newHassState.state = (typeof state === 'string' ? state : (state as TimedHassEntityState).state);
    }
    else if (typeof state === 'object') {
      newHassState.state = (state as TimedHassEntityState).state;

      if ((state as TimedHassEntityState).attributes) {
        newHassState.attributes = Object.assign({}, newHassState.attributes, (state as TimedHassEntityState).attributes);
      }
    }

    // Ensure the attributes object exists
    newHassState.attributes = newHassState.attributes ?? {};
    newHassState.attributes.friendly_name = newHassState.attributes?.friendly_name ?? entityId;

    // Update timestamps
    newHassState.last_changed = new Date();
    newHassState.last_updated = new Date();

    this.onEntityStatesChanged([newHassState]);
  }
}
