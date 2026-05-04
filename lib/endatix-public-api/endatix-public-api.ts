import { PublicDataListsClient } from "./data-lists/public-data-lists.client";

/**
 * Options for the Endatix Public API.
 */
export interface EndatixPublicApiOptions {
  /** The base URL of the Endatix Public API. */
  baseUrl?: string;
  
  /**
   * The default bearer token used for all requests unless overridden per call.
   * This is optional and will be used as a fallback when no per-request token is provided.
   */
  /** Optional default bearer token used for all requests unless overridden per call. */
  accessToken?: string;
}

/**
 * The main entry point for the Endatix Public API. This class provides access to the various public APIs
 * Intended for browser-based public/runtime integrations as opposed to the node.js endatix-api library.
 */
export class EndatixPublicApi {
  private readonly options: EndatixPublicApiOptions;
  private _dataLists?: PublicDataListsClient;

  constructor(options: EndatixPublicApiOptions = {}) {
    this.options = options;
  }

  get dataLists(): PublicDataListsClient {
    this._dataLists ??= new PublicDataListsClient(this.options);
    return this._dataLists;
  }
}

export function createEndatixPublicApi(
  options?: EndatixPublicApiOptions,
): EndatixPublicApi {
  return new EndatixPublicApi(options);
}
