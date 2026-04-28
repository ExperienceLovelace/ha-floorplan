import '@testing-library/jest-dom';
import 'whatwg-fetch'; // Polyfill fetch and Request
import packageJson from './package.json';
import express from 'express';
import path from 'path'; // Import path module for resolving paths
import { jest } from '@jest/globals'; // Ensure Jest is recognized

// Ensure Request is explicitly available
if (typeof global.Request === 'undefined') {
  global.Request = window.Request;
  global.Headers = window.Headers;
  global.origin = window.location.origin;
}

// Polyfill Touch + TouchEvent for jsdom
if (typeof global.Touch === 'undefined') {
  class Touch {
    constructor(init = {}) {
      this.identifier = init.identifier;
      this.target = init.target;
      this.clientX = init.clientX || 0;
      this.clientY = init.clientY || 0;
      this.screenX = init.screenX || 0;
      this.screenY = init.screenY || 0;
      this.pageX = init.pageX || 0;
      this.pageY = init.pageY || 0;
      this.radiusX = init.radiusX || 0;
      this.radiusY = init.radiusY || 0;
      this.rotationAngle = init.rotationAngle || 0;
      this.force = init.force || 0;
    }
  }

  class TouchEvent extends Event {
    constructor(type, eventInitDict = {}) {
      super(type, eventInitDict);
      this.touches = eventInitDict.touches || [];
      this.targetTouches = eventInitDict.targetTouches || [];
      this.changedTouches = eventInitDict.changedTouches || [];
    }
  }

  global.Touch = Touch;
  global.TouchEvent = TouchEvent;
  if (typeof window !== 'undefined') {
    window.Touch = Touch;
    window.TouchEvent = TouchEvent;
  }
}

// Define global variables for Jest environment
global.NAME = packageJson.name;
global.DESCRIPTION = packageJson.description + ' (Test Jest-env)';
global.VERSION = packageJson.version;

let examples_server;

beforeAll(() => {
  global.window = global;
  window.customElements = window.customElements || {
    define: jest.fn(),
    get: jest.fn(),
  };
  
  window.loadCardHelpers = jest.fn().mockResolvedValue({
    createCardElement: jest.fn().mockImplementation((config) => {
      const card = document.createElement("ha-card");

      card.config = config;
      card.hass = null;
      card.updateComplete = Promise.resolve();
      
      return card;
    }),
  });

  // Mock getBBox for SVG elements
  Object.defineProperty(SVGElement.prototype, 'getBBox', {
    value: jest.fn().mockReturnValue({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    }),
  });

  // Mock SVGTextElement
  global.SVGTextElement = class extends SVGElement {};

  const app = express();
  const examplesPath = path.resolve(process.cwd(), 'docs/_docs/floorplan');

  app.use('/', express.static(examplesPath));

  examples_server = app.listen(8080, () => {
    console.log('Serving examples folder at http://localhost:8080/');
  });
});

afterAll((done) => {
  // Close the server after tests are done
  examples_server.close(done);
});
