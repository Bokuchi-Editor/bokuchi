export interface Tab {
  id: string;
  title: string;
  content: string;
  filePath?: string;
  isModified: boolean;
  isNew: boolean;
  fileHashInfo?: {
    hash: string;
    modified_time: number;
    file_size: number;
  };
}

export interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
}

export interface AppState {
  tabs: Tab[];
  activeTabId: string | null;
  lastOpenedAt: number;
}

export type TabAction =
  | { type: 'ADD_TAB'; payload: Tab }
  | { type: 'REMOVE_TAB'; payload: { id: string } }
  | { type: 'SET_ACTIVE_TAB'; payload: { id: string } }
  | { type: 'UPDATE_TAB_CONTENT'; payload: { id: string; content: string } }
  | { type: 'UPDATE_TAB_TITLE'; payload: { id: string; title: string } }
  | { type: 'SET_TAB_MODIFIED'; payload: { id: string; isModified: boolean } }
  | { type: 'SET_TAB_FILE_PATH'; payload: { id: string; filePath: string } }
  | { type: 'SET_TAB_NEW'; payload: { id: string; isNew: boolean } }
  | { type: 'UPDATE_TAB_FILE_HASH'; payload: { id: string; fileHashInfo: { hash: string; modified_time: number; file_size: number } } }
  | { type: 'REORDER_TABS'; payload: { tabs: Tab[] } }
  | { type: 'LOAD_STATE'; payload: AppState };
