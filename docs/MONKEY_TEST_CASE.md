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
| M-45 | Toggle view mode      | Press `Ctrl+Shift+V` repeatedly             | Rotates through split, preview, editor, split            |
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

## 12. Clipboard & Paste

| #    | Test Case                          | Steps                                                                     | Expected Result                                                      |
| ---- | ---------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| M-70 | Paste HTML table (auto mode)       | Set table conversion to "auto", copy a table from a spreadsheet, paste    | The table is automatically converted to Markdown table syntax        |
| M-71 | Paste HTML table (confirm mode)    | Set table conversion to "confirm", copy a table from a spreadsheet, paste | A confirmation dialog appears before converting                      |
| M-72 | Paste HTML table (off mode)        | Set table conversion to "off", copy a table from a spreadsheet, paste     | The table is pasted as plain text without conversion                 |
| M-73 | Paste as plain text                | Copy formatted text, paste with `Ctrl+Shift+V`                           | Content is pasted as plain text regardless of table conversion setting |
| M-74 | Paste TSV/CSV data                 | Copy tab-separated or comma-separated data, paste into editor             | The data is detected and converted to a Markdown table               |

## 13. Edge Cases & Stability

| #    | Test Case              | Steps                                           | Expected Result                                       |
| ---- | ---------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| M-75 | Rapid tab switching    | Rapidly switch tabs in quick succession         | Switches correctly without crashing                   |
| M-76 | Many tabs              | Open 20 or more tabs                            | Scrolling/overflow handling works correctly            |
| M-77 | Large file             | Open a Markdown file larger than 1 MB           | The editor functions normally                         |
| M-78 | Empty file             | Open a 0-byte file                              | An empty editor is displayed without errors           |
| M-79 | Long lines             | Open a Markdown file with lines of thousands of characters | Word wrap functions correctly              |
| M-80 | Prolonged tab switching | Switch between tabs with images 50+ times       | No memory leak; editor remains responsive             |

## 14. Marp Slides

Tests for the Marp slide rendering feature (Settings > Advanced > enableMarp). The active document must contain a Marp front matter (`---\nmarp: true\n---`) to be detected as a Marp document.

| #    | Test Case                                                | Steps                                                                                                                                                | Expected Result                                                                                                                              |
| ---- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| M-81 | Enable Marp setting                                      | Toggle Marp ON in Settings > Advanced > Rendering Extensions                                                                                          | The setting is saved; documents with `marp: true` front matter render as slides instead of normal Markdown                                   |
| M-82 | Continuous mode rendering (split view)                   | With Marp enabled, open a Marp document in split view                                                                                                 | All slides are rendered vertically in the preview pane, separated visually as a stack                                                        |
| M-83 | Slide mode rendering (preview-only view)                 | Switch to preview-only mode for a Marp document                                                                                                       | Only the current slide is shown with prev/next/grid/fullscreen controls                                                                      |
| M-84 | Slide navigation buttons                                 | In slide mode, click prev/next buttons                                                                                                                | The slide counter updates and the displayed slide changes; bounds are respected (no wrap below 0 or above slide count)                       |
| M-85 | Slide navigation via arrow keys                          | In slide mode or fullscreen, press `←` / `→`                                                                                                          | Arrow keys move between slides regardless of which UI element has focus                                                                      |
| M-86 | Thumbnail (grid view) mode                               | In slide mode, click the grid icon                                                                                                                    | All slides are displayed as a thumbnail grid                                                                                                  |
| M-87 | Jump to slide via thumbnail                              | In thumbnail mode, click any slide                                                                                                                    | Thumbnail mode exits and the clicked slide becomes the current one                                                                            |
| M-88 | Fullscreen preserves current slide *(0.8.1 regression)*  | Navigate to slide N (N > 1), then click the fullscreen button                                                                                         | The fullscreen view shows slide N (NOT always slide 1)                                                                                       |
| M-89 | Continuous-mode scrollbar after launch *(0.8.1 regression)* | Set a tab with a long Marp document active, fully quit and relaunch the app, then immediately observe the split-view preview                       | A vertical scrollbar appears in the Marp preview without needing to resize the window or interact with the preview                            |
| M-90 | Marp dark mode rendering                                 | While displaying a Marp document, toggle dark mode                                                                                                    | The slides re-render with the dark theme background and text colors                                                                          |
| M-91 | Relative-path image inlining                             | Open a Marp document that references a sibling image (e.g. `![](./image.png)`)                                                                        | The image is rendered correctly inside slides (loaded as inlined data URL)                                                                    |

## 15. Link Handling in Preview

Tests for the link click handling that routes external URLs to the OS browser. All of these are 0.8.1 regression cases — links previously failed to open or hijacked the iframe.

