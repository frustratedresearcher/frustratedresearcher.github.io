---
title: "RBAC, ABAC, ReBAC: three doormen for your AI agents"
description: "An agent is a principal that acts on someone else's behalf and borrows other agents' trust. Deciding what it may do needs the right authorisation model — and the classic three answer three different questions. RBAC asks what badge you hold, ABAC asks what the whole situation looks like, ReBAC asks who vouches for you. This walks all three for agentic systems, with examples, and shows why secure agentic architecture layers them instead of picking one."
pubDate: 2026-10-15
tags: ["Agentic AI", "RBAC", "ABAC", "ReBAC", "Authorization", "AI Security", "Secure Architecture", "Zanzibar"]
tldr: "RBAC grants permissions by role, ABAC by the attributes of a request's subject, resource, action and context, and ReBAC by the relationships between entities in a graph. For agents, RBAC gives a clean coarse capability floor but cannot express 'on behalf of' without exploding into thousands of roles. ABAC captures runtime context an agent's security depends on — is this input untrusted, is there an approval, how sensitive is this data. ReBAC captures delegation and multi-agent trust natively: the agent's authority is an 'acts-for' edge, and its blast radius is the transitive closure of the graph. Secure agentic architecture layers all three — RBAC for the floor, ABAC for context, ReBAC for delegation — enforced at one external decision point."
faq:
  - q: "What is the difference between RBAC, ABAC and ReBAC?"
    a: "They answer authorisation differently. RBAC (role-based) grants permissions through roles a subject holds — a manager role includes manager permissions. ABAC (attribute-based) evaluates a policy over attributes of the subject, resource, action and environment at request time — allow if the user's clearance meets the document's sensitivity and it is business hours. ReBAC (relationship-based) decides from relationships in a graph — allow if there is a path from this subject to this resource, such as owner, member or delegate. RBAC is coarse and static, ABAC is contextual, ReBAC is relational and handles delegation and ownership natively."
  - q: "Which authorisation model is best for AI agents?"
    a: "No single one; secure agentic architecture layers them. Use RBAC to set each agent's coarse capability floor, ABAC to gate individual calls on runtime context the agent's security depends on — untrusted input, data sensitivity, presence of a human approval — and ReBAC to express that the agent acts on behalf of a specific user and to re-authorise inter-agent calls against the origin. The key is that whichever models you use, the decision is enforced outside the agent, at a policy decision point the model cannot influence."
  - q: "Why does RBAC alone fall short for agentic systems?"
    a: "Because an agent acts on behalf of users and composes with other agents, and RBAC cannot express 'on behalf of' or ownership without creating a role per user-resource combination — the role-explosion problem. An agent also needs context RBAC ignores: the same tool call should be allowed for trusted input and denied for untrusted input. RBAC gives a useful coarse floor, but it cannot carry delegation or runtime context, which is where agent compromises actually turn into incidents."
  - q: "What is ReBAC and where did it come from?"
    a: "Relationship-based access control decides authorisation from a graph of relationships between subjects and resources, checking whether a permitting path exists. It was popularised by Google's Zanzibar paper, the system behind consistent authorisation across Google products, and is available in open implementations like OpenFGA and SpiceDB. For agents it is a natural fit: delegation ('agent acts for user'), ownership ('user owns resource') and multi-agent trust are edges, and an authorisation check is a walk over that graph from the requesting principal to the target."
  - q: "How does ReBAC help bound an agent's blast radius?"
    a: "Because the agent's reachable authority is literally the transitive closure of its relationship graph — every resource connected by a permitting path from the agent's 'acts-for' and trust edges. That makes blast radius computable in advance rather than discovered during an incident, and it makes inter-agent lateral movement visible: a compromised agent can reach exactly what its edges connect to, so pruning edges prunes reachable impact."
---

Picture a door with three doormen, and your AI agent walking up to it holding a request.

The first doorman checks a badge. "You're a *billing agent*? Billing agents may read invoices. In you go." That is **RBAC** — role-based access control. Fast, legible, and completely blind to who you brought with you or what you intend to do once inside.

The second doorman reads the whole situation. "You're a billing agent, the invoice is marked *confidential*, it's 3am, and the content you're carrying came from an untrusted inbox. Denied." That is **ABAC** — attribute-based access control. It weighs the subject, the resource, the action and the surrounding context, and decides on the texture of the moment rather than a single label.

The third doorman asks who vouches for you. "You're acting for customer 4417. Does 4417 own this invoice? Let me trace it… yes, there's a path: 4417 owns order 882, invoice is attached to 882. You may proceed — but only for *this* customer's things." That is **ReBAC** — relationship-based access control. It decides from a graph of who-relates-to-what.

Here is the thing nobody tells you when you start building agents: you need all three doormen, and most teams hire only the first.

## Why agents break the usual authorisation story

A normal service is easy to authorise. It does a fixed set of things, as itself, forever. You give it a role, you move on.

An agent is a stranger kind of principal. Three properties make it so, and each one maps to a different doorman:

