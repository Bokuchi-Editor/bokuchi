import { useState, useCallback } from 'react';

export const useEditorFocus = () => {
  const [focusRequestId, setFocusRequestId] = useState(0);

  const requestEditorFocus = useCallback(() => {
    setFocusRequestId(prev => prev + 1);
  }, []);

  return { focusRequestId, requestEditorFocus };
};
