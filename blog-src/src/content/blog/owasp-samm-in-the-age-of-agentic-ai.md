---
title: "OWASP SAMM in the age of agentic AI: an old maturity model meets a new principal"
description: "SAMM measures how mature your software assurance is across fifteen practices. Agentic AI does not need a new maturity model — it needs you to re-answer SAMM's existing questions for a principal that is non-deterministic, persuadable, and holds its own credentials. This walks all five SAMM business functions and shows what each practice looks like when the software writes its own next action."
pubDate: 2026-10-17
tags: ["Agentic AI", "OWASP SAMM", "Maturity Model", "AppSec", "Governance", "AI Security", "Secure SDLC"]
tldr: "OWASP SAMM's five business functions — Governance, Design, Implementation, Verification, Operations — still map cleanly onto agentic systems. You do not throw SAMM out; you re-score it against a new kind of component. The agent is software that chooses its own actions at runtime, authenticates as itself, and can be argued into decisions, so every SAMM practice gains an agentic question: who owns the agent's privileges, is excessive agency in the threat model, does testing cover tool-call authorisation and prompt injection, and does incident response know how to revoke one agent's identity without killing the fleet."
faq:
  - q: "What is OWASP SAMM?"
    a: "The Software Assurance Maturity Model is an OWASP framework for measuring and improving an organisation's software security posture. SAMM v2 organises assurance into five business functions — Governance, Design, Implementation, Verification and Operations — each containing three security practices, for fifteen practices total. Every practice has two activity streams and three maturity levels, so a team self-assesses where it is and plans where to go next."
  - q: "Does agentic AI need a new maturity model, or does SAMM still apply?"
    a: "SAMM still applies. Agentic AI does not introduce a new assurance function; it introduces a new kind of software component — one that selects its own actions at runtime, holds its own identity, and can be manipulated through its inputs. The right move is to re-answer each existing SAMM practice for that component rather than invent a parallel model, then supplement with AI-specific references like the OWASP LLM Top 10, MITRE ATLAS and the Agentic Security Initiative taxonomy where SAMM is deliberately technology-neutral."
  - q: "Which SAMM practice changes most with agentic AI?"
    a: "Threat Assessment, in the Design function. A classic threat model decomposes a system into components and data flows; an agentic system adds trust boundaries that STRIDE does not naturally surface — untrusted content into model context, planner into tool invocation, agent identity into tool authorisation, and agent into peer agent. Security Architecture changes nearly as much, because least-privilege scoping of a persuadable principal becomes a first-class architectural requirement."
  - q: "How does SAMM's Verification function apply to AI agents?"
    a: "Requirements-driven testing and security testing both gain agentic cases. You test that tool-call authorisation is enforced outside the model, that an untrusted-input agent genuinely cannot write, that inter-agent calls re-authorise, and that human-approval gates bind to exact parameters. Prompt-injection and excessive-agency testing join your existing security testing stream rather than replacing it, and red-teaming maps to MITRE ATLAS technique IDs for continuity with detection engineering."
  - q: "What does SAMM Operations look like for an agent fleet?"
    a: "Incident Management must be able to revoke a single agent's identity and bound the blast radius without taking down the fleet, which presupposes one identity per agent. Environment Management covers the model endpoints, vector stores and tool gateways as first-class assets with their own hardening. Operational Management adds lifecycle control for prompts, policies and model versions, so a policy or prompt change is tracked, reviewable and reversible like any other production change."
---

