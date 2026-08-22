/* ============================================================
   roadmaps.js — goal-specific roadmap templates + registry
   Each goal provides { phases, milestones, resources }.
   setActiveRoadmap() swaps the active PHASES/MILESTONES/
   RESOURCES/TRACKER (declared in data.js) for the chosen goal.
   ============================================================ */

// compact builders
const ph = (id, months, title, goal, outcome, certs, plan) => ({ id, months, title, goal, outcome, certs, plan });
const mo = (n, title, study, hands, deliverable) => ({ n, title, study, hands, deliverable });
const ms = (time, sub, icon, role, title, items) => ({ time, sub, icon, role, title, items });
const rs = (ico, title, items) => ({ ico, title, items });

/* ===================== AI ENGINEER ===================== */
const AI_ENGINEER = {
  phases: [
    ph("p1", "Months 1–3", "ML Foundations", "Python, math & classic ML",
      "Build the mathematical and programming base of machine learning and ship your first trained models.",
      ["(optional) ML foundations"],
      [
        mo(1, "Python & Data Tooling",
          ["Python, NumPy, pandas, Jupyter", "Data cleaning & manipulation", "Git & virtual environments"],
          ["Load, clean and explore a real dataset", "Plot distributions & correlations", "Push an EDA notebook to GitHub"],
          "Exploratory data analysis notebook with insights"),
        mo(2, "Math for ML",
          ["Linear algebra & vectors", "Probability & statistics", "Gradient descent intuition"],
          ["Implement linear regression from scratch", "Code gradient descent", "Visualize the loss surface"],
          "From-scratch linear regression notebook"),
        mo(3, "Classic ML with scikit-learn",
          ["Regression, classification, clustering", "Train/test split, cross-validation", "Feature engineering & metrics"],
          ["Train & compare 3 models", "Tune hyperparameters", "Evaluate with proper metrics"],
          "ML project with model comparison + README"),
      ]),
    ph("p2", "Months 4–6", "Deep Learning", "Neural nets, CV & NLP",
      "Master deep learning with PyTorch/TensorFlow across vision and language.",
      ["TensorFlow Developer (optional)"],
      [
        mo(4, "Neural Networks",
          ["PyTorch/TensorFlow basics", "Backprop, activations, optimizers", "Training loops & regularization"],
          ["Build an MLP on MNIST", "Track training curves", "Fix overfitting"],
          "Digit classifier with training report"),
        mo(5, "Computer Vision",
          ["CNNs & convolutions", "Transfer learning", "Data augmentation"],
          ["Fine-tune a pretrained ResNet", "Build an image pipeline", "Evaluate on a custom dataset"],
          "Image classification app"),
        mo(6, "NLP & Transformers",
          ["Embeddings & tokenization", "Attention & transformers", "Hugging Face Transformers"],
          ["Fine-tune a transformer", "Build a text classifier", "Analyze errors"],
          "Sentiment / text-classification model"),
      ]),
    ph("p3", "Months 7–9", "LLMs & MLOps", "RAG, fine-tuning & serving",
      "Work with large language models and learn to ship models reliably.",
      ["Azure AI-102 or AWS ML (optional)"],
      [
        mo(7, "LLMs & RAG",
          ["Prompting & context windows", "Embeddings & vector databases", "LangChain / orchestration"],
          ["Build a RAG chatbot over your docs", "Add citations & guardrails", "Evaluate answer quality"],
          "Retrieval-augmented chatbot"),
        mo(8, "Fine-tuning & Evaluation",
          ["LoRA / PEFT fine-tuning", "Evaluation & benchmarks", "Safety & guardrails"],
          ["Fine-tune a small LLM", "Build an eval harness", "Compare base vs tuned"],
          "Fine-tuned model + evaluation report"),
        mo(9, "MLOps",
          ["Experiment tracking (MLflow/W&B)", "Docker + FastAPI serving", "CI/CD for ML"],
          ["Containerize a model API", "Add tracking & versioning", "Automate deploy"],
          "Deployed inference API with tracking"),
      ]),
    ph("p4", "Months 10–12", "Production AI & Capstone", "Scale, safety & portfolio",
      "Serve AI at scale responsibly and prove it with a capstone.",
      ["🤖 AI Engineer job-ready"],
      [
        mo(10, "Scaling & Serving",
          ["GPU inference, batching, vLLM", "Monitoring & cost control", "Caching & latency"],
          ["Build scalable serving", "Add monitoring & alerts", "Load-test the service"],
          "Monitored, scalable model service"),
        mo(11, "Data & Responsible AI",
          ["Data & feature pipelines", "Bias, fairness & safety", "Feature stores"],
          ["Build a data pipeline", "Run a bias/safety review", "Document model card"],
          "End-to-end pipeline + model card"),
        mo(12, "Capstone & Interview",
          ["System design for ML", "Portfolio storytelling", "ML interview prep"],
          ["Ship a full AI product", "Write architecture + README", "Practice ML interviews"],
          "Capstone AI product + portfolio"),
      ]),
  ],
  milestones: [
    ms("3 Months", "Foundations", "🌱", "ML Aware", "ML foundations locked in",
      ["Python + pandas fluency", "Math for ML understood", "3 classic-ML models trained", "EDA + ML notebooks on GitHub"]),
    ms("6 Months", "Deep Learning", "🧠", "Junior ML Engineer", "Deep learning across CV & NLP",
      ["Neural nets in PyTorch/TF", "CV transfer-learning app", "NLP transformer model", "2+ DL projects"]),
    ms("9 Months", "LLM + MLOps", "🚀", "AI Engineer", "LLMs shipped reliably",
      ["RAG chatbot built", "Fine-tuned & evaluated a model", "Model served via API", "MLOps basics mastered"]),
    ms("12 Months", "Production", "🤖", "AI Engineer", "Production AI + capstone",
      ["Scalable, monitored serving", "Responsible-AI review done", "Capstone product shipped", "Interviewing for AI roles"]),
  ],
  resources: [
    rs("📚", "Courses", ["DeepLearning.AI", "fast.ai", "Andrew Ng ML", "Hugging Face course"]),
    rs("🧪", "Practice", ["Kaggle", "Google Colab", "Papers with Code", "Hugging Face Hub"]),
    rs("🛠️", "Tools", ["PyTorch / TensorFlow", "scikit-learn", "LangChain / LlamaIndex", "MLflow / W&B"]),
    rs("🧠", "LLMs", ["OpenAI / Azure OpenAI", "Ollama (local)", "Vector DBs (pgvector/Pinecone)", "Prompt engineering guide"]),
    rs("📖", "Theory", ["3Blue1Brown (math)", "Deep Learning book", "Distill.pub", "arXiv"]),
    rs("🚀", "MLOps", ["Docker", "FastAPI", "MLOps Zoomcamp", "Made With ML"]),
  ],
};

