export interface Tab {
  id: string;
  title: string;
  content: string;
  filePath?: string;
  isModified: boolean;
  isNew: boolean;
}

export interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
}

export type TabAction =
  | { type: 'ADD_TAB'; payload: Tab }
  | { type: 'REMOVE_TAB'; payload: { id: string } }
  | { type: 'SET_ACTIVE_TAB'; payload: { id: string } }
  | { type: 'UPDATE_TAB_CONTENT'; payload: { id: string; content: string } }
  | { type: 'UPDATE_TAB_TITLE'; payload: { id: string; title: string } }
  | { type: 'SET_TAB_MODIFIED'; payload: { id: string; isModified: boolean } }
  | { type: 'SET_TAB_FILE_PATH'; payload: { id: string; filePath: string } };
