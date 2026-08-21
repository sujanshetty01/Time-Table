/* ============================================================
   CloudPath — Azure Cloud Architect Curriculum (Sujan)
   12-month roadmap → Azure Solutions Architect Expert.
   All learning content lives here so it's easy to customize.
   ============================================================ */

/* Your exact weekday learning window: 12:00 PM – 3:00 PM */
const DAILY = [
  {
    time: "12:00–1:00",
    dur: "60 min",
    title: "Learn — Microsoft Learn / docs",
    desc: "Work through the Microsoft Learn path or Azure Architecture documentation for this month's topic. Take structured notes.",
    color: "#5b8cff",
    tags: ["Microsoft Learn", "Theory", "Deep focus"],
  },
  {
    time: "1:00–2:00",
    dur: "60 min",
    title: "Hands-on lab",
    desc: "Build it for real in the Azure portal, CLI, PowerShell or Bicep. Deploy → break → troubleshoot. Skill forms here.",
    color: "#22d3ee",
    tags: ["Portal", "CLI/PowerShell", "Bicep"],
  },
  {
    time: "2:00–2:30",
    dur: "30 min",
    title: "Document — notes & commands",
    desc: "Write down commands, errors and troubleshooting steps. Commit to your GitHub journey repo. Your portfolio compounds daily.",
    color: "#8b5cf6",
    tags: ["Notes", "GitHub", "Journal"],
  },
  {
    time: "2:30–3:00",
    dur: "30 min",
    title: "Review — decisions & practice",
    desc: "Review architecture decisions (ADRs) or answer practice-exam questions. Close the loop and reinforce judgment.",
    color: "#fb7185",
    tags: ["ADRs", "Practice exam", "Review"],
  },
];

const WEEK = [
  { day: "Mon", focus: "Learn", weekend: false, tasks: [
    { t: "New Azure service / concept", k: "learn" },
    { t: "Guided Microsoft Learn module", k: "learn" },
    { t: "First hands-on deploy", k: "lab" },
  ]},
  { day: "Tue", focus: "Deploy", weekend: false, tasks: [
    { t: "Configure & extend the service", k: "lab" },
    { t: "Portal + CLI/PowerShell", k: "lab" },
    { t: "Journal notes", k: "review" },
  ]},
  { day: "Wed", focus: "Break & Fix", weekend: false, tasks: [
    { t: "Intentionally break it", k: "lab" },
    { t: "Diagnose & troubleshoot", k: "lab" },
    { t: "Commit findings to GitHub", k: "project" },
  ]},
  { day: "Thu", focus: "Automate", weekend: false, tasks: [
    { t: "Recreate with Bicep / CLI", k: "lab" },
    { t: "Read a reference architecture", k: "learn" },
    { t: "Cost + security check", k: "review" },
  ]},
  { day: "Fri", focus: "Document & Review", weekend: false, tasks: [
    { t: "Write an ADR / diagram", k: "project" },
    { t: "Practice-exam questions", k: "review" },
    { t: "Weekly retro (15 min)", k: "review" },
  ]},
  { day: "Sat", focus: "Deep Work", weekend: true, tasks: [
    { t: "2h — deep technical study", k: "learn" },
    { t: "3h — project implementation", k: "project" },
    { t: "1h — docs & GitHub updates", k: "project" },
  ]},
  { day: "Sun", focus: "Review & Plan", weekend: true, tasks: [
    { t: "1h — weekly review", k: "review" },
    { t: "1h — practice questions", k: "review" },
    { t: "1h — architecture case study", k: "learn" },
    { t: "30m — plan next week", k: "review" },
  ]},
];

const KIND_COLOR = { learn: "#5b8cff", lab: "#22d3ee", project: "#8b5cf6", review: "#34d399" };

