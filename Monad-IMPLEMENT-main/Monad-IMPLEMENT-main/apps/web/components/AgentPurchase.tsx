"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRightIcon, ArrowUpRightIcon, CheckIcon } from "@phosphor-icons/react";
import { BaseError, ContractFunctionRevertedError, formatEther, formatUnits, parseEventLogs, type Address } from "viem";

import { RateBox } from "@/app/jobs/[id]/RateBox";
import { AgentScore, refreshScores } from "@/components/AgentScore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { Agent } from "@/content/agents";
import { ADDR, GROUNDED_SITE, groundedAbi, publicClient, signRouterPull, usdc, usdcAbi } from "@/lib/gig";
import { EXPLORER, JOB_HIRED, JOB_RELEASED, MIN_MON, PRICE, SHOP_ESCROW, shopAbi } from "@/lib/shop";
import { useWallet } from "@/lib/wallet";

interface Purchase { jobId: string; receiptId?: string; rated?: boolean }
interface LockedJob { amount: bigint; deadline: number }

const TOTAL = (PRICE * 105n) / 100n; // the escrow's fee is a fixed 5%
const HIRE_WINDOW = 24n * 3600n;

// localStorage can throw (private windows, blocked storage): buying must still work without it
const load = (key: string): Purchase | null => {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") as Purchase | null; } catch { return null; }
};
const store = (key: string, p: Purchase | null) => {
  try { if (p) localStorage.setItem(key, JSON.stringify(p)); else localStorage.removeItem(key); } catch {}
};

/** The contract's error name, or viem's short message. Never a full RPC dump. */
function reason(e: unknown): string {
  if (e instanceof BaseError) {
    const reverted = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError && reverted.data?.errorName) return `The contract refused: ${reverted.data.errorName}.`;
    return e.shortMessage;
  }
  return e instanceof Error ? e.message : String(e);
}

