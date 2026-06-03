import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
  Box,
} from '@mui/material';
import {
  MoreVert,
  Add,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  ArrowUpward,
  ArrowDownward,
  ArrowBack,
  ArrowForward,
  DeleteOutline,
  DragIndicator,
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { dragConfig } from '../config/dragConfig';
import {
  type Align,
  type ParsedTable,
  unescapeCell,
  escapeCell,
  insertRow,
  deleteRow,
  moveRow,
  insertColumn,
  deleteColumn,
  moveColumn,
} from '../utils/tableFormatter';

interface TableEditModalProps {
  /** Source-form table (cells may contain escaped pipes). */
  table: ParsedTable;
  /** Called with the edited source-form table when the user applies. */
  onApply: (table: ParsedTable) => void;
  onClose: () => void;
}

type MenuState = { type: 'row' | 'col'; index: number; anchorEl: HTMLElement } | null;

const ROW_HANDLE_WIDTH = 36;
const CELL_MIN_WIDTH = 140;

const cellInputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '6px 8px',
  border: '1px solid var(--color-border, rgba(0,0,0,0.23))',
  borderRadius: 4,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
};

interface SortableRowProps {
  id: string;
  cells: string[];
  onCellChange: (col: number, val: string) => void;
  onOpenMenu: (anchorEl: HTMLElement) => void;
  rowActionsLabel: string;
}

