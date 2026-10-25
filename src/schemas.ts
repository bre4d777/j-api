import { z } from "zod";

const tags = z
	.array(z.string().trim().toLowerCase().min(1).max(20))
	.max(10)
	.transform((t) => [...new Set(t)]);

const fields = {
	title: z.string().trim().min(1).max(100),
	content: z.string().trim().min(1).max(10000),
	tags,
	pinned: z.boolean(),
};

export const entrySchema = z.object({
	...fields,
	tags: tags.default([]),
	pinned: z.boolean().default(false),
});

export const entryUpdateSchema = z.object(fields).partial();

export const listQuery = z.object({
	q: z.string().optional(),
	tag: z.string().trim().toLowerCase().optional(),
	pinned: z.enum(["true", "false"]).optional(),
	from: z.iso.datetime().optional(),
	to: z.iso.datetime().optional(),
	sort: z.enum(["newest", "oldest"]).default("newest"),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
});
