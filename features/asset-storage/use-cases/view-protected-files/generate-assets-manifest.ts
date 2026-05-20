import { Model } from "survey-core";
import { collectModelStorageAssets } from "./collect-model-storage-assets";

/**
 * @deprecated This function will be removed once server-side asset manifest generation is implemented.
 * This is a temporary client-side solution that scans the SurveyJS Model to discover storage URLs.
 *
 * TODO: Replace with OSS FormDependency rows + server asset manifest on form load (h415 plan).
 * Prefetch then uses enqueuePrivateReadUrls once per manifest chunk (max 50 URLs).
 * This will eliminate client-side regex scanning and duplicate read-urls POSTs.
 *
 * Generates a manifest of all storage URLs from a SurveyJS Model.
 * @param model - The SurveyJS Model to scan
 * @returns A manifest of all storage URLs from the model
 */
export function generateAssetsManifest(model: Model): string[] {
  return [...collectModelStorageAssets(model).urls];
}
