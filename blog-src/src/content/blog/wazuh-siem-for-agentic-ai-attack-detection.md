---
title: "Wiring an agentic AI system into Wazuh: detect, log and prevent every integration attack"
description: "An agent's attack surface is its integrations — the input channel, the RAG store, the MCP servers, the tool calls, the memory, the peer agents, the model file itself. This is a build guide for routing all of them into Wazuh: the telemetry contract the runtime must emit, the decoders and rules to detect direct and indirect prompt injection, RAG poisoning, MCP tool-poisoning, chaining and exfiltration, and the active-response playbook to contain a compromised agent — surface by surface, with the config."
pubDate: 2026-10-17
tags: ["Agentic AI", "Wazuh", "SIEM", "Detection Engineering", "Prompt Injection", "RAG Security", "MCP", "MITRE ATLAS", "AI Security"]
tldr: "Wazuh can give an agentic system full traceability and alerting, but only if the agent runtime emits structured security events — Wazuh correlates and alerts, it does not classify prompts. Build it in layers: a JSON telemetry contract emitted per LLM call, tool call, guardrail verdict and policy decision; a Wazuh JSON decoder that flattens those fields; and one rule group per integration surface — input (direct injection), RAG (indirect injection, poisoning, exfil retrieval), MCP (tool poisoning, rug-pull descriptions, rogue servers), tool execution (chaining, command injection, SSRF), memory (poisoning), inter-agent (spoofing, lateral movement), model supply chain (poisoned weights), and egress/identity (exfiltration, excessive agency). Each surface gets an identify signal, a log event, a Wazuh rule with a MITRE ATLAS tag, and a prevention control, plus frequency and composite rules for campaigns and chains, and an active-response script that quarantines one agent's scoped identity without killing the fleet."
faq:
  - q: "Can Wazuh detect prompt injection against an AI agent?"
    a: "Yes, but with a division of labour. Wazuh does not read or classify prompts itself — the detection intelligence lives upstream in a guardrail or classifier that scores input and retrieved content, and in a policy decision point that evaluates tool calls. Those components emit structured JSON events; Wazuh decodes them, correlates by run ID, raises alerts with severity and MITRE ATLAS tags, retains them, and can trigger containment. So Wazuh is the traceability, correlation and response layer, and the quality of its alerts depends entirely on the events the agent runtime emits."
  - q: "How do you get agentic AI logs into Wazuh?"
    a: "Have the agent runtime write one structured JSON line per security-relevant event — LLM input/output, tool call with data lineage, guardrail verdict, policy allow/deny — to a log file, then point a Wazuh agent localfile block at it with log_format json. Wazuh's JSON decoder flattens every key into a matchable field automatically. For containerised runtimes, ship over syslog or the Wazuh API instead. The single most important field is a run or trace ID, because it is what lets Wazuh stitch scattered events back into one agent run."
  - q: "How do you detect indirect prompt injection and RAG poisoning in a SIEM?"
    a: "Two complementary ways. First, scan retrieved and tool-returned content with the same classifier you use on user input and emit a verdict event tagged indirect, with the source document ID — Wazuh alerts on it directly. Second, detect the effect rather than the text: emit data lineage on every tool call and write a composite Wazuh rule that fires when data tagged untrusted reaches an outbound or irreversible action in the same run. The behavioural rule is the safety net for poisoned content the classifier misses, and it maps to the lethal-trifecta exfiltration pattern."
  - q: "How do you monitor MCP server attacks with Wazuh?"
    a: "Treat each MCP server as a monitored integration. Emit an event when a tool's description or schema hash changes between sessions (the rug-pull / tool-poisoning pattern), when a tool call targets a server not on your allowlist, and when a tool definition contains instruction-like text. Wazuh rules alert on a changed tool hash, on calls to unknown servers, and on description fields matching injection patterns. Prevention is pinning tool schemas, allowlisting MCP endpoints, and routing every MCP call through a gateway that re-authorises against the user context."
  - q: "What can Wazuh do automatically when it detects an agent compromise?"
    a: "Wazuh Active Response can run a script when a rule of a given level or ID fires. For an agent, that script calls your control plane to quarantine the offending agent — revoking its scoped credential or switching its policy to deny-all — which is surgical only because each agent holds its own identity. Higher-severity rules can instead open a SOAR playbook (Shuffle, TheHive) for a human-approved response. The alert itself carries the run ID, the data lineage and the ATLAS technique so the responder sees the whole chain, not seven disconnected events."
