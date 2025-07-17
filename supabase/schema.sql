-- USERS TABLE
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ROOMS TABLE
CREATE TABLE public.rooms (
  id text PRIMARY KEY,
  name text NOT NULL,
  is_permanent boolean NOT NULL DEFAULT false,
  admin_user_id uuid,
  current_round integer NOT NULL DEFAULT 0,
  game_state text NOT NULL DEFAULT 'waiting',
  winner_user_id uuid, -- <--- added for winner tracking
  is_tie boolean DEFAULT false, -- <--- added for tie detection
  final_scores jsonb, -- <--- added for final score storage
  game_settings jsonb DEFAULT '{"totalRounds": 9, "questionCategories": ["Alltag", "Spaß", "Persönlich", "Reisen", "Mutprobe", "Fitness", "Lifestyle"]}', -- <--- added for custom game settings
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  used_question_ids text[] DEFAULT '{}',
  dare_rotation_index integer DEFAULT 0
);

-- PLAYERS TABLE
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  room_id text NOT NULL,
  role text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now()
);

-- QUESTIONS TABLE
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  type text NOT NULL,
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  options text[]
);

-- GAME_ROUNDS TABLE
CREATE TABLE public.game_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  round_number integer NOT NULL,
  question_id uuid NOT NULL,
  mode text NOT NULL,
  answers jsonb,
  guesses jsonb,
  scores jsonb,
  status text NOT NULL DEFAULT 'answering',
  reveal_index integer, -- <--- added for per-answer reveal
  reveal_order text[], -- <--- added for randomized answer order
  dare_target_user_id uuid, -- <--- added for dare mode
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- FOREIGN KEY CONSTRAINTS
ALTER TABLE public.game_rounds
  ADD CONSTRAINT game_rounds_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id),
  ADD CONSTRAINT game_rounds_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id);

ALTER TABLE public.players
  ADD CONSTRAINT fk_players_user FOREIGN KEY (user_id) REFERENCES public.users(id),
  ADD CONSTRAINT players_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id),
  ADD CONSTRAINT players_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.users(id); 

-- INDEXES
CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);
CREATE UNIQUE INDEX rooms_pkey ON public.rooms USING btree (id);
CREATE UNIQUE INDEX players_pkey ON public.players USING btree (id);
CREATE UNIQUE INDEX players_user_id_room_id_key ON public.players USING btree (user_id, room_id);
CREATE UNIQUE INDEX game_rounds_pkey ON public.game_rounds USING btree (id);
CREATE UNIQUE INDEX questions_pkey ON public.questions USING btree (id); 