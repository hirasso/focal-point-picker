#!/usr/bin/env node

import { parseArgs } from "node:util";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

import pc from "picocolors";
const { blue, red, bold } = pc;

import {
  dd,
  createRelease,
  testRelease,
  pushReleaseToDist,
  patchVersion,
  prepareDistFolder,
  isAtRootDir,
  testDev,
  error,
} from "./support.js";
import { exit } from "node:process";

// Get the equivalent of __filename
const __filename = fileURLToPath(import.meta.url);

/**
 * @typedef {Object} Command
 * @property {Function} fn - The function to execute the command.
 * @property {string} description - A brief description of what the command does.
 */

/**
 * An object containing available commands with their respective handlers and descriptions.
 *
 * @type {Object<string, Command>}
 */
const commands = {
  "release:create": {
    fn: createRelease,
    description: "Create a scoped release",
  },
  "version:patch": {
    fn: patchVersion,
    description: "Patch the version in the main plugin file",
  },
  "dist:prepare": {
    fn: prepareDistFolder,
    description: "Prepare the folder for pushing to the dist repo",
  },
  "dist:push": {
    fn: pushReleaseToDist,
    description: "Push the prepared dist folder to the dist repo",
  },
  "test:dev": {
    fn: testDev,
    description:
      "Run tests against the development (unscoped) version of the plugin",
  },
  "test:release": {
    fn: testRelease,
    description: "Run tests against the release (scoped) version of the plugin",
  },
  help: {
    fn: printUsage,
    description: "Show available commands for this cli",
  },
};

const {
  positionals: [command],
} = parseArgs({ allowPositionals: true });

// Function to print usage
function printUsage() {
  const commandList = [];
  for (const [name, { description }] of Object.entries(commands)) {
    commandList.push(`${blue(name)} – ${description}`);
  }
  console.log(`
Usage: cli.js ${blue(`<command>`)}

Available commands:
  ${commandList.join("\n  ")}`);
}

// Validate correct invocation
if (!command || typeof commands[command] === "undefined") {
  console.log(`\n ❌ ${red(bold(`Unkown command: ${command}`))}`);
  printUsage();
  exit();
}

// Ensure the script is run from the project root
if (!isAtRootDir()) {
  error(
    `${basename(__filename)} must be executed from the package root directory`,
  );
}

// Execute the command
commands[command].fn();
