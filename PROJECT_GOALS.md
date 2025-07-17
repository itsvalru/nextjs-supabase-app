# Project Goals & Checklist: Third Wheel Royale

A playful, romantic question-answer game for three players (You, Girlfriend, Potential Partner) with rotating rounds and real-time interaction.

---

## Core Features

- [x] **Room System**

  - [x] Create a room (with option for permanent or temporary)
  - [x] Join a room via invite link
  - [x] No login required (all user/session data via cookies)

- [x] **User Management**

  - [x] Select name and avatar (default: first letter of name)
  - [x] User created in Supabase on first join/create
  - [x] Token saved in cookies for user identification
  - [x] Admin status, name, and lobby info stored in cookies

- [ ] **Game Flow**

  - [ ] 3-player support (You, Girlfriend, Potential Partner)
  - [ ] **Strict mode rotation:**
    - [ ] 9 rounds per game: guess_me → would_you_rather → dare (repeat 3x)
    - [ ] Dare rotates to each player in turn
    - [ ] No question repeats within a game (9 unique questions)
  - [ ] **Guess Me:**
    - [ ] Players answer in secret
    - [ ] After all submit, one answer at a time is revealed for secret voting (who does it belong to?)
    - [ ] After voting, reveal votes and correct answer, then continue to next answer
  - [ ] **Would You Rather:**
    - [ ] Players select in secret
    - [ ] After all submit, players vote for what they think was most selected
    - [ ] Reveal results to everyone
  - [ ] **Dare:**
    - [ ] Selected player must complete the dare
    - [ ] Player can press completed or declined
    - [ ] Dare rotates to each player each round
  - [ ] Private answer & reveal phase
  - [ ] Custom and rotating pool of questions
  - [ ] "Risk Cards" and "Confession Time" (optional spice)

- [ ] **Scoring & Leaderboard**

  - [ ] Points for correct guess, majority, dare, heart match
  - [ ] Leaderboard with cute emojis for 1st place
  - [ ] Animated emotes for reactions

- [ ] **Real-Time & Data Handling**

  - [ ] All questions, points, lobby, and user data in Supabase
  - [ ] Real-time updates for questions & scores

- [ ] **UI/UX & Theming**
  - [ ] Soft romantic aesthetic (animated hearts, sparkles)
  - [ ] Sound effects for round progress (pop, sparkle)
  - [ ] Responsive, mobile-friendly design

---

## Technical Checklist

- [x] Next.js frontend setup
- [x] Supabase backend integration
- [x] Cookie/session management (no login)
- [x] Room/lobby logic
- [x] User creation & token logic
- [ ] Game round logic & state
- [ ] Real-time sync (Supabase subscriptions)
- [ ] Scoring & leaderboard logic
- [ ] Theming, animations, and sound effects
- [ ] Testing & polish

---

## Stretch Goals

- [ ] Custom question submission
- [ ] "Risk Cards" and "Confession Time" rounds
- [ ] Emoji/emote reactions
- [ ] Shareable results/recap

---

_This file acts as a living checklist and planning document for the Third Wheel Royale project. Update as features are completed!_
