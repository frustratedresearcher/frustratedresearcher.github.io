---
title: "LLM cost is a security control, not a finance problem"
description: "Running every security alert through your most capable model is a denial-of-wallet vulnerability and a detection gap at the same time. Severity-tiered routing cut our per-alert cost 30× — and the reason it works is a security argument, not a budget one."
pubDate: 2026-10-06
tags: ["Agentic AI", "SOC Automation", "AI Cost Engineering", "Denial of Wallet", "AI Security"]
tldr: "If every alert costs the same to analyse, economics forces you to choose between coverage and budget — and you will quietly drop coverage. Routing by severity, so cheap models triage volume and expensive models handle escalations, breaks that trade-off. In our agentic SOC it produced a 30× per-alert cost spread, kept daily spend at $25-40 against a $375-500 flat-rate equivalent, and removed an attacker-controlled path to exhausting the budget."
faq:
  - q: "What is denial of wallet?"
    a: "An attack where the goal is to run up cost rather than take a system down. Against an LLM-backed pipeline, an attacker generates traffic that triggers expensive inference — long contexts, worst-case tool chains, high-capability model routes — until the budget is exhausted or rate limits throttle legitimate work. It appears in OWASP's LLM Top 10 as unbounded consumption."
  - q: "Does using cheaper models reduce detection quality?"
    a: "Not if routing is driven by severity rather than applied uniformly. Most alert volume is low-severity and resolvable with a small model plus good context. Reserving the expensive model for genuine escalations means quality lands where it changes a decision, instead of being spent evenly on traffic that needed none."
  - q: "How do you decide which model tier handles an alert?"
    a: "Route on signals available before inference — detection severity, asset criticality, whether the entity is already under investigation, and whether cheaper analysis has already returned low confidence. Allow escalation upward mid-analysis, so a low-tier result that looks wrong gets a second opinion from a stronger model."
  - q: "What should you monitor to catch cost-based attacks?"
    a: "Per-incident and per-agent cost, not just the monthly total. A single alert costing 50 times the median is a signal worth investigating on its own, whether it indicates an attack, a prompt-injection loop, or a bug."
---

The usual way to discuss LLM cost is as a procurement matter. Someone totals the monthly bill, someone else proposes a cheaper model, and quality arguments follow.

That framing misses what actually happens in a security pipeline, where cost is not a budget line. It is an attack surface and a coverage decision.

## Flat-rate inference creates a coverage trade-off

Suppose every alert goes to your best model. Our workload is roughly 10,000 to 12,000 alerts a day. At flat-rate premium inference that lands near **$375-500 per day**.

Nobody signs off on that indefinitely, so one of two things happens.

Either you cut volume — sample alerts, drop low-severity classes, raise detection thresholds — which is a detection gap created by economics rather than by analysis. Or you downgrade everything to a cheap model, and now genuine escalations get analysis too shallow to support the decision.

Both are security losses dressed as budget decisions, and both tend to be made quietly, by whoever is watching the invoice.

## And it hands an attacker a lever

A uniform-cost pipeline is also attacker-controllable in a way that is easy to miss.

If processing cost is roughly constant per alert and an attacker can influence alert volume — noisy scanning, a flood of low-grade triggers, anything that generates detections — they can drive spend directly. Push hard enough and you hit a budget cap or provider rate limits, at which point your automated analysis stops and real intrusions queue behind the noise.

That is **denial of wallet**, and OWASP covers it as unbounded consumption. It is a cheaper attack than it looks, because the attacker does not need to evade anything. They need you to be consistent.

Worse, the degradation is silent. Nothing alerts. The pipeline just gets slower and then stops, and the queue it was draining becomes the backlog nobody is reading.

## Severity-tiered routing

The fix is to stop treating alerts as interchangeable.

We run **five lanes**. Routing decisions use what is already known before inference: detection severity, asset criticality, whether the entity is already under investigation, and whether cheaper analysis has already come back low-confidence.

The bottom lane handles the large volume of low-severity, well-understood alerts — known-benign patterns, routine policy noise, previously-adjudicated entities. A small model with good context closes these. The top lane runs multi-model adversarial reasoning, where two models analyse independently and disagreement itself becomes signal.

The spread between lanes is roughly **30×** — about **$0.005 to $0.15** per alert. Daily spend sits at **$25-40** against the $375-500 a flat premium approach would cost, across **916,000+ detections** handled.

Three things matter about that number, and only one of them is the money.

**Quality went where it changes decisions.** Alerts that genuinely needed deep analysis got more of it than a uniform budget would have allowed, because they were no longer competing with 10,000 pieces of routine noise for the same spend.

**Coverage stopped being negotiable.** At this cost structure there is no argument for sampling. Everything gets analysed, which closes the gap that economics was otherwise going to open.

**The attacker's lever got much weaker.** Flooding the pipeline with low-grade detections now routes almost entirely to the cheapest lane. Cost rises sub-linearly with attacker-controlled volume rather than linearly, and the budget holds.

## Allow escalation, or you have rebuilt the problem

Static routing has an obvious failure mode: an attacker who learns your routing logic shapes their activity to stay in the cheap lane.

So routing has to be one-way permeable. Low-tier analysis that returns low confidence, finds a contradiction, or touches a critical asset escalates upward automatically. Cheap tiers act as a filter, never as a final verdict. The cost model holds because escalations stay rare, not because escalation is prevented.

Which brings up the thing I would push hardest on: **instrument cost per incident and per agent, not just the monthly total.**

A monthly figure tells you nothing in time to matter. Per-incident cost is a detection signal in its own right. An alert that costs 50× the median means something — a prompt-injection loop driving an agent in circles, a tool chain retrying against a failing dependency, a genuine escalation, or an attacker probing your routing. All four are worth a look, and none are visible in an invoice.

Cost observability turned out to be one of the more useful telemetry streams in the platform, and it was built for finance reasons. It earns its place on the security side.

## The general point

Any time a security control's cost scales with attacker-controlled volume, you have both a budget risk and a coverage risk, and they are the same risk. LLM inference makes this vivid because the per-unit cost is large and legible, but it is not new — it is the same shape as log ingestion pricing, or a scanner that cannot finish its queue.

Designing the cost curve is part of designing the control. Treating it as an invoice problem means somebody else makes your coverage decisions, after the fact, using a spreadsheet.
