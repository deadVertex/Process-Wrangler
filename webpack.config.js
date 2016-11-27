var path = require('path');

module.exports = {
  entry: ['./src/renderer.jsx'],
  output: {
    path: path.join(__dirname, 'build'),
    filename: 'renderer.js'
  },
  resolve: {
    extensions: ['', '.js', '.jsx']
  },
  target: "electron",
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /(node_modules|public)/,
        loader: "babel"
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        loader: 'file?name=build/fonts[name].[ext]'
      }
    ]
  }
}
