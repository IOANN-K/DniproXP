export type QuestCategory = {
  id: string;
  name: string;
  description: string;
  icon: "leaf" | "heart" | "paw" | "palette" | "book" | "building";
  color: string;
};
export type Organization = {
  id: string;
  name: string;
  description: string;
  initials: string;
};
export type User = {
  id: string;
  name: string;
  xp: number;
  level: number;
  questsCompleted: number;
  initials: string;
};
export type Quest = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  organizationId: string;
  district: string;
  address: string;
  date: string;
  duration: string;
  difficulty: "Легкий" | "Середній" | "Складний";
  xp: number;
  capacity: number;
  participants: number;
  image: string;
  imageAlt: string;
  status: "available" | "completed";
  requirements: string[];
  bring: string[];
  coordinates: [number, number];
};
export type Participation = {
  id: string;
  questId: string;
  userId: string;
  status: "registered" | "confirmed";
  createdAt: string;
};
export type Achievement = {
  id: string;
  name: string;
  description: string;
  target: number;
  icon: "sprout" | "flame" | "trophy";
};
export type Reward = {
  id: string;
  name: string;
  description: string;
  cost: number;
  organizationId: string;
};
