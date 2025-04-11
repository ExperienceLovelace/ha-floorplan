export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry a function until it succeeds or the maximum number of retries is reached.
 * @param fn The function to retry.
 * @param retries The maximum number of retries.
 * @param delay The delay between retries in milliseconds.
 * @returns The result of the function if it succeeds.
 * @throws An error if the function does not succeed within the maximum retries.
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  retries: number,
  delay: number
): Promise<T> => {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= retries) {
        throw error;
      }
      await sleep(delay);
    }
  }
  throw new Error('Retry function failed unexpectedly');
};