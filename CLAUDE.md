# Casebird

Hong Kong legal research assistant. Users ask legal questions, the AI searches case law via Pinecone vector DB and responds with cited analysis using Google Gemini.

## Tech Stack

- **Framework**: Next.js (App Router, TypeScript)
- **AI**: Google Gemini 3 Flash (`gemini-3-flash-preview`) for ALL Gemini calls — chat pipeline, triage, scripts, everything. Do NOT use older models (2.0-flash, 2.5-flash) unless explicitly asked.
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

## Chat API — Linear Pipeline (`src/app/api/chat/route.ts`)

### Triage Step

For follow-up messages (conversation history exists), a lightweight `gemini-2.0-flash` call classifies the query:
- **SEARCH** — New legal research needed → enters full research pipeline
- **DIRECT** — Can be answered from conversation context (e.g., drafting a letter, summarizing) → single Gemini call with no tools

First messages always go through the research pipeline (no triage).

### Research Pipeline

The pipeline is linear: **search wide → filter smart → read deep → answer**. There is no going back to search after filtering — all searching is front-loaded.

**Phase types:**
- `search` — only `searchCases` available. Gemini generates queries, system executes them.
- `filter` — no tools. System presents all accumulated chunks to Gemini, which picks the most relevant cases to read.
- `read` — only `getCaseDetails` available. System reads cases from filter's selections (~3 per read phase).
- `answer` — no tools, forces final response with citation whitelist.

**Phase schedules:**
```
Fast (4):   search → filter → read → answer
Normal (6): search → search → filter → read → read → answer
Deep (8):   search → search → filter → read → read → read → read → answer
```

**Thinking levels:** Fast = LOW, Normal = MEDIUM, Deep = HIGH (Gemini native thinking)

### How the Pipeline Works

**Search phases** run sequentially. Each round:
1. Gemini generates search queries (3-5 per round, in both EN and Chinese)
2. System executes all queries via `searchCasesRaw` (returns raw chunks, not case-level deduplicated)
3. Chunks accumulate in `allChunks` Map, keyed by `citation|chunkIndex` (deduplicates identical chunks across queries, but keeps different chunks from the same case)
4. Second+ search rounds tell Gemini what was already found to avoid redundant queries

**Filter phase** runs once:
1. All accumulated chunks are presented to Gemini, sorted by score
2. Gemini outputs a numbered list of citations to read (no explanations — reasoning happens in native thinking)
3. System parses citations via regex, validates against `caseUrlMap`, caps at `maxReads` (~3 × number of read phases)
4. Result: `filterSelectedCitations` — ordered list of cases to read

**Read phases** consume the filter's selections:
1. Each read phase reads ~3 cases from `filterSelectedCitations` in order
2. `caseReadCache` prevents duplicate reads of the same case
3. Cases are injected into conversation as simulated `getCaseDetails` tool calls/responses
4. Gemini can request additional reads (via `getCaseDetails` tool call) during read phases
5. If all selected cases are read before all read phases complete, remaining phases are skipped

**Answer phase:**
1. Citation whitelist injected: only cases from `caseUrlMap`
2. Blockquotes only for cases read via `getCaseDetails`
3. Streaming response with `ThinkingLevel.LOW` (even in deep mode — research thinking already happened)

### Search Pipeline (Pinecone)

- **`searchCasesRaw`** → Pinecone hybrid search (Voyage AI dense 512d + BM25 sparse). Returns raw chunks without case-level dedup. Default 15 results per query.
- **`searchCases`** → Wraps `searchCasesRaw` with case-level dedup (picks best chunk per case). Used only if backward compatibility needed.
- **`getCaseDetails`** → Fetches full judgment from Pinecone (up to 500 chunks per case, no truncation). Chunks are ~600 tokens each.

### Search Strategy (in system prompt)

- Searches are **semantic**, not exact-phrase. Quotation marks are stripped by the sparse vector tokenizer (`\b\w+\b` regex) and ignored by Voyage AI embedding.
- Gemini is instructed to search for concepts using 3-8 unquoted words, like a judge writing a judgment.
- Each query should attack the problem from a different legal angle (principle, consequence, factual pattern).
- **Bilingual search**: Every search round must include both English and Chinese queries to maximize coverage of HK case law.

### Role-Based Behavior

