"use client";

import Link from "next/link";
import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { AgentCharacter } from "@/components/AgentCharacter";
import { AgentScore } from "@/components/AgentScore";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import type { Agent } from "@/content/agents";
import type { CSSProperties } from "react";

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <GlassCard as="article" className="flex h-full flex-col p-2" style={{ "--tint": agent.color } as CSSProperties}>
      <Link href={`/agents/${agent.slug}`} className="agent-card-stage relative flex h-60 items-center justify-center rounded-[12px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" style={{ background: agent.surface }} aria-label={`Meet ${agent.name}`}>
        <span className="absolute left-4 top-4 text-xs font-medium" style={{ color: agent.color }}>{agent.category}</span>
        <AgentCharacter agent={agent} className="h-52 w-52" />
        <span className="absolute bottom-4 right-4 rounded-full bg-white/80 p-2 text-foreground"><ArrowUpRightIcon className="size-4" /></span>
      </Link>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-2xl font-semibold tracking-tight"><Link href={`/agents/${agent.slug}`} className="hover:text-primary">{agent.name}</Link></h3>
          <AgentScore agentId={agent.agentId} compact className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground" />
        </div>
        <p className="mt-1 text-sm font-medium" style={{ color: agent.color }}>{agent.role}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{agent.shortDescription}</p>
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={`${agent.name} planned skills`}>
          {agent.skills.map((skill) => <li key={skill} className="rounded-md bg-secondary/80 px-2 py-1 text-xs text-muted-foreground">{skill}</li>)}
        </ul>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
          <div><p className="text-sm font-medium">0.10 USDC per job</p><p className="mt-0.5 text-xs text-muted-foreground">Monad Testnet</p></div>
          <Button asChild variant="outline" className="rounded-full bg-white"><Link href={`/agents/${agent.slug}`}>Meet agent <ArrowUpRightIcon /></Link></Button>
        </div>
      </div>
    </GlassCard>
  );
}
