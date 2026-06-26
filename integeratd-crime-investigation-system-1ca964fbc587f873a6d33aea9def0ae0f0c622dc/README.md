# integeratd-crime-investigation-system

Web-based crime investigation system for Ethiopia Federal Police.

## Environment variables – API Base URL

We centralized the API base URL so it can be used across server and client code.

- Server-only: `API_BASE_URL`
- Client/browser: `NEXT_PUBLIC_API_BASE_URL`

Create a `.env.local` at the project root and set values (you can copy from `.env.example`):

```
API_BASE_URL=http://localhost
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

If you omit these, client code will default to same-origin relative paths and server code will use an empty base.

### Using the base URL in code

From `lib/config`:

- Use `BASE_URL` for direct access to the configured base URL

Example:

```ts
// import { BASE_URL } from "@/lib/config" // if needed directly

const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? ""
const res = await fetch(`${base}/api/cases`)
```

In client components, you can also use a hook:

```tsx
"use client"
import { useBaseUrl } from "@/contexts/config-context"

export function Example() {
	const baseUrl = useBaseUrl()
	// ... use baseUrl
	return null
}
```
