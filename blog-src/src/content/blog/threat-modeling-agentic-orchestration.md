---
title: "Threat modeling agentic AI orchestration: a component-by-component map"
description: "An agentic system has six trust boundaries and most teams have drawn none of them. This maps the orchestration stack node by node — planner, tool layer, memory, RAG, inter-agent messaging, agent identity — to the attacks each edge carries and the MITRE ATLAS techniques that name them."
pubDate: 2026-10-06
updatedDate: 2026-10-06
tags: ["Agentic AI", "Threat Modeling", "MITRE ATLAS", "OWASP", "MAESTRO", "AI Security"]
tldr: "Model the orchestration stack as nodes and edges, then ask which edges cross a trust boundary. Six do: untrusted content into context, planner into tool invocation, agent identity into tool authorization, memory write into memory read, agent into peer agent, and decision into execution. Every significant agentic attack is an abuse of one of those six. The model is not where the vulnerability lives."
faq:
  - q: "Which threat modeling framework should I use for agentic AI?"
    a: "They are complementary. OWASP's Agentic Security Initiative taxonomy gives seventeen threats paired with mitigations, MITRE ATLAS gives machine-readable technique IDs that integrate with existing detection engineering, and CSA's MAESTRO gives a seven-layer architectural canvas with distinct threat profiles per orchestration pattern. Classic frameworks like STRIDE still cover the conventional surface but do not decompose a system in a way that surfaces memory poisoning or inter-agent trust abuse."
  - q: "Where does excessive agency actually live in an agentic architecture?"
    a: "At the boundary between agent identity and tool authorization. The agent holds tools and privileges the requesting user cannot reach directly, so compromising the agent is a privilege escalation path by construction. The mitigation is least-privilege scoping of agent entitlements plus per-request validation that the user who submitted the prompt is authorized for the action being requested."
  - q: "Is authenticating an agent enough to authorize its requests?"
    a: "No. Authenticating the sending agent is explicitly insufficient for authorization in multi-agent orchestration. The receiving service must independently enforce the sender's permissions rather than trusting a call because it arrived from a known peer. Message signing provides integrity only, so transport encryption remains separately required."
  - q: "How does an attacker move laterally between AI agents?"
    a: "By abusing the compromised agent's pre-existing trust relationships with peer agents. No credential theft occurs, so there is nothing anomalous in identity logs — the trust was already provisioned and is being used exactly as designed. The blast radius of one compromised agent is the transitive closure of its trust graph."
  - q: "What is the single most effective control for high-impact agent actions?"
    a: "Architecturally separating decision from execution, with approval bound to the exact actor, tool call and normalized parameters, and made single-use to prevent replay. Approving 'refund order 4417 for £82.50' is a control; approving 'refund an order' is a blank cheque the model fills in later."
---

Draw your agentic system as nodes and edges. Then mark every edge that crosses a trust boundary.

Most teams have never done this, which is why most agentic threat models are a list of prompt-injection payloads. The payload is not the vulnerability. The edge it travels is.

## The reference architecture

