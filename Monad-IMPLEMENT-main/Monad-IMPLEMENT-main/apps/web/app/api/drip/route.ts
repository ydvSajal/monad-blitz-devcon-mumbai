import { createWalletClient, erc20Abi, http, isAddress, parseEther, parseUnits, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { ADDR, monad, padGas, publicClient } from "@/lib/gig";
import { retryAfter } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });

/**
 * Testnet funds so a visitor can hire: a little MON for gas and a little USDC to pay with. `DRIP_PRIVATE_KEY` is a
 * testnet-only wallet with no role in any contract. Capped per address and per IP because there is no identity to gate on.
 */
export async function POST(req: Request) {
  const key = process.env.DRIP_PRIVATE_KEY as Hex | undefined;
  if (!key) return json({ error: "The test-funds faucet is not configured on this site." }, 503);

  const body = (await req.json().catch(() => null)) as { address?: string } | null;
  if (!body?.address || !isAddress(body.address)) return json({ error: "address must be a valid 0x address" }, 400);
  const to: Address = body.address;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const wait = Math.max(retryAfter(`drip:addr:${to.toLowerCase()}`, 1, DAY_MS), retryAfter(`drip:ip:${ip}`, 5, DAY_MS));
  if (wait > 0) return json({ error: "Already funded: one drip per address per day." }, 429, { "retry-after": String(wait) });

  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ chain: monad, transport: http(), account });
  const mon = parseEther(process.env.DRIP_MON_AMOUNT ?? "0.3");
  const usdc = parseUnits(process.env.DRIP_USDC_AMOUNT ?? "1", 6);

  try {
    const [monBalance, usdcBalance] = await Promise.all([
      publicClient.getBalance({ address: account.address }),
      publicClient.readContract({ address: ADDR.usdc, abi: erc20Abi, functionName: "balanceOf", args: [account.address] }),
    ]);
    if (monBalance < mon * 2n || usdcBalance < usdc) return json({ error: "The faucet is empty. Try again later." }, 503);

    const monTx = await wallet.sendTransaction({ to, value: mon, gas: 21_000n });
    await publicClient.waitForTransactionReceipt({ hash: monTx });
    const args = { address: ADDR.usdc, abi: erc20Abi, functionName: "transfer", args: [to, usdc], account } as const;
    const usdcTx = await wallet.writeContract({ ...args, gas: padGas(await publicClient.estimateContractGas(args)) });
    await publicClient.waitForTransactionReceipt({ hash: usdcTx });
    return json({ monTx, usdcTx });
  } catch (e) {
    console.error("drip failed", e);
    return json({ error: "The faucet could not send funds. Try again later." }, 502);
  }
}