/* ---- 12-month roadmap, grouped into 4 quarters ---- */
let PHASES = [
  {
    id: "p1",
    months: "Months 1–3",
    title: "Foundations & Core Services",
    goal: "Cloud, identity & core Azure",
    outcome:
      "Build unshakeable Azure fundamentals and turn your networking background into an advantage. Set up your learning environment, master identity & governance, and learn to choose the right compute and storage.",
    certs: ["AZ-900: Azure Fundamentals (optional)"],
    plan: [
      {
        n: 1, title: "Cloud, Linux & Networking Foundation",
        study: [
          "Cloud concepts: IaaS, PaaS, SaaS; public/private/hybrid",
          "Regions, availability zones & region pairs",
          "Subscriptions, tenants & management groups; resource groups & ARM",
          "Shared responsibility model; basic Windows/Linux admin",
          "TCP/IP, subnetting, DNS, DHCP, HTTP/HTTPS, routing; Git & GitHub",
        ],
        hands: [
          "Create resource groups in the portal",
          "Start & connect to a Linux VM and a Windows VM",
          "Create a VNet with two subnets",
          "Create an NSG and test allowed vs denied traffic",
          "Create a storage account and upload files; use Cloud Shell + Azure CLI",
          "Delete unused resources after every lab",
        ],
        deliverable: "Create GitHub repo 'azure-cloud-architect-journey' with the recommended folder structure",
      },
      {
        n: 2, title: "Identity, Governance & Administration",
        study: [
          "Microsoft Entra ID: users, groups, administrative units",
          "Azure RBAC; management groups, subscriptions, resource groups",
          "Azure Policy, resource locks, tags, managed identities, Key Vault",
          "Azure Resource Manager; Azure CLI and PowerShell",
        ],
        hands: [
          "Build a management-group hierarchy (Platform / Production / Non-Production)",
          "Separate prod & dev resource groups",
          "RBAC assignments with least privilege",
          "Azure Policy restricting resource locations",
          "Mandatory tags (Environment, Owner, CostCenter) + resource locks",
          "Managed identity that accesses Key Vault",
        ],
        deliverable: "Enterprise hierarchy lab + access-model doc (answer the 6 architect access questions)",
      },
      {
        n: 3, title: "Compute, Storage & Application Hosting",
        study: [
          "VMs, VM Scale Sets, App Service, Functions, Container Apps, ACI, AKS",
          "Managed disks, Azure Files, Blob Storage",
          "Redundancy: LRS, ZRS, GRS, GZRS; lifecycle management",
          "Azure SQL, Azure Database for PostgreSQL, Cosmos DB",
        ],
        hands: [
          "Deploy the same app on a VM, App Service, and a container service",
          "Compare management, scaling, availability, security, cost & ops overhead",
        ],
        deliverable: "ADR-001: Selecting an Azure Compute Platform (requirement → options → decision → trade-offs)",
      },
    ],
  },
  {
    id: "p2",
    months: "Months 4–6",
    title: "Networking, Reliability & AZ-104",
    goal: "Networking, DR & Administrator cert",
    outcome:
      "Leverage your networking strength: design hub-and-spoke topologies, private connectivity and load balancing. Add monitoring, backup and disaster recovery, then consolidate and pass AZ-104.",
    certs: ["AZ-104: Microsoft Azure Administrator"],
    plan: [
      {
        n: 4, title: "Azure Networking Deep Dive",
        study: [
          "VNets/subnets, CIDR & IP planning, NSGs & ASGs, UDRs, Route Server",
          "VNet peering, service endpoints, Private Link & private endpoints, Private DNS",
          "Load Balancer, Application Gateway + WAF, Front Door, Traffic Manager",
          "VPN Gateway, ExpressRoute, Azure Firewall, Bastion, Virtual WAN, Network Watcher",
        ],
        hands: [
          "Capstone 1: hub VNet + two spoke VNets with peering",
          "Azure Firewall / controlled routing; separate app & db subnets",
          "Least-privilege NSGs; private endpoint for a storage account",
          "Private DNS resolution; Bastion-based admin access; central logging",
        ],
        deliverable: "Capstone 1 docs: logical + topology diagrams, IP plan, port/protocol matrix, traffic flow, failure analysis, monthly cost estimate",
      },
      {
        n: 5, title: "Monitoring, Backup, Reliability & DR",
        study: [
          "Azure Monitor, Log Analytics, metrics/logs, KQL basics, Application Insights",
          "Alerts & action groups, Service Health, Network Watcher",
          "Azure Backup, Site Recovery, availability sets & zones, cross-region recovery",
          "RTO, RPO, active-active vs active-passive architectures",
        ],
        hands: [
          "Two-tier workload with Log Analytics + telemetry",
          "CPU & availability alerts; backup policy + recovery test",
          "Availability-zone distribution; workload-health dashboard",
          "Document RTO & RPO values",
        ],
        deliverable: "Disaster-recovery runbook (declaration → failover → redirect → recovery → validation → comms → failback → review)",
      },
      {
        n: 6, title: "AZ-104 Consolidation & Certification",
        study: [
          "Full AZ-104 syllabus: identity/governance, VNets, storage, compute, monitoring, backup",
          "3-step cycle: Learn → Build (portal/CLI/PowerShell/Bicep) → Troubleshoot",
        ],
        hands: [
          "Rebuild every major task across portal, CLI, PowerShell & Bicep",
          "Intentionally inject errors (NSG, RBAC scope, DNS, routes, storage firewall) and fix them",
          "Score 80–85%+ repeatedly on legitimate practice assessments",
        ],
        deliverable: "🎓 Pass AZ-104 — Microsoft Azure Administrator",
      },
    ],
  },
  {
    id: "p3",
    months: "Months 7–9",
    title: "Automation & Security",
    goal: "Bicep, DevOps & enterprise security",
    outcome:
      "Move from clicking to engineering: codify everything with Bicep, ship it through secure CI/CD, then harden your environment to enterprise security & governance standards.",
    certs: ["AZ-700: Azure Network Engineer (optional specialization)"],
    plan: [
      {
        n: 7, title: "Infrastructure as Code with Bicep",
        study: [
          "Declarative infrastructure; Bicep syntax, params, variables, outputs",
          "Conditions & loops, modules, existing-resource references",
          "RG / subscription / management-group deployments; validation & what-if",
          "Azure Verified Modules; environment param files; secure parameters",
        ],
        hands: [
          "Rebuild your network project in Bicep (main.bicep + dev/prod param files + modules)",
          "Run what-if validation; commit no secrets to Git",
          "Make the deployment repeatable with cleanup instructions",
        ],
        deliverable: "Bicep repo: README, diagram, param docs, naming & tagging standards, what-if validation",
      },
      {
        n: 8, title: "DevOps, Automation & Secure Delivery",
        study: [
          "Git branching, pull requests, code reviews",
          "GitHub Actions / Azure Pipelines; CI/CD; environments & approval gates",
          "Workload identities, OpenID Connect, Key Vault integration, secret rotation",
          "Bicep lint & validation; deployment strategies; DevSecOps basics",
        ],
        hands: [
          "Build a pipeline: PR → lint → what-if → approval → dev → tests → prod approval → prod",
          "Use workload identity federation (no long-lived client secrets)",
        ],
        deliverable: "DevSecOps doc: auth method, RBAC scope, branch protection, approvals, env separation, rollback, secret handling, emergency access",
      },
      {
        n: 9, title: "Enterprise Security & Governance",
        study: [
          "Zero Trust; Conditional Access; Privileged Identity Management (PIM)",
          "Managed identities, Key Vault, encryption at rest/in transit, customer-managed keys",
          "Defender for Cloud, CSPM, Secure Score, Azure Policy, compliance",
          "JIT VM access, Sentinel basics, segmentation, exfiltration controls, private connectivity",
        ],
        hands: [
          "Harden your environment: remove public endpoints, add private endpoints",
          "Enable diagnostics; store secrets in Key Vault; replace credentials with managed identities",
          "Apply least privilege + security policies; review Defender recommendations & add alerts",
        ],
        deliverable: "Threat model per workload: assets, actors, entry points, trust boundaries, threats, controls, residual risk, monitoring, IR owner",
      },
    ],
  },
  {
    id: "p4",
    months: "Months 10–12",
    title: "Enterprise Architecture & Expert",
    goal: "Landing zones, AZ-305 & capstone",
    outcome:
      "Think like an architect: apply the Cloud Adoption Framework, design an enterprise landing zone with FinOps, pass AZ-305 to earn the Expert certification, and prove it all with a production-grade capstone portfolio.",
    certs: ["AZ-305: Designing Azure Infrastructure", "🏛️ Azure Solutions Architect Expert"],
    plan: [
      {
        n: 10, title: "Cloud Adoption, Landing Zones & FinOps",
        study: [
          "Cloud Adoption Framework: Strategy, Plan, Ready, Adopt, Govern, Secure, Manage",
          "Landing zones: platform vs application, MG hierarchy, identity/connectivity/management subs",
          "Subscription vending, central logging, policy inheritance, team responsibilities",
          "FinOps: cost allocation, tags/chargeback, budgets, reservations, savings plans, rightsizing, Advisor, anomaly detection",
        ],
        hands: [
          "Capstone 2: Enterprise Landing Zone for a fictional org",
          "MG hierarchy, subscription design, identity & access model, hub-and-spoke",
          "Central monitoring, security policies, naming & tagging, BC plan, cost model",
          "Deploy with Bicep + CI/CD",
        ],
        deliverable: "Capstone 2: Enterprise Landing Zone design + deployment",
      },
      {
        n: 11, title: "AZ-305 & Architecture Decision-Making",
        study: [
          "Well-Architected Framework: reliability, security, cost, operational excellence, performance",
          "Patterns: Retry, Circuit Breaker, Queue-Based Load Leveling, Cache-Aside, Bulkhead",
          "Strangler Fig, Saga, Event Sourcing, CQRS, Gateway Aggregation, Pub-Sub, Sharding, Throttling",
          "AZ-305 case studies: requirements, constraints, SLA, RTO/RPO, scale, cost limits",
        ],
        hands: [
          "For each case: recommended + alternative architecture, trade-off matrix, failure-mode analysis",
          "Security controls, cost estimate, migration strategy, operations plan",
        ],
        deliverable: "🎓 Pass AZ-305 → earn Azure Solutions Architect Expert (with active AZ-104)",
      },
      {
        n: 12, title: "Final Portfolio & Interview Prep",
        study: [
          "Design for progressive scale: 100 → 10k → 100k → 1M customers",
          "When to add async processing, caching, read replicas, partitioning, autoscaling, multi-region",
          "Interview preparation & architecture defense",
        ],
        hands: [
          "Capstone 3 (FarmersConnect): Front Door + WAF, App Service/Container Apps/AKS, API Management",
          "Functions, Service Bus/Event Grid, Azure SQL/PostgreSQL, Cosmos DB, Redis, Blob",
          "Entra ID/External ID, Key Vault, App Insights, Log Analytics, private endpoints",
          "Zone redundancy, multi-region recovery, Bicep, GitHub Actions, cost estimate, threat model",
        ],
        deliverable: "Final portfolio package (20 items): summary, diagrams, security, data, DR, cost, WAF review, ADRs, demo video",
      },
    ],
  },
];

