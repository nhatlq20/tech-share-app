import { API_BASE_URL, getApiAuthToken, apiClient } from "../config/api";
import { AIComparison, AIReview } from "../types/ai";

interface AIReviewResponse {
  message: string;
  data: AIReview;
}

interface AIComparisonResponse {
  message: string;
  data: AIComparison;
}

export interface GenerateDescriptionPayload {
  name: string;
  brand: string;
  category: string;
  pricePerDay: number;
  depositAmount: number;
  specs: Record<string, string>;
}

export interface GenerateDescriptionResponse {
  message: string;
  description: string;
}

export interface AIConsultRecommendation {
  device: {
    _id: string;
    name: string;
    pricePerDay: number;
    images?: string[];
    image?: string;
  };
  reason: string;
}

export interface AIConsultResponse {
  success?: boolean;
  reply?: string;
  message?: string;
  recommendations?: AIConsultRecommendation[];
}

export class AIServiceError extends Error {
  status: number;

  constructor(status: number) {
    super(`AI request failed with status ${status}`);
    this.name = "AIServiceError";
    this.status = status;
  }
}

export async function getAIReview(deviceId: string): Promise<AIReview> {
  const response = await apiClient.post<AIReviewResponse>(
    `/ai/summarize-review/${encodeURIComponent(deviceId)}`,
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error("Unable to generate AI review");
  }

  return response.data.data;
}

export async function compareDevices(
  deviceId1: string,
  deviceId2: string,
): Promise<AIComparison> {
  const token = getApiAuthToken();
  const response = await fetch(`${API_BASE_URL}/ai/compare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ deviceId1, deviceId2 }),
  });

  if (!response.ok) {
    throw new AIServiceError(response.status);
  }

  const result = (await response.json()) as AIComparisonResponse;
  return result.data;
}

export async function consultRentalAssistant(
  message: string,
): Promise<AIConsultResponse> {
  // The current backend registers this handler at /api/ai/consultant.
  const response = await apiClient.post<AIConsultResponse>("/ai/consultant", {
    message,
  });

  if (response.data.success === false) {
    throw new Error("Unable to get rental recommendations");
  }

  return response.data;
}

export async function generateDescription(
  data: GenerateDescriptionPayload,
): Promise<GenerateDescriptionResponse> {
  const response = await apiClient.post<GenerateDescriptionResponse>(
    "/ai/generate-description",
    data,
    { timeout: 60000 },
  );

  if (typeof response.data.description !== "string" || !response.data.description.trim()) {
    throw new Error("The server did not return a device description.");
  }

  return response.data;
}
