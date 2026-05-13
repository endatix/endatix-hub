/**
 * Minimal storage provider identity — extended by concrete providers (Azure, S3).
 */
export interface IStorageProvider {
  readonly id: string;
  readonly name: string;

  /** True when credentials/config allow serving storage requests. */
  isEnabled(): boolean;

  /** True when reads require presigned URLs / tokens. */
  isPrivate(): boolean;
}