- It **holds its own identity and privileges** — so it needs a *role*, a coarse floor of what it may ever touch. (RBAC's question.)
- It can be **argued out of its instructions**, so the *same tool call* is safe in one context and catastrophic in another. (ABAC's question.)
- It **acts on behalf of a user and borrows other agents' trust**, so its authority is really a chain of delegation. (ReBAC's question.)

Miss any one of these and you get a specific, predictable failure. Let me show each model doing its job, and failing at the others' jobs, because that is what tells you how to combine them.

## RBAC: the badge at the door

RBAC grants permissions through roles. It is the right tool for the coarse floor — the outer bound of what an agent may *ever* do, independent of context.

```
role: support-triage-agent
  permissions:
    - ticket:read
    - ticket:comment
# deliberately absent: ticket:delete, ticket:transition, anything:write-elsewhere
```

This is genuinely useful. It is readable, it is auditable, and it draws a hard outer wall: `support-triage-agent` can never delete a ticket, no matter how convincingly the model is talked into wanting to. Setting that floor well is most of [least privilege for a persuadable principal](/blog/excessive-agency-is-an-authorisation-bug/).

Where RBAC cracks for agents is the word *on behalf of*. The triage agent should read customer 4417's tickets when it is helping 4417 — and no one else's. Express that in pure RBAC and you need a role per customer: `triage-for-4417`, `triage-for-4418`, ten thousand roles for ten thousand customers. This is the classic **role explosion**, and agents make it worse because they fan out across users constantly. RBAC also cannot see the moment: it cannot say "fine normally, denied when the triggering email was untrusted." The badge doesn't change colour with the context.

## ABAC: the doorman who reads the room

ABAC evaluates a policy over *attributes* — of the subject, the resource, the action, and the environment — at the instant of the request. This is exactly the shape of context an agent's security depends on, and it is why attribute logic is what you naturally write when you put an [external policy decision point in front of every tool call](/blog/open-policy-agent-for-agentic-system-design/). In Rego it reads almost like the sentence you'd say out loud:

```rego
package agent.authz
import rego.v1

default allow := false

allow if {
    "ticket:read" in data.roles[input.agent.role].permissions   # RBAC floor still applies
    input.resource.sensitivity <= input.user.clearance          # attribute of resource vs subject
    not input.context.input_is_untrusted                        # environment attribute
}
```

Look at what the doorman now sees that the badge-checker could not: the sensitivity of the specific resource, the clearance of the user being served, and — the one that saves you — whether the triggering input was untrusted. That last attribute is how you enforce the invariant that untrusted content and write capability never meet in one principal, dynamically, per call, instead of hoping it holds.

ABAC's weakness is relationships. "May this agent act on this invoice?" really means "does the user it serves *own* the order the invoice hangs off?" You *can* flatten that into attributes — stuff an `owned_resource_ids` list into the input — but ownership and delegation are graphs, and graphs smeared into attribute bags get stale, huge, and wrong. When the honest answer is "follow the chain and see if a path exists," you want a model that walks chains.

## ReBAC: the doorman who knows who vouches for you

ReBAC decides from relationships. You store facts as edges — who owns what, who delegates to whom, which agent acts for which user — and an authorisation check asks whether a *permitting path* exists between the requester and the target. The idea was popularised by Google's **Zanzibar** and lives in open implementations like **OpenFGA** and **SpiceDB**. The facts look like plain tuples:

```
(user:4417,          owner,     order:882)
(order:882,          parent,    invoice:779)
(agent:triage-7,     acts_for,  user:4417)     # this agent is delegated by this user, now
```

Check: *can `agent:triage-7` read `invoice:779`?* Walk the graph — `triage-7` acts-for `4417`, `4417` owns `882`, `882` is parent of `779` — path found, allowed, and *scoped to exactly 4417's things*. No role explosion: one `acts_for` edge, minted when the agent starts serving that user and torn down when it stops, replaces ten thousand roles.

And here is the payoff that matters most for security architecture. In an [agentic threat model, a compromised agent's reach is the transitive closure of its trust graph](/blog/threat-modeling-agentic-orchestration/) — and with ReBAC that graph is *literally the authorisation store*. Your blast radius stops being something you discover during an incident and becomes something you can query before one: "what can `triage-7` reach?" is a graph traversal. Inter-agent lateral movement becomes visible as edges, and pruning an edge provably prunes reachable impact. When agent A calls agent B, you re-authorise by re-walking the graph from the *origin* user — not from A's borrowed position — which is the mechanism behind "re-authorise at every hop."

## The architecture: hire all three, pay one

The mistake is treating these as a multiple-choice question. They are layers, and a secure agentic design uses each for what it alone does well:

- **RBAC** sets the capability floor — the hard outer wall per agent identity, the thing that is true before any context exists.
- **ABAC** decides the individual call — sensitivity, clearance, time, and above all *was the input trusted* and *is there a valid human approval for this exact action and parameters*.
- **ReBAC** carries delegation and ownership — "acts for," "owns," "is a member of" — and makes the trust graph, and therefore the blast radius, a thing you can compute.

A single tool call in a mature design passes all three doormen: the agent's role permits the capability at all (RBAC), the relationship graph confirms it is acting for a user who is connected to this resource (ReBAC), and the attributes of the moment clear it — right sensitivity, trusted input, approval present if the action is irreversible (ABAC).

Crucially, you hire three doormen but pay for *one door*. All three decisions belong at the same external **policy decision point**, outside the agent, where the model cannot lobby them — RBAC roles and ABAC rules in your policy engine, ReBAC tuples in a Zanzibar-style store the policy consults. The agent asks; the door answers; the runtime enforces. This is the [SAMM Security Architecture practice](/blog/owasp-samm-in-the-age-of-agentic-ai/) made concrete for a new kind of principal.

## The one-line version

RBAC asks *what badge do you hold*, ABAC asks *what does this moment look like*, ReBAC asks *who vouches for you and what do they connect you to*. An agent is a principal that holds a badge, acts in fraught moments, and borrows other people's trust — so it needs to be asked all three. Build the door that asks them, put it outside the agent, and a jailbroken model buys an attacker exactly what the badge, the moment, and the graph allow, and not one call more.

That is secure agentic architecture: not a cleverer model, but a better doorman.
