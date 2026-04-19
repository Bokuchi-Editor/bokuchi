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
