import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import path, { basename, extname, resolve } from "node:path";
import { execSync } from "node:child_process";
import { chdir, cwd, env, exit } from "node:process";
import pc from "picocolors";
import fg from "fast-glob";

/** extract colors from common.js module picocolors */
const { blue, red, bold, gray, green } = pc;

/** Get the equivalent of __filename */
const __filename = fileURLToPath(import.meta.url);

/**
 * Dump and die
 * @param {...any} args
 */
export function dd(...args) {
  console.log(...args);
  process.exit();
}

/**
 * Validate that the script is being run from the root dir
 * This is being achieved by comparing the package name to
 */
export function isAtRootDir() {
  return (
    existsSync(resolve(cwd(), "package.json")) &&
    existsSync(resolve(cwd(), "composer.json"))
  );
}

/**
 * Get the current version from the package.json
 * In this project, the version in package.json is the
 * source of truth, as releases are handled by @changesets/action
 * @return {{version: string}}
 */
export function getInfosFromPackageJSON() {
  const packageJsonPath = path.join(process.cwd(), "./package.json");
  const { version } = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  if (!version) {
    error(`No version found in package.json`);
  }
  return { version };
}

/**
 * Get the path to the scoped folder
 */
export function getScopedFolder() {
  const { packageName } = getInfosFromComposerJSON();
  return `scoped/${packageName}`;
}

/**
 * Get infos from the composer.json
 * @return {{
 *    fullName: string,
 *    vendorName: string,
 *    packageName: string,
 *    dependencies: string[],
 *    devDependencies: string[]
 * }}
 */
export function getInfosFromComposerJSON() {
  const composerJsonPath = path.join(process.cwd(), "./composer.json");
  const json = JSON.parse(readFileSync(composerJsonPath, "utf8"));
  const fullName = json.name;
  const dependencies = json["require"] || {};
  const devDependencies = json["require-dev"] || {};
  if (!fullName) {
    throw new Error(`No name found in composer.json`);
  }
  if (!fullName.includes("/")) {
    throw new Error(
      `Invalid name found in composer.json. It must be 'vendor-name/package-name'`,
    );
  }
  const [vendorName, packageName] = fullName.split("/");
  return { fullName, vendorName, packageName, dependencies, devDependencies };
}

/**
 * Run a command, stop execution on errors ({ stdio: "inherit" })
 * @param {string} command
 */
export const run = (command) => execSync(command, { stdio: "inherit" });

/**
 * Log an info message
 * @param {string} message
 * @param {...any} rest
 */
export const info = (message, ...rest) => {
  console.log(`💡 ${gray(message)}`, ...rest);
};

/**
 * Log a success message
 * @param {string} message
 * @param {...any} rest
 */
export const success = (message, ...rest) => {
  console.log(`✅ ${green(message)}`, ...rest);
};

/**
 * Log a success message
 * @param {string} message
 */
export const headline = (message) => {
  message = ` ℹ️  ${message} `;
  line();
  console.log(blue("-".repeat(message.length)));
  console.log(`${blue(message)}`);
  console.log(blue("-".repeat(message.length)));
  line();
};

/**
 * Log an error message and exit
 * @param {string} message
 * @param {...any} rest
 */
export const error = (message, ...rest) => {
  line();
  console.log(` ❌ ${red(bold(`${message}`))}`, ...rest);
  exit(1);
};

/**
 * Log a line
 */
export const line = () => console.log("");

/**
 * Debug something to the console
 * @param {...any} args
 */
export const debug = (...args) => {
  line();
  console.log("🐛 ", ...args);
  line();
};

/**
 * Check if currently running on GitHub actions
 */
export const isGitHubActions = () => env.GITHUB_ACTIONS === "true";

/**
 * Compare two directories
 * @param {string} dir1
 * @param {string} dir2
 * @param {string[]} ignore
 */
export const validateDirectories = async (dir1, dir2, ignore = [".git"]) => {
  try {
    const pattern = ["*", ...ignore.map((ig) => `!${ig}`)];

    const { files1, files2 } = {
      files1: await fg(pattern, { cwd: dir1, onlyFiles: false }),
      files2: await fg(pattern, { cwd: dir2, onlyFiles: false }),
    };

    return (
      !!files1.length &&
      !!files2.length &&
      files1.length === files2.length &&
      files1.every((file, index) => file === files2[index])
    );
  } catch (err) {
    error("Error comparing directories:", err);
  }
};