let MILESTONES = [
  {
    time: "3 Months", sub: "Foundation", icon: "🌱", role: "Azure Aware",
    title: "Fundamentals & governance locked in",
    items: [
      "AZ-900 passed (optional) + journey repo live",
      "Entra ID, RBAC, Policy, tags & locks in place",
      "Management-group hierarchy built",
      "ADR-001 compute decision written",
    ],
  },
  {
    time: "6 Months", sub: "AZ-104", icon: "⚙️", role: "Azure Administrator",
    title: "Administrator certified",
    items: [
      "🎓 AZ-104 passed",
      "Hub-and-spoke network capstone built",
      "Monitoring, backup & DR runbook done",
      "Confident across portal, CLI, PowerShell & Bicep",
    ],
  },
  {
    time: "9 Months", sub: "Automation", icon: "🚀", role: "Cloud/DevOps Engineer",
    title: "Automated & secured",
    items: [
      "Full Bicep IaC repo with modules",
      "Secure CI/CD pipeline (workload identity)",
      "Environment hardened; Defender reviewed",
      "Threat model per workload documented",
    ],
  },
  {
    time: "12 Months", sub: "Expert", icon: "🏛️", role: "Azure Solutions Architect",
    title: "Solutions Architect Expert",
    items: [
      "🎓 AZ-305 passed → Expert certification earned",
      "Enterprise landing zone + FinOps design",
      "Production-grade capstone (FarmersConnect)",
      "Full portfolio + interviewing for architect roles",
    ],
  },
];

