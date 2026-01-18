import z from "zod";

export const AnalyticsSchema = z.object({
  total_active: z.number(),
  avg_hourly_rate: z.number().nullable(),
  min_hourly_rate: z.number().nullable(),
  max_hourly_rate: z.number().nullable(),
  urgent_count: z.number(),
  starting_soon_count: z.number(),
  by_duration: z.record(z.string(), z.number()).nullable(),
  top_skills: z.record(z.string(), z.number()).nullable(),
  by_industry: z.record(z.string(), z.number()).nullable(),
});

export type Analytics = z.infer<typeof AnalyticsSchema>;
