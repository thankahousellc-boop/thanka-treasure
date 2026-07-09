import { z } from "zod";

export const newsletterSchema = z.object({
  email: z.string().email(),
  source: z.enum(["footer", "popup", "checkout", "manual"]).default("footer"),
});

export const contactSubmissionSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(32).optional().or(z.literal("")),
  message: z.string().min(10).max(5000),
});

export const checkoutSchema = z.object({
  currency: z.string().length(3).default("USD"),
  discountCode: z.string().trim().min(1).max(64).optional(),
  // Stripe session id from a prior load (localStorage). Lets the server reuse an
  // existing reservation on reload instead of reserving stock again.
  existingSessionId: z.string().trim().min(1).max(255).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid(),
        quantity: z.number().int().positive(),
        image: z.string().url().optional(),
        frame: z
          .object({
            id: z.string().uuid(),
            name: z.string().max(160).optional(),
            imageUrl: z.string().url().optional(),
          })
          .optional(),
      }),
    )
    .min(1),
});

export const uploadRequestSchema = z.object({
  bucket: z
    .enum(["product-images", "blog-images", "private-assets"])
    .default("product-images"),
  target: z
    .enum(["product", "blog-featured", "blog-inline", "private"])
    .optional(),
  entityId: z.string().uuid().optional(),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type UploadRequestInput = z.infer<typeof uploadRequestSchema>;
