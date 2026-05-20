# Project Stronger
## Product Requirements Document & Technical Specification

### 1. Project Philosophy & Overview
Project Stronger is a closed-loop feedback system designed to enforce personal discipline through a "Carrot and Stick" financial model. It treats daily productivity as a quantifiable "yield" (Y), where performance dictates a daily remuneration capped at ₹1,000. It acts as a journaling, self-discipline, and tracking interface to gamify and monetize daily routines and tasks.

### 2. System Architecture & Tech Stack
*   **Environment:** Web-based (Responsive for Mobile/Desktop).
*   **Deployment:** Vercel (Frontend & Serverless logic).
*   **Database:** Supabase (PostgreSQL) for relational task history and state persistence.
*   **Authentication:** Supabase Auth to support online hosting and secure access. The architecture must be scalable and multi-tenant to support onboarding multiple users in the future.
*   **External Integration:** 
    *   Google Calendar API (OAuth2) for time-blocking.
    *   Apple Calendar Integration (via a generated public calendar URL where updates are automatically pushed from the app).

### 3. Visual Design & UX
The UI must feel like it was designed by Apple—premium, intuitive, and clean.

*   **Theme:** **Apple Dark Mode Aesthetic**: Sleek dark/greyish backgrounds (e.g., `#1C1C1E`) with subtle translucent overlay panels and cards (e.g., `#2C2C2E`) featuring frosted glass (glassmorphism) effects.
*   **Accent Colors:** 
    *   **Subtle Blue**: Primary actions and UI lines
    *   **Soft Green**: Success
    *   **Muted Red**: Damage / Postponed
    *   **Warm Amber**: Partial completion
*   **Typography:** 
    *   Headlines & Body: *San Francisco (SF Pro)* or *Inter* for an Apple-native feel.
*   **Borders:** Subtle translucent borders (e.g., `rgba(255, 255, 255, 0.1)`) and soft drop shadows for depth and elevation.
*   **Transitions:** Smooth, fluid Apple-like animations (e.g., spring physics) for pop-ups and state changes.

---

### 4. Interface Modules

#### 4.1. Module A: Primary Input Shell (Alpha State / Morning Task Logging)
The mandatory morning entry to define the day's "Plant."
*   **Today's Highlight:** An optional one-liner defining what the day is about. This must be reflected in the chronicle view when viewing a day's full breakdown.
*   **Core Disciplines (Daily Tasks):** User-defined recurring tasks (e.g., Exercise). Auto-populates in a given day's Alpha state *only when that day actually begins*. Core disciplines must never be back-populated into previous days, as past task lists are strictly immutable once the day passes. Includes a "Delete" icon for one-off exceptions.
*   **Variable Objectives:** New tasks specifically allocated for the day.
*   **Carry-Over / Postponed Tasks:** Any tasks postponed from previous days or remainder portions of Power tasks will automatically appear in the respective day's Alpha state.
*   **Task Interface (Pop-up upon clicking a task):**
    *   **Name & Tag:** String & Metadata (Optional).
    *   **Time Block:** A checkbox that, when ticked, displays Start/End time inputs to block the calendar. Any status updates (time added, modified, or deleted) must automatically sync and reflect in the external calendar.
    *   **Recurrence:** Dropdown `[None, Daily, Weekly, Monthly]`.
    *   **Classification:** 
        1.  **Normal:** Displays "Weight" field.
        2.  **Power:** Very challenging tasks. No weight field initially. (See Logic Engine for multiplier details).
        3.  **Kickass:** Displays "Damage" field (in ₹).
        4.  **Uncritical:** No monetary value; purely for tracking.

#### 4.2. Module B: State Evaluation Review (Omega State / Evening Reflection)
Reflection and finalization of the data loop. Must be done at night. Includes a date-changing feature to navigate to previous dates. Entries for the current day and the previous day (T-1) are modifiable; all older entries are strictly immutable.
*   **The Audit:**
    *   Tasks from the Morning Shell are listed.
    *   Clicking a task opens a "Result" window. Previous fields are Read-Only.
    *   **Status Dropdown:** `[Finished, Partly Done, Missed, Postponed Tomorrow, Postponed Later]`.
    *   **Postponed Later:** Triggers a Date Picker (`dd.mm.yy`).
    *   **Partly Done:** Triggers a number input/slider (1–99%).
    *   **Bonus Checkbox:** When ticked, multiplies a task's weight by a factor of 1.5 (`M_{bonus}`).
    *   **Notes:** Long answer field for task-specific notes.
    *   **Insights:**
    1.  **Knowledge Sink:** "What did I learn today?" (Text area + optional URL/Documentation link).
    2.  **Reflection:** Long-form answer box for reflecting on the day.
    3.  **The Epiphany (The "Easter Egg"):** A toggle/checkbox that reveals an optional high-level insight box.

