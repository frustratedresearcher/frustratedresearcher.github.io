---
title: "Secure CI/CD for machine learning: pipelines, policy gates and SLSA"
description: "The ML pipeline is privileged automation touching data, secrets, registries and prod — compromise it and you compromise every model it ships. Part 5 of the Secure MLOps series covers hardening the pipeline itself, policy-as-code promotion gates, SLSA provenance and attestations, and the IaC/dependency security around it — so only verified models reach production and the pipeline can't be turned against you."
pubDate: 2026-09-16
series: "Secure MLOps"
seriesPart: 5
tags: ["Secure MLOps", "CI/CD", "SLSA", "Policy as Code", "OPA", "Sigstore", "Supply Chain Security", "AI Security"]
tldr: "An ML CI/CD pipeline is the highest-privilege thing in the stack — it reads data, holds registry and cloud credentials, and pushes to prod — so it is both a target and the place to enforce every other stage's controls. Harden the pipeline: least-privilege scoped runners, short-lived OIDC credentials not stored keys, pinned actions/images, protected branches and signed commits, and no pipeline definition an attacker can edit to exfiltrate secrets. Then make it the enforcement point: a policy-as-code gate (OPA/conftest) that refuses to promote a model unless it is signed, scanned, has an MLBOM, passed evals and bias checks, and carries provenance. Target SLSA build levels with in-toto/Sigstore attestations so the model's whole path is verifiable, and scan the IaC and dependencies that define the pipeline."
faq:
  - q: "Why is the ML CI/CD pipeline a high-value attack target?"
    a: "Because it is privileged automation with reach into everything: it reads training data, holds credentials to the model registry and cloud, runs on infrastructure, and can push artifacts to production. Compromising the pipeline — through a malicious dependency, an editable workflow file, a leaked runner token, or a poisoned base image — lets an attacker exfiltrate data and secrets or ship a backdoored model to production through a trusted channel. Securing it is both protecting a target and protecting the path every model travels."
  - q: "What is a policy-as-code promotion gate for ML?"
    a: "It is an automated check, written as code, that a model must pass before CI/CD promotes it to production. Using a policy engine like Open Policy Agent (via conftest) or similar, the gate verifies machine-checkable conditions — the artifact is signed, scanned clean, has an MLBOM and provenance, passed accuracy, bias and safety evals, and targets an approved environment — and fails the pipeline if any are missing. It replaces 'someone remembered to check' with an enforced, auditable rule."
  - q: "What is SLSA and how does it apply to ML models?"
    a: "SLSA (Supply-chain Levels for Software Artifacts) is a framework of maturity levels for build integrity and provenance. Applied to ML, it means producing a signed, tamper-evident record of how a model was built — which pipeline, from which source and data — so a consumer can verify the model came from the expected process and wasn't built or altered elsewhere. You generate provenance with in-toto attestations and sign with Sigstore, then verify it at the promotion gate. Higher SLSA levels add hardened, isolated builders and non-falsifiable provenance."
  - q: "How do you secure the infrastructure-as-code behind an ML pipeline?"
    a: "Scan IaC (Terraform, Kubernetes manifests, Helm) with tools like tfsec, Checkov or KICS to catch misconfigurations — public buckets, over-broad IAM, unencrypted storage — before they deploy. Scan pipeline dependencies and base images for known vulnerabilities and malicious packages, pin them by digest, and require code review and signed commits on the IaC and pipeline definitions themselves, since whoever can edit the pipeline can redirect it."
---

Everything in the previous four parts converges here. The CI/CD pipeline is where data, code, the trained model, the registry and production all meet — which makes it two things at once: **the highest-privilege target in the stack, and the single best place to enforce every other stage's controls.** Get it right and the pipeline becomes the gate that only verified models pass through. Get it wrong and it becomes a trusted channel for shipping a backdoor to prod. Both halves matter, so we do both: harden the pipeline, then weaponise it for defence.

## Harden the pipeline itself

An ML pipeline reads training data, holds registry and cloud credentials, and can push to production. That is a lot of blast radius for a YAML file many people can edit. Lock it down:

