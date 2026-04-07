function isTruthy(value?: string) {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function shouldSkipBuildStaticParams() {
  if (isTruthy(process.env.NEXT_FORCE_STATIC_PARAMS)) {
    return false;
  }

  return (process.env.VERCEL_ENV || "").trim().toLowerCase() === "preview";
}
