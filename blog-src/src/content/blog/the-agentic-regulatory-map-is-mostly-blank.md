---
title: "The agentic AI regulatory map is mostly blank — and one set of supervisors said so"
description: "Two regulators have published an agentic-specific risk taxonomy: FINRA and the FSB. US banking supervisors expressly carved agentic AI out of scope in April 2026. For ecommerce, platforms and the cross-cutting instruments, primary-source evidence does not yet exist."
pubDate: 2026-10-06
tags: ["Agentic AI", "AI Regulation", "FINRA", "FSB", "HIPAA", "AI Security"]
tldr: "Across healthcare, banking, ecommerce and platforms, only two bodies have published anything agent-specific: FINRA's 2026 oversight report names agents acting beyond delegated scope, and the FSB's June 2026 consultation carries a seven-category agentic risk taxonomy that names memory poisoning outright. US federal banking supervisors went the other way, expressly excluding generative and agentic AI from April 2026 model risk guidance. Healthcare rules cover AI but never mention agents. If you are building agentic systems in a regulated sector, you are deriving your controls from first principles, and you should know that rather than assume a framework exists."
faq:
  - q: "Which regulators have published agentic-AI-specific guidance?"
    a: "Two, as of October 2026. FINRA's 2026 Annual Regulatory Oversight Report defines AI agents and names agent-specific failure modes in a dedicated subsection. The Financial Stability Board's June 2026 consultation report carries a standalone Agentic AI risks section with seven autonomy-derived risk categories. Everything else found in healthcare, payments and platform regulation is AI-general rather than agent-specific."
  - q: "Does HIPAA cover AI agents?"
    a: "HIPAA covers AI systems handling ePHI, and the proposed Security Rule update brings AI pipelines, training data and AI software inside scope including a written technology asset inventory. But the proposal never mentions agentic systems, tool invocation or agent memory. The statutory AI definition it recites is textually broad enough to cover software agents, so coverage is inherited rather than designed."
  - q: "Have US banking regulators issued agentic AI guidance?"
    a: "The opposite. The April 2026 revised interagency model risk management guidance expressly places generative and agentic AI outside its scope, committing only to a future request for information. That is an acknowledged and currently unfilled supervisory gap, not a framework you can build against."
  - q: "What does the FSB say about agentic AI risk?"
    a: "Its June 2026 consultation report attributes risk to autonomy itself across seven categories: unauthorised actions, erroneous actions, data breaches, disruption to connected systems, risks from inadequate human oversight, additional data security and privacy risks, and additional cyber and ICT risks. It states these can materialise at great speed and that overriding or remediating them can be difficult or impossible for humans. It names memory poisoning of agent knowledge bases directly."
  - q: "Is there regulation covering agents in ecommerce or social media?"
    a: "No primary-source evidence was found. Searches targeting PCI DSS agent scoping, card scheme delegated-checkout rules, DSA recommender obligations and platform policy on automated agent accounts produced nothing agent-specific that survived verification. That absence is itself the finding."
---

I set out to map how the agentic threat model changes across regulated sectors — healthcare, banking, ecommerce, platforms — expecting to find four sets of constraints and write them up.

The map is nearly empty. Two bodies have published anything agent-specific. One set of supervisors looked at agentic AI and explicitly wrote it out of scope.

That absence is more useful to know than a tidy compliance table would have been, because it tells you what you are actually standing on when you ship an agent into a regulated environment.

## What exists, and what doesn't

