---
title: "An agentic AI red team checklist: 222 tests, WSTG-style"
description: "A forced-order, 222-test checklist for authorized agentic AI engagements — 20 categories from recon to voice, each test mapped to OWASP ASI, the LLM Top 10, the MCP Top 10 and a MITRE ATLAS tactic, with how-to-test, tools and a detection mode. Free download, built to work top-to-bottom like the OWASP WSTG."
pubDate: 2026-10-08
tags: ["Agentic AI", "AI Red Teaming", "Penetration Testing", "MITRE ATLAS", "OWASP", "Checklist"]
tldr: "Agentic engagements fail by omission — the team tests prompt injection thoroughly and never checks the MLflow server, the IMDS endpoint or the vector store's tenant filter. This checklist fixes that with 222 tests across 20 categories in forced engagement order (recon → infra → cloud → supply chain → input → injection → output → tools → agency → memory → mesh → MCP → CI/CD → privesc → lateral → exfil → DoS → integrity → voice). Every row carries a framework ID, a MITRE ATLAS tactic, a how-to-test, tools, and a detection mode so you can prove the finding. Download it, work it top to bottom, mark status per row."
faq:
  - q: "What is the agentic AI red team checklist?"
    a: "A spreadsheet of 222 test cases for authorized security assessment of agentic AI platforms, structured like the OWASP Web Security Testing Guide: categorized tests, each with an objective, how-to-test steps, tools, expected outcome, severity, and a detection mode. It spans 20 categories from reconnaissance through tool execution, memory and RAG, agent mesh, MCP servers, to voice and multimodal input."
  - q: "How is it different from just testing prompt injection?"
    a: "Prompt injection is one of 20 categories. The checklist deliberately forces coverage of the infrastructure an agentic system actually runs on — MLflow and orchestration servers, cloud instance metadata and IAM, the model weight load path, the vector store's tenant isolation, inter-agent message buses, MCP servers — which is where the critical-severity findings concentrate and which prompt-focused testing misses entirely."
  - q: "Which frameworks does it map to?"
    a: "Every test is tagged to OWASP's Agentic Security Initiative threats (ASI01 to ASI10), the OWASP Top 10 for LLM Applications (LLM01 to LLM10), the OWASP MCP Top 10 (MCP01 to MCP10) where relevant, OWASP ML06:2023 for supply chain, and a MITRE ATLAS tactic. That lets you slice the sheet by framework to produce coverage reports against whichever standard a client asks for."
  - q: "What does the detection mode column mean?"
    a: "It tells you how to prove the finding. Reflective means the result is echoed back in the response. Blind means you confirm via timing, behaviour or a state change. OOB means an out-of-band callback to a listener you control. The guidance is to mark a finding Confirmed only with Reflective or OOB evidence; Blind-only evidence is Probable."
  - q: "Can I use this on any AI system?"
    a: "Only on systems you are explicitly authorized to test. This is engagement tooling for pentesters and internal red teams with a scope agreement in place. Running these tests — cloud credential theft via IMDS, pickle deserialization RCE, tenant isolation bypass — against a system you do not have written permission to assess is illegal."
---

The way agentic AI engagements fail is not dramatic. The team spends three days on prompt injection, writes it up well, and never touches the MLflow server sitting unauthenticated on an internal port. Or the IMDS endpoint the agent's compute node can reach. Or the one missing `tenant_id` filter in the vector store that returns every other customer's documents.

Those are the critical findings. They get missed because nobody held a list.

So I built the list. It is 222 tests across 20 categories, structured like the [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/) — forced order, categorized, each test carrying an objective, how-to-test steps, tools, expected outcome, severity and a detection mode. It is free, it is a spreadsheet, and it is built to be worked top to bottom.

<p style="margin:28px 0"><a href="/blog/Agentic-AI-Red-Team-Checklist.xlsx" download style="display:inline-block;border:1px solid var(--amber);color:var(--amber);padding:11px 20px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:.9rem;font-weight:700">↓ download the checklist (.xlsx, 222 tests)</a></p>

## Why forced order matters

Coverage tools fail in two directions: you skip something because you forgot it exists, or you test things in an order that wastes the access you already have.

The checklist follows the real shape of an engagement:

<figure class="fig">
<div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>engagement-flow — 20 categories</div>
<div class="body">
<svg viewBox="0 0 860 300" role="img" aria-label="Engagement flow across twenty test categories grouped into four phases">
<text class="svg-amber" x="24" y="24">MAP THE SURFACE</text>
<rect class="svg-node" x="24" y="36" width="150" height="34" rx="4"/><text class="svg-label-sm" x="34" y="57">1 Recon &amp; Discovery</text>
<rect class="svg-node" x="24" y="76" width="150" height="34" rx="4"/><text class="svg-label-sm" x="34" y="97">2 Orchestration / MLOps</text>
<rect class="svg-node" x="24" y="116" width="150" height="34" rx="4"/><text class="svg-label-sm" x="34" y="137">3 Cloud &amp; Identity</text>
<rect class="svg-node" x="24" y="156" width="150" height="34" rx="4"/><text class="svg-label-sm" x="34" y="177">4 Model &amp; Supply Chain</text>
<text class="svg-amber" x="214" y="24">GET IN</text>
<rect class="svg-node-hot" x="214" y="36" width="150" height="34" rx="4"/><text class="svg-label-sm" x="224" y="57">5 Interface &amp; Ingestion</text>
<rect class="svg-node-hot" x="214" y="76" width="150" height="34" rx="4"/><text class="svg-label-sm" x="224" y="97">6 Prompt Injection</text>
<rect class="svg-node" x="214" y="116" width="150" height="34" rx="4"/><text class="svg-label-sm" x="224" y="137">7 System Prompt Leak</text>
<rect class="svg-node-hot" x="214" y="156" width="150" height="34" rx="4"/><text class="svg-label-sm" x="224" y="177">8 Improper Output</text>
<text class="svg-amber" x="404" y="24">ABUSE CAPABILITY</text>
<rect class="svg-node-hot" x="404" y="36" width="150" height="34" rx="4"/><text class="svg-label-sm" x="414" y="57">9 Tool Execution</text>
<rect class="svg-node-hot" x="404" y="76" width="150" height="34" rx="4"/><text class="svg-label-sm" x="414" y="97">10 Excessive Agency</text>
<rect class="svg-node-hot" x="404" y="116" width="150" height="34" rx="4"/><text class="svg-label-sm" x="414" y="137">11 Memory / RAG</text>
<rect class="svg-node-hot" x="404" y="156" width="150" height="34" rx="4"/><text class="svg-label-sm" x="414" y="177">12 Agent Mesh</text>
<rect class="svg-node-hot" x="404" y="196" width="150" height="34" rx="4"/><text class="svg-label-sm" x="414" y="217">13 MCP Servers / Skills</text>
<text class="svg-amber" x="594" y="24">ESCALATE &amp; IMPACT</text>
<rect class="svg-node" x="594" y="36" width="150" height="34" rx="4"/><text class="svg-label-sm" x="604" y="57">14 CI/CD &amp; DevOps</text>
<rect class="svg-node-hot" x="594" y="76" width="150" height="34" rx="4"/><text class="svg-label-sm" x="604" y="97">15 Privilege Escalation</text>
<rect class="svg-node-hot" x="594" y="116" width="150" height="34" rx="4"/><text class="svg-label-sm" x="604" y="137">16 Lateral &amp; Persistence</text>
<rect class="svg-node-hot" x="594" y="156" width="150" height="34" rx="4"/><text class="svg-label-sm" x="604" y="177">17 Data Exfiltration</text>
<rect class="svg-node" x="594" y="196" width="150" height="34" rx="4"/><text class="svg-label-sm" x="604" y="217">18 Unbounded / DoS</text>
<rect class="svg-node" x="594" y="236" width="150" height="34" rx="4"/><text class="svg-label-sm" x="604" y="257">19 Integrity / Rogue</text>
<rect class="svg-node" x="214" y="196" width="150" height="34" rx="4"/><text class="svg-label-sm" x="224" y="217">20 Voice &amp; Multimodal</text>
<path class="svg-edge" d="M174 53 L212 53" marker-end="url(#fa)"/>
<path class="svg-edge" d="M364 95 L402 95" marker-end="url(#fa)"/>
<path class="svg-edge" d="M554 95 L592 95" marker-end="url(#fa)"/>
<defs><marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#3a4650"/></marker></defs>
<text class="svg-label-sm" x="24" y="294">amber = where critical/high severity concentrates</text>
</svg>
</div>
<figcaption><b>Four phases, twenty categories.</b> Map the surface before you touch the model; escalate only once you have capability. The order is the point — it mirrors how access actually compounds.</figcaption>
</figure>

If you jump straight to prompt injection — which is where most agentic testing starts and stops — you have skipped the four recon-and-infrastructure categories that tell you what the injection can *reach*. A prompt injection that can call a tool bound to an over-permissioned cloud role is a different finding from one that can only produce rude text. You cannot grade the first without having done the cloud and tool-scope work first.

