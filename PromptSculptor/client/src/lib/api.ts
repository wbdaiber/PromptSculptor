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

export async function createTemplate(templateData: {
  name: string;
  type: string;
  description: string;
  icon: string;
  iconColor: string;
  sampleInput: string;
  promptStructure: any;
  userId?: string;
  isDefault?: boolean;
}): Promise<Template> {
  const response = await apiRequest("POST", "/api/templates", templateData);
  return response.json();
}

export async function updateTemplate(id: string, templateData: {
  name?: string;
  type?: string;
  description?: string;
  icon?: string;
  iconColor?: string;
  sampleInput?: string;
  promptStructure?: any;
}): Promise<Template> {
  const response = await apiRequest("PUT", `/api/templates/${id}`, templateData);
  return response.json();
}

export async function deleteTemplate(id: string) {
  const response = await apiRequest("DELETE", `/api/templates/${id}`);
  return response.json();
}

export async function getRecentPrompts(limit?: number): Promise<Prompt[]> {
  const url = limit ? `/api/prompts/recent?limit=${limit}` : "/api/prompts/recent";
  const response = await apiRequest("GET", url);
  return response.json();
}

export async function getFavoritePrompts(limit?: number): Promise<Prompt[]> {
  const url = limit ? `/api/prompts/favorites?limit=${limit}` : "/api/prompts/favorites";
  const response = await apiRequest("GET", url);
  return response.json();
}

export async function togglePromptFavorite(id: string, isFavorite: boolean): Promise<Prompt> {
  const response = await apiRequest("PATCH", `/api/prompts/${id}/favorite`, { isFavorite });
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

export async function signup(username: string, email: string, password: string) {
  const response = await apiRequest("POST", "/api/auth/register", { username, email, password });
  return response.json();
}

export async function logout() {
  const response = await apiRequest("POST", "/api/auth/logout");
  return response.json();
}

export async function getCurrentUser() {
  try {
    const response = await apiRequest("GET", "/api/auth/me");
    return response.json();
  } catch (error: any) {
    // 401 is expected for guest users - return null instead of throwing
    if (error.message?.includes('401') || error.message?.includes('Authentication failed')) {
      return { user: null };
    }
    throw error;
  }
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

// Password and Account management functions
export async function changePassword(currentPassword: string, newPassword: string) {
  const response = await apiRequest("PATCH", "/api/auth/change-password", { 
    currentPassword, 
    newPassword 
  });
  return response.json();
}

export async function deleteAccount(password: string) {
  const response = await apiRequest("DELETE", "/api/auth/account", { password });
  return response.json();
}

// Password recovery functions
export async function forgotPassword(email: string) {
  const response = await apiRequest("POST", "/api/auth/forgot-password", { email });
  return response.json();
}

export async function resetPassword(token: string, newPassword: string) {
  const response = await apiRequest("POST", "/api/auth/reset-password", { token, newPassword });
  return response.json();
}
