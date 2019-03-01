# 管理后台脚手架

## 使用说明

```bash
npx epig-create-admin-app my-app
cd my-app
npm start
```

*([npx](https://medium.com/@maybekatz/introducing-npx-an-npm-package-runner-55f7d4bd282b) comes with npm 5.2+ and higher, see [instructions for older npm versions](https://gist.github.com/gaearon/4064d3c23a77c74a3614c498a8bb1c5f))*

Then open <http://localhost:8000> to see your app.
When you’re ready to deploy to production, create a minified bundle with npm run build.

## 管理后台项目结构说明

```text
├── Dockerfile  docker镜像构建文件
├── README.md
├── docker-compose.yml  docker-compose配置示例
├── pm2.json  生产环境pm2配置
├── proxy.config.js  开发环境api代理配置
├── public
│   └── index.html
├── server  生成环境前端代理服务
│   ├── package.json
│   └── server.js
├── src  源代码
│   ├── app.less  公共样式
│   ├── components  组件库
│   ├── containers  容器（渲染层）
│   │   └── package.json
│   ├── custom.d.ts  自定义typescript定义文件
│   ├── entry.config.ts  入口配置
│   ├── models  model（存放全局的model）
│   │   ├── index.tsx
│   │   └── package.json
│   └── util  工具库
│       └── package.json
├── .epigrc.js  @epig/af-build-dev配置
├── .webpackrc.js  webpack配置
├── tsconfig.json  typescript配置
└── tslint.json  tslint配置
```

## 管理后台项目开发说明

主要开发集中在 `containers` 和 `models` 里面，通常一个页面由一个容器和一个model组成。`model` 采用自动注册的方式注入到容器，[查看使用说明](https://github.com/umijs/umi/issues/171)。

### 渲染层（containers）

`containers` 下的文件结构要跟路由一致

路由：

```text
/system/users
```

容器目录：

```text
└── containers
    └── System
        └── Users
            ├── EditUser /system/user的子页面
            │   ├── index.tsx
            │   └── models.ts
            ├── index.tsx
            └── model.ts
```

`/System/Users/index.tsx` 示例：

```typescript

import * as React from 'react';
import BasicComponent from '@epig/admin-tools/lib/components/BasicComponent';
import model, { UserState } from 'models/system/users';

export interface UserProps {
  users: UserState;
  usersActions: typeof model.actions;
}

class User extends BasicComponent<UserProps, any> {
  render() {
    return (
      <div>
        User
      </div>
    );
  }
}

```

### 数据层（models）

`model` 是action、saga和reducer的集合，使用 [@epig/admin-tools](https://github.com/evel-pig/admin-tools#%E5%88%9B%E5%BB%BAmodel) 提供的工具快速创建。

```bash
npx epig-admin-tools model /system/users/model -- --modelName users
```

users model 示例：

```typescript

import { createModel } from '@epig/admin-tools-lib/model';

export interface UsersState {
  loading: boolean;
}

const model = createModel({
  modelName: 'users',
  action: {
    simple: {},
    api: {
      users: {
        path: '/system/users',
      },
    },
  },
  reducer: ({ apiActionNames, createReducer }) => {
    return createReducer<UsersState, any>({
      [apiActionNames.users.request](state, action) {
        return {
          ...state,
          loading: true,
        };
      },
      [apiActionNames.users.success](state, action) {
        return {
          ...state,
          loading: false,
        };
      },
      [apiActionNames.users.error](state, action) {
        return {
          ...state,
          loading: false,
        };
      },
    }, {
      loading: false,
    });
  },
  sagas: () => {
    return [];
  },
});

export default model;

```

## 辅助工具

- 代码块 [vscode-react-typescript](https://github.com/infeng/vscode-react-typescript)
- 代码块 [vscode-admin](https://github.com/infeng/vscode-admin)
- model创建工具 [@epig/admin-tools](https://github.com/evel-pig/admin-tools#%E5%88%9B%E5%BB%BAmodel)
