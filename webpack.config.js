import path from 'path';
import { fileURLToPath } from 'url';
import TerserPlugin from 'terser-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import webpack from 'webpack'; // Import the default export
import packageInfo from './package.json' with { type: 'json' };

const { DefinePlugin } = webpack; // Destructure DefinePlugin from the default export

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env) => {
  const isProduction = env.production;

  const plugins = isProduction
    ? [
        new CopyPlugin({
          patterns: [
            {
              from: path.resolve(__dirname, 'dist', 'floorplan-examples.js'),
              to: path.resolve(__dirname, 'docs', '_docs', 'floorplan'),
              force: true,
              noErrorOnMissing: true, // Prevent errors if the file doesn't exist yet
            },
          ],
          options: {
            concurrency: 100, // Workaround to ensure copying is done after the build
          },
        }),
      ]
    : [];

  return {
    mode: isProduction ? 'production' : 'development',
    entry: {
      floorplan: './src/index.ts',
      'floorplan-examples': './src/components/floorplan-examples/floorplan-examples.ts',
    },
    devtool: isProduction ? undefined : 'inline-source-map',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      mainFields: ['browser', 'module', 'main'], // Ensure ES Modules are prioritized
    },
    plugins: [
      new DefinePlugin({
        NAME: JSON.stringify(packageInfo.name),
        DESCRIPTION: JSON.stringify(packageInfo.description),
        VERSION: JSON.stringify(packageInfo.version),
      }),
      ...plugins,
    ],
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, isProduction ? 'dist' : 'dist_local'),
      clean: true,
      libraryTarget: 'module', // Use ES Module output
    },
    experiments: {
      outputModule: true, // Enable ES Module output
    },
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          extractComments: false,
        }),
      ],
    },
    performance: {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },
    devServer: {
      static: {
        directory: path.join(__dirname, 'docs/_docs/floorplan'),
      },
      compress: true,
    },
  };
};