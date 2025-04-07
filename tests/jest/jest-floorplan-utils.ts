import { retry } from './jest-common-utils';
import { FloorplanExampleElement } from '../../src/components/floorplan-examples/floorplan-example';
import { FloorplanCard } from '../../src/components/floorplan-card/floorplan-card';
import { FloorplanElement } from '../../src/components/floorplan/floorplan-element';
type QuerySelector<T> = {
  selector: string;
  errorMessage: string;
  instanceOf: new (...args: any[]) => T;
};

export const global_document_object_key = '__floorplanTest' as string;

async function getElement<T>(
  query: QuerySelector<T>,
  root: ParentNode = document,
  retries = 5,
  delay = 1000
): Promise<T> {
  return retry(async () => {
    const element = root.querySelector(query.selector) as T;
    if (!element) {
      throw new Error(query.errorMessage);
    }
    expect(element).toBeInstanceOf(query.instanceOf);
    return element;
  }, retries, delay);
}

export async function getFloorplanExampleElement(
  retries = 5,
  delay = 1000
): Promise<FloorplanExampleElement> {
  return getElement<FloorplanExampleElement>(
    {
      selector: 'floorplan-example',
      errorMessage: 'floorplan-example not found',
      instanceOf: FloorplanExampleElement,
    },
    document,
    retries,
    delay
  );
}

export async function getFloorplanCard(
  retries = 5,
  delay = 1000
): Promise<FloorplanCard> {
  const floorplanElement = await getFloorplanExampleElement(retries, delay);
  if (!floorplanElement.shadowRoot) throw new Error('Shadow root not found');

  return getElement<FloorplanCard>(
    {
      selector: 'floorplan-card',
      errorMessage: 'floorplan-card not found inside floorplan-example',
      instanceOf: FloorplanCard,
    },
    floorplanElement.shadowRoot,
    retries,
    delay
  );
}

export async function getFloorplanElement(
  retries = 5,
  delay = 1000
): Promise<FloorplanElement> {
  const card = await getFloorplanCard(retries, delay);
  if (!card.shadowRoot) throw new Error('Shadow root not found');
  return getElement<FloorplanElement>(
    {
      selector: 'floorplan-element',
      errorMessage: 'floorplan-element not found inside floorplan-card',
      instanceOf: FloorplanElement,
    },
    card.shadowRoot,
    retries,
    delay
  );
}

export async function getFloorplanSvg(
  retries = 5,
  delay = 1000
): Promise<SVGElement> {
  const floorplanElement = await getFloorplanElement(retries, delay);
  if (!floorplanElement.shadowRoot) throw new Error('Shadow root not found');

  return getElement<SVGElement>(
    {
      selector: 'svg',
      errorMessage: 'SVG element not found inside floorplan-element',
      instanceOf: SVGElement,
    },
    floorplanElement.shadowRoot,
    retries,
    delay
  );
}

export function createFloorplanExampleElement(
  exampleConfig: {
    name: string;
    dir: string;
    configFile?: string;
    configYaml?: string;
    simulationFile?: string;
    simulationYaml?: string;
    isCard: boolean;
  },
  examplespath: string,
  isDemo: boolean,
  notify: () => void
): FloorplanExampleElement {
  if (!exampleConfig.configFile && !exampleConfig.configYaml) {
    throw new Error('Either configFile or configYaml must be set.');
  }

  const floorplanExampleElement = document.createElement(
    'floorplan-example'
  ) as FloorplanExampleElement;

  // Set properties
  floorplanExampleElement.examplespath = examplespath;
  floorplanExampleElement.example = exampleConfig;
  floorplanExampleElement.isDemo = isDemo;
  floorplanExampleElement.notify = notify;

  document.body.appendChild(floorplanExampleElement);
  return floorplanExampleElement;
}

// Helper to pull the result of a given execute statement, which are saved to the window dom called floorplanTest
export async function getFloorplanHelper(helper_key: string): Promise<any> {
  // Use the utility function to get the floorplan element
  const floorplan_element = await getFloorplanElement();
  expect(floorplan_element).toBeInstanceOf(FloorplanElement);

  const floorplan_view = floorplan_element?.shadowRoot?.host?.ownerDocument
    ?.defaultView as any;
  const document = floorplan_view?._document as Document;

  let global_helper_obj;
  if (global_document_object_key in document)
    global_helper_obj = (document as any)[global_document_object_key] as any;

  // Check that the window.${test_obj_ref} exists
  expect(global_helper_obj).toBeDefined();

  // Check if helper_to_test is part of test_obj
  expect(helper_key in global_helper_obj);

  return global_helper_obj[helper_key];
};