| #    | Test Case                                                                | Steps                                                                                                              | Expected Result                                                                                              |
| ---- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| M-92 | External link in normal preview *(0.8.1 regression)*                     | In a non-Marp document, write `[link](https://example.com)` and click it in the preview                            | The default OS browser opens example.com; the editor/preview state is unchanged (no in-app navigation)        |
| M-93 | External link in Marp slide *(0.8.1 regression)*                         | In a Marp slide, include `[link](https://example.com)` and click it in slide / continuous / fullscreen / thumbnail mode | The link opens in the OS browser; the slide iframe does not navigate to the URL                              |
| M-94 | Tab transition from Marp to non-Marp preserves link handling *(0.8.1 regression)* | Open a Marp tab, switch to another tab containing a regular Markdown document with a link, click the link        | The link opens in the OS browser (the click handler is correctly re-attached after the conditional re-render) |
| M-95 | Internal anchor link                                                     | Click an in-document anchor link (e.g. `[goto](#section)`)                                                         | The preview scrolls to the matching heading within the same view; no browser opens                            |

## 16. Update Notifications

Tests for the auto-update flow. 0.8.1 throttles auto-checks to once per 24 hours and prevents duplicate notification dialogs.

| #    | Test Case                                                | Steps                                                                                                                                                  | Expected Result                                                                                                                                   |
| ---- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-96 | Auto-check after 24h *(0.8.1 regression)*                | Clear the persisted `lastUpdateCheckAt` (or run with a fresh app state), launch the app                                                                | An update check is performed automatically once initialization completes                                                                          |
| M-97 | Auto-check skip within 24h *(0.8.1 regression)*          | Launch the app, let it perform the auto-check, quit, then relaunch within 24 hours                                                                     | No new server check is performed on the second launch (`lastUpdateCheckAt` timestamp is reused)                                                   |
| M-98 | Manual check while up to date                            | When no update is available, trigger the manual check (menu)                                                                                            | A notification states the app is up to date; no installation dialog appears                                                                       |
| M-99 | Duplicate dialog suppression *(0.8.1 regression)*        | While the update notification dialog is open, trigger another check (manual, periodic tick, etc.)                                                       | A second dialog does not appear; the existing dialog remains the only one shown                                                                   |

## 17. Variable Substitution

Tests for global variable management and `${var}` substitution.

| #     | Test Case                              | Steps                                                                                                       | Expected Result                                                                                          |
| ----- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| M-100 | Add global variable                    | Open Variable Settings, enter a name and value, click Add                                                   | The variable appears in the variable list                                                                |
| M-101 | Delete global variable                 | In Variable Settings, delete an existing variable                                                            | The variable is removed from the list                                                                    |
| M-102 | Variable substitution in preview       | Define `name=World`, write `Hello ${name}` in a document                                                     | The preview shows `Hello World`                                                                          |
| M-103 | Save with variables                    | With substitutions present, choose File > Save with Variables                                               | The saved file on disk contains the substituted values, not the `${var}` placeholders                    |
| M-104 | Variables YAML export & import         | Click Export Variables, choose a path; on a fresh app, click Import Variables and select that YAML file     | The exported file contains all variables; importing restores them with the same names and values         |

## 18. Settings Import / Export / Reset

| #     | Test Case                  | Steps                                                                                          | Expected Result                                                                                |
| ----- | -------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| M-105 | Export settings to JSON    | Settings > Advanced > Export Settings, choose a path                                            | A JSON file containing all current settings is written to the selected path                   |
| M-106 | Import settings from JSON  | Settings > Advanced > Import Settings, select a previously-exported JSON                        | All settings are restored; the UI updates to reflect the imported values                       |
| M-107 | Reset settings to defaults | Settings > Advanced > Reset Settings, confirm in the dialog                                     | All settings revert to their defaults; theme/language/etc. visibly reset                       |

## 19. Markdown Toolbar

| #     | Test Case                                | Steps                                                                                                       | Expected Result                                                                                  |
| ----- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| M-108 | Toolbar inserts correct syntax           | Select text in the editor, click Bold / Italic / Heading / List / Link / Image / Code Block / Quote buttons | The selected text is wrapped in the appropriate Markdown syntax; with no selection, placeholder text is inserted |

## 20. Additional Display Settings