/** One draggable body row: the handle reorders on drag, opens a menu on click. */
const SortableRow: React.FC<SortableRowProps> = ({
  id,
  cells,
  onCellChange,
  onOpenMenu,
  rowActionsLabel,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <Box ref={setNodeRef} style={style} sx={{ display: 'flex', gap: 0.5, mb: 0.5, alignItems: 'center' }}>
      <Tooltip title={rowActionsLabel}>
        <IconButton
          size="small"
          sx={{ width: ROW_HANDLE_WIDTH, flexShrink: 0, cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
          {...attributes}
          {...listeners}
          onClick={(e) => onOpenMenu(e.currentTarget)}
        >
          <DragIndicator fontSize="small" />
        </IconButton>
      </Tooltip>
      {cells.map((cell, ci) => (
        <Box key={ci} sx={{ flex: 1, minWidth: CELL_MIN_WIDTH }}>
          <input
            style={cellInputStyle}
            value={cell}
            spellCheck={false}
            onChange={(e) => onCellChange(ci, e.target.value)}
          />
        </Box>
      ))}
    </Box>
  );
};

/**
 * A spreadsheet-style editor for a single Markdown table (#3), hosting the
 * row/column operations (#9). Rows can be reordered by dragging their handle;
 * a click on the handle opens the row actions menu (click vs drag is
 * distinguished by the same threshold the tab bar uses).
 */
const TableEditModal: React.FC<TableEditModalProps> = ({ table, onApply, onClose }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ParsedTable>(() => ({
    header: table.header.map(unescapeCell),
    alignments: [...table.alignments],
    rows: table.rows.map((r) => r.map(unescapeCell)),
  }));
  const [menu, setMenu] = useState<MenuState>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: dragConfig.dragThreshold,
        delay: dragConfig.dragDelay,
        tolerance: 3,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const cols = draft.header.length;

  const setCell = (row: number, col: number, val: string) => {
    setDraft((d) => {
      if (row === -1) {
        return { ...d, header: d.header.map((c, i) => (i === col ? val : c)) };
      }
      return {
        ...d,
        rows: d.rows.map((r, ri) => (ri === row ? r.map((c, ci) => (ci === col ? val : c)) : r)),
      };
    });
  };

  const setAlignment = (col: number, align: Align) => {
    setDraft((d) => ({ ...d, alignments: d.alignments.map((a, i) => (i === col ? align : a)) }));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const from = Number(String(active.id).slice(4));
      const to = Number(String(over.id).slice(4));
      setDraft((d) => ({ ...d, rows: arrayMove(d.rows, from, to) }));
    }
  };

  const closeMenu = () => setMenu(null);

  const handleApply = () => {
    onApply({
      header: draft.header.map(escapeCell),
      alignments: draft.alignments,
      rows: draft.rows.map((r) => r.map(escapeCell)),
    });
  };

  // Clearly highlight the active alignment.
  const alignToggleSx = {
    '&.Mui-selected': {
      bgcolor: 'primary.main',
      color: 'primary.contrastText',
      '&:hover': { bgcolor: 'primary.dark' },
    },
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('tableEditor.title')}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ overflowX: 'auto' }}>
          {/* Column controls: alignment + per-column actions menu */}
          <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5, alignItems: 'center' }}>
            <Box sx={{ width: ROW_HANDLE_WIDTH, flexShrink: 0 }} />
            {draft.header.map((_, ci) => (
              <Box
                key={ci}
                sx={{ flex: 1, minWidth: CELL_MIN_WIDTH, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}
              >
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={draft.alignments[ci] === 'none' ? 'left' : draft.alignments[ci]}
                  onChange={(_e, val) => val && setAlignment(ci, val as Align)}
                >
                  <ToggleButton value="left" sx={alignToggleSx} aria-label={t('tableEditor.alignLeft')}>
                    <FormatAlignLeft fontSize="small" />
                  </ToggleButton>
                  <ToggleButton value="center" sx={alignToggleSx} aria-label={t('tableEditor.alignCenter')}>
                    <FormatAlignCenter fontSize="small" />
                  </ToggleButton>
                  <ToggleButton value="right" sx={alignToggleSx} aria-label={t('tableEditor.alignRight')}>
                    <FormatAlignRight fontSize="small" />
                  </ToggleButton>
                </ToggleButtonGroup>
                <Tooltip title={t('tableEditor.columnActions')}>
                  <IconButton
                    size="small"
                    onClick={(e) => setMenu({ type: 'col', index: ci, anchorEl: e.currentTarget })}
                  >
                    <MoreVert fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Box>

          {/* Header cell texts */}
          <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5, alignItems: 'center' }}>
            <Box sx={{ width: ROW_HANDLE_WIDTH, flexShrink: 0 }} />
            {draft.header.map((cell, ci) => (
              <Box key={ci} sx={{ flex: 1, minWidth: CELL_MIN_WIDTH }}>
                <input
                  style={{ ...cellInputStyle, fontWeight: 600 }}
                  value={cell}
                  spellCheck={false}
                  onChange={(e) => setCell(-1, ci, e.target.value)}
                />
              </Box>
            ))}
          </Box>

          {/* Body rows (draggable to reorder) */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={draft.rows.map((_, i) => `row-${i}`)} strategy={verticalListSortingStrategy}>
              {draft.rows.map((row, ri) => (
                <SortableRow
                  key={ri}
                  id={`row-${ri}`}
                  cells={row}
                  rowActionsLabel={t('tableEditor.rowActions')}
                  onCellChange={(ci, val) => setCell(ri, ci, val)}
                  onOpenMenu={(anchorEl) => setMenu({ type: 'row', index: ri, anchorEl })}
                />
              ))}
            </SortableContext>
          </DndContext>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button size="small" startIcon={<Add />} onClick={() => setDraft((d) => insertRow(d, d.rows.length))}>
            {t('tableEditor.addRow')}
          </Button>
          <Button size="small" startIcon={<Add />} onClick={() => setDraft((d) => insertColumn(d, cols))}>
            {t('tableEditor.addColumn')}
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('tableEditor.cancel')}</Button>
        <Button variant="contained" onClick={handleApply}>
          {t('tableEditor.apply')}
        </Button>
      </DialogActions>

      <Menu anchorEl={menu?.anchorEl ?? null} open={Boolean(menu)} onClose={closeMenu}>
        {menu?.type === 'row'
          ? [
              <MenuItem
                key="above"
                onClick={() => {
                  setDraft((d) => insertRow(d, menu.index));
                  closeMenu();
                }}
              >
                <ListItemIcon><ArrowUpward fontSize="small" /></ListItemIcon>
                <ListItemText>{t('tableEditor.insertRowAbove')}</ListItemText>
              </MenuItem>,
              <MenuItem
                key="below"
                onClick={() => {
                  setDraft((d) => insertRow(d, menu.index + 1));
                  closeMenu();
                }}
              >
                <ListItemIcon><ArrowDownward fontSize="small" /></ListItemIcon>
                <ListItemText>{t('tableEditor.insertRowBelow')}</ListItemText>
              </MenuItem>,
              <MenuItem
                key="up"
                onClick={() => {
                  setDraft((d) => moveRow(d, menu.index, menu.index - 1));
                  closeMenu();
                }}
              >
                <ListItemIcon><ArrowUpward fontSize="small" /></ListItemIcon>
                <ListItemText>{t('tableEditor.moveRowUp')}</ListItemText>
              </MenuItem>,
              <MenuItem
                key="down"
                onClick={() => {
                  setDraft((d) => moveRow(d, menu.index, menu.index + 1));
                  closeMenu();
                }}
              >
                <ListItemIcon><ArrowDownward fontSize="small" /></ListItemIcon>
                <ListItemText>{t('tableEditor.moveRowDown')}</ListItemText>
              </MenuItem>,
              <MenuItem
                key="del"
                onClick={() => {
                  setDraft((d) => deleteRow(d, menu.index));
                  closeMenu();
                }}
              >
                <ListItemIcon><DeleteOutline fontSize="small" /></ListItemIcon>
                <ListItemText>{t('tableEditor.deleteRow')}</ListItemText>
              </MenuItem>,
            ]
          : menu?.type === 'col'
            ? [
                <MenuItem
                  key="left"
                  onClick={() => {
                    setDraft((d) => insertColumn(d, menu.index));
                    closeMenu();
                  }}
                >
                  <ListItemIcon><ArrowBack fontSize="small" /></ListItemIcon>
                  <ListItemText>{t('tableEditor.insertColumnLeft')}</ListItemText>
                </MenuItem>,
                <MenuItem
                  key="right"
                  onClick={() => {
                    setDraft((d) => insertColumn(d, menu.index + 1));
                    closeMenu();
                  }}
                >
                  <ListItemIcon><ArrowForward fontSize="small" /></ListItemIcon>
                  <ListItemText>{t('tableEditor.insertColumnRight')}</ListItemText>
                </MenuItem>,
                <MenuItem
                  key="mleft"
                  onClick={() => {
                    setDraft((d) => moveColumn(d, menu.index, menu.index - 1));
                    closeMenu();
                  }}
                >
                  <ListItemIcon><ArrowBack fontSize="small" /></ListItemIcon>
                  <ListItemText>{t('tableEditor.moveColumnLeft')}</ListItemText>
                </MenuItem>,
                <MenuItem
                  key="mright"
                  onClick={() => {
                    setDraft((d) => moveColumn(d, menu.index, menu.index + 1));
                    closeMenu();
                  }}
                >
                  <ListItemIcon><ArrowForward fontSize="small" /></ListItemIcon>
                  <ListItemText>{t('tableEditor.moveColumnRight')}</ListItemText>
                </MenuItem>,
                <MenuItem
                  key="cdel"
                  disabled={cols <= 1}
                  onClick={() => {
                    setDraft((d) => deleteColumn(d, menu.index));
                    closeMenu();
                  }}
                >
                  <ListItemIcon><DeleteOutline fontSize="small" /></ListItemIcon>
                  <ListItemText>{t('tableEditor.deleteColumn')}</ListItemText>
                </MenuItem>,
              ]
            : null}
      </Menu>
    </Dialog>
  );
};

export default TableEditModal;
