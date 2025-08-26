import { apiRequest } from "./queryClient";
import type { GeneratePromptRequest, Template, Prompt } from "@shared/schema";

export async function generatePrompt(request: GeneratePromptRequest) {
  const response = await apiRequest("POST", "/api/prompts/generate", request);
  return response.json();
}

export async function getTemplates(): Promise<Template[]> {
  const response = await apiRequest("GET", "/api/templates");
  return response.json();
}

export async function getRecentPrompts(limit?: number): Promise<Prompt[]> {
  const url = limit ? `/api/prompts/recent?limit=${limit}` : "/api/prompts/recent";
  const response = await apiRequest("GET", url);
  return response.json();
}

export async function deletePrompt(id: string) {
  const response = await apiRequest("DELETE", `/api/prompts/${id}`);
  return response.json();
}

export async function updatePrompt(id: string, updates: Partial<Prompt>) {
  const response = await apiRequest("PUT", `/api/prompts/${id}`, updates);
  return response.json();
}

// Authentication API functions
export async function login(email: string, password: string) {
  const response = await apiRequest("POST", "/api/auth/login", { email, password });
  return response.json();
}

export async function signup(email: string, password: string) {
  const response = await apiRequest("POST", "/api/auth/register", { email, password });
  return response.json();
}

export async function logout() {
  const response = await apiRequest("POST", "/api/auth/logout");
  return response.json();
}

export async function getCurrentUser() {
  const response = await apiRequest("GET", "/api/auth/me");
  return response.json();
}

// API Key management functions
export async function getUserApiKeys() {
  const response = await apiRequest("GET", "/api/auth/api-keys");
  return response.json();
}

export async function addUserApiKey(service: string, apiKey: string, keyName?: string) {
  const response = await apiRequest("POST", "/api/auth/api-keys", { 
    service, 
    apiKey, 
    keyName 
  });
  return response.json();
}

export async function deleteUserApiKey(keyId: string) {
  const response = await apiRequest("DELETE", `/api/auth/api-keys/${keyId}`);
  return response.json();
}
