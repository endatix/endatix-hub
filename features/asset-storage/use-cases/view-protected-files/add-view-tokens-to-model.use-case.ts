import { Result } from "@/lib/result";
import { Model } from "survey-core";
import { getClientStorageConfig } from "../../storage-runtime";
import { enhanceUrlWithToken } from "../../utils";
import { collectModelStorageAssets } from "./collect-model-storage-assets";
import { generateGranularReadTokensUseCase } from "./generate-granular-read-tokens.use-case";

/**
 * Discovers, fetches, and applies storage tokens to a SurveyJS Model.
 * This is the primary entry point for server-side asset authorization (e.g. PDF Export).
 *
 * @param model - The SurveyJS Model to authorize
 */
export async function addViewTokensToModelUseCase(model: Model): Promise<void> {
  const clientConfig = getClientStorageConfig();
  if (!clientConfig.isEnabled || !clientConfig.isPrivate) {
    return;
  }

  // TODO: Replace with server-side asset manifest (see generate-assets-manifest.ts for deprecation details)
  const assets = collectModelStorageAssets(model);
  if (assets.urls.length === 0) {
    return;
  }

  const tokensResult = await generateGranularReadTokensUseCase([
    ...assets.urls,
  ]);

  if (Result.isSuccess(tokensResult)) {
    for (const ref of assets.refs) {
      const token = tokensResult.value[ref.url];
      if (token) {
        ref.setUrl(enhanceUrlWithToken(ref.url, token));
      }
    }
  }
}