export function AgentPurchase({ agent }: { agent: Agent }) {
  const { account, wallet, connect, write } = useWallet();
  const agentId = BigInt(agent.agentId);

  const [brief, setBrief] = useState("");
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const storageKey = `gigtrust:agent-brief:v1:${agent.slug}`;
  useEffect(() => {
    setBrief(""); setSaved(false); setMessage("");
    try { const existing = localStorage.getItem(storageKey); if (existing) { setBrief(existing); setSaved(true); } }
    catch { setMessage("Browser storage is unavailable. You can still write and copy your brief."); }
  }, [storageKey]);
  const save = () => {
    try { localStorage.setItem(storageKey, brief.trim()); setSaved(true); setMessage("Brief saved on this browser."); }
    catch { setMessage("Your browser could not save the brief. Copy the text to keep it."); }
  };

  const purchaseKey = account ? `gigtrust:purchase:v1:${account.toLowerCase()}:${agent.slug}` : "";
  const [purchase, setPurchaseState] = useState<Purchase | null>(null);
  const [job, setJob] = useState<LockedJob | null>(null);
  const [funds, setFunds] = useState<{ mon: bigint; usdc: bigint } | null>(null);
  const [bar, setBar] = useState(0);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const setPurchase = useCallback((p: Purchase | null) => {
    setPurchaseState(p);
    if (purchaseKey) store(purchaseKey, p);
  }, [purchaseKey]);

  const refreshFunds = useCallback(async () => {
    if (!account) return setFunds(null);
    const [mon, balance] = await Promise.all([
      publicClient.getBalance({ address: account }),
      publicClient.readContract({ address: ADDR.usdc, abi: usdcAbi, functionName: "balanceOf", args: [account] }),
    ]);
    setFunds({ mon, usdc: balance });
  }, [account]);

  // the chain decides what stage this purchase is in: storage only remembers which job to ask about
  useEffect(() => {
    let off = false;
    setJob(null);
    const saved = purchaseKey ? load(purchaseKey) : null;
    setPurchaseState(saved);
    void refreshFunds().catch(() => {});
    if (!saved) return;
    publicClient.readContract({ address: SHOP_ESCROW, abi: shopAbi, functionName: "jobs", args: [BigInt(saved.jobId)] }).then(([, amount, , deadline, status]) => {
      if (off) return;
      if (status === JOB_HIRED) setJob({ amount, deadline });
      // ponytail: released with no saved receipt id means the tab closed mid-release; the receipt is still on Grounded
      else if (status !== JOB_RELEASED || !saved.receiptId) { setPurchaseState(null); store(purchaseKey, null); }
    }).catch(() => {});
    return () => { off = true; };
  }, [purchaseKey, refreshFunds]);

  const run = (label: string, fn: () => Promise<void>) => async () => {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(reason(e));
    } finally {
      setBusy("");
      void refreshFunds().catch(() => {});
    }
  };

  const send = async (req: { address: Address; abi: readonly unknown[]; functionName: string; args: readonly unknown[] }) => {
    const receipt = await write(req);
    if (receipt.status !== "success") throw new Error(`${req.functionName} reverted on chain: ${receipt.transactionHash}`);
    return receipt;
  };

  const connectWallet = run("Connecting…", async () => {
    await connect().catch((e: unknown) => {
      throw e instanceof Error && e.message.includes("No injected wallet") ? new Error("No wallet found. Install MetaMask to hire on Monad Testnet.") : e;
    });
  });

  const getFunds = run("Sending test funds…", async () => {
    const res = await fetch("/api/drip", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: account }) });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(body.error ?? `The faucet answered ${res.status}.`);
    await new Promise((r) => setTimeout(r, 2500)); // Monad's balance check lags about 4 blocks behind a new deposit
  });

  const hire = run("Locking your payment…", async () => {
    await connect(); // also switches a wallet that drifted to another chain
    const minReviewers = bar > 0 ? 1 : 0;
    // the same call the escrow makes: asking first costs nothing and says why
    const trusted = await publicClient.readContract({ address: ADDR.grounded, abi: groundedAbi, functionName: "meets", args: [agentId, bar, minReviewers] });
    if (!trusted) throw new Error(`${agent.name} does not meet this bar, so the contract would refuse the hire. Nothing was sent.`);

    const fee = await publicClient.readContract({ address: SHOP_ESCROW, abi: shopAbi, functionName: "feeOf", args: [PRICE] });
    const allowance = await publicClient.readContract({ address: ADDR.usdc, abi: usdcAbi, functionName: "allowance", args: [account!, SHOP_ESCROW] });
    if (allowance < PRICE + fee) await send({ address: ADDR.usdc, abi: usdcAbi, functionName: "approve", args: [SHOP_ESCROW, PRICE + fee] });

    const deadline = Number((await publicClient.getBlock()).timestamp + HIRE_WINDOW); // chain time: a skewed browser clock must not set it
    const receipt = await send({ address: SHOP_ESCROW, abi: shopAbi, functionName: "hire", args: [agentId, PRICE, bar, minReviewers, deadline] });
    const hired = parseEventLogs({ abi: shopAbi, eventName: "JobHired", logs: receipt.logs })[0];
    if (!hired) throw new Error("The hire went through but its event was not found. Check your wallet's activity.");
    setPurchase({ jobId: String(hired.args.jobId) });
    setJob({ amount: hired.args.amount, deadline: hired.args.deadline });
  });

  const release = run("Releasing payment…", async () => {
    await connect();
    const { validBefore, salt, signature } = await signRouterPull(wallet!, account!, agentId, job!.amount);
    const receipt = await send({ address: SHOP_ESCROW, abi: shopAbi, functionName: "release", args: [BigInt(purchase!.jobId), 0n, validBefore, salt, signature] });
    const released = parseEventLogs({ abi: shopAbi, eventName: "JobReleased", logs: receipt.logs })[0];
    if (!released) throw new Error("The release went through but its event was not found. Check your wallet's activity.");
    setPurchase({ jobId: purchase!.jobId, receiptId: String(released.args.receiptId) });
    setJob(null);
  });

  const refund = run("Refunding…", async () => {
    await connect();
    await send({ address: SHOP_ESCROW, abi: shopAbi, functionName: "refund", args: [BigInt(purchase!.jobId)] });
    setPurchase(null);
    setJob(null);
  });

  const shortOfUsdc = !!funds && funds.usdc < TOTAL;
  const shortOfMon = !!funds && funds.mon < MIN_MON;
  const refundable = !!job && Date.now() / 1000 > job.deadline;

  return (
    <Dialog>
      <DialogTrigger asChild><Button size="lg" className="h-12 w-full rounded-full">Hire {agent.name} <ArrowRightIcon /></Button></DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-5 text-2xl tracking-tight">Hire {agent.name}</DialogTitle>
          <DialogDescription className="leading-relaxed">Your USDC waits in escrow until you release it. Monad Testnet demo: the payment, receipt and rating are real on-chain, but no AI runs the job yet.</DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 rounded-xl bg-secondary/70 p-4 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Agent</dt><dd className="text-right font-medium">{agent.name} · <a href={`${GROUNDED_SITE}/agents/${agent.agentId}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">#{agent.agentId}</a></dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Price</dt><dd className="text-right">{usdc(PRICE)} USDC + 5% fee</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Reputation</dt><dd className="text-right"><AgentScore agentId={agent.agentId} /></dd></div>
          {funds && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Your wallet</dt><dd className="text-right">{Number(formatUnits(funds.usdc, 6)).toFixed(3)} USDC · {Number(formatEther(funds.mon)).toFixed(3)} MON</dd></div>}
        </dl>

        {!purchase && (
          <div>
            <label htmlFor={`brief-${agent.slug}`} className="text-sm font-medium">What would you like to work on?</label>
            <Textarea id={`brief-${agent.slug}`} placeholder={`Tell ${agent.name} about your idea…`} maxLength={2000} rows={3} value={brief} onChange={(event) => { setBrief(event.target.value); setSaved(false); setMessage(""); }} className="mt-2 resize-y bg-white" />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Saved only on this device. Nothing is sent to an agent.</p>
              <Button variant="outline" size="sm" onClick={save} disabled={!brief.trim() || saved} className="rounded-full bg-white">{saved ? <><CheckIcon /> Brief saved</> : "Save my brief"}</Button>
            </div>
            <p role="status" className="mt-2 text-sm text-muted-foreground">{message}</p>
          </div>
        )}

        {!account ? (
          <Button onClick={connectWallet} disabled={!!busy} className="rounded-full">Connect wallet to hire</Button>
        ) : !purchase ? (
          <div className="space-y-3">
            {(shortOfUsdc || shortOfMon) && (
              <div className="rounded-xl border p-4 text-sm">
                <p>You need about {formatUnits(TOTAL, 6)} USDC and {formatEther(MIN_MON)} MON for gas.</p>
                <Button variant="outline" size="sm" onClick={getFunds} disabled={!!busy} className="mt-3 rounded-full bg-white">Get test funds</Button>
              </div>
            )}
            <label className="block text-sm font-medium">Only hire if the score is at least
              <select value={bar} onChange={(e) => setBar(Number(e.target.value))} className="mt-2 block h-10 w-full rounded-lg border bg-white px-3 font-normal">
                <option value={0}>No minimum</option>
                <option value={50}>50, from a paying reviewer</option>
                <option value={80}>80, from a paying reviewer</option>
              </select>
            </label>
            <Button onClick={hire} disabled={!!busy || shortOfUsdc} className="w-full rounded-full">Lock {formatUnits(TOTAL, 6)} USDC and hire</Button>
          </div>
        ) : job ? (
          <div className="space-y-3 rounded-xl border p-4 text-sm">
            <p><b>Job #{purchase.jobId}.</b> {usdc(job.amount)} USDC is locked for {agent.name}. Release pays the agent&apos;s on-chain wallet and issues a receipt in your name.</p>
            <Button onClick={release} disabled={!!busy} className="w-full rounded-full">Release payment</Button>
            <Button variant="outline" onClick={refund} disabled={!!busy || !refundable} className="w-full rounded-full bg-white">{refundable ? "Take the money back" : `Refund opens ${new Date(job.deadline * 1000).toLocaleString()}`}</Button>
          </div>
        ) : purchase.receiptId ? (
          <div className="space-y-3">
            {purchase.rated ? (
              <p className="rounded-xl border p-4 text-sm"><b>Rated.</b> Your receipt #{purchase.receiptId} now counts toward {agent.name}&apos;s score. <a href={`${GROUNDED_SITE}/agents/${agent.agentId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">See it on Grounded <ArrowUpRightIcon /></a></p>
            ) : (
              <RateBox receiptId={BigInt(purchase.receiptId)} agentId={agentId} tag="quality" onRated={() => { setPurchase({ ...purchase, rated: true }); refreshScores(); }} />
            )}
            <Button variant="outline" onClick={() => setPurchase(null)} disabled={!!busy} className="w-full rounded-full bg-white">{purchase.rated ? "Hire again" : "Hire again without rating"}</Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Reading job #{purchase.jobId} from the chain…</p>
        )}

        <p className="text-xs text-muted-foreground">{busy || <>Escrow <a href={`${EXPLORER}/address/${SHOP_ESCROW}#code`} target="_blank" rel="noreferrer" className="underline underline-offset-4">{SHOP_ESCROW.slice(0, 10)}…</a> has no owner: only you release, and you can take the money back after the 24-hour deadline.</>}</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
