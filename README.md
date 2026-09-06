# Solvéra

**Turn thoughts into clarity.**

A modern, human-centered personal space that helps users turn their thoughts, reflections, goals, decisions, and personal data into clarity and meaningful action. Powered by the Gemini 3.6 Flash API, Google Sign-In via Firebase Authentication, and Cloud Firestore with strict user data isolation.

---

## 1. Threat Modeling Analysis (5 Threat Zones)

| Threat Zone | Identified Risks | Implemented Countermeasures |
| :--- | :--- | :--- |
| **1. Input Surfaces** | Malicious script injection, oversized payloads, JSON prototype pollution, prompt injection via search and goal inputs. | Strict schema validation, input payload length constraints, null-safe destructuring (`const data = (req.body && typeof req.body === 'object') ? req.body : {}`), and comprehensive undefined-stripping (`sanitizeForFirestore`) prior to database writes. |
| **2. Planning & Reasoning** | Indirect prompt injection trying to hijack model steering or leak internal prompt instructions. | Strict segregation of system directives from untrusted user content; treating retrieved past reflections as untrusted plain data, never executable instructions; structured JSON schema enforcement. |
| **3. Tool Execution & APIs** | Gemini API key leakage in browser, 503/429 status code outages causing client crashes. | Complete server-side isolation (`GEMINI_API_KEY` never sent to client); resilient 4-model fallback ladder (`gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash`); automated error recovery catch matrix. |
| **4. Memory & State** | Cross-tenant database reads, unauthorized access to other users' reflections, goals, or weekly reviews. | Recursive path isolation at `/users/{userId}/{allSubcollections=**}` cryptographically enforced by Firestore security rules (`request.auth.uid == userId`); human-in-the-loop inspection and explicit approval before committing AI goal plans. |
| **5. Inter-System Comm** | Hardcoded secrets, credential exposure in build bundles, token leakage. | Zero hardcoded API keys or secrets in source code; Google Cloud Secret Manager integration on Cloud Run; federated Google Sign-In with zero password storage liabilities. |

---

## 2. Environment & Prerequisites

1. **Google Cloud SDK**: Install and initialize `gcloud`:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable Required Google Cloud Services**:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     secretmanager.googleapis.com \
     firestore.googleapis.com \
     identitytoolkit.googleapis.com
   ```

---

## 3. Secret Management Setup

Store your Gemini API key in Google Cloud Secret Manager and grant the Cloud Run runtime service account access:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Determine your project number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

# Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Cloud Firestore Security Configuration

Deploy recursive, owner-bound security rules to guarantee complete isolation across all subcollections (`interactions`, `goals`, `insights`, `reviews`, `profile`):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{allSubcollections=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

To deploy rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 5. Google Cloud Run Deployment

1. **Build and deploy the full-stack container to Cloud Run**:
   ```bash
   gcloud run deploy solvera \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
     --set-env-vars="NODE_ENV=production,PORT=3000"
   ```

2. **Required Campaign Verification Labeling**:
   Apply the mandatory challenge verification label to register your Cloud Run service:
   ```bash
   gcloud run services update solvera \
     --update-labels=dev-tutorial=cloud-run-ai-challenge \
     --region=us-central1
   ```

---

## 6. Functional Test Walkthrough (Step-by-Step Test Scripts)

Every process and interaction in the application is broken down into structured, testable verification steps:

### Test Suite 1: Authentication & Landing Page
- **Step 1.1 (Landing Page Presentation)**:
  - Action: Navigate to `/`.
  - Expected: The landing page displays the title *"Turn scattered thoughts into clarity, deliberate decisions, and unstoppable momentum"*, 5 core feature pillars, the `#google-sign-in-button` (*"Continue with Google"*), and the `#demo-sign-in-button` (*"Explore Demo Workspace"*).
- **Step 1.2 (Federated Sign-In)**:
  - Action: Click `#google-sign-in-button` or `#demo-sign-in-button`.
  - Expected: User is authenticated. If new, the personalized Onboarding Modal appears. After completion, user arrives at the Executive Dashboard.
- **Step 1.3 (Sign Out)**:
  - Action: Click `#header-sign-out-button`.
  - Expected: Session is securely invalidated, local memory state is reset, and view reverts to the landing page.

### Test Suite 2: Onboarding & Profile Customization
- **Step 2.1 (Profile Setup)**:
  - Action: In the onboarding modal, enter primary life priorities (e.g., *"Engineering Leadership"*, *"Deep Work & Focus"*), preferred AI tone (*"Strategic & Objective"*), and save.
  - Expected: Profile is written to Firestore at `/users/{userId}/profile/main` with sanitized payload; customized priorities appear on the dashboard greeting.