- **System prompts**: 4 variants in `src/lib/prompts.ts` — `SYSTEM_PROMPTS[userRole][outputLanguage]`
  - Insurance: quantum-focused, comparison tables, defendant perspective
  - Lawyer: balanced legal research
- **Court filter**: Insurance role restricts searches to PI-relevant courts (`INSURANCE_COURTS`: hkcfi, hkdc, hkca, hkcfa, hklat). Lawyer has no restriction.

### Pinecone Index Stats

- 1,302,730 vectors, dimension 512
- Target chunk size: 600 tokens (~1000 chars EN, ~2000 chars CN)
- Cases range from 2-64 chunks (CFA cases tend to be longest)
- Even worst case (deep mode, 4 reads of 64-chunk CFA cases) = ~80k tokens = 8% of Gemini's 1M context window. No truncation needed.

## Chat Modes

| Mode | Phases | Search Rounds | Filter | Read Rounds | Typical Cases Read | Thinking |
|------|--------|--------------|--------|------------|-------------------|----------|
| Fast | 4 | 1 | 1 | 1 | 2-3 | Low |
| Normal | 6 | 2 | 1 | 2 | 4-6 | Medium |
| Deep | 8 | 2 | 1 | 4 | 8-12 | High |

## Output Language

Users can set output language to English or Traditional Chinese (繁體中文) in settings. Stored in `user_settings.output_language`. This changes the AI system prompt, not the app interface.

## Case Language Filter

Conversations can filter case search by language: `any`, `EN`, or `TC`. Stored per conversation in `conversations.case_language`.

## Annotated Ordinance Pages (SEO)

Static, SEO-optimized pages that annotate Hong Kong ordinance sections with relevant case law from the Pinecone index. Each section gets 3-5 genuinely useful cases with 2-3 sentence annotations.

### Completed Ordinances

- **Cap 57 (Employment Ordinance)** — 86 cases across 23 annotated sections, 4 sections confirmed empty

### Files

```
src/data/cap57-sections.ts          # Section definitions (number, title, Part, search queries, summary)
src/data/cap57-annotations.json     # Case annotations (86 cases, 27 sections)
scripts/search-section.ts           # Reusable Pinecone search tool
```

### The Search Script

```bash
npx tsx scripts/search-section.ts <section> <sectionRegex> <query1> <query2> ...
```

What it does:
1. Runs each query through `searchCasesRaw()` (Pinecone hybrid search, 30 results per query)
2. Deduplicates chunks across queries
3. Filters chunks using TWO regexes: ordinance regex (e.g., "cap 57", "僱傭條例") AND section-specific regex
4. Groups filtered chunks by case citation, reports matches with scores and text snippets
5. Fetches full judgments for top cases via `getCaseDetails()` (zero vector + metadata filter, topK=500)

The script surfaces candidates — it does NOT assess relevance. That's the human/Claude job.

### Research Process (Per Section)

**Step 1: Design search queries (3-5 per section)**

Use legal concept keywords, not just section numbers. Always include both EN and CN queries.

- Good: `"section 9 employment ordinance unreasonable dismissal constructive dismissal cap 57"`
- Bad: `"section 9 employment ordinance"` (too broad)

**Step 2: Run the search script**

```bash
npx tsx scripts/search-section.ts "9" "s\\.?\\s*9|section\\s*9|第\\s*9\\s*條" \
  "section 9 employment ordinance unreasonable dismissal" \
  "constructive dismissal employer breach cap 57" \
  "僱傭條例第9條 不合理解僱"
```

**Step 3: Read full judgments and assess relevance**

For each candidate: Would a lawyer researching this specific section find this case helpful?
- YES if the case interprets, applies, or analyses the section's legal requirements
- NO if the section is merely cited in passing or the match is from a different ordinance

**Step 4: Write annotations**

2-3 sentences covering: factual context, specific legal issue, principle established. Each annotation should tell a lawyer something beyond just reading the citation.

**Step 5: Write to JSON**

```json
{
  "citation": "[2006] HKCA 271",
  "caseName": "Lui Lin Kam & Others v Nice Creation Development Ltd",
  "court": "hkca",
  "year": 2006,
  "annotation": "The leading authority on..."
}
```

### Lessons Learned

**Section numbering pitfalls:**
- s.6A doesn't exist in Cap 57 — "continuous contract" lives in s.3 + First Schedule. We keep "6A" as user-facing label since that's what people search for.
- s.63 is really s.63C — s.63 itself is blank; s.63C is the operative criminal offence provision.
- s.70 is "Contracting out", not "General penalties." Always verify titles against elegislation.gov.hk.

