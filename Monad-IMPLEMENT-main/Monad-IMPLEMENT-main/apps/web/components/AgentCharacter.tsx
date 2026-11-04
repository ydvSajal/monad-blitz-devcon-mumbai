"use client";

import { useEffect, useRef, useState } from "react";
import type { Agent } from "@/content/agents";
import { cn } from "@/lib/utils";

export function AgentCharacter({ agent, waving = false, className }: { agent: Agent; waving?: boolean; className?: string }) {
  return <CharacterImage key={`${agent.slug}:${waving}`} agent={agent} waving={waving} className={className} />;
}

function CharacterImage({ agent, waving, className }: { agent: Agent; waving: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // A cached failure can finish before React attaches its error handler.
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, []);
  return (
    <div className={cn("agent-character", className)}>
      {failed ? (
        <span className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground" role="img" aria-label={`${agent.name} preview unavailable`}>
          <span className="text-3xl font-semibold" style={{ color: agent.color }}>{agent.name.charAt(0)}</span>
          Character preview unavailable
        </span>
      ) : (
        <picture>
          <source media="(prefers-reduced-motion: reduce)" srcSet={`/agents/${agent.slug}-still.png`} />
          {/* Animated WebP keeps the original community animation intact. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imageRef} src={`/agents/${agent.slug}-${waving ? "waving" : "idle"}.webp`} alt={`${agent.name}, ${agent.role.toLowerCase()}`} width={320} height={320} onError={() => setFailed(true)} className="agent-motion h-full w-full object-contain" />
        </picture>
      )}
    </div>
  );
}
