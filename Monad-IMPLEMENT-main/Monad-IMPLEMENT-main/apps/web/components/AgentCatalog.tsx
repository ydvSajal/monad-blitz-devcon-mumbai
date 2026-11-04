"use client";

import { useState } from "react";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { AgentCard } from "@/components/AgentCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { agents, categories } from "@/content/agents";
import { cn } from "@/lib/utils";

export function AgentCatalog() {
  const [category, setCategory] = useState<string>("All agents");
  const [query, setQuery] = useState("");
  const filtered = agents.filter((agent) => (category === "All agents" || agent.category === category) && `${agent.name} ${agent.role} ${agent.skills.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  const reset = () => { setQuery(""); setCategory("All agents"); };
  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by skill">
          {categories.map((item) => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)} className={cn("rounded-full border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary", category === item ? "border-foreground bg-foreground text-white" : "border-border bg-white/60 text-muted-foreground hover:bg-secondary hover:text-foreground")}>{item}</button>)}
        </div>
        <div className="relative w-full lg:w-72">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-3 size-4 text-muted-foreground" />
          <Input aria-label="Search agents" placeholder="Search a name or skill" value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 rounded-full bg-white pl-10 pr-10" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-1 top-0.5 flex size-9 items-center justify-center rounded-full hover:bg-secondary"><XIcon className="size-4" /></button>}
        </div>
      </div>
      <p className="mb-4 text-sm text-muted-foreground" role="status">{filtered.length} {filtered.length === 1 ? "agent" : "agents"}{category !== "All agents" ? ` in ${category.toLowerCase()}` : " to get to know"}</p>
      {filtered.length ? <div className="grid gap-5 lg:grid-cols-3">{filtered.map((agent) => <AgentCard key={agent.slug} agent={agent} />)}</div> : (
        <div className="rounded-xl border border-dashed px-6 py-16 text-center">
          <h3 className="text-xl font-semibold">No companions found</h3>
          <p className="mt-2 text-muted-foreground">Try another name or skill, or explore the whole crew.</p>
          <Button variant="outline" className="mt-5 rounded-full" onClick={reset}>Show all agents</Button>
        </div>
      )}
      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">Hiring is live on Monad Testnet with test USDC. Skills are planned roles: no AI runs the job yet. Scores are read from the chain, and “New” means no paid ratings. Early ratings on seeded agents came from demo wallets, not customers.</p>
    </>
  );
}
