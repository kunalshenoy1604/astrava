import type { Signal } from '@/lib/domain/types'
import { analysis, day, demoSourceFactory, estimate, fact, weekly } from '../helpers'

/* ------------------------------------------------------------------ */
const trSrc = demoSourceFactory('tracefile-agent-trace-format')

export const tracefile: Signal = {
  id: '0b6f6c1e-4a0e-4f3a-9a40-1d7c2f0a0004',
  slug: 'tracefile-shared-format-for-agent-run-traces',
  title: 'Tracefile: a shared, versioned format for agent run traces gains independent implementations',
  dek: 'A draft spec for recording tool calls and model turns now has four independent implementations and a conformance suite.',
  primaryTopic: 'ai-agents',
  topics: ['ai-agents', 'developer-tools', 'open-source'],
  status: 'emerging',
  timeToImpact: '3-6m',
  firstSeenAt: day('2026-08-28'),
  updatedAt: '2026-09-27T06:52:00.000Z',
  verified: true,
  hidden: false,
  isDemo: true,
  whatHappened: [
    fact('The Tracefile draft specification reached version 0.4 with a JSON schema and conformance tests.', 's1', 's2'),
    fact('Four projects not affiliated with the spec authors published readers or writers for the format.', 's3', 's4', 's5', 's6'),
  ],
  whyItMatters: [
    analysis(
      'Agent debugging today is locked to whichever framework produced the run. A shared trace format lets evaluation, replay and observability tools work across frameworks.',
    ),
    analysis('Formats that get conformance suites early tend to fragment less.'),
  ],
  technicalChange: [
    fact('A trace is an ordered list of spans: model turns, tool calls, tool results and human interventions, each with timing and token counts.', 's2'),
    fact('Tool inputs and outputs can be stored inline or as content-addressed blobs, allowing redaction without breaking hashes of other spans.', 's2'),
    fact('The spec reserves fields for replay: model parameters, random seeds where available, and tool-result snapshots.', 's2'),
  ],
  architecture: {
    caption: 'Where traces are produced and consumed',
    layers: [
      { id: 'user', label: 'User', detail: 'Task request', role: 'context' },
      { id: 'application', label: 'Agent runtime', detail: 'Emits Tracefile spans', role: 'changed' },
      { id: 'model', label: 'Model / API', detail: 'Turns recorded with parameters', role: 'context' },
      { id: 'tools', label: 'Tools', detail: 'Inputs/outputs captured or content-addressed', role: 'affected' },
      { id: 'database', label: 'Trace store', detail: 'Any store that accepts JSON / blobs', role: 'affected' },
      { id: 'infrastructure', label: 'Consumers', detail: 'Eval, replay, observability tools', role: 'affected' },
    ],
  },
  developerImplications: [
    analysis('Instrument once and switch evaluation or observability tools without re-instrumenting.'),
    estimate('Expect breaking changes before 1.0; the spec’s changelog lists two in the last month.', 's1'),
  ],
  shouldCare: {
    whatChanged: [fact('Spec 0.4 with a conformance suite, and four independent implementations.', 's1', 's3', 's4', 's5', 's6')],
    whoIsAffected: [analysis('Anyone building, evaluating or operating multi-step agents.')],
    whatCanDevelopersDo: [
      analysis('Export traces from one framework and load them in another tool to test portability.'),
      analysis('Run the conformance suite against your own exporter.', 's2'),
    ],
    productionReadiness: { level: 'experimental', statement: fact('Draft status; version 0.4.', 's1') },
    whatWouldMakeItImportant: [estimate('Adoption by at least one major agent framework as its default trace output.')],
    whatCouldPreventAdoption: [analysis('A large vendor shipping an incompatible format with more distribution.')],
  },
  difficulty: {
    overall: 2,
    setup: 2,
    conceptual: 2,
    production: 3,
    infrastructure: 2,
    rationale: 'JSON format with SDK helpers; storage and redaction policy are the main production concerns.',
  },
  adoptionSignals: [
    { label: 'Independent implementations', value: '4', sourceIds: ['s3', 's4', 's5', 's6'], kind: 'fact' },
    { label: 'Spec repository stars, latest week vs 4-week mean', value: '2.9×', sourceIds: ['s1'], kind: 'fact' },
    { label: 'Major framework default output', value: null, sourceIds: [], kind: 'fact' },
  ],
  series: [
    weekly('stars', 'Spec repository stars gained per week', 'stars', [30, 34, 41, 45, 52, 60, 70, 165], 's1'),
    weekly('implementations', 'Known implementations (cumulative)', 'implementations', [1, 1, 1, 2, 2, 3, 4, 5], 's1'),
  ],
  events: [
    { date: day('2026-08-28'), label: 'Spec 0.3 published; first seen', kind: 'first-seen', sourceIds: ['s1'] },
    { date: day('2026-09-10'), label: 'Conformance suite released', kind: 'release', sourceIds: ['s2'] },
    { date: day('2026-09-17'), label: 'Spec 0.4', kind: 'release', sourceIds: ['s1'] },
    { date: day('2026-09-24'), label: 'Fourth independent implementation', kind: 'integration', sourceIds: ['s6'] },
  ],
  risks: [
    analysis('Draft specs can stall if the authors lose interest before a major framework commits.'),
    fact('Two breaking changes landed in the last month.', 's1'),
  ],
  competingApproaches: [
    {
      name: 'Generic distributed-tracing formats',
      relation: 'complement',
      note: analysis('Carry timing well but have no agreed shape for tool results or replay data; Tracefile could map onto them.'),
    },
    { name: 'Framework-native trace formats', relation: 'incumbent', note: analysis('Richer for one framework, not portable.') },
  ],
  builders: [
    { name: 'Loomwork', kind: 'project', note: fact('Writes Tracefile from workflow runs.', 's3') },
    { name: 'Evalbench', kind: 'project', note: fact('Reads Tracefile for offline evaluation.', 's4') },
    { name: 'Spyglass', kind: 'project', note: fact('Observability UI with Tracefile import.', 's5') },
    { name: 'Relay CLI', kind: 'community', note: fact('Command-line converter.', 's6') },
  ],
  entities: [
    { slug: 'tracefile', name: 'Tracefile', kind: 'standard' },
    { slug: 'loomwork', name: 'Loomwork', kind: 'technology' },
    { slug: 'agent-tracing', name: 'Agent run tracing', kind: 'technology' },
  ],
  sources: [
    trSrc('s1', 'github', 'primary', 'tracefile-spec repository and changelog', 'GitHub', { independent: false, publishedAt: day('2026-09-17') }),
    trSrc('s2', 'documentation', 'primary', 'Tracefile 0.4 specification and conformance suite', 'Tracefile authors', {
      independent: false,
      publishedAt: day('2026-09-17'),
    }),
    trSrc('s3', 'github', 'secondary', 'Loomwork: Tracefile exporter', 'Loomwork', { independent: true, publishedAt: day('2026-09-12') }),
    trSrc('s4', 'github', 'secondary', 'Evalbench: Tracefile reader', 'Evalbench', { independent: true, publishedAt: day('2026-09-15') }),
    trSrc('s5', 'official', 'secondary', 'Spyglass release: Tracefile import', 'Spyglass', { independent: true, publishedAt: day('2026-09-20') }),
    trSrc('s6', 'github', 'community', 'relay-cli: convert framework traces to Tracefile', 'Independent developer', {
      independent: true,
      publishedAt: day('2026-09-24'),
    }),
    trSrc('s7', 'discussion', 'community', 'Discussion: portable agent traces', 'Developer forum', { independent: true, publishedAt: day('2026-09-18') }),
  ],
  scoreInputs: {
    assessed: {
      novelty: { level: 3, rationale: 'First agent-specific trace format with replay fields and conformance tests.' },
      technicalSignificance: { level: 3, rationale: 'Enables tooling interoperability; not a capability change.' },
      developerRelevance: { level: 4, rationale: 'Every team running agents in production needs traces.' },
    },
    momentumSeriesId: 'stars',
    adoptionSeriesId: 'implementations',
    independentIntegrations: 4,
    reproducibleBenchmark: null,
    runnableArtifact: true,
  },
}

