"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function LogoLink({ name }: { name: string }) {
  const router = useRouter();

  return (
    <Link
      href="/"
      className="flex items-center gap-2"
      onClick={() => router.refresh()}
    >
      <span className="h-3 w-3 rounded-sm bg-primary" aria-hidden />
      <span className="jn-headline text-lg font-semibold uppercase tracking-wide">
        {name}
      </span>
    </Link>
  );
}