---

An agent is not really one thing you secure. It is a switchboard. It plugs into a user, a vector store, a handful of MCP servers, a set of tools, a memory, sometimes other agents, and a model file underneath all of it. Every one of those plugs is an integration, and **every integration is an attack surface**. The injection hides in a retrieved document; the malicious instruction arrives in a tool's description; the exfiltration leaves through a sanctioned API. Secure the agent's prompt all you like — the attack walks in through a socket you forgot was load-bearing.

A SIEM is how you get one pane of glass over all those sockets. This is a build guide for doing it with **Wazuh** — open-source, free, and already in a lot of the SOCs I work with. I answered the "can we?" question already; this is the "here is everything, surface by surface" version.

First, the rule that governs the whole design, because getting it wrong wastes weeks: **Wazuh does not understand prompts.** It is the traceability, correlation, alerting, retention and response layer. The intelligence that decides "this is injection" or "this tool was poisoned" lives *upstream*, in your guardrails and your [policy decision point](/blog/open-policy-agent-for-agentic-system-design/). Those components emit structured events; Wazuh makes them legible, correlated and actionable. Budget your effort accordingly — most of it goes into instrumentation, not Wazuh config.

```
[agent runtime + guardrails + policy engine]  →  emit JSON events
[Wazuh agent / syslog]                         →  transport
[decoders → rules → correlation]               →  alert + MITRE ATLAS + active response
```

## Part 0 — The foundation: telemetry contract and Wazuh plumbing

Everything below depends on two things being in place first.

### 0.1 The event contract

The runtime writes **one JSON line per security-relevant event** to a log file (`/var/log/agent/events.json`). One flat schema covers every surface; the `event` field discriminates. Keep a denormalised field or two (like `lineage_tags`) because Wazuh matches flat strings far more easily than JSON arrays.

```json
{
  "ts":"2026-10-17T09:14:02Z","run_id":"r-8841","agent":"support-triage","user":"u-4417",
  "event":"guardrail_verdict","detector":"prompt-guard","verdict":"injection",
  "subtype":"indirect","score":0.94,"surface":"rag","source":"rag_document:kb-233",
  "tool":null,"action_kind":null,"server":null,
  "lineage_tags":"untrusted,sensitive","dest":null,"snippet":"ignore previous instructions ..."
}
```

Emit an event for: every **LLM input/output**, every **tool call** (with lineage, target `server`, and `dest` for egress), every **guardrail verdict** (on input *and* on retrieved content), every **policy allow/deny**, and integration-specific events (tool-schema change, memory write, inter-agent message, model load). `run_id` is sacred — it is the join key that turns noise into a chain.

### 0.2 Wazuh ingestion

On the host running the agent, add to the Wazuh agent's `ossec.conf`:

```xml
<localfile>
  <log_format>json</log_format>
  <location>/var/log/agent/events.json</location>
</localfile>
```

Wazuh's JSON decoder flattens every key automatically — `run_id` becomes the field `run_id`, accessible in rules as `<field name="run_id">` and in the dashboard as `data.run_id`. No custom decoder is needed for flat JSON; you only write a `local_decoder.xml` if you also ingest non-JSON logs (e.g. an MCP gateway's access log). Custom rules go in `/var/ossec/etc/rules/local_rules.xml`. That is the entire plumbing. Everything from here is rules.

A shared base rule keeps the rest DRY:

```xml
<group name="agentic_ai,">
  <rule id="100100" level="0">
    <decoded_as>json</decoded_as>
    <field name="run_id">\.+</field>
    <description>Agentic AI event (base)</description>
  </rule>
```

## Part 1 — The input channel: direct prompt injection & jailbreak

**Attack.** Malicious instructions in the user's own message — "ignore your rules," DAN-style jailbreaks, encoded payloads.

**Identify.** An input guardrail/classifier (Llama Guard, Prompt Guard, Lakera, NeMo Guardrails) scores the message before it reaches the planner.

**Log.** `event:guardrail_verdict, surface:input, subtype:direct`.

**Wazuh.**
```xml
  <rule id="100200" level="10">
    <if_sid>100100</if_sid>
    <field name="event">guardrail_verdict</field>
    <field name="verdict">injection</field>
    <description>Prompt injection ($(subtype)) on $(agent), run $(run_id), score $(score)</description>
    <mitre><id>AML.T0051</id></mitre>
  </rule>
  <rule id="100201" level="13" frequency="4" timeframe="300">
    <if_matched_sid>100200</if_matched_sid>
    <same_field>user</same_field>
    <description>Repeated injection attempts from user $(user) — active probing</description>
  </rule>
```