/* ------------------------------------------------------------------ */
const lwSrc = demoSourceFactory('loomwork-deterministic-replay')

export const loomwork: Signal = {
  id: '0b6f6c1e-4a0e-4f3a-9a40-1d7c2f0a0005',
  slug: 'loomwork-deterministic-replay-for-agent-runs',
  title: 'Deterministic replay for agent runs ships in the Loomwork workflow engine',
  dek: 'Failed agent runs can be re-executed step-by-step from recorded tool results, turning flaky failures into reproducible bugs.',
  primaryTopic: 'ai-agents',
  topics: ['ai-agents', 'developer-tools'],
  status: 'accelerating',
  timeToImpact: '0-3m',
  firstSeenAt: day('2026-09-10'),
  updatedAt: '2026-09-26T21:18:00.000Z',
  verified: true,
  hidden: false,
  isDemo: true,
  whatHappened: [
    fact('Loomwork 3.0 added a replay mode that re-executes a recorded run using stored model outputs and tool results.', 's1'),
    fact('Replay can switch from recorded to live execution at any step, so a developer can change one tool and continue.', 's2'),
  ],
  whyItMatters: [
    analysis('Agent failures are hard to reproduce because models and tools are non-deterministic. Replay makes them debuggable like ordinary software.'),
  ],
  technicalChange: [
    fact('Each step’s inputs and outputs are persisted in an event log; replay reads the log instead of calling the model or tool.', 's2'),
    fact('Divergence detection stops replay when code changes would produce a different tool call than the recorded one.', 's2'),
  ],
  architecture: {
    caption: 'Replay intercepts model and tool calls',
    layers: [
      { id: 'application', label: 'Agent code', detail: 'Unchanged workflow definition', role: 'context' },
      { id: 'model', label: 'Model / API', detail: 'Recorded outputs served during replay', role: 'affected' },
      { id: 'tools', label: 'Tools', detail: 'Recorded results served during replay', role: 'affected' },
      { id: 'database', label: 'Event log', detail: 'Durable per-step record', role: 'changed' },
      { id: 'infrastructure', label: 'Workflow engine', detail: 'Loomwork 3.0 replay mode', role: 'changed' },
    ],
  },
  developerImplications: [
    analysis('Turn a production failure into a local test case without calling paid APIs again.'),
    analysis('Event-log storage grows with tool output size; plan retention.'),
  ],
  shouldCare: {
    whatChanged: [fact('Replay mode in Loomwork 3.0.', 's1')],
    whoIsAffected: [analysis('Teams running long-running or multi-step agents in production.')],
    whatCanDevelopersDo: [analysis('Record a week of runs and replay the failures before changing prompts.')],
    productionReadiness: { level: 'production-ready', statement: fact('Released as stable in 3.0.', 's1') },
    whatWouldMakeItImportant: [estimate('Replay traces exported in a portable format so other tools can use them.')],
    whatCouldPreventAdoption: [analysis('Requires running agents inside Loomwork; retrofitting existing agents is non-trivial.')],
  },
  difficulty: {
    overall: 3,
    setup: 3,
    conceptual: 3,
    production: 3,
    infrastructure: 3,
    rationale: 'Requires adopting a durable-workflow model; the replay feature itself is a flag.',
  },
  adoptionSignals: [
    { label: 'Package downloads, latest week vs 4-week mean', value: '3.4×', sourceIds: ['s3'], kind: 'fact' },
    { label: 'Public case studies', value: '1', sourceIds: ['s4'], kind: 'fact' },
  ],
  series: [weekly('downloads', 'Package downloads per week', 'downloads', [8200, 8500, 8900, 9100, 9400, 9800, 10400, 33300], 's3')],
  events: [
    { date: day('2026-09-10'), label: 'Loomwork 3.0 released', kind: 'release', sourceIds: ['s1'] },
    { date: day('2026-09-19'), label: 'Case study: replay in production', kind: 'integration', sourceIds: ['s4'] },
  ],
  risks: [analysis('Replay fidelity depends on every side effect being routed through the engine.')],
  competingApproaches: [
    { name: 'Durable-execution platforms', relation: 'incumbent', note: analysis('General workflow replay without agent-specific divergence tooling.') },
    { name: 'Trace-and-eval tools', relation: 'complement', note: analysis('Observe runs but do not re-execute them.') },
  ],
  builders: [{ name: 'Loomwork maintainers', kind: 'project', note: fact('Ship the replay mode.', 's1') }],
  entities: [
    { slug: 'loomwork', name: 'Loomwork', kind: 'technology' },
    { slug: 'deterministic-replay', name: 'Deterministic replay', kind: 'technology' },
  ],
  sources: [
    lwSrc('s1', 'official', 'primary', 'Loomwork 3.0 release announcement', 'Loomwork', { independent: false, publishedAt: day('2026-09-10') }),
    lwSrc('s2', 'documentation', 'primary', 'Loomwork docs: replay and divergence detection', 'Loomwork', {
      independent: false,
      publishedAt: day('2026-09-10'),
    }),
    lwSrc('s3', 'github', 'primary', 'loomwork repository and package statistics', 'GitHub', { independent: false, publishedAt: day('2026-09-26') }),
    lwSrc('s4', 'news', 'secondary', 'Case study: debugging agent failures with replay', 'Engineering blog (independent)', {
      independent: true,
      publishedAt: day('2026-09-19'),
    }),
    lwSrc('s5', 'discussion', 'community', 'Thread: replaying agent runs', 'Developer forum', { independent: true, publishedAt: day('2026-09-12') }),
  ],
  scoreInputs: {
    assessed: {
      novelty: { level: 3, rationale: 'Replay exists in workflow engines; agent-aware divergence detection is new.' },
      technicalSignificance: { level: 3, rationale: 'Addresses the core debuggability problem for agents.' },
      developerRelevance: { level: 3, rationale: 'High for Loomwork users; requires adoption for others.' },
    },
    momentumSeriesId: 'downloads',
    independentIntegrations: 1,
    reproducibleBenchmark: null,
    runnableArtifact: true,
  },
}

