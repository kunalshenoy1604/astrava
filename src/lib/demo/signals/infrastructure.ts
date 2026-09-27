import type { Signal } from '@/lib/domain/types'
import { analysis, day, demoSourceFactory, estimate, fact, weekly } from '../helpers'

/* ------------------------------------------------------------------ */
const tallowSrc = demoSourceFactory('tallow-inference-engine')

export const tallow: Signal = {
  id: '0b6f6c1e-4a0e-4f3a-9a40-1d7c2f0a0001',
  slug: 'tallow-open-source-inference-engine-throughput',
  title: 'Open-source inference engine Tallow crosses a throughput threshold on commodity GPUs',
  dek: 'Weekly GitHub stars reached 4.8× their trailing baseline while three independent serving projects added Tallow backends.',
  primaryTopic: 'ai-infrastructure',
  topics: ['ai-infrastructure', 'open-source', 'foundation-models'],
  status: 'accelerating',
  timeToImpact: '0-3m',
  firstSeenAt: day('2026-09-15'),
  updatedAt: '2026-09-27T08:13:00.000Z',
  verified: true,
  hidden: false,
  isDemo: true,
  whatHappened: [
    fact('Tallow 0.9 shipped with a rewritten batching scheduler and a paged KV cache.', 's1'),
    fact(
      'The project’s own benchmark reports higher tokens-per-second than Tallow 0.8 for 7–8B-parameter models on a single 24 GB consumer GPU.',
      's3',
    ),
    fact(
      'An independent reproduction on two consumer GPU models found gains in the same direction, but smaller than the project’s figures.',
      's4',
    ),
    fact('Three independent serving projects merged or opened Tallow backends within ten days of the release.', 's5', 's6', 's10'),
  ],
  whyItMatters: [
    analysis(
      'If the gains hold under production traffic, mid-sized open models become practical to serve on a single consumer GPU for workloads that previously needed datacenter cards.',
    ),
    analysis('Because serving frameworks are integrating it, many developers may end up using Tallow indirectly without choosing it.'),
    analysis('The independent reproduction is the key difference between this and a typical performance announcement.', 's4'),
  ],
  technicalChange: [
    fact(
      'The scheduler uses continuous batching: new requests join an in-flight batch at token boundaries instead of waiting for the current batch to finish.',
      's8',
    ),
    fact(
      'KV-cache memory is allocated in fixed-size pages, which reduces fragmentation when many sequences of different lengths are active.',
      's8',
    ),
    fact('4-bit and 8-bit quantized weights are supported through a pluggable kernel interface.', 's1'),
    analysis(
      'Neither technique is new on its own; the change is a compact implementation aimed at single-GPU deployments rather than multi-GPU clusters.',
    ),
  ],
  architecture: {
    caption: 'Where Tallow sits in a typical LLM application stack',
    layers: [
      { id: 'user', label: 'User', detail: 'Chat, completion or batch job', role: 'context' },
      { id: 'application', label: 'Application', detail: 'Your service; calls an HTTP completion endpoint', role: 'context' },
      { id: 'model', label: 'Model / API', detail: 'OpenAI-compatible endpoint exposed by the serving layer', role: 'affected' },
      { id: 'infrastructure', label: 'Serving engine', detail: 'Tallow scheduler + paged KV cache', role: 'changed' },
      { id: 'hardware', label: 'Hardware', detail: 'Single consumer GPU (24 GB VRAM in reported tests)', role: 'affected' },
    ],
    note: analysis('Application code does not change if it already targets an OpenAI-compatible endpoint; the gain is in cost and latency.'),
  },
  developerImplications: [
    analysis('Self-hosting a 7–8B model for internal tools becomes cheaper to try; the evaluation cost is roughly one GPU and an afternoon.'),
    analysis('Teams already on Kiln Serve or Portico can test Tallow as a backend flag rather than a migration.', 's5', 's6'),
    estimate('Expect configuration churn until a 1.0 release; pin versions in production.'),
  ],
  shouldCare: {
    whatChanged: [fact('A rewritten scheduler and paged KV cache in Tallow 0.9.', 's1')],
    whoIsAffected: [
      analysis('Teams self-hosting open models on single GPUs, and anyone using a serving framework that has added a Tallow backend.'),
    ],
    whatCanDevelopersDo: [
      analysis('Benchmark your own prompts against your current engine; published numbers use short prompts.'),
      analysis('Try the Kiln Serve or Portico adapter before adopting Tallow directly.', 's5', 's6'),
    ],
    productionReadiness: {
      level: 'early-production',
      statement: fact('Pre-1.0; release notes state the configuration format may change before 1.0.', 's1'),
    },
    whatWouldMakeItImportant: [
      estimate('A second independent reproduction under long-prompt workloads, and a 1.0 release with a stable config format.'),
    ],
    whatCouldPreventAdoption: [
      fact('Most commits in the last 90 days come from two maintainers.', 's2'),
      analysis('Incumbent engines could adopt the same scheduling approach, removing the reason to switch.'),
    ],
  },
  difficulty: {
    overall: 3,
    setup: 2,
    conceptual: 3,
    production: 4,
    infrastructure: 3,
    rationale: 'Single binary and container image; production use needs GPU capacity planning and load testing.',
  },
  adoptionSignals: [
    { label: 'GitHub stars, latest week vs 4-week mean', value: '4.8×', sourceIds: ['s2'], kind: 'fact' },
    { label: 'Independent integrations', value: '3 serving projects', sourceIds: ['s5', 's6', 's10'], kind: 'fact' },
    { label: 'Dependent repositories', value: '31, up from 4 eight weeks earlier', sourceIds: ['s2'], kind: 'fact' },
    { label: 'Active maintainers (90 days)', value: null, sourceIds: [], kind: 'fact' },
  ],
  series: [
    weekly('stars', 'GitHub stars gained per week', 'stars', [110, 125, 140, 150, 160, 170, 190, 804], 's2'),
    weekly('dependents', 'Dependent repositories (cumulative)', 'repos', [4, 5, 7, 9, 12, 16, 23, 31], 's2'),
  ],
  events: [
    { date: day('2026-09-14'), label: 'Tallow 0.9 released', kind: 'release', sourceIds: ['s1'] },
    { date: day('2026-09-15'), label: 'First seen by Astrava via developer discussion', kind: 'first-seen', sourceIds: ['s7'] },
    { date: day('2026-09-18'), label: 'Kiln Serve merges Tallow backend', kind: 'integration', sourceIds: ['s5'] },
    { date: day('2026-09-20'), label: 'Portico ships experimental adapter', kind: 'integration', sourceIds: ['s6'] },
    { date: day('2026-09-22'), label: 'Independent throughput reproduction published', kind: 'benchmark', sourceIds: ['s4'] },
    { date: day('2026-09-24'), label: 'Brazier adds Tallow runtime option', kind: 'integration', sourceIds: ['s10'] },
  ],
  risks: [
    fact('The independent reproduction measured smaller gains than the project’s own benchmark.', 's4'),
    analysis('Published tests use short prompts; long-context workloads may see less benefit from batching changes.'),
    fact('Two maintainers account for most recent commits, a concentration risk.', 's2'),
  ],
  competingApproaches: [
    {
      name: 'Established open-source serving engines',
      relation: 'incumbent',
      note: analysis('Mature multi-GPU engines already implement continuous batching and paged attention; Tallow’s case rests on single-GPU simplicity.'),
    },
    {
      name: 'Speculative decoding',
      relation: 'complement',
      note: analysis('Orthogonal latency technique; could be combined with Tallow’s scheduler.'),
    },
    {
      name: 'Managed inference APIs',
      relation: 'alternative',
      note: analysis('No hardware to operate, at a per-token cost; the trade-off Tallow changes for small models.'),
    },
  ],
  builders: [
    { name: 'Kiln Serve', kind: 'project', note: fact('Merged a Tallow backend.', 's5') },
    { name: 'Portico', kind: 'project', note: fact('Ships an experimental Tallow adapter.', 's6') },
    { name: 'Brazier', kind: 'project', note: fact('Added Tallow as a runtime option.', 's10') },
  ],
  entities: [
    { slug: 'tallow', name: 'Tallow', kind: 'technology' },
    { slug: 'tallow-project-tallow', name: 'tallow-project/tallow', kind: 'repository' },
    { slug: 'kiln-serve', name: 'Kiln Serve', kind: 'repository' },
    { slug: 'portico', name: 'Portico', kind: 'repository' },
    { slug: 'continuous-batching', name: 'Continuous batching', kind: 'technology' },
    { slug: 'paged-kv-cache', name: 'Paged KV cache', kind: 'technology' },
  ],
  sources: [
    tallowSrc('s1', 'official', 'primary', 'Tallow 0.9 release notes', 'Tallow project', { independent: false, publishedAt: day('2026-09-14') }),
    tallowSrc('s2', 'github', 'primary', 'tallow-project/tallow repository', 'GitHub', { independent: false, publishedAt: day('2026-09-26') }),
    tallowSrc('s3', 'benchmark', 'primary', 'Tallow 0.9 benchmark methodology and results', 'Tallow project', {
      independent: false,
      publishedAt: day('2026-09-14'),
    }),
    tallowSrc('s4', 'benchmark', 'secondary', 'Reproducing Tallow 0.9 throughput on consumer GPUs', 'Inference Lab Notes', {
      independent: true,
      publishedAt: day('2026-09-22'),
    }),
    tallowSrc('s5', 'github', 'secondary', 'Kiln Serve: add Tallow backend (merged pull request)', 'Kiln Serve', {
      independent: true,
      publishedAt: day('2026-09-18'),
    }),
    tallowSrc('s6', 'github', 'secondary', 'Portico gateway: experimental Tallow adapter', 'Portico', {
      independent: true,
      publishedAt: day('2026-09-20'),
    }),
    tallowSrc('s7', 'discussion', 'community', 'Thread: Tallow 0.9 on a single 24 GB card', 'Developer forum', {
      independent: true,
      publishedAt: day('2026-09-15'),
    }),
    tallowSrc('s8', 'documentation', 'primary', 'Tallow docs: scheduler and paged KV cache', 'Tallow project', {
      independent: false,
      publishedAt: day('2026-09-14'),
    }),
    tallowSrc('s9', 'news', 'secondary', 'How Tallow’s batching scheduler works', 'Systems Weekly', {
      independent: true,
      publishedAt: day('2026-09-23'),
    }),
    tallowSrc('s10', 'github', 'secondary', 'Brazier: Tallow runtime option (merged)', 'Brazier', {
      independent: true,
      publishedAt: day('2026-09-24'),
    }),
  ],
  scoreInputs: {
    assessed: {
      novelty: { level: 3, rationale: 'Known techniques, new single-GPU-focused implementation with measurable gains.' },
      technicalSignificance: { level: 4, rationale: 'Changes the cost floor for self-hosting mid-sized models.' },
      developerRelevance: { level: 4, rationale: 'Directly usable through existing OpenAI-compatible clients and serving frameworks.' },
    },
    momentumSeriesId: 'stars',
    adoptionSeriesId: 'dependents',
    independentIntegrations: 3,
    reproducibleBenchmark: true,
    runnableArtifact: true,
  },
}

