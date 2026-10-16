---
title: "Open Policy Agent for agentic systems: authorisation that lives outside the model"
description: "An agent's tool calls need a decision point the model cannot talk its way past. Open Policy Agent gives you one: a policy engine outside the agent that answers 'is this agent allowed to make this call with these parameters?' before the call runs. This is how least privilege, inter-agent re-authorisation and human gates stop being prose and become enforced code."
pubDate: 2026-10-13
tags: ["Agentic AI", "Open Policy Agent", "OPA", "Rego", "Authorization", "AI Security", "Zero Trust"]
tldr: "Agent authorisation decisions should not live inside the agent, because the agent is the thing being manipulated. Externalise them to a policy decision point. Open Policy Agent is a mature, CNCF-graduated engine built for exactly this: the agent runtime sends a JSON description of the intended tool call to OPA, OPA evaluates Rego policy against it, and returns allow or deny before the call executes. Least privilege, read/write separation, inter-agent re-authorisation, egress control and human-approval gating all become policy data you can version, test and diff — instead of trust you hope the model honours."
faq:
  - q: "What is Open Policy Agent and why use it for AI agents?"
    a: "Open Policy Agent (OPA) is a CNCF-graduated, general-purpose policy engine that decouples authorisation decisions from the code that enforces them. For agentic systems it gives you an external decision point: before an agent runs a tool call, the runtime asks OPA 'is this allowed?' and OPA answers from policy the model cannot see or influence. That separation is the whole point — the agent is the component being manipulated, so the authorisation decision must live somewhere the manipulation cannot reach."
  - q: "How is OPA different from putting authorisation logic in the agent's prompt or tools?"
    a: "Prompt-level rules ('only use this tool for X') are suggestions the model can be argued out of. Logic baked into each tool is scattered, inconsistent and invisible to review. OPA centralises the decision in versioned Rego policy evaluated outside the agent, returns a structured allow/deny with a reason, and produces a decision log. You get one place to see what every agent is permitted to do, and manipulation of the model changes none of it."
  - q: "What does OPA actually evaluate for an agent tool call?"
    a: "A JSON input document describing the intended action: which agent is calling, under which user's context, which tool, which action (read/write), and the concrete normalised parameters. OPA evaluates Rego rules against that input plus loaded policy data (per-agent entitlements, resource ownership, approval records) and returns a decision document. The agent runtime enforces it — OPA decides, the runtime blocks."
  - q: "Can OPA enforce human approval for high-impact agent actions?"
    a: "Yes, as a policy condition. Mark irreversible or externally visible tools (send, publish, pay, delete, grant) as requiring an approval token, and write a rule that denies the call unless a valid, single-use approval exists for that exact actor, tool and parameter set. The approval becomes data OPA checks, so the gate is enforced identically everywhere instead of reimplemented per tool."
  - q: "Where does OPA run in an agentic architecture?"
    a: "At the tool-invocation boundary and the inter-agent call boundary — the two edges where a decision becomes an action. Run it as a sidecar or a local daemon next to the agent runtime (or the MCP server / tool gateway), keep latency sub-millisecond for typical policies, and distribute policy through OPA bundles so every decision point evaluates the same version."
---

Every agentic incident ends the same way: the model was convinced of something, and then it was *allowed to act on it*. I have written before that [excessive agency is an authorisation bug](/blog/excessive-agency-is-an-authorisation-bug/) wearing an AI costume. This post is the other half of that claim — the mechanism. If agent authorisation is ordinary authorisation work, then you should enforce it with ordinary authorisation infrastructure, not with prose in a system prompt.

The uncomfortable truth is that most teams put the authorisation decision in the worst possible place: inside the agent. "Only use `delete_user` when the request is clearly administrative" is not a control. It is a request, addressed to the one component in your system that an attacker is actively trying to talk out of its instructions.

The fix is architectural, and it is old. Separate the **policy decision point** from the **policy enforcement point**. The agent runtime enforces; something else decides. Open Policy Agent is a mature, CNCF-graduated engine built for exactly that separation, and it slots into an agentic stack more cleanly than most people expect.

## The decision the model must not make

Here is the shape of the problem. An agent wants to call a tool. Before that call runs, one question has to be answered by code the agent cannot influence:

> Is **this agent**, acting for **this user**, allowed to invoke **this tool** with **these exact parameters**?

Four variables, one answer. The moment you write that down, you have described an OPA input document:

```json
{
  "agent": { "id": "support-triage", "identity": "svc-support-triage" },
  "user":  { "id": "u-4417", "roles": ["customer"] },
  "tool":  "issue_client",
  "action": "write",
  "params": { "op": "delete_issue", "issue_id": "PROJ-882" }
}
```

OPA takes that `input`, evaluates Rego policy against it plus any loaded `data` (entitlements, ownership tables, approval records), and returns a decision. The agent runtime calls OPA, reads the answer, and either runs the tool or refuses. The model never sees the policy and cannot argue with it.