/**
 * Extract the first version number from a composer constraint
 * e.g. ">=8.2" => "8.2"
 * @param {string|undefined} constraint
 * @return {string|undefined}
 */
const extractVersion = (constraint) => constraint?.match(/\d+(\.\d+)*/)?.[0];

/**
 * Extract a header from a plugin file or a readme.txt
 * e.g. "Requires PHP: 8.2" => "8.2"
 * @param {string|undefined} contents
 * @param {string} header
 * @return {string|undefined}
 */
const extractHeader = (contents, header) =>
  contents?.match(new RegExp(`^[ \\t/*#@]*${header}:(.*)$`, "mi"))?.[1].trim();

/**
 * Make sure the required PHP version is declared consistently everywhere.
 * Each of these is read by a different consumer:
 * - the main plugin file: WordPress, when activating or installing an upload
 * - readme.txt: update checkers, when reporting available updates
 * - composer.json: composer, for installs of the plugin
 */
export function validatePHPVersion() {
  const { packageName, dependencies } = getInfosFromComposerJSON();

  /** @type {Record<string, string|undefined>} */
  const versions = {
    [`${packageName}.php`]: extractHeader(
      readFile(`${packageName}.php`),
      "Requires PHP",
    ),
    "readme.txt": extractHeader(readFile("readme.txt"), "Requires PHP"),
    "composer.json": extractVersion(dependencies.php),
  };

  const declarations = Object.entries(versions)
    .map(([file, version]) => `  - ${blue(file)}: ${version ?? red("missing")}`)
    .join("\n");

  if (Object.values(versions).some((version) => !version)) {
    error(`The required PHP version is not declared everywhere:`, `\n${declarations}`); // prettier-ignore
  }

  if (new Set(Object.values(versions)).size > 1) {
    error(`The required PHP version is declared inconsistently:`, `\n${declarations}`); // prettier-ignore
  }

  success(`Required PHP version is consistently declared as ${Object.values(versions)[0]}`); // prettier-ignore
}

/**
 * Create release files for usage in the release asset and dist repo
 * - scopes dependency namespaces using php-scoper
 * - creates a folder scoped/ with all required plugin files
 * - creates a zip file from the scoped/ folder, named after the package
 */
export function createRelease() {
  headline(`Creating Release Files...`);

  const { packageName } = getInfosFromComposerJSON();
  const scopedFolder = getScopedFolder();

  line();
  info(`Creating a scoped release in ${blue(scopedFolder)}...`);
  line();

  /** Ensure php-scoper is available */
  const phpScoperPath = "config/php-scoper";
  info("Ensuring php-scoper is available...");

  if (!existsSync(phpScoperPath)) {
    run(`curl -sL https://github.com/humbug/php-scoper/releases/download/0.18.15/php-scoper.phar -o ${phpScoperPath}`); // prettier-ignore
    run(`chmod +x ${phpScoperPath}`);
  }

  info("Installing non-dev composer dependencies...");
  run("composer install --no-scripts --no-dev --quiet");

  info("Scoping non-dev dependencies...");
  rmSync(scopedFolder, { recursive: true, force: true });
  run(`${phpScoperPath} add-prefix --quiet --output-dir=${scopedFolder} --config=config/scoper.config.php`); // prettier-ignore
  success("Successfully scoped all namespaces!");
  line();

  info("Re-installing dev depdendencies...");
  run("composer install --no-scripts --quiet");

  /**
   * This needs to be done manually, since PUC causes problems when scoped.
   * All changes to the vendor dir have to run BEFORE dumping the autolaoder!
   */
  info(`Copying plugin-update-checker/ to ${scopedFolder}/...`);
  cpSync(
    "vendor/yahnis-elsts/plugin-update-checker",
    `${scopedFolder}/vendor/yahnis-elsts/plugin-update-checker`,
    { force: true, recursive: true },
  );

  /** Dump the autoloader in the scoped directory */
  info(`Dumping the autoloader in ${scopedFolder}...`);
  run(
    `composer dump-autoload --working-dir=${scopedFolder} --classmap-authoritative`,
  );

  line();

  /** Clean up the scoped directory */
  info(`Cleaning up ${scopedFolder}...`);
  ["composer.json", "composer.lock"].forEach((file) => {
    rmSync(resolve(`${cwd()}/${scopedFolder}`, file), { force: true });
  });

  info(`Overwriting the composer.json in ${scopedFolder}/...`);
  cpSync("composer.dist.json", `${scopedFolder}/composer.json`);

  line();

  /** Create a zip file from the scoped directory */
  info(`Creating a zip file from ${scopedFolder}...`);
  run(
    `cd ${scopedFolder} && zip -rq "../../${packageName}.zip" . && cd - >/dev/null`,
  );

  line();
  success(`Created a scoped release folder: ${blue(scopedFolder)}`);
  success(`Created a scoped release asset: ${blue(`${packageName}.zip`)}`);
  line();
}

