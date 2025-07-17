import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface User {
  id: string;
  name: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  name: string;
  is_permanent: boolean;
  admin_user_id: string;
  current_round: number;
  game_state: "waiting" | "playing" | "finished";
  used_question_ids?: string[];
  winner_user_id?: string;
  is_tie?: boolean;
  final_scores?: any;
  game_settings?: any;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  user_id: string;
  room_id: string;
  role: "you" | "girlfriend" | "potential_partner";
  score: number;
  joined_at: string;
}

export interface Question {
  id: string;
  text: string;
  type: "guess_me" | "would_you_rather" | "dare";
  category?: string;
  created_at: string;
}

export interface GameRound {
  id: string;
  room_id: string;
  round_number: number;
  question_id: string;
  mode: "guess_me" | "would_you_rather" | "dare";
  answers: Record<string, any>;
  guesses: Record<string, any>;
  scores: Record<string, number>;
  status: "answering" | "guessing" | "revealing" | "scoring" | "completed";
  created_at: string;
  updated_at: string;
}
