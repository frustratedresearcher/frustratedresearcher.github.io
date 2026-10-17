---
title: "Identity, secrets and infrastructure for MLOps"
description: "The connective tissue of a secure ML pipeline is identity, secrets and infrastructure — the part that spans every stage and, when weak, lets a compromise at one stage become a compromise of all of them. Part 7 of the Secure MLOps series covers workload identity and least privilege, secrets management, network and tenancy isolation, and container/compute hardening across the whole estate."
pubDate: 2026-09-20
series: "Secure MLOps"
seriesPart: 7
tags: ["Secure MLOps", "IAM", "Secrets Management", "Workload Identity", "Zero Trust", "Kubernetes Security", "AI Security"]
tldr: "Identity and infrastructure are the cross-cutting layer that decides whether a breach at one MLOps stage stays contained or spreads to all of them. Give every component — training job, pipeline stage, serving pod, notebook — its own scoped workload identity with least privilege, not shared long-lived keys. Keep secrets in a manager (Vault, cloud KMS) and inject short-lived credentials at runtime; never in images, env files or experiment logs. Isolate the network (segment data, training, serving; default-deny egress) and isolate tenants and environments (dev/stage/prod, and per-customer where multi-tenant). Harden the compute: minimal scanned images, non-root, read-only filesystems, and GPU/driver patching. This is the IAM discipline the data, training and serving stages all leaned on, collected in one place."
faq:
  - q: "What is workload identity and why does it matter for MLOps?"
    a: "Workload identity gives each running component — a training job, a pipeline stage, a serving pod — its own cryptographic identity issued by the platform, which it uses to obtain short-lived, scoped credentials instead of carrying a long-lived shared key. It matters because ML pipelines have many components touching sensitive data and models; with workload identity a compromise is bounded to that component's narrow permissions and its credentials expire quickly, whereas a shared static key means compromising any component grants the union of everything that key can reach."
  - q: "How should secrets be managed in an ML pipeline?"
    a: "Store them in a dedicated secrets manager — HashiCorp Vault, or a cloud KMS/secrets service — and inject short-lived credentials at runtime, retrieved via the component's workload identity. Never bake secrets into container images, commit them to repos, place them in .env files shipped with code, or log them as experiment-tracking parameters. Rotate regularly, scope each secret to the minimum it protects, and scan repos and images continuously to catch leaks before they're exploited."
  - q: "How do you isolate ML infrastructure?"
    a: "Isolate at two levels. Network: segment the data stores, training compute and serving tiers so each only reaches what it must, and apply default-deny egress so a compromised job can't exfiltrate data or weights. Tenancy and environment: keep dev, staging and production separated with distinct credentials and data, and in multi-tenant ML platforms isolate customers from each other at the compute, storage and model level so one tenant's workload can't reach another's data or models."
  - q: "What does container and compute hardening look like for ML workloads?"
    a: "Use minimal, pinned, vulnerability-scanned base images; run containers as non-root with read-only root filesystems and dropped capabilities; and apply Kubernetes controls like pod security standards, network policies and admission control (OPA Gatekeeper/Kyverno). For GPU workloads, keep drivers and the container toolkit patched, since GPU/driver vulnerabilities can break isolation between workloads sharing hardware. Treat training and serving nodes as sensitive production infrastructure, not scratch compute."
---

The previous six parts each leaned on a phrase and moved on: "give the job its own scoped identity," "pull secrets from a manager," "serve on least-privilege infra." This part is where those promises get paid. Identity, secrets and infrastructure are the **connective tissue** of the pipeline — they span every stage, and they decide the single most important property of your whole system: **whether a compromise at one stage stays there, or spreads to all of them.**

Weak here, and a poisoned notebook reaches production weights; strong here, and a stolen training-job token buys an attacker read access to one bucket for fifteen minutes. Same breach, two completely different days. Four controls.

## 1. Workload identity and least privilege

The original sin of ML infrastructure is the **shared, long-lived key** — one cloud credential in an environment variable that the notebook, the training job, the pipeline and the serving pod all use. Compromise any one of them and you've got everything that key can reach.

Replace it with **workload identity**: each component gets its own platform-issued identity and uses it to mint **short-lived, scoped credentials** at runtime.

