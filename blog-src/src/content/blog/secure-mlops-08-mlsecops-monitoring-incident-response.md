---
title: "MLSecOps monitoring: drift, detection and incident response"
description: "A model is secure on deploy day and decaying by week two. Part 8 of the Secure MLOps series covers production monitoring as a security function: data and concept drift, adversarial and abuse detection, continuous red-teaming, routing ML signals to a SIEM, and an incident-response runbook built around the one thing software IR lacks — the ability to roll back to a known-good model."
pubDate: 2026-09-22
series: "Secure MLOps"
seriesPart: 8
tags: ["Secure MLOps", "MLSecOps", "Model Monitoring", "Drift Detection", "SIEM", "Incident Response", "AI Security"]
tldr: "Monitoring is where ML security becomes continuous instead of a release-day checkbox. Watch three things: model/data health (data drift, concept drift, performance decay — Evidently, NannyML — because a sudden skew can be model skewing/poisoning, ML08, not just nature), security signals at inference (extraction-shaped query patterns, adversarial-input detections, abuse and authz denials), and the pipeline's own integrity (unexpected model promotions, registry access, retraining triggers). Route all of it as structured events to a SIEM — the same Wazuh pattern used for agentic systems — tagged with MITRE ATLAS, correlated and alerted. Run continuous red-teaming (ART, model eval suites) so you find decay and new attacks before adversaries do. And build an IR runbook around ML's superpower: rolling back to a known-good, signed model version in minutes."
faq:
  - q: "What should you monitor in a production ML model for security?"
    a: "Three categories. Model and data health: data drift (inputs shifting from training distribution), concept drift (the input-output relationship changing), and performance decay — a sudden distribution skew can indicate model skewing or poisoning, not just natural change. Inference security signals: query patterns shaped like model extraction, adversarial-input detections, abuse, and authorisation denials. Pipeline integrity: unexpected model promotions, anomalous registry access, and unplanned retraining triggers. Together these cover natural degradation and active attack."
  - q: "How is model drift a security concern, not just a quality one?"
    a: "Because an attacker can cause drift deliberately. Model skewing (OWASP ML08) feeds manipulated inputs or feedback to shift the model's behaviour over time, and data poisoning in a continuous-retraining loop shows up first as a drift signal. So a sharp or unusual drift reading is not automatically benign decay — it can be the visible symptom of an attack on the model. Treating drift monitoring as a security signal, not only an ML-quality metric, is what lets you catch slow poisoning and manipulation."
  - q: "How do you integrate ML monitoring with a SIEM?"
    a: "Have the serving layer, pipeline and monitoring tools emit structured events — query metadata, drift readings, adversarial-detection verdicts, authz decisions, promotion and registry events — to the SIEM, correlate them by model and request/run ID, and write detection rules tagged with MITRE ATLAS technique IDs so they land in the same pipeline as the rest of your security monitoring. This is the same approach used to wire agentic AI into Wazuh: the runtime supplies structured truth, the SIEM supplies correlation, alerting, retention and response."
  - q: "What does incident response look like for an ML model?"
    a: "It follows standard IR — detect, contain, eradicate, recover — with one ML-specific superpower and one ML-specific burden. The superpower is rollback: because every model is signed and versioned, containment can be rolling production back to a known-good model version in minutes. The burden is that eradication may require retraining from a clean, known-good dataset (traceable thanks to data versioning) if the incident was poisoning or a backdoor. The runbook should pre-answer: who can roll back, to which version, and how you rebuild clean."
---

Every prior part secured a stage *at a point in time*. This one accepts the truth those parts don't: **a model is secure on deploy day and decaying by week two.** The input distribution shifts, the world changes, and adversaries probe. Security that ends at release is security with an expiry date. Monitoring is how it becomes continuous — and crucially, how the *other* stages' failures finally surface, because slow poisoning and a successful extraction are only ever visible here, in production, over time.

Monitor three things, route them all to one place, and build a runbook around ML's one genuine advantage in a crisis.

## Watch 1: model and data health — and read it as a security signal

The standard MLOps monitoring — drift and performance — is also security monitoring, because **an attacker can cause drift on purpose.**

- **Data drift** — inputs moving away from the training distribution.
- **Concept drift** — the input→output relationship itself changing.
- **Performance decay** — accuracy/precision sliding against ground truth as it arrives.

The security reframe: a sharp or unusual skew is not automatically nature. **Model skewing (ML08)** feeds manipulated inputs or feedback to shift behaviour over time; **poisoning in a continuous-retraining loop** shows up first as a drift reading. So drift is a dual signal — quality *and* attack — and the team that treats it as only the former misses slow, patient manipulation entirely.

