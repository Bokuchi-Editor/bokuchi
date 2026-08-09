import React, { useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Slider,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { TypographyProps } from '@mui/material/Typography';
import type { AppSettings } from '../../types/settings';
import type { SystemFontFamily } from '../../api/fontApi';

/**
 * Updates a single setting value. Shared by every settings tab so they can
 * mutate their slice of {@link AppSettings} without owning the merge logic.
 */
export type SettingChangeHandler = (
  category: keyof AppSettings,
  key: string,
  value: string | number | boolean,
) => void;

interface SwitchSettingCardProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
  sx?: SxProps<Theme>;
}

/** Card holding a single on/off switch with an explanatory description. */
export const SwitchSettingCard: React.FC<SwitchSettingCardProps> = ({
  checked,
  onChange,
  label,
  description,
  sx,
}) => (
  <Card sx={sx}>
    <CardContent>
      <FormControlLabel
        control={<Switch checked={checked} onChange={(e) => onChange(e.target.checked)} />}
        label={label}
      />
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </CardContent>
  </Card>
);

interface SliderSettingCardProps {
  description: string;
  /** Pre-formatted label shown above the slider (e.g. "Font size: 14px"). */
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  valueLabelFormat?: (value: number) => string;
  sx?: SxProps<Theme>;
}

/** Card holding a numeric slider with a description and a live value label. */
export const SliderSettingCard: React.FC<SliderSettingCardProps> = ({
  description,
  label,
  value,
  min,
  max,
  step,
  onChange,
  valueLabelFormat,
  sx,
}) => (
  <Card sx={sx}>
    <CardContent>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {description}
      </Typography>
      <Box sx={{ px: 2, maxWidth: 400 }}>
        <Typography gutterBottom>{label}</Typography>
        <Slider
          value={value}
          onChange={(_, newValue) => onChange(newValue as number)}
          min={min}
          max={max}
          step={step}
          marks
          valueLabelDisplay="auto"
          valueLabelFormat={valueLabelFormat}
        />
      </Box>
    </CardContent>
  </Card>
);

// The '' option is the "Default" sentinel: it maps to the pre-#471 hardcoded
// font stacks so picking it restores the exact previous behavior.
const DEFAULT_FONT_OPTION = '';

// Multi-script specimen so each dropdown row previews Latin, CJK and Arabic
// coverage of the font it is rendered in.
const FONT_SAMPLE_TEXT = 'Ag あア عربى 123';

interface FontFamilySettingCardProps {
  label: string;
  description: string;
  /** Selected family name; '' means "Default" (no custom font). */
  value: string;
  onChange: (value: string) => void;
  /** Installed families, or null while the list is loading (only "Default" is offered then). */
  fonts: SystemFontFamily[] | null;
  /** Localized label for the "Default" option. */
  defaultOptionLabel: string;
  /** When set, renders a monospace-only filter checkbox (used by the editor font). */
  monospaceFilterLabel?: string;
  sx?: SxProps<Theme>;
}

/**
 * Card holding a searchable font picker. Options render in their own font with
 * a multi-script sample; typing filters with prefix matches ranked first and
 * inline-completes the top hit (autoComplete + autoHighlight), so a user who
 * knows the name gets there with a few keystrokes + Enter.
 */
export const FontFamilySettingCard: React.FC<FontFamilySettingCardProps> = ({
  label,
  description,
  value,
  onChange,
  fonts,
  defaultOptionLabel,
  monospaceFilterLabel,
  sx,
}) => {
  const [monospaceOnly, setMonospaceOnly] = useState(true);

  const options = useMemo(() => {
    let list = fonts ?? [];
    if (monospaceFilterLabel && monospaceOnly) {
      // Keep the currently selected family visible even when it is not
      // monospace (or no longer installed), so the value never dangles.
      list = list.filter((f) => f.monospaced || f.name === value);
    }
    const names = list.map((f) => f.name);
    if (value && !names.includes(value)) names.push(value);
    return [DEFAULT_FONT_OPTION, ...names];
  }, [fonts, monospaceFilterLabel, monospaceOnly, value]);

  return (
    <Card sx={sx}>
      <CardContent>
        <Typography gutterBottom>{label}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        <Autocomplete
          size="small"
          sx={{ maxWidth: 400 }}
          options={options}
          value={value}
          onChange={(_, newValue) => onChange(newValue ?? DEFAULT_FONT_OPTION)}
          autoHighlight
          autoComplete
          disableClearable
          getOptionLabel={(option) => (option === DEFAULT_FONT_OPTION ? defaultOptionLabel : option)}
          filterOptions={(opts, state) => {
            const q = state.inputValue.trim().toLowerCase();
            // The default option stays reachable by typing its localized label.
            if (!q || defaultOptionLabel.toLowerCase().includes(q)) return opts;
            const prefix: string[] = [];
            const substr: string[] = [];
            for (const o of opts) {
              if (o === DEFAULT_FONT_OPTION) continue;
              const i = o.toLowerCase().indexOf(q);
              if (i === 0) prefix.push(o);
              else if (i > 0) substr.push(o);
            }
            return [...prefix, ...substr];
          }}
          renderOption={({ key, ...optionProps }, option) => (
            <Box
              component="li"
              key={key}
              {...optionProps}
              sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
            >
              <span style={option === DEFAULT_FONT_OPTION ? undefined : { fontFamily: `"${option}"` }}>
                {option === DEFAULT_FONT_OPTION ? defaultOptionLabel : option}
              </span>
              {option !== DEFAULT_FONT_OPTION && (
                <Typography
                  component="span"
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontFamily: `"${option}"`, whiteSpace: 'nowrap' }}
                >
                  {FONT_SAMPLE_TEXT}
                </Typography>
              )}
            </Box>
          )}
          renderInput={(params) => <TextField {...params} />}
        />
        {monospaceFilterLabel && (
          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Checkbox
                size="small"
                checked={monospaceOnly}
                onChange={(e) => setMonospaceOnly(e.target.checked)}
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                {monospaceFilterLabel}
              </Typography>
            }
          />
        )}
      </CardContent>
    </Card>
  );
};

export interface RadioSettingOption {
  value: string;
  label: string;
  /** When present, the option renders a secondary description under its label. */
  description?: string;
}

interface RadioSettingCardProps {
  title?: string;
  titleVariant?: TypographyProps['variant'];
  titleGutterBottom?: boolean;
  titleSx?: SxProps<Theme>;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioSettingOption[];
  sx?: SxProps<Theme>;
}

/** Card holding a radio group; each option may carry its own description. */
export const RadioSettingCard: React.FC<RadioSettingCardProps> = ({
  title,
  titleVariant = 'h6',
  titleGutterBottom,
  titleSx,
  description,
  value,
  onChange,
  options,
  sx,
}) => (
  <Card sx={sx}>
    <CardContent>
      {title && (
        <Typography variant={titleVariant} gutterBottom={titleGutterBottom} sx={titleSx}>
          {title}
        </Typography>
      )}
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
      )}
      <FormControl component="fieldset">
        <RadioGroup value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={<Radio />}
              label={
                option.description ? (
                  <Box>
                    <Typography variant="body1">{option.label}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.description}
                    </Typography>
                  </Box>
                ) : (
                  option.label
                )
              }
            />
          ))}
        </RadioGroup>
      </FormControl>
    </CardContent>
  </Card>
);
