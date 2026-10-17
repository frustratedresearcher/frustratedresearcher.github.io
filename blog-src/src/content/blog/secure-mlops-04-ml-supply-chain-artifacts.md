---
title: "The ML supply chain: model artifacts, signing and MLBOM"
description: "A model file is not data — load the wrong one and it runs code on your box. Part 4 of the Secure MLOps series covers the model artifact and supply chain: serialization RCE and safe formats, model signing and provenance, the ML bill of materials, and locking down the model registry — so that what you deploy is what you trained, and loading it can't own you."
pubDate: 2026-09-14
series: "Secure MLOps"
seriesPart: 4
tags: ["Secure MLOps", "ML Supply Chain", "Model Signing", "MLBOM", "Safetensors", "Sigstore", "AI Security"]
tldr: "The model artifact is a supply-chain surface with two distinct risks. First, the file format: pickle-based formats (pickle, joblib, PyTorch .pt, Keras H5 with Lambda layers) execute arbitrary code on load, so scan them (ModelScan, picklescan) and prefer safetensors, which stores only tensors and cannot execute. Second, integrity and provenance: sign models (Sigstore/cosign, the model-transparency project) so a tampered or substituted artifact is detectable, generate an ML bill of materials (CycloneDX ML-BOM) recording the model, its base, datasets and dependencies, and lock the model registry with RBAC, versioning and promotion gates so only signed, scanned, provenance-bearing artifacts get promoted. This is OWASP ML06 (supply chain) and ML05 adjacent, and ATLAS AML.T0010."
faq:
  - q: "Why is loading a model file a security risk?"
    a: "Because several common model formats are built on Python's pickle, which executes arbitrary code during deserialization. Loading an untrusted pickle, joblib, or PyTorch .pt file — or a Keras H5 model with a Lambda layer — can run attacker-controlled code on the machine that loads it, with no exploit needed beyond the load call itself. This is a remote-code-execution primitive disguised as a data file, and it is the most direct ML supply-chain attack (OWASP ML06, MITRE ATLAS AML.T0010)."
  - q: "What is safetensors and should I use it?"
    a: "Safetensors is a model serialization format that stores only tensor data and metadata, with no mechanism to execute code on load, which eliminates the pickle deserialization-RCE class entirely. Prefer it for storing and distributing weights wherever your framework supports it. When you must handle pickle-based artifacts — many pre-trained models still ship that way — scan them before loading with ModelScan or picklescan and load only from trusted, signed sources."
  - q: "How do you sign and verify ML models?"
    a: "Sign the model artifact so any tampering or substitution between training and deployment is detectable. Sigstore/cosign can sign model files and container images with keyless, transparency-logged signatures, and the OpenSSF model-transparency / model-signing project targets ML artifacts specifically. Verification becomes a gate: the deployment pipeline refuses to load a model whose signature doesn't verify against an expected identity, which closes the 'someone swapped the model in the registry' path."
  - q: "What is an MLBOM (ML bill of materials)?"
    a: "An ML bill of materials is the model's equivalent of an SBOM: a machine-readable inventory of what went into the model — the model itself and its version, the base/pre-trained model it derived from, the datasets used, the frameworks and dependencies, and licences. CycloneDX supports ML-BOM and model/data components. It gives you supply-chain transparency: when a base model or dataset is later found compromised or non-compliant, the MLBOM tells you exactly which deployed models are affected."
---

Here is a fact that still surprises senior engineers: **`model.load()` can own your machine.** Not through a clever exploit — through the load call itself, because the file format was designed to execute code. The model artifact is a supply-chain surface, and it carries two completely different risks that need two different controls: the **format can run code**, and the **artifact can be tampered with or substituted**. Deal with both or the clean model you trained in [Part 3](/blog/secure-mlops-03-securing-the-training-pipeline/) becomes someone else's payload by the time it's served.

## Risk 1: the file format is a code-execution primitive

Most of the ML ecosystem serializes with Python's **pickle**, and pickle executes arbitrary code during deserialization *by design*. That means a range of everyday formats are RCE-on-load when the file is untrusted:

- `pickle` / `joblib` (scikit-learn, many pipelines)
- PyTorch `.pt` / `.pth` (pickle under the hood)
- Keras/TF **H5 with a `Lambda` layer** (the layer can carry arbitrary code)

