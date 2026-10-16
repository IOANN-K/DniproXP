# Discovery, workspace and guided creation

Issue: https://github.com/IOANN-K/DniproXP/issues/31

## Scope

A DniproXP-native adaptation of three supplied public-site references:

- Airbnb: image-led discovery cards, prominent search, location selector, quiet category navigation and removable filters.
- Linear: persistent organizer sidebar on desktop, compact initiative rows and clear active destinations. The sidebar becomes normal document-flow navigation on narrow screens.
- Typeform: a focused idea → edit → preview creation flow, explicit progress and optional starter ideas. This is not an imported Typeform form or an external AI integration.

The supplied HTML was reference material only. No third-party page scripts, tracking code, stylesheets, logos, photography or proprietary app code were imported. Existing project imagery, Manrope and the fixed ivory/green brand remain. Backend, dependencies, lockfile and authorization rules are unchanged.

## Visible changes

- Home search opens `/quests?search=…`; category shortcuts use the existing catalog.
- Catalog keeps URL-backed filters, sorting, pagination, error and empty states. A persistent district selector is synchronized with the expanded filter panel. Selected filters can be removed individually.
- Quest cards show existing date, district, planned duration, participation counts and XP. The thin capacity indicator is decorative, with counts retained in text.
- Organizer overview, own quests, creation and quest details share the responsive sidebar shell. Existing moderation and participant actions remain available.
- Wizard suggestions fill only the idea and category, preserving district, capacity and duration. They do not generate automatically or save/publish anything. Generation is still local/rule-based. Saving still requires explicit preview acknowledgement.
- Scoped CSS lives in `src/features/design-integration/design.css`, loaded after the legacy stylesheet. No second state store or duplicate domain implementation.
- The UI remains Ukrainian. Focus indicators, 44px controls, reduced-motion overrides and readable form fields are retained. Checked contrast pairs: white/primary `#268568` 4.53:1, muted `#56685e`/ivory 5.64:1, form boundary `#7a8b80`/white 3.60:1. This is not a claim of a complete WCAG audit of unchanged screens.

## Existing merge damage repaired

The downloaded `Sergiy` head `3bc87c3` did not build before design work. Repairs preserve the canonical impact/identity/exploration models:

- Removed duplicate router import and stale embedded mobile sheet; use the already-present keyed `MobileNavigation` component, with a single demo link.
- Closed the demo progress wrapper and removed an obsolete, truncated `occupied`/`award` implementation. Verification still uses `verifyParticipation`, not the discarded award path.
- Unified `ActivityEvent` on the rich impact type and added mission/challenge/team kinds.
- Completion transactions now carry the existing quest-completion kind and participation source ID for cross-EPIC consumers.
- Reset initializes exploration and identity before persisting, so the reset snapshot is identical after reload; backups, role checks and explicit confirmation are unchanged.
- Removed an unused dashboard import.

## Local Windows copy

Downloaded through MCP to `C:\Users\litvi\DniproXP`, branch `Sergiy`. Dependencies installed without changing the lockfile. `Start DniproXP.cmd` starts the web app on loopback port 5173; an already running instance must be stopped before starting a second one. Node 22.22.2 is installed on this computer. The app remains a local demo, not a deployed service.

## Verification

Results and screenshot gallery are recorded in the pull request after checks finish. The new `e2e/design-integration.spec.ts` covers search routing, district persistence, removable filters, empty-state recovery, workspace navigation and all three wizard suggestions at 1365px and 390px. Existing impact and product-integration tests remain enabled.

Production builds retain the existing large-JavaScript-chunk warning. No full-repository lint cleanup or server/API implementation is part of this design change.
