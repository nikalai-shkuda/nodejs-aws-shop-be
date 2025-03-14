import { z } from "zod";

export const createProductFromCsvSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters"),

  description: z
    .string()
    .min(1, "Description is required")
    .max(1000, "Description must be less than 1000 characters"),

  count: z.string(),

  price: z.string(),
});

export const productSchema = z.object({
  id: z.string().uuid("ID must be a valid UUID"),

  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters"),

  description: z
    .string()
    .min(1, "Description is required")
    .max(1000, "Description must be less than 1000 characters"),

  price: z
    .number()
    .positive("Price must be greater than 0")
    .transform((val: number) => Number(val.toFixed(2))),
});

export const stockSchema = z.object({
  product_id: z.string().uuid("ID must be a valid UUID"),

  count: z
    .number()
    .int("Count must be an integer")
    .min(0, "Count cannot be negative")
    .default(0),
});
