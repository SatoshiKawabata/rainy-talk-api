export enum ErrorCodes {
  FailedToGenerateNextMessage = "FailedToGenerateNextMessage",
  FailedToPostMessage = "FailedToPostMessage",
}

export class UseCaseError extends Error {
  constructor(message: string, code: ErrorCodes) {
    super(`UseCaseError: ErrorCode=${code}, Message=${message}`);
  }
}