Every time a new technology arrives, someone proposes a new maturity model for it. Most of the time they are wrong, and SAMM is the reason. The [Software Assurance Maturity Model](https://owaspsamm.org/) has survived microservices, cloud, DevOps and serverless not by being rewritten each time but because its questions are about *assurance*, not about any particular runtime. Agentic AI is the same story. You do not need a new model. You need to re-answer SAMM's fifteen practices for a component that behaves unlike anything SAMM was first written against.

What is actually new about the agent, in assurance terms, is narrow and specific:

- It **chooses its own next action at runtime**, so you cannot enumerate its behaviour ahead of time the way you can a REST endpoint.
- It **holds its own identity and privileges**, so it is a principal in your authorisation model, not just code running as a user.
- It can be **argued out of its instructions**, so its inputs are an attack surface in a way ordinary function arguments are not.

Hold those three facts in mind and walk SAMM's five business functions. Each practice gains a question it did not have before.

## Governance

**Strategy & Metrics.** Your security strategy now has to name agents as assets with their own risk profile. The metric that matters is not "how many agents do we run" but "for how many can we state the complete set of tools and privileges they hold." *Use case:* a quarterly review where every production agent has a current, diffable entitlement manifest; the KPI is coverage, and it starts lower than anyone expects.

**Policy & Compliance.** Write the standard before the fleet grows. One identity per agent; untrusted-input agents are read-only; irreversible tools require human approval bound to exact parameters. *Example:* a one-page agent security policy that a new agent's design review is checked against, so the rules apply at creation time rather than after an incident. Map it to the OWASP LLM Top 10 and ISO 42001 where you need external framing.

**Education & Guidance.** The new failure mode your developers have not internalised is that the prompt is not a security boundary. *Use case:* a short internal guide and a worked example — "here is a tool that does too much, here is the scoped version" — because [the dangerous grant always looks convenient, not reckless](/blog/excessive-agency-is-an-authorisation-bug/).

## Design

This is where agentic AI stresses SAMM hardest.

**Threat Assessment.** A classic threat model decomposes a system into components and data flows. An agentic system adds trust boundaries that STRIDE does not naturally surface: untrusted content entering model context, the planner invoking tools, agent identity authorising those tools, and one agent calling another. I have written a full [component-by-component threat model for agentic orchestration](/blog/threat-modeling-agentic-orchestration/) — the short version is that there are six boundary-crossing edges and most teams have drawn none of them. *Use case:* a per-agent threat model mapped to MITRE ATLAS technique IDs, refreshed whenever a tool gains a parameter, so scope drift is caught in review.

**Security Requirements.** Requirements gain agentic clauses: this agent's maximum capability set, which actions are irreversible, which inputs are untrusted, and what "re-authorise at every hop" means concretely for this workflow. *Example:* "the triage agent may read tickets and post internal comments; it may not transition, assign, or delete; a write to any other system requires a separate agent and a human gate." That is a security requirement, not a product nicety.

**Security Architecture.** Least privilege for a persuadable principal becomes a first-class architectural decision, and the headline pattern is separating the policy decision from the agent that enforces nothing on itself. *Use case:* an external policy decision point — [Open Policy Agent in front of every tool call](/blog/open-policy-agent-for-agentic-system-design/) — so authorisation lives in versioned policy the model cannot influence, and decision/execution separation is designed in rather than bolted on.

## Implementation

**Secure Build.** Your dependency and supply-chain posture now includes model artefacts and the glue around them. A model file is not inert data — it can be [a code-execution primitive](/blog/your-model-file-is-a-code-execution-primitive/). *Example:* model-file scanning in the build pipeline, pinned and provenance-checked model versions, and the same scrutiny for agent framework dependencies you would give any other third-party code.

**Secure Deployment.** Secrets management gets sharper because each agent should carry its own scoped credential, not share a service account. *Use case:* deployment that provisions a distinct identity per agent with least-privilege entitlements, and refuses to ship an agent whose credential is broader than its threat model allows.

**Defect Management.** Agentic defects include a new class: excessive-agency findings and prompt-injection exposures. Triage them like any other defect, with severity set by *what the agent could reach*, not by how clever the manipulation was. *Example:* a defect taxonomy that has rows for "tool scope wider than task" and "untrusted input reachable by a write-capable principal," so these get tracked instead of waved off as "model behaviour."

## Verification

**Architecture Assessment.** Review the trust boundaries you drew in Design against what was actually built. *Use case:* confirm the untrusted-input agent is genuinely read-only in production, that inter-agent calls re-authorise against the origin user, and that the policy decision point is actually in the call path — not a diagram that the runtime ignores.

**Requirements-driven Testing.** Turn each security requirement into a test. *Example:* assert that `triage-agent` calling `delete_issue` is denied by policy; assert that a high-impact tool with no approval record is refused; assert that an approval bound to one parameter set cannot be replayed on another. These are ordinary authorisation tests pointed at a new principal.

**Security Testing.** Prompt-injection and excessive-agency testing join your existing stream rather than replacing it, and agentic red-teaming maps cleanly onto MITRE ATLAS for continuity with detection engineering. *Use case:* a red-team pass that assumes total control of one agent's beliefs and measures reachable impact — the single most productive agentic test you can run, and one that tends to beat another month of prompt hardening.

## Operations

**Incident Management.** The question SAMM has always asked — can you contain and recover — gets a specific agentic form: can you revoke *one* agent's identity and bound the blast radius without killing the fleet? That is only possible if each agent had its own identity to begin with, which is why the one-identity-per-agent decision in Design pays off here. *Use case:* a runbook for "agent N is compromised" whose first step is a single credential revocation, and whose blast-radius estimate is the transitive closure of that agent's trust graph — known in advance, not discovered live.

**Environment Management.** The model endpoints, vector stores, tool gateways and MCP servers are production assets with their own hardening and patch cadence. *Example:* the vector store is in your asset inventory with access controls and monitoring, because RAG poisoning and memory-write abuse are environment problems, not model problems.

**Operational Management.** Prompts, policies and model versions are production configuration and deserve lifecycle control. *Use case:* a prompt or an OPA policy change goes through the same review, versioning and rollback as any code change, so you can answer "what was this agent allowed to do on the day of the incident" with a git history rather than a shrug.

## The point

SAMM's durability is the lesson. The framework asks whether you *govern, design, build, verify and operate* your software with assurance, and those verbs do not change because the software now writes its own next action. What changes is the component you are answering them about: non-deterministic, credentialed, persuadable. Re-score each practice against that component, lean on the OWASP LLM Top 10, MITRE ATLAS and the Agentic Security Initiative taxonomy wherever SAMM is deliberately technology-neutral, and you get a maturity path for agentic AI without inventing a parallel model that will be obsolete by the next architecture shift.

The teams that will struggle are the ones treating agentic security as a greenfield discipline with no priors. It is not. Most of it is assurance you already know how to do, pointed at a principal you have not pointed it at before.
