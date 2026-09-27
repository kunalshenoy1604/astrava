import type { Signal } from '@/lib/domain/types'
import { analysis, day, demoSourceFactory, estimate, fact, weekly } from '../helpers'

/* ------------------------------------------------------------------ */
const mSrc = demoSourceFactory('marrow-vla-open-recipes')

export const marrowVla: Signal = {
  id: '0b6f6c1e-4a0e-4f3a-9a40-1d7c2f0a0011',
  slug: 'marrow-vla-open-vision-language-action-checkpoints',
  title: 'Marrow-VLA releases vision-language-action checkpoints with full training recipes',
  dek: 'Open checkpoints plus data-mixture and training scripts; one lab reports a reproduction on different robot arms.',
  primaryTopic: 'robotics',
  topics: ['robotics', 'foundation-models', 'open-source'],
  status: 'emerging',
  timeToImpact: '12-24m',
  firstSeenAt: day('2026-09-05'),
  updatedAt: '2026-09-26T13:10:00.000Z',
  verified: true,
  hidden: false,
  isDemo: true,
  whatHappened: [
    fact('The Marrow team released policy checkpoints, the data-mixture specification and training scripts.', 's1', 's2'),
    fact('An unaffiliated lab reported reproducing the headline manipulation results on a different robot arm.', 's4'),
  ],
  whyItMatters: [
    analysis('Open recipes, not just weights, let other groups fine-tune for their own hardware — the main barrier in robot learning.'),
  ],
  technicalChange: [
    fact('The policy maps camera images and a language instruction to low-level arm actions.', 's3'),
    fact('Training mixes teleoperation demonstrations from multiple robot types with web image-text data.', 's3'),
  ],
  architecture: {
    caption: 'Vision-language-action policy in a robot control loop',
    layers: [
      { id: 'user', label: 'Operator', detail: 'Natural-language instruction', role: 'context' },
      { id: 'model', label: 'VLA policy', detail: 'Marrow checkpoint', role: 'changed' },
      { id: 'application', label: 'Controller', detail: 'Converts actions to joint commands', role: 'affected' },
      { id: 'hardware', label: 'Robot', detail: 'Arm, gripper, cameras', role: 'affected' },
    ],
  },
  developerImplications: [estimate('For most software teams this is a research signal; robotics teams can start fine-tuning experiments now.')],
  shouldCare: {
    whatChanged: [fact('Open checkpoints and full recipes.', 's1', 's2')],
    whoIsAffected: [analysis('Robotics researchers and teams building manipulation products.')],
    whatCanDevelopersDo: [analysis('Evaluate in simulation before hardware.')],
    productionReadiness: { level: 'not-ready', statement: fact('Released as a research artifact.', 's1') },
    whatWouldMakeItImportant: [estimate('Multiple reproductions on commodity arms and a safety evaluation protocol.')],
    whatCouldPreventAdoption: [analysis('Hardware cost and the data needed to fine-tune for a new robot.')],
  },
  difficulty: {
    overall: 5,
    setup: 4,
    conceptual: 5,
    production: 5,
    infrastructure: 5,
    rationale: 'Requires robot hardware, GPU training capacity and control-systems knowledge.',
  },
  adoptionSignals: [
    { label: 'Independent reproductions', value: '1', sourceIds: ['s4'], kind: 'fact' },
    { label: 'Checkpoint downloads, latest week vs 4-week mean', value: '2.1×', sourceIds: ['s2'], kind: 'fact' },
  ],
  series: [weekly('downloads', 'Checkpoint downloads per week', 'downloads', [0, 0, 380, 420, 410, 450, 470, 920], 's2')],
  events: [
    { date: day('2026-09-05'), label: 'Checkpoints and recipes released', kind: 'release', sourceIds: ['s1'] },
    { date: day('2026-09-23'), label: 'Independent reproduction reported', kind: 'benchmark', sourceIds: ['s4'] },
  ],
  risks: [analysis('One reproduction is encouraging but not conclusive.'), analysis('Real-world safety has not been evaluated.')],
  competingApproaches: [
    { name: 'Task-specific imitation learning', relation: 'incumbent', note: analysis('Less general, far cheaper to train.') },
    { name: 'Closed VLA models', relation: 'alternative', note: analysis('Possibly stronger, but not reproducible or fine-tunable.') },
  ],
  builders: [{ name: 'Unaffiliated robotics lab', kind: 'research-group', note: fact('Reproduced results on a different arm.', 's4') }],
  entities: [
    { slug: 'marrow-vla', name: 'Marrow-VLA', kind: 'technology' },
    { slug: 'vision-language-action', name: 'Vision-language-action models', kind: 'technology' },
  ],
  sources: [
    mSrc('s1', 'official', 'primary', 'Marrow-VLA release: checkpoints and recipes', 'Marrow team', { independent: false, publishedAt: day('2026-09-05') }),
    mSrc('s2', 'github', 'primary', 'marrow-vla repository and model card', 'GitHub', { independent: false, publishedAt: day('2026-09-05') }),
    mSrc('s3', 'paper', 'primary', 'Marrow-VLA technical report', 'Marrow team', { independent: false, publishedAt: day('2026-09-05') }),
    mSrc('s4', 'benchmark', 'secondary', 'Reproducing Marrow-VLA on a different arm', 'Unaffiliated robotics lab', {
      independent: true,
      publishedAt: day('2026-09-23'),
    }),
  ],
  scoreInputs: {
    assessed: {
      novelty: { level: 3, rationale: 'Full recipes for a VLA at this scale are rare.' },
      technicalSignificance: { level: 3, rationale: 'Lowers the barrier for robot-learning research.' },
      developerRelevance: { level: 1, rationale: 'Narrow audience of robotics developers.' },
    },
    momentumSeriesId: 'downloads',
    independentIntegrations: 1,
    reproducibleBenchmark: true,
    runnableArtifact: true,
  },
}

