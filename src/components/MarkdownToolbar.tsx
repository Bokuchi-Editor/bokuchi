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
import {
  buildWrapEdit,
  buildLinePrefixEdits,
  buildBlockInsertEdit,
  buildHeadingEdit,
} from '../utils/markdownToolbarActions';

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
    const { edit, newSelection } = buildWrapEdit(selection, selectedText, before, after, placeholder);

    ed.executeEdits('toolbar', [edit]);

    if (newSelection) {
      ed.setSelection(newSelection);
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

    const edits = buildLinePrefixEdits(
      selection.startLineNumber,
      selection.endLineNumber,
      (line) => model.getLineContent(line),
      prefix,
    );

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

    const currentLineContent = model.getLineContent(position.lineNumber);
    const edit = buildBlockInsertEdit(position.lineNumber, currentLineContent, text);

    ed.executeEdits('toolbar', [edit]);
    ed.focus();
  };

  const handleHeadingClick = (event: React.MouseEvent<HTMLElement>) => {
    setHeadingAnchor(event.currentTarget);
  };

  const handleHeadingClose = () => {
    setHeadingAnchor(null);
  };

  const handleHeadingSelect = (level: number) => {
    const ed = editorRef.current;
    if (!ed) return;

    const selection = ed.getSelection();
    if (!selection) return;

    const model = ed.getModel();
    if (!model) return;

    const lineContent = model.getLineContent(selection.startLineNumber);
    const edit = buildHeadingEdit(selection.startLineNumber, lineContent, level);

    ed.executeEdits('toolbar', [edit]);
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
