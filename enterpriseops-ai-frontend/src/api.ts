
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function checkHealth() {
  const response = await api.get("/health");
  return response.data;
}

export async function investigateOrder(orderNumber: string) {
  const response = await api.get(
    `/ai/investigate/${encodeURIComponent(orderNumber)}`
  );
  return response.data;
}

export async function runMultiAgentInvestigation(orderNumber: string) {
  const response = await api.get(
    `/ai/agents/investigate/${encodeURIComponent(orderNumber)}`
  );
  return response.data;
}

export async function askPolicyQuestion(question: string) {
  const response = await api.post("/ai/ask", { question });
  return response.data;
}

export async function createWorkflow(orderNumber: string) {
  const response = await api.post(
    `/ai/create-workflow/${encodeURIComponent(orderNumber)}`
  );
  return response.data;
}

export async function investigateOrderBasic(orderNumber: string) {
  const response = await api.get(
    `/investigate/${encodeURIComponent(orderNumber)}`
  );
  return response.data;
}

export default api;
