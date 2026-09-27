import type { Signal } from '@/lib/domain/types'
import { analysis, day, demoSourceFactory, estimate, fact, weekly } from '../helpers'

/* ------------------------------------------------------------------ */
const cSrc = demoSourceFactory('cinder-wasm-agent-sandbox')

export const cinder: Signal = {
  id: '0b6f6c1e-4a0e-4f3a-9a40-1d7c2f0a0008',
  slug: 'cinder-webassembly-component-sandboxes-for-agent-tools',
  title: 'WebAssembly component sandboxes emerge as the isolation layer for untrusted agent tools',
  dek: 'The Cinder runtime runs each tool call in a capability-scoped Wasm component; two agent frameworks adopted it as an optional executor.',
  primaryTopic: 'cybersecurity',
  topics: ['cybersecurity', 'ai-agents', 'computing-infrastructure'],
  status: 'emerging',
  timeToImpact: '3-6m',
  firstSeenAt: day('2026-09-03'),
  updatedAt: '2026-09-27T04:20:00.000Z',
  verified: true,
  hidden: false,
  isDemo: true,
  whatHappened: [
    fact('Cinder 0.7 added per-call capability manifests: a tool declares which hosts, paths and environment variables it may access.', 's1'),
    fact('Two agent frameworks shipped Cinder as an optional tool executor.', 's3', 's4'),
    fact('An independent security review of the capability model was published.', 's5'),
  ],
  whyItMatters: [
    analysis('Agents increasingly run code and tools chosen at runtime. Process-level containers are heavy per call; Wasm components start in milliseconds with explicit capabilities.'),
    analysis('An independent review early in a security project’s life is a meaningful trust signal.', 's5'),
  ],
  technicalChange: [
    fact('Each tool call runs in a fresh component instance; state does not persist between calls unless explicitly passed.', 's2'),
    fact('Network access is denied by default and granted per host in the manifest.', 's2'),
    analysis('The component model’s typed interfaces make tool inputs and outputs checkable at the boundary.'),
  ],
  architecture: {
    caption: 'Tool execution with a capability-scoped sandbox',
    layers: [
      { id: 'user', label: 'User', detail: 'Task request', role: 'context' },
      { id: 'application', label: 'Agent runtime', detail: 'Chooses tool + arguments', role: 'context' },
      { id: 'model', label: 'Model / API', detail: 'Proposes tool calls', role: 'context' },
      { id: 'security', label: 'Sandbox', detail: 'Cinder: manifest check, fresh instance per call', role: 'changed' },
      { id: 'tools', label: 'Tools', detail: 'Compiled to Wasm components', role: 'affected' },
      { id: 'infrastructure', label: 'Host', detail: 'Only capabilities granted in the manifest', role: 'affected' },
    ],
  },
  developerImplications: [
    analysis('Tools must be compiled to Wasm components; languages with mature component tooling are easiest.'),
    estimate('Expect a period where some tools (e.g. those needing native libraries) cannot be sandboxed this way.'),
  ],
  shouldCare: {
    whatChanged: [fact('Capability manifests per tool call in Cinder 0.7; two framework integrations.', 's1', 's3', 's4')],
    whoIsAffected: [analysis('Anyone letting an agent execute code or call tools with side effects.')],
    whatCanDevelopersDo: [
      analysis('Write manifests for your existing tools even before sandboxing — it documents what each tool can touch.'),
      analysis('Try the framework executors on non-critical tools first.', 's3', 's4'),
    ],
    productionReadiness: { level: 'early-production', statement: fact('Pre-1.0 but reviewed; framework integrations marked beta.', 's3', 's5') },
    whatWouldMakeItImportant: [estimate('Default-on sandboxing in a major agent framework.')],
    whatCouldPreventAdoption: [analysis('Compilation friction for tools with native dependencies.')],
  },
  difficulty: {
    overall: 4,
    setup: 3,
    conceptual: 4,
    production: 4,
    infrastructure: 3,
    rationale: 'Requires Wasm component toolchains and a clear capability model for each tool.',
  },
  adoptionSignals: [
    { label: 'Framework integrations', value: '2 (beta)', sourceIds: ['s3', 's4'], kind: 'fact' },
    { label: 'Independent security reviews', value: '1', sourceIds: ['s5'], kind: 'fact' },
    { label: 'Repository stars, latest week vs 4-week mean', value: '2.2×', sourceIds: ['s6'], kind: 'fact' },
  ],
  series: [weekly('stars', 'Repository stars gained per week', 'stars', [44, 48, 51, 58, 62, 66, 70, 141], 's6')],
  events: [
    { date: day('2026-09-03'), label: 'Cinder 0.7; first seen', kind: 'release', sourceIds: ['s1'] },
    { date: day('2026-09-13'), label: 'Framework A beta executor', kind: 'integration', sourceIds: ['s3'] },
    { date: day('2026-09-21'), label: 'Independent security review', kind: 'benchmark', sourceIds: ['s5'] },
    { date: day('2026-09-25'), label: 'Framework B beta executor', kind: 'integration', sourceIds: ['s4'] },
  ],
  risks: [
    fact('The review lists two medium-severity findings, since fixed.', 's5'),
    analysis('Sandboxes shift risk to the manifest: over-broad grants recreate the original problem.'),
  ],
  competingApproaches: [
    { name: 'MicroVM per tool call', relation: 'alternative', note: analysis('Stronger isolation, slower start, heavier operations.') },
    { name: 'Container sandboxes', relation: 'incumbent', note: analysis('Familiar tooling; coarse-grained capabilities.') },
  ],
  builders: [
    { name: 'Agent framework A', kind: 'project', note: fact('Beta Cinder executor.', 's3') },
    { name: 'Agent framework B', kind: 'project', note: fact('Beta Cinder executor.', 's4') },
  ],
  entities: [
    { slug: 'cinder', name: 'Cinder', kind: 'technology' },
    { slug: 'webassembly-component-model', name: 'WebAssembly component model', kind: 'standard' },
  ],
  sources: [
    cSrc('s1', 'official', 'primary', 'Cinder 0.7: capability manifests', 'Cinder project', { independent: false, publishedAt: day('2026-09-03') }),
    cSrc('s2', 'documentation', 'primary', 'Cinder docs: isolation model', 'Cinder project', { independent: false, publishedAt: day('2026-09-03') }),
    cSrc('s3', 'official', 'secondary', 'Framework A: sandboxed tool execution (beta)', 'Agent framework A', { independent: true, publishedAt: day('2026-09-13') }),
    cSrc('s4', 'github', 'secondary', 'Framework B: Cinder executor (beta)', 'Agent framework B', { independent: true, publishedAt: day('2026-09-25') }),
    cSrc('s5', 'news', 'secondary', 'Security review of the Cinder capability model', 'Independent security firm', { independent: true, publishedAt: day('2026-09-21') }),
    cSrc('s6', 'github', 'primary', 'cinder repository', 'GitHub', { independent: false, publishedAt: day('2026-09-26') }),
  ],
  scoreInputs: {
    assessed: {
      novelty: { level: 3, rationale: 'Per-call capability manifests for agent tools are new in practice.' },
      technicalSignificance: { level: 3, rationale: 'Addresses a real gap in agent security.' },
      developerRelevance: { level: 3, rationale: 'Relevant to all tool-executing agents; adoption cost is real.' },
    },
    momentumSeriesId: 'stars',
    independentIntegrations: 2,
    reproducibleBenchmark: null,
    runnableArtifact: true,
  },
}