## A policy, not a paragraph

Rego is OPA's policy language. It is declarative and default-deny once you tell it to be. A first cut of the policy for the input above:

```rego
package agent.authz

import rego.v1

# Deny unless a rule explicitly allows.
default allow := false

# Per-agent entitlements, loaded as data (from a bundle, not the prompt).
# data.entitlements["support-triage"] = {"issue_client": ["read"]}

allow if {
    caps := data.entitlements[input.agent.id][input.tool]
    input.action in caps
    not high_impact
}

# High-impact operations are allowed only with a valid approval.
allow if {
    high_impact
    approved
}

high_impact if input.params.op in {"delete_issue", "delete_user", "refund", "send_email"}

approved if {
    a := data.approvals[input.request_id]
    a.agent == input.agent.id
    a.tool == input.tool
    a.params == input.params        # bound to the exact normalised parameters
    a.used == false                 # single-use, so an approval cannot be replayed
}
```

Read what this buys you. `support-triage` is entitled to `issue_client:read` and nothing else, so `delete_issue` — a write, and high-impact — is denied outright. To ever permit it, a human has to produce an approval record bound to *this request, this agent, this tool, and these exact parameters*, used once. Approving "delete `PROJ-882`" is a control. Approving "the agent may delete things" is a blank cheque, and this policy structurally refuses to write one.

None of that logic lives in the agent. It lives in a `.rego` file you can unit-test, version in git, and diff in a pull request. When scope drifts — and [scope drift causes more agent regressions than prompt changes](/blog/excessive-agency-is-an-authorisation-bug/) — it drifts visibly, in a reviewed file, instead of silently inside an SDK the agent happened to be handed.

## Use cases, concretely

**1. Tool-call least privilege.** The default case above. Each agent identity maps to the narrowest capability set that lets it do its job. The summarisation agent reading untrusted email gets `read` on exactly the mailbox tool and nothing else. Because OPA is default-deny, a tool the policy never mentions is a tool the agent cannot call — even if the model is convinced it should.

**2. Hard read/write separation for untrusted input.** Untrusted content and write capability should never meet in one principal. Encode it as an invariant OPA enforces across every agent at once:

```rego
# Any agent that ingests untrusted content is read-only, no exceptions.
deny contains "untrusted-input principal attempted a write" if {
    input.action == "write"
    data.agents[input.agent.id].ingests_untrusted == true
}
```

This is the kind of rule that is tedious to remember in seven different tool implementations and trivial to state once as policy.

**3. Inter-agent re-authorisation.** When agent A calls agent B, B must re-authorise against the *original* user context, or B's permissions silently become A's and a few hops in nobody can state what the system can touch. Route the inter-agent call through the same decision point, carrying the original `user` context, and OPA evaluates B's entitlements — not A's borrowed trust:

```rego
allow if {
    input.call_type == "agent_to_agent"
    caps := data.entitlements[input.callee][input.tool]
    input.action in caps
    input.user.id == input.origin_user.id   # trust the origin, re-check the callee
}
```

Authenticating that the call came from a known peer agent is *not* authorisation. The callee enforces the sender's permissions independently. OPA is where that enforcement is identical for every pair of agents.

**4. Egress and data-boundary control.** The same engine decides whether a tool call may reach a given host, or whether a RAG retrieval may return a document, based on the user's clearance and the document's labels. One policy surface governs "what can leave" and "what can be read" instead of two bespoke filters drifting apart.

**5. MCP and tool-gateway enforcement.** If your agents reach tools through a Model Context Protocol server or a tool gateway, that gateway is the perfect enforcement point: it already brokers every call, so it is one `http.send` to OPA away from brokering every *authorised* call. The gateway asks, OPA decides, the gateway blocks.

## Where it runs, and what it costs

OPA runs as a sidecar, a local daemon, or an embedded library next to whatever makes the tool call — the agent runtime, the MCP server, the gateway. Policy is distributed as **bundles**, so every decision point in a fleet evaluates the same version, and a policy change is a bundle push, not a redeploy of the agents. Typical decisions evaluate in well under a millisecond, which matters when every tool call pays the toll. And every decision is logged — a structured record of what was asked and what was decided — which is the audit trail you will want the first time you have to answer "what could that compromised agent actually reach?"

The honest framing: OPA does not make your agent harder to jailbreak. Nothing does, reliably. What it does is make the jailbreak *not matter* — it caps the blast radius at whatever the policy permits, and it moves that cap out of the model's reach and into a file your team reviews. Run the thought experiment on your own system: assume an attacker has total control of what one agent believes. With the decision point inside the agent, they have everything that agent can call. With OPA in front of it, they have exactly what the policy allows, and not one call more.

That is the entire pitch. The most effective control for agentic systems is least privilege applied to a new kind of principal — one that happens to be persuadable — and OPA is how you stop writing that control as a sentence and start enforcing it as code.
