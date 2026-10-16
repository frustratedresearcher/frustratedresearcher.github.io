---
title: "Stopping malicious tool-call chaining: detect, remediate, alert"
description: "In an agentic system the crime is rarely a single tool call — it is the sentence those calls spell out together. Read a secret, encode it, send an email: three allowed calls, one exfiltration. This is how to design against chained abuse across all three stages — detecting a malicious chain as it forms, remediating by breaking it mid-sequence, and alerting with telemetry an on-call can act on — and which frameworks and tools do each job."
pubDate: 2026-10-17
tags: ["Agentic AI", "Tool Chaining", "AI Security", "Detection Engineering", "Prompt Injection", "MITRE ATLAS", "Secure Architecture"]
tldr: "A malicious tool-call chain is a sequence of individually authorised calls that together cause harm — the canonical pattern being access to private data, exposure to untrusted content, and an outbound path, all in one agent. You cannot stop it by vetting calls one at a time, because each one looks fine. Design across three stages. Detect by tracking data provenance (taint) through the call sequence and scoring the call graph, not each node — tools: Invariant-style trace analysers, OpenTelemetry GenAI traces, OPA policies over call history. Remediate by breaking the chain at its weakest link: deny the step where tainted data meets an outbound action, gate it behind single-use human approval bound to exact parameters, and quarantine the agent's identity — tools: an external policy decision point (OPA/Cedar), per-agent credentials, egress allowlists. Alert with structured decision logs mapped to MITRE ATLAS, correlated as a chain in your SIEM, so the on-call sees the sequence, not seven disconnected events."
faq:
  - q: "What is malicious tool-call chaining in agentic AI?"
    a: "It is an attack where an agent is induced to execute a sequence of tool calls that are each individually permitted but collectively harmful. The classic pattern — Simon Willison's 'lethal trifecta' — is one agent that has access to private data, exposure to untrusted content, and an ability to send data outward; a prompt injection in the untrusted content steers it to read the secret and exfiltrate it through the allowed outbound call. No single call is a violation, so per-call authorisation misses it. You have to reason about the chain."
  - q: "Why doesn't normal per-call authorisation stop tool-call chaining?"
    a: "Because authorisation that evaluates each call in isolation has no memory of what the agent already did. Reading a customer record is allowed. Calling an email tool is allowed. The abuse is the composition — tainted data from the first call flowing into the second — which is invisible unless the decision point tracks data provenance across the sequence and evaluates the call graph rather than the current node alone."
  - q: "How do you detect a malicious tool-call chain?"
    a: "Track provenance (taint) on data as it moves between calls and flag when data derived from an untrusted source reaches an outbound or irreversible action; score the call graph for known-dangerous sequences such as the lethal trifecta; and inspect the plan before execution where the agent exposes one. Tooling includes agent-trace analysers like Invariant Guardrails, OpenTelemetry GenAI semantic-convention traces for the raw sequence, and policy engines evaluating over accumulated call history rather than a single request."
  - q: "How do you remediate tool-call chaining without breaking the agent?"
    a: "Break the chain at its weakest link rather than trying to block every call. The decisive point is where tainted or sensitive data meets an outbound or irreversible action — deny there, or gate it behind single-use human approval bound to the exact actor, tool and parameters. Contain by giving each agent its own scoped identity so you can quarantine one agent without killing the fleet, enforce egress allowlists so exfiltration has nowhere to go, and keep write capability and untrusted input in separate principals so the chain cannot complete inside one."
  - q: "Which frameworks and tools help stop agent tool-call chaining?"
    a: "Enforcement and policy: Open Policy Agent (Rego), AWS Cedar, and ReBAC stores like OpenFGA or SpiceDB, placed at an MCP server or tool gateway. Detection and guardrails: agent-trace analysers such as Invariant Guardrails, plus runtime guardrail layers like NVIDIA NeMo Guardrails and Llama Guard. Testing and red-teaming: PyRIT, Garak, promptfoo, DeepTeam, and agent-injection benchmarks like AgentDojo. Mapping and taxonomy: MITRE ATLAS, the OWASP LLM Top 10 and Agentic Security Initiative, and CSA MAESTRO. Observability: OpenTelemetry GenAI conventions feeding a SIEM such as Microsoft Sentinel or Splunk."
