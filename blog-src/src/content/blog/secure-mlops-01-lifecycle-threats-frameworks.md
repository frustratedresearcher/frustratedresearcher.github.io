---
title: "Secure MLOps, end to end: the lifecycle, the threats, the frameworks"
description: "Most ML security advice is a pile of tips with no spine. This is the spine: the MLOps lifecycle drawn as a pipeline, the attack that hits each stage, and the frameworks that name them — OWASP ML Top 10, MITRE ATLAS, NIST AI RMF, ISO 42001. Part 1 of a complete Secure MLOps series that walks every stage from data to decommission."
pubDate: 2026-09-08
series: "Secure MLOps"
seriesPart: 1
tags: ["Secure MLOps", "MLSecOps", "AI Security", "MITRE ATLAS", "NIST AI RMF", "OWASP ML Top 10", "Threat Modeling"]
tldr: "An ML system is a pipeline — data, training, artifact, CI/CD, deployment, monitoring — wrapped in governance, and each stage has a distinct attack surface that generic AppSec misses. Secure MLOps (MLSecOps) means putting a control at every stage instead of bolting a scanner onto the end. Map the surface with four complementary frameworks: OWASP ML Top 10 for the vulnerability classes, MITRE ATLAS for machine-readable adversary techniques, NIST AI RMF for the risk-management function, and ISO/IEC 42001 for the management system. This series walks every stage; this part is the map you hang the rest on."
faq:
  - q: "What is Secure MLOps (MLSecOps)?"
    a: "Secure MLOps, often called MLSecOps, is the practice of embedding security controls into every stage of the machine-learning lifecycle — data sourcing, training, model packaging, CI/CD, deployment, inference and monitoring — rather than treating ML as ordinary software and scanning only the application code. It exists because ML systems have attack surfaces conventional AppSec does not cover: data poisoning, model serialization exploits, model theft, membership inference and adversarial inputs, among others."
  - q: "Which frameworks should I use to secure an ML pipeline?"
    a: "Use four together, because they answer different questions. OWASP Machine Learning Security Top 10 enumerates the vulnerability classes. MITRE ATLAS gives machine-readable adversary tactics and techniques that integrate with detection engineering. NIST AI Risk Management Framework provides the Govern-Map-Measure-Manage function for organising risk work. ISO/IEC 42001 is the certifiable AI management system standard for governance at the organisation level. OWASP and ATLAS are the technical taxonomies; NIST AI RMF and ISO 42001 are the management overlays."
  - q: "How is securing an ML system different from securing normal software?"
    a: "A normal application's behaviour is defined by its code; an ML system's behaviour is defined largely by its data and learned weights, which are attacker-influenceable in ways source code is not. That adds stages with no software analogue — training, model packaging, inference — and threats with no software analogue — data poisoning, backdoored weights, model extraction, adversarial examples, membership inference. You still do all your usual AppSec, then add a control at each ML-specific stage."
  - q: "Where do the biggest ML security risks actually sit?"
    a: "At the stages teams instrument least: the data supply chain (poisoning is cheap and quiet), the model artifact (a pickle-based model file is a code-execution primitive), and inference (where theft, inversion and adversarial inputs all live and where the model is most exposed). Training and CI/CD are where integrity is won or lost, and governance is what keeps any of it true over time."
---

Ask ten teams how they secure their ML systems and you get ten piles of tips — scan the container, rotate the key, maybe someone read about adversarial examples once. A pile of tips is not a security programme. It has no spine, so it has no way of telling you what you *missed*.

This series gives it a spine. The insight is simple and it organises everything: **an ML system is a pipeline, and security is a control at every stage of it, not a scan at the end.** Draw the pipeline, put a control on each stage, and "what did we miss" becomes a question with an answer.

## The lifecycle, drawn as a pipeline

Every ML system, from a fraud model to a fine-tuned LLM, flows through the same stages. Each one is a stop in this series:

```
            ┌─────────────────────  GOVERNANCE  ─────────────────────┐
            │  (NIST AI RMF · ISO 42001 · model cards · audit)        │
  DATA ──▶ TRAINING ──▶ ARTIFACT ──▶ CI/CD ──▶ DEPLOY/SERVE ──▶ MONITOR
   │         │            │           │           │               │
  poison   backdoor    pickle RCE   pipeline    extraction      drift /
  PII      non-repro   unsigned     tamper      inversion       adversarial
  lineage  secrets     MLBOM        policy gate  adversarial    detection→SIEM
```

