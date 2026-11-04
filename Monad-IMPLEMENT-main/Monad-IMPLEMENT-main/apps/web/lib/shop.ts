import { parseAbi, type Address } from "viem";

/**
 * Grounded's verified direct-hire escrow on Monad Testnet (no owner, no arbiter). The character shop uses this one
 * and the job board uses GigTrust's own GigEscrow, because a purchase has no accept, deliver or dispute step.
 */
export const SHOP_ESCROW = "0x5928c1a02BC3937aBe7cd5b5E39031507eC535c8" as Address;
export const EXPLORER = "https://testnet.monadscan.com";

/** 0.10 USDC per hire. The escrow adds a 5% fee on top. */
export const PRICE = 100_000n;
/** Enough gas for hire, release and rate: Monad bills the gas limit, so the whole flow costs about 0.15 to 0.2 MON. */
export const MIN_MON = 150_000_000_000_000_000n;

export const JOB_HIRED = 1;
export const JOB_RELEASED = 2;

export const shopAbi = parseAbi([
  "function hire(uint256 agentId, uint96 amount, uint8 minScore, uint32 minReviewers, uint40 deadline) returns (uint256 jobId)",
  "function release(uint256 jobId, uint256 validAfter, uint256 validBefore, bytes32 salt, bytes signature) returns (uint256 receiptId)",
  "function refund(uint256 jobId)",
  "function feeOf(uint96 amount) pure returns (uint96)",
  "function jobs(uint256 jobId) view returns (address client, uint96 amount, uint256 agentId, uint40 deadline, uint8 status)",
  "event JobHired(uint256 indexed jobId, address indexed client, uint256 indexed agentId, uint96 amount, uint96 fee, uint40 deadline)",
  "event JobReleased(uint256 indexed jobId, uint256 indexed receiptId)",
  "event JobRefunded(uint256 indexed jobId)",
  "error AgentNotTrusted(uint256 agentId)",
  "error NoAgentWallet(uint256 agentId)",
  "error AmountBelowMinimum(uint96 amount)",
  "error BadDeadline(uint40 deadline)",
  "error BadStatus(uint8 status)",
  "error NotClient(address caller)",
  "error TooEarly(uint40 deadline)",
]);
