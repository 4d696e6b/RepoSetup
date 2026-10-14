# Task router: evidence-based quality and cost admission

Implemented 2026-10-13 as a post-milestone extension of the offline task compiler.
No paid provider call, dependency installation, package version or website change.
This changes runtime source; the earlier I/J hosted evidence describes its earlier
source and is not a complete qualification of this extension.

## Research adapted

Pacharapol Pimpa, *Measuring AI Performance and Selecting Models Under Quality and
Cost Constraints*, research version 1.0.0, 11 October 2026, supplied PDF SHA-256
`85f9b54b9b9d34b4bf8a9fbbb07f49d59c5c019890397c710cdfb91abd550a9e`.
The manuscript identifies itself as independent and not peer reviewed. Sections
4–5 (pages 3–7) specify quality-first admissibility, complete configuration identity,
full-horizon cost, separate uncertainty semantics and deterministic selection.
Section 6.2 (page 8) specifies paired exact-binomial admission. Sections 8–9
(pages 15–16) explicitly limit empirical claims: the predictive-pipeline study
neither validates the proposed LLM optimizer nor establishes complete cash savings.
This implementation adapts that specification, not its unrelated Bean/Bike scores,
Qwen configurations or hypothetical thresholds as RepoSetup model evidence.

Exact binomial-tail inversion was checked against the official
[NIST confidence-limit specification](https://www.itl.nist.gov/div898/software/dataplot/refman2/auxillar/exacbici.htm).
Tests independently use SciPy beta quantiles at ordinary, near-boundary and
10,000-trial inputs, and the paper's zero-disagreement precision examples.
No statistical dependency was added to the runtime.

## Trusted evidence boundary

`TaskRoutingEvaluation` is a strict version 1 **host-reviewed** record. It is
accepted through core routing authority or CLI dependency injection, never through
stack/task preferences, TaskPlans, ChangeSets, model replies or a new CLI command.
A host may provide one evaluation directly to core or up to 64 task-specific
records in `evaluations`; ambiguous task records and missing task coverage fail.
Providing a registry never silently falls back to heuristic offline routing.

Identity binds the catalog, routing workflow revision, exact task, execution
preferences (including global attempts/budgets), protocol,
population, selection case order and distinct held-out split hash. Each model/native
effort pair has a configuration hash binding its declared immutable model revision,
prompt revision, input/output caps and timeout. The reviewed catalog effort must
bind that same configuration hash. Admission checks requested timeout/output cap,
context capacity, price revision, evidence dates, scope and the existing capability,
availability, provider allowance and remaining reservations.

A single ordered case manifest pairs every candidate with the reference. Unique
problem IDs, complete terminal boolean outcomes and a declared independent
problem-level Bernoulli sampling model are required. Null is missing evidence.
A compilation error, truncation, timeout or unsuccessful frozen test must be
recorded as false, not omitted. Repeated generations of one problem do not add
independent sample size. Unsupported dependence is explicitly insufficient evidence.

Hashes and a sampling declaration are not authentication, proof of independence,
representative tasks or absence of training contamination. Host review must verify
raw outcomes, dataset disjointness, model/adapter identity, prompt/decoder/stop rules,
all retries/repair/verification and costs under the frozen protocol. Configuration
hashes do not force a provider alias to be immutable; drift requires new evidence.
Current production profiles have no such qualification and remain unconfirmed.

## Admission and decision

For the frozen `single_completion_test_pass` metric:

1. Use one-sided Clopper–Pearson binomial bounds by tail inversion, with outward
   numerical guards. Allocate the family alpha across `2 * candidateCount - 1`
   claims: each absolute pass-rate floor and each non-identity paired comparison.
2. Compute the paired degradation upper bound as the upper probability bound on
   reference-pass/candidate-fail minus the lower bound on candidate-pass/reference-fail.
   Each component receives half the contrast error allowance. Reference against
   itself is exactly zero by identity; zero observed disagreements between different
   configurations retain positive uncertainty.
3. Admit quality only when the lower pass-rate bound meets the predeclared floor
   and the paired degradation upper bound meets the predeclared margin. Crossing
   a threshold is inconclusive, not proof of low population quality or equivalence.
4. Require complete full-policy expected/upper cost in micro-USD for the declared
   horizon, tariff/accounting revisions and explicit bound interpretation/assumptions.
   Reject missing costs or omitted attempts/overhead. Require every reviewed resource
   with matching unit/statistic and a finite upper-to-limit ratio. Quality error
   control does not establish cost/resource coverage; their bound assumptions are
   independently reviewed. Expected cost projections and caps are not invoices.
5. Reject over-budget/resource candidates before ranking. Among candidates passing
   both these evidence gates and existing runtime filters, select least projected
   expected total cost, then lower upper allowance, lower maximum reviewed normalized
   resource utilization, then lexical immutable configuration ID. No epsilon ties
   or quality/safety compensation by low price. Declare only comparable resource
   statistics in the reviewed limits; omit resource tie-breaking by using no limits
   when an operationally meaningful comparison is unavailable.

Runtime single-call reservation ceilings remain independent of horizon planning.
Low full-horizon expected cost cannot authorize an over-budget request. Model
capability and native effort remain separate: initial `minimum_supported` selection
can compare every supported effort with evidence; explicit efforts and the existing
first-repair/third-attempt escalation policy remain authoritative. There is no
assumption that an effort ladder proves a quality ladder.

Live routing now requires the evidence record plus existing **live** model
qualification and held-out confirmation of `frozenSelectionConfigurationId`, the
selection-set winner fixed before confirmation. Admission/ranking still uses the
selection outcomes; a different current winner blocks routing, even if that other
configuration also has a passing confirmation. Offline evidence cannot qualify live
routing. Held-out confirmation is a trusted frozen-protocol verdict and evidence
hash, not new tuning observations. Any recorded held-out failure blocks the entire
protocol: no reference fallback or reselecting another winner on the same data.
The evaluator does not run or independently verify those raw confirmation records.

Receipts bind evaluation identity, method, family allocation, each pair's status,
reasons and numerical bounds/costs, including no-selection error diagnostics. Status
distinguishes admissible, insufficient evidence, quality inconclusive, operational
rejection and confirmation rejection. Existing candidate
reasons separately retain unsupported effort/capability/availability, missing
configuration mapping and runtime budget rejection. Accepted configuration and
full aggregate trace are hashed into the immutable routing decision.

## Compatibility and lifecycle

Domain evaluation/statistics remain in core; CLI only carries trusted injected
evidence and requested timeout. Executor routing at attempt start and before each
provider proposal uses the same authority and rechecks growing context and remaining
allowance. Optional version 1 receipt/catalog/operation fields preserve parsing of
existing artifacts; no stack/selection input changes. Offline callers without an
evidence authority retain the old heuristic behavior and stable catalog tie order.
Live callers with only broad capability evidence now fail closed.

Routing policy identity advances to revision 2. Existing routed checkpoints bound
to revision 1 cannot be silently resumed under new policy. Private effects and
reservations remain retained for inspection; no automatic adoption, replay,
allowance reset, rollback or migration occurs. Evidence changes also change routing
authority identity. Historical acceptance can still be inspected without granting
fresh authority. New routed runs require new preview/review and appropriate evidence.

## Limits and next evidence

These are implementation/statistical-contract improvements, not measured model
quality or savings. Synthetic tests verify gates, ties, empty/no-selection behavior,
uncertainty, missing evidence, drift, confirmation failure and legacy compatibility.
The trusted evidence API supplies no production dataset, new provider/backend,
local model, auto-benchmark, credential request, paid call or automatic profiling.
Native rubric metrics beyond independent binary code-test outcomes need a separate
reviewed statistical method. This does not pool unrelated task populations.

After integrating new source with the final published 0.3.0 baseline, rerun the
complete supported-host concrete/full qualification, review the exact new packed
artifact and retain source/runtime identities. Original managed/versioned release
requirements stay deferred. Model service claims need actual independent live
and empirical evidence; the offline compiler remains usable without AI credits.
