import * as core from "@actions/core";
import * as github from "@actions/github";
import dotenv from "dotenv";
import { addContract, updateContract } from "./mutations";

dotenv.config();
const GIT_USER_NAME = process.env.GIT_USER_NAME;
const GIT_USER_EMAIL = process.env.GIT_USER_EMAIL;

interface ParsedContractData {
  jobTitle: string | null;
  jobUrl: string | null;
  companyName: string | null;
  companyUrl: string | null;
  clientIndustry: string | null;
  location: string | null;
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  contractDuration: string | null;
  startDate: string | null;
  techStack: string[] | null;
  experienceYearsMin: number | null;
  clearanceRequired: boolean | null;
  corpToCorp: boolean | null;
  priority: "urgent" | "high" | "normal" | null;
  status: "active" | "inactive" | "filled" | null;
}

function parseIssueBody(issueBody: string): ParsedContractData {
  const extractData = (regex: RegExp, text: string): string | null => {
    const match = text.match(regex);
    const data = match ? match[1].trim() : null;
    return data === "_No response_" || data === "None" || data === ""
      ? null
      : data;
  };

  const extractNumber = (regex: RegExp, text: string): number | null => {
    const data = extractData(regex, text);
    if (!data) return null;
    const num = parseFloat(data);
    return isNaN(num) ? null : num;
  };

  // Regex patterns for each field
  const jobTitleRegex = /### Position Title[^#]*\r?\n\r?\n(.+?)\r?\n\r?\n###/s;
  const jobUrlRegex =
    /### Contract\/Application Link[^#]*\r?\n\r?\n(.+?)\r?\n\r?\n###/s;
  const companyNameRegex =
    /### Company\/Client Name[^#]*\r?\n\r?\n(.+?)\r?\n\r?\n###/s;
  const companyUrlRegex =
    /### Company Website\r?\n\r?\n(.+?)\r?\n\r?\n###/s;
  const clientIndustryRegex =
    /### Client Industry\r?\n\r?\n(.+?)\r?\n\r?\n###/s;
  const locationRegex = /### Location\r?\n\r?\n(.+?)\r?\n\r?\n###/s;
  const hourlyRateMinRegex =
    /### Minimum Hourly Rate[^#]*\r?\n\r?\n(.+?)\r?\n\r?\n###/s;
  const hourlyRateMaxRegex =
    /### Maximum Hourly Rate[^#]*\r?\n\r?\n(.+?)\r?\n\r?\n###/s;
  const contractDurationRegex =
    /### Contract Duration\r?\n\r?\n(.+?)\r?\n\r?\n###/s;
  const startDateRegex = /### Start Date\r?\n\r?\n(.+?)\r?\n\r?\n###/s;
  const techStackRegex = /### Tech Stack\r?\n\r?\n(.+?)\r?\n\r?\n###/s;
  const experienceYearsMinRegex =
    /### Minimum Years Experience\r?\n\r?\n(.+?)\r?\n\r?\n###/s;
  const clearanceRequiredRegex =
    /### Security Clearance Required\?\r?\n\r?\n(.+?)\r?\n\r?\n###/s;
  const corpToCorpRegex =
    /### Corp-to-Corp \(C2C\) Available\?\r?\n\r?\n(.+?)\r?\n\r?\n###/s;
  const priorityRegex = /### Priority Level\r?\n\r?\n(.+?)\r?\n\r?\n###/s;
  const statusRegex = /### Contract Status\r?\n\r?\n(.+?)(\r?\n\r?\n###|$)/s;

  // Parse tech stack as array
  const techStackRaw = extractData(techStackRegex, issueBody);
  const techStack = techStackRaw
    ? techStackRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  // Parse boolean fields
  const clearanceRaw = extractData(clearanceRequiredRegex, issueBody);
  const clearanceRequired = clearanceRaw ? clearanceRaw === "Yes" : null;

  const corpToCorpRaw = extractData(corpToCorpRegex, issueBody);
  const corpToCorp = corpToCorpRaw ? corpToCorpRaw === "Yes" : null;

  // Parse priority
  const priorityRaw = extractData(priorityRegex, issueBody);
  let priority: "urgent" | "high" | "normal" | null = null;
  if (priorityRaw) {
    const p = priorityRaw.toLowerCase();
    if (p === "urgent") priority = "urgent";
    else if (p === "high") priority = "high";
    else if (p === "normal") priority = "normal";
  }

  // Parse status
  const statusRaw = extractData(statusRegex, issueBody);
  let status: "active" | "inactive" | "filled" | null = null;
  if (statusRaw) {
    if (statusRaw.toLowerCase().includes("inactive") || statusRaw.toLowerCase().includes("closed")) {
      status = "inactive";
    } else if (statusRaw.toLowerCase().includes("filled")) {
      status = "filled";
    } else if (statusRaw.toLowerCase().includes("active")) {
      status = "active";
    }
  }

  return {
    jobTitle: extractData(jobTitleRegex, issueBody),
    jobUrl: extractData(jobUrlRegex, issueBody),
    companyName: extractData(companyNameRegex, issueBody),
    companyUrl: extractData(companyUrlRegex, issueBody),
    clientIndustry: extractData(clientIndustryRegex, issueBody),
    location: extractData(locationRegex, issueBody),
    hourlyRateMin: extractNumber(hourlyRateMinRegex, issueBody),
    hourlyRateMax: extractNumber(hourlyRateMaxRegex, issueBody),
    contractDuration: extractData(contractDurationRegex, issueBody),
    startDate: extractData(startDateRegex, issueBody),
    techStack,
    experienceYearsMin: extractNumber(experienceYearsMinRegex, issueBody),
    clearanceRequired,
    corpToCorp,
    priority,
    status,
  };
}

