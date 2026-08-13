# Garden Observation Journal — module-based restructure

This package reorganizes the journal around COURSE MODULES rather than topic categories.

## New navigation
- About My Garden
- Module 1 — Observing Weather and Climate
- Module 2 — Tracking Climate Change
- Module 3
- Module 4
- Adaptation Plan
- Final Reflection

## Module 2 activity subheadings
1. Tracking Climate Data
2. Extreme Weather and Climate
3. Climate Memory + Evidence

Each subsection contains only the few responses worth carrying forward from that activity.

## Important
The existing journal app was originally built around `prompt` and `checklist` item types.
This redesign introduces a new `heading` item type so activity names can appear as true
subheadings inside a module page.

Included:
- content/sections.csv
- content/items.csv
- app-heading-patch.txt
- activity-heading-styles.css

Before deploying, the heading rendering patch and CSS need to be incorporated into the
journal's existing app.js/styles.css. This package is therefore a content + implementation
update, not just a CSV drop-in replacement.
