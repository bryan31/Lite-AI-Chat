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
  thinking?: string;
  groundingSources?: GroundingSource[];
  isError?: boolean;
}

export interface ModelConfig {
  imageMode: boolean;
  webSearch: boolean;
  thinking: boolean;
}

export type Theme = 'light' | 'dark';