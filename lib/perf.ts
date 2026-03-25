const IS_PROD = process.env.NODE_ENV === "production";

export async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const ms = (performance.now() - start).toFixed(0);
  if (IS_PROD) {
    console.log(`[perf] ${label} — ${ms}ms`);
  }
  return result;
}