/* ------------------------------------------------------------------ */
const pgSrc = demoSourceFactory('pgstrata-columnar-vector-index')

export const pgstrata: Signal = {
  id: '0b6f6c1e-4a0e-4f3a-9a40-1d7c2f0a0002',
  slug: 'pgstrata-columnar-vector-index-postgres',
  title: 'Columnar vector index lands in the Pgstrata Postgres extension',
  dek: 'A disk-first vector index merged into a widely deployed Postgres extension, with two hosting providers enabling it in preview.',
  primaryTopic: 'ai-infrastructure',
  topics: ['ai-infrastructure', 'computing-infrastructure', 'open-source'],
  status: 'emerging',
  timeToImpact: '3-6m',
  firstSeenAt: day('2026-09-08'),
  updatedAt: '2026-09-26T17:40:00.000Z',
  verified: true,
  hidden: false,
  isDemo: true,
  whatHappened: [
    fact('Pgstrata 2.3 added a columnar, disk-first approximate-nearest-neighbour index type.', 's1'),
    fact('Two managed Postgres providers enabled the index in preview regions.', 's3', 's4'),
    fact('The project reports index build memory well below its existing in-memory graph index on the same dataset.', 's2'),
  ],
  whyItMatters: [
    analysis(
      'Retrieval for AI features could stay inside the primary database for larger corpora, avoiding a separate vector store and its synchronisation work.',
    ),
    analysis('Lower build memory matters most for teams on smaller database instances.'),
  ],
  technicalChange: [
    fact('Vectors are stored in compressed column segments; the index reads candidate segments from disk instead of holding a graph in RAM.', 's5'),
    fact('Queries use a two-stage search: a coarse pass over compressed codes, then re-ranking with full-precision vectors.', 's5'),
    analysis('This trades some query latency for much lower memory use — a different point on the curve rather than a strict improvement.'),
  ],
  architecture: {
    caption: 'Retrieval-augmented application with retrieval inside Postgres',
    layers: [
      { id: 'user', label: 'User', detail: 'Search box or assistant', role: 'context' },
      { id: 'application', label: 'Application', detail: 'Embeds the query; issues one SQL statement', role: 'affected' },
      { id: 'model', label: 'Model / API', detail: 'Embedding model and generator', role: 'context' },
      { id: 'retrieval', label: 'Retrieval', detail: 'Columnar ANN index + re-rank', role: 'changed' },
      { id: 'database', label: 'Database', detail: 'Postgres with Pgstrata 2.3', role: 'changed' },
      { id: 'infrastructure', label: 'Infrastructure', detail: 'Managed Postgres (preview) or self-hosted', role: 'affected' },
    ],
  },
  developerImplications: [
    analysis('Filtering by relational columns and vector similarity can happen in one query and one transaction.'),
    estimate('Teams under a few tens of millions of vectors may be able to drop a dedicated vector database.'),
  ],
  shouldCare: {
    whatChanged: [fact('A new disk-first index type in Pgstrata 2.3.', 's1')],
    whoIsAffected: [analysis('Teams running retrieval on Postgres, or running a separate vector store beside Postgres.')],
    whatCanDevelopersDo: [
      analysis('Build the new index on a copy of your production embeddings and compare recall at your target latency.'),
    ],
    productionReadiness: { level: 'experimental', statement: fact('Marked experimental in the 2.3 release notes.', 's1') },
    whatWouldMakeItImportant: [estimate('General availability on managed providers and published recall/latency trade-off curves from third parties.')],
    whatCouldPreventAdoption: [
      analysis('Query latency may be too high for interactive use at larger scales.'),
      fact('No independent benchmark has been published yet.', 's2'),
    ],
  },
  difficulty: {
    overall: 2,
    setup: 1,
    conceptual: 3,
    production: 3,
    infrastructure: 2,
    rationale: 'CREATE INDEX on an existing extension; tuning recall needs some understanding of ANN parameters.',
  },
  adoptionSignals: [
    { label: 'Managed providers offering it', value: '2 (preview)', sourceIds: ['s3', 's4'], kind: 'fact' },
    { label: 'Independent benchmarks', value: null, sourceIds: [], kind: 'fact' },
    { label: 'Extension downloads, latest week vs 4-week mean', value: '1.6×', sourceIds: ['s6'], kind: 'fact' },
  ],
  series: [weekly('downloads', 'Extension package downloads per week', 'downloads', [2100, 2200, 2150, 2300, 2400, 2350, 2500, 3840], 's6')],
  events: [
    { date: day('2026-09-08'), label: 'Pgstrata 2.3 released', kind: 'release', sourceIds: ['s1'] },
    { date: day('2026-09-16'), label: 'First managed provider preview', kind: 'integration', sourceIds: ['s3'] },
    { date: day('2026-09-25'), label: 'Second managed provider preview', kind: 'integration', sourceIds: ['s4'] },
  ],
  risks: [
    fact('Benchmarks so far are self-reported.', 's2'),
    analysis('Disk-first designs are sensitive to storage performance; results on network-attached volumes may differ.'),
  ],
  competingApproaches: [
    { name: 'Dedicated vector databases', relation: 'alternative', note: analysis('More tuning options and scale-out, at the cost of a second system.') },
    { name: 'In-memory graph indexes (HNSW-style)', relation: 'incumbent', note: analysis('Lower latency; memory grows with corpus size.') },
  ],
  builders: [
    { name: 'Managed Postgres provider A', kind: 'company', note: fact('Preview availability announced.', 's3') },
    { name: 'Managed Postgres provider B', kind: 'company', note: fact('Preview availability announced.', 's4') },
  ],
  entities: [
    { slug: 'pgstrata', name: 'Pgstrata', kind: 'technology' },
    { slug: 'postgresql', name: 'PostgreSQL', kind: 'technology' },
    { slug: 'approximate-nearest-neighbour', name: 'Approximate nearest neighbour search', kind: 'technology' },
  ],
  sources: [
    pgSrc('s1', 'official', 'primary', 'Pgstrata 2.3 release notes', 'Pgstrata project', { independent: false, publishedAt: day('2026-09-08') }),
    pgSrc('s2', 'benchmark', 'primary', 'Columnar index: build memory and recall measurements', 'Pgstrata project', {
      independent: false,
      publishedAt: day('2026-09-08'),
    }),
    pgSrc('s3', 'official', 'secondary', 'Preview: columnar vector index now available', 'Managed Postgres provider A', {
      independent: true,
      publishedAt: day('2026-09-16'),
    }),
    pgSrc('s4', 'official', 'secondary', 'Changelog: Pgstrata 2.3 in preview regions', 'Managed Postgres provider B', {
      independent: true,
      publishedAt: day('2026-09-25'),
    }),
    pgSrc('s5', 'documentation', 'primary', 'Pgstrata docs: columnar index internals', 'Pgstrata project', {
      independent: false,
      publishedAt: day('2026-09-08'),
    }),
    pgSrc('s6', 'github', 'primary', 'pgstrata/pgstrata repository and package stats', 'GitHub', { independent: false, publishedAt: day('2026-09-26') }),
  ],
  scoreInputs: {
    assessed: {
      novelty: { level: 2, rationale: 'Disk-first ANN is established in research; new in this widely deployed extension.' },
      technicalSignificance: { level: 3, rationale: 'Shifts the scale at which retrieval can stay in the primary database.' },
      developerRelevance: { level: 3, rationale: 'Large share of AI features use Postgres-backed retrieval.' },
    },
    momentumSeriesId: 'downloads',
    independentIntegrations: 2,
    reproducibleBenchmark: false,
    runnableArtifact: true,
  },
}