/* ------------------------------------------------------------------ */
const wSrc = demoSourceFactory('model-weight-supply-chain')

export const weightSupplyChain: Signal = {
  id: '0b6f6c1e-4a0e-4f3a-9a40-1d7c2f0a0009',
  slug: 'supply-chain-attacks-targeting-model-weight-packages',
  title: 'Supply-chain attack pattern targets model-weight packages with unsafe deserialization',
  dek: 'Multiple advisories describe uploaded model files that execute code when loaded with legacy serialization formats.',
  primaryTopic: 'cybersecurity',
  topics: ['cybersecurity', 'foundation-models', 'open-source'],
  status: 'accelerating',
  timeToImpact: '0-3m',
  firstSeenAt: day('2026-09-12'),
  updatedAt: '2026-09-27T07:45:00.000Z',
  verified: true,
  hidden: false,
  isDemo: true,
  whatHappened: [
    fact('Three advisories in two weeks described model files on public hubs that run code when loaded with pickle-based formats.', 's1', 's2', 's3'),
    fact('The affected files used names close to popular models.', 's1'),
  ],
  whyItMatters: [
    analysis('Loading a model is often treated as reading data. With code-executing formats it is running untrusted code.'),
  ],
  technicalChange: [
    fact('The pattern relies on loaders that deserialize arbitrary Python objects.', 's2'),
    fact('Safe tensor-only formats do not execute code during loading.', 's4'),
  ],
  architecture: {
    caption: 'Where the attack enters',
    layers: [
      { id: 'application', label: 'Application / notebook', detail: 'Calls a model loader', role: 'affected' },
      { id: 'model', label: 'Model artifact', detail: 'Downloaded weights file', role: 'changed' },
      { id: 'security', label: 'Loader', detail: 'Unsafe deserialization executes embedded code', role: 'changed' },
      { id: 'infrastructure', label: 'Host', detail: 'Credentials, network and files of the loading process', role: 'affected' },
    ],
  },
  developerImplications: [
    analysis('Treat model downloads like package installs: pin by hash, prefer safe formats, and load in isolated environments.'),
  ],
  shouldCare: {
    whatChanged: [fact('Repeated advisories describing the same pattern.', 's1', 's2', 's3')],
    whoIsAffected: [analysis('Anyone who downloads model weights by name from public hubs, including in CI.')],
    whatCanDevelopersDo: [
      analysis('Refuse legacy code-executing formats in loaders where the option exists.', 's4'),
      analysis('Pin model revisions by content hash.'),
    ],
    productionReadiness: { level: 'unknown', statement: analysis('Not applicable — this is a risk, not a technology.') },
    whatWouldMakeItImportant: [estimate('Already important for teams that load models by name.')],
    whatCouldPreventAdoption: [analysis('Legacy checkpoints that exist only in unsafe formats.')],
  },
  difficulty: {
    overall: 2,
    setup: 1,
    conceptual: 2,
    production: 2,
    infrastructure: 2,
    rationale: 'Mitigations are configuration and process changes, not new infrastructure.',
  },
  adoptionSignals: [{ label: 'Advisories in the last 14 days', value: '3', sourceIds: ['s1', 's2', 's3'], kind: 'fact' }],
  series: [weekly('advisories', 'Related advisories per week', 'advisories', [0, 0, 1, 0, 0, 1, 1, 2], 's1', 3)],
  events: [
    { date: day('2026-09-12'), label: 'First advisory', kind: 'incident', sourceIds: ['s1'] },
    { date: day('2026-09-19'), label: 'Second advisory', kind: 'incident', sourceIds: ['s2'] },
    { date: day('2026-09-24'), label: 'Third advisory', kind: 'incident', sourceIds: ['s3'] },
  ],
  risks: [analysis('Counts reflect reported cases only.')],
  competingApproaches: [
    { name: 'Safe tensor formats', relation: 'alternative', note: fact('Do not execute code on load.', 's4') },
    { name: 'Artifact signing', relation: 'complement', note: analysis('Proves origin, not safety; useful alongside safe formats.') },
  ],
  builders: [],
  entities: [
    { slug: 'model-supply-chain', name: 'Model supply chain security', kind: 'technology' },
    { slug: 'unsafe-deserialization', name: 'Unsafe deserialization', kind: 'technology' },
  ],
  sources: [
    wSrc('s1', 'official', 'primary', 'Advisory: malicious model uploads with typo-squatted names', 'Model hub security team', {
      independent: true,
      publishedAt: day('2026-09-12'),
    }),
    wSrc('s2', 'official', 'primary', 'Advisory: code execution via legacy checkpoint loading', 'Open-source security foundation', {
      independent: true,
      publishedAt: day('2026-09-19'),
    }),
    wSrc('s3', 'news', 'secondary', 'Third wave of poisoned model uploads reported', 'Security news outlet', { independent: true, publishedAt: day('2026-09-24') }),
    wSrc('s4', 'documentation', 'primary', 'Loader documentation: safe formats and options', 'ML framework maintainers', {
      independent: true,
      publishedAt: day('2026-08-01'),
    }),
  ],
  scoreInputs: {
    assessed: {
      novelty: { level: 2, rationale: 'Known class of attack; new frequency and targeting.' },
      technicalSignificance: { level: 3, rationale: 'Code execution on developer and CI machines.' },
      developerRelevance: { level: 4, rationale: 'Affects anyone loading models by name.' },
    },
    momentumSeriesId: 'advisories',
    independentIntegrations: null,
    reproducibleBenchmark: null,
    runnableArtifact: null,
  },
}