async function main() {
  try {
    const context = github.context;

    if (context.payload.issue) {
      const issue = context.payload.issue;
      const username = issue.user.login;
      const labelNames = issue.labels.map(
        (label: { name: string }) => label.name
      );
      const formInputs = parseIssueBody(issue.body || "");

      if (
        labelNames.includes("new") &&
        formInputs.jobTitle &&
        formInputs.jobUrl &&
        formInputs.companyName
      ) {
        await addContract({
          jobTitle: formInputs.jobTitle,
          jobUrl: formInputs.jobUrl,
          companyName: formInputs.companyName,
          companyUrl: formInputs.companyUrl,
          clientIndustry: formInputs.clientIndustry,
          location: formInputs.location,
          hourlyRateMin: formInputs.hourlyRateMin,
          hourlyRateMax: formInputs.hourlyRateMax,
          contractDuration: formInputs.contractDuration,
          startDate: formInputs.startDate,
          techStack: formInputs.techStack,
          experienceYearsMin: formInputs.experienceYearsMin,
          clearanceRequired: formInputs.clearanceRequired ?? false,
          corpToCorp: formInputs.corpToCorp ?? false,
          priority: formInputs.priority ?? "normal",
        });
        core.setOutput("commit_message", "chore: add new contract");
      } else if (labelNames.includes("update") && formInputs.jobUrl) {
        await updateContract({
          jobUrl: formInputs.jobUrl,
          jobTitle: formInputs.jobTitle,
          companyName: formInputs.companyName,
          companyUrl: formInputs.companyUrl,
          clientIndustry: formInputs.clientIndustry,
          location: formInputs.location,
          hourlyRateMin: formInputs.hourlyRateMin,
          hourlyRateMax: formInputs.hourlyRateMax,
          contractDuration: formInputs.contractDuration,
          startDate: formInputs.startDate,
          techStack: formInputs.techStack,
          experienceYearsMin: formInputs.experienceYearsMin,
          clearanceRequired: formInputs.clearanceRequired,
          corpToCorp: formInputs.corpToCorp,
          priority: formInputs.priority,
          status: formInputs.status,
        });
        core.setOutput("commit_message", "chore: update contract");
      }

      core.setOutput("git_user_name", GIT_USER_NAME);
      core.setOutput("git_user_email", GIT_USER_EMAIL);
    }
  } catch (error) {
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    core.setFailed(errorMessage);
    core.setOutput("error", errorMessage);
  }
}

main();