/* Portfolio evidence targets for the year */
const EVIDENCE = [
  "3 major architecture projects",
  "8–12 architecture diagrams",
  "10 architecture decision records",
  "20+ reusable Bicep modules",
  "2 working CI/CD pipelines",
  "3 cost estimates",
  "2 disaster-recovery runbooks",
  "2 threat models",
  "1 enterprise landing-zone design",
  "1 complete Well-Architected review",
  "AZ-104 certification",
  "AZ-305 + Azure Solutions Architect Expert",
];

/* Learning method: effort split + the per-service cycle */
const METHOD = {
  ratio: [
    { label: "Structured learning", pct: 20, color: "#5b8cff" },
    { label: "Hands-on implementation", pct: 50, color: "#22d3ee" },
    { label: "Architecture documentation", pct: 20, color: "#8b5cf6" },
    { label: "Exam preparation", pct: 10, color: "#34d399" },
  ],
  cycle: ["Learn", "Deploy", "Break", "Troubleshoot", "Automate", "Document", "Explain"],
};

/* Industry-ready competency checklist */
const COMPETENCIES = [
  { area: "Azure Platform", ico: "☁️", items: [
    "Deploy & manage Azure resources",
    "Use Azure CLI and PowerShell",
    "Understand subscriptions & management groups",
    "Use tags, policies, RBAC and locks",
  ]},
  { area: "Networking", ico: "🌐", items: [
    "Design IP address spaces",
    "Build hub-and-spoke networks",
    "Design hybrid connectivity",
    "Implement private endpoints & DNS; troubleshoot routing",
  ]},
  { area: "Security", ico: "🔒", items: [
    "Design least-privilege access",
    "Use managed identities & Key Vault",
    "Apply network segmentation",
    "Evaluate Defender for Cloud; explain Zero Trust",
  ]},
  { area: "Reliability", ico: "♻️", items: [
    "Define SLA, SLO, RTO and RPO",
    "Design for availability zones",
    "Create backup & DR strategies",
    "Perform failure-mode analysis",
  ]},
  { area: "Automation", ico: "⚙️", items: [
    "Write modular Bicep templates",
    "Use Git & pull requests",
    "Deploy with GitHub Actions / Azure Pipelines",
    "Use workload identity federation",
  ]},
  { area: "Cost & FinOps", ico: "💰", items: [
    "Create pricing estimates",
    "Configure budgets & alerts",
    "Compare architecture costs",
    "Explain cost vs reliability trade-offs",
  ]},
  { area: "Communication", ico: "🗣️", items: [
    "Draw professional diagrams",
    "Write architecture decision records",
    "Produce executive & technical docs",
    "Defend your design during reviews",
  ]},
];

