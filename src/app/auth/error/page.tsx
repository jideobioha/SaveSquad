import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-4xl">🔗</p>
      <h1 className="mt-3 text-2xl font-bold">That link didn&apos;t work</h1>
      <p className="mt-2 text-muted">
        Sign-in links expire and only work once, in the same browser you
        requested them from.
      </p>
      <Link
        href="/login"
        className="mt-6 rounded-full bg-brand px-6 py-3 font-bold text-white"
      >
        Send a new link
      </Link>
    </main>
  );
}
