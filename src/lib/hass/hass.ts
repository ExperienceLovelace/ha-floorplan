export class HassObject {
  states?: { [index: string]: HassEntityState } = {};

  constructor(public callService: (domain: string, service: string, data: any) => void) {
  }
}

export class HassEntityStates {
  states?: { [index: string]: HassEntityState };
}

export class HassEntityState {
  entity_id?: string;
  state?: string;
  last_changed?: Date;
  last_updated?: Date;
  attributes?: { [index: string]: any };
  context: any;
}
