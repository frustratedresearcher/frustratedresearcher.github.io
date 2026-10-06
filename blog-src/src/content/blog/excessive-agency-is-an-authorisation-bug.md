---
title: "Excessive agency is an authorisation bug wearing an AI costume"
description: "The severity of an LLM compromise is set by what the agent is permitted to do, not by how it was tricked. Scoping tools to least privilege converts most agent vulnerabilities from critical to cosmetic — and it is ordinary authorisation work, not AI work."
pubDate: 2026-10-10
tags: ["Agentic AI", "AI Security", "Excessive Agency", "OWASP LLM Top 10", "IAM"]
tldr: "Every agent incident has two halves: the model was manipulated, and the agent was allowed to act on it. You cannot reliably fix the first half, but the second is ordinary authorisation engineering. Scope each tool to the narrowest capability that works, separate read from write, and gate irreversible actions — then a successful manipulation produces wrong text instead of a wrong outcome."
faq:
  - q: "What is excessive agency in LLM security?"
    a: "Excessive agency is OWASP LLM06: an LLM-based system is granted more functionality, permissions or autonomy than its task requires, so that when the model is manipulated it can take damaging actions. The vulnerability is in the permission grant, not in the model."
  - q: "How is excessive agency different from prompt injection?"
    a: "Prompt injection is how an attacker influences the model. Excessive agency is what the attacker gets as a result. Injection determines whether an attack lands; agency determines whether landing matters. They are usually chained, and only agency is reliably fixable today."
  - q: "Should AI agents share one service account?"
    a: "No. A shared account means every agent inherits the union of all permissions any agent needs, so compromising the weakest agent grants the strongest agent's access. Give each agent its own identity scoped to its own task."
  - q: "What actions should always require human approval?"
    a: "Anything irreversible or externally visible: sending messages, publishing content, moving money, deleting data, and changing permissions or security settings. The approval should show the concrete action and its parameters, not a generic confirmation."
---

Most agent security write-ups spend their length on how the model was tricked. The jailbreak is the interesting part, so it gets the attention.

It is also the part you cannot fix.

The part you can fix is sitting one layer down, and it is the reason the incident was worth writing about at all: the agent was *allowed* to do the damaging thing.

## Two questions, not one

Every agentic incident decomposes cleanly:

1. Could the attacker influence the model's behaviour?
2. Could the model, so influenced, do something that mattered?

Question one has no reliable answer today. Instruction and data share a channel, defences are heuristics, and the attacker writes in the same language you do. Assume the answer is yes and plan accordingly.

Question two is entirely yours. It is answered by permission grants, tool definitions and approval gates — ordinary, boring authorisation engineering of exactly the kind we have been doing for decades.

OWASP files this as **LLM06: Excessive Agency**, and the framing in the name is the useful bit. It is not a model flaw. It is a flaw in what you handed the model.

## What over-permissioning looks like in practice

It rarely looks reckless. It looks convenient.

**The tool that does too much.** You need the agent to look up a ticket, so you give it the ticketing client. The client has `delete_issue` because it is the same SDK the admin tooling uses. The agent never needs it. It has it anyway.

**The shared service account.** Seven agents, one identity, because provisioning seven was friction. Now the summarisation agent — the one reading untrusted email — holds the deployment agent's permissions.

**Write access acquired for a read-shaped task.** "Update the ticket status when you're done" turns a read-only analyst into something that can mutate records, and the mutation API rarely stops at status.

**Scope that grew quietly.** The permission was right at launch. Then a tool gained a parameter, or an API version widened a role, and nobody re-ran the threat model. In the agentic SOC I run, scope drift has caused more regressions than prompt changes ever have.

**Chained agents inheriting the union.** Agent A calls Agent B. If B does not re-authorise against A's context, B's permissions are effectively A's. A few hops in, nobody can state what the system can touch.

## The controls that hold

**One identity per agent.** Separate service accounts, separate credentials, separate audit trail. When something goes wrong you want to know which agent did it, and you want the blast radius bounded to that agent's job.

**Scope tools to capability, not to API surface.** Do not hand over an SDK. Write a function that does the one thing: `get_ticket(id)` returning three fields, not `jira_client` with a hundred methods. The agent cannot call what does not exist.

**Split read from write, hard.** The agent that ingests untrusted content should be read-only, always. If a workflow needs a write, it belongs to a different agent with a different identity and a narrower input surface. Untrusted input and write capability should never meet in one principal.

**Gate the irreversible.** Send, publish, pay, delete, grant. A human confirmation showing the actual parameters — recipient, amount, target — not a generic "proceed?". The gate catches the case where the model has been convinced it is doing something reasonable, which is the case your filters will miss.

**Re-authorise at every hop.** When one agent invokes another, the callee checks permissions against the original context. Otherwise your careful per-agent scoping dissolves the first time agents compose.

**Make scope reviewable.** Threat-model per agent, keep it current, and diff it. Per-agent threat models mapped to MITRE ATLAS and the OWASP LLM Top 10 are how scope drift becomes visible before it becomes an incident.

## Why this is the highest-leverage thing you can do

Prompt-level defences reduce the *probability* of a successful manipulation. Agency controls reduce its *consequence*. Only one of those is reliable.

Run the thought experiment on your own system: assume an attacker has complete control of what one agent believes. Not partial influence — total. What can they reach?

If the answer is "it writes a wrong summary", you have an availability and quality problem. Annoying, not an incident.

If the answer is "it has production database credentials and an outbound network path", the jailbreak technique was never the interesting part.

That exercise costs an afternoon and tends to be more productive than another month of prompt hardening. The uncomfortable conclusion for the field is that the most effective AI security control is not an AI security control at all — it is least privilege, applied to a new kind of principal that happens to be persuadable.

We already know how to do this. We are just not doing it, because the agent is new and shiny and the permission grant is neither.