<figure class="fig">
<div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>regulatory-coverage — agentic AI, Oct 2026</div>
<div class="body">
<svg viewBox="0 0 860 420" role="img" aria-label="Regulatory coverage map for agentic AI by sector">
<text class="svg-amber" x="24" y="26">SECTOR</text>
<text class="svg-amber" x="250" y="26">INSTRUMENT</text>
<text class="svg-amber" x="600" y="26">AGENT-SPECIFIC?</text>
<path class="svg-edge" d="M24 36 L836 36"/>
<rect class="svg-node-hot" x="24" y="50" width="200" height="40" rx="4"/>
<text class="svg-label" x="38" y="68">securities</text>
<text class="svg-label-sm" x="38" y="82">broker-dealers</text>
<text class="svg-label" x="250" y="68">FINRA 2026 Oversight Report</text>
<text class="svg-label-sm" x="250" y="82">published Dec 2025</text>
<text class="svg-amber" x="600" y="70">YES — named subsection</text>
<text class="svg-label-sm" x="600" y="84">scope/authority, traceability</text>
<rect class="svg-node-hot" x="24" y="100" width="200" height="40" rx="4"/>
<text class="svg-label" x="38" y="118">financial stability</text>
<text class="svg-label-sm" x="38" y="132">global</text>
<text class="svg-label" x="250" y="118">FSB consultation report</text>
<text class="svg-label-sm" x="250" y="132">10 June 2026</text>
<text class="svg-amber" x="600" y="120">YES — 7 risk categories</text>
<text class="svg-label-sm" x="600" y="134">names memory poisoning</text>
<rect class="svg-node" x="24" y="150" width="200" height="40" rx="4"/>
<text class="svg-label" x="38" y="168">banking</text>
<text class="svg-label-sm" x="38" y="182">US federal</text>
<text class="svg-label" x="250" y="168">Interagency model risk guidance</text>
<text class="svg-label-sm" x="250" y="182">April 2026</text>
<text class="svg-red" x="600" y="170">EXPRESSLY EXCLUDED</text>
<text class="svg-label-sm" x="600" y="184">future RFI promised</text>
<rect class="svg-node" x="24" y="200" width="200" height="40" rx="4"/>
<text class="svg-label" x="38" y="218">healthcare</text>
<text class="svg-label-sm" x="38" y="232">privacy / security</text>
<text class="svg-label" x="250" y="218">HIPAA Security Rule NPRM</text>
<text class="svg-label-sm" x="250" y="232">AI pipelines in scope</text>
<text class="svg-label-sm" x="600" y="220">AI-general only</text>
<text class="svg-label-sm" x="600" y="234">zero agentic mentions</text>
<rect class="svg-node" x="24" y="250" width="200" height="40" rx="4"/>
<text class="svg-label" x="38" y="268">healthcare</text>
<text class="svg-label-sm" x="38" y="282">devices</text>
<text class="svg-label" x="250" y="268">FDA draft guidance, Jan 2025</text>
<text class="svg-label-sm" x="250" y="282">scoped by function, not autonomy</text>
<text class="svg-label-sm" x="600" y="270">AI-general only</text>
<text class="svg-label-sm" x="600" y="284">0 hits: agentic / LLM</text>
<path class="svg-edge" d="M24 300 L836 300"/>
<text class="svg-red" x="24" y="324">NO PRIMARY-SOURCE EVIDENCE FOUND</text>
<text class="svg-label-sm" x="24" y="346">ecommerce and payments — PCI DSS agent scoping, card scheme delegated-checkout rules</text>
<text class="svg-label-sm" x="24" y="364">social media and platforms — DSA recommender obligations, automated-agent account policy</text>
<text class="svg-label-sm" x="24" y="382">cross-cutting — EU AI Act high-risk classification for agents, NIST sector profiles, ISO/IEC 42001</text>
<text class="svg-label-sm" x="24" y="400">documented real-world agentic exploitation incidents in any regulated sector</text>
</svg>
</div>
<figcaption><b>Coverage as of October 2026.</b> Two instruments are agent-specific. One explicitly excludes agents. Two cover AI without ever mentioning them. Four areas returned nothing.</figcaption>
</figure>

## FINRA: excessive agency, in regulator language

FINRA's 2026 Annual Regulatory Oversight Report defines the thing directly:

> AI agents are systems or programs that are capable of autonomously performing and completing tasks on behalf of a user. An AI agent can interact within an environment, plan, make decisions and take action to achieve specific goals without predefined rules or logic programming.

A subsection headed *Emerging Trends in GenAI: Agents* then carries risks that only exist because of autonomy. The first one should be familiar to anyone who has read OWASP's taxonomy:

> Agents may act beyond the user's actual or intended scope and authority.

That is excessive agency, written by a securities regulator. It sits alongside agents "acting autonomously without human validation and approval", and the observation that "complicated, multi-step agent reasoning tasks can make outcomes difficult to trace or explain, complicating auditability."

The supervisory considerations read like a control list: human-in-the-loop protocols, tracking agent actions and decisions, guardrails limiting agent behaviours, monitoring agent system access and data handling.

Two things to be precise about. The Annual Regulatory Oversight Report is an **observations and effective practices document, not a rule** — FINRA states its existing rules are technology-neutral and continue to apply, so this creates no new obligations. And agents appear as a subsection *inside* the GenAI section, not as a standalone category. It is the clearest regulatory articulation of agent risk currently available, and it is still guidance about how existing rules land.

## FSB: autonomy as the risk generator

The Financial Stability Board's June 2026 consultation report is the only structured agentic taxonomy found. The section heading is simply *Agentic AI risks*, and the lead-in is the thesis:

> The high levels of autonomy that AI agents may have can create or amplify certain risks, which can materialise at great speed, including:

Seven categories follow: unauthorised actions, erroneous actions, data breaches, disruption to connected systems, additional risks from inadequate human oversight, additional data security and privacy risks, and additional cyber and ICT risks that challenge traditional controls.

Two passages are worth reading closely. On unauthorised actions:

> They can also dynamically set or modify their objectives based on what they learn from interacting with their external environments... Overriding, redressing, or remediating these actions can be difficult or impossible for humans.

And under cyber risk, the FSB names the attack directly: threat actors can manipulate AI agents by injecting malicious data into their knowledge base — **memory poisoning**, in a financial stability document.

