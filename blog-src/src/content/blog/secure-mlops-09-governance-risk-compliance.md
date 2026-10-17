---
title: "Governance, risk and compliance for ML systems"
description: "Technical controls fix a problem once; governance keeps them true over time and proves it to anyone who asks. Part 9 of the Secure MLOps series covers the management layer: NIST AI RMF as the operating function, ISO/IEC 42001 and the EU AI Act as the standards and law, model cards and datasheets as the documentation, and the risk register, audit trail and third-party model risk that turn a pile of controls into a programme."
pubDate: 2026-09-24
series: "Secure MLOps"
seriesPart: 9
tags: ["Secure MLOps", "AI Governance", "NIST AI RMF", "ISO 42001", "EU AI Act", "Model Cards", "Compliance", "AI Security"]
tldr: "Governance is what keeps the other eight stages from decaying into a one-time project. Run the programme on NIST AI RMF's four functions — Govern, Map, Measure, Manage — which turn scattered controls into owned, measured, repeating work. Prove it with the standards: ISO/IEC 42001 is the certifiable AI management system, and the EU AI Act sets legal obligations that scale with risk tier (prohibited / high-risk / limited / minimal), so classify each system and meet the duties for its tier. Document with model cards (model purpose, limits, eval and risk) and datasheets (dataset composition and provenance). Keep a risk register mapping each ML risk to its owner and control, an audit trail (provenance, MLBOM, decision logs already produced upstream), and a third-party/model-supply-chain risk process for every base model and dataset you didn't build. Governance is also ownership: every stage in this series needs a named owner, or the seams between teams stay unguarded."
faq:
  - q: "What is the NIST AI Risk Management Framework and how do you use it?"
    a: "The NIST AI RMF is a voluntary framework for managing AI risk, organised around four functions: Govern (set policy, roles, culture and accountability), Map (identify context and risks of each AI system), Measure (assess and track those risks with metrics and testing), and Manage (prioritise, treat and monitor them). You use it as the operating model for your AI security programme — it turns the technical controls from the rest of the lifecycle into owned, measured, repeating work, and its profiles let you tailor the framework to your sector and systems."
  - q: "What is ISO/IEC 42001 and do I need it?"
    a: "ISO/IEC 42001 is the international standard for an AI management system (AIMS) — the AI equivalent of ISO 27001 for information security — and it is certifiable, meaning an external auditor can verify your management system exists and operates. You need it when customers, regulators or partners require demonstrable AI governance, or when you want an auditable structure for managing AI risk across the organisation. Where NIST AI RMF is a voluntary framework you adopt internally, ISO 42001 is the certifiable standard you can be assessed against."
  - q: "How does the EU AI Act affect MLOps?"
    a: "The EU AI Act regulates AI by risk tier: some uses are prohibited, high-risk systems carry substantial obligations (risk management, data governance, technical documentation, logging, human oversight, accuracy and robustness), limited-risk uses have transparency duties, and minimal-risk uses are largely unregulated. For MLOps it means you must classify each system's tier and, for high-risk systems, produce and maintain much of what this series already builds — documented risk management, data governance, traceability and monitoring — as a legal obligation rather than a best practice."
  - q: "What are model cards and datasheets, and why do they matter for security?"
    a: "A model card documents a model's intended purpose, performance, limitations, evaluation results and known risks; a datasheet (datasheet for datasets) documents a dataset's composition, collection, provenance and appropriate uses. They matter for security and compliance because they make a model's risk profile explicit and auditable: reviewers, regulators and downstream users can see what the model is for, where it fails, and what data shaped it. They are the human-readable layer over the machine-readable provenance and MLBOM produced upstream."
---

Eight parts of technical controls, and here's the uncomfortable thing about all of them: **a control fixes a problem once.** The scanner you added, the gate you wrote, the drift monitor you deployed — each decays the moment attention moves on, unless something keeps it true. That something is governance. It is also the thing that answers the question every regulator, customer and board eventually asks: *prove it.*