/* ===================== DEVOPS ENGINEER ===================== */
const DEVOPS_ENGINEER = {
  phases: [
    ph("p1", "Months 1–3", "Foundations", "Linux, networking & code",
      "Master the fundamentals every DevOps engineer relies on daily.",
      ["Linux Essentials (optional)"],
      [
        mo(1, "Linux & Shell",
          ["Linux filesystem & permissions", "Bash scripting", "Processes, systemd, cron"],
          ["Automate tasks with Bash", "Manage services & logs", "Write a backup script"],
          "Bash automation toolkit repo"),
        mo(2, "Networking & Git",
          ["TCP/IP, DNS, HTTP, TLS", "Load balancing & proxies", "Git branching & PRs"],
          ["Diagnose with curl/dig/netstat", "Set up nginx reverse proxy", "Practice Git workflows"],
          "Networking lab notes + nginx config"),
        mo(3, "Programming & IaC intro",
          ["Python or Go basics", "YAML & config", "Infrastructure as Code concepts"],
          ["Write a CLI tool", "Parse & template configs", "Provision a VM by script"],
          "Small automation CLI + provisioning script"),
      ]),
    ph("p2", "Months 4–6", "Containers & CI/CD", "Docker, pipelines, Kubernetes",
      "Package, automate, and orchestrate applications.",
      ["Docker / GitHub Actions"],
      [
        mo(4, "Docker",
          ["Images, layers, registries", "Multi-stage builds", "Docker Compose"],
          ["Containerize an app", "Optimize image size", "Compose a multi-service stack"],
          "Dockerized multi-service app"),
        mo(5, "CI/CD",
          ["Pipelines & stages", "GitHub Actions / GitLab CI", "Testing & artifacts"],
          ["Build a build→test→deploy pipeline", "Add caching & secrets", "Publish artifacts"],
          "End-to-end CI/CD pipeline"),
        mo(6, "Kubernetes",
          ["Pods, deployments, services", "ConfigMaps, secrets, ingress", "Helm basics"],
          ["Deploy to a local cluster", "Expose via ingress", "Package with Helm"],
          "App deployed on Kubernetes + Helm chart"),
      ]),
    ph("p3", "Months 7–9", "Cloud & IaC", "Terraform, cloud, config mgmt",
      "Provision and manage cloud infrastructure as code.",
      ["Terraform Associate", "AWS/Azure Associate"],
      [
        mo(7, "Cloud Core",
          ["Compute, storage, networking", "IAM & security", "Managed Kubernetes (EKS/AKS/GKE)"],
          ["Deploy to managed K8s", "Set up IAM roles", "Configure cloud networking"],
          "Cloud-hosted app with least-privilege IAM"),
        mo(8, "Terraform",
          ["HCL, providers, state", "Modules & workspaces", "Remote state & plan/apply"],
          ["Provision infra with Terraform", "Build reusable modules", "Manage remote state"],
          "Terraform module repo"),
        mo(9, "Config Mgmt & GitOps",
          ["Ansible", "Helm advanced", "GitOps (Argo CD / Flux)"],
          ["Configure servers with Ansible", "Set up GitOps deploys", "Automate rollouts"],
          "GitOps-driven deployment"),
      ]),
    ph("p4", "Months 10–12", "SRE & Capstone", "Observability, security, platform",
      "Operate reliable systems and prove it with a platform capstone.",
      ["⚙️ DevOps Engineer job-ready", "CKA (optional)"],
      [
        mo(10, "Observability",
          ["Prometheus & Grafana", "Centralized logging (Loki/ELK)", "Alerting & SLOs"],
          ["Instrument metrics & dashboards", "Ship logs centrally", "Define SLOs + alerts"],
          "Full observability stack"),
        mo(11, "DevSecOps & Reliability",
          ["Secrets management (Vault)", "Scanning & policy-as-code", "Incident response & chaos"],
          ["Add security scanning to CI", "Manage secrets securely", "Run a failure drill"],
          "Hardened, secure pipeline + runbook"),
        mo(12, "Capstone & Interview",
          ["Platform architecture", "Cost & scaling", "DevOps interview prep"],
          ["Build an internal platform", "Document architecture", "Practice interviews"],
          "Capstone platform + portfolio"),
      ]),
  ],
  milestones: [
    ms("3 Months", "Foundations", "🌱", "DevOps Aware", "Linux, networking & scripting",
      ["Bash automation fluency", "Networking & Git mastered", "First IaC scripts", "Automation repo live"]),
    ms("6 Months", "Containers", "📦", "Junior DevOps", "Docker, CI/CD & Kubernetes",
      ["Apps containerized", "CI/CD pipeline shipped", "K8s deployment + Helm", "2+ projects"]),
    ms("9 Months", "Cloud & IaC", "☁️", "DevOps Engineer", "Cloud infra as code",
      ["Terraform modules", "Managed K8s in cloud", "GitOps deploys", "Config mgmt with Ansible"]),
    ms("12 Months", "SRE", "⚙️", "DevOps Engineer", "Reliable platform + capstone",
      ["Observability stack", "DevSecOps pipeline", "Capstone platform", "Interviewing for DevOps roles"]),
  ],
  resources: [
    rs("📚", "Learn", ["KodeKloud", "DevOps Roadmap (roadmap.sh)", "Linux Journey", "The Twelve-Factor App"]),
    rs("🧪", "Practice", ["Play with Docker", "Katacoda/killercoda", "AWS/Azure free tier", "GitHub Actions"]),
    rs("🛠️", "Tools", ["Docker & Kubernetes", "Terraform", "Ansible", "Argo CD / Helm"]),
    rs("📈", "Observability", ["Prometheus", "Grafana", "Loki / ELK", "OpenTelemetry"]),
    rs("🔐", "Security", ["HashiCorp Vault", "Trivy / Snyk", "OPA / policy-as-code", "OWASP"]),
    rs("🎓", "Certs", ["CKA / CKAD", "Terraform Associate", "AWS DevOps Pro", "Azure DevOps"]),
  ],
};

