---
title: "Threat modeling agentic AI orchestration: a component-by-component map"
description: "Four frameworks now cover agentic AI threat modeling and they divide the work cleanly. This maps each orchestration component — planner, tool layer, memory, RAG, inter-agent messaging, agent identity — to the attacks it enables and the MITRE ATLAS techniques that name them."
pubDate: 2026-10-06
tags: ["Agentic AI", "Threat Modeling", "MITRE ATLAS", "OWASP", "MAESTRO", "AI Security"]
tldr: "Decompose the orchestration stack into its recurring components, then attach a named threat taxonomy to each. OWASP's Agentic Security Initiative supplies 17 threats paired with mitigations, MITRE ATLAS supplies machine-readable technique IDs that now cover agentic components directly, and CSA's MAESTRO supplies a seven-layer canvas with distinct threat profiles per orchestration pattern. The highest-value finding is that the agent-identity to tool-authorization boundary is where excessive agency and confused deputy actually live — not in the model."
faq:
  - q: "Which threat modeling framework should I use for agentic AI?"
    a: "They are complementary rather than competing. Use OWASP's Agentic Security Initiative taxonomy for threat-to-mitigation rows, MITRE ATLAS for machine-readable technique IDs that integrate with existing detection engineering, and CSA's MAESTRO for the architectural canvas and per-pattern threat profiles. Classic frameworks like STRIDE remain useful for the non-AI parts of the system but are documented as insufficient on their own for agentic components."
  - q: "Is STRIDE still useful for agentic AI systems?"
    a: "For the conventional attack surface — network, infrastructure, APIs, data stores — yes. For the agentic components it does not decompose the system in a way that surfaces memory poisoning, tool poisoning or inter-agent trust abuse, which is the stated rationale for the agentic-specific frameworks. Treat it as a complement, not a replacement."
  - q: "Where does excessive agency actually live in an agentic architecture?"
    a: "At the boundary between agent identity and tool authorization. The agent holds tools and privileges the requesting user cannot reach directly, so compromising the agent becomes a privilege escalation path. The mitigation is least-privilege scoping of agent entitlements plus per-request validation that the user who submitted the prompt is authorized for the action being requested."
  - q: "Is authenticating an agent enough to authorize its requests?"
    a: "No. In multi-agent orchestration, authenticating the sending agent is explicitly insufficient for authorization — the receiving service must independently enforce the sender's permissions rather than trusting the call because it came from a known peer. Message signing provides integrity only, so transport encryption is still required."
---

Most agentic AI security writing operates at the level of the model. Jailbreaks, injection payloads, guardrail bypasses.

That framing struggles the moment you have to actually threat model a system, because the question a threat model answers is not *can the model be manipulated* — assume yes — but *which component, when it fails, produces which consequence*.

The useful shift is to stop treating "the agent" as the unit of analysis and decompose the orchestration stack into its recurring parts: planner and reasoner, tool and function-calling layer, memory, retrieval and vector stores, inter-agent messaging, MCP and tool servers, agent identity, human gates, observability. Then attach a named threat taxonomy to each part.

Four bodies of work now make that possible, and they divide the labour cleanly rather than competing.

## The four frameworks and what each is for

**OWASP's Agentic Security Initiative** publishes *Agentic AI — Threats and Mitigations*, at **v1.1 (December 2025)**, carrying **seventeen threats** from T1 Memory Poisoning through T17 Supply Chain Compromise. Each is a row pairing a threat with named mitigations — T1's mitigation column, for instance, lists memory content validation, session isolation, authentication for memory access, anomaly detection, memory sanitization, and AI-generated memory snapshots for forensics and rollback. The document names agent memory and tool integration as the two key attack vectors that agentic architecture newly introduces.

A note worth carrying: the widely circulated "15 threats" figure is stale. v1.1 added T16 and T17. Cite the version.