**Prevent.** The guardrail blocks the request; the frequency rule flags a campaign. Remember injection isn't fully preventable — the real defence is downstream agency limits, which is why every surface below assumes the injection sometimes lands.

## Part 2 — RAG / knowledge base: indirect injection, poisoning, exfil retrieval

**Attack.** (a) *Indirect injection* — a poisoned document in the store carries instructions the agent obeys when it retrieves them. (b) *Poisoning* — an attacker writes malicious content into the index. (c) *Exfil retrieval* — the agent is steered to pull documents above the user's clearance and surface them.

**Identify.** Scan **retrieved chunks before they enter context** with the same classifier (this is the step most teams skip); monitor **writes to the vector store** as a privileged operation; tag retrieved data `untrusted` and carry the lineage.

**Log.** `event:guardrail_verdict, surface:rag, subtype:indirect, source:<docid>`; `event:rag_write`; `event:tool_call` with `lineage_tags` including `untrusted`.

**Wazuh.**
```xml
  <!-- indirect injection found in retrieved content -->
  <rule id="100210" level="11">
    <if_sid>100100</if_sid>
    <field name="event">guardrail_verdict</field>
    <field name="surface">rag</field>
    <field name="subtype">indirect</field>
    <description>Indirect injection in retrieved doc $(source) for run $(run_id)</description>
    <mitre><id>AML.T0051</id></mitre>
  </rule>
  <!-- write to the knowledge base from an unexpected principal = poisoning attempt -->
  <rule id="100211" level="12">
    <if_sid>100100</if_sid>
    <field name="event">rag_write</field>
    <field name="authorized">false</field>
    <description>Unauthorized write to vector store by $(agent) — possible RAG poisoning</description>
    <mitre><id>AML.T0020</id></mitre>
  </rule>
```

**Prevent.** Treat the vector store as a production asset with write access controls and provenance on every chunk; scan on ingest *and* on retrieval; enforce document-level authorisation at retrieval with [ReBAC so the agent only reaches what the user it serves is connected to](/blog/rbac-abac-rebac-for-agentic-systems/).

## Part 3 — MCP servers: tool poisoning, rug-pulls, rogue servers

The Model Context Protocol made tools pluggable — and made the **tool's own description** part of the prompt. That is a new, under-watched surface.

**Attack.** (a) *Tool poisoning* — a tool's description/schema contains hidden instructions the model reads as guidance. (b) *Rug-pull* — a tool is benign at install, then its description mutates to malicious after it's trusted. (c) *Rogue/compromised server* — calls routed to an MCP endpoint you never vetted. (d) *Confused deputy* — the server uses its own broad credentials on the user's behalf.

**Identify.** Hash every tool's name+description+schema on load and **diff against the pinned hash**; allowlist MCP endpoints and flag calls to anything else; scan tool descriptions for instruction-like text.

**Log.** `event:tool_schema, server:<id>, schema_hash:<h>, pinned:<bool>`; `event:tool_call, server:<id>`; `event:guardrail_verdict, surface:mcp` for description scans.

**Wazuh.**
```xml
  <!-- tool description/schema changed from the pinned version = rug-pull / poisoning -->
  <rule id="100220" level="12">
    <if_sid>100100</if_sid>
    <field name="event">tool_schema</field>
    <field name="pinned">false</field>
    <description>MCP tool schema on $(server) differs from pinned hash — possible rug-pull</description>
    <mitre><id>AML.T0053</id></mitre>
  </rule>
  <!-- call routed to an MCP server not on the allowlist -->
  <rule id="100221" level="13">
    <if_sid>100100</if_sid>
    <field name="event">tool_call</field>
    <field name="server_allowlisted">false</field>
    <description>Agent $(agent) called NON-ALLOWLISTED MCP server $(server)</description>
    <mitre><id>AML.T0053</id></mitre>
  </rule>
```

**Prevent.** Pin tool schemas and fail closed on a hash change; allowlist MCP endpoints; route every MCP call through a gateway that re-authorises against the user context and gives the server its own scoped identity, never a shared one.

## Part 4 — Tool execution: chaining, command injection, SSRF