/* ===================== DATA ENGINEER ===================== */
const DATA_ENGINEER = {
  phases: [
    ph("p1", "Months 1–3", "Foundations", "SQL, Python & modeling",
      "Build the querying, programming, and modeling core of data engineering.",
      ["(optional) SQL / Python cert"],
      [
        mo(1, "SQL Mastery",
          ["Joins, aggregation, window functions", "Query optimization & indexes", "Schema design"],
          ["Solve advanced SQL problems", "Optimize slow queries", "Design a normalized schema"],
          "SQL query portfolio"),
        mo(2, "Python for Data",
          ["pandas & data wrangling", "APIs & file formats (CSV/JSON/Parquet)", "Automation & scheduling"],
          ["Build an ingestion script", "Clean & transform data", "Schedule a job"],
          "Python ETL script"),
        mo(3, "Data Modeling & Warehousing",
          ["OLTP vs OLAP", "Star/snowflake schemas", "Dimensional modeling"],
          ["Model a data warehouse", "Design fact/dim tables", "Document the model"],
          "Dimensional model + docs"),
      ]),
    ph("p2", "Months 4–6", "Pipelines & Big Data", "Airflow, Spark, warehouse",
      "Move and process data at scale with modern tooling.",
      ["Cloud data cert (DP-203/GCP/AWS)"],
      [
        mo(4, "ETL/ELT & Orchestration",
          ["Batch pipelines", "Apache Airflow DAGs", "Idempotency & retries"],
          ["Build an Airflow DAG", "Orchestrate a pipeline", "Handle failures"],
          "Orchestrated ETL pipeline"),
        mo(5, "Apache Spark",
          ["Spark architecture & RDD/DataFrame", "Transformations & actions", "Partitioning & performance"],
          ["Process big data with Spark", "Tune a slow job", "Write to a warehouse"],
          "Spark batch job"),
        mo(6, "Cloud Data Warehouse",
          ["BigQuery / Snowflake / Redshift", "Loading & partitioning", "Cost & performance"],
          ["Load data into a warehouse", "Partition & cluster tables", "Optimize query cost"],
          "Warehouse with optimized tables"),
      ]),
    ph("p3", "Months 7–9", "Streaming & Lakehouse", "Kafka, dbt, lakehouse",
      "Handle real-time data and modern transformation workflows.",
      ["dbt / streaming (optional)"],
      [
        mo(7, "Streaming",
          ["Kafka topics & partitions", "Producers/consumers", "Stream processing"],
          ["Build a streaming pipeline", "Process events in real time", "Handle backpressure"],
          "Real-time streaming pipeline"),
        mo(8, "dbt & Transformations",
          ["dbt models & tests", "Incremental models", "Documentation & lineage"],
          ["Build dbt models", "Add tests & docs", "Set up CI for dbt"],
          "dbt project with tests"),
        mo(9, "Data Lake / Lakehouse",
          ["Data lake vs lakehouse", "Delta / Iceberg", "Medallion architecture"],
          ["Build a lakehouse layer", "Implement bronze/silver/gold", "Query the lake"],
          "Lakehouse pipeline"),
      ]),
    ph("p4", "Months 10–12", "Scale & Capstone", "Governance, quality, portfolio",
      "Operate trustworthy data platforms and ship a capstone.",
      ["🗄️ Data Engineer job-ready"],
      [
        mo(10, "Performance & Cost",
          ["Partitioning & bucketing", "Caching & materialization", "Cost optimization"],
          ["Tune pipeline performance", "Cut warehouse cost", "Benchmark improvements"],
          "Performance + cost report"),
        mo(11, "Quality & Governance",
          ["Data quality & tests", "Governance & lineage", "CI/CD for data"],
          ["Add data quality checks", "Track lineage", "Automate deployments"],
          "Governed, tested pipeline"),
        mo(12, "Capstone & Interview",
          ["End-to-end architecture", "Data system design", "DE interview prep"],
          ["Build an end-to-end platform", "Document architecture", "Practice interviews"],
          "Capstone data platform + portfolio"),
      ]),
  ],
  milestones: [
    ms("3 Months", "Foundations", "🌱", "Data Aware", "SQL, Python & modeling",
      ["Advanced SQL fluency", "Python ETL scripting", "Dimensional modeling", "SQL portfolio live"]),
    ms("6 Months", "Pipelines", "🔧", "Junior Data Engineer", "Airflow, Spark & warehouse",
      ["Airflow pipelines", "Spark batch jobs", "Cloud warehouse loaded", "2+ projects"]),
    ms("9 Months", "Streaming", "🌊", "Data Engineer", "Real-time & lakehouse",
      ["Kafka streaming pipeline", "dbt models + tests", "Lakehouse architecture", "Orchestration mastered"]),
    ms("12 Months", "Scale", "🗄️", "Data Engineer", "Governed platform + capstone",
      ["Performance & cost tuned", "Data quality + governance", "Capstone platform", "Interviewing for DE roles"]),
  ],
  resources: [
    rs("📚", "Learn", ["Data Engineering Zoomcamp", "roadmap.sh/data-engineer", "Designing Data-Intensive Apps", "Mode SQL tutorial"]),
    rs("🧪", "Practice", ["Kaggle datasets", "dbt Learn", "Databricks Community", "LeetCode SQL"]),
    rs("🛠️", "Tools", ["Airflow", "Apache Spark", "dbt", "Kafka"]),
    rs("🏢", "Warehouses", ["BigQuery", "Snowflake", "Redshift", "Databricks / Delta"]),
    rs("🔎", "Quality", ["Great Expectations", "dbt tests", "OpenLineage", "Data contracts"]),
    rs("🎓", "Certs", ["Azure DP-203", "GCP Data Engineer", "AWS Data Analytics", "Databricks"]),
  ],
};

/* ===================== CYBERSECURITY ENGINEER ===================== */
const CYBER_ENGINEER = {
  phases: [
    ph("p1", "Months 1–3", "Foundations", "Networking, OS & security basics",
      "Build the networking, systems, and security fundamentals of the field.",
      ["CompTIA Security+ (begin)"],
      [
        mo(1, "Networking",
          ["TCP/IP, DNS, HTTP/S", "Firewalls, VPN, ports", "Packet analysis (Wireshark)"],
          ["Analyze traffic in Wireshark", "Map a network", "Configure firewall rules"],
          "Network analysis lab notes"),
        mo(2, "OS & Hardening",
          ["Linux & Windows security", "Users, permissions, logging", "System hardening"],
          ["Harden a Linux server", "Audit accounts & logs", "Apply CIS benchmarks"],
          "Hardening checklist + evidence"),
        mo(3, "Security Fundamentals",
          ["CIA triad & threat models", "Cryptography basics", "Authentication & access control"],
          ["Encrypt/verify with tools", "Model threats for an app", "Set up MFA"],
          "Threat model + crypto lab"),
      ]),
    ph("p2", "Months 4–6", "Threats & AppSec", "Vulnerabilities, OWASP, defense",
      "Understand attacks and secure applications and networks.",
      ["Security+ (pass)"],
      [
        mo(4, "Threats & Vulnerabilities",
          ["Malware, phishing, attacks", "Vulnerability scanning", "CVEs & patching"],
          ["Scan with Nessus/OpenVAS", "Triage vulnerabilities", "Plan remediation"],
          "Vulnerability assessment report"),
        mo(5, "Web App Security",
          ["OWASP Top 10", "Injection, XSS, auth flaws", "Secure coding basics"],
          ["Exploit a deliberately vulnerable app", "Fix the vulnerabilities", "Use Burp Suite"],
          "Web pentest + fixes writeup"),
        mo(6, "Network Defense",
          ["Segmentation & hardening", "IDS/IPS", "Secure architecture"],
          ["Deploy an IDS (Suricata/Snort)", "Segment a lab network", "Detect an attack"],
          "Defended network lab"),
      ]),
    ph("p3", "Months 7–9", "Blue/Red & Cloud", "SIEM, pentest, cloud security",
      "Operate detection tooling and secure cloud environments.",
      ["CySA+ / SC-200 (optional)"],
      [
        mo(7, "SIEM & Monitoring",
          ["Log collection & SIEM", "Detection rules", "Threat hunting"],
          ["Set up a SIEM (Splunk/ELK)", "Write detection rules", "Hunt for threats"],
          "SIEM dashboards + detections"),
        mo(8, "Pentesting Basics",
          ["Recon & enumeration", "Exploitation & privilege escalation", "Reporting"],
          ["Complete guided pentest labs", "Escalate privileges", "Write a pentest report"],
          "Pentest report (lab)"),
        mo(9, "Cloud Security",
          ["Cloud IAM & config", "CSPM & posture", "Secrets & encryption"],
          ["Audit cloud IAM", "Fix misconfigurations", "Enable posture management"],
          "Cloud security audit + fixes"),
      ]),
    ph("p4", "Months 10–12", "IR, GRC & Capstone", "Response, compliance, portfolio",
      "Respond to incidents, understand governance, and ship a capstone.",
      ["🛡️ Cybersecurity Engineer job-ready"],
      [
        mo(10, "Incident Response",
          ["IR lifecycle", "Digital forensics basics", "Containment & recovery"],
          ["Run a tabletop IR exercise", "Analyze an incident", "Write an IR report"],
          "Incident response runbook"),
        mo(11, "GRC & Compliance",
          ["Frameworks (NIST, ISO 27001)", "Risk management", "Policies & audits"],
          ["Map controls to a framework", "Perform a risk assessment", "Draft security policy"],
          "Risk assessment + policy set"),
        mo(12, "Capstone & Interview",
          ["Secure architecture", "Blue/red teaming", "Security interview prep"],
          ["Build a secured lab environment", "Document defenses", "Practice interviews"],
          "Capstone secure lab + portfolio"),
      ]),
  ],
  milestones: [
    ms("3 Months", "Foundations", "🌱", "Security Aware", "Networking, OS & basics",
      ["Traffic analysis skills", "Hardened systems", "Threat modeling", "Security+ prep underway"]),
    ms("6 Months", "AppSec", "🐛", "Junior Security Eng", "Threats, OWASP & defense",
      ["🎓 Security+ passed", "Vulnerability assessment", "Web pentest + fixes", "Network defense lab"]),
    ms("9 Months", "Blue/Red", "🔍", "Cybersecurity Engineer", "SIEM, pentest & cloud",
      ["SIEM detections built", "Pentest report (lab)", "Cloud security audit", "Threat hunting"]),
    ms("12 Months", "IR & GRC", "🛡️", "Cybersecurity Engineer", "Response + capstone",
      ["IR runbook + forensics", "Risk assessment + policy", "Capstone secure lab", "Interviewing for security roles"]),
  ],
  resources: [
    rs("📚", "Learn", ["TryHackMe", "Hack The Box Academy", "Professor Messer (Security+)", "roadmap.sh/cyber-security"]),
    rs("🧪", "Practice", ["TryHackMe rooms", "HTB labs", "OverTheWire", "PortSwigger Web Security"]),
    rs("🛠️", "Tools", ["Wireshark", "Burp Suite", "Nmap", "Metasploit"]),
    rs("📈", "Blue Team", ["Splunk / ELK", "Suricata / Snort", "Sigma rules", "MITRE ATT&CK"]),
    rs("☁️", "Cloud", ["Prowler / ScoutSuite", "CIS Benchmarks", "Cloud IAM", "SC-200 / CySA+"]),
    rs("🎓", "Certs", ["CompTIA Security+", "CySA+", "OSCP (later)", "Azure SC-200"]),
  ],
};

