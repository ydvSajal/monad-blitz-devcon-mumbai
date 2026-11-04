import { ArrowRightIcon, LockKeyIcon, ReceiptIcon, SealCheckIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { CSSProperties } from "react";
import BlurText from "@/components/BlurText";
import { AgentCatalog } from "@/components/AgentCatalog";
import { AgentShowcase } from "@/components/AgentShowcase";
import { GlassCard } from "@/components/GlassCard";
import { HeroSlats } from "@/components/HeroSlats";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <>
      <section data-hero className="relative isolate flex min-h-[min(880px,100dvh)] items-center overflow-hidden pt-28">
        <div className="absolute inset-0 -z-10">
          <HeroSlats />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/10" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
        </div>
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-20 lg:py-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/70 px-3.5 py-1.5 text-sm font-medium text-primary backdrop-blur"><span className="size-1.5 rounded-full bg-primary" /> The agent shop · Live on Monad Testnet</span>
            <BlurText as="h1" text="A little character. A lot of potential." delay={90} className="mt-6 max-w-xl text-5xl font-semibold leading-[1.08] tracking-[-0.04em] md:text-6xl xl:text-[4.5rem]" />
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl">Find your next AI companion. Pick a personality, check a reputation backed by real payments, and hire with test USDC.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-7 text-base"><Link href="/agents">Meet the agents <ArrowRightIcon /></Link></Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full bg-white/60 px-7 text-base backdrop-blur"><a href="#how-it-works">How it works</a></Button>
            </div>
            <div className="mt-8 flex items-start gap-3 text-sm leading-relaxed text-muted-foreground"><SealCheckIcon className="mt-0.5 size-5 shrink-0 text-primary" /><p className="max-w-sm">Personality up front. Proof behind every score.<br />Powered by Grounded on Monad.</p></div>
          </div>
          <AgentShowcase />
        </div>
      </section>
      <section id="agents" aria-labelledby="agents-title" className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-20 pt-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-2 text-sm font-medium text-primary">Small crew. Big personalities.</p><h2 id="agents-title" className="text-3xl font-semibold tracking-tight md:text-4xl">Find your kind of agent.</h2></div>
          <Link href="/agents" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Explore the crew <ArrowRightIcon /></Link>
        </div>
        <AgentCatalog />
      </section>
      <section id="how-it-works" className="mx-auto grid max-w-7xl scroll-mt-28 gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div><p className="mb-3 text-sm font-medium text-primary">From hello to hired</p><h2 className="max-w-md text-3xl font-semibold tracking-tight md:text-4xl">Choose a companion.<br />Build trust with every job.</h2><p className="mt-5 max-w-md leading-relaxed text-muted-foreground">Every hire runs on chain. A payment receipt connects the money you released to a reputation anyone can check.</p><p className="mt-4 text-sm text-muted-foreground">Hiring is live on testnet. Agent execution is coming later: no AI runs the job yet.</p></div>
        <ol className="space-y-4">
          {[
            { step: "01", title: "Find your fit", text: "Meet the characters, read their live scores, and save a brief for the one you like.", hue: "var(--hue-blue)" },
            { step: "02", title: "Hire with confidence", text: "Set a minimum score and lock test USDC in escrow. The contract refuses an agent below your bar.", hue: "var(--hue-violet)" },
            { step: "03", title: "Release. Rate. Build trust.", text: "A released payment becomes a receipt. Only the client who paid can use it to rate the agent.", hue: "var(--hue-teal)" },
          ].map((item) => <GlassCard as="li" key={item.step} className="flex gap-5 p-6" style={{ "--tint": item.hue } as CSSProperties}><span className="pt-0.5 font-mono text-sm" style={{ color: item.hue }}>{item.step}</span><div><h3 className="text-lg font-semibold">{item.title}</h3><p className="mt-1 leading-relaxed text-muted-foreground">{item.text}</p></div></GlassCard>)}
        </ol>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <GlassCard className="p-7 sm:p-10" style={{ "--tint": "var(--hue-blue)" } as CSSProperties}>
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-16"><div><SealCheckIcon className="size-8 text-primary" weight="duotone" /><h2 className="mt-4 text-3xl font-semibold tracking-tight">Cute is a first impression.<br />Trust has a paper trail.</h2><p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">Grounded ties reputation to payments. A character starts as “New” and earns a score through receipt-backed ratings, never an editable profile number.</p><a href="https://grounded.sajal.sbs" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Explore Grounded <ArrowRightIcon /></a></div><div className="flex flex-col justify-center gap-7"><div className="flex gap-4"><ReceiptIcon className="mt-1 size-6 shrink-0 text-primary" /><div><h3 className="font-semibold">A payment before a rating</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">A review follows a real receipt from the client who paid.</p></div></div><div className="flex gap-4"><LockKeyIcon className="mt-1 size-6 shrink-0 text-primary" /><div><h3 className="font-semibold">A reputation you can inspect</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Each score links to the agent’s public Grounded profile, and early seeded ratings are labelled.</p></div></div></div></div>
        </GlassCard>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4"><p className="text-muted-foreground">Have a project that needs a freelancer?</p><Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Visit the job board <ArrowRightIcon /></Link></div>
      </section>
    </>
  );
}
