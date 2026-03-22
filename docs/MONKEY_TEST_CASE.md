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

## 2. File Operations

| #    | Test Case                          | Steps                                              | Expected Result                                                        |
| ---- | ---------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| M-11 | Open file                          | `Ctrl+O` then select a file                        | File content is displayed in a tab and a success notification appears  |
| M-12 | Save file                          | `Ctrl+S`                                           | The current tab is saved and the modified mark (bullet) in the title disappears |
| M-13 | Save As                            | `Ctrl+Shift+S`                                     | After selecting a destination in the dialog, the tab updates with the new filename |
| M-14 | Drop a Markdown file               | Drag & drop a `.md` file onto the editor area      | The file opens in a new tab                                            |
| M-15 | Drop a non-Markdown file           | Drop a `.txt` file                                 | It is handled appropriately (no error occurs)                          |

## 3. Auto Save

| #    | Test Case                    | Steps                                                         | Expected Result                                 |
| ---- | ---------------------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| M-16 | Auto save triggers           | Enable auto save in settings, edit an existing file, wait 3s  | The file is automatically saved and a success notification appears |
| M-17 | Auto save disabled           | Disable auto save in settings, edit, wait 3s                  | The file is not automatically saved             |
| M-18 | Auto save on new tab         | Edit in a new tab (unsaved file), wait 3s                     | Auto save does not trigger (no file path exists) |

## 4. Settings

| #    | Test Case                | Steps                                  | Expected Result                                  |
| ---- | ------------------------ | -------------------------------------- | ------------------------------------------------ |
| M-19 | Open settings            | Press `Ctrl+,`                         | The settings dialog opens                        |
| M-20 | Change theme             | Change the theme in settings           | The UI reflects the change immediately           |
| M-21 | Change language          | Change the language in settings        | All UI text switches to the selected language    |
| M-22 | Change tab layout        | Toggle between horizontal and vertical | The tab bar display direction changes            |
| M-23 | Settings persistence     | Change the theme, then restart the app | The changed theme is retained                    |
| M-24 | Change font size         | Change the editor font size            | The editor font updates immediately              |
| M-25 | Enable Mermaid rendering | Toggle Mermaid ON in Settings > Advanced > Rendering Extensions | The setting is saved; Mermaid fenced blocks are rendered as diagrams in the preview |
| M-26 | Disable KaTeX rendering  | Toggle KaTeX OFF in Settings > Advanced > Rendering Extensions  | Math expressions ($...$, $$...$$) are displayed as raw text in the preview          |
| M-27 | Rendering settings persistence | Change rendering toggles, restart the app | The changed rendering settings are retained |

## 5. View Modes

| #    | Test Case             | Steps                                       | Expected Result                                          |
| ---- | --------------------- | ------------------------------------------- | -------------------------------------------------------- |
| M-28 | Toggle view mode      | Press `Ctrl+Shift+V` repeatedly             | Rotates through split, preview, editor, split            |
| M-29 | Synchronized scrolling | Scroll the editor in split mode             | The preview scrolls in sync                              |

## 6. Keyboard Shortcuts

| #    | Test Case            | Steps                    | Expected Result                          |
| ---- | -------------------- | ------------------------ | ---------------------------------------- |
| M-30 | Show help            | Press `F1`               | The help dialog opens                    |
| M-31 | Recent files         | Press `Ctrl+R`           | The recent files dialog opens            |
| M-32 | Outline panel        | Press `Ctrl+Shift+O`     | The outline panel toggles open/closed    |
| M-33 | Folder tree panel    | Press `Ctrl+Shift+E`     | The folder tree panel toggles open/closed |

## 7. Outline & Folder Tree

| #    | Test Case                          | Steps                                       | Expected Result                                 |
| ---- | ---------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| M-34 | Jump to heading via outline        | Click a heading in the outline panel        | The editor scrolls to the corresponding line    |
| M-35 | Outline auto-update                | Add/remove headings in the editor           | The outline panel updates in real time          |
| M-36 | Open file from folder tree         | Click a file in the folder tree             | The file opens in a tab                         |
| M-37 | Folder tree expand/collapse        | Click a folder icon                         | The subtree expands/collapses                   |

## 8. External File Change Detection

| #    | Test Case                          | Steps                                        | Expected Result                                |
| ---- | ---------------------------------- | -------------------------------------------- | ---------------------------------------------- |
| M-38 | Detect external changes            | Modify an open file in another editor        | A change detection dialog is displayed         |
| M-39 | External change - Reload           | Select "Reload" in the M-38 dialog           | The content is updated to the latest version   |
| M-40 | External change - Cancel           | Select "Cancel" in the M-38 dialog           | The current edited content is retained         |

## 9. Zoom

| #    | Test Case    | Steps            | Expected Result              |
| ---- | ------------ | ---------------- | ---------------------------- |
| M-41 | Zoom in      | Press `Ctrl+=`   | The entire UI is enlarged    |
| M-42 | Zoom out     | Press `Ctrl+-`   | The entire UI is reduced     |
| M-43 | Reset zoom   | Press `Ctrl+0`   | Returns to 100%              |

## 10. Preview Rendering

| #    | Test Case                          | Steps                                                                   | Expected Result                                                        |
| ---- | ---------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| M-44 | Mermaid diagram rendering          | Enable Mermaid, write a ` ```mermaid ` fenced block (e.g. `graph TD; A-->B`) | The diagram renders as an SVG in the preview                           |
| M-45 | Mermaid error handling             | Write an invalid mermaid block (e.g. `invalid!!!`)                      | A red error message is shown instead of a diagram                      |
| M-46 | Mermaid dark mode theme            | Toggle dark mode while a Mermaid diagram is displayed                   | The diagram re-renders with the dark theme                             |
| M-47 | KaTeX math rendering               | With KaTeX enabled, write `$E=mc^2$` and `$$\sum_{i=1}^{n} i$$`        | Inline and display math are rendered correctly                         |
| M-48 | Disabled renderers show raw syntax | Disable both KaTeX and Mermaid, write math and mermaid blocks           | Raw `$...$` text and ` ```mermaid ` code blocks are shown as-is       |
| M-49 | HTML export with Mermaid           | Enable Mermaid, write a diagram, export as HTML                         | The exported HTML contains the Mermaid diagram as inline SVG           |

## 11. Edge Cases & Stability

| #    | Test Case              | Steps                                           | Expected Result                                       |
| ---- | ---------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| M-50 | Rapid tab switching    | Rapidly switch tabs in quick succession         | Switches correctly without crashing                   |
| M-51 | Many tabs              | Open 20 or more tabs                            | Scrolling/overflow handling works correctly            |
| M-52 | Large file             | Open a Markdown file larger than 1 MB           | The editor functions normally                         |
| M-53 | Empty file             | Open a 0-byte file                              | An empty editor is displayed without errors           |
| M-54 | Long lines             | Open a Markdown file with lines of thousands of characters | Word wrap functions correctly              |
