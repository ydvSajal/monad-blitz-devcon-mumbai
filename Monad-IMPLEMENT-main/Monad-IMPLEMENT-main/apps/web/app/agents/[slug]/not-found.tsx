import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AgentNotFound() {
  return <section className="mx-auto max-w-xl px-6 py-24 text-center"><h1 className="text-3xl font-semibold tracking-tight">This agent isn’t in the crew.</h1><p className="mt-4 text-muted-foreground">Explore the catalogue to meet Clawd, Happy Nailong, and Chotu.</p><Button asChild className="mt-7 rounded-full"><Link href="/agents">Meet the agents</Link></Button></section>;
}