## Every row is a provable test

The point of WSTG-style structure is that a test is not a vibe. Each of the 222 rows gives you enough to execute and enough to prove. A representative row:

| Field | Example (`AI-MEM-001`) |
|---|---|
| Category | Memory &amp; RAG / Vector DB |
| Test | Tenant isolation bypass — drop the `tenant_id` filter |
| Target node/edge | Memory Node / Data Edge (RAG retrieval) |
| Framework | `LLM08` Vector &amp; Embedding Weaknesses |
| ATLAS tactic | Collection |
| Detection mode | Reflective \| Blind |
| Severity | Critical |

The **detection mode** column is the part most checklists omit and the part that decides whether your report survives review:

- **Reflective** — the result is echoed in the response. You can see it.
- **Blind** — you confirm by timing, behaviour or a state change. Nothing is echoed.
- **OOB** — an out-of-band callback to a listener you control (Burp Collaborator, your own DNS/HTTP endpoint).

The rule baked into the sheet: mark a finding **Confirmed only with Reflective or OOB evidence**. Blind-only evidence is **Probable**, not confirmed. That single discipline is the difference between a finding a client accepts and one they dispute.

## Where the severity actually sits

The distribution is the argument for testing infrastructure, not just the model:

- **75 Critical**, **108 High**, 30 Medium, 9 Low.

The Critical findings cluster in exactly the categories prompt-focused testing skips — cloud credential theft via `IMDSv1` SSRF (`AI-CLD-001`), pickle deserialization RCE on the weight load path (`AI-MDL-001`), unsafe tool composition that chains read to exfil (`AI-TOL-001`), tenant isolation bypass in the vector store (`AI-MEM-001`), inter-agent message spoofing (`AI-MSH-001`), and confused-deputy delegation abuse (`AI-PRIV-001`).

Every one of those lives at a trust boundary, not in the model. If you have read the [six trust boundaries](/blog/threat-modeling-agentic-orchestration/) post, this checklist is the operational counterpart: that post tells you where to look, this one tells you what to run when you get there.

## How to approach an engagement with it

**Scope first, honestly.** The Critical tests are genuinely destructive — credential theft, RCE, cross-tenant reads. Your scope agreement has to name them explicitly, and some belong only in a staging environment. Mark anything out-of-scope as `N/A` in the Status column before you start, so the gap is a decision on the record rather than an omission.

**Work top to bottom, and let recon pay for the rest.** The first four categories build the asset and capability map that every later test reads from. Resist starting at category 6 because it is the fun one.

**Mark status per row** — Not Started / In Progress / Passed / Failed / Blocked / N/A — and put evidence in `Notes_Evidence`: the screenshot name, the Burp or Collaborator log reference, the canary value you used. The sheet is also your report's evidence index.

**Slice by framework for the write-up.** The autofilter lets you pull every `ASI03` test, or every `LLM01`, and report coverage against whatever standard the client asked for. The mappings are there precisely so you are not re-tagging findings by hand at report time.

**Do not hard-code CVE numbers.** The checklist deliberately avoids them — attack *classes* are stable, specific CVE IDs rot. Verify against current CVE/NVD before citing a specific identifier in a report. (The same trap I flagged when a dead `AML.T0104` kept showing up in secondary write-ups: cite the thing that is still true.)

## Use it, fork it, tell me what is missing

It is a first version. Twenty categories is broad coverage, but agentic architectures are moving fast and the MCP and agent-mesh categories especially will grow. If you run it on a real engagement and hit a case it does not cover, that gap is worth more to me than any praise — send it.

<p style="margin:28px 0"><a href="/blog/Agentic-AI-Red-Team-Checklist.xlsx" download style="display:inline-block;border:1px solid var(--amber);color:var(--amber);padding:11px 20px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:.9rem;font-weight:700">↓ download the checklist (.xlsx, 222 tests)</a></p>

---

<p class="footnote"><b>Authorized use only.</b> This is engagement tooling. Every test assumes a written scope agreement with the system owner. Several — IMDS credential theft, deserialization RCE, tenant isolation bypass — are criminal offences run against a system you do not have permission to assess. The checklist maps to OWASP's Agentic Security Initiative, the OWASP Top 10 for LLM Applications, the OWASP MCP Top 10, OWASP ML06:2023 and MITRE ATLAS; framework numbering shifts between versions, so confirm the current IDs before citing them in a formal report. CVE identifiers are deliberately omitted — verify against NVD at report time.</p>