#### 4.3. Module C: Longitudinal Pulse (Calendar & Tracking Dashboard)
Visualizing consistency and financial gain.
*   **The Grid (Chronicle/Calendar Interface):**
    *   **Red:** Entry is not logged at all.
    *   **Yellow:** Morning entry (Alpha state) completed, but evening reflection (Omega state) is pending.
    *   **Green:** Complete log entry (Alpha and Omega states done).
    *   Clicking a date shows an overview (Points earned, Today's Highlight). Under the "View Full Breakdown" section, there is a "View Log" button which redirects to the Omega state tab for that specific day's log (editable only if it is the current or previous day).
*   **The "Gatekeeper" Logic:** The remuneration amount for Day T is hidden until the user completes the Morning Task Logging for Day T+1.
*   **Analytics (Powered by Recharts for rich visualizations):** 
    *   Attendance table for "Core Disciplines" (Tracking consistency).
    *   **Weekly & Monthly Trends:** Visual charts (e.g., using Recharts) and analytics showing consistency trends and total earnings aggregated over time (weekly and monthly).
    *   **Day Statistics:** Daily breakdown for the current week, showing total remuneration received and total potential earnings (calculated as if all tasks were completed at 100% with bonuses).
    *   **Total earned with trend indicators**
    *   **Efficiency percentage vs potential**
    *   **Current streak tracking**
    *   **Daily performance visualizations**
    *   **Achievement stats & smart insights**
    *   **Cumulative "Money Earned" vs "Potential Earned."**
    *   **Remuneration Breakdown:** A dedicated view or modal showing the exact step-by-step mathematical calculation for the day's remuneration, ensuring complete transparency and foolproof validation of the logic.
    *   **Additional relevant insights or patterns.**

---

### 5. The Logic Engine (The Mathematical Core)
The system calculates daily payout using strict operations to ensure the "Carrot and Stick" framework works seamlessly. The base remuneration from Normal tasks is capped at ₹1,000 per day; however, multipliers from Power tasks can cause the final payout to exceed this cap.

#### 5.1. Variable Definitions
*   `W_i`: Manual weight assigned to a Normal task.
*   `P_i`: Completion percentage (0.0 to 1.0).
*   `D`: Damage value (in ₹) of a Kickass task.
*   `M_{power}`: Multiplier from Power tasks (`1.0 + P_{power}`). E.g., 60% done = 1.6x multiplier.
*   `M_{bonus}`: Bonus multiplier (`1.5`) if the bonus checkbox is ticked for a specific task.

#### 5.2. Order of Operations
1.  **Calculate Base Points (B):** Sum the completed weights of all Normal tasks.
    *   *Note: If no weights are assigned, system defaults to an even distribution of ₹1,000 across all tasks.*
2.  **Calculate Point-to-Rupee Conversion:** Convert earned points into a base rupee amount. (e.g., if total assigned weights = 10, then 1 weight = ₹100).
3.  **Incorporate Liability (Stick):** Subtract all "Damage" (`D`) from Kickass tasks that are NOT 100% complete. No partial cases—if a Kickass task is 99% done, the full damage is deducted.
4.  **Apply Catalyst (Carrot):** Multiply the subtotal by the Power task multiplier (`M_{power}`). Each completed Power task multiplies the total by a factor of 2.
    *   *Example Calculation:* If base Normal tasks earned ₹800, 2 Power tasks were finished (Multiplier = 2 * 2 = 4), and a Kickass task was missed (Damage = ₹50). The remuneration received is: `2 * 2 * (800 - 50) = 4 * 750 = ₹3000`.

#### 5.3. Temporal Decay & Transfer Logic
*   **Partial/Missed Transfer:** Any task not marked "Finished" must be transferred to a future date (either tomorrow or a selected date).
    *   *Power Task Remainder:* If a Power task is partly done (e.g., 60%), the remaining portion (40%) transfers to the next day as a **Normal** task.
*   **Manual Weighting:** The user manually inputs the weight for the transferred normal task on the new day.
*   **Decay Factor:** The system automatically applies a `0.9` multiplier to the remaining weight for every consecutive day a task is delayed. (Formula: `Remaining Weight * (0.9 ^ n)`, where `n` = consecutive days delayed). Transferred tasks have a visual label showing delay history and are marked in Yellow. Postponed tasks are marked in Red with the original date.

---

### 6. Data Schema (Supabase/PostgreSQL)
*   **Table: Profiles (Future-Proofing)**
    *   `id` (FK to auth.users), `role` (enum: 'logger', 'approver'), `approver_email` (string, nullable), `approver_status` (enum: 'pending', 'accepted').
*   **Table: Tasks**
    *   `id`, `user_id`, `name`, `type`, `weight`, `damage`, `recurrence`, `status`, `original_date`, `is_transfer` (bool), `delay_count` (int).
*   **Table: DailyLogs**
    *   `id`, `user_id`, `date`,  `learning_notes`, `reflection`, `epiphany`, `is_remunerated` (bool), `status` (enum: 'draft', 'submitted', 'approved').
*   **Table: Earnings**
    *   `id`, `user_id`, `date`, `amount_earned`, `multiplier_applied`, `total_damage`.

---

### 7. Compliance & Edge Cases
*   **The "Edit" Window:** Entries can be modified multiple times throughout the day. However, they are officially Locked once the "Next Day" morning log is started and remuneration is approved/revealed.
*   **Zero Weight Case:** If no weights are assigned, the system defaults to an even distribution of the ₹1,000 across all tasks.
*   **The "Stick" Priority:** If Damage exceeds Base Earnings, the day results in a negative carry-over to the next day's earnings.

---

### 8. Testing & Validation Workflow
To ensure system integrity, execute this comprehensive end-to-end test script. It is broken down into specific lifecycle phases.

#### Phase 1: Alpha State Initialization (Morning Routine)
1.  **Core Discipline Auto-Population:** Open the app on a new day. Verify that all defined Core Disciplines automatically appear.
2.  **Highlight Addition:** Enter a "Today's Highlight" text. Save and verify it persists.
3.  **Task Creation (All Types):** Create one of each task type: Normal (assign weight), Power (no weight), Kickass (assign damage), and Uncritical.
4.  **Calendar Sync (Create):** For the 'Normal' task, tick the "Time Block" checkbox. Input a Start and End time. Verify that the event immediately pushes to the connected Google/Apple Calendar.
5.  **Calendar Sync (Update/Delete):** Edit the time block for that Normal task. Verify the external calendar updates the existing event (no duplicates). Delete the time block and verify the external calendar event is removed.
6.  **Task Immutability Check:** Edit the name of the 'Uncritical' task. Verify in the database that the existing record was updated, rather than a new duplicate record being created.

#### Phase 2: Omega State Execution (Evening Routine)
7.  **Data Persistence:** Switch to the Omega State tab. Verify all tasks created in Phase 1 appear exactly as entered (Read-Only mode for the initial fields).
8.  **Status Updates:** 
    *   Mark the Normal task as `Finished`. Check the Bonus Checkbox.
    *   Mark the Power task as `Partly Done` and use the slider to set it to 60%.
    *   Mark the Kickass task as `Missed`.
    *   Mark the Uncritical task as `Postponed Tomorrow`.
9.  **Notes & Insights:** Add text to the Task Notes. Fill out the Knowledge Sink, Reflection, and toggle the Epiphany checkbox to enter an epiphany.
10. **Submission:** Submit the Omega state log.

#### Phase 3: Chronicle & Analytics Verification
11. **Color Coding Check:** Open the Calendar/Chronicle. Verify today's date is now Green. (Verify that a day with only Alpha state is Yellow, and a day with no entries is Red).
12. **Chronicle Navigation:** Click on today's Green date. Verify the Overview overlay displays the correct Points Earned and the "Today's Highlight."
13. **View Log Redirect:** Click the "View Log" button inside the breakdown. Verify it redirects exactly to today's Omega State.
14. **Analytics Validation:** Navigate to the Analytics tab. Check the "Day Statistics" and verify the visual charts accurately reflect the newly submitted data.
15. **Remuneration Breakdown (Logic Engine Test):** Open the Remuneration Breakdown view for today and verify the math:
    *   *Base:* Check that the Normal task weight (x1.5 bonus) is calculated correctly.
    *   *Stick:* Check that the Kickass task damage is fully deducted from the base.
    *   *Carrot:* Check that the 60% completed Power task adds a 1.6x multiplier (or whatever logic factor). 
    *   *Cap Check:* Ensure the base Normal task value did not exceed ₹1,000 before the Power multiplier was applied.

#### Phase 4: Time Travel & Carry-Over Logic
16. **T-1 Edit Test:** Use the Omega state date-picker to go to yesterday (T-1). Make a modification and verify it saves successfully.
17. **Immutability Lock Test:** Use the date-picker to go to 2 days ago (T-2). Verify the entire interface is strictly Read-Only and no edits can be made.
18. **Next Day Auto-Population:** Simulate advancing to the next day (T+1) and open the Alpha state.
19. **Carry-Over Verification:** 
    *   Verify the Uncritical task (Postponed) appears automatically.
    *   Verify the remaining 40% of yesterday's Power task appears as a *Normal* task.
20. **Decay Factor Test:** Assign a weight to the carried-over Normal task. Postpone it again. On T+2, verify its effective weight has automatically been multiplied by the `0.9` decay factor.

---

### 9. Future Roadmap: The "Approver" Workflow
The architecture has been designed with multi-user scalability in mind to support a future "Review & Approve" authorization model.
*   **Roles:** The system will support two roles: `Loggers` (current user profile) and `Approvers`.
*   **Profile Configuration:** The Profile tab will allow a Logger to input an Approver's email ID. This sends an invitation request to the Approver.
*   **The Approval Gate:** Once the Approver accepts the invitation, the remuneration unlock logic shifts. The Logger's reward is no longer instantly unlocked upon submitting the next day's log. Instead, the reward is held in a "Pending" state.
*   **Review Process:** The Approver can log in, view the Logger's Omega state entries for the day, and hit "Approve". Only upon approval are the financial rewards officially released and marked green in the calendar. 
*   *Note: This feature is slated for a future phase, but the database schema (e.g., `Profiles` table with role definitions and status tracking) and scalable authentication model are established now to accommodate it seamlessly.*