**Attack.** (a) *Malicious chaining* — individually allowed calls compose into harm (the [lethal trifecta](/blog/stopping-malicious-tool-call-chaining-in-agentic-ai/)). (b) *Parameter injection* — model-generated args carry shell/SQL payloads into a tool. (c) *SSRF* — a fetch tool is pointed at internal metadata endpoints.

**Identify.** Carry data lineage across calls; validate/parameterise tool arguments at the tool, not in the prompt; resolve and allowlist fetch destinations.

**Log.** `event:tool_call` with `lineage_tags`, `action_kind`, `params_flagged`, `dest`.

**Wazuh.**
```xml
  <!-- the decisive link: untrusted data reaching an outbound/irreversible sink -->
  <rule id="100230" level="13">
    <if_sid>100100</if_sid>
    <field name="event">tool_call</field>
    <field name="action_kind">network_send|email|publish|delete|pay|exec</field>
    <field name="lineage_tags" type="pcre2">untrusted</field>
    <description>Untrusted data routed into $(action_kind) by $(agent), run $(run_id) — chaining/exfil</description>
    <mitre><id>AML.T0051</id><id>AML.T0024</id></mitre>
  </rule>
  <!-- fetch tool aimed at internal/metadata ranges -->
  <rule id="100231" level="12">
    <if_sid>100100</if_sid>
    <field name="event">tool_call</field>
    <field name="dest" type="pcre2">(?:169\.254\.169\.254|127\.0\.0\.1|::1|metadata)</field>
    <description>Possible SSRF: $(agent) fetch to internal dest $(dest)</description>
  </rule>
```

**Prevent.** Keep untrusted input and write capability in separate agents so the chain can't complete in one principal; gate irreversible sinks behind parameter-bound, single-use human approval; parameterise tool args; allowlist egress.

## Part 5 — Memory & state: poisoning and cross-session leakage

**Attack.** The agent writes attacker-controlled content into long-term memory, which later runs re-read as trusted instruction or fact; or one user's data bleeds into another's session.

**Identify.** Tag the provenance of every memory write; scope memory reads to the owning user/session; scan memory writes like any other untrusted content.

**Log.** `event:memory_write, source, lineage_tags`; `event:memory_read, owner, requester`.

**Wazuh.**
```xml
  <rule id="100240" level="11">
    <if_sid>100100</if_sid>
    <field name="event">memory_read</field>
    <field name="owner_mismatch">true</field>
    <description>Cross-session memory read: $(agent) read memory owned by another principal</description>
  </rule>
```

**Prevent.** Partition memory by owner, carry provenance, and treat a memory write sourced from untrusted content as untrusted on read-back.

## Part 6 — Inter-agent messaging: spoofing and lateral movement

**Attack.** A compromised agent abuses its pre-existing trust with peers to pivot — no credential theft, nothing anomalous in identity logs, because the trust was provisioned by design.

**Identify.** Require signed inter-agent messages; **re-authorise each hop against the origin user**, not the calling agent; emit an event per agent-to-agent call with origin context.

**Log.** `event:agent_call, caller, callee, origin_user, reauthorized`.

**Wazuh.**
```xml
  <rule id="100250" level="12">
    <if_sid>100100</if_sid>
    <field name="event">agent_call</field>
    <field name="reauthorized">false</field>
    <description>Inter-agent call $(caller)->$(callee) NOT re-authorised against origin</description>
  </rule>
  <!-- one agent fanning out to many peers fast = lateral movement -->
  <rule id="100251" level="13" frequency="6" timeframe="120">
    <if_matched_sid>100250</if_matched_sid>
    <same_field>caller</same_field>
    <description>Agent $(caller) fanning out across peers — possible lateral movement</description>
  </rule>
```

**Prevent.** One identity per agent, signed messages, mandatory re-authorisation at every hop, and least-privilege edges so the blast radius is a small, known subgraph.

## Part 7 — Model supply chain: poisoned weights

**Attack.** A loaded model file executes code on deserialization or carries a backdoor — [your model file is a code-execution primitive](/blog/your-model-file-is-a-code-execution-primitive/).

**Identify.** Scan model artefacts in the build pipeline; verify provenance/signature; emit an event on every model load with the artefact hash and scan result.

**Log.** `event:model_load, artifact, hash, signed, scan_result`.

