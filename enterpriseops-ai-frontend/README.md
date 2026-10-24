# EnterpriseOps AI

EnterpriseOps AI is a React and TypeScript operations workspace using Bootstrap 5, React Router, Bootstrap Icons, and Axios for order investigations, policy questions, and workflow proposal requests.

## Run locally

Requirements: Node.js and npm. Start Spring Boot at `http://localhost:8080`, FastAPI at `http://localhost:8001`, and Ollama at `http://localhost:11434` as needed by the services. The browser communicates with FastAPI for the existing AI operations; Ollama is not called directly by the frontend.

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` to configure service URLs. In development, `VITE_BACKEND_API_URL` defaults to `/spring-api` and the Vite server proxies that prefix to `http://localhost:8080`; `VITE_AI_API_URL` can point to FastAPI directly. When the AI URL is empty, the Vite server proxies `/health`, `/investigate`, and `/ai` to `http://localhost:8001`. For deployments, set the service URLs and configure CORS on the backend for the deployed frontend origin. CORS is a backend policy and cannot be enabled securely by browser code. Never place secrets in `VITE_*` variables; values are included in browser code.

`VITE_SPRING_API_BASE_URL`, `VITE_AI_API_BASE_URL`, and `VITE_API_BASE_URL` remain accepted as compatibility fallbacks. API clients are centralized in `src/api.ts`; a JWT can be supplied in memory through `authenticationService.setJwt` and is attached as a bearer token to requests. It is cleared after an unauthorized response and is not persisted in browser storage.

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

The available source confirms the FastAPI operations in the table below, but contains no Spring Boot source/OpenAPI specification or authentication, order, ticket, workflow-list, approval/rejection, or event-history contracts. The frontend therefore does not invent or call those routes; provide the backend API specification/source to connect those business operations. There is no login endpoint wired, so JWT handling only applies to a token supplied by an existing trusted authentication flow. A proposal response is shown as returned; the interface does not treat proposal creation as approval or ticket creation.

The overview's recent activity is limited to successful requests made during the current browser session. It is not a backend activity feed. Pending approvals and recent workflow records cannot be displayed until the backend provides corresponding endpoints.

## Navigation

React Router serves the overview at `/`, order investigations at `/investigations`, the policy assistant at `/assistant`, and workflow proposals at `/workflows`.

## Validate

```sh
npm run build
npm run lint
```
