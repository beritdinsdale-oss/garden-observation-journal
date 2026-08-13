Garden Journal subheading fix

Replace these two files at the ROOT of the repository:
- app.js
- styles.css

Do not change the new content/ folder.

After uploading these replacements, the journal will render `heading` rows from
content/items.csv as visible activity subheadings in their correct CSV order.

You may then delete:
- activity-heading-styles.css
- app-heading-patch.txt

Those two patch files are no longer needed because their functionality is integrated
into app.js and styles.css.
