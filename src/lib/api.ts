import type {
  HealthDocument,
  MedicalValue,
  HealthMeasurement,
  NutritionPreferences,
  DailyMealPlan,
  BiomarkerNutritionPlan,
  WellnessHabit,
  ChatMessage,
  AgentExecutionTrace,
  EvaluationSummary
} from '../types';

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {})
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(endpoint, {
    ...options,
    credentials: 'include', // Always transmit healthmate_session HttpOnly cookie
    headers
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Network request failed' }));
    throw new Error(errorData.error || errorData.message || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Session & Guest User
  async getCurrentSession(): Promise<{ guest: { id: string; displayName: string; sessionId: string; isAnonymous: boolean } }> {
    return apiRequest('/api/session/current');
  },

  async getProfile(): Promise<{ profile: any }> {
    return apiRequest('/api/user/profile');
  },

  async updateProfile(profile: any): Promise<{ success: boolean; profile: any }> {
    return apiRequest('/api/user/profile', {
      method: 'POST',
      body: JSON.stringify(profile)
    });
  },

  async resetData(): Promise<any> {
    return apiRequest('/api/user/reset', {
      method: 'POST'
    });
  },

  // Documents
  async getDocuments(): Promise<HealthDocument[]> {
    const data = await apiRequest<{ documents: HealthDocument[] }>('/api/documents');
    return data.documents;
  },

  async uploadDocument(file: File): Promise<HealthDocument> {
    const formData = new FormData();
    formData.append('file', file);
    const data = await apiRequest<{ document: HealthDocument }>('/api/documents/upload', {
      method: 'POST',
      body: formData
    });
    return data.document;
  },

  async updateExtractedValue(docId: string, valId: string, updates: Partial<MedicalValue>): Promise<MedicalValue> {
    const data = await apiRequest<{ value: MedicalValue }>(`/api/documents/${docId}/values/${valId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    return data.value;
  },

  async verifyDocument(docId: string): Promise<HealthDocument> {
    const data = await apiRequest<{ document: HealthDocument }>(`/api/documents/${docId}/verify`, {
      method: 'POST'
    });
    return data.document;
  },

  async deleteDocument(docId: string): Promise<void> {
    await apiRequest(`/api/documents/${docId}`, {
      method: 'DELETE'
    });
  },

  // Chat & AI Assistant
  async sendChatMessage(message: string, history: any[], enableMemory: boolean = false): Promise<ChatMessage> {
    const data = await apiRequest<{ message: ChatMessage }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history, enableMemory })
    });
    return data.message;
  },

  async getChatHistory(): Promise<ChatMessage[]> {
    const data = await apiRequest<{ messages: ChatMessage[] }>('/api/chat/history');
    return data.messages;
  },

  async clearChatHistory(): Promise<void> {
    await apiRequest('/api/chat/history', { method: 'DELETE' });
  },

  // Measurements & Tracker
  async getMeasurements(): Promise<HealthMeasurement[]> {
    const data = await apiRequest<{ measurements: HealthMeasurement[] }>('/api/tracker');
    return data.measurements;
  },

  async addMeasurement(measurement: Partial<HealthMeasurement>): Promise<HealthMeasurement> {
    const data = await apiRequest<{ measurement: HealthMeasurement }>('/api/tracker', {
      method: 'POST',
      body: JSON.stringify(measurement)
    });
    return data.measurement;
  },

  async deleteMeasurement(id: string): Promise<void> {
    await apiRequest(`/api/tracker/${id}`, {
      method: 'DELETE'
    });
  },

  // Food & Nutrition
  async getNutritionPreferences(): Promise<{ preferences: NutritionPreferences | null; biometrics?: any }> {
    return apiRequest<{ preferences: NutritionPreferences | null; biometrics?: any }>('/api/nutrition/preferences');
  },

  async getBiomarkerPlans(): Promise<BiomarkerNutritionPlan[]> {
    const data = await apiRequest<{ biomarkerPlans: BiomarkerNutritionPlan[] }>('/api/nutrition/biomarker-plans');
    return data.biomarkerPlans || [];
  },

  async getMealPlan(): Promise<DailyMealPlan | null> {
    const data = await apiRequest<{ mealPlan: DailyMealPlan | null }>('/api/nutrition/mealplan');
    return data.mealPlan;
  },

  async generateMealPlan(preferences: NutritionPreferences, biometrics?: any): Promise<DailyMealPlan> {
    const data = await apiRequest<{ mealPlan: DailyMealPlan }>('/api/nutrition/generate', {
      method: 'POST',
      body: JSON.stringify({ preferences, biometrics })
    });
    return data.mealPlan;
  },

  // Wellness Planner
  async getWellnessHabits(): Promise<WellnessHabit[]> {
    const data = await apiRequest<{ habits: WellnessHabit[] }>('/api/wellness/habits');
    return data.habits;
  },

  async updateWellnessHabit(habitId: string, updates: Partial<WellnessHabit>): Promise<WellnessHabit> {
    const data = await apiRequest<{ habit: WellnessHabit }>(`/api/wellness/habits/${habitId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    return data.habit;
  },

  async addWellnessHabit(habit: Partial<WellnessHabit>): Promise<WellnessHabit> {
    const data = await apiRequest<{ habit: WellnessHabit }>('/api/wellness/habits', {
      method: 'POST',
      body: JSON.stringify(habit)
    });
    return data.habit;
  },

  // Reports & Insights
  async getReportsSummary(timeRange: string = '30d'): Promise<any> {
    return apiRequest(`/api/reports/summary?range=${timeRange}`);
  },

  // LLM Lab Endpoints
  async runPromptPlayground(systemPrompt: string, userPrompt: string, temperature?: number): Promise<{ response: string; latencyMs: number }> {
    return apiRequest('/api/lab/prompt', {
      method: 'POST',
      body: JSON.stringify({ systemPrompt, userPrompt, temperature })
    });
  },

  async inspectRAG(query: string, topK: number = 3): Promise<any> {
    return apiRequest('/api/lab/rag-inspect', {
      method: 'POST',
      body: JSON.stringify({ query, topK })
    });
  },

  async compareLLMvsRAG(query: string): Promise<any> {
    return apiRequest('/api/lab/compare-rag', {
      method: 'POST',
      body: JSON.stringify({ query })
    });
  },

  async visualizeRouting(query: string): Promise<any> {
    return apiRequest('/api/lab/routing', {
      method: 'POST',
      body: JSON.stringify({ query })
    });
  },

  async executeToolLab(toolName: string, args: any): Promise<any> {
    return apiRequest('/api/lab/execute-tool', {
      method: 'POST',
      body: JSON.stringify({ toolName, args })
    });
  },

  async getMemoryInspector(): Promise<any> {
    return apiRequest('/api/lab/memory');
  },

  async updateMemoryConsent(allowed: boolean): Promise<any> {
    return apiRequest('/api/lab/memory/consent', {
      method: 'POST',
      body: JSON.stringify({ allowed })
    });
  },

  async clearUserMemory(): Promise<any> {
    return apiRequest('/api/lab/memory', { method: 'DELETE' });
  },

  async runEvaluationSuite(): Promise<EvaluationSummary> {
    const data = await apiRequest<{ summary: EvaluationSummary }>('/api/lab/evaluation/run', {
      method: 'POST'
    });
    return data.summary;
  },

  async getObservabilityTraces(): Promise<AgentExecutionTrace[]> {
    const data = await apiRequest<{ traces: AgentExecutionTrace[] }>('/api/lab/observability');
    return data.traces;
  }
};