/* ===================== BACKEND ENGINEER ===================== */
const BACKEND_ENGINEER = {
  phases: [
    ph("p1", "Months 1–3", "Foundations", "Language, DS&A, SQL",
      "Build strong programming, algorithm, and database fundamentals.",
      ["(optional) language cert"],
      [
        mo(1, "Language & DS&A",
          ["Pick a language (Node/Python/Go)", "Data structures & algorithms", "Git & testing"],
          ["Solve DS&A problems", "Write unit tests", "Use Git workflows"],
          "DS&A practice repo"),
        mo(2, "Databases & SQL",
          ["Relational modeling", "SQL & indexes", "Transactions & ACID"],
          ["Design a schema", "Write complex queries", "Add indexes & measure"],
          "Database schema + queries"),
        mo(3, "HTTP & REST APIs",
          ["HTTP, status codes, REST", "Request/response lifecycle", "JSON & validation"],
          ["Build a small REST API", "Add input validation", "Write API tests"],
          "First REST API"),
      ]),
    ph("p2", "Months 4–6", "APIs & Data", "Auth, databases, caching",
      "Build robust, secure APIs backed by real data stores.",
      ["(optional) cloud associate"],
      [
        mo(4, "Production APIs",
          ["Auth (JWT/OAuth)", "Error handling & logging", "OpenAPI docs"],
          ["Add authentication", "Document with OpenAPI", "Handle errors gracefully"],
          "Authenticated documented API"),
        mo(5, "Databases Deep",
          ["Advanced indexing & query plans", "NoSQL (MongoDB/Redis)", "Migrations"],
          ["Optimize queries", "Add a NoSQL store", "Run migrations"],
          "Optimized data layer"),
        mo(6, "Caching & Queues",
          ["Redis caching", "Message queues (RabbitMQ/Kafka)", "Async processing"],
          ["Add caching", "Process jobs via a queue", "Measure latency gains"],
          "Cached + queue-backed service"),
      ]),
    ph("p3", "Months 7–9", "Architecture & Cloud", "System design, microservices, deploy",
      "Design scalable services and deploy them to the cloud.",
      ["Cloud associate (optional)"],
      [
        mo(7, "System Design",
          ["Scalability & load balancing", "Caching & CDNs", "Consistency & CAP"],
          ["Design a scalable system", "Diagram the architecture", "Justify trade-offs"],
          "System design doc"),
        mo(8, "Microservices & Docker",
          ["Service boundaries", "Docker & Compose", "Inter-service comms"],
          ["Split a monolith", "Containerize services", "Add service-to-service calls"],
          "Microservices sample"),
        mo(9, "Cloud Deploy & CI/CD",
          ["Cloud compute & managed DBs", "CI/CD pipelines", "Secrets & config"],
          ["Deploy to the cloud", "Automate deploys", "Manage secrets"],
          "Deployed service with CI/CD"),
      ]),
    ph("p4", "Months 10–12", "Scale & Capstone", "Reliability, testing, portfolio",
      "Operate reliable backends and ship a capstone.",
      ["🧩 Backend Engineer job-ready"],
      [
        mo(10, "Scaling & Reliability",
          ["Horizontal scaling", "Load balancing & rate limiting", "Event-driven patterns"],
          ["Scale the service", "Add rate limiting", "Introduce async events"],
          "Scaled, resilient backend"),
        mo(11, "Testing & Observability",
          ["Testing pyramid", "Security (OWASP API)", "Metrics, logs, tracing"],
          ["Add integration tests", "Harden the API", "Instrument observability"],
          "Tested, observable service"),
        mo(12, "Capstone & Interview",
          ["End-to-end product", "System-design interviews", "Portfolio"],
          ["Build a full backend product", "Document architecture", "Practice interviews"],
          "Capstone backend + portfolio"),
      ]),
  ],
  milestones: [
    ms("3 Months", "Foundations", "🌱", "Backend Aware", "Language, DS&A & SQL",
      ["DS&A practice", "Database modeling", "First REST API", "Testing basics"]),
    ms("6 Months", "APIs", "🔌", "Junior Backend Eng", "Auth, data & caching",
      ["Authenticated API", "Optimized data layer", "Caching + queues", "2+ projects"]),
    ms("9 Months", "Architecture", "🏗️", "Backend Engineer", "System design & cloud",
      ["System design doc", "Microservices sample", "Cloud deploy + CI/CD", "Docker mastered"]),
    ms("12 Months", "Scale", "🧩", "Backend Engineer", "Reliable backend + capstone",
      ["Scaled resilient service", "Tested & observable", "Capstone product", "Interviewing for backend roles"]),
  ],
  resources: [
    rs("📚", "Learn", ["roadmap.sh/backend", "The Odin Project", "MDN / HTTP docs", "System Design Primer"]),
    rs("🧪", "Practice", ["LeetCode", "Exercism", "Build APIs", "Postman"]),
    rs("🛠️", "Tools", ["Node/Express, FastAPI or Go", "PostgreSQL", "Redis", "Docker"]),
    rs("🏗️", "Design", ["System Design Primer", "ByteByteGo", "Designing Data-Intensive Apps", "OpenAPI"]),
    rs("☁️", "Cloud", ["AWS/Azure/GCP free tier", "GitHub Actions", "Render / Fly.io", "Kubernetes (later)"]),
    rs("🔐", "Security", ["OWASP API Top 10", "JWT / OAuth", "Rate limiting", "Secrets management"]),
  ],
};