That is the same failure mode OWASP files as T1 and ATLAS covers under context poisoning. When a standards body, an adversary knowledge base and a financial regulator independently converge on the same mechanism, it has stopped being a research topic.

## Banking: the gap is on the record

The most striking finding is an absence that was deliberately created.

The April 2026 revised interagency model risk management guidance **expressly places generative and agentic AI outside its scope**, committing only to a future request for information.

Read that as a practitioner rather than a compliance reader. Model risk management is the framework US banking supervision would naturally reach for to govern an agentic system. The supervisors looked at it, decided the existing framework did not fit, and said so — leaving an acknowledged, currently unfilled gap.

If you are deploying agents in a US bank, there is no supervisory framework purpose-built for what you are doing, and the regulators have put that in writing. That is useful to know before someone assures a risk committee that model risk management covers it.

## Healthcare: in scope by inheritance, not by design

HIPAA's position is coverage without recognition.

The proposed Security Rule update brings AI squarely inside scope — ePHI in AI training data, prediction models and algorithm data maintained for covered functions is protected, and AI software touching or trained on ePHI must appear in the proposed written technology asset inventory.

But the proposal **never mentions agentic systems, tool invocation or agent memory**. Not once.

Coverage is inherited through a definition rather than designed for the architecture. The AI definition HHS recites — from the FY2019 NDAA — is textually broad enough to catch agents:

> an intelligent software agent... that achieves goals using perception, planning, reasoning, learning, communicating, decision making, and acting

along with systems performing tasks "without significant human oversight". Your agent is regulated. The regulation was not written with it in mind.

The FDA position is narrower still. Jurisdiction is scoped by **function, not autonomy** — the trigger is an AI-enabled device software function meeting the FD&C Act 201(h) device definition, so an agentic clinical system is regulated only where a specific function qualifies. The January 2025 draft guidance enumerates a genuine AI threat taxonomy — data poisoning, model inversion and stealing, evasion, data leakage, deliberate overfitting, training-time backdoors, performance drift — tied to section 524B cyber device obligations.

All of it is model-level. A full-text search of the 67-page draft returns **zero occurrences** of *agentic*, *generative*, *large language model*, *memory*, *prompt*, *retrieval* or *foundation model*.

One tempting bridge does not hold up. It would be elegant if HIPAA's minimum necessary standard applied to agent retrieval scope, or if business associate status functioned as a runtime check on tool invocation. No primary-source evidence supports either. Those are good architectural ideas; they are not current regulatory positions, and presenting them as such would be inventing authority.

## The four blanks

For ecommerce and payments, social media and platforms, the cross-cutting instruments, and documented real-world incidents, this research surfaced **no primary-source evidence at all**.

Not thin evidence. None that survived verification.

There is abundant secondary material asserting that PCI DSS, the DSA or the EU AI Act change your agentic threat model. What is missing is any primary instrument establishing *how* — agent-specific scoping for cardholder data, card scheme rules for delegated checkout, platform policy on automated agent accounts, or an AI Act classification analysis that turns on autonomy.

Treat confident claims in those areas as derived rather than cited, including mine.

## What to do with an empty map

If you build agentic systems in a regulated sector, three things follow.

**Stop waiting for the framework.** For most sectors it does not exist, and in US banking the supervisors have said it does not exist. Your controls come from the architecture, not the rulebook — the [six trust boundaries](/blog/threat-modeling-agentic-orchestration/) are a better starting point than a compliance matrix.

**Borrow across sectors.** The FSB's seven categories and FINRA's failure modes are not jurisdiction-bound observations about securities and stability — they are observations about autonomy. A healthcare agent exhibits the same scope-and-authority failure FINRA describes. Nothing stops you using the clearest available articulation regardless of which regulator wrote it.

**Write down what you derived.** When the guidance arrives — and the promised RFI says it will — the organisations that can show a reasoned threat model will be in a much better position than those who waited. Documented first-principles reasoning is defensible. Silence is not.

The regulatory map being blank is not a reprieve. It means the burden of defining adequate control sits with you, and that the written record of how you reasoned is doing the work a framework would otherwise do.

---

<p class="footnote"><b>Method and limits.</b> This surveys primary sources — regulators, supervisory authorities and standards bodies — and reports absence as absence rather than substituting vendor or consultancy material. Claims were verified adversarially; several plausible-sounding ones did not survive and are excluded, including a specific attribution of the model-risk exclusion to named agencies, a books-and-records obligation inferred from FINRA's traceability discussion, and specific FSB supervisory expectations such as value thresholds for human approval. The FSB taxonomy is in the consultation PDF, not the landing page. FINRA's report is observations and effective practices, not a rule. The HHS Security Rule update was a proposal at the time of writing. "No evidence found" means this survey did not surface it, not that it cannot exist — if you have primary sources for the four blank areas, I would genuinely like to see them.</p>
