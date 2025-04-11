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

// Define global variables for Jest environment
global.NAME = packageJson.name;
global.DESCRIPTION = packageJson.description + ' (Test Jest-env)';
global.VERSION = packageJson.version;

let examples_server;

beforeAll(() => {
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
