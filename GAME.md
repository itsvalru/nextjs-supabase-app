# 💖 Poly Game — Full Game Flow & Logic Spec

## 🎯 Core Concept

- 3-player turn-based question game with synchronized rounds.
- Players answer, guess, or dare each other in a rotating loop.
- The game always waits for required players before progressing.
- A **“Ready X/3” indicator** is shown at all times.
- No one can skip phases — game flow is strict.

---

## 🌀 Round Rotation (Strict Mode)

- Total **9 rounds per game**, rotating through:
  1️⃣ **Guess Me**  
  2️⃣ **Would You Rather**  
  3️⃣ **Dare**
- This cycle repeats **3 times** (9 rounds total).
- No repeated questions within the same game.
- **Dare player rotates** every Dare round.

---

## 🕵️‍♂️ Guess Me — Flow

1. **Answer Phase**

   - All 3 players answer the question **in secret**.
   - ✅ Game waits until **all 3 submitted**.

2. **Reveal & Vote Phase (One by One)**
   - Show **one answer at a time**.
   - The other 2 players guess **who wrote it** (secretly).
   - ✅ Game waits for both guesses.
   - Reveal the correct author + award points.
   - ✅ All 3 players press **“Continue”**.
   - Proceed to next answer.
3. **After Last Answer**
   - Once the **third answer is revealed** and all clicked **“Continue”**,
   - Game **automatically moves to Would You Rather**.

---

## ❓ Would You Rather — Flow

1. **Selection Phase**

   - All 3 players select their answer **in secret**.
   - ✅ Game waits until **all 3 submitted**.

2. **Guessing Phase**

   - All players guess **which option was most selected**.
   - ✅ Wait for all guesses.
   - Reveal the correct majority + who guessed right.
   - Award points.

3. **Continue**
   - ✅ All players press **“Continue”**.
   - Game **automatically moves to Dare**.

---

## 🎭 Dare — Flow

1. **Dare Phase**

   - The selected player receives a Dare.
   - Only **this player** sees **“Completed”** or **“Declined”** buttons.
   - ✅ Game waits for this player’s choice.

2. **Resolution**

   - Award or deduct points based on action.
   - ✅ All players press **“Continue”**.

3. **Next Round**
   - Game **automatically moves back to Guess Me** for the next cycle.

---

## 🔄 Multiplayer Sync Rules

- ✅ Guess Me / Would You Rather: **All players must submit**.
- ✅ Dare: **Only the Dare target submits**.
- ✅ After phase completion: **All players must press “Continue”**.
- ✅ Show a **“Ready X/3” counter** for every phase.
- ✅ Game progresses only after all required actions.
- No phase skipping allowed.

---

## ✅ Implementation Checklist

- [ ] Player action state tracker (submitted / not)
- [ ] Phase-based game state manager
- [ ] Real-time sync system (Socket.io or Supabase Realtime)
- [ ] Mode logic for Guess Me, Would You Rather, Dare
- [ ] Points awarded after each result phase
- [ ] Question pool manager (unique questions per game)
- [ ] Dare target rotation logic
- [ ] Continue buttons enforced after phase completion

---

If needed, I can also provide a JSON game state structure example!
