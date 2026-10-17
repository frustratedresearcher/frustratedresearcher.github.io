---
title: "Securing the data layer: provenance, poisoning and governance"
description: "The data stage is where ML security is quietly won or lost. Poisoning is cheap, invisible and permanent once it's in the weights; PII mishandling is a breach with a model attached. Part 2 of the Secure MLOps series covers data provenance and lineage, poisoning defences, PII governance and privacy, and the versioning that makes any of it auditable — with the tools that do each job."
pubDate: 2026-09-10
series: "Secure MLOps"
seriesPart: 2
tags: ["Secure MLOps", "Data Poisoning", "Data Provenance", "Data Governance", "PII", "DVC", "AI Security"]
tldr: "Everything downstream inherits the data's integrity, so the data stage is the highest-leverage place to put controls. Four of them: provenance and lineage so you can prove where every training example came from and reproduce the exact set; poisoning defences — source control, anomaly and label-consistency checks, robust statistics — because poisoning is cheap and becomes permanent once trained in; PII and privacy governance — discovery, minimisation, differential privacy — because the model memorises and can leak it; and dataset versioning (DVC, lakeFS) so the data behind any model is pinned, diffable and auditable. Tools: Great Expectations and data-validation for integrity, Presidio for PII, DVC/lakeFS for versioning, CycloneDX for a data bill of materials."
faq:
  - q: "What is data poisoning and why is it so dangerous in ML?"
    a: "Data poisoning is the deliberate corruption of training data to change a model's behaviour — flipping labels, injecting mislabelled samples, or planting a backdoor trigger that causes targeted misclassification. It is dangerous because it is cheap (often a small fraction of the dataset suffices), quiet (the model trains normally and passes accuracy tests), and permanent (once learned, it lives in the weights and survives deployment). It maps to OWASP ML02 and MITRE ATLAS AML.T0020."
  - q: "How do you defend training data against poisoning?"
    a: "Control the supply: prefer trusted, authenticated data sources and sign or hash datasets so tampering is detectable. Validate statistically: run label-consistency and distribution checks, outlier and anomaly detection, and spectral-signature or activation-clustering methods that flag backdoor samples. Constrain trust in scraped or third-party data, which is the usual poisoning vector. And version everything so a poisoned batch can be traced and the model rebuilt from a clean set."
  - q: "How do you handle PII in a machine-learning pipeline?"
    a: "Discover it first — scan datasets for personal data with a tool like Microsoft Presidio — then minimise (don't collect or retain what the task doesn't need), pseudonymise or tokenise where you can, and apply privacy-preserving training such as differential privacy when the model could memorise and leak individuals. Track lawful basis and retention as governance metadata, and remember the trained model itself can be a source of PII leakage via inversion and membership inference, so the model inherits the data's sensitivity classification."
  - q: "Why version datasets, and with what tools?"
    a: "Because a model is only reproducible and auditable if the exact data behind it is pinned. Dataset versioning lets you reproduce a model, diff two training sets to find what changed, roll back a poisoned batch, and prove provenance for compliance. Tools include DVC (git-like versioning for data and pipelines), lakeFS (git-like branching over object storage), and dataset hashing plus a data bill of materials (CycloneDX) to record composition and sources."
---

If you only put a control at one stage of the ML pipeline, put it here. The data stage is upstream of everything, which means **everything downstream inherits whatever integrity the data had** — including none. A poisoned sample you miss at ingest becomes a backdoor in the weights that no amount of endpoint hardening can reach. This is the quietest, cheapest, highest-leverage place an attacker can hit you, and the place most teams instrument least.

Four controls hold the data stage: **provenance, poisoning defence, PII governance, and versioning.** Here's each, with how to identify, prevent, and the tools.

## 1. Provenance and lineage: prove where every example came from

You cannot secure data whose origin you cannot state. Provenance is the record of *where each dataset and example came from, who touched it, and how it was transformed* — and it is the precondition for every other control, because poisoning response, PII governance and reproducibility all start with "trace this back."

**Do this:** attach source metadata to every dataset at ingest (origin, acquisition time, licence, lawful basis, a content hash). Capture lineage through each transformation so a feature traces back to raw inputs. Record it as a **data bill of materials** — CycloneDX supports data components now — so a model's training data has an inventory the way its code has an SBOM.