/* Common mistakes to avoid */
const MISTAKES = [
  "Studying only for certifications without building projects",
  "Memorizing services without understanding trade-offs",
  "Learning only through the Azure portal",
  "Ignoring networking fundamentals",
  "Using public endpoints by default",
  "Leaving resources running and accumulating costs",
  "Committing secrets to GitHub",
  "Skipping documentation",
  "Designing multi-region systems without a business requirement",
  "Choosing AKS for every containerized workload",
  "Ignoring operational ownership & support processes",
  "Treating cost optimization as an afterthought",
  "Using old exam courses instead of current Microsoft study guides",
];

let RESOURCES = [
  { ico: "📚", title: "Microsoft Learn", items: ["AZ-104 & AZ-305 study guides", "Official Learn paths (free)", "Practice assessments", "Exam sandbox"] },
  { ico: "🏗️", title: "Architecture", items: ["Azure Architecture Center", "Well-Architected Framework", "Cloud Adoption Framework", "Reference architectures"] },
  { ico: "🧱", title: "IaC & DevOps", items: ["Bicep documentation", "Azure Verified Modules", "GitHub Actions", "Azure Pipelines"] },
  { ico: "🔐", title: "Security", items: ["Defender for Cloud", "Microsoft Entra docs", "Zero Trust guidance", "Key Vault"] },
  { ico: "💰", title: "Cost & FinOps", items: ["Azure Pricing Calculator", "Microsoft Cost Management", "Azure Advisor", "FinOps Framework"] },
  { ico: "🛠️", title: "Tools", items: ["VS Code + Bicep extension", "Azure CLI & PowerShell", "Azure Cloud Shell", "Git & GitHub"] },
];