/* ------------------------------------------------------------------ */
const plsSrc = demoSourceFactory('promptls-typed-prompt-language-server')

export const promptls: Signal = {
  id: '0b6f6c1e-4a0e-4f3a-9a40-1d7c2f0a0006',
  slug: 'promptls-language-server-for-typed-prompt-templates',
  title: 'Promptls: a language server that type-checks prompt template variables',
  dek: 'Early community attention for editor tooling that flags missing or mistyped template variables. Evidence is thin.',
  primaryTopic: 'developer-tools',
  topics: ['developer-tools', 'ai-agents'],
  status: 'unconfirmed',
  timeToImpact: 'unknown',
  firstSeenAt: day('2026-09-24'),
  updatedAt: '2026-09-26T09:30:00.000Z',
  verified: false,
  hidden: false,
  isDemo: true,
  whatHappened: [
    fact('A developer posted a demo of a language server that reports type errors in prompt template variables.', 's1'),
    fact('The linked repository contains a README and no tagged release.', 's2'),
  ],
  whyItMatters: [analysis('Prompt templates are a common source of runtime errors that ordinary type checkers do not see.')],
  technicalChange: [],
  architecture: null,
  developerImplications: [],
  shouldCare: {
    whatChanged: [fact('A demo and an early repository.', 's1', 's2')],
    whoIsAffected: [analysis('Developers who maintain many prompt templates in application code.')],
    whatCanDevelopersDo: [analysis('Nothing actionable yet; watch for a tagged release and documentation.')],
    productionReadiness: { level: 'unknown', statement: analysis('No release exists to evaluate.') },
    whatWouldMakeItImportant: [estimate('A release, editor extensions, and use by projects other than the author’s.')],
    whatCouldPreventAdoption: [analysis('Template formats differ across frameworks; a single checker may not cover them.')],
  },
  difficulty: null,
  adoptionSignals: [
    { label: 'Releases', value: null, sourceIds: [], kind: 'fact' },
    { label: 'Independent users', value: null, sourceIds: [], kind: 'fact' },
  ],
  series: [weekly('mentions', 'Forum mentions per week', 'mentions', [0, 0, 1, 9])],
  events: [{ date: day('2026-09-24'), label: 'Demo posted; first seen', kind: 'first-seen', sourceIds: ['s1'] }],
  risks: [analysis('Single author; no release.')],
  competingApproaches: [
    { name: 'Typed prompt builders in application code', relation: 'alternative', note: analysis('Achieve similar safety through the host language’s type system.') },
  ],
  builders: [],
  entities: [{ slug: 'promptls', name: 'Promptls', kind: 'technology' }],
  sources: [
    plsSrc('s1', 'discussion', 'community', 'Show: a language server for prompt templates — game-changer for prompt engineering', 'Developer forum', {
      independent: false,
      publishedAt: day('2026-09-24'),
    }),
    plsSrc('s2', 'github', 'primary', 'promptls repository (no releases)', 'GitHub', { independent: false, publishedAt: day('2026-09-24') }),
    plsSrc('s3', 'discussion', 'community', 'Reply thread: would use this', 'Developer forum', { independent: true, publishedAt: day('2026-09-25') }),
    plsSrc('s4', 'discussion', 'community', 'Social post: typed prompts are the future', 'Social network', { independent: true, publishedAt: day('2026-09-25') }),
  ],
  scoreInputs: {
    assessed: {
      novelty: { level: 2, rationale: 'Language-server approach is new for prompt templates.' },
      technicalSignificance: { level: null, rationale: 'Cannot be judged without a release.' },
      developerRelevance: { level: 2, rationale: 'Useful if it ships; narrow audience.' },
    },
    momentumSeriesId: 'mentions',
    independentIntegrations: null,
    reproducibleBenchmark: null,
    runnableArtifact: false,
  },
}

