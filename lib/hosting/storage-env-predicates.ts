/** Same predicate as Hub Azure provider `isEnabled` (account name + key). */
export function isAzureStorageCredentialsPresentInEnv(): boolean {
  const name = process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim() ?? "";
  const key = process.env.AZURE_STORAGE_ACCOUNT_KEY?.trim() ?? "";
  return name.length > 0 && key.length > 0;
}

/** Same predicate as Hub S3 provider `isEnabled` (endpoint + access key + secret). */
export function isS3StorageCredentialsPresentInEnv(): boolean {
  const endpoint = process.env.S3_ENDPOINT?.trim() ?? "";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim() ?? "";
  return endpoint.length > 0 && accessKeyId.length > 0 && secretAccessKey.length > 0;
}