<figure class="fig">
<div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>agentic-orchestration — trust boundaries</div>
<div class="body">
<svg viewBox="0 0 880 560" role="img" aria-label="Agentic orchestration reference architecture showing nodes, edges and six trust boundaries">
  <defs>
    <marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#3a4650"/></marker>
    <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#FF5C57"/></marker>
  </defs>
  <rect class="svg-zone" x="12" y="40" width="200" height="300" rx="5"/>
  <text class="svg-zone-label" x="22" y="58">UNTRUSTED CONTENT</text>
  <rect class="svg-node-hot" x="28" y="72" width="168" height="34" rx="4"/>
  <text class="svg-label" x="42" y="93">user message</text>
  <rect class="svg-node-hot" x="28" y="118" width="168" height="34" rx="4"/>
  <text class="svg-label" x="42" y="139">retrieved document</text>
  <rect class="svg-node-hot" x="28" y="164" width="168" height="34" rx="4"/>
  <text class="svg-label" x="42" y="185">tool response</text>
  <rect class="svg-node-hot" x="28" y="210" width="168" height="34" rx="4"/>
  <text class="svg-label" x="42" y="231">peer agent message</text>
  <rect class="svg-node-hot" x="28" y="256" width="168" height="34" rx="4"/>
  <text class="svg-label" x="42" y="277">tool definition</text>
  <text class="svg-red" x="28" y="312">all of it is instructions</text>
  <text class="svg-red" x="28" y="326">to the model</text>
  <path class="svg-edge-hot" d="M200 180 L310 180" marker-end="url(#ah)"/>
  <text class="svg-amber" x="222" y="172">B1</text>
  <rect class="svg-node" x="312" y="140" width="150" height="80" rx="5"/>
  <text class="svg-label" x="332" y="172">planner /</text>
  <text class="svg-label" x="332" y="190">reasoner</text>
  <text class="svg-label-sm" x="332" y="208">goal decomposition</text>
  <rect class="svg-node" x="312" y="268" width="150" height="46" rx="5"/>
  <text class="svg-label" x="332" y="289">memory</text>
  <text class="svg-label-sm" x="332" y="304">cross-session state</text>
  <rect class="svg-node" x="312" y="330" width="150" height="46" rx="5"/>
  <text class="svg-label" x="332" y="351">RAG / vector store</text>
  <text class="svg-label-sm" x="332" y="366">retrieval corpus</text>
  <path class="svg-edge" d="M387 268 L387 224" marker-end="url(#a)"/>
  <path class="svg-edge" d="M400 330 L400 226" marker-end="url(#a)"/>
  <text class="svg-amber" x="410" y="250">B4</text>
  <path class="svg-edge-hot" d="M462 180 L556 180" marker-end="url(#ah)"/>
  <text class="svg-amber" x="492" y="172">B2</text>
  <rect class="svg-node" x="558" y="140" width="150" height="80" rx="5"/>
  <text class="svg-label" x="578" y="168">tool /</text>
  <text class="svg-label" x="578" y="186">function layer</text>
  <text class="svg-label-sm" x="578" y="204">invocation + schema</text>
  <rect class="svg-node-hot" x="558" y="246" width="150" height="54" rx="5"/>
  <text class="svg-label" x="578" y="268">agent identity</text>
  <text class="svg-label-sm" x="578" y="285">entitlements</text>
  <path class="svg-edge-hot" d="M633 246 L633 222" marker-end="url(#ah)"/>
  <text class="svg-amber" x="643" y="238">B3</text>
  <rect class="svg-node" x="558" y="330" width="150" height="46" rx="5"/>
  <text class="svg-label" x="578" y="351">MCP / tool servers</text>
  <text class="svg-label-sm" x="578" y="366">third-party surface</text>
  <path class="svg-edge" d="M633 330 L633 302" marker-end="url(#a)"/>
  <rect class="svg-node" x="312" y="54" width="150" height="46" rx="5"/>
  <text class="svg-label" x="332" y="75">peer agents</text>
  <text class="svg-label-sm" x="332" y="90">A2A handoff</text>
  <path class="svg-edge-hot" d="M387 140 L387 102" marker-end="url(#ah)"/>
  <path class="svg-edge-hot" d="M400 102 L400 138" marker-end="url(#ah)"/>
  <text class="svg-amber" x="412" y="124">B5</text>
  <rect class="svg-zone" x="736" y="40" width="130" height="300" rx="5"/>
  <text class="svg-zone-label" x="746" y="58">PRIVILEGED</text>
  <rect class="svg-node" x="748" y="76" width="106" height="36" rx="4"/>
  <text class="svg-label" x="762" y="98">database</text>
  <rect class="svg-node" x="748" y="124" width="106" height="36" rx="4"/>
  <text class="svg-label" x="762" y="146">payments</text>
  <rect class="svg-node" x="748" y="172" width="106" height="36" rx="4"/>
  <text class="svg-label" x="762" y="194">email / send</text>
  <rect class="svg-node" x="748" y="220" width="106" height="36" rx="4"/>
  <text class="svg-label" x="762" y="242">admin API</text>
  <path class="svg-edge-hot" d="M708 180 L744 180" marker-end="url(#ah)"/>
  <rect class="svg-node-hot" x="558" y="410" width="150" height="54" rx="5"/>
  <text class="svg-label" x="578" y="432">human gate</text>
  <text class="svg-label-sm" x="578" y="449">irreversible only</text>
  <path class="svg-edge-hot" d="M633 410 L633 382" marker-end="url(#ah)"/>
  <text class="svg-amber" x="643" y="400">B6</text>
  <text class="svg-amber" x="28" y="430">TRUST BOUNDARIES</text>
  <text class="svg-label-sm" x="28" y="452">B1  untrusted content → model context</text>
  <text class="svg-label-sm" x="28" y="470">B2  planner output → tool invocation</text>
  <text class="svg-label-sm" x="28" y="488">B3  agent identity → tool authorization</text>
  <text class="svg-label-sm" x="28" y="506">B4  memory write → memory read</text>
  <text class="svg-label-sm" x="312" y="488">B5  agent → peer agent</text>
  <text class="svg-label-sm" x="312" y="506">B6  decision → execution</text>
