import { TTAdminAppOptions } from '@epig/admin-tools';
import './app.less';

const config = {
  app: {
    persistConfig: {
      key: '<%= appName %>',
    },
    appName: '管理后台',
  } as TTAdminAppOptions,
  root: 'root',
};

export default config;