/* ===================== CLOUD ARCHITECT — AWS variant ===================== */
const CLOUD_ARCHITECT_AWS = {
  phases: [
    ph("p1", "Months 1–3", "Foundations & Core", "AWS core, IAM & networking",
      "Build AWS fundamentals and turn your background into cloud thinking.",
      ["AWS Cloud Practitioner (CLF-C02)"],
      [
        mo(1, "Cloud, Linux & Networking",
          ["Cloud concepts, Regions & AZs", "AWS accounts & billing", "TCP/IP, DNS, Linux CLI"],
          ["Create an account + billing alarms", "Launch EC2 & host on S3", "Build a VPC with subnets"],
          "GitHub 'aws-labs' repo started"),
        mo(2, "Identity & Governance",
          ["IAM users/roles/policies", "AWS Organizations & SCPs", "Tags, Config, CloudTrail"],
          ["Least-privilege IAM", "Multi-account structure", "Enable CloudTrail + Config"],
          "IAM + governance lab"),
        mo(3, "Compute, Storage & App Hosting",
          ["EC2, Lambda, ECS/EKS", "S3, EBS, EFS", "RDS, DynamoDB"],
          ["Deploy same app 3 ways", "Compare cost & ops", "Write an ADR"],
          "ADR-001: Selecting an AWS compute platform"),
      ]),
    ph("p2", "Months 4–6", "Networking, Reliability & SAA", "VPC, DR & Associate cert",
      "Design networks, add resilience, and pass the Associate exam.",
      ["AWS Solutions Architect – Associate (SAA-C03)"],
      [
        mo(4, "Networking Deep Dive",
          ["VPC, subnets, route tables", "ALB/NLB, Route 53, CloudFront", "VPN, Transit Gateway, PrivateLink"],
          ["Build multi-tier VPC", "Add ALB + Route 53", "Private endpoints + logging"],
          "Capstone 1: secure multi-tier network"),
        mo(5, "Monitoring, Backup & DR",
          ["CloudWatch, X-Ray", "Backup & snapshots", "Multi-AZ, RTO/RPO"],
          ["Add metrics & alarms", "Automate backups", "Test failover"],
          "DR runbook"),
        mo(6, "SAA Consolidation",
          ["Full SAA-C03 domains", "Well-Architected basics", "Practice exams"],
          ["Rebuild labs via CLI + IaC", "Break/fix scenarios", "Score 85%+ on practice"],
          "🎓 Pass SAA-C03"),
      ]),
    ph("p3", "Months 7–9", "Automation & Security", "IaC, CI/CD & security",
      "Codify infrastructure, automate delivery, and harden security.",
      ["AWS SysOps / Developer (optional)"],
      [
        mo(7, "Infrastructure as Code",
          ["Terraform + CloudFormation", "Modules & remote state", "Validation & plan"],
          ["Rebuild network in Terraform", "Create reusable modules", "Manage remote state"],
          "IaC repo"),
        mo(8, "CI/CD & Automation",
          ["CodePipeline / GitHub Actions", "Environments & approvals", "OIDC & secrets"],
          ["Build a deploy pipeline", "Add approvals + tests", "Use OIDC (no static keys)"],
          "CI/CD pipeline"),
        mo(9, "Security & Governance",
          ["IAM deep dive, KMS", "GuardDuty, Security Hub", "Config rules & policy"],
          ["Harden with private endpoints", "Enable threat detection", "Add security policies"],
          "Threat model + hardened env"),
      ]),
    ph("p4", "Months 10–12", "Enterprise & Professional", "Landing zone, FinOps & Pro",
      "Design enterprise architectures and target the Professional cert.",
      ["AWS Solutions Architect – Professional (SAP-C02)"],
      [
        mo(10, "Landing Zone & FinOps",
          ["Control Tower & Organizations", "Multi-account landing zone", "Cost management & FinOps"],
          ["Design a landing zone", "Set budgets & alerts", "Optimize cost"],
          "Capstone 2: enterprise landing zone"),
        mo(11, "SAP & Architecture",
          ["Well-Architected pillars", "Advanced patterns & DR", "Case-study practice"],
          ["Solve SAP case studies", "Design + alternatives", "Trade-off analysis"],
          "🎓 Pass SAP-C02"),
        mo(12, "Capstone & Interview",
          ["Production architecture", "Progressive scale design", "Architect interview prep"],
          ["Build a production capstone", "Full portfolio package", "Practice interviews"],
          "Capstone + portfolio"),
      ]),
  ],
  milestones: [
    ms("3 Months", "Foundation", "🌱", "AWS Aware", "Fundamentals & governance",
      ["CLF-C02 (optional) + repo", "IAM & Organizations", "VPC + compute labs", "ADR-001 written"]),
    ms("6 Months", "SAA", "⚙️", "AWS Associate", "Associate certified",
      ["🎓 SAA-C03 passed", "Multi-tier network capstone", "Monitoring + DR", "IaC basics"]),
    ms("9 Months", "Automation", "🚀", "Cloud/DevOps Engineer", "Automated & secured",
      ["Terraform IaC repo", "CI/CD with OIDC", "Security hardening", "Threat model"]),
    ms("12 Months", "Professional", "🏛️", "AWS Solutions Architect", "Professional + capstone",
      ["🎓 SAP-C02 passed", "Enterprise landing zone", "Production capstone", "Interviewing for architect roles"]),
  ],
  resources: [
    rs("📚", "Learn", ["AWS Skill Builder", "Adrian Cantrill", "AWS Well-Architected", "AWS Docs"]),
    rs("🧪", "Practice", ["AWS free tier", "Tutorials Dojo", "Well-Architected Labs", "Workshops.aws"]),
    rs("🧱", "IaC & DevOps", ["Terraform", "CloudFormation/CDK", "GitHub Actions", "CodePipeline"]),
    rs("🔐", "Security", ["IAM & KMS", "GuardDuty", "Security Hub", "AWS Config"]),
    rs("💰", "Cost", ["Cost Explorer", "Budgets", "Compute Optimizer", "FinOps Framework"]),
    rs("🎓", "Certs", ["CLF-C02", "SAA-C03", "SAP-C02", "Specialty exams"]),
  ],
};

