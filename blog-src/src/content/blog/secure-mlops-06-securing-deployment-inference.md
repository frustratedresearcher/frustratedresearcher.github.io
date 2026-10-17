---
title: "Securing deployment and inference: endpoints, extraction and adversarial robustness"
description: "At inference the model meets the open world, and a new set of attacks that only exist once it's queryable: model extraction, inversion, membership inference, and adversarial inputs. Part 6 of the Secure MLOps series covers hardening the serving endpoint, defending against model theft and privacy attacks, adversarial robustness, and inference-time DoS — with tools and concrete controls."
pubDate: 2026-09-18
series: "Secure MLOps"
seriesPart: 6
tags: ["Secure MLOps", "Model Serving", "Model Extraction", "Adversarial ML", "Inference Security", "KServe", "AI Security"]
tldr: "Serving is where the model becomes queryable, which unlocks attacks that don't exist anywhere else in the pipeline. Harden the endpoint like any API — authn/authz, TLS/mTLS, strict input validation and schema limits, rate limits and quotas — then add the ML-specific defences: against model extraction (ML05) monitor and throttle high-volume/systematic querying and consider watermarking; against inversion (ML03) and membership inference (ML04) limit output granularity (no raw confidence vectors to untrusted callers) and consider differential privacy; against adversarial inputs (ML01) add detection and, where it matters, robustness training (ART); against sponge/DoS inputs cap compute per request. Serve on hardened infra (KServe/Seldon/Triton) with the model loaded safely per Part 4, and log every query to the SIEM for the detection layer in Part 8."
faq:
  - q: "What is a model extraction (model stealing) attack?"
    a: "Model extraction is when an attacker queries a deployed model systematically and uses the input-output pairs to train a close functional copy, stealing the intellectual property and the investment behind it, and often creating a local surrogate to craft further attacks against. It is OWASP ML05 and maps to MITRE ATLAS exfiltration techniques. Defences include authenticating and rate-limiting access, monitoring for high-volume or systematically-spread querying patterns, limiting output detail (labels rather than full probability vectors), and watermarking the model so a stolen copy can be identified."
  - q: "How do you protect a model against inversion and membership inference?"
    a: "Model inversion reconstructs training data from model outputs; membership inference determines whether a specific record was in the training set. Both exploit information leaked through outputs, especially detailed confidence scores. Limit what untrusted callers receive — return top-k labels or coarse confidences rather than full probability vectors — rate-limit and authenticate access, and where the data is sensitive, train with differential privacy so individual records can't be reliably recovered. These map to OWASP ML03 and ML04."
  - q: "What are adversarial examples and how do you defend against them at inference?"
    a: "Adversarial examples are inputs perturbed, often imperceptibly, to cause the model to misclassify — OWASP ML01, input manipulation. At inference you defend in layers: validate and constrain inputs, add adversarial-example detection (statistical or detector-model based), and for models where it matters, use adversarial/robust training so the model tolerates perturbation. The IBM Adversarial Robustness Toolbox provides both attacks for testing and defences. No single defence is complete, so combine detection with robustness and with monitoring."
  - q: "How do you harden an ML inference endpoint?"
    a: "Treat it as a production API plus a model. Require authentication and authorisation on every request, enforce TLS (mTLS for service-to-service), validate inputs strictly against a schema with size and range limits, and apply per-client rate limits and quotas. Cap compute per request to blunt sponge-example DoS. Serve on hardened infrastructure (KServe, Seldon, Triton) running least-privilege, load the model with the safe-format and scanning controls from Part 4, and log every request for monitoring and abuse detection."
---

Through Parts 2–5 the model lived inside your perimeter — data stores, training compute, a pipeline, a registry. At inference it steps outside. The moment it's queryable, a whole class of attacks becomes possible that **cannot exist anywhere else in the lifecycle**: you can only steal, invert, or adversarially fool a model you can query. So deployment needs ordinary API hardening *and* a set of defences unique to ML. Here's both.

## Layer 1: harden the endpoint like the API it is

Before anything ML-specific, the serving endpoint is an API and inherits every API control. Skipping these is how most "AI incidents" actually happen:

