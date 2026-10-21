# EnterpriseOps AI

EnterpriseOps AI is a React and TypeScript operations workspace using Bootstrap 5, React Router, Bootstrap Icons, and Axios for order investigations, policy questions, and workflow proposal requests.

## Run locally

Requirements: Node.js and npm. Dependencies include Bootstrap 5, Bootstrap Icons, React Router, and Axios. The Vite development server proxies API routes to `http://localhost:8000` by default, so start the FastAPI service there before using live operations.

```sh
npm install
npm run dev
```

Set `VITE_API_BASE_URL` to use a different API base URL. When unset, requests use the current origin and the Vite proxy forwards `/health`, `/investigate`, and `/ai` routes to the local FastAPI service.

## Connected API operations

The frontend currently calls:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | API connection status |
| `GET` | `/ai/investigate/{orderNumber}` | Order investigation |
| `GET` | `/ai/agents/investigate/{orderNumber}` | Multi-agent investigation |
| `POST` | `/ai/ask` | Policy question; sends `{ "question": "..." }` |
| `POST` | `/ai/create-workflow/{orderNumber}` | Request a workflow proposal |

Order inputs use the `ORD-1042` format. The interface renders response fields from the API rather than assuming a fixed response schema.

The current frontend integration does not include workflow listing, approval or rejection actions, or workflow event history. A proposal response is shown as returned; the interface does not treat proposal creation as approval or ticket creation.

The overview's recent activity is limited to successful requests made during the current browser session. It is not a backend activity feed. Pending approvals and recent workflow records cannot be displayed until the backend provides corresponding endpoints.

## Navigation

React Router serves the overview at `/`, order investigations at `/investigations`, the policy assistant at `/assistant`, and workflow proposals at `/workflows`.

## Validate

```sh
npm run build
npm run lint
```
