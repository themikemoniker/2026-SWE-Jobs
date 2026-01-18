import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

export interface AddContractParams {
  jobTitle: string;
  jobUrl: string;
  companyName: string;
  companyUrl: string | null;
  clientIndustry: string | null;
  location: string | null;
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  contractDuration: string | null;
  startDate: string | null; // ISO date string
  techStack: string[] | null;
  experienceYearsMin: number | null;
  clearanceRequired: boolean;
  corpToCorp: boolean;
  priority: "urgent" | "high" | "normal";
}

export async function addContract(params: AddContractParams) {
  if (!supabase) {
    throw new Error("Supabase client is not initialized.");
  }

  const { error } = await supabase.rpc("add_contract", {
    _job_title: params.jobTitle,
    _job_url: params.jobUrl,
    _company_name: params.companyName,
    _company_url: params.companyUrl,
    _client_industry: params.clientIndustry,
    _location: params.location,
    _hourly_rate_min: params.hourlyRateMin,
    _hourly_rate_max: params.hourlyRateMax,
    _contract_duration: params.contractDuration,
    _start_date: params.startDate,
    _tech_stack: params.techStack,
    _experience_years_min: params.experienceYearsMin,
    _clearance_required: params.clearanceRequired,
    _corp_to_corp: params.corpToCorp,
    _priority: params.priority,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export interface UpdateContractParams {
  jobUrl: string;
  jobTitle?: string | null;
  companyName?: string | null;
  companyUrl?: string | null;
  clientIndustry?: string | null;
  location?: string | null;
  hourlyRateMin?: number | null;
  hourlyRateMax?: number | null;
  contractDuration?: string | null;
  startDate?: string | null;
  techStack?: string[] | null;
  experienceYearsMin?: number | null;
  clearanceRequired?: boolean | null;
  corpToCorp?: boolean | null;
  priority?: "urgent" | "high" | "normal" | null;
  status?: "active" | "inactive" | "filled" | null;
}

export async function updateContract(params: UpdateContractParams) {
  if (!supabase) {
    throw new Error("Supabase client is not initialized.");
  }

  const { error } = await supabase.rpc("update_contract", {
    _job_url: params.jobUrl,
    _new_job_title: params.jobTitle ?? null,
    _new_company_name: params.companyName ?? null,
    _new_company_url: params.companyUrl ?? null,
    _new_client_industry: params.clientIndustry ?? null,
    _new_location: params.location ?? null,
    _new_hourly_rate_min: params.hourlyRateMin ?? null,
    _new_hourly_rate_max: params.hourlyRateMax ?? null,
    _new_contract_duration: params.contractDuration ?? null,
    _new_start_date: params.startDate ?? null,
    _new_tech_stack: params.techStack ?? null,
    _new_experience_years_min: params.experienceYearsMin ?? null,
    _new_clearance_required: params.clearanceRequired ?? null,
    _new_corp_to_corp: params.corpToCorp ?? null,
    _new_priority: params.priority ?? null,
    _new_status: params.status ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
