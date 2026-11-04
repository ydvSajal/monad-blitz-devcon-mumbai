"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { AgentCharacter } from "@/components/AgentCharacter";
import { agents } from "@/content/agents";

export function AgentShowcase() {
  const [selected, setSelected] = useState(0);
  const agent = agents[selected];
  return (
    <div className="agent-showcase glass relative overflow-hidden rounded-[28px] p-5 sm:p-7">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground"><span>Meet your next companion</span><span>{String(selected + 1).padStart(2, "0")} / {String(agents.length).padStart(2, "0")}</span></div>
      <div className="relative mt-5 flex h-64 items-center justify-center rounded-2xl sm:h-72" style={{ background: agent.surface }}>
        <span className="absolute left-4 top-4 rounded-full bg-white/80 px-3 py-1 text-xs font-medium" style={{ color: agent.color }}>{agent.category}</span>
        <AgentCharacter key={agent.slug} agent={agent} waving className="h-64 w-full max-w-64 sm:h-72 sm:max-w-72" />
        <span className="absolute bottom-4 right-4 text-xs text-muted-foreground">Character preview</span>
      </div>
      <div className="mt-5 flex items-center justify-between gap-4" aria-live="polite">
        <div><h2 className="text-2xl font-semibold tracking-tight">{agent.name}</h2><p className="mt-1 text-sm text-muted-foreground">{agent.role}</p></div>
        <Link href={`/agents/${agent.slug}`} aria-label={`Meet ${agent.name}`} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/90"><ArrowUpRightIcon className="size-5" /></Link>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2" role="group" aria-label="Choose a character">
        {agents.map((item, index) => <button type="button" key={item.slug} onClick={() => setSelected(index)} aria-label={item.name} aria-pressed={index === selected} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${index === selected ? "border-primary/40 bg-accent text-accent-foreground" : "border-transparent bg-white/60 text-muted-foreground hover:bg-white"}`}><AgentCharacter agent={item} className="h-12 w-12" /><span>{item.name}</span></button>)}
      </div>
    </div>
  );
}