**MITRE ATLAS** supplies the technique IDs. This matters more than it sounds, because IDs are what let agentic threats enter the same detection-engineering pipeline as everything else rather than living in a separate document nobody queries.

**CSA's MAESTRO** — Multi-Agent Environment, Security, Threat, Risk and Outcome — supplies the architectural canvas: seven layers (Foundation Models, Data Operations, Agent Frameworks, Deployment and Infrastructure, Evaluation and Observability, Security and Compliance as a vertical cutting across all, and Agent Ecosystem), plus distinct threat profiles per orchestration pattern. That last part is the genuinely useful bit: single-agent, multi-agent, hierarchical and distributed-ecosystem deployments have different threat profiles, and most writing collapses them.

**OWASP's LLM Top 10** supplies the shared risk vocabulary. If you are citing it, use current numbering — OWASP shipped a 2026 revision in August 2026 that reorders the list. Excessive Agency rises to #3, Vector and Embedding Weaknesses moves to #9, and System Prompt Leakage is renamed Hidden Context Exposure. Any `LLMxx:2025` reference now reads as stale.

Classic frameworks — STRIDE, PASTA, LINDDUN, OCTAVE, Trike, VAST — are documented as insufficient on their own here. Not useless: they still cover the conventional surface competently. They just do not decompose a system in a way that surfaces memory poisoning or inter-agent trust abuse.

## Component to technique

ATLAS now has an agentic technique family that maps close to one-to-one onto orchestration components. Verified against MITRE's machine-readable dataset (`dist/v6/ATLAS-2026.09.yaml`, collection version 2026.09):

| Component | ATLAS technique |
|---|---|
| Tool / function calling | `AML.T0053` AI Agent Tool Invocation |
| MCP and tool servers | `AML.T0110` AI Agent Tool Poisoning — sub-techniques `.000` Definition and Instructions, `.001` Implementation, `.002` Runtime Response |
| Tool supply chain | `AML.T0010.005` AI Agent Tool; `AML.T0115.002` Publish Poisoned AI Artifacts: AI Agent Tools |
| Memory | `AML.T0080` AI Agent Context Poisoning, sub-technique `.000` Memory |
| RAG / retrieval | `AML.T0070` RAG Poisoning, `AML.T0071` False RAG Entry Injection, `AML.T0082` RAG Credential Harvesting |
| Agent identity and configuration | `AML.T0081` Modify AI Agent Configuration, `AML.T0083` Credentials from AI Agent Configuration, `AML.T0084.001` Tool Definitions |
| Exfiltration path | `AML.T0086` Exfiltration via AI Agent Tool Invocation |

`AML.T0110`'s description names Model Context Protocol connections explicitly, which is worth knowing if you are standing up MCP servers and wondering whether the risk is theoretical yet.

Two citation warnings, both of which cost me time. `AML.T0104` "Publish Poisoned AI Agent Tool" **no longer exists** in ATLAS v6 — it appears in older write-ups and in a lot of secondary commentary. Use `AML.T0115.002`. And `atlas.mitre.org/techniques/<ID>` deep links return 404 to anything that is not a browser, because the site is now a JavaScript SPA; cite the `atlas-data` YAML if you need something durable.

One framing point: **ATLAS never uses the phrases "excessive agency" or "confused deputy."** Those are OWASP labels. What follows is my mapping of OWASP's vocabulary onto ATLAS mechanisms, not an official crosswalk — no primary-source crosswalk between ATLAS techniques, OWASP's T1–T17 and MAESTRO layers currently exists, which is a real gap in the ecosystem.

## The boundary that actually matters

If you take one structural idea from this, take this one: **excessive agency and the confused deputy problem are located at the agent-identity to tool-authorization boundary.**

Not in the model. Not in the prompt. In the gap between what the agent is permitted to do and what the user who prompted it is permitted to do.

