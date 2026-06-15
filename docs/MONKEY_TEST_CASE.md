# Monkey Test Case List

Test cases for manually verifying UI integration behaviors that cannot be fully covered by automated tests.
Ideally these would be implemented as E2E tests, but that is currently not possible due to Tauri's support status, so they are performed manually.

## 1. Tab Operations

| #    | Test Case                              | Steps                                                    | Expected Result                                                        |
| ---- | -------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| M-01 | Create new tab                         | Press `Ctrl+N`                                           | A new tab opens and the editor receives focus                          |
| M-02 | Switch between multiple tabs           | Open 3 or more tabs and click each tab                   | The correct content is displayed and the editor receives focus         |
| M-03 | Ctrl+Tab tab switching                 | `Ctrl+Tab` for next tab, `Ctrl+Shift+Tab` for previous   | Tabs switch in order, wrapping from last to first also works           |
| M-04 | Close tab (unmodified)                 | Click the X button on an unmodified tab                  | Tab closes immediately without confirmation                            |
| M-05 | Close tab (modified)                   | Edit content, then click the X button                    | A "Save changes?" dialog is displayed                                  |
| M-06 | Save dialog - Save                     | Select "Save" in the M-05 dialog                         | The file is saved and the tab closes                                   |
| M-07 | Save dialog - Don't Save               | Select "Don't Save" in the M-05 dialog                   | The tab closes without saving                                          |
| M-08 | Save dialog - Cancel                   | Select "Cancel" in the M-05 dialog                       | The dialog closes and the tab remains open                             |
| M-09 | Prevent duplicate opening of same file | Open the same file twice                                 | Focus moves to the existing tab (a new tab is not created)             |
| M-10 | Drag & drop tab reordering             | Drag a tab to change its position                        | The tab order changes and is persisted                                 |
| M-11 | Empty state on last tab close          | Close the only remaining tab                             | The empty state screen is displayed with the app icon, recent files, and action buttons |
| M-12 | New file from empty state              | In the empty state, click the "New File" button          | A new tab opens and the editor receives focus                          |
| M-13 | Open file from empty state             | In the empty state, click the "Open File" button         | The file dialog opens; selecting a file opens it in a new tab          |
| M-14 | Open recent file from empty state      | In the empty state, click a file in the recent files list | The selected file opens in a new tab                                  |

## 2. File Operations

| #    | Test Case                          | Steps                                              | Expected Result                                                        |
| ---- | ---------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| M-15 | Open file                          | `Ctrl+O` then select a file                        | File content is displayed in a tab and a success notification appears  |
| M-16 | Save file                          | `Ctrl+S`                                           | The current tab is saved and the modified mark (bullet) in the title disappears |
| M-17 | Save As                            | `Ctrl+Shift+S`                                     | After selecting a destination in the dialog, the tab updates with the new filename |
| M-18 | Drop a Markdown file               | Drag & drop a `.md` file onto the editor area      | The file opens in a new tab                                            |
| M-19 | Drop a non-Markdown file           | Drop a `.txt` file                                 | It is handled appropriately (no error occurs)                          |
| M-20 | Open file via OS file association  | Double-click a `.md` file in the OS file explorer   | If the app is not running, it launches and opens the file; if already running, the file opens in a new tab in the existing window |

## 3. Auto Save

| #    | Test Case                    | Steps                                                         | Expected Result                                 |
| ---- | ---------------------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| M-21 | Auto save triggers           | Enable auto save in settings, edit an existing file, wait 3s  | The file is automatically saved and a success notification appears |
| M-22 | Auto save disabled           | Disable auto save in settings, edit, wait 3s                  | The file is not automatically saved             |
| M-23 | Auto save on new tab         | Edit in a new tab (unsaved file), wait 3s                     | Auto save does not trigger (no file path exists) |

## 4. Settings