</svg>
</div>
<figcaption><b>Six trust boundaries.</b> Red dashed edges cross one. Every significant agentic attack is an abuse of B1 through B6 — none of them are the model itself.</figcaption>
</figure>

Six boundaries. That is the whole threat model, and each one has a characteristic failure.

## Boundary by boundary

**B1 — untrusted content into model context.** Everything in the left-hand zone arrives on the same channel as your system prompt: user messages, retrieved documents, tool responses, peer agent messages, and the tool definitions themselves. The model has no structural marker separating policy from data, so *all of it is instructions*. The attacker rarely speaks to your model directly; they leave text where it will read.

**B2 — planner output into tool invocation.** The planner emits a structured call. If the tool layer executes it because it is well-formed, the planner's reasoning has become your authorization decision. Planner output is untrusted input to the tool layer, and a policy enforcement point belongs on this edge.

**B3 — agent identity into tool authorization.** This is the one that matters most and gets the least attention.

**B4 — memory write into memory read.** Memory turns a one-shot injection into persistence. Content written in one session is read as trusted context in the next, which is why memory poisoning is T1 in OWASP's taxonomy rather than a footnote under injection.

**B5 — agent into peer agent.** Authenticating the sender is not authorizing the request. More on this below.

**B6 — decision into execution.** The gap where a human approval either exists or does not.

## B3: where excessive agency actually lives

The agent holds tools and privileges the requesting user cannot reach directly. That is the point of the agent — it is more capable than the person asking.

Which means compromising the agent is a privilege escalation path *by construction*, and you built it deliberately.

<figure class="fig">
<div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>confused-deputy — B3</div>
<div class="body">
<svg viewBox="0 0 820 230" role="img" aria-label="Confused deputy: user permissions versus agent permissions at the tool authorization boundary">
  <defs><marker id="b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#FF5C57"/></marker>
  <marker id="c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#3a4650"/></marker></defs>
  <rect class="svg-node" x="20" y="60" width="130" height="54" rx="5"/>
  <text class="svg-label" x="38" y="82">user</text>
  <text class="svg-label-sm" x="38" y="99">read own orders</text>
  <path class="svg-edge" d="M150 87 L232 87" marker-end="url(#c)"/>
  <text class="svg-label-sm" x="158" y="78">asks</text>
  <rect class="svg-node-hot" x="234" y="48" width="160" height="78" rx="5"/>
  <text class="svg-label" x="252" y="74">agent</text>
  <text class="svg-label-sm" x="252" y="92">refund_order()</text>
  <text class="svg-label-sm" x="252" y="108">read_all_orders()</text>
  <path class="svg-edge-hot" d="M394 87 L486 87" marker-end="url(#b)"/>
  <text class="svg-red" x="402" y="78">acts as itself</text>
  <rect class="svg-node" x="488" y="60" width="150" height="54" rx="5"/>
  <text class="svg-label" x="506" y="82">payments API</text>
  <text class="svg-label-sm" x="506" y="99">trusts the agent</text>
  <text class="svg-red" x="234" y="156">gap = everything the agent can do</text>
  <text class="svg-red" x="234" y="172">that the user cannot</text>
  <rect class="svg-zone" x="226" y="36" width="420" height="100" rx="5"/>
  <text class="svg-zone-label" x="236" y="28">B3 — AUTHORIZATION GAP</text>
  <text class="svg-amber" x="20" y="200">FIX</text>
  <text class="svg-label-sm" x="60" y="200">scope agent entitlements to least privilege</text>
  <text class="svg-label-sm" x="60" y="216">AND validate the prompting user is authorized for this specific action</text>
