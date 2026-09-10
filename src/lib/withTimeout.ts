/** Caps how long an interactive action (button click, inline task add,
 * checkbox toggle) is allowed to hang before the UI gives up and shows an
 * error instead of spinning forever. Framework/schema-agnostic, so it's
 * safe to share across task components. */
export class ActionTimeoutError extends Error {
  constructor(seconds: number) {
    super(`This is taking too long (over ${seconds}s) — try again.`);
    this.name = "ActionTimeoutError";
  }
}

export function withTimeout<T>(promise: Promise<T>, ms = 10_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new ActionTimeoutError(Math.round(ms / 1000))), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
