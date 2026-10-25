import { randomUUID } from "node:crypto";
import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import type { ZodType } from "zod";
import { db, type Entry, save } from "./db.js";
import { entrySchema, entryUpdateSchema, listQuery } from "./schemas.js";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

const v = <T extends ZodType>(target: "json" | "query", schema: T) =>
	zValidator(target, schema, (result, c) => {
		if (!result.success) {
			return c.json(
				{ error: "validation failed", issues: result.error.issues },
				400,
			);
		}
	});

const find = (id: string) => db.entries.find((e) => e.id === id);

app.get("/", (c) =>
	c.json({
		name: "journal-api",
		routes: [
			"GET    /entries?q=&tag=&pinned=&from=&to=&sort=&page=&limit=",
			"GET    /entries/:id",
			"POST   /entries",
			"PATCH  /entries/:id",
			"DELETE /entries/:id",
			"POST   /entries/:id/pin",
			"GET    /tags",
			"GET    /stats",
		],
	}),
);

app.get("/entries", v("query", listQuery), (c) => {
	const { q, tag, pinned, from, to, sort, page, limit } = c.req.valid("query");
	let list = [...db.entries];

	if (q) {
		const s = q.toLowerCase();
		list = list.filter(
			(e) =>
				e.title.toLowerCase().includes(s) ||
				e.content.toLowerCase().includes(s),
		);
	}
	if (tag) list = list.filter((e) => e.tags.includes(tag));
	if (pinned) list = list.filter((e) => e.pinned === (pinned === "true"));
	if (from) list = list.filter((e) => e.createdAt >= from);
	if (to) list = list.filter((e) => e.createdAt <= to);

	list.sort((a, b) =>
		sort === "newest"
			? b.createdAt.localeCompare(a.createdAt)
			: a.createdAt.localeCompare(b.createdAt),
	);

	const total = list.length;
	const data = list.slice((page - 1) * limit, page * limit);
	return c.json({
		page,
		limit,
		total,
		totalPages: Math.ceil(total / limit),
		data,
	});
});

app.get("/entries/:id", (c) => {
	const entry = find(c.req.param("id"));
	if (!entry) return c.json({ error: "entry not found" }, 404);
	return c.json(entry);
});

app.post("/entries", v("json", entrySchema), (c) => {
	const entry: Entry = {
		id: randomUUID(),
		...c.req.valid("json"),
		createdAt: new Date().toISOString(),
	};
	db.entries.push(entry);
	save();
	return c.json(entry, 201);
});

app.patch("/entries/:id", v("json", entryUpdateSchema), (c) => {
	const entry = find(c.req.param("id"));
	if (!entry) return c.json({ error: "entry not found" }, 404);
	Object.assign(entry, c.req.valid("json"), {
		updatedAt: new Date().toISOString(),
	});
	save();
	return c.json(entry);
});

app.delete("/entries/:id", (c) => {
	const i = db.entries.findIndex((e) => e.id === c.req.param("id"));
	if (i === -1) return c.json({ error: "entry not found" }, 404);
	db.entries.splice(i, 1);
	save();
	return c.body(null, 204);
});

app.post("/entries/:id/pin", (c) => {
	const entry = find(c.req.param("id"));
	if (!entry) return c.json({ error: "entry not found" }, 404);
	entry.pinned = !entry.pinned;
	entry.updatedAt = new Date().toISOString();
	save();
	return c.json(entry);
});

app.get("/tags", (c) => {
	const counts: Record<string, number> = {};
	for (const e of db.entries)
		for (const t of e.tags) counts[t] = (counts[t] ?? 0) + 1;
	const tags = Object.entries(counts)
		.map(([tag, count]) => ({ tag, count }))
		.sort((a, b) => b.count - a.count);
	return c.json(tags);
});

app.get("/stats", (c) => {
	const days = new Set<string>();
	let words = 0;

	for (const e of db.entries) {
		days.add(e.createdAt.slice(0, 10));
		words += e.content.split(/\s+/).filter(Boolean).length;
	}

	let streak = 0;
	const d = new Date();
	if (!days.has(d.toISOString().slice(0, 10))) d.setUTCDate(d.getUTCDate() - 1);
	while (days.has(d.toISOString().slice(0, 10))) {
		streak++;
		d.setUTCDate(d.getUTCDate() - 1);
	}

	return c.json({
		totalEntries: db.entries.length,
		totalWords: words,
		daysWritten: days.size,
		currentStreak: streak,
	});
});

app.notFound((c) => c.json({ error: "route not found" }, 404));

app.onError((err, c) => {
	if (err instanceof HTTPException)
		return c.json({ error: err.message }, err.status);
	console.error(err);
	return c.json({ error: "internal server error" }, 500);
});

const port = 3000;
serve({ fetch: app.fetch, port });
console.log(`journal api on http://localhost:${port}`);