- **Short-lived credentials, not stored keys.** Use OIDC federation so the runner mints a short-lived, scoped token per run instead of a long-lived cloud key sitting in CI secrets. A leaked ephemeral token expires; a leaked static key is a breach.
- **Least-privilege runners.** The job that trains gets data read; the job that promotes gets registry write; nothing gets both unless it must. Separate credentials per stage.
- **Pin everything.** Actions/orbs/tasks by commit SHA, images by digest — not `@latest`. An unpinned third-party action is arbitrary code running with your pipeline's privileges.
- **Protect the definition.** Protected branches, required review, and **signed commits** on the pipeline and IaC files. Whoever can edit the workflow can add a step that exfiltrates every secret — so editing it must be as controlled as editing production.
- **Guard secrets exposure.** No secrets echoed to logs; restrict which jobs (and which branches / fork PRs) can access secrets at all. A workflow triggered by an untrusted fork PR should never see your registry credentials.

## Make the pipeline the enforcement point: policy-as-code gates

This is the payoff. Every control from Parts 2–4 is only real if something *refuses to proceed* when it's missing. That something is a **policy-as-code gate** — a rule, written as code, evaluated automatically at promotion. Open Policy Agent via **conftest** is the common choice (the same engine I use for [agent authorisation](/blog/open-policy-agent-for-agentic-system-design/), pointed at build metadata here):

```rego
package mlops.promote
import rego.v1

default allow := false
allow if { count(deny) == 0 }

deny contains "model is not signed"              if not input.model.signature_verified
deny contains "model artifact failed scan"       if input.model.scan != "clean"
deny contains "missing MLBOM"                    if not input.model.mlbom_present
deny contains "missing build provenance"         if not input.model.provenance_verified
deny contains "eval gate not met"                if input.model.eval.accuracy < input.policy.min_accuracy
deny contains "fairness gate not met"            if input.model.eval.bias_delta > input.policy.max_bias_delta
deny contains "unapproved target env"            if not input.target in input.policy.allowed_envs
```

Read what that buys you: a model reaches production **only** if it is signed, scan-clean, carries an MLBOM and verified provenance, cleared its accuracy *and* fairness thresholds, and targets an approved environment. No human has to remember any of it, and every decision is logged and auditable. The gate is where the whole series becomes enforceable instead of aspirational.

## Provenance: target SLSA levels

[Part 4](/blog/secure-mlops-04-ml-supply-chain-artifacts/) signed the artifact; here you prove *how it was built*. **SLSA** (Supply-chain Levels for Software Artifacts) defines maturity levels for build integrity and provenance. Applied to ML:

- Generate an **in-toto attestation** recording the builder, source commit, data version and steps that produced the model.
- **Sign it with Sigstore** and record it in a transparency log.
- **Verify it at the gate** (the `provenance_verified` check above) against the expected pipeline identity — so a model built *anywhere but your pipeline* is rejected.

Climbing SLSA levels means moving to hardened, isolated builders and provenance the build can't forge. For ML, SLSA is what makes "this model came from our trusted process, unaltered" a *verifiable* statement rather than a cultural assumption.

## Secure the surrounding IaC and dependencies

The pipeline is defined by infrastructure-as-code and built on dependencies — both are attack surface:

- **IaC scanning:** run **tfsec / Checkov / KICS** on Terraform, Helm and Kubernetes manifests to catch public buckets, over-broad IAM, unencrypted volumes *before* they deploy.
- **Dependency and image scanning:** SCA on pipeline dependencies, vulnerability + malware scanning on base images (Trivy, Grype), pinned by digest. A malicious transitive package in the training image is a supply-chain compromise (**ML06**) that lands with full pipeline privileges.
- **Secret scanning:** gitleaks/trufflehog in the pipeline to catch credentials before they're committed.

## The CI/CD-stage checklist

- Runners use short-lived OIDC creds, least-privilege per stage; no static cloud keys in CI.
- Actions/images pinned by SHA/digest; pipeline + IaC definitions are review-gated and commit-signed.
- Fork/untrusted triggers can't reach production secrets.
- A policy-as-code gate enforces: signed + scanned + MLBOM + provenance + eval + fairness + approved env, failing closed.
- SLSA provenance (in-toto + Sigstore) generated and verified at the gate.
- IaC, dependencies and images are scanned; secrets are scanned pre-commit.

The pipeline is now hardened and doing the enforcing. A model that reaches the end of it is signed, scanned, inventoried, provenance-bearing and eval-cleared. Next, [Part 6](/blog/secure-mlops-06-securing-deployment-inference/): serving that model, where it faces the open world — extraction, inversion and adversarial inputs.
