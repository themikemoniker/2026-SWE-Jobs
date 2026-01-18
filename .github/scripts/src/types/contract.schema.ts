import z from "zod";

export const ContractSchema = z.object({
  id: z.string().uuid().optional(),
  company_name: z.string(),
  company_url: z.string().nullable(),
  client_industry: z.string().nullable(),
  job_title: z.string(),
  job_url: z.string(),
  job_locations: z.string().nullable(),
  hourly_rate_min: z.number().nullable(),
  hourly_rate_max: z.number().nullable(),
  contract_duration: z.string().nullable(),
  start_date: z.string().nullable(), // ISO date string
  tech_stack: z.array(z.string()).nullable(),
  experience_years_min: z.number().nullable(),
  clearance_required: z.boolean().nullable(),
  corp_to_corp: z.boolean().nullable(),
  is_remote: z.boolean().nullable(),
  priority: z.enum(["urgent", "high", "normal"]).nullable(),
  age: z.number(),
  days_until_start: z.number().nullable(),
});

export const ContractListSchema = z.array(ContractSchema);

export type Contract = z.infer<typeof ContractSchema>;
