"use client";

import { useState } from "react";

export function InviteCard({ code, squadName }: { code: string; squadName: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/join/${code}`;
    const text = `Join my squad "${squadName}" on SaveSquad`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "SaveSquad", text, url });
        return;
      } catch {
        // Share sheet dismissed; fall back to copying.
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={share}
      className="flex w-full items-center gap-3 rounded-3xl bg-lime px-5 py-4 text-left"
    >
      <span className="text-2xl">🔗</span>
      <span className="flex-1">
        <span className="block font-bold">{copied ? "Link copied!" : "Invite friends"}</span>
        <span className="block text-xs text-foreground">
          Anyone with the link can join this squad.
        </span>
      </span>
      <span className="font-bold">→</span>
    </button>
  );
}
