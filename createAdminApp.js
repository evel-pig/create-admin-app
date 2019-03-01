const chalk = require('chalk');
const commander = require('commander');
const packageJson = require('./package.json');
const fs = require('fs-extra');
const path = require('path');
const validateProjectName = require('validate-npm-package-name');
const os = require('os');
const spawn = require('cross-spawn');
const copy = require('copy');

const errorLogFilePatterns = [
  'npm-debug.log',
  'yarn-error.log',
  'yarn-debug.log',
];

const defaultPackageJson = {
  scripts: {
    start: "epig dev",
    build: "epig build",
    "build:analyze": "ANALYZE=true epig build",
    precommit: "lint-staged && npm run tsc",
    lint: "tslint -c tslint.json --project ./",
    test: "jest",
    tools: "epig-admin-tools",
    tsc: "rm -rf tslib && tsc",
  },
};

const devDependencies = [
  '@types/react',
  '@types/react-dom',
  '@types/redux-actions',
  'babel-jest',
  'enzyme',
  'enzyme-adapter-react-16',
  'enzyme-to-json',
  'husky',
  'jest@21',
  'lint-staged',
  'react-test-render',
  'ts-jest',
  'tslint',
  'tslint-eslint-rules',
  'tslint-language-service',
  'tslint-loader',
  'tslint-react',
];

const jestConfig = {
  transform: {
    "^.+\\.tsx?$": "<rootDir>/node_modules/ts-jest/preprocessor.js",
    "^.+\\.jsx?$": "<rootDir>/node_modules/babel-jest",
  },
  testRegex: "(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$",
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js",
    "jsx",
  ],
  moduleNameMapper: {
    "\\.(css|less)$": "identity-obj-proxy",
  },
  moduleDirectories: [
    "node_modules",
  ],
  snapshotSerializers: [
    "enzyme-to-json/serializer",
  ],
};

const precommitCheckConfig = {
  "lint-staged": {
    "src/**/*.tsx": [
      "tslint -c tslint.json",
    ],
    "src/**/*.ts": [
      "tslint -c tslint.json",
    ],
  },
};

const templateGeneratedFiles = [
  'public',
  'server',
  'src',
  '.adminrc.js',
  '.gitignore',
  '.gitlab-ci.yml',
  '.webpackrc.js',
  'docker-compose.yml',
  'Dockerfile',
  'pm2.json',
  'proxy.config.js',
  'README.md',
  'tsconfig.json',
  'tslint.json',
];

const gitIgnoreFiles = [
  'node_modules',
  '/dist',
  '/dll',
  '.DS_Store',
  'coverage',
  '.admin-tools',
  'tslib',
];

let projectName;

const program = new commander.Command(packageJson.name)
.version(packageJson.version)
.arguments('<project-directory>')
.usage(`${chalk.green('<project-directory>')} [options]`)
.action((name) => {
  projectName = name;
})
.parse(process.argv);

if (typeof projectName === 'undefined') {
  console.error('Please specify the app name:');
  console.log(
    `  ${chalk.cyan(program.name())} ${chalk.green('<project-directory>')}`,
  );
  console.log();
  console.log('For example:');
  console.log(`  ${chalk.cyan(program.name())} ${chalk.green('my-admin-app')}`);
  console.log();
  console.log(
    `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`,
  );
  process.exit(1);
}

createAdminApp(projectName);

function createAdminApp(name) {
  const root = path.resolve(name);
  const appName = path.basename(root);

  checkAppName(appName);
  fs.ensureDirSync(name);
  if (!isSafeToCreateProjectIn(root, name)) {
    process.exit(1);
  }

  console.log(`Creating a new epig admin app in ${chalk.green(root)}.`);
  console.log();

  const packageJson = {
    name: appName,
    version: '1.0.0',
    private: true,
    ...defaultPackageJson,
    ...precommitCheckConfig,
    ...jestConfig,
  };
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify(packageJson, null, 2) + os.EOL,
  );

  const originalDirectory = process.cwd();
  process.chdir(root);

  run(root, appName, originalDirectory);
}

