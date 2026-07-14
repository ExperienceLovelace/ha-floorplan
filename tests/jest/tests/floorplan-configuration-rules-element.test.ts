import '@testing-library/jest-dom';
import '../../../src/components/floorplan-examples/floorplan-examples';
import { FloorplanElement } from '../../../src/components/floorplan/floorplan-element';
import {
  createFloorplanExampleElement,
  getFloorplanElement,
  getFloorplanHelper,
  getFloorplanSvg,
  global_document_object_key,
} from '../jest-floorplan-utils';
import { retry } from '../jest-common-utils';

describe('Configuration - rules element/elements', () => {
  afterEach(() => {
    const element = document.querySelector('floorplan-example');
    if (element) element.remove();
  });

  it('resolves rule using "element" key', async () => {
    const targetSvgElementId = 'entity-1-state';
    const classToAdd = 'element-rule-class';

    createFloorplanExampleElement(
      {
        name: 'TestPlate',
        dir: 'test_plate',
        configYaml: `title: TestPlate
config:
  image: /local/floorplan/examples/test_plate/test_plate.svg
  stylesheet: /local/floorplan/examples/test_plate/test_plate.css
  rules:
    - element: ${targetSvgElementId}
      state_action:
        service: floorplan.class_set
        service_data:
          class: ${classToAdd}
        `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    const floorplanElement = await getFloorplanElement();
    expect(floorplanElement).toBeInstanceOf(FloorplanElement);

    const svg = await getFloorplanSvg();
    expect(svg).toBeInstanceOf(SVGElement);

    await retry(async () => {
      const targetEl = svg.querySelector(`#${targetSvgElementId}`) as SVGElement;
      expect(targetEl).toBeDefined();
      expect(targetEl.classList.contains(classToAdd)).toBeTruthy();
    }, 10, 700);
  });

  it('resolves rule using "elements" key for multiple string ids', async () => {
    const targetSvgElementId = 'entity-1-state';
    const secondTargetSvgElementId = 'entity-2-state';
    const classToAdd = 'elements-rule-class';

    createFloorplanExampleElement(
      {
        name: 'TestPlate',
        dir: 'test_plate',
        configYaml: `title: TestPlate
config:
  image: /local/floorplan/examples/test_plate/test_plate.svg
  stylesheet: /local/floorplan/examples/test_plate/test_plate.css
  rules:
    - elements:
        - ${targetSvgElementId}
        - ${secondTargetSvgElementId}
      state_action:
        service: floorplan.class_set
        service_data:
          class: ${classToAdd}
        `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    const floorplanElement = await getFloorplanElement();
    expect(floorplanElement).toBeInstanceOf(FloorplanElement);

    const svg = await getFloorplanSvg();
    expect(svg).toBeInstanceOf(SVGElement);

    await retry(async () => {
      const firstEl = svg.querySelector(`#${targetSvgElementId}`) as SVGElement;
      const secondEl = svg.querySelector(
        `#${secondTargetSvgElementId}`
      ) as SVGElement;

      expect(firstEl).toBeDefined();
      expect(secondEl).toBeDefined();
      expect(firstEl.classList.contains(classToAdd)).toBeTruthy();
      expect(secondEl.classList.contains(classToAdd)).toBeTruthy();
    }, 10, 700);
  });

  it('resolves "elements" entries with per-element entity mappings', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'entity-1-state';
    const secondTargetSvgElementId = 'entity-2-state';
    const helperToTest = 'elementsEntityMapping';

    createFloorplanExampleElement(
      {
        name: 'TestPlate',
        dir: 'test_plate',
        configYaml: `title: TestPlate
config:
  image: /local/floorplan/examples/test_plate/test_plate.svg
  stylesheet: /local/floorplan/examples/test_plate/test_plate.css
  rules:
    - elements:
        - element: ${targetSvgElementId}
          entity: ${simulatedEntity}
        - element: ${secondTargetSvgElementId}
          entity: ${simulatedEntity}
      tap_action:
        service: floorplan.execute
        service_data:
          test_script_for_helper: |
            > if(typeof document['${global_document_object_key}'] === 'undefined') document.${global_document_object_key} = {};
            if(!document.${global_document_object_key}['${helperToTest}']) document.${global_document_object_key}['${helperToTest}'] = [];
            document.${global_document_object_key}['${helperToTest}'].push({ element: element.id, entity: entity.entity_id });
        `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    const floorplanElement = await getFloorplanElement();
    expect(floorplanElement).toBeInstanceOf(FloorplanElement);

    const svg = await getFloorplanSvg();
    expect(svg).toBeInstanceOf(SVGElement);

    await retry(async () => {
      const firstEl = svg.querySelector(`#${targetSvgElementId}`) as SVGElement;
      const secondEl = svg.querySelector(
        `#${secondTargetSvgElementId}`
      ) as SVGElement;

      firstEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      secondEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }, 10, 700);

    await retry(async () => {
      const helperRef = await getFloorplanHelper(helperToTest);
      expect(helperRef).toEqual(
        expect.arrayContaining([
          { element: targetSvgElementId, entity: simulatedEntity },
          { element: secondTargetSvgElementId, entity: simulatedEntity },
        ])
      );
    }, 10, 700);
  });
});