### Test Suite 3: Multi-Turn Reflection & Decision Frameworks
- **Step 3.1 (Multi-Turn Reflection Entry)**:
  - Action: Navigate to **AI Reflection** via sidebar or dashboard quick-entry. Select mode *"Decision Framework"*, type *"Should I transition our legacy monolith to event-driven microservices next quarter?"*, and click Submit.
  - Expected: Status indicates *"Reflecting..."*. Gemini 3.6 Flash (or automated fallback ladder) analyzes trade-offs, blind spots, second-order effects, and risks. The turn is saved to Firestore.
- **Step 3.2 (Subsequent Turns & Context Preservation)**:
  - Action: In the same conversation, switch mode to *"Structured Intentions"*, ask *"What are the first two risk mitigation experiments to run?"*, and submit.
  - Expected: Prior context is preserved in history; Gemini provides concrete experiments; transaction status pill indicates *"Saved to Firestore"*.
- **Step 3.3 (Executive Summarization)**:
  - Action: Click *"Generate Executive Summary"* at the top of the conversation.
  - Expected: Gemini creates an executive summary and tags; the reflection title in the sidebar is dynamically updated.

### Test Suite 4: Goal & Action Tracker (AI Decomposition + Human-in-the-Loop)
- **Step 4.1 (Natural Language Goal Decomposition)**:
  - Action: Navigate to **Goal & Action Architect**. In the input field, type *"Run a half-marathon under 1 hour 45 minutes in 12 weeks"* and click *"Decompose into Plan"*.
  - Expected: Gemini deconstructs the intention into target milestones and verifiable action items.
- **Step 4.2 (Human-in-the-Loop Inspection & Approval)**:
  - Action: The *"Review & Approve AI-Proposed Goal Plan"* modal opens. Edit or add action steps, then click *"Approve & Save Plan"*.
  - Expected: The plan is committed to Firestore at `/users/{userId}/goals/{goalId}`. It appears under Active Goals with interactive completion checkboxes.
- **Step 4.3 (Action Completion Toggle)**:
  - Action: Check off an action item.
  - Expected: Action toggles to completed, goal progress percentage recalculates, and state persists immediately.

### Test Suite 5: AI Insight Engine (Pattern & Growth Synthesis)
- **Step 5.1 (Pattern Discovery)**:
  - Action: Navigate to **AI Pattern Insights**. Click *"Analyze Cross-Journal Patterns"*.
  - Expected: Gemini synthesizes all past journal interactions, identifying recurring bottlenecks, cognitive strengths, emotional patterns, and high-leverage growth levers. Insights appear in organized category cards.

### Test Suite 6: Weekly AI Review
- **Step 6.1 (Weekly Synthesis)**:
  - Action: Navigate to **Weekly AI Review**. Click *"Generate Weekly Review"*.
  - Expected: Gemini examines this week's reflections and active goals, producing an executive weekly summary, key accomplishments, carried-forward tasks, mindset shifts, and the Top 3 Priorities for the upcoming week.

### Test Suite 7: Smart Personal Search & Semantic Filtering
- **Step 7.1 (Real-Time Search)**:
  - Action: Navigate to **Smart Personal Search**. Type a keyword like *"microservices"* or *"marathon"*.
  - Expected: Matching journal entries appear instantly with relevance scores, matching snippets, and a *"Jump to Reflection"* button.

### Test Suite 8: Personal Analytics & Momentum
- **Step 8.1 (Cadence & Frequency Charts)**:
  - Action: Navigate to **Personal Analytics**.
  - Expected: KPI cards display Total Sessions, Depth of Thought (turns per session), Task Execution Rate (%), and Day-of-Week reflection cadence bar chart.

### Test Suite 9: Privacy, Security & Data Sovereignty
- **Step 9.1 (Security Center Inspection)**:
  - Action: Navigate to **Privacy & Security**.
  - Expected: Cards detail owner-bound Firestore isolation, server-side Gemini API proxy, and federated identity.
- **Step 9.2 (Full Data Export)**:
  - Action: Click *"Export All Data (JSON)"*.
  - Expected: The application aggregates all user documents (reflections, goals, insights, reviews, profile) into a clean JSON bundle and downloads it to the user's computer.

### Test Suite 10: Zero-Crash Transaction & Payload Resilience
- **Step 10.1 (Input Buffer Safety)**:
  - Action: If a network disconnection occurs while submitting a reflection, observe the input area.
  - Expected: A retry alert banner is displayed; user's typed text in the textarea is NOT cleared or lost.
- **Step 10.2 (Undefined Value Sanitization)**:
  - Action: Check Firestore payloads before storage operations.
  - Expected: All documents pass through `sanitizeForFirestore`, stripping any `undefined` values and preventing driver exceptions.
