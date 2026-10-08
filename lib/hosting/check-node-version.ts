import packageJson from "@/package.json" assert { type: "json" };
import semver from "semver";
import { isEdgeRuntime } from "./runtime";
import styles from '../utils/console-styles';

export interface PackageJson {
  engines?: {
    node?: string;
  };
}

export function checkNodeVersion() {
  if (isEdgeRuntime()) {
    return;
  }

  const nodeRuntimeVersion = process.version;
  const { engines } = packageJson as PackageJson;

  if (!engines || !engines.node) {
    console.log(getSuccessMessage(nodeRuntimeVersion));
    return;
  }

  if (
    !semver.satisfies(nodeRuntimeVersion, engines.node, {
      includePrerelease: true,
    })
  ) {
    console.log(getWarningMessage(nodeRuntimeVersion, engines.node));
  } else {
    console.log(getSuccessMessage(nodeRuntimeVersion));
  }
}


/** One line, like the dev.mjs steps: `✓ Node version check passed (v22.20.0)`. */
const getSuccessMessage = (nodeRuntimeVersion: string) => {
  const version = styles.dim(`(${nodeRuntimeVersion})`);
  return styles.success(`Node version check passed ${version}`);
};

const getWarningMessage = (nodeRuntimeVersion: string, engines: string) => {
  return `${styles.warning("Warning: Node version check failed ❌")} 
            📦 Current Node version (${nodeRuntimeVersion}) does not match the required version of Node (${engines}). 
            💡 Check Readme for how to setup the correct Node version. 
            🔗 More info at https://github.com/endatix/endatix-hub`;
};

checkNodeVersion();
