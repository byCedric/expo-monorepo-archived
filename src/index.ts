import { sync as findUp } from 'find-up';
import fs from 'fs';
import path from 'path';
import { satisfies as semver } from 'semver';

import { MetroConfig } from './types';

export type MonorepoOptions = {
  /** The root of your Expo project, defaults to the metro config's `projectRoot` */
  projectRoot?: string;
  /** The root of your monorepo workspace, tries to detect it when omitted */
  workspaceRoot?: string;
};

/**
 * Add the Metro configuration to run your Expo project in a monorepo.
 */
export function withMonorepo(config: MetroConfig, options: MonorepoOptions = {}) {
  options.projectRoot = options.projectRoot || config.projectRoot;
  if (!options.projectRoot) {
    throw new Error(
      `'projectRoot' not defined in Metro config, please add this manually with 'projectRoot'`
    );
  }

  options.workspaceRoot = options.workspaceRoot || getWorkspaceRoot(options.projectRoot);
  if (!options.workspaceRoot) {
    throw new Error(
      `Could not find the workspace root, please add this manully with 'workspaceRoot'`
    );
  }

  const { version: metroVersion } = require('metro/package.json');
  if (!semver(metroVersion, '>=0.64.0')) {
    throw new Error(
      `This configuration is only compatible with Expo SDK 43+, use 'expo-yarn-workspaces' if you use older versions`
    );
  }

  // Instead of watching the project files, we want to watch all files in the monorepo
  config.watchFolders = [options.workspaceRoot];
  // Modules can be hoisted to the workspace root, resolve modules in this order
  config.resolver.nodeModulesPath = [
    path.resolve(options.projectRoot, 'node_modules'),
    path.resolve(options.workspaceRoot, 'node_modules'),
  ];

  return config;
}

export function getWorkspaceRoot(cwd: string): string | undefined {
  return findUp(
    (dir) => {
      // Detect both yarn and npm workspaces
      const packageFile = path.join(dir, 'package.json');
      const packageContent = fs.existsSync(packageFile)
        ? fs.readFileSync(packageFile, 'utf-8')
        : null;

      if (packageContent && JSON.parse(packageContent).workspaces) {
        return dir;
      }

      // Detect lerna workspaces
      if (fs.existsSync(path.join(dir, 'lerna.json'))) {
        return dir;
      }
    },
    {
      cwd,
      type: 'directory',
    }
  );
}