</svg>
</div>
<figcaption><b>The confused deputy.</b> Scoping the agent narrowly is necessary and insufficient. If the agent can refund any order and any user can ask it to, you have built a confused deputy with good intentions.</figcaption>
</figure>

OWASP's mitigation is two-part and most implementations ship only the first half: least-privilege scoping of agent entitlements, **plus per-request validation that the prompt-submitting user is authorized for the action being requested**.

## B5: lateral movement with no credential theft

This is the attack path the agent layer uniquely creates.

<figure class="fig">
<div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>lateral-movement — B5</div>
<div class="body">
<svg viewBox="0 0 820 260" role="img" aria-label="Lateral movement across agents via pre-existing trust relationships">
  <defs><marker id="d" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#FF5C57"/></marker></defs>
  <rect class="svg-node-hot" x="24" y="90" width="140" height="56" rx="5"/>
  <text class="svg-label" x="42" y="113">triage agent</text>
  <text class="svg-red" x="42" y="131">compromised</text>
  <text class="svg-label-sm" x="24" y="166">reads untrusted email</text>
  <path class="svg-edge-hot" d="M164 118 L234 118" marker-end="url(#d)"/>
  <text class="svg-label-sm" x="170" y="109">trusted peer</text>
  <rect class="svg-node" x="236" y="90" width="140" height="56" rx="5"/>
  <text class="svg-label" x="254" y="113">enrichment agent</text>
  <text class="svg-label-sm" x="254" y="131">queries CMDB</text>
  <path class="svg-edge-hot" d="M376 118 L446 118" marker-end="url(#d)"/>
  <text class="svg-label-sm" x="382" y="109">trusted peer</text>
  <rect class="svg-node" x="448" y="90" width="140" height="56" rx="5"/>
  <text class="svg-label" x="466" y="113">response agent</text>
  <text class="svg-label-sm" x="466" y="131">isolates hosts</text>
  <path class="svg-edge-hot" d="M588 118 L658 118" marker-end="url(#d)"/>
  <rect class="svg-node" x="660" y="90" width="140" height="56" rx="5"/>
  <text class="svg-label" x="678" y="113">EDR admin API</text>
  <text class="svg-label-sm" x="678" y="131">privileged</text>
  <text class="svg-amber" x="24" y="212">NOTHING WAS STOLEN</text>
  <text class="svg-label-sm" x="24" y="232">no credential theft · no anomaly in identity logs · the trust was already provisioned</text>
  <text class="svg-label-sm" x="24" y="248">blast radius = transitive closure of the trust graph</text>
</svg>
</div>
<figcaption><b>Lateral movement across agents.</b> An attacker controlling one agent inherits its peer relationships and moves through them without stealing a credential — so there is nothing anomalous for identity monitoring to catch.</figcaption>
</figure>

Two architectural consequences:

**Authentication is not authorization.** The receiving service must independently enforce the sender's permissions rather than honouring a call because it arrived from a known peer. Message signing gives integrity only — it proves the message was not tampered with, not that the sender was allowed to ask. Transport encryption remains separately necessary.

**Draw the trust graph.** The blast radius of one compromised agent is its transitive closure. Most teams have never drawn it, and the exercise usually reveals that the agent reading untrusted content has a two-hop path to something privileged.

## The component-to-technique table

ATLAS now has an agentic technique family mapping close to one-to-one onto these components. Verified against MITRE's machine-readable dataset (`ATLAS-2026.09.yaml`):

