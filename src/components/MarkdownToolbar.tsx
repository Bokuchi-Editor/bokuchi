import React, { useState } from 'react';
import { Box, IconButton, Tooltip, Divider, Menu, MenuItem, ListItemText } from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatStrikethrough,
  FormatListBulleted,
  FormatListNumbered,
  CheckBox,
  Link,
  Image,
  Code,
  FormatQuote,
  HorizontalRule,
  TableChart,
  Title,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { editor } from 'monaco-editor';

interface MarkdownToolbarProps {
  editorRef: React.RefObject<editor.IStandaloneCodeEditor | null>;
}

const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ editorRef }) => {
  const { t } = useTranslation();
  const [headingAnchor, setHeadingAnchor] = useState<null | HTMLElement>(null);

  const insertText = (before: string, after: string = '', placeholder: string = '') => {
    const ed = editorRef.current;
    if (!ed) return;

    const selection = ed.getSelection();
    if (!selection) return;

    const selectedText = ed.getModel()?.getValueInRange(selection) || '';
    const text = selectedText || placeholder;
    const newText = `${before}${text}${after}`;

    ed.executeEdits('toolbar', [{
      range: selection,
      text: newText,
      forceMoveMarkers: true,
    }]);

    // If placeholder was used (no selection), select it for easy replacement
    if (!selectedText && placeholder) {
      const startLine = selection.startLineNumber;
      const startCol = selection.startColumn + before.length;
      const endCol = startCol + placeholder.length;
      ed.setSelection({
        startLineNumber: startLine,
        startColumn: startCol,
        endLineNumber: startLine,
        endColumn: endCol,
      });
    }

    ed.focus();
  };

  const insertLinePrefix = (prefix: string) => {
    const ed = editorRef.current;
    if (!ed) return;

    const selection = ed.getSelection();
    if (!selection) return;

    const model = ed.getModel();
    if (!model) return;

    const startLine = selection.startLineNumber;
    const endLine = selection.endLineNumber;

    const edits: editor.IIdentifiedSingleEditOperation[] = [];
    for (let line = startLine; line <= endLine; line++) {
      const lineContent = model.getLineContent(line);
      edits.push({
        range: {
          startLineNumber: line,
          startColumn: 1,
          endLineNumber: line,
          endColumn: lineContent.length + 1,
        },
        text: `${prefix}${lineContent}`,
        forceMoveMarkers: true,
      });
    }

    ed.executeEdits('toolbar', edits);
    ed.focus();
  };

  const insertBlock = (text: string) => {
    const ed = editorRef.current;
    if (!ed) return;

    const position = ed.getPosition();
    if (!position) return;

    const model = ed.getModel();
    if (!model) return;

    // Ensure block is on its own line
    const currentLineContent = model.getLineContent(position.lineNumber);
    const needsNewlineBefore = currentLineContent.trim().length > 0;
    const insertText = `${needsNewlineBefore ? '\n' : ''}${text}\n`;

    ed.executeEdits('toolbar', [{
      range: {
        startLineNumber: position.lineNumber,
        startColumn: currentLineContent.length + 1,
        endLineNumber: position.lineNumber,
        endColumn: currentLineContent.length + 1,
      },
      text: insertText,
      forceMoveMarkers: true,
    }]);

    ed.focus();
  };

  const handleHeadingClick = (event: React.MouseEvent<HTMLElement>) => {
    setHeadingAnchor(event.currentTarget);
  };

  const handleHeadingClose = () => {
    setHeadingAnchor(null);
  };

  const handleHeadingSelect = (level: number) => {
    const prefix = '#'.repeat(level) + ' ';
    const ed = editorRef.current;
    if (!ed) return;

    const selection = ed.getSelection();
    if (!selection) return;

    const model = ed.getModel();
    if (!model) return;

    const lineContent = model.getLineContent(selection.startLineNumber);
    // Remove existing heading prefix if any
    const cleaned = lineContent.replace(/^#{1,6}\s*/, '');
    const newContent = `${prefix}${cleaned}`;

    ed.executeEdits('toolbar', [{
      range: {
        startLineNumber: selection.startLineNumber,
        startColumn: 1,
        endLineNumber: selection.startLineNumber,
        endColumn: lineContent.length + 1,
      },
      text: newContent,
      forceMoveMarkers: true,
    }]);

    ed.focus();
    handleHeadingClose();
  };

  const toolbarItems = [
    { icon: <Title fontSize="small" />, tooltip: t('toolbar.heading'), action: handleHeadingClick, isMenu: true },
    { divider: true },
    { icon: <FormatBold fontSize="small" />, tooltip: `${t('toolbar.bold')} (Ctrl+B)`, action: () => insertText('**', '**', 'bold text') },
    { icon: <FormatItalic fontSize="small" />, tooltip: `${t('toolbar.italic')} (Ctrl+I)`, action: () => insertText('*', '*', 'italic text') },
    { icon: <FormatStrikethrough fontSize="small" />, tooltip: t('toolbar.strikethrough'), action: () => insertText('~~', '~~', 'strikethrough') },
    { divider: true },
    { icon: <FormatListBulleted fontSize="small" />, tooltip: t('toolbar.unorderedList'), action: () => insertLinePrefix('- ') },
    { icon: <FormatListNumbered fontSize="small" />, tooltip: t('toolbar.orderedList'), action: () => insertLinePrefix('1. ') },
    { icon: <CheckBox fontSize="small" />, tooltip: t('toolbar.checkList'), action: () => insertLinePrefix('- [ ] ') },
    { divider: true },
    { icon: <Link fontSize="small" />, tooltip: t('toolbar.link'), action: () => insertText('[', '](url)', 'link text') },
    { icon: <Image fontSize="small" />, tooltip: t('toolbar.image'), action: () => insertText('![', '](image-url)', 'alt text') },
    { divider: true },
    { icon: <Code fontSize="small" />, tooltip: t('toolbar.codeBlock'), action: () => insertBlock('```\ncode here\n```') },
    { icon: <FormatQuote fontSize="small" />, tooltip: t('toolbar.quote'), action: () => insertLinePrefix('> ') },
    { icon: <HorizontalRule fontSize="small" />, tooltip: t('toolbar.horizontalRule'), action: () => insertBlock('---') },
    { icon: <TableChart fontSize="small" />, tooltip: t('toolbar.table'), action: () => insertBlock('| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |') },
  ];

  return (
    <>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        px: 0.5,
        gap: 0.25,
        borderBottom: 1,
        borderColor: 'divider',
        minHeight: 36,
        flexWrap: 'wrap',
      }}>
        {toolbarItems.map((item, index) => {
          if ('divider' in item) {
            return <Divider key={index} orientation="vertical" flexItem sx={{ mx: 0.25 }} />;
          }
          return (
            <Tooltip key={index} title={item.tooltip} arrow>
              <IconButton
                size="small"
                onClick={item.action as React.MouseEventHandler<HTMLButtonElement>}
                sx={{ p: 0.5 }}
              >
                {item.icon}
              </IconButton>
            </Tooltip>
          );
        })}
      </Box>

      <Menu
        anchorEl={headingAnchor}
        open={Boolean(headingAnchor)}
        onClose={handleHeadingClose}
      >
        <MenuItem onClick={() => handleHeadingSelect(1)}>
          <ListItemText>{t('toolbar.heading1')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleHeadingSelect(2)}>
          <ListItemText>{t('toolbar.heading2')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleHeadingSelect(3)}>
          <ListItemText>{t('toolbar.heading3')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default MarkdownToolbar;