/* ------------------------------------------------------------------ */
const qSrc = demoSourceFactory('qubitline-error-mitigated-chemistry')

export const qubitline: Signal = {
  id: '0b6f6c1e-4a0e-4f3a-9a40-1d7c2f0a0012',
  slug: 'qubitline-error-mitigated-chemistry-workflow',
  title: 'Qubitline SDK packages an end-to-end error-mitigated chemistry workflow',
  dek: 'A Python SDK now wraps error mitigation into a single workflow call. Results are on small molecules; significance is still unclear.',
  primaryTopic: 'quantum-computing',
  topics: ['quantum-computing'],
  status: 'early-signal',
  timeToImpact: '24m+',
  firstSeenAt: day('2026-09-17'),
  updatedAt: '2026-09-23T16:25:00.000Z',
  verified: false,
  hidden: false,
  isDemo: true,
  whatHappened: [
    fact('Qubitline 0.5 added a workflow that runs a variational chemistry calculation with built-in error mitigation.', 's1'),
    fact('The accompanying notebook reports results for molecules with fewer than 12 qubits.', 's2'),
  ],
  whyItMatters: [analysis('Packaging mitigation lowers the expertise needed to run experiments, but small-molecule results do not demonstrate an advantage over classical methods.')],
  technicalChange: [fact('Zero-noise extrapolation is applied automatically across repeated circuit executions.', 's2')],
  architecture: null,
  developerImplications: [estimate('Relevant to researchers exploring quantum chemistry; not to application developers in the near term.')],
  shouldCare: {
    whatChanged: [fact('Workflow-level error mitigation in the SDK.', 's1')],
    whoIsAffected: [analysis('Quantum-computing researchers and students.')],
    whatCanDevelopersDo: [analysis('Run the notebook on a simulator to learn the workflow.')],
    productionReadiness: { level: 'not-ready', statement: analysis('Research tooling.') },
    whatWouldMakeItImportant: [estimate('Results on problem sizes that are hard for classical methods, independently checked.')],
    whatCouldPreventAdoption: [analysis('Hardware noise limits and queue access.')],
  },
  difficulty: {
    overall: 5,
    setup: 2,
    conceptual: 5,
    production: 5,
    infrastructure: 4,
    rationale: 'Easy to install; interpreting results requires quantum-chemistry background.',
  },
  adoptionSignals: [{ label: 'Independent use', value: null, sourceIds: [], kind: 'fact' }],
  series: [weekly('downloads', 'SDK downloads per week', 'downloads', [510, 530, 520, 560, 540, 570, 590, 760], 's3')],
  events: [{ date: day('2026-09-17'), label: 'Qubitline 0.5', kind: 'release', sourceIds: ['s1'] }],
  risks: [analysis('Easy to over-interpret small-molecule results.')],
  competingApproaches: [{ name: 'Classical computational chemistry', relation: 'incumbent', note: analysis('Remains more accurate at these sizes.') }],
  builders: [],
  entities: [
    { slug: 'qubitline', name: 'Qubitline', kind: 'technology' },
    { slug: 'quantum-error-mitigation', name: 'Quantum error mitigation', kind: 'technology' },
  ],
  sources: [
    qSrc('s1', 'official', 'primary', 'Qubitline 0.5: a breakthrough in quantum chemistry workflows', 'Qubitline', { independent: false, publishedAt: day('2026-09-17') }),
    qSrc('s2', 'documentation', 'primary', 'Notebook: error-mitigated ground-state energies', 'Qubitline', { independent: false, publishedAt: day('2026-09-17') }),
    qSrc('s3', 'github', 'primary', 'qubitline repository and package statistics', 'GitHub', { independent: false, publishedAt: day('2026-09-23') }),
  ],
  scoreInputs: {
    assessed: {
      novelty: { level: 2, rationale: 'Packaging of known mitigation techniques.' },
      technicalSignificance: { level: 1, rationale: 'No evidence of capability beyond classical methods.' },
      developerRelevance: { level: 1, rationale: 'Research audience.' },
    },
    momentumSeriesId: 'downloads',
    independentIntegrations: 0,
    reproducibleBenchmark: false,
    runnableArtifact: true,
  },
}