/* ===================== Registry + switcher ===================== */
const ROADMAPS = {
  "cloud-architect": {
    variants: { Azure: ROADMAP_CLOUD_ARCHITECT_AZURE, AWS: CLOUD_ARCHITECT_AWS },
    default: "Azure",
  },
  "ai-engineer": AI_ENGINEER,
  "devops-engineer": DEVOPS_ENGINEER,
  "data-engineer": DATA_ENGINEER,
  "cybersecurity-engineer": CYBER_ENGINEER,
  "backend-engineer": BACKEND_ENGINEER,
};

const LEGACY_TASK_KEY_ORDER = Object.freeze({
  "cloud-architect:Azure": Object.freeze({
    p1: "p1-m1-study|p1-m1-lab-93ad0627|p1-m1-lab-7bf07d46|p1-m1-lab-1e73eac1|p1-m1-lab-d821dd14|p1-m1-lab-89c95a52|p1-m1-lab-8e7637bb|p1-m1-deliverable|p1-m2-study|p1-m2-lab-75d5a986|p1-m2-lab-382fbd0c|p1-m2-lab-c1cd1797|p1-m2-lab-c0dfa56e|p1-m2-lab-7d785bdf|p1-m2-lab-38e422ae|p1-m2-deliverable|p1-m3-study|p1-m3-lab-c503f12b|p1-m3-lab-539611aa|p1-m3-deliverable".split("|"),
    p2: "p2-m4-study|p2-m4-lab-50b66cd4|p2-m4-lab-d149dc50|p2-m4-lab-7b7ce728|p2-m4-lab-4e7f1e62|p2-m4-deliverable|p2-m5-study|p2-m5-lab-a3934b83|p2-m5-lab-7ab8154e|p2-m5-lab-4a70990a|p2-m5-lab-d9c27d5c|p2-m5-deliverable|p2-m6-study|p2-m6-lab-222451c8|p2-m6-lab-b6eb55b2|p2-m6-lab-b230751c|p2-m6-deliverable".split("|"),
    p3: "p3-m7-study|p3-m7-lab-58670e0f|p3-m7-lab-06267ab2|p3-m7-lab-0b22adaf|p3-m7-deliverable|p3-m8-study|p3-m8-lab-e66583b5|p3-m8-lab-f8e888f7|p3-m8-deliverable|p3-m9-study|p3-m9-lab-20d06bfe|p3-m9-lab-0f946f01|p3-m9-lab-f63b4b82|p3-m9-deliverable".split("|"),
    p4: "p4-m10-study|p4-m10-lab-13cdcb1d|p4-m10-lab-564a94c0|p4-m10-lab-396ea4d9|p4-m10-lab-a778d4e6|p4-m10-deliverable|p4-m11-study|p4-m11-lab-403507d2|p4-m11-lab-afe7369a|p4-m11-deliverable|p4-m12-study|p4-m12-lab-c06db04f|p4-m12-lab-12b3efdc|p4-m12-lab-c547dad9|p4-m12-lab-6f3e9fcc|p4-m12-deliverable".split("|"),
  }),
  "cloud-architect:AWS": Object.freeze({
    p1: "p1-m1-study|p1-m1-lab-3b7736cd|p1-m1-lab-c66460b1|p1-m1-lab-06a80483|p1-m1-deliverable|p1-m2-study|p1-m2-lab-7cf1eb31|p1-m2-lab-670647b1|p1-m2-lab-91de55fa|p1-m2-deliverable|p1-m3-study|p1-m3-lab-6d4fa802|p1-m3-lab-e7db5b13|p1-m3-lab-abd512f2|p1-m3-deliverable".split("|"),
    p2: "p2-m4-study|p2-m4-lab-028365be|p2-m4-lab-b0fe304f|p2-m4-lab-e958ec7e|p2-m4-deliverable|p2-m5-study|p2-m5-lab-cd350153|p2-m5-lab-3c96c870|p2-m5-lab-1d8a1979|p2-m5-deliverable|p2-m6-study|p2-m6-lab-895850e0|p2-m6-lab-7d492f13|p2-m6-lab-6c57e62e|p2-m6-deliverable".split("|"),
    p3: "p3-m7-study|p3-m7-lab-267f7d61|p3-m7-lab-85e8a16b|p3-m7-lab-35b4368d|p3-m7-deliverable|p3-m8-study|p3-m8-lab-18a8417f|p3-m8-lab-e3528660|p3-m8-lab-39b84bd3|p3-m8-deliverable|p3-m9-study|p3-m9-lab-3e45e524|p3-m9-lab-a4366865|p3-m9-lab-ac0d1fe4|p3-m9-deliverable".split("|"),
    p4: "p4-m10-study|p4-m10-lab-af0b8377|p4-m10-lab-36beae42|p4-m10-lab-b141aa7b|p4-m10-deliverable|p4-m11-study|p4-m11-lab-c64cdfe5|p4-m11-lab-9263c53e|p4-m11-lab-930e34f5|p4-m11-deliverable|p4-m12-study|p4-m12-lab-807f0abc|p4-m12-lab-89fda38c|p4-m12-lab-803d22e0|p4-m12-deliverable".split("|"),
  }),
  "ai-engineer": Object.freeze({
    p1: "p1-m1-study|p1-m1-lab-905c8301|p1-m1-lab-ef6e7a58|p1-m1-lab-e62f5d85|p1-m1-deliverable|p1-m2-study|p1-m2-lab-2fdca65e|p1-m2-lab-c61b5242|p1-m2-lab-445bf0aa|p1-m2-deliverable|p1-m3-study|p1-m3-lab-c519f145|p1-m3-lab-55889e21|p1-m3-lab-c6d3b031|p1-m3-deliverable".split("|"),
    p2: "p2-m4-study|p2-m4-lab-5c3a1d83|p2-m4-lab-0b211a4e|p2-m4-lab-706eb599|p2-m4-deliverable|p2-m5-study|p2-m5-lab-39dc0d5c|p2-m5-lab-7b2f790f|p2-m5-lab-88c7482b|p2-m5-deliverable|p2-m6-study|p2-m6-lab-32bf1d26|p2-m6-lab-bfc6f64c|p2-m6-lab-0c3db33a|p2-m6-deliverable".split("|"),
    p3: "p3-m7-study|p3-m7-lab-84be325f|p3-m7-lab-2ed706ce|p3-m7-lab-1a1604a9|p3-m7-deliverable|p3-m8-study|p3-m8-lab-7251abc1|p3-m8-lab-03804414|p3-m8-lab-6ad0b812|p3-m8-deliverable|p3-m9-study|p3-m9-lab-7be4ae24|p3-m9-lab-68146e4d|p3-m9-lab-c4e2d52a|p3-m9-deliverable".split("|"),
    p4: "p4-m10-study|p4-m10-lab-9d544c26|p4-m10-lab-8f5b753b|p4-m10-lab-d6c743d8|p4-m10-deliverable|p4-m11-study|p4-m11-lab-fccfcc7e|p4-m11-lab-4dbc5a47|p4-m11-lab-1d48007d|p4-m11-deliverable|p4-m12-study|p4-m12-lab-d68d90f6|p4-m12-lab-80762b9c|p4-m12-lab-1b1b24a7|p4-m12-deliverable".split("|"),
  }),
  "devops-engineer": Object.freeze({
    p1: "p1-m1-study|p1-m1-lab-52610113|p1-m1-lab-ec21cb47|p1-m1-lab-f9147cca|p1-m1-deliverable|p1-m2-study|p1-m2-lab-33f59586|p1-m2-lab-3ff12c9e|p1-m2-lab-95bcb44a|p1-m2-deliverable|p1-m3-study|p1-m3-lab-ec158bad|p1-m3-lab-4dce049b|p1-m3-lab-b451f110|p1-m3-deliverable".split("|"),
    p2: "p2-m4-study|p2-m4-lab-5f8d29ce|p2-m4-lab-0c3536e4|p2-m4-lab-44ca0f33|p2-m4-deliverable|p2-m5-study|p2-m5-lab-3bade94b|p2-m5-lab-a18227ae|p2-m5-lab-526ad52b|p2-m5-deliverable|p2-m6-study|p2-m6-lab-301dafdd|p2-m6-lab-a227e14a|p2-m6-lab-737afb2b|p2-m6-deliverable".split("|"),
    p3: "p3-m7-study|p3-m7-lab-f1858146|p3-m7-lab-5d390cf0|p3-m7-lab-4eaed5d4|p3-m7-deliverable|p3-m8-study|p3-m8-lab-14a4d8ba|p3-m8-lab-5a648d41|p3-m8-lab-35b4368d|p3-m8-deliverable|p3-m9-study|p3-m9-lab-cd5236e9|p3-m9-lab-1939f2b8|p3-m9-lab-1d94dc3f|p3-m9-deliverable".split("|"),
    p4: "p4-m10-study|p4-m10-lab-b0c7d29c|p4-m10-lab-93d6b46c|p4-m10-lab-764d0ec9|p4-m10-deliverable|p4-m11-study|p4-m11-lab-4b85be9e|p4-m11-lab-68e3eceb|p4-m11-lab-59e76c36|p4-m11-deliverable|p4-m12-study|p4-m12-lab-122c0a36|p4-m12-lab-57c965df|p4-m12-lab-803d22e0|p4-m12-deliverable".split("|"),
  }),
  "data-engineer": Object.freeze({
    p1: "p1-m1-study|p1-m1-lab-71ee022a|p1-m1-lab-18b6c44f|p1-m1-lab-f0255c5c|p1-m1-deliverable|p1-m2-study|p1-m2-lab-09f40fd7|p1-m2-lab-772a2820|p1-m2-lab-27218734|p1-m2-deliverable|p1-m3-study|p1-m3-lab-f2134bac|p1-m3-lab-9b504657|p1-m3-lab-8d193a92|p1-m3-deliverable".split("|"),
    p2: "p2-m4-study|p2-m4-lab-e25e5b62|p2-m4-lab-649432b6|p2-m4-lab-01adb05a|p2-m4-deliverable|p2-m5-study|p2-m5-lab-535837ed|p2-m5-lab-2df1cd2e|p2-m5-lab-6603e8d5|p2-m5-deliverable|p2-m6-study|p2-m6-lab-bf2dad6f|p2-m6-lab-93eec53e|p2-m6-lab-0a388a63|p2-m6-deliverable".split("|"),
    p3: "p3-m7-study|p3-m7-lab-75c14e3e|p3-m7-lab-7f102c83|p3-m7-lab-1b027639|p3-m7-deliverable|p3-m8-study|p3-m8-lab-bb4c1389|p3-m8-lab-26db6b6a|p3-m8-lab-3235ebe1|p3-m8-deliverable|p3-m9-study|p3-m9-lab-1dc38cf8|p3-m9-lab-416d2945|p3-m9-lab-f7538e03|p3-m9-deliverable".split("|"),
    p4: "p4-m10-study|p4-m10-lab-5d6334f5|p4-m10-lab-675988bd|p4-m10-lab-c8d24271|p4-m10-deliverable|p4-m11-study|p4-m11-lab-6117443e|p4-m11-lab-95394159|p4-m11-lab-b914c50b|p4-m11-deliverable|p4-m12-study|p4-m12-lab-e4b5bdde|p4-m12-lab-57c965df|p4-m12-lab-803d22e0|p4-m12-deliverable".split("|"),
  }),
  "cybersecurity-engineer": Object.freeze({
    p1: "p1-m1-study|p1-m1-lab-c32d1a63|p1-m1-lab-3bf4abd0|p1-m1-lab-9af34c96|p1-m1-deliverable|p1-m2-study|p1-m2-lab-30384a61|p1-m2-lab-175895e1|p1-m2-lab-7d576632|p1-m2-deliverable|p1-m3-study|p1-m3-lab-32445851|p1-m3-lab-8958e980|p1-m3-lab-6ca4f452|p1-m3-deliverable".split("|"),
    p2: "p2-m4-study|p2-m4-lab-b2d8520a|p2-m4-lab-57ce6863|p2-m4-lab-aa13a46f|p2-m4-deliverable|p2-m5-study|p2-m5-lab-77dff674|p2-m5-lab-54ac4339|p2-m5-lab-136647cf|p2-m5-deliverable|p2-m6-study|p2-m6-lab-64a3e139|p2-m6-lab-5e6e0e9c|p2-m6-lab-fbb1834b|p2-m6-deliverable".split("|"),
    p3: "p3-m7-study|p3-m7-lab-9ba17050|p3-m7-lab-ccd560c8|p3-m7-lab-6d8d576a|p3-m7-deliverable|p3-m8-study|p3-m8-lab-c6b4d8df|p3-m8-lab-004191b3|p3-m8-lab-e675a126|p3-m8-deliverable|p3-m9-study|p3-m9-lab-fbef0a68|p3-m9-lab-10bec258|p3-m9-lab-c623a6a5|p3-m9-deliverable".split("|"),
    p4: "p4-m10-study|p4-m10-lab-137bbb57|p4-m10-lab-9467fac0|p4-m10-lab-c36544b8|p4-m10-deliverable|p4-m11-study|p4-m11-lab-2eedbec9|p4-m11-lab-f5f92922|p4-m11-lab-1ab9fd88|p4-m11-deliverable|p4-m12-study|p4-m12-lab-1c523735|p4-m12-lab-d7400fc9|p4-m12-lab-803d22e0|p4-m12-deliverable".split("|"),
  }),
  "backend-engineer": Object.freeze({
    p1: "p1-m1-study|p1-m1-lab-1338960c|p1-m1-lab-6539123f|p1-m1-lab-8cfb0b5e|p1-m1-deliverable|p1-m2-study|p1-m2-lab-af179a57|p1-m2-lab-4abebbc8|p1-m2-lab-3d5d9d3e|p1-m2-deliverable|p1-m3-study|p1-m3-lab-af7a9a5f|p1-m3-lab-61d746c3|p1-m3-lab-38fe2a69|p1-m3-deliverable".split("|"),
    p2: "p2-m4-study|p2-m4-lab-5ea55760|p2-m4-lab-c0b77ef4|p2-m4-lab-29c422f2|p2-m4-deliverable|p2-m5-study|p2-m5-lab-4690929e|p2-m5-lab-7d69abb3|p2-m5-lab-ac64b937|p2-m5-deliverable|p2-m6-study|p2-m6-lab-b0e4bda1|p2-m6-lab-2e34fd7e|p2-m6-lab-0486002d|p2-m6-deliverable".split("|"),
    p3: "p3-m7-study|p3-m7-lab-52d86e48|p3-m7-lab-a11ae7b0|p3-m7-lab-1d5f3fee|p3-m7-deliverable|p3-m8-study|p3-m8-lab-8b8556bc|p3-m8-lab-e1efe1e2|p3-m8-lab-ebdcf1b8|p3-m8-deliverable|p3-m9-study|p3-m9-lab-4cb56d25|p3-m9-lab-4a15db1b|p3-m9-lab-59ace853|p3-m9-deliverable".split("|"),
    p4: "p4-m10-study|p4-m10-lab-4ad331f9|p4-m10-lab-dc1598a7|p4-m10-lab-0c9b4757|p4-m10-deliverable|p4-m11-study|p4-m11-lab-aaa7ad4b|p4-m11-lab-74331034|p4-m11-lab-93c9dc75|p4-m11-deliverable|p4-m12-study|p4-m12-lab-d2f33ade|p4-m12-lab-57c965df|p4-m12-lab-803d22e0|p4-m12-deliverable".split("|"),
  }),
});

