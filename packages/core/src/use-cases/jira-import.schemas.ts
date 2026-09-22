import { z } from "zod";

export const jiraIssueImportSchema = z.object({
  key: z.string().min(1),
  summary: z.string().min(1),
  status: z.string().min(1),
  epicId: z.string().min(1).nullable().optional(),
});

export const jiraImportFileSchema = z.object({
  issues: z.array(jiraIssueImportSchema).min(1),
});

export type JiraIssueImport = z.infer<typeof jiraIssueImportSchema>;