Governance is the management layer wrapped around the whole pipeline (the outer box in [Part 1's diagram](/blog/secure-mlops-01-lifecycle-threats-frameworks/)). It has four jobs: **run the programme, meet the standards, document the systems, and own the risk.**

## 1. Run the programme: NIST AI RMF

Don't invent an operating model — use the **NIST AI Risk Management Framework** and its four functions. They're what turn the scattered controls of Parts 2–8 into a programme that repeats:

- **Govern** — policy, roles, accountability, culture. *Who owns AI risk, and what are the rules?* This is where the per-stage ownership below gets assigned.
- **Map** — identify each AI system's context, purpose and risks. *What do we have, and what can go wrong with it?*
- **Measure** — assess and track risks with metrics and testing. *How bad, and is it getting better or worse?* (Your red-teaming and monitoring from Part 8 feed this.)
- **Manage** — prioritise, treat and monitor. *What are we doing about it, in what order?*

NIST AI RMF **profiles** let you tailor this to your sector and systems. Run it on a cadence, not once — that cadence is the thing that stops the controls rotting.

## 2. Meet the standards: ISO 42001 and the EU AI Act

NIST AI RMF is what you *do*; standards and law are what you're *held to*.

- **ISO/IEC 42001** — the certifiable AI management system (AIMS), the AI analogue of ISO 27001. Where NIST is voluntary, ISO 42001 is auditable: an external assessor verifies your management system exists and works. Pursue it when customers, partners or regulators want demonstrable governance.
- **EU AI Act** — regulation by **risk tier**: *prohibited*, *high-risk*, *limited*, *minimal*. The obligations scale with tier, and for **high-risk** systems they're substantial — risk management, data governance, technical documentation, logging/traceability, human oversight, accuracy and robustness. The MLOps consequence is concrete: **classify every system's tier**, and for high-risk ones, much of what this series already produces (documented risk management, data governance, provenance, monitoring) becomes a **legal requirement**, not a nice-to-have. Build the pipeline right and you're most of the way to compliant; bolt it on later and it's a scramble.

Sector regimes (healthcare, finance) layer on top — map them in the same risk register.

## 3. Document the systems: model cards and datasheets

Governance you can't read, you can't audit. Two documents make a system's risk profile explicit:

- **Model cards** — purpose, performance, **limitations**, evaluation results, known risks, appropriate and inappropriate uses. The honest "here's what this model is for and where it fails."
- **Datasheets for datasets** — composition, collection method, provenance, consent/lawful basis, appropriate uses.

These are the **human-readable layer** over the machine-readable [provenance and MLBOM from Part 4](/blog/secure-mlops-04-ml-supply-chain-artifacts/) — same facts, told to a reviewer or regulator. Generate them as part of the pipeline so they're never stale.

## 4. Own the risk: register, audit trail, third-party risk

- **Risk register.** Every ML risk mapped to an **owner** and a **control** — this is what makes risk management real instead of rhetorical. Tie each entry to its OWASP ML / ATLAS identifier so the register speaks the same language as the technical work.
- **Audit trail.** You've already produced it: build provenance, MLBOMs, signed promotions, policy-gate decisions, SIEM logs. Governance's job is to make it **retained, queryable and tied to each system**, so "show me how this model was built and governed" is a query, not an archaeology project.
- **Third-party and model-supply-chain risk.** Almost every system now builds on a base model or dataset you didn't make. Each one is third-party risk: assess its provenance, licence, known issues and trustworthiness before adoption, record it in the MLBOM, and re-assess when it's found compromised. The OWASP **ML06** supply-chain risk is a *governance* process as much as a technical scan.

## The one that isn't on any framework: ownership

The quiet failure mode of Secure MLOps isn't a missing control — it's a **missing owner**. The pipeline crosses data engineering, data science, ML engineering, platform and security, and the poisoned dataset and unsigned artifact fall in the *seams between teams*. Governance's most important, least glamorous output is a table: **every stage in this series, with a named owner.** Without it, each team assumes another is handling the seam, and nobody is.

## The governance-stage checklist

- The programme runs on NIST AI RMF (Govern/Map/Measure/Manage) on a cadence, with profiles tailored to your context.
- Every system is classified for EU AI Act risk tier; high-risk ones meet their documentation, logging, oversight and robustness duties.
- ISO 42001 pursued where demonstrable governance is required.
- Every model has a current model card; every dataset a datasheet — generated by the pipeline.
- A risk register maps each ML risk (OWASP ML / ATLAS tagged) to an owner and control.
- Audit trail (provenance, MLBOM, gate decisions, SIEM logs) retained, queryable, tied to each system.
- Third-party models/datasets are risk-assessed, recorded in the MLBOM, and re-assessed on new findings.
- **Every lifecycle stage has a named owner.**

Governance ties the eight technical stages into a programme that survives contact with time and auditors. One stage remains — the one most teams are building *right now*, where the whole lifecycle takes on a new shape. [Part 10](/blog/secure-mlops-10-securing-llmops-genai-pipelines/): securing LLMOps, from fine-tuning data to RAG to guardrails, and the bridge into agentic systems.
