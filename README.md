EnterpriseOps AI — Frontend
<p align="center">
  <img src="https://img.shields.io/badge/React-UI-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-typed%20JavaScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-build%20tool-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Axios-API%20client-5A29E4?logo=axios&logoColor=white" alt="Axios" />
</p>

A React dashboard for AI-assisted customer support, order investigation, and human-reviewed business workflows.

EnterpriseOps AI brings business context and AI-assisted investigation into one workspace. The frontend presents order information, policy-retrieval results, agent findings, and workflow proposals returned by the backend services.
Project status: Active development. Features and integrations should be considered complete only when verified against the current source code and running services.

Contents
- Overview
- Features
- Technology stack
- Architecture
- Project structure
- Getting started
- Backend connection
- Available scripts
- Development notes
- Security and human approval
- Roadmap
Overview
EnterpriseOps AI is designed to help support teams investigate customer orders and prepare controlled business workflows with assistance from AI services. The frontend is the user-facing layer; business data and approved operations remain the responsibility of backend services.
Features
The application is intended to provide the following user experiences, depending on what is currently implemented in the source code:
- Dashboard overview — a central workspace for platform status and key operations.
- Order investigation — submit or inspect an order such as ORD-1042 through the AI service.
- Agent results — view findings from order investigation, policy retrieval, and issue-triage steps.
- Policy assistant — ask questions using policy information retrieved by the backend.
- Workflow proposals — review proposed actions that may require human approval.
- Responsive interface — navigate the application through a consistent dashboard layout.
Technology stack
Technology	Role
React	UI components and application interface
TypeScript	Typed application code where used by the current source
Vite	Local development server and production build
Axios	HTTP requests to backend APIs
Lucide React	Icons
CSS	Layout, theme, and responsive styling


Check the actual files and package.json if the current branch differs from this documented stack.
Architecture
┌────────────────────────────┐
│     React Frontend         │
│  Dashboard and UI screens  │
└─────────────┬──────────────┘
              │ HTTP / JSON
              ▼
┌────────────────────────────┐
│    Python FastAPI Service  │
│  LLM orchestration and RAG │
└─────────────┬──────────────┘
              │ REST API
              ▼
┌────────────────────────────┐
│  Spring Boot Business API  │
│ Orders, tickets, workflows │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│        PostgreSQL          │
└────────────────────────────┘
The frontend communicates with the Python FastAPI orchestration service. The Python service coordinates AI operations and calls the Spring Boot business API for business data or operations. The Java service owns persistence access to PostgreSQL; the frontend should not connect to the database directly.
Project structure
The exact filenames depend on the current branch. The frontend is generally organized around the application entry point, UI components, styles, API client, public assets, and Vite configuration. For example:
frontend/
├── src/
│   ├── api.*
│   ├── App.*
│   ├── App.css
│   ├── index.css
│   └── main.*
├── public/
├── index.html
├── package.json
└── vite.config.*
Use the files present in the repository as the source of truth; do not create duplicate TypeScript and JavaScript entry points.
Getting started
Prerequisites
- Node.js and npm
- The Python FastAPI service for integrated AI features
- The Spring Boot business backend for business operations
1. Clone the repository
Use the URL for the actual EnterpriseOps AI frontend repository:
git clone https://github.com/vishwajeethshikari/enterpriseops-ai-frontend.git
cd enterpriseops-ai-frontend
2. Install dependencies
npm install
Check package.json before installing any additional package. If Axios or Lucide React is not listed but imported by the current code, install the missing dependency:
npm install axios lucide-react
3. Start the development server
npm run dev
Open the local URL printed by Vite, commonly http://localhost:5173.
Backend connection
In the documented local development setup:
- Python FastAPI service: http://localhost:8000
- Spring Boot business service: http://localhost:8080
The Vite development proxy is intended to forward API requests to the FastAPI service. Verify the actual proxy paths in the Vite configuration before relying on a particular route. Start the required backend services separately and confirm their health endpoints are available.

If API requests fail, check that the services are running, the proxy target and route prefixes match the backend, and CORS is configured appropriately for the environment.
Available scripts
Run npm run to see the scripts defined by this repository's package.json. Typical Vite scripts include:
npm run dev
npm run build
npm run preview
Run the production build to check the application before integration or deployment:
npm run build
Only consider the build successful if the command exits without errors.
Development notes
- Keep API calls in a shared client or API module rather than duplicating request logic across components.
- Handle loading, empty, error, and successful response states in UI screens.
- Keep backend URLs configurable; do not hardcode production credentials or secrets in frontend code.
- Agree on request and response formats with the backend team before integrating a feature.
- Do not assume an endpoint exists until it has been verified in the backend implementation or API documentation.
Security and human approval
AI-generated findings and workflow recommendations should be displayed as proposals, not as permission to perform sensitive business actions. The backend must enforce authentication, authorization, and approval rules. The frontend must not store database credentials or treat UI-only checks as security controls.
Roadmap
The following are candidate improvements to verify and prioritize with the team:
- Confirm the dashboard and order-investigation flows end to end.
- Improve loading, empty, and error states.
- Connect policy assistant and agent results to the actual FastAPI responses.
- Display workflow status and human-approval outcomes from the business backend.
- Add frontend tests and accessibility checks.
- Validate the production build and environment configuration before deployment.
Author
Vishwajeeth Shikari
GitHub · LinkedIn
EnterpriseOps AI — AI-assisted operations with human-reviewed decisions