**Tools:** lineage trackers (OpenLineage / Marquez), DVC's pipeline DAG, feature-store lineage (Feast), and dataset hashing to pin exact content.

## 2. Poisoning defence: the attack that becomes permanent

Data poisoning (OWASP **ML02**, ATLAS **AML.T0020**) is the signature data-stage attack. An attacker corrupts the training set — flipped labels, mislabelled injects, or a **backdoor trigger** (a specific pattern that forces a chosen output) — and the model learns it. What makes it brutal: it's cheap (a small fraction of samples often suffices), it passes your accuracy tests (the model behaves normally except on the trigger), and once trained in it's **permanent** — it lives in the weights.

**Identify / prevent, in layers:**

- **Control the supply.** Prefer authenticated, trusted sources; sign or hash datasets so tampering is detectable. The usual poisoning vector is scraped or third-party data — treat it as untrusted by default and constrain how much it can influence the model.
- **Validate statistically.** Label-consistency checks, class-distribution and drift checks at ingest, outlier/anomaly detection. A poisoning campaign usually leaves a statistical fingerprint if you look.
- **Detect backdoors.** Spectral-signature and activation-clustering methods flag the characteristic separation that trigger samples create in feature space — run them before you trust a model trained on partly-untrusted data (more in [Part 3](/blog/secure-mlops-03-securing-the-training-pipeline/)).
- **Bound the blast radius.** If a batch is later found poisoned, versioning (below) lets you identify every model trained on it and rebuild from clean data.

**Tools:** Great Expectations / TensorFlow Data Validation for distribution and schema checks; Cleanlab for label-quality issues; the IBM Adversarial Robustness Toolbox for poisoning/backdoor defences.

## 3. PII and privacy governance: the model memorises

Personal data in a training set is a double liability: mishandling it at rest is an ordinary breach, and — the part teams forget — **the trained model memorises and can leak it** via model inversion (**ML03**) and membership inference (**ML04**). The model inherits the sensitivity of its data.

**Do this:**

- **Discover.** Scan datasets for personal data before training — **Microsoft Presidio** for detection and anonymisation is the open default.
- **Minimise.** Don't collect or retain what the task doesn't need; the cheapest way to not leak PII is to not have it.
- **De-identify.** Pseudonymise or tokenise; strip direct identifiers where the signal doesn't require them.
- **Train privately when it matters.** Differential privacy (DP-SGD, via Opacus or TensorFlow Privacy) bounds how much any single record can influence the model, which is the principled defence against memorisation — at a measurable accuracy cost you decide on deliberately.
- **Govern.** Record lawful basis, retention and classification as metadata that travels with the dataset into [governance](/blog/secure-mlops-09-governance-risk-compliance/).

## 4. Versioning: without it, nothing above is auditable

A control you can't reproduce is a story, not a control. Dataset versioning pins the *exact* data behind every model, which is what makes poisoning traceable, models reproducible, and provenance provable.

**Do this:** version data and pipelines alongside code. **DVC** gives git-like versioning for datasets and the pipeline DAG; **lakeFS** gives git-style branching and commits over object storage, so you can branch a dataset, validate on the branch, and merge only clean data. Pin a content hash per version so "the model was trained on *this* data" is a verifiable claim, not a hope.

## The data-stage checklist

- Every dataset has a source, a hash, a licence/lawful basis, and lineage — recorded as a data BOM.
- Third-party and scraped data is treated as untrusted; its influence is bounded and validated.
- Ingest runs distribution, label-consistency and anomaly checks; partly-untrusted training data gets backdoor screening.
- PII is discovered, minimised, de-identified, and — where memorisation is a risk — trained under differential privacy.
- Data and pipelines are versioned (DVC/lakeFS) so any model's training set is pinned, diffable and rebuildable.

Get this stage right and the rest of the pipeline is defending a sound foundation. Get it wrong and every later control is polishing a model that was already compromised before the first epoch. Next, [Part 3](/blog/secure-mlops-03-securing-the-training-pipeline/): the training pipeline, where clean data can still become a backdoored model.