The thing to notice: the attack at each stage is *specific to that stage*, and mostly invisible to the controls on the others. A perfect container scan does nothing about a poisoned training set. A signed artifact does nothing about a model-extraction attack at inference. Defence in depth here is literal — one control per stage, because no stage protects its neighbours.

What makes this different from ordinary AppSec is worth stating once, plainly: **a normal program's behaviour comes from its code; an ML system's behaviour comes from its data and weights.** Code review and SAST govern the first. Nothing in your AppSec toolkit governs the second — and the second is where the attacker reaches. That gap is the entire reason Secure MLOps exists as its own discipline.

## Four frameworks, four different jobs

You do not need to invent the taxonomy. Four bodies of work already map this surface, and they are complementary, not competing — use all four.

**OWASP Machine Learning Security Top 10** — the vulnerability classes. If you know the web Top 10, this is the ML equivalent: input manipulation (ML01), data poisoning (ML02), model inversion (ML03), membership inference (ML04), model theft (ML05), AI supply-chain attacks (ML06), transfer-learning attacks (ML07), model skewing (ML08), output integrity (ML09), model poisoning (ML10). This is your checklist of *what can go wrong*. We hit each item at the stage it lives.

**MITRE ATLAS** — the adversary's playbook, made machine-readable. ATLAS is ATT&CK for AI: tactics and techniques (with IDs like `AML.T0020` poison training data, `AML.T0024` exfiltration via inference API, `AML.T0010` ML supply-chain compromise) that drop straight into detection engineering. This is *how attacks are actually carried out*, in a vocabulary your SOC already speaks — which is exactly why the [monitoring stage routes alerts tagged with ATLAS IDs](/blog/wazuh-siem-for-agentic-ai-attack-detection/).

**NIST AI Risk Management Framework** — the management function. Its four functions — **Govern, Map, Measure, Manage** — are how you turn a list of threats into an actual programme with owners, metrics and a cadence. OWASP and ATLAS tell you what to defend; NIST AI RMF tells you how to run the defending.

**ISO/IEC 42001** — the certifiable AI management system. Where NIST AI RMF is a voluntary framework, ISO 42001 is the auditable standard (think ISO 27001, for AI) that proves to a regulator or customer that the management system exists and operates. We treat it, with the EU AI Act, in the governance part.

A clean way to hold it: **OWASP + ATLAS are the technical map; NIST AI RMF + ISO 42001 are the management overlay.** You need both halves — threats without a management system get fixed once and rot; a management system without the technical taxonomy audits an empty checklist.

## MLSecOps: the one-line definition, and why it's hard

**Secure MLOps is putting a security control at every stage of the ML lifecycle, owned and monitored, instead of bolting a scanner onto the end.** The reason it is hard is not any single control — most of them, individually, are ordinary engineering. It is hard because the pipeline crosses *teams*: data engineers own the data stage, data scientists own training, ML engineers own serving, platform owns CI/CD and infra, and security owns none of it by default. The poisoned dataset and the unsigned artifact fall in the seams between those teams. Secure MLOps is as much about putting an owner on every stage as it is about the controls themselves — which is why it starts with governance and ends with it.

## What the rest of this series covers

Each part takes one stage, and in each one the shape is the same: the attacks that hit it, how to **identify, log and prevent** them, and the concrete tools and frameworks that do the job.

- **Part 2 — Data:** provenance, poisoning defence, PII and governance, versioning.
- **Part 3 — Training:** compute isolation, reproducibility, backdoors, experiment-tracking and secrets.
- **Part 4 — The model artifact & supply chain:** serialization RCE, signing, MLBOM, the registry.
- **Part 5 — CI/CD for ML:** pipeline integrity, policy gates, SLSA provenance.
- **Part 6 — Deployment & inference:** endpoint hardening, model extraction and inversion, adversarial robustness.
- **Part 7 — Identity, secrets & infrastructure:** workload identity, least privilege, tenancy.
- **Part 8 — Monitoring & incident response:** drift, adversarial detection, logging to SIEM, IR.
- **Part 9 — Governance, risk & compliance:** NIST AI RMF, ISO 42001, the EU AI Act, model cards.
- **Part 10 — LLMOps:** the GenAI pipeline — fine-tuning data, RAG, guardrails, evals — and the bridge to agentic systems.

Start at Part 2, or jump to the stage that is on fire. But keep this map open while you read, because the point of the series is the thing a pile of tips can never give you: the ability to look at your own pipeline and see, stage by stage, exactly where you have no control at all.
