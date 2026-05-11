import {
  PublicDataListsClient,
  PublicDataListsClientOptions,
} from "./data-lists/public-data-lists.client";

/**
 * Options for the Endatix Public API.
 */
export interface EndatixPublicApiOptions extends PublicDataListsClientOptions {
  /** Optional default bearer token used for all requests unless overridden per call. */
  accessToken?: string;
  /** Base URL for the Endatix Public API origin. Defaults to ENDATIX_API_URL. */
  baseUrl?: string;
}

/**
 * The main entry point for the Endatix Public API. Provides access to browser-safe
 * public/runtime endpoints. Distinct from the server-only `EndatixApi` class which
 * authenticates via session-bound bearer tokens.
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

/**
 * Creates a new instance of the Endatix Public API.
 * @param options - The options for the Endatix Public API.
 * @returns A new instance of the Endatix Public API.
 */
export function createEndatixPublicApi(
  options?: EndatixPublicApiOptions,
): EndatixPublicApi {
  return new EndatixPublicApi(options);
}
