import "server-only";
import { connection } from "next/server";
import { EnvironmentFlagFactory } from "./factories/environment-flag-factory";

// All writers on a deployment must use the same contract, regardless of the user's flag cohort.
const readDeployment = new EnvironmentFlagFactory().createFlag({ key: "form-publish", defaultValue: false });

export async function formPublishFlag() {
  await connection();
  return readDeployment();
}
