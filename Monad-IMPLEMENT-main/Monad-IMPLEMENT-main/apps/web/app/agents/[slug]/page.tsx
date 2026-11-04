import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ArrowUpRightIcon, CheckIcon, ReceiptIcon } from "@phosphor-icons/react/ssr";
import { AgentCharacter } from "@/components/AgentCharacter";
import { AgentScore } from "@/components/AgentScore";
import { AgentCard } from "@/components/AgentCard";
import { AgentPurchase } from "@/components/AgentPurchase";
import { GlassCard } from "@/components/GlassCard";
import { agents, getAgent } from "@/content/agents";
import type { CSSProperties } from "react";

export function generateStaticParams() { return agents.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const agent = getAgent((await params).slug);
  return { title: agent ? `${agent.name} · GigTrust` : "Agent not found · GigTrust", description: agent?.shortDescription };
}

export default async function AgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const agent = getAgent((await params).slug);
  if (!agent) notFound();
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-7 sm:px-6">
      <Link href="/agents" className="mb-7 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeftIcon /> All agents</Link>
      <section className="grid items-start gap-8 lg:grid-cols-2 lg:gap-14">
        <GlassCard className="p-3" style={{ "--tint": agent.color } as CSSProperties}>
          <div className="relative flex h-80 items-center justify-center rounded-xl sm:h-[430px]" style={{ background: agent.surface }}><span className="absolute left-5 top-5 text-sm font-medium" style={{ color: agent.color }}>{agent.category}</span><AgentCharacter agent={agent} waving className="h-72 w-full max-w-72 sm:h-96 sm:max-w-96" /><span className="absolute bottom-5 right-5 rounded-full bg-white/80 px-3 py-1.5 text-xs text-muted-foreground">Character preview</span></div>
          <p className="px-3 pb-2 pt-4 text-xs text-muted-foreground">Character by <a href={agent.source} target="_blank" rel="noreferrer" className="underline underline-offset-4">{agent.creator}</a> on Codex Pet</p>
        </GlassCard>
        <div className="py-1 lg:py-4">
          <div className="flex flex-wrap items-center gap-3"><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{agent.name}</h1><AgentScore agentId={agent.agentId} compact className="rounded-full bg-secondary px-3 py-1 text-sm text-muted-foreground" /></div>
          <p className="mt-3 text-lg font-medium" style={{ color: agent.color }}>{agent.role}</p>
          <p className="mt-5 max-w-lg leading-relaxed text-muted-foreground">{agent.description}</p>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Planned skills">{agent.skills.map((skill) => <li key={skill} className="rounded-full border bg-white px-3 py-1.5 text-sm">{skill}</li>)}</ul>
          <div className="my-7 border-y py-5"><div className="flex items-baseline justify-between gap-4"><h2 className="text-lg font-semibold">0.10 USDC per job</h2><span className="text-xs text-muted-foreground">Plus 5% fee · Testnet USDC</span></div><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Your payment waits in escrow until you release it. Releasing pays this agent and gives you a receipt, and only that receipt can rate it.</p></div>
          <AgentPurchase agent={agent} />
          <p className="mt-3 text-center text-xs text-muted-foreground">Testnet demo. No AI runs the job yet, and buying does not transfer the agent.</p>
        </div>
      </section>
      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <GlassCard className="p-6 sm:p-8"><h2 className="text-xl font-semibold">What we’re planning</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">A starting point for {agent.name}’s future role. These capabilities are not running yet.</p><ul className="mt-5 space-y-4">{agent.deliverables.map((item) => <li key={item} className="flex items-start gap-3 text-sm"><CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />{item}</li>)}</ul></GlassCard>
        <GlassCard className="p-6 sm:p-8"><div className="flex items-center gap-2"><ReceiptIcon className="size-5 text-primary" /><h2 className="text-xl font-semibold">Trust you can check</h2></div><p className="mt-4 text-2xl font-semibold"><AgentScore agentId={agent.agentId} /></p><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Read live from Grounded for ERC-8004 agent #{agent.agentId}. Only a client who paid through a receipt can rate.{agent.seeded ? " Ratings so far include seeded ones from demo wallets, not customers." : ""}</p><a href={`https://grounded.sajal.sbs/agents/${agent.agentId}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">See agent #{agent.agentId} on Grounded <ArrowUpRightIcon /></a></GlassCard>
      </section>
      <details className="mt-6 rounded-xl border px-6 py-4 text-sm text-muted-foreground"><summary className="cursor-pointer font-medium text-foreground">Character credits & usage</summary><p className="mt-3 max-w-3xl leading-relaxed">{agent.credit}</p><a href={agent.source} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-primary hover:underline">Original character page <ArrowUpRightIcon /></a></details>
      <section className="mt-16"><h2 className="text-2xl font-semibold tracking-tight">Meet the rest of the crew</h2><div className="mt-6 grid gap-5 md:grid-cols-2">{agents.filter((item) => item.slug !== agent.slug).map((item) => <AgentCard key={item.slug} agent={item} />)}</div></section>
    </div>
  );
}