Download a "model" from a hub, load it, and if it's malicious you've run attacker code with your training or serving process's privileges. This is OWASP **ML06** and ATLAS **AML.T0010**, and I've written a whole post on the mechanism: [your model file is a code-execution primitive](/blog/your-model-file-is-a-code-execution-primitive/).

**Prevent, in order of preference:**

1. **Use a non-executable format.** **safetensors** stores only tensors + metadata and has no code-execution path on load. Prefer it for storing and distributing weights wherever the framework supports it. This deletes the entire class, not mitigates it.
2. **Scan what you can't convert.** Many pre-trained models still ship as pickle. Before loading from any source you don't fully control, scan with **ModelScan** (Protect AI) or **picklescan** — they flag dangerous opcodes and suspicious imports.
3. **Load only from trusted, signed sources** (Risk 2), in an isolated process with locked egress if there's any doubt.

## Risk 2: integrity and provenance — is this the model we trained?

Even a safe format doesn't tell you the artifact in the registry is the one your pipeline produced. Between training and serving, a model can be swapped, tampered, or quietly replaced with a backdoored version. The defence is the same one used for every other software supply chain: **sign it, inventory it, and gate on both.**

### Sign the model

Attach a cryptographic signature to the artifact so substitution or tampering is detectable. **Sigstore / cosign** signs files and container images with keyless, transparency-logged signatures; the OpenSSF **model-transparency / model-signing** project targets ML artifacts specifically. Signing only matters if you *verify*, so make verification a hard gate:

```
deploy:
  - verify model signature against expected signer identity   # fail closed
  - verify provenance attestation (who built it, from what)
  - else: refuse to promote/serve
```

### Inventory it: the MLBOM

An **ML bill of materials** is the model's SBOM — a machine-readable record of everything that went into it: the model and version, the **base model** it derived from, the **datasets**, the frameworks and dependencies, and licences. **CycloneDX** supports ML-BOM with model and data components. Why it earns its keep: when a popular base model or a dataset is later found poisoned, trojaned, or licence-encumbered, the MLBOM answers "which of our deployed models are affected?" in seconds instead of a frantic audit. It's the inventory that makes supply-chain incidents survivable.

### Carry provenance

Pair the signature with a **provenance attestation** — the signed record of who built the model, from which data and code commit (the five inputs pinned in Part 3), in which pipeline. This is the artifact-stage half of [SLSA, which Part 5 wires into CI/CD](/blog/secure-mlops-05-secure-cicd-for-ml/). Provenance turns "trust me, this is the right model" into a verifiable claim.

## Lock the model registry

The registry (MLflow Model Registry, SageMaker, Vertex, a cloud artifact store) is the control point where all of this is enforced. Treat it like a production system holding your crown jewels — because it is:

- **RBAC and authn** behind your IdP; distinct permissions for register / promote / deploy. No anonymous access, ever.
- **Promotion gates:** an artifact moves from staging to production only if it is signed, scan-clean, carries an MLBOM and provenance, and passed its evals. Encode the gate as policy ([Part 5](/blog/secure-mlops-05-secure-cicd-for-ml/)), not as a human remembering.
- **Immutable, versioned storage** with integrity hashes, so "production model v7" is a fixed, verifiable object and a swap is detectable.
- **Access logging** to your SIEM — an unexpected promotion or a pull of a model by an unusual principal is a signal ([Part 8](/blog/secure-mlops-08-mlsecops-monitoring-incident-response/)).

## The artifact-stage checklist

- Weights stored/distributed as safetensors where possible; pickle-based artifacts scanned (ModelScan/picklescan) before load.
- Untrusted models loaded only in isolated, egress-locked processes.
- Every model is signed (cosign / model-signing) and verification is a hard deployment gate.
- Every model ships an MLBOM (CycloneDX) listing base model, datasets, deps and licences.
- Every model carries signed build provenance (feeds SLSA).
- The registry enforces RBAC, immutable versioning, signed+scanned promotion gates, and logs access to the SIEM.

Now the artifact is trustworthy *and* loading it is safe. Next, [Part 5](/blog/secure-mlops-05-secure-cicd-for-ml/): the CI/CD pipeline that builds, tests and promotes it — and how to keep the pipeline itself from becoming the attack.