| #    | Test Case                        | Steps                                                                   | Expected Result                                                                     |
| ---- | -------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| M-24 | Open settings                    | Press `Ctrl+,`                                                          | The settings dialog opens                                                           |
| M-25 | Change theme                     | Change the theme in settings                                            | The UI reflects the change immediately                                              |
| M-26 | Change language                  | Change the language in settings                                         | All UI text switches to the selected language                                       |
| M-27 | Change tab layout                | Toggle between horizontal and vertical                                  | The tab bar display direction changes                                               |
| M-28 | Settings persistence             | Change the theme, then restart the app                                  | The changed theme is retained                                                       |
| M-29 | Change font size                 | Change the editor font size                                             | The editor font updates immediately                                                 |
| M-30 | Enable Mermaid rendering         | Toggle Mermaid ON in Settings > Advanced > Rendering Extensions         | The setting is saved; Mermaid fenced blocks are rendered as diagrams in the preview  |
| M-31 | Disable KaTeX rendering          | Toggle KaTeX OFF in Settings > Advanced > Rendering Extensions          | Math expressions ($...$, $$...$$) are displayed as raw text in the preview           |
| M-32 | Rendering settings persistence   | Change rendering toggles, restart the app                               | The changed rendering settings are retained                                         |
| M-33 | Toggle minimap                   | Toggle the minimap setting in Settings > Editor                         | The minimap on the right side of the editor appears or disappears immediately       |
| M-34 | Minimap in all view modes        | Enable minimap, then switch between editor, split, and preview modes    | The minimap is visible in every mode that includes the editor                       |
| M-35 | Table conversion setting         | Change the table conversion setting (auto/confirm/off), restart the app | The setting is retained after restart                                               |

## 5. Search

| #    | Test Case                              | Steps                                                              | Expected Result                                                              |
| ---- | -------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| M-36 | Open search panel                      | Press `Ctrl+F`                                                     | The search panel opens with focus on the search input                        |
| M-37 | Open search & replace panel            | Press `Ctrl+H`                                                     | The search panel opens with replace input visible                            |
| M-38 | Search all tabs shortcut               | Press `Ctrl+Shift+F`                                               | The search panel opens with "Search all tabs" checked by default             |
| M-39 | Search all tabs checkbox visibility    | Open 2+ tabs and press `Ctrl+F`                                    | The "Search all tabs" checkbox is visible                                    |
| M-40 | Search all tabs checkbox hidden        | With only 1 tab open, press `Ctrl+F`                               | The "Search all tabs" checkbox is not displayed                              |
| M-41 | Cross-tab search results               | Open 3+ tabs with shared text, enable "Search all tabs", search    | Results are grouped by tab with match counts                                 |
| M-42 | Navigate cross-tab results             | In cross-tab results, press `Enter` or click a match in another tab | The corresponding tab is activated and the cursor jumps to the match        |
| M-43 | Search options (case / word / regex)   | Toggle case-sensitive, whole-word, or regex, then search            | Search results respect the selected options in both single and cross-tab mode |
| M-44 | Replace in current tab                 | Open replace, type replacement text, click replace / replace all   | Text is replaced in the current tab only                                     |

## 6. View Modes

| #    | Test Case             | Steps                                       | Expected Result                                          |
| ---- | --------------------- | ------------------------------------------- | -------------------------------------------------------- |
| M-45 | Toggle view mode      | Press `Ctrl+Shift+D` repeatedly             | Rotates through split, preview, editor, split            |
| M-46 | Synchronized scrolling | Scroll the editor in split mode             | The preview scrolls in sync                              |

## 7. Keyboard Shortcuts

| #    | Test Case            | Steps                    | Expected Result                          |
| ---- | -------------------- | ------------------------ | ---------------------------------------- |
| M-47 | Show help            | Press `F1`               | The help dialog opens                    |
| M-48 | Recent files         | Press `Ctrl+R`           | The recent files dialog opens            |
| M-49 | Outline panel        | Press `Ctrl+Shift+O`     | The outline panel toggles open/closed    |
| M-50 | Folder tree panel    | Press `Ctrl+Shift+E`     | The folder tree panel toggles open/closed |

## 8. Outline & Folder Tree

