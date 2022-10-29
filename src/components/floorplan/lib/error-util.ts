type ErrWithMessage = {
  message: string;
};

const errorContainsMessage = (err: unknown): err is ErrWithMessage => {
  return (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as Record<string, unknown>).message === 'string'
  );
};

const toErrorWithMsg = (possibleErrorMsg: unknown): ErrWithMessage => {
  if (errorContainsMessage(possibleErrorMsg)) {
    return possibleErrorMsg;
  }

  try {
    return new Error(JSON.stringify(possibleErrorMsg));
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(possibleErrorMsg));
  }
};

export function getErrorMessage(err: unknown): string {
  return toErrorWithMsg(err).message;
}
