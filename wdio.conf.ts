import type { Options } from '@wdio/types';
import path from 'path';

export const config: Options.Testrunner = {
  runner: 'local',
  autoCompileOpts: {
    tsNodeOpts: {
      project: './tsconfig.node.json',
    },
  },
  specs: ['./tests/e2e/**/*.spec.ts'],
  maxInstances: 1,
  capabilities: [
    {
      browserName: 'chrome',
      'tauri:options': {
        application: path.resolve(
          __dirname,
          'src-tauri/target/release/bokuchi'
        ),
      },
    } as WebdriverIO.Capabilities,
  ],
  logLevel: 'warn',
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
};