/* ------------------------------------------------------------------ */
const lumSrc = demoSourceFactory('lumen-browser-model-runtime')

export const lumen: Signal = {
  id: '0b6f6c1e-4a0e-4f3a-9a40-1d7c2f0a0007',
  slug: 'lumen-runtime-stable-api-for-in-browser-models',
  title: 'Lumen Runtime stabilises its API for running small models in the browser with WebGPU',
  dek: 'A 1.0 API freeze for in-browser inference, with two independent apps shipping it to users.',
  primaryTopic: 'developer-tools',
  topics: ['developer-tools', 'ai-infrastructure', 'open-source'],
  status: 'establishing',
  timeToImpact: '0-3m',
  firstSeenAt: day('2026-07-30'),
  updatedAt: '2026-09-25T15:02:00.000Z',
  verified: true,
  hidden: false,
  isDemo: true,
  whatHappened: [
    fact('Lumen Runtime 1.0 froze its JavaScript API for loading and running quantized models via WebGPU.', 's1'),
    fact('Two applications from independent teams announced production use of Lumen for on-device features.', 's3', 's4'),
  ],
  whyItMatters: [
    analysis('A stable API lowers the risk of building features that keep user data on the device and cost nothing per request.'),
  ],
  technicalChange: [
    fact('Models are loaded as sharded, quantized weight files cached by the browser.', 's2'),
    fact('The runtime falls back to WebAssembly SIMD when WebGPU is unavailable.', 's2'),
  ],
  architecture: {
    caption: 'In-browser inference with Lumen',
    layers: [
      { id: 'user', label: 'User device', detail: 'Browser with WebGPU', role: 'affected' },
      { id: 'application', label: 'Web app', detail: 'Calls Lumen JS API', role: 'affected' },
      { id: 'model', label: 'Model', detail: 'Quantized small model, cached locally', role: 'changed' },
      { id: 'infrastructure', label: 'Runtime', detail: 'Lumen 1.0 on WebGPU / WASM fallback', role: 'changed' },
      { id: 'network', label: 'Network', detail: 'Only for first weight download', role: 'context' },
    ],
  },
  developerImplications: [
    analysis('Initial download size is the main UX cost; budget for it and show progress.'),
    analysis('Device capability varies widely; features need graceful fallback.'),
  ],
  shouldCare: {
    whatChanged: [fact('API frozen at 1.0.', 's1')],
    whoIsAffected: [analysis('Web developers building privacy-sensitive or offline AI features.')],
    whatCanDevelopersDo: [analysis('Prototype classification, extraction or short-form generation features that run locally.')],
    productionReadiness: { level: 'production-ready', statement: fact('1.0 with a documented stability policy.', 's1') },
    whatWouldMakeItImportant: [estimate('Broader WebGPU availability on mobile browsers.')],
    whatCouldPreventAdoption: [analysis('Model download size and memory limits on low-end devices.')],
  },
  difficulty: {
    overall: 2,
    setup: 2,
    conceptual: 2,
    production: 3,
    infrastructure: 1,
    rationale: 'npm package and a model URL; the hard parts are UX around downloads and device variance.',
  },
  adoptionSignals: [
    { label: 'Production users (public)', value: '2 independent apps', sourceIds: ['s3', 's4'], kind: 'fact' },
    { label: 'npm downloads, latest week vs 4-week mean', value: '1.3×', sourceIds: ['s5'], kind: 'fact' },
  ],
  series: [
    weekly('downloads', 'npm downloads per week', 'downloads', [14000, 15500, 17100, 18800, 20100, 21900, 23800, 27400], 's5'),
  ],
  events: [
    { date: day('2026-07-30'), label: 'Release candidate; first seen', kind: 'first-seen', sourceIds: ['s1'] },
    { date: day('2026-09-02'), label: 'Lumen 1.0', kind: 'release', sourceIds: ['s1'] },
    { date: day('2026-09-11'), label: 'First public production use', kind: 'integration', sourceIds: ['s3'] },
  ],
  risks: [analysis('Browser vendors’ WebGPU limits can change and break memory assumptions.')],
  competingApproaches: [
    { name: 'Server-side inference APIs', relation: 'incumbent', note: analysis('Better quality; per-request cost and data leaves the device.') },
    { name: 'Native mobile runtimes', relation: 'alternative', note: analysis('Faster on-device, but not available to web apps.') },
  ],
  builders: [
    { name: 'Independent app A', kind: 'company', note: fact('On-device summarisation feature.', 's3') },
    { name: 'Independent app B', kind: 'company', note: fact('Local classification for form inputs.', 's4') },
  ],
  entities: [
    { slug: 'lumen-runtime', name: 'Lumen Runtime', kind: 'technology' },
    { slug: 'webgpu', name: 'WebGPU', kind: 'standard' },
  ],
  sources: [
    lumSrc('s1', 'official', 'primary', 'Lumen Runtime 1.0 and the stability policy', 'Lumen project', { independent: false, publishedAt: day('2026-09-02') }),
    lumSrc('s2', 'documentation', 'primary', 'Lumen docs: model loading and fallbacks', 'Lumen project', { independent: false, publishedAt: day('2026-09-02') }),
    lumSrc('s3', 'official', 'secondary', 'How we shipped on-device summaries', 'Independent app A', { independent: true, publishedAt: day('2026-09-11') }),
    lumSrc('s4', 'official', 'secondary', 'Local classification in the browser', 'Independent app B', { independent: true, publishedAt: day('2026-09-21') }),
    lumSrc('s5', 'github', 'primary', 'lumen-runtime repository and npm statistics', 'GitHub', { independent: false, publishedAt: day('2026-09-25') }),
  ],
  scoreInputs: {
    assessed: {
      novelty: { level: 2, rationale: 'In-browser inference is known; a stable API is the change.' },
      technicalSignificance: { level: 3, rationale: 'Makes on-device web AI a dependable building block.' },
      developerRelevance: { level: 3, rationale: 'Large web-developer audience; limited to small models.' },
    },
    momentumSeriesId: 'downloads',
    adoptionSeriesId: 'downloads',
    independentIntegrations: 2,
    reproducibleBenchmark: null,
    runnableArtifact: true,
  },
}
