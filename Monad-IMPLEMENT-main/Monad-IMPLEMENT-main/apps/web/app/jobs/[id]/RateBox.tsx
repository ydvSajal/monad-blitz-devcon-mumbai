"use client";

import { Grounded, BrowserPasskey } from "@sajalydv/grounded-sdk";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { ADDR, GROUNDED_SITE, monad } from "@/lib/gig";
import { useWallet } from "@/lib/wallet";

const RP_ID = "grounded.sajal.sbs"; // Grounded's ReviewerRegistry only verifies passkeys for this rpId

// localStorage can throw (private windows, blocked storage)
const readSaved = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };

/**
 * Rating needs a passkey whose rpId is Grounded's. A browser only allows that on grounded.sajal.sbs or a
 * subdomain of it, so on any other host we explain it and link out instead of failing mid-flow.
 */
export function RateBox({ receiptId, agentId, tag, onRated }: { receiptId: bigint; agentId: bigint; tag: "quality" | "dispute"; onRated?: () => void }) {
  const { wallet } = useWallet();
  const [score, setScore] = useState(90);
  const [msg, setMsg] = useState("");
  const hostOk = typeof window !== "undefined" && (location.hostname === RP_ID || location.hostname.endsWith(`.${RP_ID}`));

  const rate = async () => {
    try {
      if (!wallet) throw new Error("Connect a wallet first");
      const g = new Grounded({
        chain: "monad-testnet",
        // let the SDK build its own client: it inspects revert data with its own viem copy, which a client from this app would defeat
        rpcUrl: monad.rpcUrls.default.http[0],
        walletClient: wallet as never,
        addresses: { groundedReputation: ADDR.grounded, receiptRegistry: ADDR.receipts, receiptRouter: ADDR.router, reviewerRegistry: ADDR.reviewers, erc8004Identity: ADDR.identity, usdc: ADDR.usdc },
      });
      // binding is final (one passkey per wallet): the chain decides, never localStorage (it may hold a key from the retired registry)
      const store = `gigtrust.passkey.${wallet.account?.address.toLowerCase()}`;
      const saved = readSaved(store);
      let key: BrowserPasskey;
      if (await g.hasPasskey()) {
        if (!saved) throw new Error("This wallet's passkey was created in another browser, so it cannot rate here. Rate from that browser, or use a new wallet.");
        key = BrowserPasskey.restore(JSON.parse(saved));
      } else {
        setMsg("Creating and binding passkey (first time only)…");
        key = await BrowserPasskey.create({ rpId: RP_ID, name: "GigTrust client" });
        await g.bindPasskey(key);
        try { localStorage.setItem(store, JSON.stringify(key)); } catch { toast.warning("This browser could not save your passkey, so you cannot rate from this wallet again."); }
      }
      setMsg("Rating…");
      await g.rate({ receiptId, score, tag, authenticator: key });
      setMsg("Rated. The score is now updated on Grounded.");
      toast.success("Rated");
      onRated?.();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="glass space-y-4 rounded-xl p-6">
      <h2 className="text-lg font-semibold">Rate this work</h2>
      <p>Receipt <b>#{String(receiptId)}</b> was issued with you as payer. One rating per receipt, signed with a passkey.</p>
      {hostOk ? (
        <>
          <Input type="number" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} />
          <Button className="rounded-full" onClick={rate}>Sign with passkey and rate</Button>
        </>
      ) : (
        <p className="muted text-sm">
          Passkeys are bound to <code>{RP_ID}</code>, so rating works from a page on that domain. See{" "}
          <a href={`${GROUNDED_SITE}/agents/${agentId}`}>agent #{String(agentId)} on Grounded</a>; quote receipt #{String(receiptId)}.
        </p>
      )}
      <p className="muted text-sm">{msg}</p>
    </div>
  );
}
