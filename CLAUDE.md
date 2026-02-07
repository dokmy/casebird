# Casebird

Hong Kong legal research assistant. Users ask legal questions, the AI searches case law via Pinecone vector DB and responds with cited analysis using Google Gemini.

## Tech Stack

- **Framework**: Next.js (App Router, TypeScript)
- **AI**: Google Gemini (`@google/genai`)
- **Vector Search**: Pinecone (hybrid semantic + keyword search for HK case law)
- **Embeddings**: Voyage AI
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Payments**: Stripe (Checkout, Webhooks, Customer Portal)
- **Hosting**: Vercel
- **Domain**: casebird.ai

## Architecture

### Database Tables (Supabase)

All tables have RLS enabled. Defined in `supabase-migration.sql`.

- **conversations**: `id, user_id, title, mode, case_language, created_at, updated_at`
- **messages**: `id, conversation_id, role (user/assistant), content, thinking_steps, iterations, created_at`
- **user_settings**: `user_id (PK), output_language (EN/TC)`
- **subscriptions**: `user_id (PK), stripe_customer_id, stripe_subscription_id, plan, status, message_count, message_limit, current_period_end`

RLS policies: Users can SELECT/INSERT/UPDATE their own rows. The webhook uses a service role client to bypass RLS.

### Supabase Clients

- **Browser**: `src/lib/supabase/client.ts` — uses publishable key
- **Server (with user auth)**: `src/lib/supabase/server.ts` — uses publishable key + cookies
- **Service role (webhook)**: Created inline in `src/app/api/stripe/webhook/route.ts` using `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS, no user auth context

### Conversation & Message Storage

- Conversations and messages are stored in Supabase
- Messages belong to conversations via `conversation_id` foreign key
- RLS ensures users only see their own conversations/messages (via subquery on conversation ownership)
- `updated_at` auto-updates via trigger on conversations table

## Stripe Billing

### Plans

| Plan | Price | Messages | Resets? |
|------|-------|----------|---------|
| Free | $0 | 10 lifetime | No |
| Pro | HK$399/mo | 100/month | Yes, on invoice.paid |
| Max | HK$999/mo | 500/month | Yes, on invoice.paid |

Config in `src/lib/stripe.ts` (`PLAN_CONFIG`). Only user messages count toward the limit.

### Message Usage Enforcement

In `src/app/api/chat/route.ts`:
1. Atomically check limit + increment via `increment_message_count` RPC (Supabase function)
2. If no subscription record exists, auto-creates free tier (`plan='free'`, `message_limit=10`)
3. If `message_count >= message_limit`, return 403 `{ error: "limit_reached" }`
4. Frontend catches 403 and shows `UpgradeModal`

### API Routes

- **`/api/stripe/checkout`** (POST): Creates Stripe Checkout Session. If user has existing subscription, cancels it first (handles upgrades/downgrades). Creates Stripe customer if needed.
- **`/api/stripe/webhook`** (POST): Handles Stripe webhook events (see below). Uses service role Supabase client.
- **`/api/stripe/portal`** (POST): Creates Stripe Customer Portal session for managing billing/cancellation.

### Webhook Events Handled

Endpoint: `https://casebird.ai/api/stripe/webhook`

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Upsert subscription with plan, status=active, reset message_count=0 |
| `invoice.paid` | Reset `message_count=0`, update `current_period_end`, set status=active |
| `customer.subscription.updated` | Update plan/limits/status. Detects cancellation (see below) |
| `customer.subscription.deleted` | Revert to free tier (plan=free, limit=10, clear stripe_subscription_id) |
| `invoice.payment_failed` | Set status=past_due |

### Cancellation Detection (Important)

Stripe Customer Portal cancellation does NOT always set `cancel_at_period_end: true`. In our configuration, Stripe sets `cancel_at` (a Unix timestamp) instead, with `cancel_at_period_end: false`.

The webhook checks both:
```typescript
const cancelAtPeriodEnd = rawSub.cancel_at_period_end === true || rawSub.cancel_at != null;
```

When cancellation is detected, status is set to `"canceled"` in the DB. The UI shows a notice: "Your subscription is set to cancel at the end of the billing period."

### Stripe SDK v20 Quirks

- `current_period_end` is NOT on the Subscription object directly. It's on `subscription.items.data[0].current_period_end`. Helper: `getPeriodEnd()` in webhook.
- `Invoice.subscription` was removed. Use `invoice.parent.subscription_details.subscription` instead. Helper: `getSubscriptionIdFromInvoice()` in webhook.

### Upgrade/Downgrade Flow

The checkout route (`/api/stripe/checkout`) cancels the existing subscription immediately before creating a new checkout session. This prevents duplicate active subscriptions in Stripe.

## Frontend Components

