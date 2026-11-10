import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <Link href="/" className="text-2xl font-extrabold text-brand">
        SaveSquad
      </Link>
      <h1 className="mt-10 text-3xl font-extrabold tracking-tight">
        Let&apos;s get you saving.
      </h1>
      <p className="mt-2 text-muted">
        No password. We&apos;ll email you a link to sign in.
      </p>
      <div className="mt-8">
        <Suspense>
          <LoginFormWithNext searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoginFormWithNext({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const { next } = await searchParams;
  // Only allow same-site paths, never "//evil.com".
  const nextPath =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/";
  return <LoginForm next={nextPath} />;
}