---

Here is a crime scene. Nothing in it is illegal.

An agent reads a customer record — it's a support agent, reading records is its job. It calls a summarisation step — fine. It calls the email tool to send the summary — also fine, it emails customers all day. Three permitted calls. Except the record it read contained an API key, the "summary" was the key base64-encoded, and the email went to an address a prompt injection planted three steps earlier in a support ticket.

No single call broke a rule. The **sentence those calls spelled out together** was the breach.

This is malicious tool-call chaining, and it is the agentic attack that per-call security is structurally blind to. I've argued that [excessive agency is an authorisation bug](/blog/excessive-agency-is-an-authorisation-bug/) and that [you should enforce authorisation outside the model](/blog/open-policy-agent-for-agentic-system-design/). Both are true and both are about *individual* calls. Chaining is the next problem up: even perfectly scoped calls compose into harm. Designing against it means reasoning about the sequence, and doing it across three stages — **detect, remediate, alert** — because no one stage is enough on its own.

## The shape of the attack

The reusable pattern behind almost every chain is what Simon Willison named the **lethal trifecta**: a single agent that has, at once —

1. **access to private data**,
2. **exposure to untrusted content**, and
3. **a way to send data outward**.

Give one principal all three and a prompt injection in the untrusted content is enough to read the secret and ship it out, using only sanctioned tools. The chain is the exploit; the trifecta is the precondition. Keep that triangle in mind — most of the design below is about never letting all three edges live in one agent, and catching the moment they try to connect.

A useful mental model: treat the agent's run as a **dataflow graph**, not a list of calls. Nodes are tool invocations; edges are data moving from one call's output into another's input. A malicious chain is a *path* through that graph — from an untrusted source, through something sensitive, to an outbound sink. You defend the path, not the nodes.

## Stage 1 — Detect: watch the chain, not the call

Detection has to have memory. A decision point that forgets everything between calls cannot see a chain by definition. Three techniques, in rising order of power:

**Provenance / taint tracking.** Tag every piece of data with where it came from. Content from a ticket, an email, a web fetch, a RAG document — all `untrusted`. Content from a secrets store or a customer PII field — `sensitive`. Then propagate those tags through each call's output. The detection rule is one sentence: *raise if data tagged `untrusted` influenced the parameters of an outbound/irreversible call, or if `sensitive` data is flowing to a sink that can leave the trust boundary.* This is the single highest-value signal for chaining, because it catches the composition directly rather than guessing from behaviour.

**Call-graph scoring.** Even without perfect taint, you can score the accumulated call history for known-dangerous shapes. Has this agent, in this run, touched all three trifecta edges? Did a `read_secret` precede a `network.send` with no human step between? These are cheap graph queries over the run so far, and they turn tribal "that sequence smells wrong" knowledge into rules.

**Plan inspection.** When the agent exposes a plan before executing it (many orchestration patterns do), inspect the whole plan for a dangerous path *before the first call runs*. Catching the chain at plan time is strictly better than catching it mid-flight — nothing has happened yet.

**Tools for this stage:** agent-trace analysers such as **Invariant Guardrails**, which are built to reason over sequences of tool calls and dataflow rather than single prompts; **OpenTelemetry GenAI** semantic conventions to emit the raw call sequence as spans you can analyse; and your policy engine (**OPA/Rego**) evaluating over *accumulated* call history passed in as input, not just the current request. For finding these chains before production, agent-injection benchmarks like **AgentDojo** and red-team frameworks **PyRIT**, **Garak**, **promptfoo** and **DeepTeam** exercise the trifecta deliberately.

## Stage 2 — Remediate: break the weakest link, then contain

You do not stop a chain by blocking every call — that breaks the agent. You stop it by cutting it at its **decisive link**: the one place where tainted or sensitive data meets an outbound or irreversible action. Deny there and the heist fails even though every earlier step succeeded.

**Cut at the sink.** The enforceable rule, stated as policy at your external decision point:

```rego
package agent.chain
import rego.v1

default allow := false
allow if { not dangerous_composition }

# Deny the step where the chain would complete.
dangerous_composition if {
    input.action.kind in {"network_send", "email", "publish", "delete", "pay"}
    some d in input.action.data_lineage          # provenance carried on the call
    d.tag == "untrusted"                          # untrusted content is steering a sink
}
dangerous_composition if {
    input.action.kind in {"network_send", "email", "publish"}
    some d in input.action.data_lineage
    d.tag == "sensitive"                          # sensitive data heading for an exit
    not approved_for(input.request_id)            # unless a human approved this exact action
}
```

That `approved_for` check is the humane version of a hard block: high-impact sinks aren't forbidden, they're **gated behind single-use human approval bound to the exact actor, tool and normalised parameters** — "email `key.txt` to `attacker@evil.com`" is shown in full and refused, while legitimate sends pass. A blanket "approve an email?" is a blank cheque; binding to parameters is a control.

**Design so the chain can't complete in one principal.** Remediation is strongest when it's architectural, not reactive. Keep **untrusted input and write capability in separate agents with separate identities** — then the trifecta is physically impossible inside any single principal, and the dangerous path has to cross an inter-agent boundary where you [re-authorise against the origin](/blog/rbac-abac-rebac-for-agentic-systems/). Put **egress on an allowlist** so even a completed "send" has nowhere to go. And give **each agent its own scoped credential** so your containment action — revoke, quarantine — bounds the blast radius to one agent instead of taking down the fleet.

**Tools for this stage:** an external policy decision point — **OPA (Rego)** or **AWS Cedar** — fronting an **MCP server or tool gateway** so every call and its lineage passes one chokepoint; **OpenFGA / SpiceDB** for the relationship checks behind "acts for this user"; network egress policy / allowlists for the sink; and per-agent identities in your IdP so quarantine is one revocation. Runtime guardrail layers like **NVIDIA NeMo Guardrails** and **Llama Guard** add a content-level backstop at the edges.

## Stage 3 — Alert: make the on-call see the sequence

The failure mode here is specific and common: the SIEM receives seven events — a read, a summarise, a send — scattered across time, each unremarkable, none correlated. The human on call sees noise. Alerting for chaining means **reconstructing and emitting the chain as one object**, with the path highlighted.

**Emit structured decision logs.** Every allow/deny from your decision point should log the actor, tool, normalised parameters, data lineage, and the reason. OPA produces exactly this. That log *is* your evidence and your detection substrate.

**Correlate by run, not by call.** Carry a run/trace ID (OpenTelemetry does this natively) so the SIEM can stitch the scattered events back into the sequence that produced them. The alert the on-call receives should read "agent `support-triage` built a lethal-trifecta path: untrusted ticket → read customer secret → attempted external email," not seven rows they must assemble themselves at 3am.

**Map to a shared vocabulary.** Tag the alert with **MITRE ATLAS** technique IDs so it lands in the same detection-engineering pipeline as the rest of your estate and so your coverage is legible against the [OWASP Agentic Security Initiative taxonomy](/blog/threat-modeling-agentic-orchestration/). Treat an excessive-agency or chaining finding as a first-class defect in your [SAMM Defect Management practice](/blog/owasp-samm-in-the-age-of-agentic-ai/), with severity set by what the chain could *reach*, not by how clever the injection was.

**Tools for this stage:** **OpenTelemetry GenAI** traces feeding **Microsoft Sentinel** or **Splunk**; OPA **decision logs** as the structured source; **MITRE ATLAS** for technique mapping; and an observability layer (e.g. Langfuse-style tracing) to make the reconstructed chain inspectable after the fact.

## The design, in one breath

You cannot vet a malicious chain one call at a time, because the malice lives in the composition. So you build memory into the system and defend the dataflow path: **detect** by tracking provenance and scoring the call graph so a forming chain is visible; **remediate** by cutting the chain where tainted data meets a sink — gating it behind parameter-bound approval, and architecting so untrusted input, sensitive data and egress never co-reside in one agent; **alert** by emitting correlated, ATLAS-tagged decision logs so a human sees the sequence as a sequence.

The through-line of everything I write about agents holds here too: a jailbreak you cannot prevent becomes an incident only if the system lets the chain complete. Make the sink the thing you guard, keep the trifecta broken across principals, and the most creative prompt injection in the world ends at a denied call and a clean alert — three innocent-looking steps that were never allowed to become a sentence.