function printValidationResults(results) {
  if (typeof results !== 'undefined') {
    results.forEach(error => {
      console.error(chalk.red(`  *  ${error}`));
    });
  }
}

function checkAppName(appName) {
  const validationResult = validateProjectName(appName);
  if (!validationResult.validForNewPackages) {
    console.error(
      `Could not create a project called ${chalk.red(
        `"${appName}"`,
      )} because of npm naming restrictions:`,
    );
    printValidationResults(validationResult.errors);
    printValidationResults(validationResult.warnings);
    process.exit(1);
  }

  // TODO: there should be a single place that holds the dependencies
  const dependencies = ['react', 'react-dom', 'react-scripts'].sort();
  if (dependencies.indexOf(appName) >= 0) {
    console.error(
      chalk.red(
        `We cannot create a project called ${chalk.green(
          appName,
        )} because a dependency with the same name exists.\n` +
          `Due to the way npm works, the following names are not allowed:\n\n`,
      ) +
        chalk.cyan(dependencies.map(depName => `  ${depName}`).join('\n')) +
        chalk.red('\n\nPlease choose a different project name.'),
    );
    process.exit(1);
  }
}

function run(root, appName, originalDirectory) {
  const allDependencies = ['react', 'react-dom', '@babel/polyfill', 'antd', 'classnames', '@epig/admin-tools'];
  const allDevdependencies = ['typescript', '@epig/af-build-dev', ...devDependencies];

  console.log('Copy files from template');
  copy([path.join(__dirname, 'template/**/*'), path.join(__dirname, 'template/**/.*')], root, (err) => {
    if (err) {
      console.log();
      console.log('Copy files has failed');
      console.log(err);

      const knownGeneratedFiles = [...templateGeneratedFiles, 'package.json'];
      exit(root, appName, knownGeneratedFiles);
    }

    fs.mkdir(path.join(root, 'src/containers'));

    fs.writeFileSync(path.join(root, '.gitignore'), gitIgnoreFiles.join('\r\n'));

    console.log('Copy files complete');
    console.log();

    try {
      const entryConfigPath = path.join(root, 'src/entry.config.ts');
      let entryConfigContent = fs.readFileSync(entryConfigPath, 'utf-8');
      entryConfigContent = entryConfigContent.replace('<%= appName %>', () => appName);
      fs.writeFileSync(entryConfigPath, entryConfigContent, { encoding: 'utf-8' });
    } catch (err) {
      console.log();
      console.log('Generate entry.config.ts has faild');
      console.log(err.message);

      const knownGeneratedFiles = [...templateGeneratedFiles, 'package.json'];
      exit(root, appName, knownGeneratedFiles);
    }

    console.log('Installing packages. This might take a couple of minutes.');
    /**
     * 要在安装依赖前执行git初始化，不然提交前检查不起作用
     */

    initGit().then(() => {
      return install(root, allDependencies, false);
    })
    .then(() => {
      return install(root, allDevdependencies, true).then(() => { return ''; });
    })
    .then(() => {
      const buildInDependencies = ['src/util', 'src/models', 'src/components'];
      return install(root, buildInDependencies, false).then(() => '');
    })
    .then(() => {
      success(root, appName, originalDirectory);
    })
    .catch(error => {
      console.log();
      console.log('Aborting installation.');
      if (error.message) {
        console.log(`  ${chalk.cyan(error.message)} has failed.`);
      } else {
        console.log(chalk.red('Unexpected error. Please report it as a bug:'));
        console.log(error.message);
      }
      console.log();

      const knownGeneratedFiles = [...templateGeneratedFiles, 'package.json', 'node_modules'];
      exit(root, appName, knownGeneratedFiles);
    });
  });
}

