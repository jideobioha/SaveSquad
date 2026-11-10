import { BottomNav } from "./bottom-nav";

export function ComingSoon({ emoji, title, body, phase }: { emoji: string; title: string; body: string; phase: string }) {
  return (
    <>
      <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <p className="text-5xl">{emoji}</p>
        <h1 className="mt-4 text-2xl font-extrabold">{title}</h1>
        <p className="mt-2 text-muted">{body}</p>
        <span className="mt-4 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">{phase}</span>
      </main>
      <BottomNav />
    </>
  );
}
