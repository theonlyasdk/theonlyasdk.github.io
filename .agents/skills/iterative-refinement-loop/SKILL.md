---
name: iterative-refinement-loop
description: Executes an autonomous self-critique, multi-subagent investigation, and iterative refinement feedback loop. Use when tackling complex problem-solving, detailed research, high-stakes writing, rigorous analysis, or whenever the user asks for deep thinking, thorough verification, or self-correcting output.
---

# Iterative Refinement Loop

A structured feedback mechanism designed for medium-tier AI models to prevent shallow or incomplete responses. It enforces an autonomous loop of drafting, specialized subagent investigation, adversarial critique, and iterative revision before producing the final answer.

## Summary

This skill establishes a repeatable multi-stage refinement engine. Instead of providing a single-pass response, the agent decomposes the task, builds a baseline draft, dispatches specialized investigative subagents to audit the draft, scores flaws against a strict rubric, and rewrites the content until quality thresholds are satisfied.

## When to Use

* Complex research, technical explanations, or multi-faceted problem-solving.
* High-stakes writing, strategy documents, or analytical comparisons where depth matters.
* Tasks with strict constraints or multi-part questions that single-pass generation tends to answer superficially.
* The user explicitly asks for self-critique, iterative refinement, or multi-perspective review.

Do NOT use for:

* Simple factual lookups, trivial queries, or short conversational pleasantries.
* Time-critical commands where minimal latency is paramount.

## Core Workflow

Follow this 5-stage loop systematically. Do not skip stages or present unvetted initial drafts to the user.

```
[User Prompt] -> [1. Deconstruct & Plan] -> [2. Initial Draft]
                       ^                              |
                       |                              v
               [5. Re-evaluate] <---- [4. Edit] <---- [3. Subagent Audit & Critique]
                       |
                 (Threshold Met?)
                  /          \
                Yes           No (Iterate <= 3 cycles)
                /              \
         [Final Output]     [Back to Step 4]

```

### Stage 1: Deconstruct Prompt and Establish Quality Targets

Break down the user's prompt into atomic requirements before generating content.

1. **Catalog Deliverables**: List every explicit instruction, implicit requirement, constraint, and expected tone.
2. **Define Failure Modes**: Identify what a lazy or superficial response would look like (e.g. generic bullet points, lack of concrete examples, unverified assertions).
3. **Set Quality Benchmarks**: Establish concrete acceptance criteria for depth, factual grounding, and structure.

### Stage 2: Generate Baseline Draft

Construct a complete, end-to-end draft targeting all identified requirements.

* Aim for comprehensiveness over brevity on the first pass.
* Lay out reasoning, key arguments, technical data, and structured explanations.
* Mark uncertain claims or assumptions clearly so investigative subagents can target them directly.

### Stage 3: Multi-Subagent Investigation and Audit

Medium-tier models often succumb to self-confirmation bias if reviewing their work holistically. Counteract this by dividing the audit across distinct virtual subagents with dedicated mandates.

Execute the following subagent inspections in sequence:

1. **Subagent 1: Fact and Evidence Investigator**
* **Mandate**: Verify factual claims, statistics, dates, and technical logic.
* **Action**: Check every asserted fact against trusted tools (web search, documentation, or code execution) if available. Flag unverified assertions, vague attributions, or logical fallacies.
* **Output**: List of verified facts, refuted claims, and claims needing citation or verification.


2. **Subagent 2: Adversarial Red Teamer**
* **Mandate**: Attack the draft's reasoning, find edge cases, and expose blind spots.
* **Action**: Ask: "Where does this solution break? What counterarguments exist? What hidden assumptions are untested?"
* **Output**: 2-3 specific vulnerabilities or counter-perspectives that must be addressed.


3. **Subagent 3: Completeness and Depth Auditor**
* **Mandate**: Prevent shallow explanations and ensure every prompt element is fully answered.
* **Action**: Cross-reference the draft against the catalog of deliverables from Stage 1. Flag hand-waving phrases (e.g., "etc.", "and so on", "various factors") and demand concrete elaboration.
* **Output**: Specific gaps where detail, examples, or steps are missing.


4. **Subagent 4: Structural and Stylistic Editor**
* **Mandate**: Optimize readability, hierarchy, flow, and conciseness.
* **Action**: Eliminate filler, corporate fluff, and repetitive phrasing. Ensure formatting (headings, code blocks, tables) enhances comprehension.
* **Output**: Specific organizational adjustments and phrasing improvements.



### Stage 4: Synthesize Critique and Refine

Aggregate all subagent findings into a consolidated revision agenda, then rewrite.

1. **Critique Synthesis Table**:
* Record findings across four dimensions: Factual Accuracy, Logical Rigor, Depth/Completeness, and Structure.
* Assign a score from 1 (unacceptable) to 5 (flawless) for each dimension.
* Formulate 2 to 4 mandatory "Delta Actions" (concrete modifications required).


2. **Execute Rewrites**:
* Address each Delta Action directly within the text.
* Integrate evidence gathered by the Fact Investigator.
* Neutralize or resolve objections raised by the Red Teamer.
* Flesh out sections flagged as shallow by the Completeness Auditor.
* Tighten structure based on the Editor's guidance.



### Stage 5: Convergence Check and Exit Condition

Evaluate the revised draft against the exit criteria:

* **Pass Condition**: All dimensions score 4 or higher, all prompt requirements are met, and no unresolved factual or logical flaws remain.
* **Fail Condition (Score < 4)**: If flaws persist and the loop count is under 3, return to Stage 3 for another targeted audit focusing specifically on the remaining weaknesses.
* **Circuit Breaker**: Stop at 3 refinement cycles to prevent infinite loops and token exhaustion. If cycle 3 is reached without a perfect score, proceed with the best version and transparently note any persistent trade-offs.

## Structured Critique Template

When documenting the internal loop during execution, maintain this lightweight structure:

```markdown
### Cycle [N] Audit & Critique

#### Subagent Findings
- **Fact Investigator**: [Key inaccuracies or unverified claims found]
- **Adversarial Critic**: [Weakest argument or vulnerable assumption]
- **Completeness Auditor**: [Omitted requirements or shallow sections]
- **Stylistic Editor**: [Pacing, structure, and clarity issues]

#### Scorecard
- Factual Accuracy: [1-5]
- Logical Rigor: [1-5]
- Depth & Completeness: [1-5]
- Structure & Clarity: [1-5]

#### Mandatory Delta Actions
1. [Specific edit action 1]
2. [Specific edit action 2]

```

## Gotchas and Best Practices

* **Avoid Rubber-Stamping**: Do not let subagents give generic praise like "Looks good overall." Every subagent must find at least one concrete flaw or improvement point in early cycles.
* **Prevent Hallucinated Fixes**: Ensure revisions actually solve the critique instead of rephrasing the same hollow content with more elaborate vocabulary.
* **Guard Against Scope Creep**: Keep revisions laser-focused on answering the user prompt. Do not add tangential encyclopedic information just to increase word count.
* **Maintain Deliverable Focus**: If the user requested a specific format (code snippet, email, table, step-by-step guide), ensure the final deliverable maintains that exact format after all refinement cycles.