- **`src/app/page.tsx`**: Main chat page. Fetches subscription data, handles `limit_reached` 403 response.
- **`src/app/settings/page.tsx`**: Settings with output language toggle and subscription management (usage bar, plan cards, manage billing link, cancellation notice).
- **`src/components/chat/UpgradeModal.tsx`**: Modal shown when user hits message limit. Shows Pro/Max plans with pricing.
- **`src/components/chat/ChatInput.tsx`**: Chat input with usage counter display.

## Environment Variables

```
# Voyage AI
VOYAGE_API_KEY

# Pinecone
PINECONE_API_KEY
PINECONE_INDEX_HOST

# Google Gemini
GEMINI_API_KEY

# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY

# Stripe (live keys on Vercel, test keys for local dev)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRO_PRICE_ID
STRIPE_MAX_PRICE_ID

# App
NEXT_PUBLIC_APP_URL
```

Vercel has separate env var sets: test keys for Development, live keys for Preview/Production.

## Chat API — State Machine (`src/app/api/chat/route.ts`)

### Phase-Based Tool Control

The chat API uses a state machine that controls which tools Gemini can use at each iteration. Each mode has a fixed phase schedule — Gemini cannot choose to search when the phase says "read".

**Phase types:**
- `search` — only `searchCases` available
- `read` — only `getCaseDetails` available
- `both` — both tools available
- `answer` — no tools, forces final response

**Phase schedules:**
```
Fast (3):   search → read → answer
Normal (6): search → read → read → both → read → answer
Deep (10):  search → search → read → read → read → both → both → read → read → answer
```

**Design rules:**
- The phase before `answer` must always be `read` (not `both`), because searching right before answer is wasteful — those results never get read
- `both` phases should always be followed by a `read` phase so new search results can be acted on

**Thinking levels:** Fast = LOW, Normal = MEDIUM, Deep = HIGH (Gemini native thinking)

### How the Loop Works (Important for debugging)

The initial Gemini call (outside the loop) uses `phases[0]`. Inside the loop, each iteration:
1. Executes pending tool calls from the **previous** Gemini response
2. Determines next Gemini call tools using `phases[iteration]` (not `iteration+1`)
3. Injects phase guidance and calls Gemini with appropriate tools

The `phases[iteration]` indexing is critical — using `iteration+1` would skip one phase per mode (this was a bug that caused FAST mode to never read any cases).

### Search Pipeline

1. **searchCases** → Pinecone hybrid search (Voyage AI dense embedding 512d + BM25 sparse vector). Returns 10 deduplicated cases per query with 500-char snippets, scores, and HKLII URLs.
2. **getCaseDetails** → Fetches full judgment from Pinecone (up to 500 chunks per case, no truncation). Chunks are ~600 tokens each (~1000 chars English, ~2000 chars Chinese).

### Score-Ranked READ Suggestions

When entering a READ phase, the system suggests cases ranked by **best search score across all queries** (not insertion order). This prevents bias toward the first search query's results.

Tracking state:
- `caseScoreMap`: Maps citation → best score seen across all searches. Updated with `max(existing, new)` on each search.
- `casesRead`: Set of citations that have been read via `getCaseDetails`. Used to filter suggestions to unread cases only.
- `caseUrlMap`: Maps citation → HKLII URL (built from Pinecone metadata, not Gemini).

**READ guidance:** Top 4 unread cases by score.
**BOTH guidance:** Top 3 unread cases by score + nudge to prefer reading over searching.

### Search Strategy (in system prompt)

- Searches are **semantic**, not exact-phrase. Quotation marks are stripped by the sparse vector tokenizer (`\b\w+\b` regex) and ignored by Voyage AI embedding.
- Gemini is instructed to search for concepts using 3-8 unquoted words, like a judge writing a judgment.
- Each query should attack the problem from a different legal angle (principle, consequence, factual pattern).

### Answer Phase Safeguards

- Citation whitelist injected: Gemini can only cite cases from `caseUrlMap`
- Blockquotes only allowed for cases read via `getCaseDetails`
- Cases only seen in search snippets can be mentioned as "potentially relevant" but not quoted

### Pinecone Index Stats

- 1,302,730 vectors, dimension 512
- Target chunk size: 600 tokens (~1000 chars EN, ~2000 chars CN)
- Cases range from 2-64 chunks (CFA cases tend to be longest)
- Even worst case (deep mode, 7 reads of 64-chunk CFA cases) = ~140k tokens = 14% of Gemini's 1M context window. No truncation needed.

## Chat Modes

| Mode | Phases | Gemini Calls | Typical Searches | Typical Reads | Thinking |
|------|--------|-------------|-----------------|--------------|----------|
| Fast | 3 | 2 | 2-3 | 1-2 | Low |
| Normal | 6 | 5 | 3-4 | 4-6 | Medium |
| Deep | 10 | 9 | 4-6 | 6-10 | High |

## Output Language

Users can set output language to English or Traditional Chinese (繁體中文) in settings. Stored in `user_settings.output_language`. This changes the AI system prompt, not the app interface.

## Case Language Filter

Conversations can filter case search by language: `any`, `EN`, or `TC`. Stored per conversation in `conversations.case_language`.
