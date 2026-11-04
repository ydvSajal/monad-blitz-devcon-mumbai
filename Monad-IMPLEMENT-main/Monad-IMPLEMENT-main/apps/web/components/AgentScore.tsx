"use client";

import type { ScoreResult } from "@sajalydv/grounded-sdk";
import { useEffect, useState } from "react";

import { grounded } from "@/lib/grounded";

// one read per agent per page view: a character can appear in the hero, the catalogue and a dialog at once
const cache = new Map<string, Promise<ScoreResult>>();
const RATED = "gigtrust:rated";

const read = (agentId: string) => {
  let p = cache.get(agentId);
  if (!p) {
    p = grounded.score(agentId);
    p.catch(() => cache.delete(agentId));
    cache.set(agentId, p);
  }
  return p;
};

/** After a rating: drop cached scores so every badge on the page re-reads the chain. */
export function refreshScores() {
  cache.clear();
  window.dispatchEvent(new Event(RATED));
}

export function scoreLabel(s: ScoreResult) {
  if (s.confidence === "none") return "New · No paid ratings yet";
  return `${s.score}/100 · ${s.reviewers} paying reviewer${s.reviewers === 1 ? "" : "s"}`;
}

/** Live Grounded score from the chain. Never from our data, so nothing here can be typed in. */
export function AgentScore({ agentId, compact, className }: { agentId: string; compact?: boolean; className?: string }) {
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(RATED, bump);
    return () => window.removeEventListener(RATED, bump);
  }, []);

  useEffect(() => {
    let off = false;
    setFailed(false);
    read(agentId).then(
      (s) => { if (!off) setScore(s); },
      () => { if (!off) setFailed(true); },
    );
    return () => { off = true; };
  }, [agentId, version]);

  const text = failed ? "Score unavailable" : !score ? "Reading score…" : compact ? (score.confidence === "none" ? "New" : `Score ${score.score}`) : scoreLabel(score);
  return <span className={className} title={score ? scoreLabel(score) : undefined}>{text}</span>;
}
