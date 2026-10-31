import { z } from "zod";

export const MAX_LAYERS = 32;
export const MAX_METADATA_CHARS = 100_000;

const safeText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !/[\u0000-\u001F\u007F]/.test(value), {
      message: "Contains invalid characters",
    });

const rotationSchema = z.object({
  x: z.number().min(-180).max(180),
  y: z.number().min(-180).max(180),
  z: z.number().min(-180).max(180),
});

const layerSchema = z.object({
  name: safeText(200),
  order: z.number().int().nonnegative().max(10_000),
  visible: z.boolean(),
  gapAfter: z.number().min(0).max(100),
  rotation: rotationSchema,
});

export const exportMetadataSchema = z.object({
  title: z.union([safeText(200), z.null()]),
  orbitSpan: z.number().min(10).max(360),
  zoomLocked: z.boolean(),
  envType: z.enum(["hdr", "ldr"]).nullable(),
  expiresAt: z.iso.datetime().nullable(),
  allowedDomains: z.array(z.string().max(253)).max(20).nullable(),
  layers: z
    .array(layerSchema)
    .min(1, "At least one layer is required")
    .max(MAX_LAYERS, `At most ${MAX_LAYERS} layers`),
});

export type ExportMetadata = z.infer<typeof exportMetadataSchema>;
