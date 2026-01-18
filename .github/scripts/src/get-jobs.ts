import * as fs from "fs";
import * as path from "path";
import * as core from "@actions/core";
import dotenv from "dotenv";
import { fetchContracts, fetchAnalytics } from "./queries";
import { Contract } from "./types/contract.schema";
import { Analytics } from "./types/analytics.schema";
import { HEADERS, MARKERS, ANALYTICS_MARKERS, TABLE_CONFIG } from "./config";

dotenv.config();
const APPLY_IMG_URL = process.env.APPLY_IMG_URL?.trim();

function cleanCell(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  return value.replace(/\s+/g, " ").trim();
}

function formatRate(min: number | null, max: number | null): string {
  if (!min && !max) return "TBD";
  if (min && max && min === max) return `$${min}/hr`;
  if (min && max) return `$${min}-${max}/hr`;
  if (min) return `$${min}+/hr`;
  if (max) return `$${max}/hr`;
  return "TBD";
}

function formatStartDate(
  startDate: string | null,
  daysUntilStart: number | null
): string {
  if (!startDate) return "Flexible";

  const date = new Date(startDate);
  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  if (daysUntilStart !== null) {
    if (daysUntilStart < 0) return `${formatted} (Started)`;
    if (daysUntilStart === 0) return `${formatted} (Today!)`;
    if (daysUntilStart <= 7) return `${formatted} (${daysUntilStart}d)`;
    if (daysUntilStart <= 30) return `${formatted} (~${Math.ceil(daysUntilStart / 7)}w)`;
  }

  return formatted;
}

function formatTechStack(techStack: string[] | null): string {
  if (!techStack || techStack.length === 0) return "";
  if (techStack.length <= 3) return techStack.join(", ");
  return `${techStack.slice(0, 3).join(", ")} +${techStack.length - 3}`;
}

function generateMarkdownTable(contracts: Contract[]): string {
  let table = `| ${HEADERS.join(" | ")} |\n`;
  table += `|${HEADERS.map(() => "---").join("|")}|\n`;

  contracts.forEach((contract) => {
    const applyCell = `<a href="${cleanCell(
      contract.job_url
    )}"><img src="${APPLY_IMG_URL || ""}" alt="Apply" width="70"/></a>`;

    const companyCell = contract.company_url
      ? `<a href="${cleanCell(contract.company_url)}"><strong>${cleanCell(
          contract.company_name
        )}</strong></a>`
      : `<strong>${cleanCell(contract.company_name)}</strong>`;

    // Add industry tag if available
    const industryTag = contract.client_industry
      ? ` <sub>${contract.client_industry}</sub>`
      : "";

    // Add badges for special requirements
    let badges = "";
    if (contract.clearance_required) badges += " :lock:";
    if (contract.corp_to_corp) badges += " :briefcase:";

    const row = [
      companyCell + industryTag,
      cleanCell(contract.job_title) + badges,
      formatRate(contract.hourly_rate_min, contract.hourly_rate_max),
      contract.contract_duration || "TBD",
      formatStartDate(contract.start_date, contract.days_until_start),
      formatTechStack(contract.tech_stack),
      applyCell,
    ];

    table += `| ${row.join(" | ")} |\n`;
  });

  return table;
}

function updateTable(
  readmeContent: string,
  marker: { start: string; end: string },
  tableContent: string
): string {
  const { start, end } = marker;
  const startIndex = readmeContent.indexOf(start);
  const endIndex = readmeContent.indexOf(end);

  if (startIndex === -1 || endIndex === -1) {
    return readmeContent;
  }

  const before = readmeContent.substring(0, startIndex + start.length);
  const after = readmeContent.substring(endIndex);
  return `${before}\n${tableContent}\n${after}`;
}

