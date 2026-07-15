// SVG helpers for the floorplan chart feature.
// Reconstructed from ha-floorplan v1.0.36beta181 (see chart-util.ts for
// the feature overview).

import { Utils } from '../../../../lib/utils';
import OuiDomEvents from '../oui-dom-events.js'; // Ensure the .js extension is included, to be handled by babel
const E = OuiDomEvents;

const SVG_NS = 'http://www.w3.org/2000/svg';

const getChildElements = (
  element: Element,
  selector: string,
  includeSelf: boolean
): Element[] => {
  let elements = selector
    ? Array.from(element.querySelectorAll(selector).values())
    : [];
  elements = includeSelf ? [element].concat(elements) : elements;
  return elements;
};

/*
 * Replaces an SVG element with a new one, transferring id, classes and
 * geometry, and detaching all click/long-click handlers from the old subtree.
 * Used to swap a placeholder <rect>/<path> for the chart's <g>.
 */
export function replaceSvgElement(
  previousElement: SVGGraphicsElement,
  newElement: SVGGraphicsElement,
  bbox?: DOMRect
): SVGGraphicsElement {
  const parent = previousElement.parentElement;

  for (const cssClass of Array.from(previousElement.classList)) {
    newElement.classList.add(cssClass);
  }

  getChildElements(previousElement, '*', true).forEach((element) => {
    E.off(element, 'click');
    E.off(element, 'singleClick');
    E.off(element, 'doubleClick');
    E.off(element, 'longClick');
    element.remove();
  });

  if (bbox) {
    newElement.setAttribute('height', bbox.height.toString());
    newElement.setAttribute('width', bbox.width.toString());
    newElement.setAttribute('x', bbox.x.toString());
    newElement.setAttribute('y', bbox.y.toString());
  }

  const id = previousElement.id;
  previousElement.id = '';
  newElement.id = id;

  parent?.appendChild(newElement);
  previousElement.remove();

  return newElement;
}

export function createSvgElement(
  tagName: string,
  x?: number,
  y?: number,
  width?: number,
  height?: number
): SVGGraphicsElement {
  const element = document.createElementNS(
    SVG_NS,
    tagName
  ) as SVGGraphicsElement;
  if (x !== undefined) element.setAttribute('x', x.toString());
  if (y !== undefined) element.setAttribute('y', y.toString());
  if (width !== undefined) element.setAttribute('width', width.toString());
  if (height !== undefined) element.setAttribute('height', height.toString());
  return element;
}

export const createSvgGroup = (
  x: number,
  y: number,
  width: number,
  height: number
): SVGGElement => createSvgElement('g', x, y, width, height) as SVGGElement;

export const createSvgRect = (
  x: number,
  y: number,
  width: number,
  height: number
): SVGRectElement =>
  createSvgElement('rect', x, y, width, height) as SVGRectElement;

export const createSvgForeignObject = (
  x: number,
  y: number,
  width: number,
  height: number
): SVGForeignObjectElement =>
  createSvgElement(
    'foreignObject',
    x,
    y,
    width,
    height
  ) as SVGForeignObjectElement;

/*
 * Appends a <style> element with the given CSS to the target (the floorplan
 * element's renderRoot), awaiting DOM attach. Used to inject the
 * ApexCharts/gauge CSS once, on the first render of a chart.
 */
export async function appendStyle(
  target: Element | ShadowRoot | DocumentFragment,
  styles: string
): Promise<void> {
  if (!styles?.trim().length) return;

  const styleElement = document.createElement('style');

  const initializeNode = () => {
    styleElement.innerHTML = styles;
    target.appendChild(styleElement);
  };

  await Utils.waitForChildNodes(styleElement, initializeNode, 10000);
}
