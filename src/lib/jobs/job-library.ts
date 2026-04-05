export interface JobLibraryTemplate {
  id: string;
  name: string;
  description: string;
  schedule: string;
  prompt: string;
  timeout?: number;
}

export const JOB_LIBRARY_TEMPLATES: JobLibraryTemplate[] = [
  {
    id: "weekly-strategy-digest",
    name: "Weekly strategy digest",
    description: "Summarize the week, call out shifts, and leave a concise strategy note in the KB.",
    schedule: "0 9 * * 1",
    timeout: 900,
    prompt: [
      "Review the most important changes across the knowledge base and current workspace files from the past week.",
      "Write a short strategy digest with key signals, risks, wins, and three next recommendations.",
      "Save the result to a KB page for weekly strategy updates and reference any supporting pages you used.",
    ].join("\n"),
  },
  {
    id: "daily-priority-check",
    name: "Daily priority check",
    description: "Scan current work and leave a short morning priorities note for the team.",
    schedule: "0 9 * * 1-5",
    timeout: 600,
    prompt: [
      "Review the latest roadmap, active planning pages, and recent agent output.",
      "Write a short daily priority note with what matters today, blockers, and what can wait.",
      "Save the note to the KB in the team's daily planning area.",
    ].join("\n"),
  },
  {
    id: "competitor-watch",
    name: "Competitor watch",
    description: "Update a running competitor-watch note with product, pricing, or messaging changes.",
    schedule: "0 14 * * 1-5",
    timeout: 900,
    prompt: [
      "Review the competitor research pages and update the running competitor watch note.",
      "Highlight changes in positioning, launches, pricing, or messaging that matter for Cabinet.",
      "Keep the KB page crisp and append only the most relevant new insights.",
    ].join("\n"),
  },
  {
    id: "kpi-snapshot",
    name: "KPI snapshot",
    description: "Produce a quick metrics snapshot and note unusual movement.",
    schedule: "0 10 * * 1-5",
    timeout: 600,
    prompt: [
      "Review the latest KPI, analytics, and reporting pages in the KB.",
      "Create a short KPI snapshot with the top numbers, trend direction, and any anomalies worth attention.",
      "Save the updated snapshot into the KB and reference the source pages.",
    ].join("\n"),
  },
  {
    id: "doc-gardener",
    name: "Doc gardener",
    description: "Clean stale pages, fix broken structure, and leave docs more navigable than before.",
    schedule: "0 16 * * 2,4",
    timeout: 900,
    prompt: [
      "Inspect the documentation and planning pages for stale sections, broken links, or obvious duplication.",
      "Make a small batch of concrete cleanups directly in the KB.",
      "Leave a short summary of what was cleaned and which pages still need follow-up.",
    ].join("\n"),
  },
  {
    id: "customer-signal-roundup",
    name: "Customer signal roundup",
    description: "Gather customer-facing signals into one concise roundup for the team.",
    schedule: "0 11 * * 1,3,5",
    timeout: 900,
    prompt: [
      "Review customer feedback, campaign notes, support signals, and product observations in the KB.",
      "Create a concise roundup of what customers are saying, repeating, or struggling with.",
      "Save the roundup to the KB and surface any urgent signal that should influence priorities.",
    ].join("\n"),
  },
];