| Component | Boundary | Attack | ATLAS |
|---|---|---|---|
| Tool / function layer | B2 | Unauthorised invocation | `AML.T0053` |
| MCP / tool servers | B2 | Tool poisoning — definition, implementation, runtime response | `AML.T0110` (`.000` `.001` `.002`) |
| Tool supply chain | B2 | Poisoned third-party tool | `AML.T0010.005`, `AML.T0115.002` |
| Memory | B4 | Context and memory poisoning | `AML.T0080` (`.000`) |
| RAG / vector store | B1 | Corpus poisoning | `AML.T0070` |
| RAG / vector store | B1 | False entry injection | `AML.T0071` |
| RAG / vector store | B1 | Credential harvesting from corpus | `AML.T0082` |
| Agent identity | B3 | Config modification | `AML.T0081` |
| Agent identity | B3 | Credentials from agent config | `AML.T0083` |
| Tool definitions | B2 | Definition tampering | `AML.T0084.001` |
| Any tool edge | B2 | Exfiltration via tool invocation | `AML.T0086` |

`AML.T0110` names Model Context Protocol connections explicitly — relevant if you are standing up MCP servers and wondering whether the risk is still theoretical.

RAG earns three distinct techniques because retrieval is now a first-class attack surface rather than a sub-case of data poisoning. Credential harvesting is the one that surprises people: a corpus accumulates whatever was indexed, indexing rarely audits for secrets, and the agent is an extremely effective search interface over exactly that material.

## B6: the control that survives everything upstream

For transfers, administrative operations and anything irreversible, separate decision from execution architecturally, with approval bound to the exact actor, tool call and **normalized parameters**, and made **single-use**.

Each clause carries weight. Separating decision from execution means the component that decides cannot act. Binding to normalized parameters means approving `refund order 4417 for £82.50`, not `refund an order` — a generic approval is a blank cheque the model fills in later. Single-use prevents replay against a second call.

This is ordinary authorization engineering. It is also the only control on the diagram that holds when every control to its left has failed.

## Which framework for which job

Four bodies of work, dividing the labour rather than competing:

- **OWASP Agentic Security Initiative** — *Agentic AI: Threats and Mitigations*, v1.1 (Dec 2025), seventeen threats T1 Memory Poisoning through T17 Supply Chain Compromise, each paired with named mitigations. Use it for threat-to-control rows.
- **MITRE ATLAS** — technique IDs. Use it so agentic threats enter the same detection-engineering pipeline as everything else instead of living in a document nobody queries.
- **CSA MAESTRO** — seven layers plus distinct threat profiles per orchestration pattern. Single-agent, multi-agent, hierarchical and distributed-ecosystem deployments differ, and most writing collapses them.
- **OWASP LLM Top 10** — shared risk vocabulary.

STRIDE, PASTA, LINDDUN and the rest still cover the conventional surface competently. They do not decompose a system in a way that surfaces B4 or B5.

## Start here

Draw the node-edge diagram for your own system. Mark B1 through B6. Attach the ATLAS IDs. Then walk OWASP's T1–T17 against it and mark which threats your architecture actually admits.

Two findings are near-universal in that exercise: agent identity is a single shared service account, and nobody has drawn the trust graph.

Both are fixable before they are incidents. Neither is an AI problem.

---

<p class="footnote"><b>Citation notes.</b> OWASP shipped a 2026 LLM Top 10 in August 2026 reordering categories — Excessive Agency to #3, Vector and Embedding Weaknesses to #9, System Prompt Leakage renamed Hidden Context Exposure — so <code>LLMxx:2025</code> numbering now reads stale. The ASI document is v1.1 with seventeen threats, not the widely quoted fifteen. <code>AML.T0104</code> no longer exists in ATLAS v6; use <code>AML.T0115.002</code>. ATLAS deep links at <code>atlas.mitre.org/techniques/&lt;ID&gt;</code> return 404 to non-browsers because the site is a JS SPA — cite the <code>atlas-data</code> YAML for durability. ATLAS itself never uses the terms "excessive agency" or "confused deputy"; those are OWASP labels, and the mapping between them here is mine — no primary-source crosswalk between ATLAS, OWASP T1–T17 and MAESTRO layers currently exists. MAESTRO is a named-author CSA article rather than a ratified standard. Domain-specific threat variation (healthcare, banking, ecommerce, platforms) is deliberately out of scope here and is the subject of separate work.</p>