/* ------------------------------------------------------------------ */
const sSrc = demoSourceFactory('sable-jit-riscv-vector')

export const sableJit: Signal = {
  id: '0b6f6c1e-4a0e-4f3a-9a40-1d7c2f0a0013',
  slug: 'sable-jit-riscv-vector-extension-parity',
  title: 'Sable JIT reaches RISC-V vector-extension parity with its x86 and Arm backends',
  dek: 'Conformance tests pass on RISC-V with vector support enabled; two board vendors report running the JIT in their SDKs.',
  primaryTopic: 'computing-infrastructure',
  topics: ['computing-infrastructure', 'open-source'],
  status: 'emerging',
  timeToImpact: '6-12m',
  firstSeenAt: day('2026-08-20'),
  updatedAt: '2026-09-22T11:00:00.000Z',
  verified: true,
  hidden: false,
  isDemo: true,
  whatHappened: [
    fact('Sable JIT’s RISC-V backend now passes the same conformance suite as its x86 and Arm backends, with vector instructions enabled.', 's1', 's2'),
    fact('Two RISC-V board vendors list Sable in their developer SDKs.', 's3', 's4'),
  ],
  whyItMatters: [analysis('Managed-language workloads become practical on RISC-V hardware without per-application porting.')],
  technicalChange: [
    fact('The backend emits RVV instructions for vectorisable loops and falls back to scalar code on cores without the extension.', 's2'),
  ],
  architecture: {
    caption: 'Where the JIT backend sits',
    layers: [
      { id: 'application', label: 'Application', detail: 'Managed-language code, unchanged', role: 'context' },
      { id: 'infrastructure', label: 'Runtime + JIT', detail: 'Sable RISC-V backend with RVV', role: 'changed' },
      { id: 'hardware', label: 'Hardware', detail: 'RISC-V cores with vector extension', role: 'affected' },
    ],
  },
  developerImplications: [estimate('Expect RISC-V to appear as a deployment target in CI matrices for embedded and edge workloads.')],
  shouldCare: {
    whatChanged: [fact('Conformance parity with vector support.', 's1')],
    whoIsAffected: [analysis('Teams targeting edge and embedded Linux on RISC-V.')],
    whatCanDevelopersDo: [analysis('Add a RISC-V emulated job to CI to catch portability issues early.')],
    productionReadiness: { level: 'early-production', statement: fact('Marked supported tier-2 platform.', 's1') },
    whatWouldMakeItImportant: [estimate('Availability of RISC-V instances from major cloud providers.')],
    whatCouldPreventAdoption: [analysis('Limited hardware availability outside boards and development kits.')],
  },
  difficulty: {
    overall: 2,
    setup: 2,
    conceptual: 2,
    production: 3,
    infrastructure: 3,
    rationale: 'Mostly transparent to application code; hardware access is the hurdle.',
  },
  adoptionSignals: [{ label: 'Board vendors shipping it in SDKs', value: '2', sourceIds: ['s3', 's4'], kind: 'fact' }],
  series: [weekly('commits', 'RISC-V backend commits per week', 'commits', [22, 25, 31, 28, 30, 35, 33, 41], 's2')],
  events: [
    { date: day('2026-08-20'), label: 'Vector support merged; first seen', kind: 'first-seen', sourceIds: ['s2'] },
    { date: day('2026-09-15'), label: 'Conformance parity announced', kind: 'release', sourceIds: ['s1'] },
  ],
  risks: [analysis('Performance on real workloads is not yet published.')],
  competingApproaches: [{ name: 'Ahead-of-time compilation', relation: 'alternative', note: analysis('Avoids JIT porting, loses runtime optimisation.') }],
  builders: [
    { name: 'Board vendor A', kind: 'company', note: fact('Includes Sable in SDK.', 's3') },
    { name: 'Board vendor B', kind: 'company', note: fact('Includes Sable in SDK.', 's4') },
  ],
  entities: [
    { slug: 'sable-jit', name: 'Sable JIT', kind: 'technology' },
    { slug: 'risc-v-vector-extension', name: 'RISC-V Vector Extension (RVV)', kind: 'standard' },
  ],
  sources: [
    sSrc('s1', 'official', 'primary', 'Sable: RISC-V promoted to tier-2', 'Sable project', { independent: false, publishedAt: day('2026-09-15') }),
    sSrc('s2', 'github', 'primary', 'sable-jit repository: RISC-V backend', 'GitHub', { independent: false, publishedAt: day('2026-09-21') }),
    sSrc('s3', 'documentation', 'secondary', 'Board vendor A SDK release notes', 'Board vendor A', { independent: true, publishedAt: day('2026-09-18') }),
    sSrc('s4', 'documentation', 'secondary', 'Board vendor B developer guide', 'Board vendor B', { independent: true, publishedAt: day('2026-09-20') }),
  ],
  scoreInputs: {
    assessed: {
      novelty: { level: 2, rationale: 'Porting milestone rather than new technique.' },
      technicalSignificance: { level: 3, rationale: 'Removes a blocker for a whole class of workloads on RISC-V.' },
      developerRelevance: { level: 2, rationale: 'Relevant to edge/embedded teams.' },
    },
    momentumSeriesId: 'commits',
    independentIntegrations: 2,
    reproducibleBenchmark: null,
    runnableArtifact: true,
  },
}

