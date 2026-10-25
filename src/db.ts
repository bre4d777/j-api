import fs from "node:fs";

export interface Entry {
	id: string;
	title: string;
	content: string;
	tags: string[];
	pinned: boolean;
	createdAt: string;
	updatedAt?: string;
}

interface DB {
	entries: Entry[];
}

const FILE = "db.json";

export const db: DB = fs.existsSync(FILE)
	? JSON.parse(fs.readFileSync(FILE, "utf8"))
	: { entries: [] };

export const save = (): void => {
	fs.writeFileSync(FILE + ".tmp", JSON.stringify(db, null, 2));
	fs.renameSync(FILE + ".tmp", FILE);
};
