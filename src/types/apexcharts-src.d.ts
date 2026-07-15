/*
 * Module shims for apexcharts' exported src/ surface, used by
 * charts/apexcharts-loader.ts. The package's exports map provides these
 * paths, but TypeScript's classic Node module resolution cannot read
 * exports maps (webpack resolves them natively).
 */

declare module 'apexcharts/src/apexcharts' {
  import ApexCharts from 'apexcharts';
  export default ApexCharts;
}

declare module 'apexcharts/src/features/*';

declare module 'apexcharts/src/charts/*' {
  const chartClass: new (...args: unknown[]) => unknown;
  export default chartClass;
}