/* ------------------------------------------------------------------ */
const hSrc = demoSourceFactory('harbor-proxy-pq-tls')

export const harborPq: Signal = {
  id: '0b6f6c1e-4a0e-4f3a-9a40-1d7c2f0a0010',
  slug: 'harbor-proxy-enables-post-quantum-tls-by-default',
  title: 'Harbor Proxy enables hybrid post-quantum key exchange by default',
  dek: 'A widely deployed reverse proxy turned on hybrid ML-KEM key exchange by default, moving post-quantum TLS from opt-in to baseline.',
  primaryTopic: 'cybersecurity',
  topics: ['cybersecurity', 'quantum-computing', 'computing-infrastructure'],
  status: 'establishing',
  timeToImpact: '0-3m',
  firstSeenAt: day('2026-09-01'),
  updatedAt: '2026-09-24T12:00:00.000Z',
  verified: true,
  hidden: false,
  isDemo: true,
  whatHappened: [
    fact('Harbor Proxy 5.2 negotiates a hybrid classical + ML-KEM key exchange by default when the client supports it.', 's1'),
    fact('The release notes document a small increase in handshake size.', 's1'),
  ],
  whyItMatters: [
    analysis('Traffic recorded today could be decrypted later if large quantum computers arrive; hybrid key exchange addresses that risk now.'),
    analysis('Defaults move ecosystems faster than recommendations.'),
  ],
  technicalChange: [
    fact('The hybrid scheme combines a classical elliptic-curve exchange with ML-KEM, so security holds if either remains unbroken.', 's2'),
    fact('Clients without support fall back to classical key exchange.', 's2'),
  ],
  architecture: {
    caption: 'TLS termination with hybrid key exchange',
    layers: [
      { id: 'user', label: 'Client', detail: 'Browser or HTTP client', role: 'affected' },
      { id: 'network', label: 'TLS handshake', detail: 'Hybrid key share; slightly larger ClientHello', role: 'changed' },
      { id: 'infrastructure', label: 'Reverse proxy', detail: 'Harbor Proxy 5.2', role: 'changed' },
      { id: 'application', label: 'Upstream app', detail: 'Unchanged', role: 'context' },
    ],
  },
  developerImplications: [
    analysis('Middleboxes that mishandle larger handshakes may cause connection failures; test before upgrading.'),
  ],
  shouldCare: {
    whatChanged: [fact('Hybrid PQ key exchange on by default in 5.2.', 's1')],
    whoIsAffected: [analysis('Operators of Harbor Proxy and clients connecting through it.')],
    whatCanDevelopersDo: [analysis('Upgrade in staging and watch handshake failure rates.')],
    productionReadiness: { level: 'production-ready', statement: fact('Default in a stable release.', 's1') },
    whatWouldMakeItImportant: [estimate('Already significant for operators; broader impact as other proxies follow.')],
    whatCouldPreventAdoption: [fact('Some legacy middleboxes reject larger handshakes.', 's3')],
  },
  difficulty: {
    overall: 1,
    setup: 1,
    conceptual: 2,
    production: 2,
    infrastructure: 1,
    rationale: 'A version upgrade; understanding the fallback behaviour is the main task.',
  },
  adoptionSignals: [
    { label: 'Default in stable release', value: 'Yes (5.2)', sourceIds: ['s1'], kind: 'fact' },
    { label: 'Share of connections using hybrid exchange', value: null, sourceIds: [], kind: 'fact' },
  ],
  series: [],
  events: [
    { date: day('2026-09-01'), label: 'Harbor Proxy 5.2 released', kind: 'release', sourceIds: ['s1'] },
    { date: day('2026-09-09'), label: 'Middlebox compatibility report', kind: 'discussion', sourceIds: ['s3'] },
  ],
  risks: [fact('Compatibility issues with some middleboxes.', 's3')],
  competingApproaches: [
    { name: 'Classical-only TLS', relation: 'incumbent', note: analysis('No protection against future decryption of recorded traffic.') },
  ],
  builders: [],
  entities: [
    { slug: 'harbor-proxy', name: 'Harbor Proxy', kind: 'technology' },
    { slug: 'ml-kem', name: 'ML-KEM', kind: 'standard' },
    { slug: 'post-quantum-cryptography', name: 'Post-quantum cryptography', kind: 'technology' },
  ],
  sources: [
    hSrc('s1', 'official', 'primary', 'Harbor Proxy 5.2 release notes', 'Harbor Proxy project', { independent: false, publishedAt: day('2026-09-01') }),
    hSrc('s2', 'documentation', 'primary', 'Harbor docs: hybrid key exchange', 'Harbor Proxy project', { independent: false, publishedAt: day('2026-09-01') }),
    hSrc('s3', 'discussion', 'community', 'Mailing list: handshake failures behind legacy middleboxes', 'Operators mailing list', {
      independent: true,
      publishedAt: day('2026-09-09'),
    }),
    hSrc('s4', 'news', 'secondary', 'Reverse proxy flips post-quantum TLS on by default', 'Infrastructure news outlet', {
      independent: true,
      publishedAt: day('2026-09-03'),
    }),
  ],
  scoreInputs: {
    assessed: {
      novelty: { level: 1, rationale: 'Hybrid PQ TLS is established; the default is the change.' },
      technicalSignificance: { level: 3, rationale: 'Defaults shift a large installed base.' },
      developerRelevance: { level: 2, rationale: 'Mostly transparent to application developers.' },
    },
    independentIntegrations: null,
    reproducibleBenchmark: null,
    runnableArtifact: true,
  },
}