| #    | Test Case                          | Steps                                       | Expected Result                                 |
| ---- | ---------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| M-51 | Jump to heading via outline        | Click a heading in the outline panel        | The editor scrolls to the corresponding line    |
| M-160 | Outline jump works in preview-only mode *(#376)* | Switch to the Preview (preview-only) view with a document that has multiple headings → click a heading in the outline panel | The preview scrolls to that heading. Previously nothing happened in preview-only mode (the jump only drove the hidden editor); editor and split modes still jump as before |
| M-52 | Outline auto-update                | Add/remove headings in the editor           | The outline panel updates in real time          |
| M-53 | Open file from folder tree         | Click a file in the folder tree             | The file opens in a tab                         |
| M-54 | Folder tree expand/collapse        | Click a folder icon                         | The subtree expands/collapses                   |

## 9. External File Change Detection

| #    | Test Case                          | Steps                                        | Expected Result                                |
| ---- | ---------------------------------- | -------------------------------------------- | ---------------------------------------------- |
| M-55 | Detect external changes            | Modify an open file in another editor        | A change detection dialog is displayed         |
| M-56 | External change - Reload           | Select "Reload" in the M-55 dialog           | The content is updated to the latest version   |
| M-57 | External change - Cancel           | Select "Cancel" in the M-55 dialog           | The current edited content is retained         |
| M-58 | External change in preview mode    | Switch to preview mode, modify the file externally, select "Reload", then switch to editor or split mode | The editor displays the externally changed content (not the old content) |
| M-59 | No data loss after preview reload  | After M-58, wait for auto-save to trigger    | Auto-save writes the externally changed content, not the old content     |

## 10. Zoom

| #    | Test Case    | Steps            | Expected Result              |
| ---- | ------------ | ---------------- | ---------------------------- |
| M-60 | Zoom in      | Press `Ctrl+=`   | The entire UI is enlarged    |
| M-61 | Zoom out     | Press `Ctrl+-`   | The entire UI is reduced     |
| M-62 | Reset zoom   | Press `Ctrl+0`   | Returns to 100%              |

## 11. Preview Rendering

| #    | Test Case                          | Steps                                                                   | Expected Result                                                        |
| ---- | ---------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| M-63 | Mermaid diagram rendering          | Enable Mermaid, write a ` ```mermaid ` fenced block (e.g. `graph TD; A-->B`) | The diagram renders as an SVG in the preview                           |
| M-64 | Mermaid error handling             | Write an invalid mermaid block (e.g. `invalid!!!`)                      | A red error message is shown instead of a diagram                      |
| M-65 | Mermaid dark mode theme            | Toggle dark mode while a Mermaid diagram is displayed                   | The diagram re-renders with the dark theme                             |
| M-66 | KaTeX math rendering               | With KaTeX enabled, write `$E=mc^2$` and `$$\sum_{i=1}^{n} i$$`        | Inline and display math are rendered correctly                         |
| M-67 | Disabled renderers show raw syntax | Disable both KaTeX and Mermaid, write math and mermaid blocks           | Raw `$...$` text and ` ```mermaid ` code blocks are shown as-is       |
| M-68 | HTML export with Mermaid           | Enable Mermaid, write a diagram, export as HTML                         | The exported HTML contains the Mermaid diagram as inline SVG           |
| M-69 | HTML export image sizing           | Write markdown with a large image, export as HTML, open in browser      | Images are constrained to the container width and maintain aspect ratio |
| M-70 | HTML export with KaTeX *(regression)* | Enable KaTeX, write several equations (e.g. `$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$`, a `pmatrix`, `\nabla \cdot \mathbf{E}`), export as HTML, open in a browser **offline** | Each equation renders once, correctly, with KaTeX fonts. No garbled run-together duplicate appears next to it, and math renders without an internet connection |
| M-71 | HTML sanitization vs. legitimate markup *(regression)* | In one document write a raw `<img src=x onerror="alert(1)">` **and** a `<script>alert(2)</script>`, plus a Mermaid diagram, a KaTeX equation, a relative-path local image (`![](images/x.png)`), and a task list (`- [x] done`). View the preview, then export to HTML and open it | No `alert` dialog fires in either the preview or the exported file. The Mermaid diagram (incl. its node labels), the equation, the local image, and the checkboxes all still render correctly |

## 12. Clipboard & Paste

| #    | Test Case                          | Steps                                                                     | Expected Result                                                      |
| ---- | ---------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| M-72 | Paste HTML table (auto mode)       | Set table conversion to "auto", copy a table from a spreadsheet, paste    | The table is automatically converted to Markdown table syntax        |
| M-73 | Paste HTML table (confirm mode)    | Set table conversion to "confirm", copy a table from a spreadsheet, paste | A confirmation dialog appears before converting                      |
| M-74 | Paste HTML table (off mode)        | Set table conversion to "off", copy a table from a spreadsheet, paste     | The table is pasted as plain text without conversion                 |
| M-75 | Paste as plain text                | Copy formatted text, paste with `Ctrl+Shift+V`                           | Content is pasted as plain text regardless of table conversion setting |
| M-76 | Paste TSV/CSV data                 | Copy tab-separated or comma-separated data, paste into editor             | The data is detected and converted to a Markdown table               |

## 13. Edge Cases & Stability

| #    | Test Case              | Steps                                           | Expected Result                                       |
| ---- | ---------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| M-77 | Rapid tab switching    | Rapidly switch tabs in quick succession         | Switches correctly without crashing                   |
| M-78 | Many tabs              | Open 20 or more tabs                            | Scrolling/overflow handling works correctly            |
| M-79 | Large file             | Open a Markdown file larger than 1 MB           | The editor functions normally                         |
| M-80 | Empty file             | Open a 0-byte file                              | An empty editor is displayed without errors           |
| M-81 | Long lines             | Open a Markdown file with lines of thousands of characters | Word wrap functions correctly              |
| M-82 | Prolonged tab switching | Switch between tabs with images 50+ times       | No memory leak; editor remains responsive             |

## 14. Marp Slides

Tests for the Marp slide rendering feature (Settings > Advanced > enableMarp). The active document must contain a Marp front matter (`---\nmarp: true\n---`) to be detected as a Marp document.

| #    | Test Case                                                | Steps                                                                                                                                                | Expected Result                                                                                                                              |
| ---- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| M-83 | Enable Marp setting                                      | Toggle Marp ON in Settings > Advanced > Rendering Extensions                                                                                          | The setting is saved; documents with `marp: true` front matter render as slides instead of normal Markdown                                   |
| M-84 | Continuous mode rendering (split view)                   | With Marp enabled, open a Marp document in split view                                                                                                 | All slides are rendered vertically in the preview pane, separated visually as a stack                                                        |
| M-85 | Slide mode rendering (preview-only view)                 | Switch to preview-only mode for a Marp document                                                                                                       | Only the current slide is shown with prev/next/grid/fullscreen controls                                                                      |
| M-86 | Slide navigation buttons                                 | In slide mode, click prev/next buttons                                                                                                                | The slide counter updates and the displayed slide changes; bounds are respected (no wrap below 0 or above slide count)                       |
| M-87 | Slide navigation via arrow keys                          | In slide mode or fullscreen, press `←` / `→`                                                                                                          | Arrow keys move between slides regardless of which UI element has focus                                                                      |
| M-88 | Thumbnail (grid view) mode                               | In slide mode, click the grid icon                                                                                                                    | All slides are displayed as a thumbnail grid                                                                                                  |
| M-89 | Jump to slide via thumbnail                              | In thumbnail mode, click any slide                                                                                                                    | Thumbnail mode exits and the clicked slide becomes the current one                                                                            |
| M-90 | Fullscreen preserves current slide *(0.8.1 regression)*  | Navigate to slide N (N > 1), then click the fullscreen button                                                                                         | The fullscreen view shows slide N (NOT always slide 1)                                                                                       |
| M-91 | Continuous-mode scrollbar after launch *(0.8.1 regression)* | Set a tab with a long Marp document active, fully quit and relaunch the app, then immediately observe the split-view preview                       | A vertical scrollbar appears in the Marp preview without needing to resize the window or interact with the preview                            |
| M-92 | Marp dark mode rendering                                 | While displaying a Marp document, toggle dark mode                                                                                                    | The slides re-render with the dark theme background and text colors                                                                          |
| M-93 | Relative-path image inlining                             | Open a Marp document that references a sibling image (e.g. `![](./image.png)`)                                                                        | The image is rendered correctly inside slides (loaded as inlined data URL)                                                                    |
| M-94 | Configure a custom Marp theme folder | In Settings > Rendering, set the Marp theme folder to a directory of `.css` files (some carrying a `/* @theme name */` header, some not) | Each detected `@theme` name is listed as a chip; files lacking an `@theme` header are shown as ignored. Clearing the folder empties the list |
| M-95 | Apply a custom theme via front matter | With a theme folder configured, open a Marp document whose front matter selects a detected theme (`theme: <name>`) | The slides render with the external CSS theme; an unknown or cleared theme name falls back to the built-in default without crashing |
| M-159 | Slides scale correctly in production build *(0.9.2 regression)* | In a **production build** (`npm run tauri:build`, NOT `tauri:dev`), open a Marp document and view it in split / slide / fullscreen / thumbnail mode | Every slide is scaled to fit the preview width. It must NOT render at native size overflowing the pane (oversized headings/bullets clipped on the right). Reproduces only in the packaged app, not in dev — verify against the built app |

## 15. Link Handling in Preview

Tests for the link click handling that routes external URLs to the OS browser. All of these are 0.8.1 regression cases — links previously failed to open or hijacked the iframe.

| #    | Test Case                                                                | Steps                                                                                                              | Expected Result                                                                                              |
| ---- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| M-96 | External link in normal preview *(0.8.1 regression)*                     | In a non-Marp document, write `[link](https://example.com)` and click it in the preview                            | The default OS browser opens example.com; the editor/preview state is unchanged (no in-app navigation)        |
| M-97 | External link in Marp slide *(0.8.1 regression)*                         | In a Marp slide, include `[link](https://example.com)` and click it in slide / continuous / fullscreen / thumbnail mode | The link opens in the OS browser; the slide iframe does not navigate to the URL                              |
| M-98 | Tab transition from Marp to non-Marp preserves link handling *(0.8.1 regression)* | Open a Marp tab, switch to another tab containing a regular Markdown document with a link, click the link        | The link opens in the OS browser (the click handler is correctly re-attached after the conditional re-render) |
| M-99 | Internal anchor link                                                     | Click an in-document anchor link (e.g. `[goto](#section)`)                                                         | The preview scrolls to the matching heading within the same view; no browser opens                            |

## 16. Update Notifications

Tests for the auto-update flow. 0.8.1 throttles auto-checks to once per 24 hours and prevents duplicate notification dialogs.

| #    | Test Case                                                | Steps                                                                                                                                                  | Expected Result                                                                                                                                   |
| ---- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-100 | Auto-check after 24h *(0.8.1 regression)*                | Clear the persisted `lastUpdateCheckAt` (or run with a fresh app state), launch the app                                                                | An update check is performed automatically once initialization completes                                                                          |
| M-101 | Auto-check skip within 24h *(0.8.1 regression)*          | Launch the app, let it perform the auto-check, quit, then relaunch within 24 hours                                                                     | No new server check is performed on the second launch (`lastUpdateCheckAt` timestamp is reused)                                                   |
| M-102 | Manual check while up to date                            | When no update is available, trigger the manual check (menu)                                                                                            | A notification states the app is up to date; no installation dialog appears                                                                       |
| M-103 | Duplicate dialog suppression *(0.8.1 regression)*        | While the update notification dialog is open, trigger another check (manual, periodic tick, etc.)                                                       | A second dialog does not appear; the existing dialog remains the only one shown                                                                   |

## 17. Variable Substitution

Tests for global variable management and `${var}` substitution.

| #     | Test Case                              | Steps                                                                                                       | Expected Result                                                                                          |
| ----- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| M-104 | Add global variable                    | Open Variable Settings, enter a name and value, click Add                                                   | The variable appears in the variable list                                                                |
| M-105 | Delete global variable                 | In Variable Settings, delete an existing variable                                                            | The variable is removed from the list                                                                    |
| M-106 | Variable substitution in preview       | Define `name=World`, write `Hello ${name}` in a document                                                     | The preview shows `Hello World`                                                                          |
| M-107 | Save with variables                    | With substitutions present, choose File > Save with Variables                                               | The saved file on disk contains the substituted values, not the `${var}` placeholders                    |
| M-108 | Variables YAML export & import         | Click Export Variables, choose a path; on a fresh app, click Import Variables and select that YAML file     | The exported file contains all variables; importing restores them with the same names and values         |

## 18. Settings Import / Export / Reset

| #     | Test Case                  | Steps                                                                                          | Expected Result                                                                                |
| ----- | -------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| M-109 | Export settings to JSON    | Settings > Advanced > Export Settings, choose a path                                            | A JSON file containing all current settings is written to the selected path                   |
| M-110 | Import settings from JSON  | Settings > Advanced > Import Settings, select a previously-exported JSON                        | All settings are restored; the UI updates to reflect the imported values                       |
| M-111 | Reset settings to defaults | Settings > Advanced > Reset Settings, confirm in the dialog                                     | All settings revert to their defaults; theme/language/etc. visibly reset                       |

## 19. Markdown Toolbar

| #     | Test Case                                | Steps                                                                                                       | Expected Result                                                                                  |
| ----- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| M-112 | Toolbar inserts correct syntax           | Select text in the editor, click Bold / Italic / Heading / List / Link / Image / Code Block / Quote buttons | The selected text is wrapped in the appropriate Markdown syntax; with no selection, placeholder text is inserted |

## 20. Additional Display Settings

| #     | Test Case                            | Steps                                                                                                             | Expected Result                                                                                                  |
| ----- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| M-113 | Tab close button position            | Toggle Settings > Tab Layout > Close Button Position between Left and Right                                        | The × button on each tab moves to the corresponding side immediately                                              |
| M-114 | New tab button position              | Set the tab layout to Vertical, then switch Settings > Tab Layout > New Tab Button Position between Top and Bottom | Top fixes the + button in the sidebar header. Bottom places it directly below the last tab; when tabs overflow it stays pinned (sticky) to the bottom edge while the list scrolls. Applies immediately without restart. The option is only shown for the vertical layout |
| M-115 | Outline display mode                 | Switch Settings > Interface > Outline Display Mode between Persistent and Overlay, then open the outline panel    | Persistent mode reserves space alongside the editor; overlay mode floats above the editor                        |
| M-116 | Folder tree display mode             | Switch Settings > Interface > Folder Tree Display Mode between Persistent / Overlay / Off                          | Off hides the folder tree button entirely; Persistent reserves space; Overlay floats above the editor             |
| M-117 | Folder tree file filter              | Toggle Settings > Interface > Folder Tree File Filter between Markdown and All, with a folder open                | Markdown mode shows only `.md`/`.txt` files; All shows every file in the folder                                   |
| M-118 | Word wrap toggle                     | Toggle Settings > Editor > Word Wrap with a long-line document open                                                | Long lines wrap to fit the editor width when ON; horizontal scrolling is required when OFF                       |
| M-119 | Scroll sync mode                     | Switch Settings > Interface > Scroll Sync Mode through Editor→Preview / Bidirectional / Off and scroll in each     | Editor→Preview: only editor scroll syncs preview. Bidirectional: both directions sync. Off: no sync at all       |
| M-120 | Scroll sync mode change applies without restart *(regression)* | While the app is running, switch Settings > Interface > Scroll Sync Mode to Bidirectional (by changing the setting or via Reset Settings), then — **without restarting** — scroll both the editor and the preview | Both directions sync immediately: scrolling the editor moves the preview AND scrolling the preview moves the editor, with no app restart required. (Guards against the editor scroll listener being registered only once at mount.) |
| M-121 | Toggle formatting bar | Toggle Settings > Editor > Formatting Bar on and off (default ON) | The Markdown formatting toolbar above the editor appears or disappears immediately in every view mode that includes the editor; the setting persists across restart |

## 21. Folder Tree Operations

| #     | Test Case                               | Steps                                                                                                | Expected Result                                                                                          |
| ----- | --------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| M-122 | Open folder via menu                    | When no folder is open, click the folder tree icon (or use File > Open Folder)                       | The folder picker dialog opens; selecting a folder shows its tree and persists the choice on next launch |
| M-123 | Refresh folder tree                     | Externally add or delete a file in the open folder, then click the refresh button in the panel       | The folder tree updates to reflect the external change                                                   |
| M-124 | Rename file from context menu           | Right-click a file in the folder tree, choose Rename, enter a new name, confirm                       | The file is renamed on disk; an open tab for that file follows the rename (no broken file path)          |

## 22. Restart & Reload Stability

| #     | Test Case                                                                  | Steps                                                                                                                                                                  | Expected Result                                                                                                       |
| ----- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| M-125 | Restore tabs from non-default path *(0.8.1 regression — Windows-critical)* | Open a `.md` file located outside `$HOME/Desktop/Documents/Downloads` (e.g. `C:\projects\foo.md`) via OS file association, ensure it appears as a saved tab, restart the app | The tab is restored with the original file path intact; it is NOT downgraded to a new/unsaved tab and content is correct |
| M-126 | Reload via dialog clears modified flag *(0.8.1 regression)*                | Open and edit a file (so it is dirty), modify it externally, accept the change-detection dialog's Reload option                                                         | The editor displays the new on-disk content AND the modified marker (●) is cleared; saving immediately is a no-op       |

## 23. Checklist (Task List) — Recurring Regression Area

This area has regressed at least three times. The chain has multiple independent layers (Preview rendering → click handler → React state → Monaco model sync) and a unit test on any single layer can pass while the chain is broken end to end. Run **every** case below before each release.

| #     | Test Case                                                                | Steps                                                                                                                                                       | Expected Result                                                                                                                                                                                  |
| ----- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M-127 | Preview checkbox click reflects in editor *(recurring regression)*       | In split view, type `- [ ] task` then click the rendered checkbox in the preview                                                                            | The preview checkbox flips to checked AND **the editor source updates from `[ ]` to `[x]` immediately**. Switching to editor-only view confirms the on-disk content reflects the toggle on save  |
| M-128 | Preview checkbox click survives subsequent typing *(recurring regression)* | Click a preview checkbox to toggle it, then immediately type a character at the end of any editor line                                                       | The toggled state (`[x]`) is preserved — typing does NOT silently revert the checkbox back to `[ ]`. (This guards the Monaco model staying in sync with React state.)                              |
| M-129 | Malformed task line does not throw off click index                       | In split view, write two lines: `- [ ]NoSpace` (no space after `]`) and `- [ ] Real` (with space). Click the only checkbox the preview renders             | The well-formed line `- [ ] Real` becomes `- [x] Real`. The malformed `- [ ]NoSpace` line is **untouched**. (GFM only renders checkbox for the well-formed one; the click must target that line.) |
| M-130 | Toggle persists across save & reopen                                     | Toggle a checkbox in preview, save the file (`Ctrl+S`), close the tab, reopen the file                                                                       | The reopened file shows the toggled state (`[x]` or `[ ]`) — i.e. the toggle made it to disk, not just to the Monaco view                                                                         |
| M-131 | Toolbar Checklist button inserts valid GFM syntax                        | Place the cursor on an empty line and click the Checklist button in the toolbar. Then click the rendered checkbox in the preview                              | Inserts `- [ ] ` (with trailing space) at the line start. The preview renders it as a checkbox AND clicking it toggles the editor source per M-127                                                |
| M-132 | Indented / nested checkboxes toggle independently                        | Write a parent task and an indented child task (e.g. `- [ ] Parent` then `  - [ ] Child`). Click the child's preview checkbox                                 | Only the child line toggles to `[x]`; the parent stays `[ ]`. Indentation is preserved exactly                                                                                                    |

## 24. Inline Table Cell Editing (Preview)

| #     | Test Case                                                                | Steps                                                                                                                                                       | Expected Result                                                                                                                                                                                  |
| ----- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M-133 | Open inline cell editor by double-click | In split or preview mode, double-click any cell of a rendered Markdown table | An edit box opens over that cell, receives focus, and its current text is fully selected; the editor source is shown in the box as the raw (unescaped) cell text |
| M-134 | Edit and commit a cell | Double-click a cell, change the text, press `Enter` | The change is written back to the editor source for that cell only (other cells/columns untouched) and the editor moves down to the cell below |
| M-135 | Cell navigation without scroll jump | With the inline editor open, press `Tab` / `Shift+Tab` / `Enter` to move across several cells | Focus moves right / left / down to the adjacent cell each time; the preview does NOT jump or scroll on each move |
| M-136 | Cancel an edit with Esc | Double-click a cell, type something, press `Esc` | The editor closes and the cell's source text is left unchanged |
| M-137 | Long cell text wraps and the editor auto-grows | Double-click a cell that contains a long sentence (longer than the cell is wide) | The edit box word-wraps the text within the cell width (like the rendered table) and grows downward to fit it; the caret stays visible while typing. Past a tall threshold the box stops growing and scrolls internally instead of running text off a single line |
| M-138 | Spreadsheet table editor modal | Hover a table in the preview, click the edit-table button at its top-right, modify cells / add / remove / reorder rows or columns, click Apply | The modal applies the changes back to the Markdown table source; Cancel discards them |

## 25. Vertical-tab Sidebar Pin/Hover & 臨 (Rin) Focus Mode

| #     | Test Case                                       | Steps                                                                                                                       | Expected Result                                                                                                                              |
| ----- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| M-139 | Vertical-tab pin default and unpin              | Set tab layout to "vertical"; note the pin button left of the ＋ in the sidebar header → click the pin to unpin             | By default the pin is ON (fixed) and the sidebar is always shown. Unpinning collapses the sidebar, leaving a thin left-edge marker (nub)     |
| M-140 | Hover to reveal tabs and re-pin                 | In hover mode (unpinned), move the mouse to the window's left edge → select a tab → click the pin inside the overlay        | Hovering the left edge slides the tab overlay in. Selecting a tab or moving the mouse away collapses it. The overlay pin re-fixes the sidebar |
| M-141 | Pin state persists across restart               | Set to hover (unpinned) and restart the app                                                                                 | Hover mode is preserved after restart (does not revert to fixed)                                                                            |
| M-142 | Horizontal tabs are out of scope                | Switch tab layout to "horizontal"                                                                                           | Horizontal tabs have no pin UI; the tab bar stays always-visible (no fixed/hover concept)                                                    |
| M-143 | Rin mode enter/exit restores the view mode      | In Split, click the Rin button left of the 3 view toggles (Split/Editor/Preview) → exit with `Esc` or the top-right button  | Entering Rin hides tabs/toolbar/preview/outline/status and forces Editor; exiting restores the previous Split view                           |
| M-161 | Esc closes a foreground overlay before exiting Rin *(#375)* | While in Rin mode, open a dialog (e.g. Recent Files / Settings) or the search panel (`Ctrl/Cmd+F`) → press `Esc`            | Esc closes only the dialog/search panel and Rin mode stays active. Pressing `Esc` again with nothing open then exits Rin. Rin no longer exits at the same moment the overlay closes |
| M-144 | Rin exit button appears/fades *(verify in app)* | While in Rin, keep typing on the keyboard → stop typing and move the mouse                                                   | While typing, the top-right exit button fades out over ~3s; moving the mouse shows it again instantly                                        |
| M-145 | Rin mode is not persisted                       | Restart the app while still in Rin mode                                                                                      | The app boots into normal mode (Rin is not restored)                                                                                        |
| M-146 | Rin label switches by locale                    | Check the Rin button tooltip/label in Japanese vs other-language UI                                                          | Japanese shows "臨"; all other locales show "Rin"                                                                                            |
| M-147 | Rin editor width toggle                         | While in Rin, click the width-toggle button below the exit button → in full width, check the editor's right edge          | Toggles between "1000px fixed (centered)" and "full width". In full width the editor stops left of the button column so text never sits under the buttons |
| M-148 | Hover stays consistent with the folder tree     | Turn the folder tree ON (merged with vertical tabs) → unpin → move the mouse to the left edge                              | Pin/hover behavior does not change with the folder tree present; hovering reveals the overlay sidebar containing both tabs and the folder tree |
| M-162 | Rin button tooltips appear on the left, not over the button below | While in Rin, hover the top-right exit button, then the width-toggle button below it | Each tooltip ("Exit Rin mode" / width-toggle label) renders to the **left** of its button and never overlaps the button beneath it, so the lower button stays clickable |

## 26. In-editor Markdown Table Editing

Keyboard-driven Markdown table editing inside the Monaco editor (distinct from the preview cell editor in section 24). The cursor must sit inside a GFM table block; overrides are suppressed while an IME composition is active.

| #     | Test Case                                  | Steps                                                                                                          | Expected Result                                                                                                                                   |
| ----- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-149 | Tab / Shift+Tab cell navigation            | Place the cursor in a table cell, press `Tab` a few times, then `Shift+Tab` back                               | `Tab` selects the next cell's content, wrapping to the first cell of the next row and skipping the separator line; `Shift+Tab` moves backward; at the first header cell it stays put |
| M-150 | Tab past the last cell appends a row        | With the cursor in the last cell of the last row, press `Tab`                                                  | A new empty row with the same column count is inserted below and the cursor lands in its first cell                                                |
| M-151 | Enter adds a row, then exits on empty row   | In a non-empty table row press `Enter`; on the resulting empty row press `Enter` again                          | The first `Enter` inserts an empty row below and moves into it; pressing `Enter` on an already-empty table row clears it to a blank line (exits the table) |
| M-152 | Format table block                          | With the cursor in a table, press `Ctrl/Cmd+Shift+L` (or click the Format Table toolbar button)                | The whole table block is pretty-printed (columns aligned, separator normalized) without changing its content                                      |
| M-153 | IME composition does not hijack Enter/Tab *(verify in app)* | In a table cell, start a Japanese IME composition and press `Enter` to confirm conversion; also press `Tab` mid-composition | Enter confirms the IME conversion (does NOT add a table row) and Tab is not hijacked while composing; the table overrides resume after the composition ends |

## 27. Status Bar Quick Toggles & Word Count

| #     | Test Case                | Steps                                                                        | Expected Result                                                                                                                                                       |
| ----- | ------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-154 | Word count display       | Type mixed Japanese/English text, then select part of it                     | The status bar shows a word count next to the character count (CJK characters counted individually, Latin words by whitespace); with an active selection it shows the selected word count |
| M-155 | Word wrap quick toggle   | Click the word-wrap icon on the right of the status bar                       | Editor word wrap toggles immediately; the icon reflects the on/off state, stays in sync with Settings > Editor > Word Wrap, and the choice persists across restart      |
| M-156 | Auto save quick toggle   | Click the auto-save (save) icon on the right of the status bar               | Auto save toggles immediately; the icon reflects the on/off state, stays in sync with Settings > Advanced > Auto Save, and the choice persists across restart           |

## 28. Markdown Preview Security (HTML/CSS Injection)

| #     | Test Case                                                        | Steps                                                                                                                                                                                                                 | Expected Result                                                                                                                                                                                                                                            |
| ----- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M-157 | CSS-injection overlay cannot take over the app *(regression — GHSA-5qr5-6vh4-6g2j)* | Open a Markdown file containing a `<div style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999">` overlay (and a `<style>` block) — e.g. a CSS-phishing PoC. View it in preview and split modes | The injected element does NOT cover the window: the app chrome (tabs, toolbar, editor) stays usable and the document remains editable/closable. The overlay's `position:fixed/absolute` is stripped at sanitize time, and the preview pane confines anything left. The `<style>` block is removed |
| M-158 | Exported HTML is also overlay-safe *(regression — GHSA-5qr5-6vh4-6g2j)* | With the same CSS-injection Markdown open, run Export to HTML and open the resulting `.html` in a browser                                                                                                              | The exported file does NOT show a full-screen overlay/fake dialog — sanitization runs on the export path too, so overlay positioning and `<style>` blocks are absent from the output                                                                          |