/**
 * Read a file, fall back to undefined if it doesn't exist
 * @param {string} path
 */
function readFile(path) {
  return existsSync(path)
    ? readFileSync(path, { encoding: "utf-8" })
    : undefined;
}

/**
 * Run Unit and E2E tests from the unscoped version
 */
export function testDev() {
  if (existsSync(".wp-env.override.json")) {
    info(`Deleting plugins in .wp-env.override.json...`);
    const overrides = JSON.parse(readFile(".wp-env.override.json") || "{}");
    rmSync(".wp-env.override.json", { force: true });
    delete overrides.plugins;
    if (Object.values(overrides).length) {
      writeJsonFile(".wp-env.override.json", overrides);
    }

    info(`Re-Starting wp-env with root folder...`);
    run(`wp-env start --update`);
  }

  info(`Running tests against the development version...`);
  run("pnpm run test");
}

/**
 * Write JSON to a file
 * @param {string} name
 * @param {any} data
 */
function writeJsonFile(name, data) {
  writeFileSync(name, JSON.stringify(data, undefined, 2), "utf-8");
}

/**
 * Run E2E tests from the scoped release folder.
 * This command is only required for local tests.
 */
export function testRelease() {
  createRelease();

  const scopedFolder = getScopedFolder();

  // info(`Installing dev dependencies in ${scopedFolder}...`);
  // const { devDependencies } = getInfosFromComposerJSON();

  // const requireDev = Object.entries(devDependencies).reduce(
  //   /**
  //    * @param {string[]} acc - The accumulator array.
  //    * @param {[string, string]} entry - An array containing the dependency name and version.
  //    * @returns {string[]} The updated accumulator array.
  //    */
  //   (acc, [name, version]) => {
  //     acc.push(`"${name}:${version}"`);
  //     return acc;
  //   },
  //   [],
  // );

  // run(`composer require --dev ${requireDev.join(" ")} --quiet --working-dir=${scopedFolder} --with-all-dependencies`); // prettier-ignore

  if (!isGitHubActions()) {
    /** @type {{ plugins: string[] }} */
    const { plugins } = JSON.parse(readFile(".wp-env.json") || "{}");
    const overrides = JSON.parse(readFile(".wp-env.override.json") || "{}");

    overrides.plugins = plugins.map((path) => {
      // return path.replace(/^\.\/?/, `./${scopedFolder}/`);
      return path === "." ? `./${scopedFolder}/` : path;
    });

    writeJsonFile(".wp-env.override.json", overrides);
    debug("Contents of .wp-env.override.json:", overrides);

    info(`Re-Starting wp-env with ${scopedFolder}...`);

    run(`wp-env start --update`);
  }

  info(`Running e2e tests against ${scopedFolder}...`);
  run("pnpm run test:e2e");
}

/**
 * Prepare the dist folder
 * - clones the dist repo into dist/
 * - checks out the empty root commit in dist/
 * - copies all files from scoped/ into dist/
 */