function generateAnalyticsSection(analytics: Analytics): string {
  const avgRate = analytics.avg_hourly_rate
    ? `$${analytics.avg_hourly_rate}/hr`
    : "N/A";
  const rateRange =
    analytics.min_hourly_rate && analytics.max_hourly_rate
      ? `$${analytics.min_hourly_rate} - $${analytics.max_hourly_rate}/hr`
      : "N/A";

  return `| Metric | Value |
|--------|-------|
| **Total Active Contracts** | ${analytics.total_active} |
| **Average Rate** | ${avgRate} |
| **Rate Range** | ${rateRange} |
| **Urgent Contracts** | ${analytics.urgent_count} |
| **Starting in 30 Days** | ${analytics.starting_soon_count} |`;
}

function generateSkillsSection(analytics: Analytics): string {
  if (!analytics.top_skills || Object.keys(analytics.top_skills).length === 0) {
    return "_No skill data available_";
  }

  const sortedSkills = Object.entries(analytics.top_skills)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const skillBadges = sortedSkills
    .map(([skill, count]) => `\`${skill}\` (${count})`)
    .join(" | ");

  return skillBadges;
}

function generateIndustriesSection(analytics: Analytics): string {
  if (
    !analytics.by_industry ||
    Object.keys(analytics.by_industry).length === 0
  ) {
    return "_No industry data available_";
  }

  const sortedIndustries = Object.entries(analytics.by_industry)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return sortedIndustries
    .map(([industry, count]) => `- **${industry}**: ${count} contracts`)
    .join("\n");
}

function generateDurationsSection(analytics: Analytics): string {
  if (
    !analytics.by_duration ||
    Object.keys(analytics.by_duration).length === 0
  ) {
    return "_No duration data available_";
  }

  const sortedDurations = Object.entries(analytics.by_duration).sort(
    ([, a], [, b]) => b - a
  );

  return sortedDurations
    .map(([duration, count]) => `- **${duration}**: ${count} contracts`)
    .join("\n");
}

function updateAnalytics(readmeContent: string, analytics: Analytics): string {
  let content = readmeContent;

  content = updateTable(
    content,
    ANALYTICS_MARKERS.stats,
    generateAnalyticsSection(analytics)
  );
  content = updateTable(
    content,
    ANALYTICS_MARKERS.skills,
    generateSkillsSection(analytics)
  );
  content = updateTable(
    content,
    ANALYTICS_MARKERS.industries,
    generateIndustriesSection(analytics)
  );
  content = updateTable(
    content,
    ANALYTICS_MARKERS.durations,
    generateDurationsSection(analytics)
  );

  return content;
}

async function main() {
  try {
    const readmePath = path.join(__dirname, TABLE_CONFIG.path);
    let readmeContent = fs.readFileSync(readmePath, "utf8");

    // Fetch all contracts
    const allContracts = await fetchContracts();

    // Split by priority
    const urgentContracts = allContracts.filter((c) => c.priority === "urgent");
    const highContracts = allContracts.filter((c) => c.priority === "high");
    const normalContracts = allContracts.filter((c) => c.priority === "normal");

    // Generate tables
    const tables = {
      urgent: generateMarkdownTable(urgentContracts),
      high: generateMarkdownTable(highContracts),
      normal: generateMarkdownTable(normalContracts),
    };

    // Update contract tables
    readmeContent = updateTable(readmeContent, MARKERS.urgent, tables.urgent);
    readmeContent = updateTable(readmeContent, MARKERS.high, tables.high);
    readmeContent = updateTable(readmeContent, MARKERS.normal, tables.normal);

    // Fetch and update analytics
    const analytics = await fetchAnalytics();
    readmeContent = updateAnalytics(readmeContent, analytics);

    // Write updated content
    fs.writeFileSync(readmePath, readmeContent, "utf8");

    console.log(
      `Updated README with ${allContracts.length} contracts (${urgentContracts.length} urgent, ${highContracts.length} high, ${normalContracts.length} normal)`
    );
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unknown error occurred");
    }
  }
}

main();