The agent holds tools and privileges the requesting user cannot reach directly. That is the entire point of the agent — it is more capable than the person asking. Which means compromising the agent is a privilege escalation path by construction, and it is one you built deliberately.

OWASP's prescribed mitigation is two-part, and most implementations do only the first half: least-privilege scoping of agent entitlements, **plus per-request validation that the prompt-submitting user is authorized for the action being requested.** Scoping the agent narrowly is necessary and insufficient. If the agent is scoped to "can refund orders" and any user can ask it to refund any order, you have built a confused deputy with good intentions.

## RAG is its own attack surface now

Worth stating plainly because the framing has shifted: retrieval and vector stores are treated as a first-class attack surface in their own right, not as a sub-case of data poisoning. ATLAS gives them three distinct techniques — poisoning, false entry injection, and credential harvesting.

Credential harvesting is the one that surprises people. A retrieval corpus accumulates whatever was indexed, and what was indexed usually includes documents nobody audited for secrets. The agent is an extremely effective search interface over exactly that material.

## Multi-agent trust is the part that is genuinely new

Two findings here that change architecture rather than just adding a control.

**Authentication is not authorization, and the receiver must enforce.** In multi-agent orchestration, authenticating the sending agent is explicitly insufficient. The receiving service has to independently enforce the sender's permissions rather than honouring the call because it arrived from a known peer. Message signing gives you integrity only — it says the message was not tampered with, not that the sender was allowed to ask. Transport encryption remains separately necessary.

**Compromising one agent yields lateral movement with no credential theft.** This is the attack path the agent layer uniquely creates. An attacker who controls one agent inherits its pre-existing trust relationships with peer agents and moves through them without stealing a single credential. There is nothing to detect in your identity logs, because nothing was stolen — the trust was already provisioned, and it is being used as designed.

That is worth sitting with if you run a hierarchical or distributed-ecosystem pattern. The blast radius of one compromised agent is the transitive closure of its trust relationships, and most teams have never drawn that graph.

I would treat this as a mechanism description rather than a measured prevalence — it comes from a CSA research note with one documented incident class behind it, not a survey.

## The control that holds for high-impact actions

For financial transfers, administrative operations and anything irreversible, OWASP prescribes **architecturally separating decision from execution**, with approval bound to the exact actor, tool call and normalized parameters, and **single-use to prevent replay**.

Each clause is load-bearing. Separating decision from execution means the component that decides cannot also act. Binding to normalized parameters means approving "refund order 4417 for £82.50" rather than "refund an order" — a generic approval is a blank cheque the model can fill in later. Single-use means an approval cannot be replayed against a second call.

This is the control that survives when everything upstream fails, and it is ordinary authorization engineering rather than anything AI-specific.

## What this post deliberately does not cover

I set out to cover domain-specific threat variation too — healthcare and PHI handling, transaction authorization in banking, payment and order manipulation in ecommerce, recommendation and moderation integrity in social media.

The research did not support it. Across the sources surveyed, **no primary-source claims on domain-specific agentic threat variation or regulatory constraint survived verification.** There is a great deal of secondary commentary asserting that HIPAA or PSD2 changes your agentic threat model, and very little primary material establishing *how*.

I would rather say that than write a confident-sounding section with nothing underneath it. The domain layer is a genuine gap in the published literature right now, not just a gap in my reading, and it is where the next useful work is.

A second caveat on what you have just read: MAESTRO is a named-author CSA article, not a ratified standard, and at least one critic argues its layering is not novel. Use it as a decomposition aid, not as an authority to cite in a risk acceptance.

## Where to start

If you are threat modeling an agentic system this week: draw the component diagram first, attach ATLAS technique IDs to each component from the table above, then walk OWASP's T1–T17 against it and mark which threats your architecture actually admits. Most teams discover two things in that exercise — that their agent identity model is a single shared service account, and that nobody has drawn the inter-agent trust graph.

Both are fixable before they are incidents. Neither is an AI problem.
