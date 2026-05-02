import React, { useMemo, useState } from 'react';
import { Alert, Button, Box, IconButton, Stack } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { RenderingSettings } from '../types/settings';
import { SettingsFocusTarget } from '../types/settingsFocus';
import { contentHasKatex, contentHasMermaid } from '../utils/markdownRenderers';
import { contentIsMarp } from '../utils/marpRenderer';

type RenderingFeature = 'mermaid' | 'marp' | 'katex';

interface RenderingFeatureNoticeProps {
  content: string;
  filePath?: string;
  renderingSettings: RenderingSettings;
  onOpenSettings?: (target?: SettingsFocusTarget) => void;
}

const STORAGE_KEY = 'bokuchi:renderingNotice:dismissed';

const FEATURE_TO_TARGET: Record<RenderingFeature, SettingsFocusTarget> = {
  mermaid: 'rendering.enableMermaid',
  marp: 'rendering.enableMarp',
  katex: 'rendering.enableKatex',
};

function loadDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
}

const RenderingFeatureNotice: React.FC<RenderingFeatureNoticeProps> = ({
  content,
  filePath,
  renderingSettings,
  onOpenSettings,
}) => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());

  const disabledFeatures = useMemo<RenderingFeature[]>(() => {
    const result: RenderingFeature[] = [];
    if (!content) return result;
    if (!renderingSettings.enableMermaid && contentHasMermaid(content)) result.push('mermaid');
    if (!renderingSettings.enableMarp && contentIsMarp(content)) result.push('marp');
    if (!renderingSettings.enableKatex && contentHasKatex(content)) result.push('katex');
    return result;
  }, [content, renderingSettings]);

  const dismissKey = `${filePath ?? '__untitled__'}::${disabledFeatures.join(',')}`;

  if (disabledFeatures.length === 0) return null;
  if (dismissed.has(dismissKey)) return null;

  const featureLabels = disabledFeatures.map((f) => t(`preview.featureNotice.feature.${f}`));
  const featureList = featureLabels.join(t('preview.featureNotice.separator'));

  const handleClose = () => {
    const next = new Set(dismissed);
    next.add(dismissKey);
    setDismissed(next);
    saveDismissed(next);
  };

  const handleOpenSettings = () => {
    onOpenSettings?.(FEATURE_TO_TARGET[disabledFeatures[0]]);
  };

  return (
    <Box sx={{ px: 1, pt: 1 }}>
      <Alert
        severity="info"
        icon={undefined}
        action={
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
            {onOpenSettings && (
              <Button
                color="inherit"
                size="small"
                onClick={handleOpenSettings}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {t('preview.featureNotice.openSettings')}
              </Button>
            )}
            <IconButton
              size="small"
              aria-label={t('preview.featureNotice.dismiss')}
              onClick={handleClose}
              sx={{ color: 'inherit' }}
            >
              <Close fontSize="small" />
            </IconButton>
          </Stack>
        }
        sx={{ alignItems: 'center' }}
      >
        {t('preview.featureNotice.message', { features: featureList })}
      </Alert>
    </Box>
  );
};

export default RenderingFeatureNotice;