/* ------------------------------------------------------------------ */
const specSrc = demoSourceFactory('cpu-sidecar-speculative-decoding')

export const sidecarDecoding: Signal = {
  id: '0b6f6c1e-4a0e-4f3a-9a40-1d7c2f0a0003',
  slug: 'cpu-sidecar-speculative-decoding',
  title: 'Paper: speculative-decoding drafts served from a CPU sidecar cut GPU memory pressure',
  dek: 'A preprint reports moving the draft model to CPU frees GPU memory for larger batches; code is released, reproduction is pending.',
  primaryTopic: 'ai-infrastructure',
  topics: ['ai-infrastructure', 'foundation-models'],
  status: 'early-signal',
  timeToImpact: '6-12m',
  firstSeenAt: day('2026-09-19'),
  updatedAt: '2026-09-25T10:05:00.000Z',
  verified: false,
  hidden: false,
  isDemo: true,
  whatHappened: [
    fact('A preprint proposes running the small draft model for speculative decoding on CPU cores next to the GPU.', 's1'),
    fact('The authors released reference code alongside the paper.', 's2'),
  ],
  whyItMatters: [
    analysis('GPU memory, not compute, often limits batch size in serving; freeing it can raise throughput without new hardware.'),
  ],
  technicalChange: [
    fact('The draft model proposes tokens on CPU; the target model verifies them in batches on GPU.', 's1'),
    fact('The paper reports results for one GPU type and two model families.', 's1'),
    analysis('Gains depend on CPU–GPU transfer latency; results on other interconnects are unknown.'),
  ],
  architecture: {
    caption: 'Speculative decoding with a CPU-resident draft model',
    layers: [
      { id: 'application', label: 'Application', detail: 'Unchanged', role: 'context' },
      { id: 'model', label: 'Target model', detail: 'Verifies drafted tokens on GPU', role: 'affected' },
      { id: 'infrastructure', label: 'Draft sidecar', detail: 'Small draft model on CPU cores', role: 'changed' },
      { id: 'hardware', label: 'Hardware', detail: 'GPU memory freed for KV cache and batching', role: 'affected' },
    ],
  },
  developerImplications: [estimate('Relevant to teams operating their own serving stack; unlikely to matter to API consumers directly.')],
  shouldCare: {
    whatChanged: [fact('A proposed placement of the draft model on CPU.', 's1')],
    whoIsAffected: [analysis('Inference-platform engineers.')],
    whatCanDevelopersDo: [analysis('Watch for integration into serving engines rather than adopting research code.')],
    productionReadiness: { level: 'not-ready', statement: fact('Research code only.', 's2') },
    whatWouldMakeItImportant: [estimate('Independent reproduction on different hardware and an upstream implementation in a serving engine.')],
    whatCouldPreventAdoption: [analysis('Interconnect latency could erase gains on common cloud instance types.')],
  },
  difficulty: {
    overall: 4,
    setup: 3,
    conceptual: 4,
    production: 5,
    infrastructure: 4,
    rationale: 'Requires understanding speculative decoding and CPU/GPU scheduling; no packaged implementation.',
  },
  adoptionSignals: [
    { label: 'Independent reproductions', value: null, sourceIds: [], kind: 'fact' },
    { label: 'Serving-engine integrations', value: null, sourceIds: [], kind: 'fact' },
  ],
  series: [weekly('discussion', 'Discussion threads referencing the paper', 'threads', [0, 0, 0, 0, 0, 1, 4, 7], 's3')],
  events: [
    { date: day('2026-09-18'), label: 'Preprint posted', kind: 'paper', sourceIds: ['s1'] },
    { date: day('2026-09-19'), label: 'Reference code released', kind: 'release', sourceIds: ['s2'] },
  ],
  risks: [analysis('Single-hardware evaluation.'), analysis('Not yet peer reviewed.')],
  competingApproaches: [
    { name: 'On-GPU draft models', relation: 'incumbent', note: analysis('Standard placement; simpler, but consumes GPU memory.') },
    { name: 'Self-speculative decoding', relation: 'alternative', note: analysis('Uses the target model’s own layers as the draft; no second model.') },
  ],
  builders: [],
  entities: [{ slug: 'speculative-decoding', name: 'Speculative decoding', kind: 'technology' }],
  sources: [
    specSrc('s1', 'paper', 'primary', 'Draft on the side: CPU-resident speculative decoding (preprint)', 'Preprint server', {
      independent: false,
      publishedAt: day('2026-09-18'),
    }),
    specSrc('s2', 'github', 'primary', 'Reference implementation repository', 'GitHub', { independent: false, publishedAt: day('2026-09-19') }),
    specSrc('s3', 'discussion', 'community', 'Discussion: CPU drafts for speculative decoding', 'Developer forum', {
      independent: true,
      publishedAt: day('2026-09-21'),
    }),
  ],
  scoreInputs: {
    assessed: {
      novelty: { level: 3, rationale: 'New placement of an established technique.' },
      technicalSignificance: { level: 2, rationale: 'Potentially useful; evidence limited to one hardware setup.' },
      developerRelevance: { level: 2, rationale: 'Matters to platform teams, not most application developers.' },
    },
    momentumSeriesId: 'discussion',
    independentIntegrations: 0,
    reproducibleBenchmark: null,
    runnableArtifact: true,
  },
}
