# Instructor Guide

## What this toolkit contains

- `journal-app/`: upload this folder's contents to GitHub.
- `content/Garden-Journal-Content-Workbook.xlsx`: edit journal content here.
- `canvas-toolkit/`: ready-to-paste Canvas HTML.
- `student-resources/`: learner-facing quick-start text.

## Recommended Canvas structure

1. Create one permanent Canvas page called **My Garden Observation Journal**.
2. Embed the journal there using `JOURNAL-PAGE-EMBED.html`.
3. At the end of each module, paste the matching block from `MODULE-JOURNAL-BUTTONS.html`.
4. Open module links in a new tab for better storage and printing reliability.

## Publishing to GitHub Pages

1. Create a GitHub repository.
2. Upload the contents of `journal-app/` to the repository root.
3. In repository Settings → Pages, publish from the `main` branch and `/ (root)`.
4. Test the public URL.
5. Replace `YOUR-USERNAME` and `YOUR-REPOSITORY` in the Canvas toolkit files.

## Updating journal content

1. Open `Garden-Journal-Content-Workbook.xlsx`.
2. Edit visible text in the workbook.
3. Export the four content sheets as CSV:
   - Course Settings → `settings.csv`
   - Sections → `sections.csv`
   - Journal Items → `items.csv`
   - Canvas Links → `canvas-links.csv`
4. Replace those files inside `journal-app/content/`.
5. Commit the changes to GitHub.

Do not change ids after learners have started. Ids connect browser-saved answers to prompts.
