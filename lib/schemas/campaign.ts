import { z } from "zod";

export const CAMPAIGN_AUDIENCES = [
  "ALL",
  "LOCATION",
  "DISCIPLINE",
  "COURSE",
  "OVERDUE",
] as const;

export type CampaignAudienceValue = (typeof CAMPAIGN_AUDIENCES)[number];

export const campaignSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, "Subject is required")
    .max(150, "Subject must be 150 characters or fewer"),
  body: z
    .string()
    .trim()
    .min(1, "Message body is required")
    .max(5000, "Message must be 5000 characters or fewer"),
  audienceType: z.enum(CAMPAIGN_AUDIENCES),
  audienceRefId: z
    .string()
    .trim()
    .optional()
    .default("")
    .transform((value) => (value.length > 0 ? value : null)),
});

export type CampaignInput = z.infer<typeof campaignSchema>;
