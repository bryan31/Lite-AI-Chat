export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  images?: string[]; // Base64 strings for INPUT images
  generatedImage?: string; // Base64 string for OUTPUT image
  timestamp: number;
  groundingSources?: GroundingSource[];
  isError?: boolean;
}

export interface ModelConfig {
  imageMode: boolean;
  webSearch: boolean;
}

export type Theme = 'light' | 'dark';

// Model constants for easier management
export const MODELS = {
  GEMINI_3_PRO: 'gemini-3-pro-preview',
  GEMINI_2_5_PRO: 'gemini-2.5-pro', // Mapping 2.5 Pro request to current 2.0 Pro Exp
  GEMINI_2_5_FLASH: 'gemini-2.5-flash',
  GEMINI_IMAGE: 'gemini-2.5-flash-image',
};