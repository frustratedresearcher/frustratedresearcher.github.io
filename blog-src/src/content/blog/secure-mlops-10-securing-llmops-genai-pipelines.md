---
title: "Securing LLMOps: the GenAI pipeline from fine-tuning to guardrails"
description: "LLMOps is MLOps with the attack surface turned up: the data stage now includes a live RAG index, the model is a downloaded base you fine-tune, and inference takes untrusted natural language as input. Part 10 — the finale of the Secure MLOps series — maps every earlier stage onto the GenAI pipeline and adds what's new: fine-tuning data poisoning, RAG security, prompt management, guardrails, LLM evals, and the bridge into agentic systems."
pubDate: 2026-09-26
series: "Secure MLOps"
seriesPart: 10
tags: ["Secure MLOps", "LLMOps", "GenAI Security", "RAG Security", "Prompt Injection", "Guardrails", "OWASP LLM Top 10", "AI Security"]
tldr: "LLMOps is the same lifecycle as the rest of this series, but the surface is larger because the model takes untrusted natural language as input and often retrieves live data at inference. Every earlier stage still applies — version and scan fine-tuning data (poisoning is now instruction-shaped), treat the base model as untrusted supply chain, gate promotion on evals, harden the endpoint — plus GenAI-specific controls: secure the RAG pipeline (scan and authorise retrieved content, because a poisoned document is indirect prompt injection), version and review prompts as code, run guardrails on input and output (NeMo Guardrails, Llama Guard), and red-team continuously with PyRIT, Garak and promptfoo against the OWASP LLM Top 10. When the LLM gets tools and autonomy it becomes an agent, where authorisation and tool-call security dominate — the handoff point to the agentic-security series."
faq:
  - q: "How is securing LLMOps different from traditional MLOps?"
    a: "LLMOps follows the same lifecycle but with a larger attack surface, for three reasons: the model takes untrusted natural language as input, so prompt injection becomes a primary threat; it often retrieves live external data at inference via RAG, turning retrieval into an injection and data-leakage surface; and teams usually fine-tune a downloaded base model rather than training from scratch, making base-model supply-chain trust central. Everything from data governance to monitoring still applies — you add RAG security, prompt management, guardrails and LLM-specific red-teaming on top."
  - q: "How do you secure a RAG pipeline?"
    a: "Treat the retrieval corpus as untrusted input, because a poisoned document is indirect prompt injection the moment it's retrieved. Control writes to the index and record provenance on every chunk; scan content on ingest and on retrieval; enforce document-level authorisation so a user only retrieves what they're entitled to (relationship-based access control fits well); and carry provenance so you can trace a bad answer to its source. Secure the vector store itself as a production data asset with access control and monitoring."
  - q: "What are guardrails and where do they go in an LLM pipeline?"
    a: "Guardrails are runtime controls that inspect and constrain LLM inputs and outputs — detecting prompt injection and jailbreaks on input, and filtering unsafe, leaking or policy-violating content on output. They go at both boundaries of the model: before the prompt reaches it and before its output reaches the user or a downstream tool. Tools include NVIDIA NeMo Guardrails and Llama Guard. Guardrails reduce the probability of a bad input or output, so they pair with downstream controls — authorisation and output handling — that reduce the consequence when one gets through."
  - q: "How do you red-team and evaluate an LLM before deployment?"
    a: "Run automated adversarial testing against the OWASP Top 10 for LLM Applications — prompt injection, insecure output handling, sensitive-information disclosure, and the rest — using frameworks like Microsoft PyRIT, Garak and promptfoo, plus agent-injection benchmarks where the LLM uses tools. Make the results a promotion gate the same way accuracy and fairness are gated in CI/CD: a model or prompt change ships only if it clears the red-team and eval suite. Red-teaming is continuous, not one-time, because new jailbreak techniques appear constantly."
---

We end where most teams are actually standing right now. LLMOps isn't a different discipline from everything in Parts 1–9 — it's the **same lifecycle with the attack surface turned up**, because of three changes that ripple through every stage:

1. The model takes **untrusted natural language** as input — so prompt injection is a primary threat, not an edge case.
2. It often **retrieves live external data at inference** (RAG) — turning retrieval into an injection and leakage surface.
3. You usually **fine-tune a downloaded base model**, not train from scratch — so base-model supply-chain trust is central.

So this finale does two things: shows how each earlier stage *maps onto* the GenAI pipeline, and covers what's genuinely new.

## The lifecycle, re-read for LLMs

- **Data ([Part 2](/blog/secure-mlops-02-securing-the-data-layer/)):** fine-tuning and instruction data still needs provenance, versioning and poisoning defence — but poisoning is now **instruction-shaped** (a few malicious examples can install a behaviour or backdoor trigger in instruction-tuning). Version it, scan it, bound untrusted sources.
- **Training/fine-tuning ([Part 3](/blog/secure-mlops-03-securing-the-training-pipeline/)):** the base model is **untrusted supply chain** — scan the file (pickle RCE) *and* screen the behaviour (backdoors survive fine-tuning). Isolate the fine-tune job; record the five inputs.
- **Artifact ([Part 4](/blog/secure-mlops-04-ml-supply-chain-artifacts/)):** prefer safetensors; sign the fine-tuned model; MLBOM records the **base model** and its origin — the base is your biggest single supply-chain dependency.
- **CI/CD ([Part 5](/blog/secure-mlops-05-secure-cicd-for-ml/)):** the promotion gate now also requires the **LLM eval + red-team** suite to pass (below), alongside signing and provenance.
- **Deployment ([Part 6](/blog/secure-mlops-06-securing-deployment-inference/)):** endpoint hardening still applies, plus the model takes language, so guardrails join input validation.
- **Infra, monitoring, governance (Parts [7](/blog/secure-mlops-07-identity-secrets-infrastructure/)–[9](/blog/secure-mlops-09-governance-risk-compliance/)):** unchanged in principle — scoped identity, SIEM, NIST AI RMF — with cost added as a signal, because [LLM cost is a security control](/blog/llm-cost-is-a-security-control/).