**Wazuh.**
```xml
  <rule id="100260" level="14">
    <if_sid>100100</if_sid>
    <field name="event">model_load</field>
    <field name="scan_result">unsafe|unsigned</field>
    <description>Agent loaded UNSAFE/UNSIGNED model artifact $(artifact)</description>
    <mitre><id>AML.T0010</id></mitre>
  </rule>
```

**Prevent.** Pinned, signed, scanned model versions only; fail the load on an unsigned or unscanned artefact.

## Part 8 — Egress & identity: exfiltration and excessive agency

**Attack.** Sensitive data leaves through a sanctioned channel; or a compromised agent uses privileges far beyond its task ([excessive agency](/blog/excessive-agency-is-an-authorisation-bug/)).

**Identify.** Tag `sensitive` data and watch it toward sinks; baseline egress destinations and flag new ones; alert on spikes in policy *denials* — a flood of denies means something is probing the ceiling.

**Log.** policy `event:policy_decision, decision:deny, reason`; `event:tool_call, dest, lineage_tags:sensitive`.

**Wazuh.**
```xml
  <!-- sensitive data toward egress -->
  <rule id="100270" level="12">
    <if_sid>100100</if_sid>
    <field name="event">tool_call</field>
    <field name="action_kind">network_send|email|publish</field>
    <field name="lineage_tags" type="pcre2">sensitive</field>
    <description>Sensitive data heading to $(action_kind) via $(dest) in run $(run_id)</description>
    <mitre><id>AML.T0024</id></mitre>
  </rule>
  <!-- burst of policy denials = probing the agency ceiling -->
  <rule id="100271" level="12" frequency="8" timeframe="180">
    <if_sid>100100</if_sid>
    <field name="event">policy_decision</field>
    <field name="decision">deny</field>
    <same_field>agent</same_field>
    <description>Burst of authz denials for $(agent) — probing excessive agency</description>
  </rule>
```

**Prevent.** Egress allowlists, least-privilege per agent, and irreversible-action gates. The denials rule is a gift: it means your [authorisation is doing its job and telling you about it](/blog/open-policy-agent-for-agentic-system-design/).

## Part 9 — Correlate, respond, monitor

**Correlate the chain.** The per-surface rules fire on single events; the value is stitching them by `run_id`. Build composite rules that fire when, in one run, you see an injection verdict *and then* a sensitive-egress call — that pair is a near-certain successful exploit and deserves your highest level:

```xml
  <rule id="100300" level="15">
    <if_sid>100270</if_sid>
    <field name="run_id" type="pcre2">\.+</field>
    <if_matched_sid>100200</if_matched_sid>
    <description>CONFIRMED exploit path: injection then sensitive egress in run $(run_id)</description>
    <mitre><id>AML.T0051</id><id>AML.T0024</id></mitre>
  </rule>
```

**Respond — Active Response.** Trigger containment on high-severity rules. In `ossec.conf`:

```xml
<command>
  <name>quarantine-agent</name>
  <executable>quarantine-agent.py</executable>   <!-- in /var/ossec/active-response/bin/ -->
  <timeout_allowed>no</timeout_allowed>
</command>
<active-response>
  <command>quarantine-agent</command>
  <location>local</location>
  <level>13</level>
</active-response>
```

The script reads the alert JSON on stdin, pulls `data.agent`, and calls your control plane to **revoke that agent's scoped credential or flip its policy to deny-all**. This is surgical only because each agent holds its own identity — you contain one plug, not the switchboard. Route level-15 rules to a SOAR playbook (Shuffle, TheHive) for a human-approved response instead of a reflex.

**Monitor.** In the Wazuh dashboard, pin a view filtered to `rule.groups:agentic_ai`, break it down by `data.agent`, `data.surface` and `rule.mitre.id`, and keep a saved search on `data.run_id` so one click reconstructs a full agent run. Your weekly review question is simple: which agents are generating denials and verdicts, and is any single `run_id` lighting up more than one surface?

## The shape of it

You do not secure an agent by securing its prompt. You secure every socket it plugs into, you emit a structured event at each one, and you give a SIEM the join key to see them as a single story. Wazuh supplies the correlation, the retention, the ATLAS-mapped alerting and the trigger to pull a compromised agent offline. The runtime supplies the truth. Build the contract first, add one rule group per integration, and the day an injection finally lands in a poisoned RAG chunk or a rug-pulled MCP tool, it shows up as a level-15 alert with the whole chain attached — detected, logged, and one active-response script away from contained.
