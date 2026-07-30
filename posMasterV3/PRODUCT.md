# Product

## Register

product

## Users

Cashiers, branch managers, and admins at a tea cooperative's retail/business branches, using this on a dedicated desktop till or back-office machine during work shifts. Not casual or occasional use — this is the tool they're in for most of a shift, often under time pressure at checkout.

## Product Purpose

POSMaster V3 is an Electron desktop point-of-sale, inventory, and member-management system for a tea cooperative. It handles sales checkout, stock/restock tracking, inter-branch inventory transfers, member/payment records synced from the cooperative's own systems, and staff/session management. Success looks like: fast, error-resistant checkout; staff trust the numbers on screen; nothing about the interface slows down a transaction queue.

## Brand Personality

Trustworthy, professional, precise. This handles real transactions and inventory for a real business — it should read as a serious operational tool, not a consumer app. Avoid anything playful or "fun" in tone; avoid the generic blue-SaaS-dashboard look the app currently has, which reads as templated rather than considered.

## Anti-references

- The current login/loading screens (plain white card, default blue accent, no point of view).
- Consumer/playful app aesthetics (rounded mascots, bouncy motion, bright multi-color palettes) — wrong register for a tool handling money and stock.
- Generic AI-dashboard scaffolding: gradient text, side-stripe accent borders, tiny uppercase eyebrows, identical icon-card grids.

## Design Principles

- Earned familiarity over novelty — the tool should disappear into the task once staff are past login; save any personality for the login/loading moment itself.
- Numbers and state must be unambiguous at a glance (session status, sync status, errors) — clarity beats decoration everywhere financial/inventory data appears.
- One visual vocabulary end to end — the login/loading screen sets the tone the rest of the app (already largely Tailwind-default) should eventually grow into, not a one-off skin.
- Fast under pressure — cashiers interact with this screen quickly, often mid-shift-change; motion and layout should never make someone wait on choreography.

## Accessibility & Inclusion

No formal WCAG target stated by the user; treat WCAG AA as the floor (body text ≥4.5:1, large text ≥3:1) since this is a real operational tool, not a prototype. Respect `prefers-reduced-motion` on any loading/entrance animation.