function exit(root, appName, knownGeneratedFiles) {
  // On 'exit' we will delete these files from target directory.
  const currentFiles = fs.readdirSync(path.join(root));
  currentFiles.forEach(file => {
    knownGeneratedFiles.forEach(fileToMatch => {
      // This remove all of knownGeneratedFiles.
      if (file === fileToMatch) {
        console.log(`Deleting generated file... ${chalk.cyan(file)}`);
        fs.removeSync(path.join(root, file));
      }
    });
  });
  const remainingFiles = fs.readdirSync(path.join(root));
  if (!remainingFiles.length) {
    // Delete target folder if empty
    console.log(
      `Deleting ${chalk.cyan(`${appName}/`)} from ${chalk.cyan(
        path.resolve(root, '..'),
      )}`,
    );
    process.chdir(path.resolve(root, '..'));
    fs.removeSync(path.join(root));
  }
  console.log('Done.');
  process.exit(1);
}

function success(appPath, appName, originalDirectory) {
  const useYarn = false;
  const displayedCommand = useYarn ? 'yarn' : 'npm';
  let cdpath;
  if (originalDirectory && path.join(originalDirectory, appName) === appPath) {
    cdpath = appName;
  } else {
    cdpath = appPath;
  }

  console.log();
  console.log(`Success! Created capp at ${root} success`);
  console.log('Inside that directory, you can run several commands:');
  console.log('Inside that directory, you can run several commands:');
  console.log();
  console.log(chalk.cyan(`  ${displayedCommand} start`));
  console.log('    Starts the development server.');
  console.log();
  console.log(
    chalk.cyan(`  ${displayedCommand} ${useYarn ? '' : 'run '}build`),
  );
  console.log('    Bundles the app into static files for production.');
  console.log();
  console.log(chalk.cyan(`  ${displayedCommand} test`));
  console.log('    Starts the test runner.');
  console.log();
  console.log();
  console.log('We suggest that you begin by typing:');
  console.log();
  console.log(chalk.cyan('  cd'), cdpath);
  console.log(`  ${chalk.cyan(`${displayedCommand} start`)}`);
  console.log();
  console.log('Happy hacking!');
}

function install(root, dependencies, isDev) {
  return new Promise((resolve, reject) => {
    const command = 'npm';
    let args = [
      'install',
    ];
    if (dependencies.length > 0) {
      if (isDev) {
        args = args.concat(['--save-dev']);
      } else {
        args = args.concat(['--save']);
      }
      args = args.concat(dependencies);
    }
    args.push('--cwd');
    args.push(root);

    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(`${command} ${args.join(' ')}`));
        return;
      }
      resolve();
    });
  });
}

function initGit() {
  return new Promise((resolve, reject) => {
    const command = 'git';
    const args = [
      'init',
    ];

    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(`${command} ${args.join(' ')}`));
        return;
      }
      resolve();
    });
  });
}

function isSafeToCreateProjectIn(root, name) {
  const validFiles = [
    '.DS_Store',
    'Thumbs.db',
    '.git',
    '.gitignore',
    '.idea',
    'README.md',
    'LICENSE',
    'web.iml',
    '.hg',
    '.hgignore',
    '.hgcheck',
    '.npmignore',
    'mkdocs.yml',
    'docs',
    '.travis.yml',
    '.gitlab-ci.yml',
    '.gitattributes',
  ];
  console.log();

  const conflicts = fs
    .readdirSync(root)
    .filter(file => !validFiles.includes(file))
    // Don't treat log files from previous installation as conflicts
    .filter(
      file => !errorLogFilePatterns.some(pattern => file.indexOf(pattern) === 0),
    );

  if (conflicts.length > 0) {
    console.log(
      `The directory ${chalk.green(name)} contains files that could conflict:`,
    );
    console.log();
    for (const file of conflicts) {
      console.log(`  ${file}`);
    }
    console.log();
    console.log(
      'Either try using a new directory name, or remove the files listed above.',
    );

    return false;
  }

  // Remove any remnant files from a previous installation
  const currentFiles = fs.readdirSync(path.join(root));
  currentFiles.forEach(file => {
    errorLogFilePatterns.forEach(errorLogFilePattern => {
      // This will catch `(npm-debug|yarn-error|yarn-debug).log*` files
      if (file.indexOf(errorLogFilePattern) === 0) {
        fs.removeSync(path.join(root, file));
      }
    });
  });
  return true;
}
