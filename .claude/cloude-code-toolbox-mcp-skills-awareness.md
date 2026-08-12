# Cloude Code ToolBox — MCP & Skills awareness

_Generated: 2026-08-12T02:14:43.368Z_

## How to use this report

- **Saved copy:** This file is **`.claude/cloude-code-toolbox-mcp-skills-awareness.md`** — refreshed whenever the toolbox runs an MCP & Skills scan (including on workspace open when auto-scan is enabled). It is meant for **Claude Code workspace context** together with `CLAUDE.md` (which gets a shorter replaceable summary when auto-merge is on).
- **MCP:** Lists **configured** servers from Claude Code config (`~/.claude.json` for user scope, `.mcp.json` for project scope). Use `/mcp` in the Claude Code panel to connect servers for your session.
- **Skills:** **On-disk** folders with `SKILL.md`. Claude Code does not auto-load them; attach `SKILL.md` or paths in chat when useful.
- **Task routing:** When the user’s request matches a server’s purpose (e.g. Confluence → Confluence/Atlassian MCP), prefer that **server id** from the tables below.

---

## MCP — workspace

Workspace `mcp.json` _(folder: Seguimiento-hitos-gadisnow)_

- **d:\00-Proyectos Claude\Seguimiento-hitos-gadisnow\.mcp.json** — _File missing_

_No active workspace servers in mcp.json._

## MCP — user profile

- **C:\Users\jorge\.claude.json** — _File exists — no servers defined_

_No active user-scoped servers in mcp.json._

## Skills (local `SKILL.md` folders)

### Project-scoped

- **configurar-deploy** — `d:\00-Proyectos Claude\Seguimiento-hitos-gadisnow\.claude\skills\configurar-deploy`
  - Pone en marcha Seguimiento-Hitos en Supabase + Vercel de forma automática. Le pegás a Claude el token de Supabase (sbp_) y el de Vercel (vcp_) y Claude hace todo por API - crea el proyecto Supabase, aplica migraciones, d

### User-scoped

- **impeccable** — `C:\Users\jorge\.claude\skills\impeccable`
  - Use when the user wants to design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract, or otherwise improve a frontend interface. Covers websites, landing page

- **animate** — `C:\Users\jorge\.agents\skills\animate`
  - Build an animation from scratch, making the decisions in the order that determines whether it feels right — should it animate at all, what purpose, which tool, which properties, which curve and duration, how it interrupt

- **animation-vocabulary** — `C:\Users\jorge\.agents\skills\animation-vocabulary`
  - Reverse-lookup glossary that turns a vague description of a web animation or motion effect into its exact term ("the bouncy thing when a popover opens" → Pop in; "the iOS rubber-band scroll" → Rubber-banding). Use when t

- **apple-design** — `C:\Users\jorge\.agents\skills\apple-design`
  - Apple's approach to interface design and fluid, physical motion, translated for the web. Use when building or reviewing gesture-driven UI, spring animations, drag/swipe/sheet interactions, momentum and interruptible tran

- **emil-design-eng** — `C:\Users\jorge\.agents\skills\emil-design-eng`
  - This skill encodes Emil Kowalski's philosophy on UI polish, component design, animation decisions, and the invisible details that make software feel great.

- **find-animation-opportunities** — `C:\Users\jorge\.agents\skills\find-animation-opportunities`
  - Search a codebase or UI for places that don't animate but should, and reject everything that shouldn't. Read-only; it proposes motion with exact values, it does not implement it. Use when the user asks "what could be ani

- **improve-animations** — `C:\Users\jorge\.agents\skills\improve-animations`
  - Survey a codebase's animation and motion code as a senior motion advisor, then produce a prioritized audit and self-contained implementation plans for other agents (or cheaper models) to execute. Read-only on source code

- **pick-ui-library** — `C:\Users\jorge\.agents\skills\pick-ui-library`
  - Pick the right library for a given frontend task from a curated, opinionated list — numbers, OTP inputs, charts, command menus, virtualization, drag and drop, toasts, state, styling, and more. Only runs when explicitly i

- **prototype** — `C:\Users\jorge\.agents\skills\prototype`
  - Build multiple genuinely different versions of a UI piece you describe, rendered behind a visual picker so you can flip through them live and promote the one that feels right. Only runs when explicitly invoked; it does n

- **review-animations** — `C:\Users\jorge\.agents\skills\review-animations`
  - Reviews animation and motion code against a high craft bar derived from Emil Kowalski's design engineering philosophy. Default to flagging; approval is earned.

---

## Suggested next steps

- **MCP:** Use this extension’s hub **MCP** tab, or `claude mcp list` in the terminal. In Claude Code, use `/mcp` to connect servers for the session.
- **Edit config:** Open `~/.claude.json` (user MCP) or `<workspace>/.mcp.json` (project MCP) via the extension commands.
- **Refresh this report:** run **Intelligence — scan MCP & Skills awareness** again after changing MCP config or adding skills.

_Report from Cloude Code ToolBox extension._
