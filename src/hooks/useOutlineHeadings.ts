import { useMemo } from 'react';
import { extractHeadings } from '../utils/headingExtractor';
import { HeadingItem } from '../types/outline';

export function useOutlineHeadings(content: string | undefined): HeadingItem[] {
  return useMemo(() => {
    if (!content) return [];
    return extractHeadings(content);
  }, [content]);
}