**Regex design:**
- Always escape dots: `s\\.9` not `s.9`
- Use alternation for bilingual matching: `s\\.?\\s*9|section\\s*9|第\\s*9\\s*條`
- Watch for partial matches: searching for `s.4` also matches `s.41`, `s.42`, etc.

**Sections that produce no cases:**
- Some sections genuinely have no reportable cases (Labour Tribunal decisions not indexed, litigation happens under a different ordinance). This is expected.

**Court hierarchy for annotation priority:**
1. CFA (Court of Final Appeal) — always include if available
2. CA (Court of Appeal) — leading appellate authority
3. CFI (Court of First Instance) — good for detailed analysis
4. DC (District Court) — only if no higher court alternative
5. Prefer cases addressing different legal issues within the section over multiple cases on same point

**Parallelization:** Spawn multiple search agents simultaneously (one per section). Cap 57 used 15+ parallel agents to cover all sections in ~5 minutes.

### HKLII API (Source of Truth for Ordinance Structure)

HKLII provides JSON APIs for fetching ordinance metadata and section structure. **Always use these APIs when building ordinance skeletons** — do NOT rely on memory or web search for section numbers/titles.

**API Endpoints:**

1. **`getcap`** — Basic ordinance metadata (title, number, path)
   ```
   https://www.hklii.hk/api/getcap?lang=en&cap=282&abbr=ord
   → { "title": "Employees' Compensation Ordinance", "num": "282", ... }
   ```

2. **`getrelatedcaps`** — Related subsidiary legislation
   ```
   https://www.hklii.hk/api/getrelatedcaps?num_int=282&lang=en&abbr=reg
   → [{ "title": "Employees' Compensation Regulations", "num": "282A" }, ...]
   ```

3. **`getcapversions`** — All historical versions with IDs (use latest `id` for TOC)
   ```
   https://www.hklii.hk/api/getcapversions?lang=en&cap=282
   → [{ "id": 52034, "title": "...", "date": "2026-01-01" }, ...]
   ```
   For Chinese: use `lang=tc` (returns different version IDs, e.g., EN id=52034, ZH id=52035)

4. **`getcapversiontoc`** — Full table of contents with section numbers, titles, and Parts (**most useful**)
   ```
   https://www.hklii.hk/api/getcapversiontoc?id=52034
   ```
   Returns array of objects, each with:
   - `section_type`: `"P"` (Part), `"S"` (Section), `"LT"` (Long Title), `"Sch"` (Schedule)
   - `prov_num`: e.g., `"Part I"`, `"Section 5A"`, etc.
   - `title`: Section/Part title in the language of the version
   - `subpath`: e.g., `"s5A"`, `"P1"` — useful for URL construction

**Workflow for building an ordinance skeleton:**

```bash
# 1. Get the latest English and Chinese version IDs
curl -s 'https://www.hklii.hk/api/getcapversions?lang=en&cap=282' | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['id'])"
# → 52034

curl -s 'https://www.hklii.hk/api/getcapversions?lang=tc&cap=282' | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['id'])"
# → 52035

# 2. Fetch TOC and extract sections with titles
curl -s 'https://www.hklii.hk/api/getcapversiontoc?id=52034' | python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data:
    if item.get('section_type') == 'S':
        print(f\"s.{item['prov_num']:15s} | {item['title']}\")
"

# 3. Do the same for Chinese
curl -s 'https://www.hklii.hk/api/getcapversiontoc?id=52035' | python3 -c "..."
```

Then combine EN + ZH titles to build `cap{N}-sections.ts`. Filter out repealed sections (title contains "(Repealed)").

### Extending to Other Ordinances

To annotate a new ordinance (e.g., Cap 123):
1. **Fetch section structure from HKLII API** (see above) — this is the source of truth for section numbers, titles, and Part groupings
2. Create `src/data/cap123-sections.ts` — define sections with titles (from HKLII), Parts, search queries, and summaries
3. Create `src/data/cap123-annotations.json` — empty cases array per section
4. Update or copy `scripts/search-section.ts` — the Cap 57 regex is hardcoded; parameterize or create a copy
5. Run searches per section, spawning parallel agents
6. Build pages — same Next.js page structure as Cap 57 (`/cap/123/s/[section]`)
