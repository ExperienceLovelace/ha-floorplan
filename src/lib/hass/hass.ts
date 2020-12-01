export class HassObject {
  states: { [index: string]: HassEntityState } = {};
  dockedSidebar!: string;

  constructor(public callService: (domain: string, service: string, data: any) => void) {
  }

  clone(): HassObject {
    const hass = new HassObject(this.callService);
    hass.states = JSON.parse(JSON.stringify(this.states));
    return hass;
  }
}

export class HassEntityStates {
  states!: { [index: string]: HassEntityState };
}

export class HassEntityState {
  entity_id!: string;
  state!: string;
  last_changed!: Date;
  last_updated!: Date;
  attributes!: { [index: string]: any };
  context: any;
}
