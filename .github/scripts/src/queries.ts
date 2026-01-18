import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { ContractListSchema } from "./types/contract.schema";
import { AnalyticsSchema } from "./types/analytics.schema";

dotenv.config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

type ContractQueryParams = {
  p_priority?: string | null;
  p_min_rate?: number | null;
  p_max_rate?: number | null;
};

export async function fetchContracts(params: ContractQueryParams = {}) {
  if (!supabase) {
    throw new Error("Supabase client is not initialized.");
  }

  const { data, error } = await supabase.rpc("get_contracts", params);

  if (error) {
    throw new Error(`Supabase query error: ${error.message}`);
  }

  try {
    return ContractListSchema.parse(data);
  } catch (validationError) {
    throw new Error(`Data validation error: ${validationError}`);
  }
}

export async function fetchContractsByPriority(priority: string) {
  return fetchContracts({ p_priority: priority });
}

export async function fetchAnalytics() {
  if (!supabase) {
    throw new Error("Supabase client is not initialized.");
  }

  const { data, error } = await supabase.rpc("get_contract_analytics");

  if (error) {
    throw new Error(`Supabase query error: ${error.message}`);
  }

  try {
    const payload = Array.isArray(data) ? data[0] : data;
    return AnalyticsSchema.parse(payload);
  } catch (validationError) {
    throw new Error(`Data validation error: ${validationError}`);
  }
}
