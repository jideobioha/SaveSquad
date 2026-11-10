"use client";

import { useState, useTransition } from "react";
import { formatMoney } from "@/lib/money";
import { saveSpin, spin, type SpinResult } from "./actions";

// Same order as public.spin_amounts() in the database.
const AMOUNTS = [500, 1000, 2000, 300, 1200, 800, 1500, 2500];
const COLORS = ["#5b3ff0", "#ff6b2c", "#22a06b", "#e5487a", "#2f80ed", "#f2b01e", "#8b5cf6", "#14b8a6"];
const SLICE = 360 / AMOUNTS.length;
const SPIN_MS = 4000;

function slicePath(i: number) {
  const r = 100;
  const a0 = ((i * SLICE - 90) * Math.PI) / 180;
  const a1 = (((i + 1) * SLICE - 90) * Math.PI) / 180;
  return `M0,0 L${r * Math.cos(a0)},${r * Math.sin(a0)} A${r},${r} 0 0 1 ${r * Math.cos(a1)},${r * Math.sin(a1)} Z`;
}

function labelPos(i: number) {
  const a = (((i + 0.5) * SLICE - 90) * Math.PI) / 180;
  return { x: 66 * Math.cos(a), y: 66 * Math.sin(a), rot: (i + 0.5) * SLICE };
}

// Rotation that brings segment i under the pointer at the top.
function rotationFor(segment: number, turns: number) {
  return turns * 360 + (360 - (segment * SLICE + SLICE / 2));
}

export function Wheel({
  goalId,
  goalName,
  initial,
}: {
  goalId: string;
  goalName: string;
  initial: SpinResult | null;
}) {
  const [result, setResult] = useState<SpinResult | null>(initial);
  const [rotation, setRotation] = useState(initial ? rotationFor(initial.segment, 0) : 0);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, startSaving] = useTransition();

  async function onSpin() {
    setError(null);
    setSpinning(true);
    const r = await spin();
    if ("error" in r) {
      setError(r.error);
      setSpinning(false);
      return;
    }
    setRotation(rotationFor(r.segment, 6));
    setTimeout(() => {
      setResult(r);
      setSpinning(false);
    }, SPIN_MS);
  }

  const landed = result && !spinning;

  return (
    <div className="flex flex-col items-center">
      <div className="relative mt-4 size-72">
        {/* Pointer */}
        <div className="absolute top-[-6px] left-1/2 z-10 -translate-x-1/2 border-x-[12px] border-t-[20px] border-x-transparent border-t-foreground" />
        <svg
          viewBox="-104 -104 208 208"
          className="size-full drop-shadow-lg"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.85, 0.25, 1)` : "none",
          }}
        >
          <circle r="103" fill="#16142b" />
          {AMOUNTS.map((cents, i) => {
            const p = labelPos(i);
            return (
              <g key={i}>
                <path d={slicePath(i)} fill={COLORS[i]} stroke="#16142b" strokeWidth="1.5" />
                <text
                  x={p.x}
                  y={p.y}
                  fill="white"
                  fontSize="15"
                  fontWeight="800"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${p.rot} ${p.x} ${p.y})`}
                >
                  ${cents / 100}
                </text>
              </g>
            );
          })}
          <circle r="16" fill="white" stroke="#16142b" strokeWidth="3" />
        </svg>
      </div>

      {!landed && (
        <button
          onClick={onSpin}
          disabled={spinning}
          className="mt-8 w-full rounded-full bg-brand py-3.5 font-bold text-white disabled:opacity-60"
        >
          {spinning ? "Spinning…" : "Spin"}
        </button>
      )}

      {landed && result.status === "saved" && (
        <div className="mt-8 w-full rounded-3xl bg-card p-5 text-center shadow-sm">
          <p className="font-bold">✓ Today&apos;s spin is saved</p>
          <p className="mt-1 text-sm text-muted">Come back tomorrow for a new spin.</p>
        </div>
      )}

      {landed && result.status === "pending" && (
        <form action={(fd) => startSaving(() => saveSpin(goalId, fd))} className="mt-6 w-full">
          <div className="rounded-3xl bg-brand/10 p-5 text-center">
            <p className="text-sm font-semibold text-muted">You landed on</p>
            {editing ? (
              <div className="mx-auto mt-1 flex w-40 items-center justify-center rounded-2xl bg-card px-3 py-2 text-3xl font-extrabold">
                <span className="text-muted">$</span>
                <input
                  name="amount"
                  inputMode="decimal"
                  autoFocus
                  defaultValue={result.amountCents / 100}
                  className="w-full bg-transparent pl-1 outline-none"
                />
              </div>
            ) : (
              <>
                <p className="text-4xl font-extrabold text-brand">{formatMoney(result.amountCents)}</p>
                <input type="hidden" name="amount" value={result.amountCents / 100} />
              </>
            )}
            <p className="mt-1 text-xs text-muted">→ {goalName} · keeps your streak alive</p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 w-full rounded-full bg-brand py-3.5 font-bold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : editing ? `Move it to ${goalName}` : `Move ${formatMoney(result.amountCents)} to ${goalName}`}
          </button>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-2 w-full rounded-full bg-card py-3 text-sm font-bold"
            >
              Edit amount
            </button>
          )}
          <p className="mt-3 text-center text-xs text-muted">
            Self-reported: move the money in your bank app, then tap to log it.
          </p>
        </form>
      )}

      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