- **Authn/authz on every request.** No anonymous inference. Know who is calling, and authorise what they can call.
- **TLS everywhere**, mTLS for service-to-service. The model's inputs and outputs are often sensitive; don't ship them in the clear.
- **Strict input validation.** Schema, type, size and range limits. Reject oversized or malformed payloads before they reach the model.
- **Rate limits and quotas per client.** This single control blunts extraction, brute-force inversion *and* DoS at once — it's the highest-leverage thing on this list.
- **Serve on hardened infra.** KServe / Seldon / Triton running least-privilege, with the model loaded using the [safe-format and scanning controls from Part 4](/blog/secure-mlops-04-ml-supply-chain-artifacts/) — because a serving process that loads a pickle is an RCE waiting for a swapped artifact.
- **Log every query** to the SIEM for the [detection layer in Part 8](/blog/secure-mlops-08-mlsecops-monitoring-incident-response/). Inference-time attacks are visible in query patterns — but only if you keep the queries.

## Layer 2: model theft — extraction (ML05)

An attacker queries your model enough, systematically, and trains a **functional copy** from the input-output pairs — stealing the IP and the investment, and often building a local surrogate to craft further attacks offline. 

**Defend:**
- **Authenticate and rate-limit** — extraction needs volume; make volume expensive and attributable.
- **Monitor query patterns** — high-volume callers, systematic grid-like coverage of the input space, or unusual breadth are the fingerprint of extraction, not normal use. This is a SIEM detection ([Part 8](/blog/secure-mlops-08-mlsecops-monitoring-incident-response/)).
- **Limit output detail** — return labels or top-k, not full probability vectors; richer outputs make extraction (and inversion) dramatically easier.
- **Watermark** — embed a detectable signal so a stolen copy can be identified later.

## Layer 3: privacy attacks — inversion (ML03) and membership inference (ML04)

Both exploit information the model leaks through its outputs. **Inversion** reconstructs training data; **membership inference** decides whether a specific record was in the training set — a privacy breach in itself when the dataset is sensitive (medical, financial).

**Defend:**
- **Minimise output granularity** — the single biggest lever is not handing untrusted callers full confidence vectors. Coarse outputs leak far less.
- **Rate-limit and authenticate** — these attacks also need many queries.
- **Differential privacy at training** — the principled defence, bounding how much any one record influences the model (ties back to [Part 2](/blog/secure-mlops-02-securing-the-data-layer/)). The model inherits its data's sensitivity, so the strongest privacy control is applied upstream.

## Layer 4: adversarial inputs — input manipulation (ML01)

Adversarial examples are inputs perturbed — often imperceptibly — to force misclassification. For a fraud model, a malware classifier, or a content filter, that's a direct bypass.

**Defend in combination (no single control is complete):**
- **Input validation and constraints** to reduce the perturbation surface.
- **Adversarial detection** — statistical checks or detector models that flag inputs sitting off the natural data manifold.
- **Robust/adversarial training** for models where the threat is real — train on adversarial examples so the model tolerates perturbation. The **IBM Adversarial Robustness Toolbox (ART)** gives you both the attacks (to test) and the defences (to deploy); red-team your own model with it before someone else does ([Part 8](/blog/secure-mlops-08-mlsecops-monitoring-incident-response/) covers continuous testing).

## Layer 5: inference-time DoS and output integrity

- **Sponge examples / compute DoS** — inputs crafted to maximise inference cost (long sequences, worst-case paths) exhaust GPU/CPU. **Cap compute per request** (max tokens/sequence length, timeouts) and quota per client.
- **Output integrity (ML09)** — ensure the response the caller receives is the model's real output, unaltered in transit (TLS) and not silently degraded by a swapped model (signature verification from Part 4, drift monitoring from Part 8).

## The deployment-stage checklist

- Endpoint enforces authn/authz, TLS/mTLS, strict input validation, per-client rate limits and quotas.
- Served on hardened, least-privilege infra; model loaded via safe format + scan.
- Extraction defended: query-pattern monitoring, throttling, limited output detail, optional watermarking.
- Inversion/membership defended: coarse outputs, rate limits, DP upstream for sensitive data.
- Adversarial inputs defended: validation + detection + (where it matters) robust training; model red-teamed with ART.
- Compute capped per request against sponge DoS; outputs integrity-protected.
- Every query logged to the SIEM.

The model is now serving safely in the open world. But a secure deployment on day one drifts, degrades and gets probed over time — which is why the next two stages never end. First, though, the connective tissue underneath all of this: [Part 7](/blog/secure-mlops-07-identity-secrets-infrastructure/), identity, secrets and infrastructure across the whole MLOps estate.
