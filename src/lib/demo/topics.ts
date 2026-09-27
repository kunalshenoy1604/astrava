import type { Topic } from '@/lib/domain/types'

/**
 * Topic taxonomy. Descriptions and FAQs describe the scope of coverage and how
 * Astrava treats evidence in that area; they make no market or adoption claims.
 */
export const TOPICS: Topic[] = [
  {
    slug: 'artificial-intelligence',
    name: 'Artificial Intelligence',
    short: 'AI',
    description:
      'Technical developments across machine learning systems: models, training and inference techniques, evaluation, and the tooling developers use to ship AI features.',
    related: ['foundation-models', 'ai-agents', 'ai-infrastructure'],
    emerging: ['Evaluation methods', 'Inference efficiency', 'Small specialised models', 'Multimodal interfaces'],
    faqs: [
      {
        q: 'What counts as an AI signal on Astrava?',
        a: 'A change a developer could act on: a new capability with a runnable artifact, a measurable efficiency gain, a shift in how teams build AI features, or a risk that affects shipped systems. Announcements without code, documentation or independent confirmation are held as unconfirmed.',
      },
      {
        q: 'How do you avoid ranking AI hype?',
        a: 'Every Breakout Score includes a hype penalty. Marketing superlatives in headlines, benchmarks that only the vendor has run, and discussion volume that outpaces evidence all subtract points. The penalty and its reasons are shown on each signal.',
      },
      {
        q: 'Are benchmark numbers verified?',
        a: 'Benchmarks are shown with their source and marked as self-reported or independent. Astrava does not re-run benchmarks; where no independent reproduction exists, the evidence section says so.',
      },
    ],
  },
  {
    slug: 'ai-agents',
    name: 'AI Agents',
    short: 'Agents',
    parent: 'artificial-intelligence',
    description:
      'Systems in which a model plans and calls tools across multiple steps: tool protocols, execution sandboxes, durable workflows, memory, evaluation and observability for agent runs.',
    related: ['developer-tools', 'cybersecurity', 'foundation-models'],
    emerging: ['Tool-calling protocols', 'Sandboxed tool execution', 'Deterministic replay', 'Agent evaluation', 'Run tracing'],
    faqs: [
      {
        q: 'Why track agent infrastructure rather than agent products?',
        a: 'Infrastructure changes — how tools are described, sandboxed, traced and replayed — tend to affect every team building agents, and they leave observable evidence in repositories and specifications before they appear in product announcements.',
      },
      {
        q: 'What makes an agent-tooling signal production-relevant?',
        a: 'Astrava looks for reproducibility (can a run be replayed?), isolation (what can a tool call touch?), and observability (can a failure be diagnosed?). Signals that improve one of these with a runnable artifact score higher on evidence strength.',
      },
    ],
  },
  {
    slug: 'foundation-models',
    name: 'Foundation Models',
    short: 'Models',
    parent: 'artificial-intelligence',
    description:
      'Large pretrained models and the techniques around them: architectures, training recipes, fine-tuning methods, open weights, context handling and model evaluation.',
    related: ['ai-infrastructure', 'artificial-intelligence', 'robotics'],
    emerging: ['Open training recipes', 'Repository-scale code models', 'Efficient fine-tuning', 'Long-context methods'],
    faqs: [
      {
        q: 'Do you cover closed models?',
        a: 'Yes, when there is observable developer-facing change such as a new API capability with documentation. Claims that cannot be checked outside the vendor are marked as self-reported and reduce evidence strength.',
      },
      {
        q: 'How are model releases scored differently from tools?',
        a: 'They use the same model. Releases with open weights or a reproducible evaluation score higher on evidence strength; releases with only a blog post and a leaderboard screenshot score lower and often carry a hype penalty.',
      },
    ],
  },
  {
    slug: 'developer-tools',
    name: 'Developer Tools',
    short: 'Dev tools',
    description:
      'Editors, language servers, build systems, testing, debugging and workflow tools — including tools that change how developers work with AI in their codebase.',
    related: ['ai-agents', 'open-source', 'ai-infrastructure'],
    emerging: ['Typed prompt tooling', 'Local model runtimes', 'Workflow replay', 'Language-server extensions'],
    faqs: [
      {
        q: 'What makes a developer tool worth watching?',
        a: 'Independent integrations (other projects building on it), a maintainer base beyond one person, documentation that covers failure modes, and a problem that many teams share. Astrava measures the first two and records the others as analysis.',
      },
      {
        q: 'Why do some tools show "Insufficient evidence"?',
        a: 'When a tool has only community discussion and no release, documentation or independent use, Astrava shows what is missing rather than filling the gap with a plausible description.',
      },
    ],
  },
  {
    slug: 'ai-infrastructure',
    name: 'AI Infrastructure',
    short: 'AI infra',
    parent: 'artificial-intelligence',
    description:
      'Serving, inference engines, retrieval and vector storage, accelerators and schedulers — the layers underneath AI applications that determine cost, latency and reliability.',
    related: ['computing-infrastructure', 'foundation-models', 'open-source'],
    emerging: ['Inference engines', 'Speculative decoding', 'KV-cache management', 'Vector indexes in general-purpose databases'],
    faqs: [
      {
        q: 'How do you compare inference performance claims?',
        a: 'Astrava records the hardware, model and workload stated by each benchmark and whether anyone other than the authors reproduced it. Numbers without that context are not shown as facts.',
      },
      {
        q: 'Why does time-to-impact matter for infrastructure?',
        a: 'Infrastructure changes often take months to reach managed services and deployment templates. The time-to-impact estimate indicates when a typical application team might realistically adopt it; it is labelled as an estimate.',
      },
    ],
  },
  {
    slug: 'open-source',
    name: 'Open Source',
    short: 'OSS',
    description:
      'Open-source projects whose momentum, governance or licensing changes affect what developers can build on — tracked through repositories, package registries and maintainer activity.',
    related: ['developer-tools', 'ai-infrastructure', 'computing-infrastructure'],
    emerging: ['Maintainer diversity', 'License changes', 'Foundation governance', 'Package-registry adoption'],
    faqs: [
      {
        q: 'Are GitHub stars used in the score?',
        a: 'Stars can feed the momentum factor, which compares recent activity to its own baseline. They are never used alone: the adoption factor relies on independent integrations and dependent packages, which are harder to inflate.',
      },
      {
        q: 'How do you treat single-maintainer projects?',
        a: 'They can still be signals, but the risks section notes bus-factor concerns and evidence strength reflects whether anyone else depends on the project.',
      },
    ],
  },
  {
    slug: 'robotics',
    name: 'Robotics',
    short: 'Robotics',
    description:
      'Robot learning, simulation, control and the software stack for physical systems — with attention to results that are reproduced outside the lab that produced them.',
    related: ['foundation-models', 'ai-infrastructure', 'artificial-intelligence'],
    emerging: ['Vision-language-action policies', 'Sim-to-real transfer', 'Open robot datasets', 'Manipulation benchmarks'],
    faqs: [
      {
        q: 'Why are robotics signals often rated with longer time-to-impact?',
        a: 'Physical deployment adds hardware cost, safety validation and integration work. Even strong research results usually take longer to reach application developers than software-only changes.',
      },
      {
        q: 'What evidence carries the most weight in robotics?',
        a: 'Independent reproductions on different hardware, released checkpoints and training recipes, and benchmark suites with public protocols. Demonstration videos alone are treated as community-level evidence.',
      },
    ],
  },
  {
    slug: 'quantum-computing',
    name: 'Quantum Computing',
    short: 'Quantum',
    description:
      'Quantum hardware milestones, error correction and mitigation, SDKs and algorithms — and the post-quantum cryptography work that affects developers well before large quantum computers exist.',
    related: ['cybersecurity', 'computing-infrastructure'],
    emerging: ['Error mitigation in SDKs', 'Hybrid quantum-classical workflows', 'Post-quantum key exchange'],
    faqs: [
      {
        q: 'Is quantum computing relevant to application developers today?',
        a: 'Mostly through cryptography: migrating to post-quantum algorithms is practical work now. Direct use of quantum hardware remains research-oriented for most teams, which is reflected in long time-to-impact estimates.',
      },
      {
        q: 'How do you handle quantum advantage claims?',
        a: 'Claims of advantage are recorded as the authors’ claims with their stated conditions. Astrava does not assert advantage; independent analysis, when available, is linked separately.',
      },
    ],
  },
  {
    slug: 'cybersecurity',
    name: 'Cybersecurity',
    short: 'Security',
    description:
      'Security developments that change how software is built and operated: supply-chain attacks, sandboxing, memory safety, cryptographic migrations and security tooling.',
    related: ['ai-agents', 'computing-infrastructure', 'quantum-computing'],
    emerging: ['Model-artifact supply chain', 'Capability-based sandboxes', 'Memory-safe rewrites', 'Post-quantum TLS'],
    faqs: [
      {
        q: 'Do you publish vulnerability details?',
        a: 'No exploit details. Security signals describe the pattern, who is affected and what developers can check or change, and link to primary advisories.',
      },
      {
        q: 'Why do security signals often have short time-to-impact?',
        a: 'An active attack pattern affects developers immediately. The estimate reflects when action is needed, not when the technique becomes widespread.',
      },
    ],
  },
  {
    slug: 'computing-infrastructure',
    name: 'Computing Infrastructure',
    short: 'Compute',
    description:
      'Runtimes, compilers, instruction-set architectures, databases, networking and operating-system work that shifts performance, portability or cost for software teams.',
    related: ['ai-infrastructure', 'open-source', 'cybersecurity'],
    emerging: ['RISC-V vector support', 'WebAssembly components', 'Database-native vector search', 'Memory-safe systems software'],
    faqs: [
      {
        q: 'Why include low-level infrastructure in a developer intelligence feed?',
        a: 'Compiler, runtime and database changes decide what is cheap or possible for everything built above them. They are often visible early in mailing lists, repositories and release notes.',
      },
      {
        q: 'How do you judge portability claims?',
        a: 'By whether the change has landed in a released version, whether conformance tests pass, and whether independent projects report using it on the target platform.',
      },
    ],
  },
]

export const TOPIC_BY_SLUG = new Map(TOPICS.map((t) => [t.slug, t]))