| #     | Test Case                            | Steps                                                                                                             | Expected Result                                                                                                  |
| ----- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| M-109 | Tab close button position            | Toggle Settings > Tab Layout > Close Button Position between Left and Right                                        | The × button on each tab moves to the corresponding side immediately                                              |
| M-110 | Outline display mode                 | Switch Settings > Interface > Outline Display Mode between Persistent and Overlay, then open the outline panel    | Persistent mode reserves space alongside the editor; overlay mode floats above the editor                        |
| M-111 | Folder tree display mode             | Switch Settings > Interface > Folder Tree Display Mode between Persistent / Overlay / Off                          | Off hides the folder tree button entirely; Persistent reserves space; Overlay floats above the editor             |
| M-112 | Folder tree file filter              | Toggle Settings > Interface > Folder Tree File Filter between Markdown and All, with a folder open                | Markdown mode shows only `.md`/`.txt` files; All shows every file in the folder                                   |
| M-113 | Word wrap toggle                     | Toggle Settings > Editor > Word Wrap with a long-line document open                                                | Long lines wrap to fit the editor width when ON; horizontal scrolling is required when OFF                       |
| M-114 | Scroll sync mode                     | Switch Settings > Interface > Scroll Sync Mode through Editor→Preview / Bidirectional / Off and scroll in each     | Editor→Preview: only editor scroll syncs preview. Bidirectional: both directions sync. Off: no sync at all       |

## 21. Folder Tree Operations

| #     | Test Case                               | Steps                                                                                                | Expected Result                                                                                          |
| ----- | --------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| M-115 | Open folder via menu                    | When no folder is open, click the folder tree icon (or use File > Open Folder)                       | The folder picker dialog opens; selecting a folder shows its tree and persists the choice on next launch |
| M-116 | Refresh folder tree                     | Externally add or delete a file in the open folder, then click the refresh button in the panel       | The folder tree updates to reflect the external change                                                   |
| M-117 | Rename file from context menu           | Right-click a file in the folder tree, choose Rename, enter a new name, confirm                       | The file is renamed on disk; an open tab for that file follows the rename (no broken file path)          |

## 22. Restart & Reload Stability

| #     | Test Case                                                                  | Steps                                                                                                                                                                  | Expected Result                                                                                                       |
| ----- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| M-118 | Restore tabs from non-default path *(0.8.1 regression — Windows-critical)* | Open a `.md` file located outside `$HOME/Desktop/Documents/Downloads` (e.g. `C:\projects\foo.md`) via OS file association, ensure it appears as a saved tab, restart the app | The tab is restored with the original file path intact; it is NOT downgraded to a new/unsaved tab and content is correct |
| M-119 | Reload via dialog clears modified flag *(0.8.1 regression)*                | Open and edit a file (so it is dirty), modify it externally, accept the change-detection dialog's Reload option                                                         | The editor displays the new on-disk content AND the modified marker (●) is cleared; saving immediately is a no-op       |

## 23. Checklist (Task List) — Recurring Regression Area

This area has regressed at least three times. The chain has multiple independent layers (Preview rendering → click handler → React state → Monaco model sync) and a unit test on any single layer can pass while the chain is broken end to end. Run **every** case below before each release.

| #     | Test Case                                                                | Steps                                                                                                                                                       | Expected Result                                                                                                                                                                                  |
| ----- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M-120 | Preview checkbox click reflects in editor *(recurring regression)*       | In split view, type `- [ ] task` then click the rendered checkbox in the preview                                                                            | The preview checkbox flips to checked AND **the editor source updates from `[ ]` to `[x]` immediately**. Switching to editor-only view confirms the on-disk content reflects the toggle on save  |
| M-121 | Preview checkbox click survives subsequent typing *(recurring regression)* | Click a preview checkbox to toggle it, then immediately type a character at the end of any editor line                                                       | The toggled state (`[x]`) is preserved — typing does NOT silently revert the checkbox back to `[ ]`. (This guards the Monaco model staying in sync with React state.)                              |
| M-122 | Malformed task line does not throw off click index                       | In split view, write two lines: `- [ ]NoSpace` (no space after `]`) and `- [ ] Real` (with space). Click the only checkbox the preview renders             | The well-formed line `- [ ] Real` becomes `- [x] Real`. The malformed `- [ ]NoSpace` line is **untouched**. (GFM only renders checkbox for the well-formed one; the click must target that line.) |
| M-123 | Toggle persists across save & reopen                                     | Toggle a checkbox in preview, save the file (`Ctrl+S`), close the tab, reopen the file                                                                       | The reopened file shows the toggled state (`[x]` or `[ ]`) — i.e. the toggle made it to disk, not just to the Monaco view                                                                         |
| M-124 | Toolbar Checklist button inserts valid GFM syntax                        | Place the cursor on an empty line and click the Checklist button in the toolbar. Then click the rendered checkbox in the preview                              | Inserts `- [ ] ` (with trailing space) at the line start. The preview renders it as a checkbox AND clicking it toggles the editor source per M-120                                                |
| M-125 | Indented / nested checkboxes toggle independently                        | Write a parent task and an indented child task (e.g. `- [ ] Parent` then `  - [ ] Child`). Click the child's preview checkbox                                 | Only the child line toggles to `[x]`; the parent stays `[ ]`. Indentation is preserved exactly                                                                                                    |
