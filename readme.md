> yes the readme is ai gen cuz i aint writing all this but the code is not
# Journal API

A simple REST API for a journal. No frontend included, so build your own and call it with `fetch`.

## Features
- Create, read, update, delete entries
- Search, filter by tag, pinned and date range, with sorting and pagination
- Pin entries, tag list with counts, stats (word count, days written, streak)
- CORS enabled for any frontend
- Zod input validation with consistent error responses

## Tech stack
TypeScript, Hono, Zod, Node.js (20+), JSON file storage (`db.json`)

## Run
```bash
npm install
npm run dev
```
Server starts on `http://localhost:3000`. Set `PORT` to change it.
Data is saved to `db.json`, created on first write.

## Endpoints
| Method | Route | Description |
|---|---|---|
| GET | `/entries` | List entries (see query params) |
| GET | `/entries/:id` | Single entry |
| POST | `/entries` | Create entry |
| PATCH | `/entries/:id` | Partial update |
| DELETE | `/entries/:id` | Delete (204) |
| POST | `/entries/:id/pin` | Toggle pin |
| GET | `/tags` | Tags with counts |
| GET | `/stats` | Totals and writing streak |

### Query params for `GET /entries`
| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string | | Search title and content |
| `tag` | string | | Exact tag |
| `pinned` | `true` / `false` | | |
| `from`, `to` | ISO datetime | | Filter by creation date |
| `sort` | `newest` / `oldest` | `newest` | |
| `page` | int | 1 | |
| `limit` | int | 10 | Max 100 |

### Entry body (POST)
```json
{
  "title": "Day 1",
  "content": "Started the journal api",
  "tags": ["dev", "hono"],
  "pinned": false
}
```
`title` and `content` are required. `tags` defaults to `[]`. Tags are lowercased and deduplicated.

### Example responses
`GET /entries`
```json
{ "page": 1, "limit": 10, "total": 1, "totalPages": 1,
  "data": [{ "id": "...", "title": "Day 1", "content": "...",
             "tags": ["dev"], "pinned": false,
             "createdAt": "2026-10-25T10:00:00.000Z" }] }
```

`GET /stats`
```json
{ "totalEntries": 12, "totalWords": 840, "daysWritten": 5, "currentStreak": 3 }
```

### Errors
All errors are `{ "error": "message" }`. Validation errors also include `issues`.

| Code | Meaning |
|---|---|
| 400 | Validation failed |
| 404 | Entry or route not found |
| 500 | Server error |

## Frontend example
```js
const API = "http://localhost:3000";

await fetch(`${API}/entries`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ title: "Day 1", content: "Hello", tags: ["dev"] }),
});

const { data } = await (await fetch(`${API}/entries?page=1&limit=10`)).json();
```