Now the four GenAI-specific controls.

## 1. Secure the RAG pipeline

RAG makes the retrieval corpus part of the prompt — which means **a poisoned document is indirect prompt injection** the moment it's retrieved, and an over-permissive retrieval is a data-leakage channel. Treat the corpus as untrusted input:

- **Control and attribute writes** to the index; record provenance on every chunk.
- **Scan content on ingest *and* on retrieval** — the retrieval-time scan is the one teams skip, and it's the one that catches a document poisoned after ingest.
- **Enforce document-level authorisation** so a user retrieves only what they're entitled to — [relationship-based access control](/blog/rbac-abac-rebac-for-agentic-systems/) fits retrieval naturally.
- **Secure the vector store** as a production data asset: access control, monitoring, provenance (it's an asset in [Part 8](/blog/secure-mlops-08-mlsecops-monitoring-incident-response/)'s inventory).

## 2. Manage prompts as code

The system prompt is production configuration that shapes behaviour and encodes guardrails — treat it like code, not a string someone edits live:

- **Version** prompts, **review** changes, and **roll back** like any deploy.
- **Gate** prompt changes through the same eval/red-team suite as model changes — a prompt edit can regress safety as badly as a model swap.
- Keep secrets and sensitive instructions **out** of prompts that could be leaked via injection.

## 3. Run guardrails on input and output

Guardrails are runtime controls at **both boundaries** of the model:

- **Input:** detect prompt injection and jailbreaks before the prompt reaches the model.
- **Output:** filter unsafe, policy-violating, or sensitive-data-leaking responses before they reach the user or a downstream tool.

**Tools:** NVIDIA NeMo Guardrails, Llama Guard. The honest framing (same as everywhere in AI security): guardrails reduce the *probability* of a bad input or output getting through — they don't eliminate it. So they pair with **consequence-reducing** controls downstream: strict output handling (never trust LLM output as code/SQL/HTML without validation — OWASP LLM insecure output handling) and, once tools are involved, authorisation.

## 4. Red-team and evaluate against the OWASP LLM Top 10

Make adversarial testing a **promotion gate**, exactly like accuracy and fairness in [Part 5](/blog/secure-mlops-05-secure-cicd-for-ml/):

- Test against the **OWASP Top 10 for LLM Applications** — prompt injection, insecure output handling, sensitive-information disclosure, excessive agency, and the rest.
- **Tools:** Microsoft PyRIT, Garak, promptfoo — automated adversarial suites that run in CI; agent-injection benchmarks (AgentDojo) once tools are in play.
- **Continuous**, not one-time — new jailbreak techniques appear weekly, so the suite runs on a schedule against production ([Part 8](/blog/secure-mlops-08-mlsecops-monitoring-incident-response/)), not just at release.

## The bridge: when the LLM gets tools, it's an agent

Here is the handoff. The moment you give the LLM **tools and autonomy** — let it call APIs, query systems, act — the dominant risk shifts from "what does it say" to **"what does it do."** Prompt injection stops being a content problem and becomes a path to real actions, and the controls that matter most become authorisation, tool-call security and blast-radius limits. That's a whole discipline of its own, and it's the subject of my agentic-security series:

- [Excessive agency is an authorisation bug](/blog/excessive-agency-is-an-authorisation-bug/) — why the permission grant, not the jailbreak, sets severity.
- [Open Policy Agent for agentic systems](/blog/open-policy-agent-for-agentic-system-design/) — enforcing authorisation outside the model.
- [RBAC, ABAC, ReBAC for agents](/blog/rbac-abac-rebac-for-agentic-systems/) — the right authorisation model for a principal that acts on your behalf.
- [Stopping malicious tool-call chaining](/blog/stopping-malicious-tool-call-chaining-in-agentic-ai/) and [wiring it all into Wazuh](/blog/wazuh-siem-for-agentic-ai-attack-detection/).

## The LLMOps-stage checklist

- Fine-tuning data versioned, scanned, poisoning-bounded; base model scanned (format) and screened (behaviour).
- Fine-tuned model signed; MLBOM records the base model and its origin.
- RAG corpus treated as untrusted: write control, ingest+retrieval scanning, document-level authz, secured vector store.
- Prompts versioned, reviewed, rolled back, and eval-gated like code; no secrets in leakable prompts.
- Guardrails on input and output (NeMo/Llama Guard), paired with strict output handling.
- OWASP LLM Top 10 red-team + eval suite (PyRIT/Garak/promptfoo) as a promotion gate and a continuous production check.
- When tools are added: shift to agentic-security controls — external authz, least-privilege tools, chaining defence, SIEM.

## That's the series

Ten stages, one spine: **a security control at every stage of the ML lifecycle, owned and monitored, proven by governance.** From a raw dataset to a governed, monitored, recoverable production system — and, when it grows tools, into an agent you secure the same disciplined way. Start again at [Part 1](/blog/secure-mlops-01-lifecycle-threats-frameworks/) with the map, or take the one checklist your pipeline is missing and go build it. The point was never to read the series — it was to look at your own pipeline and finally see, stage by stage, where you have no control at all, and then put one there.
