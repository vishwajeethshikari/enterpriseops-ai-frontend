<<<<<<< HEAD
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
=======
# EnterpriseOps AI — Frontend

A modern React dashboard for an AI-powered business workflow automation platform. EnterpriseOps AI helps support teams investigate customer orders, retrieve relevant policies, analyze issues using AI agents, and prepare workflows for human approval.

## 🚀 Features

- **Dashboard Overview** — View backend connectivity and platform capabilities.
- **Order Investigation** — Investigate orders such as `ORD-1042` through the AI backend.
- **Multi-Agent AI** — Display results from order investigation, policy retrieval, and issue triage agents.
- **RAG Policy Assistant** — Ask questions about support policies using Retrieval-Augmented Generation.
- **Workflow Proposals** — Submit order-based workflow proposals for human review.
- **Responsive Interface** — Dark-themed dashboard with navigation, status indicators, and API response views.

## 🛠️ Tech Stack

- React
- TypeScript
- Vite
- Axios
- Lucide React
- CSS

## 🏗️ Architecture

The frontend communicates with a Python FastAPI orchestration service, which integrates with AI components and the Spring Boot business backend.

```text
React + TypeScript Frontend
          |
          v
Python FastAPI Orchestration
          |
          +---- AI Agents
          |
          +---- RAG Policy Assistant
          |
          v
Spring Boot Business API
          |
          v
PostgreSQL Database
```

## 📁 Project Structure

```text
enterpriseops-ai-frontend/
├── src/
│   ├── api.ts
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## ⚙️ Getting Started

### Prerequisites

- Node.js and npm
- Python FastAPI backend
- Spring Boot business backend for integrated business operations

### 1. Clone the repository

```bash
git clone https://github.com/vishwajeethshikari/enterpriseops-ai-frontend.git
cd enterpriseops-ai-frontend
```

### 2. Install dependencies

```bash
npm install
npm install axios lucide-react
```

### 3. Start the frontend

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### 4. Configure the backend

The Vite development proxy forwards API requests to the FastAPI service at `http://localhost:8000`.

Start the Python backend separately and verify its health endpoint:

```text
http://localhost:8000/health
```

The Spring Boot business backend runs at `http://localhost:8080` in the local development setup.

## 🧪 Production Build

Run the following command to check the TypeScript project and generate a production build:

```bash
npm run build
```

## 🔒 Human-in-the-Loop Design

AI-generated recommendations are proposals, not automatic authorization. Workflow approval and ticket creation are handled by the business backend according to its approval rules.

## 🎯 Project Goal

Build a full-stack AI-powered business operations platform that combines a modern dashboard, AI orchestration, policy-grounded responses, and controlled workflow automation.

## 👨‍💻 Author

**Vishwajeeth Shikari**

GitHub: [@vishwajeethshikari](https://github.com/vishwajeethshikari)

---

*EnterpriseOps AI — AI-assisted operations with human-reviewed decisions.*
>>>>>>> origin/main
