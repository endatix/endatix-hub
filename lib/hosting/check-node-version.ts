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
    console.log(getSuccessMessage());
    return;
  }

  if (
    !semver.satisfies(nodeRuntimeVersion, engines.node, {
      includePrerelease: true,
    })
  ) {
    console.log(getWarningMessage(nodeRuntimeVersion, engines.node));
  } else {
    console.log(getInfoMessage(nodeRuntimeVersion));
    console.log(getSuccessMessage());
  }
}


const getInfoMessage = (nodeRuntimeVersion: string) => {
  return `📦 Node version is ${nodeRuntimeVersion}`;
};

const getSuccessMessage = () => {
  return `${styles.success("Node version check passed")}`;
};

const getWarningMessage = (nodeRuntimeVersion: string, engines: string) => {
  return `${styles.warning("Warning: Node version check failed ❌")} 
            📦 Current Node version (${nodeRuntimeVersion}) does not match the required version of Node (${engines}). 
            💡 Check Readme for how to setup the correct Node version. 
            🔗 More info at https://github.com/endatix/endatix/tree/main/apps/endatix-hub`;
};

checkNodeVersion();