function legacyTaskIds(templateKey, prefix) {
  const phases = LEGACY_TASK_KEY_ORDER[templateKey] || {};
  return Object.fromEntries(
    Object.entries(phases).flatMap(([phaseId, keys]) =>
      keys.map((key, index) => [key, `${prefix}${phaseId}-${index}`]),
    ),
  );
}

function resolveRoadmap(goalKey, cloud) {
  const resolvedGoal = ROADMAPS[goalKey] ? goalKey : "cloud-architect";
  const entry = ROADMAPS[resolvedGoal];
  const requestedCloud = cloud || entry.default;
  const resolvedCloud = entry.variants && entry.variants[requestedCloud]
    ? requestedCloud
    : entry.default;
  const roadmap = entry.variants ? entry.variants[resolvedCloud] : entry;
  let prefix = "";
  const isAzureArch = resolvedGoal === "cloud-architect" && requestedCloud === "Azure";
  if (!isAzureArch) prefix = resolvedGoal + (entry.variants ? "-" + requestedCloud : "") + ":";
  const templateKey = entry.variants ? `${resolvedGoal}:${resolvedCloud}` : resolvedGoal;
  return {
    careerGoalKey: resolvedGoal,
    cloud: requestedCloud,
    templateId: templateKey,
    phases: roadmap.phases,
    milestones: roadmap.milestones,
    resources: roadmap.resources,
    tracker: buildTracker(roadmap.phases, prefix, legacyTaskIds(templateKey, prefix)),
  };
}

