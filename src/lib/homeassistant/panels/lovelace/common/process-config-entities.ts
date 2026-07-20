// Port of home-assistant/frontend
// src/panels/lovelace/common/process-config-entities.ts,
// simplified to the plain entity-config shape used by the chart feature.

export interface EntityConfig {
  entity: string;
  name?: string;
  type?: string;
  [key: string]: unknown;
}

const isValidEntityId = (entityId: string): boolean =>
  /^(\w+)\.(\w+)$/.test(entityId);

export const processConfigEntities = (
  entities: (string | EntityConfig)[],
  checkEntityId = true
): EntityConfig[] => {
  if (!entities || !Array.isArray(entities)) {
    throw new Error('Entities need to be an array');
  }

  return entities.map((entityConf, index) => {
    if (
      typeof entityConf === 'object' &&
      !Array.isArray(entityConf) &&
      entityConf.type
    ) {
      return entityConf;
    }

    let config: EntityConfig;

    if (typeof entityConf === 'string') {
      config = { entity: entityConf };
    } else if (typeof entityConf === 'object' && !Array.isArray(entityConf)) {
      if (!('entity' in entityConf)) {
        throw new Error(
          `Entity object at position ${index} is missing entity field`
        );
      }
      config = entityConf as EntityConfig;
    } else {
      throw new Error(`Invalid entity specified at position ${index}`);
    }

    if (checkEntityId && !isValidEntityId(config.entity)) {
      throw new Error(
        `Invalid entity ID at position ${index}: ${config.entity}`
      );
    }

    return config;
  });
};
