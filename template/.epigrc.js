const path = require('path');

const config = {
  plugins: [
    ['epig-plugin-admin', {}],
    ['epig-plugin-html', { inject: true, template: path.resolve('./public/index.html') }],
    ['epig-plugin-copy-server', { output: 'dist' }],
  ],
  chainWebpack: (config, { webpack }) => {
    config.optimization.splitChunks({
      cacheGroups: {
        ['vendor']: {
          test: /[\\/]node_modules[\\/](?!@epig\/admin-tools)/,
          name: 'vendor',
          chunks: 'all',
        },
        // // 抽离antd && rc-*
        antd: {
          test: /(antd|rc-)/,
          name: 'antd',
          chunks: 'all',
          enforce: true,
          priority: 2,
        },
        wangEditor: {
          test: /wangEditor/,
          name: 'wangEditor',
          chunks: 'async',
          priority: 3,
          enforce: true,
        },
        commons: {
          name: 'commons',
          chunks: 'async',
          minChunks: 2,
          enforce: true,
          priority: 1,
        },
      },
    });
  },
};

module.exports = config;
