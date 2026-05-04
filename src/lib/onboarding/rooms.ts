import type { LucideIcon } from "lucide-react";
import { Briefcase, Brain, FlaskConical, Home, Sparkles } from "lucide-react";

export type RoomType = "office" | "study" | "lab" | "family-room" | "blank";

export interface RoomConfig {
  id: RoomType;
  label: string;
  tagline: string;
  icon: LucideIcon;
  workspaceLabel: string;
  workspacePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  askTeamSize: boolean;
  teamSizeLabel?: string;
  // Lead + editor-equivalent. Length 0 means "no mandatory agents" (blank room).
  mandatoryAgents: readonly string[];
  suggestedAgents: string[];
  keywordMap: [RegExp, string[]][];
  departmentNoun: string;
  exampleAgents: string[];
  greetingTemplate: (homeName: string, workspaceName: string) => string;
}

export const ROOM_TYPES: RoomType[] = ["office", "study", "lab", "family-room", "blank"];

export const ROOMS: Record<RoomType, RoomConfig> = {
  office: {
    id: "office",
    label: "Business Workspace",
    tagline: "Run customer work, operations, governed actions, and source-backed reviews.",
    icon: Briefcase,
    workspaceLabel: "Company, client, or workspace name",
    workspacePlaceholder: "Optale Customer Operations",
    descriptionLabel: "What should Command help manage?",
    descriptionPlaceholder: "Customer onboarding, governed actions, source evidence, and weekly operator reviews",
    askTeamSize: true,
    mandatoryAgents: ["ceo", "editor"],
    suggestedAgents: ["content-marketer", "copywriter"],
    exampleAgents: ["CEO", "Editor"],
    departmentNoun: "Department",
    keywordMap: [
      [/content|blog|social|market|brand|newsletter/, ["content-marketer", "social-media", "copywriter"]],
      [/seo|search|rank|keyword|organic|google/, ["seo"]],
      [/sales|lead|outreach|revenue|pipeline|deal/, ["sales", "customer-success"]],
      [/quality|review|proofread|test|audit/, ["qa"]],
      [/tech|code|engineer|dev|infra|deploy/, ["cto", "devops"]],
      [/product|feature|roadmap|user research/, ["product-manager"]],
      [/design|ux|wireframe|prototype/, ["ux-designer"]],
      [/data|analytics|metrics|dashboard/, ["data-analyst"]],
      [/finance|budget|runway|fundraise/, ["cfo"]],
      [/growth|funnel|acquisition|conversion/, ["growth-marketer"]],
      [/research|competitive|market analysis/, ["researcher"]],
      [/legal|compliance|contract|privacy/, ["legal"]],
      [/hiring|culture|hr|onboarding|team health/, ["people-ops"]],
      [/operations|process|efficiency/, ["coo"]],
    ],
    greetingTemplate: (_home, workspace) =>
      `${workspace || "The business workspace"} is online. Let's review the active work, sources, and next governed actions.`,
  },

  study: {
    id: "study",
    label: "Study",
    tagline: "Your second brain — writing, notes, personal assistant.",
    icon: Brain,
    workspaceLabel: "Name your cabinet",
    workspacePlaceholder: "My Study",
    descriptionLabel: "What areas of life do you want help with?",
    descriptionPlaceholder: "Writing, email triage, calendar, habit tracking",
    askTeamSize: false,
    mandatoryAgents: ["assistant", "librarian"],
    suggestedAgents: ["writing-coach", "calendar-keeper"],
    exampleAgents: ["Assistant", "Librarian"],
    departmentNoun: "Area",
    keywordMap: [
      [/writ|draft|blog|essay|copyedit|brainstorm/, ["writing-coach"]],
      [/email|inbox|reply|mail/, ["inbox-triage"]],
      [/calendar|schedul|reminder|meeting|babysit/, ["calendar-keeper"]],
      [/habit|track|streak|dashboard|log/, ["habit-tracker"]],
      [/research|learn|read|paper|topic/, ["researcher"]],
      [/plugin|script|dnd|tool|automat|tinker/, ["tinkerer"]],
      [/note|wiki|link|synthes|second brain|pkm/, ["note-synthesizer"]],
    ],
    greetingTemplate: (home) =>
      `Morning. Your second brain is online${home ? ` — welcome back to ${home}` : ""}.`,
  },

  lab: {
    id: "lab",
    label: "Research Lab",
    tagline: "Academic work, literature, teaching, thesis.",
    icon: FlaskConical,
    workspaceLabel: "Workspace name",
    workspacePlaceholder: "Philosophy of Mind",
    descriptionLabel: "What's your field or what are you researching?",
    descriptionPlaceholder: "Phenomenology, consciousness, teaching Intro to Philosophy",
    askTeamSize: false,
    mandatoryAgents: ["research-lead", "librarian"],
    suggestedAgents: ["lit-reviewer", "writing-coach"],
    exampleAgents: ["Research Lead", "Librarian"],
    departmentNoun: "Area",
    keywordMap: [
      [/paper|literature|review|journal|article/, ["lit-reviewer"]],
      [/note|synthes|wiki|zettel|pkm/, ["note-synthesizer"]],
      [/teach|lecture|course|syllabus|slide|student/, ["teaching-assistant"]],
      [/writ|essay|thesis|dissertation|draft/, ["writing-coach"]],
      [/citation|bibtex|reference|bibliography/, ["citation-keeper"]],
      [/research|topic|question|hypothesis/, ["researcher"]],
    ],
    greetingTemplate: (home, workspace) => {
      void home;
      return `Research desk ready${workspace ? ` — "${workspace}"` : ""}. What are we digging into today?`;
    },
  },

  "family-room": {
    id: "family-room",
    label: "Family Room",
    tagline: "Household, family calendar, meals, kids.",
    icon: Home,
    workspaceLabel: "Household name",
    workspacePlaceholder: "The Nguyen Family",
    descriptionLabel: "Who lives here and what do you juggle?",
    descriptionPlaceholder: "Two parents, three kids, two schools, one dog",
    askTeamSize: true,
    teamSizeLabel: "Household size",
    mandatoryAgents: ["home-manager", "planner"],
    suggestedAgents: ["meal-planner", "kid-coordinator"],
    exampleAgents: ["Home Manager", "Planner"],
    departmentNoun: "Area",
    keywordMap: [
      [/meal|dinner|cook|recipe|menu/, ["meal-planner"]],
      [/grocer|shop|order|instacart|amazon/, ["grocery-buyer"]],
      [/kid|child|school|homework|activit|dnd/, ["kid-coordinator"]],
      [/calendar|schedul|reminder|babysit|appoint/, ["planner"]],
      [/budget|bill|expense|money|finance/, ["budget-keeper"]],
      [/plugin|script|tool|automat|dashboard|tinker/, ["tinkerer"]],
    ],
    greetingTemplate: (home) =>
      `Home HQ booting up${home ? ` — ${home}` : ""}. Let's get everyone where they need to be.`,
  },

  blank: {
    id: "blank",
    label: "Blank Room",
    tagline: "Nothing yet. Bring your own agents, your own shape.",
    icon: Sparkles,
    workspaceLabel: "Name your cabinet",
    workspacePlaceholder: "My Cabinet",
    descriptionLabel: "What's it for?",
    descriptionPlaceholder: "Anything — leave blank if you're not sure yet",
    askTeamSize: false,
    mandatoryAgents: ["editor"],
    suggestedAgents: [],
    exampleAgents: ["Your call"],
    departmentNoun: "Group",
    keywordMap: [],
    greetingTemplate: (home, workspace) =>
      `Blank slate${workspace ? ` — "${workspace}"` : ""}. What do you want to build${home ? ` here, ${home}` : ""}?`,
  },
};

