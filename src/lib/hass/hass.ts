export class HassObject {
  callService = (domain: string, service: string, data: any) => { };
  states?: { [index: string]: HassEntityState } = {};
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
