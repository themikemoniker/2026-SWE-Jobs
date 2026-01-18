// Table configuration for contract listings
export const TABLE_CONFIG = {
  path: "../../../README.md",
  rpc: "get_contracts",
} as const;

// Headers for the contracts table
export const HEADERS = [
  "Company",
  "Position",
  "Rate",
  "Duration",
  "Start",
  "Tech Stack",
  "Apply",
];

// Markers for different table sections in the README
export const MARKERS = {
  urgent: {
    start: "<!-- TABLE_URGENT_START -->",
    end: "<!-- TABLE_URGENT_END -->",
  },
  high: {
    start: "<!-- TABLE_HIGH_START -->",
    end: "<!-- TABLE_HIGH_END -->",
  },
  normal: {
    start: "<!-- TABLE_NORMAL_START -->",
    end: "<!-- TABLE_NORMAL_END -->",
  },
} as const;

// Analytics markers
export const ANALYTICS_MARKERS = {
  stats: {
    start: "<!-- ANALYTICS_START -->",
    end: "<!-- ANALYTICS_END -->",
  },
  skills: {
    start: "<!-- SKILLS_START -->",
    end: "<!-- SKILLS_END -->",
  },
  industries: {
    start: "<!-- INDUSTRIES_START -->",
    end: "<!-- INDUSTRIES_END -->",
  },
  durations: {
    start: "<!-- DURATIONS_START -->",
    end: "<!-- DURATIONS_END -->",
  },
} as const;