- The **training job** gets read on exactly its input buckets, write on exactly its output path — nothing else, for the duration of the run.
- The **pipeline promote stage** gets registry write; the **train stage** does not ([Part 5](/blog/secure-mlops-05-secure-cicd-for-ml/)).
- The **serving pod** gets read on the one model it serves.
- The **notebook** gets a developer's scoped, audited access — never a production role.

This is the same least-privilege-per-principal argument I make for [agent identities](/blog/rbac-abac-rebac-for-agentic-systems/), applied to pipeline components. The win is containment: a compromise is bounded to one narrow role, and the credential expires on its own. Use the cloud's workload identity federation, SPIFFE/SPIRE for platform-agnostic identity, and Kubernetes service accounts bound to cloud roles — not static keys.

## 2. Secrets management

Secrets are where good intentions leak. The rule is simple and absolute: **secrets live in a manager, and are injected at runtime — never anywhere they can be copied.**

- **Store** in HashiCorp Vault or a cloud KMS/secrets service.
- **Retrieve** at runtime via the component's workload identity (no bootstrap key needed — the identity *is* the auth).
- **Never** bake into images, commit to repos, drop in `.env` files shipped with code, or — the ML-specific trap — log as an [experiment-tracking parameter](/blog/secure-mlops-03-securing-the-training-pipeline/).
- **Rotate** regularly; scope each secret to the minimum it protects; **scan** repos and images continuously (gitleaks, trufflehog) to catch leaks early.

A short-lived credential that leaks into a log expires; a static API key in a committed notebook is exploitable for as long as it's valid, which is usually "forever."

## 3. Network and tenancy isolation

Least privilege in IAM controls *what a principal can call*; network and tenancy isolation control *what a compromised box can reach*. Both, because they fail differently.

**Network segmentation.** Separate the data tier, training tier and serving tier so each reaches only what it must. Apply **default-deny egress** — the control that turns "the training job was compromised" into "and it couldn't send the weights anywhere." A model-serving pod has no business making arbitrary outbound connections; an allowlist of its real dependencies is the whole policy.

**Tenancy and environment isolation.** Keep **dev / staging / production** separated with distinct credentials and data — a staging model should never hold a prod data key. In **multi-tenant ML platforms**, isolate customers at compute, storage *and* model level so one tenant's job can't read another's data or pull another's model. Shared ML infrastructure without tenant isolation is a cross-customer breach waiting for a misconfiguration.

## 4. Container and compute hardening

ML runs on containers and specialised hardware, both of which need hardening beyond the defaults:

- **Images:** minimal, pinned by digest, vulnerability-scanned (Trivy/Grype). Big ML base images carry a lot of CVEs — scan and slim them.
- **Runtime:** non-root, read-only root filesystem, dropped capabilities, no privileged containers unless a GPU genuinely requires specific access.
- **Kubernetes:** pod security standards, network policies for the segmentation above, and admission control (**OPA Gatekeeper / Kyverno**) to *enforce* all of it — reject the non-compliant pod at admission rather than finding it in an audit.
- **GPU/accelerators:** patch GPU drivers and the container toolkit. Driver-level vulnerabilities can break isolation between workloads sharing a GPU — a real concern on multi-tenant training clusters.

## The infrastructure-stage checklist

- Every component has its own scoped workload identity; no shared long-lived keys anywhere.
- Secrets live in a manager, injected at runtime, never in images/repos/`.env`/experiment logs; rotated and leak-scanned.
- Network is segmented (data/train/serve) with default-deny egress.
- Dev/stage/prod isolated with distinct creds; multi-tenant platforms isolate tenants at compute/storage/model.
- Containers: minimal, scanned, non-root, read-only FS; Kubernetes pod-security + network policy + admission control; GPU drivers patched.

This layer doesn't ship a model or catch a poisoned sample — it's the thing that makes every other part's containment real. With it in place, a breach is a bounded incident instead of a pipeline-wide compromise. Next, [Part 8](/blog/secure-mlops-08-mlsecops-monitoring-incident-response/): watching all of it in production — drift, adversarial detection, and routing ML security signals to your SIEM.