export function getRoomConfig(roomType: RoomType | string | undefined): RoomConfig {
  if (roomType && (ROOM_TYPES as string[]).includes(roomType)) {
    return ROOMS[roomType as RoomType];
  }
  return ROOMS.office;
}

export function getMandatoryAgentsForRoom(roomType: RoomType | string | undefined): readonly string[] {
  return getRoomConfig(roomType).mandatoryAgents;
}

export interface StarterTeam {
  name: string;
  description: string;
  agents: number;
  domain: string;
  rooms: RoomType[];
}

export const STARTER_TEAMS: StarterTeam[] = [
  // Business workspace
  { name: "Customer Onboarding", description: "Track accounts, evidence, approvals, and rollout actions", agents: 5, domain: "Operations", rooms: ["office"] },
  { name: "Revenue Operations", description: "Pipeline review, account research, next steps, and weekly summaries", agents: 5, domain: "Revenue", rooms: ["office"] },
  { name: "Compliance Review", description: "Policy checks, audit events, source evidence, and decision records", agents: 4, domain: "Governance", rooms: ["office"] },
  { name: "Partner Success Desk", description: "Partner requests, status reports, follow-ups, and action queues", agents: 5, domain: "Success", rooms: ["office"] },
  { name: "Product Feedback Loop", description: "Collect customer evidence, cluster themes, and route product actions", agents: 5, domain: "Product", rooms: ["office"] },
  { name: "Executive Weekly Review", description: "Summaries, risks, decisions, and accountable next actions", agents: 4, domain: "Leadership", rooms: ["office"] },
  { name: "Implementation Control", description: "Scope, owners, blockers, lineage, and launch readiness checks", agents: 5, domain: "Delivery", rooms: ["office"] },
  { name: "Source Evidence Desk", description: "Attach citations, files, and system evidence to decisions", agents: 4, domain: "Knowledge", rooms: ["office"] },
  { name: "Action Approval Queue", description: "Governed execution with review queues and policy visibility", agents: 5, domain: "Actions", rooms: ["office"] },
  { name: "Account Intelligence", description: "Account facts, relationship history, risks, and next best actions", agents: 5, domain: "Sales", rooms: ["office"] },
  { name: "Operations Briefing", description: "Daily operating overview across tasks, objects, actions, and sources", agents: 4, domain: "Ops", rooms: ["office"] },
  { name: "Board Update Prep", description: "Draft narrative, evidence, metrics, risks, and decision asks", agents: 5, domain: "Leadership", rooms: ["office"] },

  // Study
  { name: "Karpathy Wiki", description: "Personal knowledge base with AI-assisted note synthesis", agents: 4, domain: "PKM", rooms: ["study"] },
  { name: "Writing Studio", description: "Drafting, copyediting & research for writers", agents: 3, domain: "Writing", rooms: ["study"] },
  { name: "Life Admin", description: "Email triage, calendar, habits & household logistics", agents: 4, domain: "Admin", rooms: ["study"] },

  // Lab
  { name: "Literature Review Lab", description: "Read, summarize, synthesize & cite papers", agents: 4, domain: "Research", rooms: ["lab"] },
  { name: "Course Prep", description: "Syllabus, lectures, slides & problem sets", agents: 3, domain: "Teaching", rooms: ["lab"] },
  { name: "Thesis Workshop", description: "Drafting, literature, references & revisions", agents: 4, domain: "Writing", rooms: ["lab"] },

  // Family room
  { name: "Family HQ", description: "Family calendar, kids, bills & household coordination", agents: 4, domain: "Household", rooms: ["family-room"] },
  { name: "Meal & Grocery Ops", description: "Weekly menu, grocery lists & orders", agents: 3, domain: "Household", rooms: ["family-room"] },
  { name: "Kids Coordinator", description: "Schedules, activities, DnD & homework support", agents: 4, domain: "Kids", rooms: ["family-room"] },
];