/* Build trackable tasks per quarter from monthly plans (optionally namespaced by goal). */
function buildTracker(phases, prefix) {
  prefix = prefix || "";
  return phases.map((p) => ({
    id: p.id,
    title: `${p.title} · ${p.months}`,
    tasks: p.plan
      .flatMap((m) => [
        `📘 Study — Month ${m.n}: ${m.title}`,
        ...m.hands,
        `📦 ${m.deliverable}`,
      ])
      .map((label, i) => ({ id: `${prefix}${p.id}-${i}`, label })),
  }));
}

let TRACKER = buildTracker(PHASES, "");

// Snapshot the Azure Cloud Architect roadmap so it can be restored from the registry.
const ROADMAP_CLOUD_ARCHITECT_AZURE = { phases: PHASES, milestones: MILESTONES, resources: RESOURCES };

/* Gamification */
const XP_PER_TASK = 10;

// Rank tiers by % of overall completion.
const RANKS = [
  { min: 0,  name: "Azure Novice",        emoji: "🌱" },
  { min: 15, name: "Azure Explorer",      emoji: "🧭" },
  { min: 35, name: "Azure Administrator", emoji: "⚙️" },
  { min: 60, name: "Azure Engineer",      emoji: "🚀" },
  { min: 85, name: "Azure Architect",     emoji: "🏛️" },
];

// Level titles (level derived from XP).
const LEVEL_TITLES = [
  "Getting Started", "Building Momentum", "Finding Your Flow", "Skilled Learner",
  "Admin Ready", "Automation Adept", "Security Minded", "Architect in Training",
  "Design Master", "Azure Legend",
];

// Achievements — unlocked by a predicate over progress state.
const BADGES = [
  { id: "first",     ico: "🎯", name: "First Step",        desc: "Complete your first task",                 test: (s) => s.done >= 1 },
  { id: "ten",       ico: "🔟", name: "Perfect Ten",       desc: "Complete 10 tasks",                        test: (s) => s.done >= 10 },
  { id: "p1",        ico: "🌱", name: "Foundations Built", desc: "Finish Q1 — Foundations & Core Services",  test: (s) => s.phase.p1 === 1 },
  { id: "p2",        ico: "⚙️", name: "Administrator",     desc: "Finish Q2 — Networking, Reliability & AZ-104", test: (s) => s.phase.p2 === 1 },
  { id: "p3",        ico: "🚀", name: "Automator",         desc: "Finish Q3 — Automation & Security",        test: (s) => s.phase.p3 === 1 },
  { id: "p4",        ico: "🏛️", name: "Architect",         desc: "Finish Q4 — Enterprise Architecture & Expert", test: (s) => s.phase.p4 === 1 },
  { id: "half",      ico: "🔥", name: "Halfway Hero",      desc: "Reach 50% overall progress",               test: (s) => s.pct >= 50 },
  { id: "streak3",   ico: "📅", name: "Consistent",        desc: "Hit a 3-day learning streak",              test: (s) => s.streak >= 3 },
  { id: "streak7",   ico: "💪", name: "Unstoppable",       desc: "Hit a 7-day learning streak",              test: (s) => s.streak >= 7 },
  { id: "complete",  ico: "👑", name: "Expert Achieved",   desc: "Complete the entire journey",              test: (s) => s.pct >= 100 },
];
