export type AiProviderName = 'claude' | 'gemini';

export interface AiProviderSide {
  model: string;
  models: { id: string; label: string }[];
  hasKey: boolean;
  /** Saved on this page, from the server's .env, or none. */
  keySource: 'settings' | 'env' | null;
  /** The key's last four characters — the key itself never leaves the server. */
  keyHint: string | null;
}

export interface AiProviderSettings {
  provider: AiProviderName;
  fallback: boolean;
  /** The order requests are tried in right now; empty means AI is off. */
  order: AiProviderName[];
  claude: AiProviderSide;
  gemini: AiProviderSide;
}

export interface AiProviderUpdate {
  provider?: AiProviderName;
  fallback?: boolean;
  claudeModel?: string;
  geminiModel?: string;
  /** A new key; an empty string removes the saved one. */
  claudeKey?: string;
  geminiKey?: string;
}

export interface AiProviderTestResult {
  ok: boolean;
  provider: AiProviderName;
  model: string;
  ms: number;
  reply?: string;
  error?: string;
}
