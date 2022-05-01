const path = require('path');

module.exports = {
  entry: {
    index: '../app/lib/app.ts',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          'ts-loader',
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'js-macro-bundle.js',
    path: path.resolve(__dirname, '../../dist/prod'),
  },
  externalsType: 'module',
  externals: {
    timer: 'timer',
    'pins/digital': 'pins/digital',
    bleserver: 'bleserver',
    btutils: 'btutils',
  },
  experiments: {
    outputModule: true,
  },
};
