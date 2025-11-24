
export interface Attachment {
  name: string;
  type: string;
  data: string; // Base64 data URL
}

export interface User {
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Source {
  title: string;
  uri: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  attachments?: Attachment[];
  sources?: Source[];
}

export interface Consultation {
  id: string;
  title: string;
  category: string;
  date: string;
  summary: string;
  messages: ChatMessage[];
}