**Tools:** Evidently, NannyML, or your platform's model monitor — wired so a drift threshold breach raises a *security* alert, not just a retraining ticket.

## Watch 2: inference security signals

The attacks from [Part 6](/blog/secure-mlops-06-securing-deployment-inference/) are visible in production telemetry if you emit it:

- **Extraction-shaped querying** — high volume, systematic input-space coverage, unusual breadth from one caller.
- **Adversarial-input detections** — hits from your detector/validation layer.
- **Abuse and authorisation denials** — a burst of denials is someone probing the ceiling.
- **Output-anomaly** — sudden shifts in prediction distribution that no input change explains.

## Watch 3: pipeline integrity

The supply chain doesn't stop needing watching once a model ships:

- **Unexpected promotions** — a model reaching prod outside the normal pipeline/gate.
- **Anomalous registry access** — a model pulled or pushed by an unusual principal ([Part 4](/blog/secure-mlops-04-ml-supply-chain-artifacts/)).
- **Unplanned retraining triggers** — retraining kicked off off-schedule can be an attacker trying to bake in poisoned data.

## Route it all to a SIEM

Three watch-categories are noise until something correlates and alerts on them. Emit **structured events** — query metadata, drift readings, detector verdicts, authz decisions, promotion and registry events — to a SIEM, correlate by model and request/run ID, and write rules **tagged with MITRE ATLAS**. This is exactly the pattern I detailed for [wiring agentic systems into Wazuh](/blog/wazuh-siem-for-agentic-ai-attack-detection/): the runtime supplies structured truth, the SIEM supplies correlation, retention, alerting and a response trigger. A drift spike *and* an extraction-shaped query pattern *and* an off-schedule retrain, correlated on one model, is a far stronger signal than any one alone.

## Find it before they do: continuous red-teaming

Monitoring is reactive; pair it with proactive testing. Continuously red-team the deployed model:

- **Adversarial robustness** — run **ART** attacks against the live model class to measure how fragile it is and catch regressions.
- **Behavioural eval suites** — the same held-out and backdoor-probing tests from [Part 3](/blog/secure-mlops-03-securing-the-training-pipeline/), run on a schedule against production.
- **Abuse-case testing** — extraction and inversion attempts against your own endpoint, so you see what your monitoring sees (and find the gaps where it sees nothing).

## Incident response: ML's superpower and its burden

When something fires, you run standard IR — **detect, contain, eradicate, recover** — with one advantage and one complication unique to ML.

**The superpower: rollback.** Because every model is [signed and versioned](/blog/secure-mlops-04-ml-supply-chain-artifacts/), containment can be *rolling production back to a known-good model version in minutes*. No hotfix, no redeploy of code — repoint serving at the last trusted artifact. Your runbook should pre-answer: **who can roll back, to which version, how fast.**

**The burden: eradication may mean retraining.** If the incident was poisoning or a backdoor, the fix isn't a patch — it's retraining from a **clean, known-good dataset**, which you can identify and rebuild only because [Part 2](/blog/secure-mlops-02-securing-the-data-layer/) versioned the data and [Part 3](/blog/secure-mlops-03-securing-the-training-pipeline/) made the build reproducible. The runbook names the clean baseline and the rebuild path.

A usable ML IR runbook answers, in advance:
- What signal triggered this, and what's the ATLAS technique?
- Containment: roll back to which signed version, authorised by whom?
- Eradication: if poisoning/backdoor, which clean data version do we retrain from?
- Recovery and lessons: which upstream control should have caught it, and how do we add it?

## The monitoring-stage checklist

- Drift and performance monitored (Evidently/NannyML) and read as security signals, not just quality.
- Inference signals emitted: extraction patterns, adversarial hits, abuse, authz denials, output anomalies.
- Pipeline integrity watched: promotions, registry access, retraining triggers.
- All of it structured, correlated and alerting in a SIEM, tagged with MITRE ATLAS.
- Continuous red-teaming (ART + eval suites + self-directed abuse tests) on the live model.
- IR runbook built on signed-version rollback and clean-data retraining, with named owners.

Production is now watched, tested and recoverable. The last thing that keeps all eight stages true over time isn't technical at all — it's governance. [Part 9](/blog/secure-mlops-09-governance-risk-compliance/): NIST AI RMF, ISO 42001, the EU AI Act and the documentation that makes security auditable.
