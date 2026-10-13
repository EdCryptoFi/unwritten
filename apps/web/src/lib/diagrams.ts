/**
 * The architecture, as mermaid. Rendered on /judge and pasted verbatim into the README, where
 * GitHub draws it natively.
 *
 * Every edge was checked against the route that makes the call — not against the plan. The plan
 * once said the Data API read the wallet; it does not cover Sui, and this diagram must not repeat
 * a claim the code denies.
 */
export const ARCHITECTURE = `flowchart TB
  subgraph BR["Browser"]
    UI["Screens<br/>Agreement · Reality · Try · Proof"]
    DER["policy.deriveAll<br/>re-run live on /proof"]
  end
  subgraph VC["Vercel · Next.js API routes"]
    H["/api/house"]
    C["/api/chain"]
    S["/api/sandbox"]
    K["/api/checkpoint"]
    REC["reconcile<br/>day + recipient, never amount"]
  end
  subgraph WM["Walrus Memory"]
    RL["MemWal relayer<br/>delegate key · Seal-encrypted"]
    WB[("Walrus Mainnet<br/>append-only blobs")]
    AG["Public aggregator"]
  end
  subgraph TT["Tatum"]
    GW["sui-mainnet.gateway.tatum.io"]
  end
  SUI[("Sui Mainnet<br/>house wallet")]
  GH["GitHub Actions · daily<br/>scripts/spend.mts"]

  UI --> H
  UI --> C
  UI --> S
  UI --> K
  H -->|"recall · listNamespaces"| RL
  S -->|"validate → budget → remember"| RL
  C -->|"recall decisions"| RL
  C -->|"suix_queryTransactionBlocks · suix_getAllBalances"| GW
  C --> REC
  K -->|"sui_getLatestCheckpointSequenceNumber"| GW
  RL --> WB
  WB --> AG
  UI -.->|"blob ids on /proof resolve here"| AG
  GW --> SUI
  GH -->|"signAndExecuteTransaction"| GW
  GH -->|"writeDecision"| RL
  DER -.-> UI`;

export const RECONCILE = `sequenceDiagram
  autonumber
  participant B as Browser
  participant A as Vercel /api/chain
  participant T as Tatum gateway
  participant S as Sui Mainnet
  participant M as MemWal relayer
  participant W as Walrus Mainnet
  B->>A: open Reality check
  A->>T: suix_queryTransactionBlocks · house wallet
  T->>S: read
  S-->>T: outgoing transfers
  T-->>A: transfers · paginated, retried on 503
  A->>T: suix_getAllBalances
  T-->>A: balance → low-balance nudge
  A->>M: recall decisions
  M->>W: fetch blobs
  W-->>M: Seal-encrypted payloads
  M-->>A: decisions, decrypted for our delegate
  A->>A: reconcile · match by day + recipient
  A-->>B: rows · approvalId null = spend nobody agreed to
  Note over B,W: An unmatched row exists in neither source alone — that is the integration`;

export const WRITE_PATH = `sequenceDiagram
  autonumber
  participant G as GitHub Actions · daily
  participant T as Tatum gateway
  participant S as Sui Mainnet
  participant M as MemWal relayer
  participant W as Walrus Mainnet
  G->>T: has today already been sent? suix_queryTransactionBlocks
  T-->>G: count of today's transfers
  alt already sent
    G->>G: exit — the chain is the idempotence guard
  else not yet
    G->>T: signAndExecuteTransaction · house key
    T->>S: transfer
    S-->>T: digest
    T-->>G: confirmed
    opt the household agreed to it
      G->>M: writeDecision · only after the transfer confirms
      M->>W: append blob
    end
    Note over G,W: ~1 in 5 has no decision on purpose — Reality check is meant to find it
  end`;
