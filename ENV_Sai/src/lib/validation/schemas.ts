/**
 * Zod validation schemas shared across API routes and client
 */

import { z } from "zod";

// ─── Auth Schemas ───

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and number"
    ),
  displayName: z.string().min(2).max(64).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// ─── Pairing Schemas ───

export const generatePairingCodeSchema = z.object({});

export const confirmPairingSchema = z.object({
  pairingCode: z
    .string()
    .length(8, "Pairing code must be 8 characters")
    .regex(/^[A-Z0-9]+$/, "Pairing code must be alphanumeric uppercase"),
  pluginMachineId: z
    .string()
    .min(1, "Machine ID is required")
    .max(256, "Machine ID too long"),
});

// ─── Manifest Schemas ───

export const manifestNodeSchema: z.ZodType<ManifestNode> = z.lazy(() =>
  z.object({
    name: z.string(),
    className: z.string(),
    properties: z.record(z.unknown()).optional(),
    children: z.array(manifestNodeSchema).optional(),
  })
);

export interface ManifestNode {
  name: string;
  className: string;
  properties?: Record<string, unknown>;
  children?: ManifestNode[];
}

export const uploadManifestSchema = z.object({
  placeId: z.number().int().positive("Invalid place ID"),
  projectName: z.string().min(1).max(128).optional(),
  manifest: z.object({
    root: manifestNodeSchema,
    metadata: z
      .object({
        version: z.number().optional(),
        capturedAt: z.string().optional(),
      })
      .optional(),
  }),
});

// ─── AI Suggestion Schemas ───

export const aiSuggestSchema = z.object({
  projectId: z.string().cuid("Invalid project ID"),
  manifestId: z.string().cuid("Invalid manifest ID"),
  prompt: z
    .string()
    .min(3, "Prompt too short")
    .max(4000, "Prompt too long"),
  options: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().min(100).max(16000).optional(),
    })
    .optional(),
});

// ─── Patch Schemas ───

export const patchOperationSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("create"),
    path: z.string(),
    className: z.string(),
    properties: z.record(z.unknown()).optional(),
    source: z.string().optional(), // Luau source code
  }),
  z.object({
    op: z.literal("update"),
    path: z.string(),
    properties: z.record(z.unknown()).optional(),
    source: z.string().optional(),
  }),
  z.object({
    op: z.literal("delete"),
    path: z.string(),
  }),
]);

export const patchSchema = z.object({
  ops: z.array(patchOperationSchema).min(1, "At least one operation required"),
});

export const aiOutputSchema = z.object({
  patch: patchSchema,
  summary: z.string().min(1),
});

export const approvePatchSchema = z.object({
  patchId: z.string().cuid("Invalid patch ID"),
});

export const rejectPatchSchema = z.object({
  patchId: z.string().cuid("Invalid patch ID"),
  reason: z.string().max(500).optional(),
});

// ─── Type exports ───

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ConfirmPairingInput = z.infer<typeof confirmPairingSchema>;
export type UploadManifestInput = z.infer<typeof uploadManifestSchema>;
export type AiSuggestInput = z.infer<typeof aiSuggestSchema>;
export type PatchOperation = z.infer<typeof patchOperationSchema>;
export type PatchPayload = z.infer<typeof patchSchema>;
export type AiOutput = z.infer<typeof aiOutputSchema>;
export type ApprovePatchInput = z.infer<typeof approvePatchSchema>;
export type RejectPatchInput = z.infer<typeof rejectPatchSchema>;
