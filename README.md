# TokenSavr

Build a web app called TokenSavvy — an AI-powered strategy generator that helps vibe coders and indie builders save credits and tokens when using AI coding platforms like Lovable, Claude, Cursor, ChatGPT, and Bolt.

THE CORE IDEA:

Vibe coders constantly burn through credits by asking the wrong platform to do the wrong thing. TokenSavvy takes their idea or feature, asks what their budget is, and returns a step-by-step build plan broken into the cheapest possible sequence of prompts across multiple platforms.

PAGES AND FLOW:

1. LANDING PAGE

- Hero section with headline: "Stop burning credits. Start building smart."

- Subheading: "TokenSavvy turns your app idea into a token-optimized build plan across Lovable, Claude, Cursor, and more."

- Big input field in the center where users paste their app idea

- Prominent "Generate My Strategy" button in soft purple

- Below the fold: 3 feature cards explaining how it works

- Social proof section (leave empty placeholders for now)

2. STRATEGY GENERATOR PAGE

- Step 1 input: "Describe what you want to build" (large textarea)

- Step 2 input: "What's your daily budget?" with options:

  * Free tier only (5 Lovable credits, free Claude)

  * Starter ($20/month)

  * Pro ($50/month)

  * Custom amount

- Step 3 input: "Which platforms do you have access to?" (multi-select: Lovable, Claude, ChatGPT, Cursor, Bolt, v0)

- Step 4 button: "Generate Strategy"

3. RESULTS PAGE

When the user clicks Generate, use the Anthropic API to return:

- A step-by-step plan broken into 5 to 10 steps

- Each step shows:

  * What to do

  * Which platform to use (with icon)

  * Whether to use Chat/Plan Mode or Build Mode

  * Estimated credit or token cost

  * Specific prompt to copy and paste

- Summary at top showing:

  * Total estimated cost

  * Estimated savings vs doing it all in one platform

  * Time estimate

- Download as PDF button

- Save to dashboard button

4. DASHBOARD PAGE

- List of saved strategies

- Daily token budget tracker with visual progress bar

- Weekly spending chart

- Quick stats: total credits saved this month, favorite platform, most expensive type of feature

5. PLATFORM TIPS LIBRARY

- Searchable page with best practices organized by platform

- Lovable tips: Chat Mode vs Build Mode, batch changes, use templates

- Claude Code tips: keep SKILL.md short, close unused files, fresh chats

- Cursor tips: use /compose, avoid Cmd+K on large files

- ChatGPT tips: use GPT-4o-mini for simple tasks

- Each tip has a short explanation and a real example

6. SETTINGS PAGE

- Anthropic API key input (user provides their own)

- Default platform preferences

- Daily budget default

- Dark mode toggle

- Delete account button

DESIGN DIRECTION:

- Clean minimal aesthetic similar to Linear or Anthropic

- Dark mode by default with a light mode toggle

- Primary accent color: soft purple (#7F77DD)

- Secondary accent: warm coral for warnings and limits

- Sans-serif system font stack

- Generous whitespace

- Subtle animations on button hovers

- Platform logos next to each mention (Lovable, Claude, Cursor, ChatGPT, Bolt icons)

TECH STACK:

- React + TypeScript + Tailwind

- Supabase for authentication and saving user strategies

- Anthropic API integration (user provides their own key in settings)

- Responsive for mobile so users can check dashboards on the go

API LOGIC:

When user submits their idea, send this prompt to Claude:

"You are a token optimization expert for AI coding platforms. The user wants to build: [USER INPUT]. Their daily budget is: [BUDGET]. They have access to: [PLATFORMS].

Break this into 5 to 10 steps. For each step provide:

1. What to do

2. Which platform is cheapest for this task

3. Whether to use Chat Mode, Build Mode, or free chat

4. Estimated credit or token cost

5. The exact prompt they should paste

Prioritize free Claude chat for planning and drafting, Lovable Chat Mode for architecture discussions, and Lovable Build Mode only for final assembly. Save money aggressively.

Return the response as valid JSON with the following structure:

{

  "total_estimated_cost": "...",

  "estimated_savings": "...",

  "steps": [

    {

      "step_number": 1,

      "action": "...",

      "platform": "...",

      "mode": "...",

      "estimated_cost": "...",

      "prompt_to_use": "..."

    }

  ]

}"

MVP PRIORITIES (build in this order):

1. Landing page

2. Strategy generator with Anthropic API integration

3. Results page with step-by-step plan

4. Basic auth with Supabase

5. Dashboard for saving strategies

6. Platform tips library

7. Settings page

Leave placeholders for paid tiers — we'll add Stripe later.

Start with the landing page and the strategy generator flow. Make it feel polished and opinionated — this is a tool for power users who care about efficiency.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://tokensavr.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e46ad49f-3dfe-41d2-908d-cdf603646bea).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
