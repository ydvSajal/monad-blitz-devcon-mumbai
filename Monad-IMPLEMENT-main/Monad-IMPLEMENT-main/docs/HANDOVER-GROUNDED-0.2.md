# Handover: Grounded redeployed, SDK 0.2.0, what the app layer must change

Written 4 Nov 2026 in the Grounded repo (`C:\Users\sajal\GITHUB\MONAD10k`, github.com/ydvSajal/MONAD10K) for the session that works in **this** repo (GigTrust, `Monad-IMPLEMENT`). Read this before touching code. Everything below was checked on Monad Testnet (10143) today unless it says "not checked".

## 0. Read first: three things that are broken right now

1. **GigTrust points at retired contracts.** `contracts/script/Deploy.s.sol`, `apps/web/lib/gig.ts` (`ADDR`) and `deployments/10143.json` hold the 4 Oct Grounded addresses. Grounded was redeployed today. The old contracts still exist but have no new ratings, and `GigEscrow` `0xF3b576c7…6e72` has the **old router and reputation baked in as immutables**, so it cannot be repointed. It must be **redeployed** (section 3).
2. **The published npm SDK is stale.** `@sajalydv/grounded-sdk@0.1.0` has the old addresses as defaults and does not know the new errors. GigTrust passes addresses explicitly, so reads survive, but `rate` on a bound wallet now reverts (section 4). Version **0.2.0** is on branch `feat/sdk-onboarding` (PR #35) and is **not published**.
3. **Blitz rules.** Today's Monad Blitz Mumbai event bans existing projects. GigTrust's first commit is 8 Oct, so it **predates the event**. If it is submitted or demoed there, the README and the spoken pitch must say so (section 8). Do not describe pre-existing work as built today.

## 1. New Grounded deployment (Monad Testnet 10143, 4 Nov 2026)

Sources are verified on monadscan. Block 76889685 (Grounded), 76891053 (Grounded's own demo escrow).

| Contract | Address |
|---|---|
| ReviewerRegistry | `0x41B65e7E027FB47cF4DE964F4F82A76Bc6BC5429` |
| ReceiptRegistry | `0x2E3FD91A619b39210DC1E1Ee94bDa53bD6b1Cf2c` |
| ReceiptRouter | `0xbE9dbCc36240b358233B2019253178B02D44db54` |
| GroundedReputation | `0xCA50d5222566F313D9fb890F2bce144381445356` |
| Grounded demo `GigEscrow` (different contract from GigTrust's) | `0x5928c1a02BC3937aBe7cd5b5E39031507eC535c8` |
| ERC-8004 Identity (not ours) | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| ERC-8004 Reputation (not ours) | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| USDC | `0x534b2f3A21130d7a60830c2Df862319e593943A3` |

Explorer: `https://testnet.monadscan.com/address/<addr>#code`. Live app: https://grounded.sajal.sbs (pages `/market`, `/gigs`, `/agents`, `/playground`). rpId for passkeys: `grounded.sajal.sbs`.

The machine-readable copy is `deployments/10143.json` in the Grounded repo (force-added to git, on `main`).

## 2. Contract behaviour that changed (affects GigTrust)

- `GroundedReputation.meets(agentId, minScore, minReviewers)` now returns **false for an agent sold since its last rating** (owner differs from `lastOwnerOf`), even for an open policy `(0, 0)`. GigTrust's `accept` calls `meets` only when the bar is non-zero, so an open job still lets a sold agent in. Decide whether that is acceptable; Grounded's own escrow always calls `meets`.
- `ReviewerRegistry.bind` is **final**: one passkey per wallet, no rotation. A second `bind` reverts `AlreadyBound`. A lost passkey means rating from a new wallet.
- Nothing else in Grounded's ABI changed. Scoring, `ground`, `sweepRevoked`, receipts are as before.

## 3. Contract work in this repo (not front-end)

Redeploy GigTrust's `GigEscrow` against the new Grounded set:
1. In `contracts/script/Deploy.s.sol` replace the router `0xab442c3c…c62e` with `0xbE9dbCc36240b358233B2019253178B02D44db54` and the reputation `0xaDDd1f2F…bF82` with `0xCA50d5222566F313D9fb890F2bce144381445356`. USDC and Identity stay.
2. Update `ADDR` in `apps/web/lib/gig.ts` and `deployments/10143.json` (router, grounded, receipts `0x2E3FD91A…Cf2c`, reviewers `0x41B65e7E…5429`) and `NEXT_PUBLIC_GIG_ESCROW` after the deploy.
3. Run the existing 63 forge tests and the fork tests (`forge test -n monad` with `MONAD_FORK_RPC`); the tests that deploy Grounded locally need no change, only fork tests that name addresses.
4. **The user runs the deploy** (Foundry keystore `grounded-deployer` in WSL, password theirs). Costs about 0.3 MON. In WSL, if DNS fails with `dns error`, retry; the resolver is flaky.
5. Verify on monadscan (`forge verify-contract --chain 10143 --verifier etherscan --etherscan-api-key $KEY --guess-constructor-args --rpc-url https://testnet-rpc.monad.xyz`; needs `--rpc-url`).

If the app is only a **character shop** (direct "buy this agent"), you may skip this and use Grounded's already-deployed `GigEscrow` `0x5928c1a0…35c8` instead (`hire(agentId, amount, minScore, minReviewers, deadline)`, `release`, `refund`). It has no accept, deliver or dispute step, so it fits an instant purchase, not a job board. See section 6.

## 4. SDK 0.2.0

Branch `feat/sdk-onboarding` (PR #35), package `@sajalydv/grounded-sdk`. Typecheck, build and 30 offline tests pass. The new methods were run live on testnet.

New methods on `Grounded` (all need `walletClient` except reads):
- `hasPasskey(address?): Promise<boolean>`: is a passkey bound. Read-only when given an address.
- `registerAgent({ agentURI }): Promise<{ agentId, txHash }>`: registers an ERC-8004 agent owned by the connected wallet. **Checked live (agent 2578): on this registry the payout wallet defaults to the owner.** Older registrations returned null, so read `payoutWallet(agentId)` after.
- `setPayoutWallet({ agentId, payout })`: `payout` is an account that can `signTypedData` (the registry needs the payout wallet's own consent, valid 2 minutes). The owner sends the tx. Pass the owner's own account to pay the owner.
- `agentURI(agentId): Promise<string | null>`: the registered profile URI (`tokenURI`).
- `bindPasskey` now throws `PasskeyAlreadyBoundError` before sending.
- Defaults (`knownAddresses`) already point at the new deployment. Identity ABI gained `register`, `setAgentWallet`, `tokenURI`, `Registered`.

Unchanged and still the main surface: `score`, `check`, `assertTrusted`, `payoutWallet`, `pay`, `rate`, `groundFeedback`, `withTrust`, `BrowserPasskey`, `SoftwareAuthenticator`.

**Use this (npm publish is blocked, the owner could not publish):** a packed copy of 0.2.0 is already in this repo at `apps/web/vendor/sajalydv-grounded-sdk-0.2.0.tgz` (42 kB, built from Grounded `main`, commit `86e1f7d`). It installs on Vercel too, because it is just a file in the repo.
1. In `apps/web/package.json` set `"@sajalydv/grounded-sdk": "file:vendor/sajalydv-grounded-sdk-0.2.0.tgz"`.
2. Run `pnpm install` in `apps/web`, then `pnpm typecheck`.
3. Commit the `.tgz` by explicit path (`git add apps/web/vendor/sajalydv-grounded-sdk-0.2.0.tgz apps/web/package.json apps/web/pnpm-lock.yaml`).
4. The source of truth is `C:\Users\sajal\GITHUB\MONAD10k\packages\sdk` (branch `main`). To repack after an SDK change: `pnpm --filter @sajalydv/grounded-sdk build`, then in `packages/sdk` run `npm pack --pack-destination <path to apps/web/vendor>`, and update the filename in `package.json`.
If `pnpm install` complains about the lockfile after changing the dependency, run `pnpm install --no-frozen-lockfile` once.

Other ways (older notes):
- **Until published:** build it and link. In the Grounded repo run `pnpm --filter @sajalydv/grounded-sdk build`, then in `apps/web` set `"@sajalydv/grounded-sdk": "link:../../../MONAD10k/packages/sdk"`. This breaks Vercel (no sibling checkout). Note the viem types then differ nominally; cast `as never` at the boundary, as `lib/grounded.ts` already does.
- **Real fix:** the user runs `npm publish` for 0.2.0 from `packages/sdk` in a real PowerShell (npm 2FA is a browser approval, so `--otp` and the `!` prompt prefix do not work). Then depend on `^0.2.0`. Merge PR #35 first or publish from the branch.

## 5. What `RateBox` must change

`app/jobs/[id]/RateBox.tsx` currently creates a **new** passkey on every rating and binds it. With final binding this breaks on the second rating by the same wallet. New flow:
1. `if (!(await g.hasPasskey()))`: create a `BrowserPasskey` and bind; save it with `JSON.stringify(created)` in `localStorage`, restore with `BrowserPasskey.restore(JSON.parse(...))`.
2. If `hasPasskey()` is true but there is no saved passkey on this browser, the user cannot rate from this wallet. Say so and tell them to use a new wallet. Never create and bind a second one.
3. Always check the chain (`hasPasskey`) over local storage: storage can hold a passkey from the old, retired registry. Grounded's `/gigs` page does exactly this; copy `apps/web/app/(explorer)/gigs/Gigs.tsx` in the Grounded repo.

**Domain limit:** the registry only accepts passkeys for rpId `grounded.sajal.sbs` or a subdomain of it. In-app rating works only when the page is served from `*.grounded.sajal.sbs` (for example `gigs.grounded.sajal.sbs`: one DNS record at Hostinger plus the domain added in Vercel). On `*.vercel.app` the UI must show the receipt id and link to https://grounded.sajal.sbs/agents/<id>. This also fixes MetaMask flagging vercel.app.

## 6. What "agents that can be bought" needs beyond the front end

The animated characters, cards and pages are front-end. These are not, and need doing for the demo to work:

1. **Real agent identities with saved keys.** An agent is an ERC-8004 id with an owner wallet and a payout wallet. Register each with `registerAgent` and keep each owner key in a gitignored file or server env. Grounded's seed agents (2575 score 90, 2576 grounded 20 / raw 87, 2577 score 60; 2118 and 2120 unrated, shown "New") were registered by a script whose keys were **not saved**. They can be hired and paid, but they can never act. That is enough for the direct-hire shop; it is **not enough for GigTrust**, whose `accept` and `deliver` need the agent's operator to sign.
2. **If a character should "do the job" (accept, deliver) by itself:** a **server-side worker**, such as a Next.js route handler or cron that holds the demo agents' keys (testnet-only, in env) and calls `accept` and `deliver` when a job names them. This is a small backend, not front-end. If a purchase is just hire, release and rate, skip it.
3. **Profile data off-chain.** Name, skill, price, character art live in a JSON file or Postgres keyed by `agentId`, with images in `public/`. The chain stores only the id and a URI. Grounded's `/market` does this with `apps/web/content/market.json`.
4. **A faucet** so visitors can buy: `apps/web/app/api/drip/route.ts` in the Grounded repo sends MON and USDC from `DRIP_PRIVATE_KEY`, limited to one drip per address and 5 per IP per day, in-memory limiter (resets per serverless instance). Copy it, fund a testnet-only wallet (about 0.3 MON and 1 USDC per visitor), set `DRIP_PRIVATE_KEY`, `DRIP_MON_AMOUNT`, `DRIP_USDC_AMOUNT` in Vercel. A full buy-release-rate flow costs about 0.15 to 0.2 MON in gas, because Monad bills the gas limit. Do not paste keys in chat; the user sets them with `vercel env add`.
5. **Env and DB for GigTrust:** `SESSION_SECRET` (missing means hosted sign-in returns 500), `DATABASE_URL` (Postgres, schema `apps/web/db/schema.sql`).
6. **Scores are real or "New".** Do not add a way to type a score in. A new agent shows "New" (the contract reads 0 and refuses any bar above 0). Seeded ratings come from demo wallets, not customers. Label them as such, as Grounded's `/market` does.

Recommendation: ship the **character shop on Grounded's existing `GigEscrow`** (live, verified, no redeploy, direct hire fits "buy a character"), and keep the GigTrust job board as the second surface only if the redeploy in section 3 gets done.

## 7. Gotchas learned today

- Monad bills the gas **limit**: use `estimateGas × 1.15` for every write (the SDK does).
- A freshly funded wallet reverts "Signer had insufficient balance" for about 4 blocks (lagged balance check). Wait.
- Python's `urllib` gets 403 from the public RPC; use `curl` or viem.
- Windows Git Bash turns `/path` arguments into `C:/Program Files/Git/path`; use `MSYS_NO_PATHCONV=1`.
- Next 16: `params` and `searchParams` are Promises; read the guide in `node_modules/next/dist/docs/` before writing routes.
- `deployments/*.json` is gitignored in Grounded; the real deploy file is force-added.
- Add files to git by explicit path. Never commit `.env`. A wallet private key was once pasted into `.gitignore` by mistake: check `git diff` before any commit.

## 8. Disclosure to put in this repo's README if it is entered at Blitz

> GigTrust and Grounded were built before this event: Grounded at github.com/ydvSajal/MONAD10K (first commit 17 Sep 2026), GigTrust in this repo (first commit 8 Oct 2026). Built on 4 Nov 2026, the event day: <list exactly what was written today, for example the character shop UI, the demo agents, the redeploy against the new Grounded contracts>.

List only what is true. If a feature is not working end to end on testnet, do not claim it.

## 9. Order of work (suggested)

1. User publishes SDK 0.2.0 (or link it locally).
2. Redeploy GigTrust `GigEscrow` against the new Grounded (section 3) if the job board is in scope.
3. Register demo agents with `registerAgent` and save their keys; create profile JSON and character art.
4. Build the shop and onboarding pages: freelancer onboarding calls `registerAgent` then, if `payoutWallet` is null, `setPayoutWallet`.
5. Fix `RateBox` (section 5), add the faucet route, set env on Vercel.
6. Run the whole flow once in a real browser on testnet: faucet, buy, release, bind passkey, rate, score changes on `https://grounded.sajal.sbs/agents/<id>`.
