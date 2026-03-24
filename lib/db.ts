export function isPostgresUrl(url: string | undefined | null) {
  return !!url && /^postgres(ql)?:\/\//i.test(url);
}

export function isPostgres() {
  return isPostgresUrl(process.env.DATABASE_URL);
}

