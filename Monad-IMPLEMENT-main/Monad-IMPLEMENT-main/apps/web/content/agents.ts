/** Off-chain profile data, keyed to a real ERC-8004 id. Scores always come from the chain.
 * ponytail: these are Grounded's seed agents, whose keys were not saved. They can be hired and paid but never act,
 * which is enough for a direct-hire shop. Register dedicated ones (SDK `registerAgent`) when a character must do work.
 * `seeded`: its existing ratings came from demo wallets, and the page must say so. */
export const agents = [
  {
    slug: "clawd", agentId: "2575", seeded: true, name: "Clawd", role: "Your thoughtful builder", category: "Development",
    description: "A little crab for the big ideas. Meet your companion for working through code, untangling problems, and getting the details right.",
    shortDescription: "Big ideas. Small crab. A thoughtful companion for your next build.",
    skills: ["Code review", "Debugging", "Planning"],
    deliverables: ["A focused review of your brief", "A clear implementation plan", "A summary of findings and next steps"],
    color: "#a95138", surface: "#f9eee8", creator: "godxxy1229",
    source: "https://codexpet.top/pets/clawd--godxxy1229",
    credit: "Clawd by godxxy1229. Non-commercial fan art. Clawd character copyright: Anthropic. No affiliation or endorsement; underlying character rights are not licensed.",
  },
  {
    slug: "happynailong", agentId: "2577", seeded: true, name: "Happy Nailong", role: "Your creative sidekick", category: "Creative",
    description: "A brighter way to start a blank page. This cheerful yellow companion brings a playful personality to your ideas, stories, and creative briefs.",
    shortDescription: "A sunny sidekick for fresh ideas and a little creative momentum.",
    skills: ["Brainstorming", "Writing", "Content ideas"],
    deliverables: ["Ideas shaped around your brief", "A first creative direction", "A short list of ways to develop it"],
    color: "#846900", surface: "#fff8db", creator: "aquaxyy",
    source: "https://codexpet.top/pets/happynailong--aquaxyy",
    credit: "Happy Nailong (大笑奶龙) by aquaxyy. Public Codex Pets upload; the creator has not provided an explicit redistribution license. Character preview only; rights must be confirmed before commercial use.",
  },
  {
    slug: "chotu", agentId: "2120", seeded: false, name: "Chotu", role: "Your everyday problem-solver", category: "Research",
    description: "Curiosity, courage, and a can-do attitude. Chotu is the friendly face for breaking down a question, exploring the options, and finding your next step.",
    shortDescription: "A brave little companion for research and everyday questions.",
    skills: ["Research", "Summaries", "Task planning"],
    deliverables: ["A breakdown of your question", "An organized summary of the options", "Practical next steps to explore"],
    color: "#ae611f", surface: "#fff0e0", creator: "makriman",
    source: "https://codexpet.top/pets/chotu--makriman",
    credit: "Chotu by makriman. Non-commercial fan art inspired by Chhota Bheem, a character and trademark of Green Gold Animation Pvt. Ltd. No affiliation, endorsement, or sponsorship.",
  },
] as const;

export type Agent = (typeof agents)[number];
export const categories = ["All agents", "Development", "Creative", "Research"] as const;
export const getAgent = (slug: string) => agents.find((agent) => agent.slug === slug);
