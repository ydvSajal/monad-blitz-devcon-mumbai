/**
 * The whole purchase, through the real dialog in real Chrome, on the local anvil fork: faucet, trust bar refusal, hire,
 * reload, release, passkey rating, a second rating with the same passkey, and refund. Grounded's live contracts and
 * its direct-hire escrow are the real ones (from the fork). The page is served under gigs.grounded.sajal.sbs, mapped to
 * localhost, with a virtual authenticator, because passkeys only work on that domain.
 */
import { execSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Locator, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hexToString, isHex, parseAbi, toHex, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { RPC, USDC, chain, newActor, pc, rpc, setUsdc, snapshot, revert, warp, type Actor } from "./harness";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 3113;
const HOST = `http://gigs.grounded.sajal.sbs:${PORT}`;
const ESCROW = "0x5928c1a02BC3937aBe7cd5b5E39031507eC535c8" as Address;
const REPUTATION = "0xCA50d5222566F313D9fb890F2bce144381445356" as Address;
const REGISTRY = "0x41B65e7E027FB47cF4DE964F4F82A76Bc6BC5429" as Address;
const CLAWD = 2575n;
const CHOTU = 2120n;
const TOTAL = 105_000n;

const erc20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);
const reputation = parseAbi(["function meets(uint256,uint8,uint32) view returns (bool)"]);
const registry = parseAbi(["function keyOf(address) view returns (bytes32,bytes32)"]);
const usdcOf = (a: Address) => pc.readContract({ address: USDC, abi: erc20, functionName: "balanceOf", args: [a] });

let server: ChildProcess;
let browser: Browser;
let page: Page;
let current: Actor;

async function wallet(method: string, params: unknown[]): Promise<unknown> {
  const a = current;
  switch (method) {
    case "eth_requestAccounts":
    case "eth_accounts":
      return [a.address];
    case "wallet_switchEthereumChain":
    case "wallet_addEthereumChain":
      return null;
    case "eth_sendTransaction": {
      const t = params[0] as { to: Address; data?: Hex; gas?: Hex; value?: Hex };
      return a.wallet.sendTransaction({ account: a.account, chain, to: t.to, data: t.data, gas: t.gas ? BigInt(t.gas) : undefined, value: t.value ? BigInt(t.value) : undefined } as never);
    }
    case "eth_signTypedData_v4": {
      const td = JSON.parse(params[1] as string) as { domain: { chainId: number }; types: Record<string, { name: string; type: string }[]>; primaryType: string; message: Record<string, unknown> };
      const { EIP712Domain: _drop, ...types } = td.types;
      void _drop;
      const message = Object.fromEntries(Object.entries(td.message).map(([k, v]) => [k, /^u?int/.test(td.types[td.primaryType]!.find((f) => f.name === k)?.type ?? "") ? BigInt(v as string) : v]));
      return a.account.signTypedData({ domain: { ...td.domain, chainId: Number(td.domain.chainId) }, types, primaryType: td.primaryType, message } as never);
    }
    case "personal_sign": {
      const raw = params[0] as string;
      return a.account.signMessage({ message: isHex(raw) ? hexToString(raw) : raw });
    }
    default:
      return rpc(method, params);
  }
}

