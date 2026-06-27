export const SCENARIOS = [
  {
    id: 'loan',
    title: 'Personal Loan Approval',
    desc: 'Review & approve 80 retail loan applications per day. Each requires income verification and credit scoring.',
    attrs: ['High Risk', 'Regulated', 'Medium Volume'],
    context: [
      'Volume: ~80 applications/day — officers are the bottleneck',
      'Regulated: BOT requires every credit decision to be explainable & auditable',
      "A disputed automated rejection must be justified — a black-box score can't",
      'Income mis-statement & fraud risk on retail loans is real',
    ],
    choices: {
      automate: { eff: 30, acc: -20, risk: 30, comp: -35, breach: true, msg: 'Automated approvals triggered a BOT regulatory audit. Decisions cannot be explained to the regulator — full portfolio review ordered.' },
      hitl: { eff: 15, acc: 25, risk: -10, comp: 20, breach: false, msg: 'AI pre-scores all applications. Officer reviews flagged cases and signs off. Complete audit trail — regulators satisfied.' },
      manual: { eff: -20, acc: 10, risk: -5, comp: 10, breach: false, msg: 'Officers review each case by hand. Backlog reaches 3 days. Customer satisfaction drops significantly.' },
    },
    best: 'hitl',
  },
  {
    id: 'faq',
    title: 'Customer FAQ Responses',
    desc: 'Handle 500+ customer questions daily — account balance, transfer limits, fee inquiries, branch hours.',
    attrs: ['High Volume', 'Low Risk', 'Repetitive'],
    context: [
      'High volume, low risk, very repetitive — prime automation territory',
      "Today's wait time ~4h; slow replies lose customers",
      'Information lookups only — no PDPA-sensitive decisions',
      'Unusual questions still need a human safety net',
    ],
    choices: {
      automate: { eff: 35, acc: 20, risk: 5, comp: 5, breach: false, msg: 'Chatbot resolves 94% of queries instantly. Response time drops from 4h → 30s. Staff freed for complex cases.' },
      hitl: { eff: 15, acc: 20, risk: 0, comp: 5, breach: false, msg: 'Bot handles standard questions, agents review edge cases. Slightly slower but high confidence on unusual queries.' },
      manual: { eff: -30, acc: -15, risk: 0, comp: 0, breach: false, msg: 'Staff overwhelmed — wait time rises to 4 hours. Burnout risk spikes. Dozens of queries go unanswered daily.' },
    },
    best: 'automate',
  },
  {
    id: 'aml',
    title: 'Suspicious Transaction Detection',
    desc: 'Flag and escalate potential money laundering cases from the AML monitoring system for investigation.',
    attrs: ['High Risk', 'Regulated', 'PDPA Sensitive'],
    context: [
      'Regulated: STR filings & account freezes are inspected',
      'PDPA: automated decisions on personal data require human review',
      'Auto-blocking can freeze legitimate accounts — real customer harm',
      'But missing a genuine case is a compliance failure too',
    ],
    choices: {
      automate: { eff: 25, acc: -25, risk: 35, comp: -40, breach: true, msg: 'Auto-blocking froze 23 legitimate accounts. PDPA violation: automated decisions on personal data without human review.' },
      hitl: { eff: 10, acc: 25, risk: -15, comp: 25, breach: false, msg: 'AI flags alerts, compliance officer investigates each case. STR filed correctly. Passed regulator inspection.' },
      manual: { eff: -25, acc: -10, risk: -10, comp: 15, breach: false, msg: '3 suspicious transactions missed due to analyst fatigue. Investigation backlog grows to 2 weeks behind.' },
    },
    best: 'hitl',
  },
  {
    id: 'statement',
    title: 'Monthly Statement Delivery',
    desc: 'Generate and send 50,000 monthly account statements to customers via email and mobile notification.',
    attrs: ['High Volume', 'Low Risk', 'Routine'],
    context: [
      'Scale: 50,000/month — manual handling is physically impossible',
      'Low risk, routine, rules-based formatting',
      'Automation cuts cost ~85% and delivers on schedule',
      'A rare formatting bug could still ship at scale',
    ],
    choices: {
      automate: { eff: 35, acc: 25, risk: 5, comp: 10, breach: false, msg: 'Statements auto-generated and delivered on schedule. Zero errors, all confirmed within 2 hours. Cost down 85%.' },
      hitl: { eff: 10, acc: 15, risk: 0, comp: 5, breach: false, msg: 'Human spot-checks a sample batch before send. Adds 6 hours — catches a rare edge-case formatting bug.' },
      manual: { eff: -40, acc: -30, risk: 0, comp: 0, breach: false, msg: 'Physically impossible — 50,000 statements cannot be manually processed in a monthly cycle.' },
    },
    best: 'automate',
  },
  {
    id: 'kyc',
    title: 'KYC Customer Onboarding',
    desc: 'Verify identity documents for 200 new customers applying for accounts each week under AMLA requirements.',
    attrs: ['Regulated', 'PDPA Sensitive', 'Medium Volume'],
    context: [
      'AMLA requires human sign-off on KYC final decisions',
      'PDPA-sensitive: ID documents are personal data',
      'OCR speeds extraction but can be fooled by forged IDs',
      'Manual-only is accurate but slow — days per application',
    ],
    choices: {
      automate: { eff: 25, acc: -20, risk: 25, comp: -30, breach: true, msg: 'OCR incorrectly verified 3 fraudulent IDs. Regulatory breach — AMLA requires human sign-off on KYC final decisions.' },
      hitl: { eff: 20, acc: 25, risk: -5, comp: 20, breach: false, msg: 'AI extracts document data, officer confirms each case. Processing time cut 60%. Full compliance maintained.' },
      manual: { eff: -15, acc: 5, risk: -5, comp: 15, breach: false, msg: 'Officers verify every document by hand — 3 working days per application and a 2.1% error rate.' },
    },
    best: 'hitl',
  },
  {
    id: 'complaint',
    title: 'Formal Complaint Resolution',
    desc: 'Respond to 150 formal customer complaints per month: billing disputes, service failures, fraud claims.',
    attrs: ['High Risk', 'PDPA Sensitive', 'Complex'],
    context: [
      'High-stakes & emotional — bad replies escalate to the BOT',
      'PDPA-sensitive: complaints hold personal & account data',
      'Templated bot replies feel dismissive → anger & escalation',
      'Fully manual is thorough but slow (~8-day average)',
    ],
    choices: {
      automate: { eff: 20, acc: -20, risk: 30, comp: -25, breach: true, msg: 'Templated bot responses angered 40 customers who escalated to the Bank of Thailand. Regulatory notice issued.' },
      hitl: { eff: 10, acc: 22, risk: -5, comp: 15, breach: false, msg: 'AI drafts responses, officer reviews and personalizes each reply. Resolution time halved. Satisfaction up 15%.' },
      manual: { eff: -10, acc: 15, risk: -10, comp: 10, breach: false, msg: 'Thorough but slow — 8-day average resolution. High staff emotional labor. Process cannot scale.' },
    },
    best: 'hitl',
  },
];

export const CHOICE_ORDER = ['automate', 'hitl', 'manual'];

export const CHOICE_LABELS = {
  automate: 'Automate Fully',
  hitl: 'Human-in-Loop',
  manual: 'Manual Review',
};

export const CHOICE_SUBLABELS = {
  automate: 'Fully automated — no human step',
  hitl: 'AI recommends, human reviews and approves',
  manual: 'Officer handles the entire process by hand',
};

export const CHOICE_ICONS = {
  automate: '⚡',
  hitl: '👤',
  manual: '✋',
};
