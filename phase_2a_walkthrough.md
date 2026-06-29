# Phase 2A Implementation Walkthrough: Automated Newsroom Scheduler

We have fully implemented and deployed the infrastructure, backend task queue, database schema, and frontend dashboard controls for **Phase 2A: Automated Newsroom Scheduler**. This completes the transition of the Newsroom Lab from manual-only workflow triggers to an autonomous, batch-processed pipeline under strict admin gates.

---

## 🛠️ Summary of Changes

### 1. Database Schema Extensions (`supabase/schema.sql`)
Added three core tables to handle automated workflow execution, run history tracking, and journalist quotas:
*   `journalist_schedules`: Holds per-journalist automation frequency (Daily, Weekly, Manual), preferred UTC hours, target weekdays, weekly quotas, maximum pending reviews, and next run calculation parameters.
*   `agent_jobs`: A task queue listing job types (`create_article`, `run_pipeline_step`), priority, and lock status.
*   `agent_runs`: A system log capturing execution results, created/processed job metrics, errors, and diagnostic messages.
*   *RLS Policies & Seed Data*: Enabled row-level security on the new tables and inserted seed schedules to initialize Anika Patel's daily queue parameters.

### 2. Batch-Processed Scheduler Function (`netlify/functions/agent-scheduler.ts`)
*   Runs on an hourly cron schedule (`@hourly`) managed by Netlify.
*   Determines which journalists are due for an article generation run based on preferred timezone, hour, and day constraints.
*   Checks safety guards: enforces maximum pending article reviews (defaulting to 2) and weekly publication quotas (defaulting to 5).
*   Enqueues new jobs in `agent_jobs` and processes them in micro-batches to fit comfortably within Netlify's 30-second execution limit.
*   Advances articles through the pipeline but strictly blocks them at the `awaiting_admin_review` gate.

### 3. Shared Lifecycle Modules (`netlify/functions/_shared/`)
Extracted workflow steps to allow both UI buttons and automated crons to execute identical logic:
*   `articleLifecycle.ts`: Handles the database creation and seeding of new articles.
*   `pipeline.ts`: Handles state-machine progression, factual validation checks, tone alignment checks, and Telegram notification dispatching.

### 4. Scheduler UI Controls (`JournalistProfileView.tsx`)
Created a new **Schedule & Quotas** tab under the Journalist Profile details to allow full customization:
*   **Enable Automation Toggle**: Easily resume or pause scheduler checks for any journalist.
*   **Run Constraints**: Configure frequency (Daily, Weekly, Manual), preferred UTC hours, and targeted days of the week.
*   **Weekly Quotas**: Enforce strict rolling weekly quotas and review desk thresholds.
*   **Safety Overrides**: Clearly communicates the admin review lock (`awaiting_admin_review` status).
*   **Force Trigger**: Added a **"Force Trigger Scheduler Now"** button so administrators can test the pipeline locally or push batch queues instantly.

### 5. Real-Time Monitor Card (`DashboardView.tsx`)
Added a **Scheduled Automation** dashboard widget inside the right-hand action column:
*   Visual pulse dot indicating status.
*   Current cron schedule indicator.
*   Recent run log table pulling from the `agent_runs` table, displaying execution times, success status, and job processing counts.
*   Manual trigger shortcut for quick dashboard testing.

---

## 🔒 Safety Measures and Quotas

To ensure automated content generation remains cost-effective and conforms to quality standards:
1.  **Awaiting Admin Review Gate**: No automated run is allowed to push articles beyond the `awaiting_admin_review` status. Human approval is strictly required before an article reaches `approved_sandbox`.
2.  **Weekly Limit Quotas**: If a journalist has reached their weekly quota of articles (e.g. 5), the scheduler skips enqueuing new drafts.
3.  **Review Backlog Threshold**: If a journalist has too many articles pending admin review (e.g. 2), the scheduler pauses creation until they are reviewed.

---

## 🚀 Execution & Verification
All TypeScript type checks and production build checks have passed successfully (`npm run build`). The code has been merged and pushed directly to the `main` branch.