/** Opens a character's hire dialog as `who`. */
async function open(who: Actor, slug: string): Promise<Locator> {
  current = who;
  await page.goto(`${HOST}/agents/${slug}`);
  await page.getByRole("button", { name: /^Hire / }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText("Your wallet").waitFor();
  return dialog;
}
const hire = (dialog: Locator) => dialog.getByRole("button", { name: "Lock 0.105 USDC and hire" }).click();
const lockedJob = (dialog: Locator) => dialog.getByText(/^Job #\d+\./).waitFor({ timeout: 60_000 });
const release = async (dialog: Locator) => {
  await dialog.getByRole("button", { name: "Release payment" }).click();
  await dialog.getByRole("heading", { name: "Rate this work" }).waitFor({ timeout: 60_000 });
};
const rate = (dialog: Locator) => dialog.getByRole("button", { name: "Sign with passkey and rate" }).click();

let start: string; // ratings here are real on the shared fork: undo them, or the next run sees Chotu already rated

beforeAll(async () => {
  start = await snapshot();
  const dripKey = generatePrivateKey();
  const drip = privateKeyToAccount(dripKey).address;
  await rpc("anvil_setBalance", [drip, toHex(10n ** 20n)]);
  await setUsdc(drip, 100_000_000n);

  const webDir = path.resolve(import.meta.dirname, "..");
  const env = { ...process.env, NEXT_PUBLIC_RPC_URL: RPC, NEXT_PUBLIC_CHAIN_ID: "10143", SESSION_SECRET: "shop-test-session-secret", DRIP_PRIVATE_KEY: dripKey };
  const next = path.join(webDir, "node_modules/next/dist/bin/next");
  const built = spawnSync(process.execPath, [next, "build"], { cwd: webDir, env, encoding: "utf8" });
  if (built.status !== 0) throw new Error("next build failed:\n" + (built.stdout + built.stderr).slice(-2000));
  const log = fs.openSync(path.join(webDir, "tests/.server.log"), "w");
  server = spawn(process.execPath, [next, "start", "-p", String(PORT)], { cwd: webDir, env, stdio: ["ignore", log, log] });
  const deadline = Date.now() + 60_000;
  for (;;) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/agents`)).ok) break;
    } catch {}
    if (Date.now() > deadline) throw new Error("next start did not come up");
    await new Promise((r) => setTimeout(r, 1000));
  }

  browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--host-resolver-rules=MAP gigs.grounded.sajal.sbs 127.0.0.1", `--unsafely-treat-insecure-origin-as-secure=${HOST}`],
  });
  const context = await browser.newContext();
  page = await context.newPage();
  page.setDefaultTimeout(30_000);
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", { options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
  await page.exposeFunction("__wallet", wallet);
  await page.addInitScript(() => {
    (window as unknown as { ethereum: unknown }).ethereum = {
      request: ({ method, params }: { method: string; params?: unknown[] }) => (window as unknown as { __wallet: (m: string, p: unknown[]) => Promise<unknown> }).__wallet(method, params ?? []),
      on() {},
      removeListener() {},
    };
  });
  page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
}, 300_000);

afterAll(async () => {
  await browser?.close();
  if (server?.pid) {
    try { execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: "ignore" }); } catch {}
  }
  await revert(start);
});

describe("character shop", () => {
  it("a visitor with nothing funds from the faucet, once, and can then hire", async () => {
    const visitor = await newActor("visitor");
    await rpc("anvil_setBalance", [visitor.address, "0x0"]);
    const dialog = await open(visitor, "chotu");

    expect(await dialog.getByRole("button", { name: "Lock 0.105 USDC and hire" }).isDisabled()).toBe(true);
    await dialog.getByRole("button", { name: "Get test funds" }).click();
    await dialog.getByRole("button", { name: "Get test funds" }).waitFor({ state: "detached", timeout: 60_000 });
    expect(await usdcOf(visitor.address)).toBe(1_000_000n);

    const again = await fetch(`http://127.0.0.1:${PORT}/api/drip`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: visitor.address }) });
    expect(again.status).toBe(429);

    await hire(dialog);
    await lockedJob(dialog);
    expect(await usdcOf(visitor.address)).toBe(1_000_000n - TOTAL);
  });

  it("the trust bar refuses an unrated agent before anything is sent", async () => {
    const client = await newActor("client", 10_000_000n);
    const dialog = await open(client, "chotu");
    await dialog.getByRole("combobox").selectOption("50");
    await hire(dialog);
    await dialog.getByRole("alert").filter({ hasText: "does not meet this bar" }).waitFor();
    expect(await usdcOf(client.address)).toBe(10_000_000n);
    expect(await pc.readContract({ address: REPUTATION, abi: reputation, functionName: "meets", args: [CHOTU, 50, 1] })).toBe(false);
  });

  it("a locked job survives a reload, and the money comes back after the deadline", async () => {
    const client = await newActor("client", 10_000_000n);
    let dialog = await open(client, "chotu");
    const escrowBefore = await usdcOf(ESCROW);
    await hire(dialog);
    await lockedJob(dialog);
    expect(await usdcOf(ESCROW)).toBe(escrowBefore + TOTAL);

    dialog = await open(client, "chotu");
    await lockedJob(dialog);
    expect(await dialog.getByRole("button", { name: /^Refund opens/ }).isDisabled()).toBe(true);

    const snap = await snapshot();
    await warp(25 * 3600);
    await page.clock.setFixedTime(Date.now() + 25 * 3600 * 1000);
    dialog = await open(client, "chotu");
    await dialog.getByRole("button", { name: "Take the money back" }).click();
    await dialog.getByRole("button", { name: "Lock 0.105 USDC and hire" }).waitFor({ timeout: 60_000 });
    expect(await usdcOf(client.address)).toBe(10_000_000n);
    await revert(snap);
    await page.clock.setFixedTime(Date.now());
  });

  it("hire, release and rate: the passkey binds once, a second rating reuses it, and the score moves", async () => {
    const client = await newActor("client", 10_000_000n);
    const { Grounded } = await import("@sajalydv/grounded-sdk");
    const g = new Grounded({ chain: "monad-testnet", rpcUrl: RPC, publicClient: pc as never, addresses: { groundedReputation: REPUTATION, reviewerRegistry: REGISTRY } as never });
    const before = await g.score(CLAWD);

    let dialog = await open(client, "clawd");
    await hire(dialog);
    await lockedJob(dialog);
    await release(dialog);
    expect(await usdcOf(client.address)).toBe(10_000_000n - TOTAL);

    await rate(dialog);
    await dialog.getByText(/^Rated\./).waitFor({ timeout: 90_000 });
    const key = await pc.readContract({ address: REGISTRY, abi: registry, functionName: "keyOf", args: [client.address] });
    expect(BigInt(key[0])).not.toBe(0n);
    expect((await g.score(CLAWD)).reviewers).toBe(before.reviewers + 1);

    // the old RateBox bound a new passkey each time, which final binding now refuses
    dialog = await open(client, "chotu");
    await hire(dialog);
    await lockedJob(dialog);
    await release(dialog);
    await rate(dialog);
    await dialog.getByText(/^Rated\./).waitFor({ timeout: 90_000 });
    const chotu = await g.score(CHOTU);
    expect(chotu.reviewers).toBeGreaterThanOrEqual(1);
    await dialog.getByRole("button", { name: "Hire again" }).waitFor();

    // bound on chain but missing from this browser: refuse with an explanation, never bind a second one
    dialog = await open(client, "happynailong");
    await hire(dialog);
    await lockedJob(dialog);
    await release(dialog);
    await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("gigtrust.passkey.")) localStorage.removeItem(k); });
    await rate(dialog);
    await dialog.getByText("created in another browser").waitFor();
  });
});
