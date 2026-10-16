# Brand artwork and readable typography

## Visual direction

An original AI-generated river/city/volunteering direction for DniproXP, using the existing green `#268568`, coral `#FF865E`, ivory canvas and Manrope. This is an implemented design proposal, not a claim of trademark clearance or exclusive ownership.

The image-generation tool produced two source sheets. The symbols were separated, their white backgrounds removed, edges cleaned and their green normalized to the project token. Final assets are transparent 256×256 PNGs in `public/brand/` — not vector artwork. The 13 files comprise the logo and 12 themed pictograms: discovery, care, quests, community, achievements, location, ecology, workspace, animals, culture, education and growth.

## Integration

- Main header/footer logo and favicon use the new symbol. The text wordmark remains real HTML text, not generated lettering. The old tiny slogan was removed from the logo lockup.
- All six quest categories use the new artwork. Home-page steps, selected progression illustrations and organizer navigation use matching pictograms.
- `BrandIcon` provides decorative images with empty alt text; adjacent text carries meaning. Familiar action icons (close, back, search, arrows) are retained rather than replaced with ambiguous artwork.
- No dependencies, lockfile, backend, authorization or reward rules were changed for this follow-up.

## Typography contract

- Default body text: 18px with 1.6 line-height.
- Visible text minimum: 16px, including metadata, badges, navigation, form labels, hints, footer and notices. Existing CSS sizes below 16px were raised to this floor; headings remain larger.
- Layouts wrap/reflow instead of reducing font size. At 390px organizer navigation stacks, footer links wrap, notices stay in document flow and the logo keeps a readable wordmark.
- CSS `font-size: 0` is retained only for existing icon-only controls; their accessible labels remain. The demo role switcher now has an explicit accessible name.
- `features/brand/readability.css` is the final loaded stylesheet. The fixed light palette follows the existing project direction.

## Verification scope

The automated text/overflow audit checked 22 top-level routes at 1365px and 390px (44 route/viewport combinations), including public, volunteer and organizer roles. No visible text below 16px or horizontal page overflow was found in those sampled default states. It is not exhaustive coverage of every dynamic entity/detail page, map tile label, browser-native select popup, or a complete accessibility audit.

New Playwright tests check image loading, minimum font size and overflow on the home page, mobile menu, demo-role dialog, catalog filter panel and wizard idea/edit states at both sizes. Existing product and impact tests remain enabled. Screenshots cover discovery, empty/filter states, organizer workspace and wizard idea/edit/error/preview states.

After OpenCid reconnection, the update was transferred to `C:\Users\litvi\DniproXP` on branch `Sergiy` / `3bc87c3`. All 34 transferred files passed SHA-256 readback verification. Previous versions were backed up to `C:\Users\litvi\DniproXP-backups\dniproxp-brand-0a3d64c8e7`. The Windows production build passed. The running loopback server returned HTTP 200 for the new CSS and logo, and the main module imports the new stylesheet. Opening `http://127.0.0.1:5173/?preview=brand` in the default browser was requested successfully; browser appearance on the user's desktop was not visually inspected. No new commit, push or PR is claimed. Earlier downloadable archives describe the pre-transfer state; this live checkout is now updated.
