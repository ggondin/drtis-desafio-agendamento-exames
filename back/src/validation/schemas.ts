import { z } from "zod";

export const idSchema = z.coerce.number().int().positive();

export const appointmentSchema = z.object({
  patientId: idSchema,
  examTypeId: idSchema,
  startsAt: z.string(),
});

export const reportSchema = z.object({
  title: z.string().trim().min(1).max(150),
  content: z.string().trim().min(1).max(20000),
  professional: z.string().trim().min(1).max(150),
});

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Data inválida");