export function prepareDistFolder() {
  headline(`Preparing Dist Folder...`);

  const { fullName } = getInfosFromComposerJSON();
  const scopedFolder = getScopedFolder();

  /** Check if the scoped folder exists */
  if (!existsSync(scopedFolder)) {
    error(`'${scopedFolder}' scoped folder does not exist`);
  }

  /** Re-create the release files if the scoped folder is not clean */
  if (existsSync(`${scopedFolder}/phpunit.xml`)) {
    createRelease();
  }

  /** Initialize the dist folder if not in GitHub Actions */
  if (env.GITHUB_ACTIONS !== "true") {
    info(`Cloning the dist repo into dist/...`);
    rmSync("dist", { recursive: true, force: true });
    run(`git clone -b empty git@github.com:${fullName}-dist.git dist/`); // prettier-ignore
  }

  info(`Checking out the empty tagged root commit..`);
  run("git -C dist checkout --detach empty");

  line();

  info(`Copying files from ${scopedFolder} to dist/...`);
  cpSync(scopedFolder, "dist", { recursive: true, force: true });

  success(`Dist folder preparation complete!`);
}

/**
 * Copy files from one foldder to another
 *
 * @param {string} sourceDir
 * @param {string} destDir
 * @param {string} pattern
 */
export async function copyFiles(sourceDir, destDir, pattern = "**/*.{js,css}") {
  const files = await fg(pattern, {
    cwd: sourceDir,
    absolute: true,
  });

  /** Ensure the destination directory exists */
  mkdirSync(destDir, { recursive: true });

  /** Copy each file */
  files.forEach((file) => {
    const relativePath = path.relative(sourceDir, file);
    const destPath = path.join(destDir, relativePath);

    /** Ensure destination subdirectories exist */
    mkdirSync(path.dirname(destPath), { recursive: true });

    /** Copy the file */
    copyFileSync(file, destPath);

    success(`Copied: ${sourceDir}/${relativePath} → ${destPath}`);
  });
}

/**
 * Push scoped release files to the dist repo
 */
export async function pushReleaseToDist() {
  const rootDir = cwd();
  const packageInfos = getInfosFromPackageJSON();
  const { packageName } = getInfosFromComposerJSON();
  const packageVersion = `v${packageInfos.version}`;
  const scopedFolder = getScopedFolder();

  const onGitHub = isGitHubActions();
  debug({ onGitHub });

  const hasValidDirectories = await validateDirectories(scopedFolder, "dist");

  debug({ hasValidDirectories });

  if (hasValidDirectories !== true) {
    error(
      `The validation of the scoped and dist folder failed.`,
      `Did you run 'release:prepare'?`,
    );
  }

  /** Ensure the script is running in a GitHub Action */
  if (!onGitHub) {
    error(`${basename(__filename)} can only run on GitHub`);
  }

  if (!packageVersion) {
    error("Empty package version");
  }

  info(`Committing and pushing new release: 'v${packageVersion}'...`);
  line();

  /** Navigate to the dist folder and perform Git operations */
  try {
    chdir("dist/");
    run(`git add .`);
    run(`git commit -m "Release: ${packageName}@${packageVersion}"`);
    run(`git tag "${packageVersion}"`);
    run(`git push origin "${packageVersion}"`);
    success(`Released '${packageVersion}' to the dist repo.`);
    chdir(rootDir);
  } catch (err) {
    error("An error occurred while releasing the package.", err);
  }

  /** Change back to the root dir */
  chdir(rootDir);
}

/**
 * Patch the version in the main plugin php file, based on the
 * current version in the package.json
 */
export async function patchVersion() {
  const { version: packageVersion } = getInfosFromPackageJSON();
  const { packageName } = getInfosFromComposerJSON();

  const phpFiles = await fg("*.php");
  const versionRegexp = /\*\s*Version:\s*(\d+\.\d+\.\d+)/;

  const fileName = phpFiles.find((file) =>
    versionRegexp.test(readFileSync(file, "utf-8")),
  );

  if (!fileName) {
    return error(`Main plugin file not found: ${fileName}`);
  }

  const contents = readFileSync(fileName, "utf8");
  const currentVersion = contents.match(versionRegexp)?.[1];

  line();
  info(`Patching version in ${fileName}...`);

  if (!currentVersion) {
    error(`No version found in file: ${fileName}`);
    process.exit(1);
  }

  if (currentVersion === packageVersion) {
    success(`Version already patched in ${fileName}: ${currentVersion}`);
    process.exit(0);
  }

  writeFileSync(
    fileName,
    contents.replace(versionRegexp, `* Version: ${packageVersion}`),
    "utf8",
  );

  success(`Patched version to ${packageVersion} in ${fileName}`);
  line();
}