// Swap the active roadmap (mutates PHASES/MILESTONES/RESOURCES/TRACKER from data.js).
function setActiveRoadmap(goalKey, cloud) {
  const roadmap = resolveRoadmap(goalKey, cloud);
  PHASES = roadmap.phases;
  MILESTONES = roadmap.milestones;
  RESOURCES = roadmap.resources;
  TRACKER = roadmap.tracker;
  return { PHASES, MILESTONES, RESOURCES, TRACKER };
}

window.PathRoadmaps = {
  current() {
    return { phases: PHASES, milestones: MILESTONES, resources: RESOURCES, tracker: TRACKER };
  },
  resolve: resolveRoadmap,
};

/* ===================== AI Coach content (interview Qs + project ideas) ===================== */
const COACH_CONTENT = {
  "cloud-architect": {
    interview: [
      "Design a highly available web app across multiple regions — walk me through it.",
      "Hub-and-spoke vs mesh network topology — when would you choose each?",
      "How do you secure traffic between services privately (no public exposure)?",
      "When would you choose PaaS over IaaS, and what are the trade-offs?",
      "How do you approach cost optimization for a large workload?",
      "Explain RTO vs RPO and how you'd meet a 15-minute RPO.",
    ],
    projects: [
      "Design & deploy a multi-region, fault-tolerant web app with IaC.",
      "Build a secure hub-and-spoke network with private endpoints.",
      "Create an enterprise landing zone with governance + FinOps.",
    ],
  },
  "ai-engineer": {
    interview: [
      "Explain the bias-variance trade-off.",
      "How does attention work in a transformer?",
      "Walk through building a retrieval-augmented generation (RAG) system.",
      "How do you evaluate the quality of an LLM's output?",
      "What is overfitting and how do you prevent it?",
      "How would you deploy and monitor a model in production?",
    ],
    projects: [
      "Build a RAG chatbot over a document set with citations.",
      "Fine-tune a small LLM and evaluate it against the base model.",
      "Deploy a monitored image-classification API.",
    ],
  },
  "devops-engineer": {
    interview: [
      "Describe a full CI/CD pipeline you've built end to end.",
      "How does Kubernetes schedule pods onto nodes?",
      "Blue-green vs canary deployments — when to use each?",
      "How do you manage secrets safely in a pipeline?",
      "Explain infrastructure as code and its benefits.",
      "How do you design a system for observability?",
    ],
    projects: [
      "Build a GitOps-driven CI/CD pipeline that deploys to Kubernetes.",
      "Provision a full environment with reusable Terraform modules.",
      "Set up a Prometheus + Grafana observability stack with alerts.",
    ],
  },
  "data-engineer": {
    interview: [
      "Batch vs streaming processing — when would you use each?",
      "Explain star vs snowflake schema.",
      "How does Spark partitioning affect performance?",
      "How do you ensure data quality in a pipeline?",
      "What does idempotency mean in ETL and why does it matter?",
      "How would you design a lakehouse architecture?",
    ],
    projects: [
      "Build an Airflow-orchestrated ETL pipeline into a warehouse.",
      "Create a real-time streaming pipeline with Kafka.",
      "Build a dbt project with tests and data lineage.",
    ],
  },
  "cybersecurity-engineer": {
    interview: [
      "Walk through the OWASP Top 10.",
      "How do you respond to a security incident, step by step?",
      "Explain defense in depth with examples.",
      "How does a SIEM help with threat detection?",
      "What is least privilege and how do you enforce it?",
      "Symmetric vs asymmetric encryption — when to use each?",
    ],
    projects: [
      "Build and defend a lab network with an IDS + SIEM.",
      "Perform a web pentest and write a remediation report.",
      "Run a cloud security audit and fix the misconfigurations.",
    ],
  },
  "backend-engineer": {
    interview: [
      "Design a URL shortener — walk me through the system.",
      "Explain database indexing and when it can hurt performance.",
      "How do you scale a service horizontally?",
      "REST vs gRPC — what are the trade-offs?",
      "How do you prevent race conditions in concurrent requests?",
      "Explain caching strategies and cache invalidation.",
    ],
    projects: [
      "Build a scalable REST API with auth, caching, and a job queue.",
      "Split a monolith into microservices with Docker.",
      "Design and deploy a rate-limited API with full observability.",
    ],
  },
};

function getCoachContent(goalKey) {
  return COACH_CONTENT[goalKey] || COACH_CONTENT["cloud-architect"];
}