/* ------------------------------------------------------------------ */
const kSrc = demoSourceFactory('keel-repo-scale-code-model')

export const keelCode: Signal = {
  id: '0b6f6c1e-4a0e-4f3a-9a40-1d7c2f0a0014',
  slug: 'keel-small-code-model-repository-context',
  title: 'Small code model Keel claims large-model parity using repository-level context',
  dek: 'Strong self-reported benchmark results and heavy discussion, but no independent evaluation yet. Scored with a hype penalty.',
  primaryTopic: 'foundation-models',
  topics: ['foundation-models', 'developer-tools', 'artificial-intelligence'],
  status: 'unconfirmed',
  timeToImpact: '3-6m',
  firstSeenAt: day('2026-09-22'),
  updatedAt: '2026-09-27T02:30:00.000Z',
  verified: false,
  hidden: false,
  isDemo: true,
  whatHappened: [
    fact('Keel, a 3B-parameter code model, was released with open weights.', 's1'),
    fact('The authors report results comparable to much larger models on their own repository-level completion benchmark.', 's2'),
  ],
  whyItMatters: [
    analysis('If repository context can substitute for model size, local code assistants become far cheaper.'),
    analysis('Currently only the authors have measured this.', 's2'),
  ],
  technicalChange: [
    fact('Training packs files from the same repository into one context, ordered by import graph.', 's3'),
    analysis('The idea has been explored before; the question is whether the reported margin survives independent testing.'),
  ],
  architecture: {
    caption: 'Repository-context code completion',
    layers: [
      { id: 'user', label: 'Developer', detail: 'Editor completion request', role: 'context' },
      { id: 'application', label: 'Editor plugin', detail: 'Collects related files', role: 'affected' },
      { id: 'retrieval', label: 'Context builder', detail: 'Import-graph ordering', role: 'changed' },
      { id: 'model', label: 'Model', detail: 'Keel 3B, local or hosted', role: 'changed' },
    ],
  },
  developerImplications: [estimate('Worth a local test on your own repository; do not rely on published numbers.')],
  shouldCare: {
    whatChanged: [fact('Open-weight 3B code model with repository-context training.', 's1', 's3')],
    whoIsAffected: [analysis('Developers using or building code assistants.')],
    whatCanDevelopersDo: [analysis('Evaluate on a private repository the model has not seen.')],
    productionReadiness: { level: 'experimental', statement: analysis('No independent evaluation.') },
    whatWouldMakeItImportant: [estimate('Independent evaluation on held-out repositories.')],
    whatCouldPreventAdoption: [analysis('Benchmark contamination: public repositories may overlap with training data.')],
  },
  difficulty: {
    overall: 2,
    setup: 2,
    conceptual: 2,
    production: 3,
    infrastructure: 2,
    rationale: 'Runs locally on a laptop GPU; evaluation design is the main effort.',
  },
  adoptionSignals: [
    { label: 'Independent evaluations', value: null, sourceIds: [], kind: 'fact' },
    { label: 'Discussion threads, latest week vs 4-week mean', value: '9.3×', sourceIds: ['s4', 's5', 's6', 's7'], kind: 'fact' },
  ],
  series: [weekly('discussion', 'Discussion threads per week', 'threads', [3, 4, 5, 4, 6, 5, 6, 49], 's4')],
  events: [
    { date: day('2026-09-22'), label: 'Weights and benchmark released', kind: 'release', sourceIds: ['s1', 's2'] },
    { date: day('2026-09-23'), label: 'Discussion spike', kind: 'discussion', sourceIds: ['s4', 's5'] },
  ],
  risks: [
    analysis('Self-reported benchmark on a benchmark designed by the authors.'),
    analysis('Possible overlap between benchmark repositories and training data.'),
  ],
  competingApproaches: [
    { name: 'Larger general code models', relation: 'incumbent', note: analysis('Stronger generally; more expensive to run locally.') },
    { name: 'Retrieval-augmented completion', relation: 'alternative', note: analysis('Adds repository context at inference time rather than training time.') },
  ],
  builders: [],
  entities: [
    { slug: 'keel', name: 'Keel', kind: 'technology' },
    { slug: 'repository-level-context', name: 'Repository-level context', kind: 'technology' },
  ],
  sources: [
    kSrc('s1', 'official', 'primary', 'Keel: open weights release', 'Keel authors', { independent: false, publishedAt: day('2026-09-22') }),
    kSrc('s2', 'benchmark', 'primary', 'Keel matches models 10x its size: repo-completion results', 'Keel authors', { independent: false, publishedAt: day('2026-09-22') }),
    kSrc('s3', 'paper', 'primary', 'Keel technical report', 'Keel authors', { independent: false, publishedAt: day('2026-09-22') }),
    kSrc('s4', 'discussion', 'community', 'Thread: Keel is a revolutionary small model', 'Developer forum', { independent: true, publishedAt: day('2026-09-23') }),
    kSrc('s5', 'discussion', 'community', 'Social thread: small models just won', 'Social network', { independent: true, publishedAt: day('2026-09-23') }),
    kSrc('s6', 'discussion', 'community', 'Video: testing Keel live', 'Video platform', { independent: true, publishedAt: day('2026-09-24') }),
    kSrc('s7', 'discussion', 'community', 'Thread: skepticism about Keel’s benchmark', 'Developer forum', { independent: true, publishedAt: day('2026-09-25') }),
  ],
  scoreInputs: {
    assessed: {
      novelty: { level: 2, rationale: 'Repository packing has precedent.' },
      technicalSignificance: { level: 3, rationale: 'Large if the claim holds.' },
      developerRelevance: { level: 3, rationale: 'Code assistants are widely used.' },
    },
    momentumSeriesId: 'discussion',
    independentIntegrations: 0,
    reproducibleBenchmark: false,
    runnableArtifact: true,
    hypeFlags: [{ reason: 'Headline compares against models “10x its size” on an author-designed benchmark.', points: 2 }],
  },
}
