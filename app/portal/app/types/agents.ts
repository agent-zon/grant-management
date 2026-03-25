export interface Agent {
  id: string;
  name: string;
  description: string;
  region: string;
  company: string;
  tags: { key: string; value: string }[];
}