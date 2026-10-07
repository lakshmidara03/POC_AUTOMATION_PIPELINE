# AI-Powered Transparent Test Automation Platform (PoC — Phase 1: Basic Version)

This is Phase 1 (M1) of the AI-Powered Transparent Test Automation Platform. This phase establishes the monorepo structure, containing a shared packages library, a Next.js frontend, a NestJS backend, and a Playwright template scaffold.

## Workspaces
- `apps/web`: Next.js (App Router, TS, unstyled)
- `apps/api`: NestJS Backend
- `packages/shared`: Shared TS types & constants
- `playwright-template`: Independent Playwright test setup

## Prerequisites
- Node.js (v18+)
- npm (v7+ for workspaces support)

## Installation & Setup
To install all workspace dependencies:
```bash
npm install
```

## Running the Web App
To run the Next.js frontend in development mode:
```bash
npm run dev --workspace=apps/web
# Or: cd apps/web && npm run dev
```

## Running the API App
To run the NestJS backend in development mode:
```bash
npm run start:dev --workspace=apps/api
# Or: cd apps/api && npm run start:dev
```
The health check endpoint is available at `GET http://localhost:3000/health`.

## Running tests (Playwright Scaffold)
To dry-run the playwright test setup:
```bash
cd playwright-template
npx playwright test
```

## Milestone 2: Script Generation API

### Endpoint: `POST /generate-script`

Send a natural language instruction to generate a Playwright script.

**Example Request:**
```bash
curl -X POST http://localhost:3000/generate-script \
     -H "Content-Type: application/json" \
     -d '{"instruction": "Login to https://example.com\nUsername: admin\nPassword: admin123\nVerify Dashboard page is displayed."}'
```

**Expected JSON Response:**
```json
{
  "detectedActions": [
    "Open Browser",
    "Navigate to Login Page",
    "Enter Username",
    "Enter Password",
    "Click Login",
    "Verify Dashboard page is displayed"
  ],
  "script": "import { test, expect } from '@playwright/test';\n\ntest('login flow', async ({ page }) => {\n  await page.goto('https://example.com');\n  await page.locator('input[name=\"username\"]').fill('admin');\n  await page.locator('input[type=\"password\"]').fill('admin123');\n  await page.locator('button[type=\"submit\"]').click();\n  await expect(page).toHaveURL(/.*dashboard/);\n});"
}
```

## Phase 1 Demo Target — Do Not Change Without Re-validating The Full Pipeline

- **Demo Application URL**: `https://the-internet.herokuapp.com/login`
- **Testing Credentials**:
  - **Username**: `tomsmith`
  - **Password**: `SuperSecretPassword!`
- **Goal**: Log in successfully and verify the secure area dashboard page.

---

## Demo Walkthrough Guide

Follow these steps to demonstrate the AI-powered transparent test automation platform:

### Step 1: Initialize the Environment
1. Ensure API keys are set up in the root `.env` file (e.g. `GEMINI_API_KEY`, `GROQ_API_KEY`).
2. Run `npm install` at the workspace root.
3. Start the API Server:
   ```bash
   npm run start:dev --workspace=apps/api
   ```
4. Start the Next.js Frontend:
   ```bash
   npm run dev --workspace=apps/web
   ```
5. Open your browser to `http://localhost:3001` (or whichever port Next.js binds to).

### Step 2: Prompt and Code Generation
1. In the **Test Instruction** textarea, paste the target login instruction:
   ```text
   Login to https://the-internet.herokuapp.com/login
   Username: tomsmith
   Password: SuperSecretPassword!
   Verify secure area dashboard is displayed.
   ```
2. Click the **Generate** button.
3. Observe the loading state. Once complete, two sections appear:
   - **Detected Actions**: Shows a checklist of inferred actions.
   - **Generated Script**: Displays the read-only Playwright TypeScript code with syntax highlighting.

### Step 3: Test Execution
1. Click the **Run Test** button inside the script viewer header.
2. In the **Live Log Stream** terminal box, watch the raw Playwright logs print line-by-line in real time.
3. Once the test exits, scroll down to the **Execution Summary** to see the passed/failed badge, execution time, and command details.

### Step 4: Visual Failure Verification
1. To test screenshots and structured reporting on failure, change the password in the instruction to a wrong value (e.g., `wrongpassword`) or change the expected message verification string.
2. Generate the script and click **Run Test**.
3. Upon failure, a red **Test Failure Detail** card will appear containing:
   - The failing assertion's error stack trace.
   - The captured visual **Failure Screenshot** served dynamically from the runner environment.
