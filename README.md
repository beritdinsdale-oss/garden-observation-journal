# Garden Observation Journal — activity-by-activity field notebook

This revision changes the journal navigation so a learner opens ONE activity entry at a time.

## My field notebook navigation

- Welcome
- About My Garden
- Module 1
  - Weather and Climate Observations
- Module 2
  - Tracking Climate Data
  - Extreme Weather and Climate
  - Climate Memory + Evidence
- Module 3
  - Module 3 activity entries
- Module 4
  - Module 4 activity entries
- Adaptation Plan
- Final Reflection
- Observation Summary

Module labels are navigation group headings. Each activity underneath is independently clickable.

## Important behavior

- Only the selected activity's prompts appear in the workspace.
- Learners no longer see every Module 2 journal entry on one page.
- Existing local autosave, backup, restore, printing, and optional photo support remain.
- The Climate Memory + Evidence handoff is preserved. The interview activity opens that exact entry and fills transferred responses automatically.
- URL hashes now identify activity pages, e.g.
  `#module-2--memory-evidence-heading`.

## Upload

For the cleanest update, replace the repository with:

- index.html
- app.js
- styles.css
- README.md
- content/
  - sections.csv
  - items.csv
  - settings.csv
  - canvas-links.csv

The query versions on app.js/styles.css are intentional cache-busters.


## Illustrated field-notebook visual refresh
This revision keeps the activity-by-activity navigation and journal behavior, but changes the presentation to match the more playful course activities:
- botanical framing
- textured field-notebook paper
- warm illustrated header
- taped-note welcome page
- colorful module groups
- rounded, varied notebook-style journal cards
- playful selection states
- serif display typography for a handcrafted journal feel
- decorative field-note divider and floral details

No changes were made to the autosave, backup, restore, print, or interview-to-journal handoff logic.
