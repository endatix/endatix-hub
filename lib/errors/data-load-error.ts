/**
 * Error class for data load errors.
 */
export class DataLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataLoadError";
  }
}
