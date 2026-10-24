
import axios from "axios";

const defaultTimeout = 60000;
let jwt: string | null = null;

export const springApi = axios.create({
  baseURL:
    import.meta.env.VITE_BACKEND_API_URL ??
    import.meta.env.VITE_SPRING_API_BASE_URL ??
    (import.meta.env.DEV ? "/spring-api" : "http://localhost:8080"),
  timeout: defaultTimeout,
  headers: {
    "Content-Type": "application/json",
  },
});

export const aiApi = axios.create({
  baseURL:
    import.meta.env.VITE_AI_API_URL ??
    import.meta.env.VITE_AI_API_BASE_URL ??
    import.meta.env.VITE_API_BASE_URL ??
    "",
  timeout: defaultTimeout,
  headers: {
    "Content-Type": "application/json",
  },
});

for (const client of [springApi, aiApi]) {
  client.interceptors.request.use((config) => {
    if (jwt) {
      config.headers.set("Authorization", `Bearer ${jwt}`);
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        jwt = null;
      }
      return Promise.reject(error);
    }
  );
}

export const authenticationService = {
  setJwt(token: string) {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      throw new Error("A non-empty JWT is required.");
    }
    jwt = normalizedToken;
  },
  clearJwt() {
    jwt = null;
  },
  hasJwt() {
    return jwt !== null;
  },
};

export async function checkHealth() {
  const response = await aiApi.get("/health");
  return response.data;
}

export async function investigateOrder(orderNumber: string) {
  const response = await aiApi.get(
    `/ai/investigate/${encodeURIComponent(orderNumber)}`
  );
  return response.data;
}

export async function runMultiAgentInvestigation(orderNumber: string) {
  const response = await aiApi.get(
    `/ai/agents/investigate/${encodeURIComponent(orderNumber)}`
  );
  return response.data;
}

export async function askPolicyQuestion(question: string) {
  const response = await aiApi.post("/ai/ask", { question });
  return response.data;
}

export async function createWorkflow(orderNumber: string) {
  const response = await aiApi.post(
    `/ai/create-workflow/${encodeURIComponent(orderNumber)}`
  );
  return response.data;
}

export async function investigateOrderBasic(orderNumber: string) {
  const response = await aiApi.get(
    `/investigate/${encodeURIComponent(orderNumber)}`
  );
  return response.data;
}

export const orderService = {
  investigate: investigateOrder,
};

export const investigationService = {
  investigate: investigateOrder,
  runMultiAgent: runMultiAgentInvestigation,
};

export const policyService = {
  ask: askPolicyQuestion,
};

export const workflowService = {
  requestProposal: createWorkflow,
};

export default aiApi;
