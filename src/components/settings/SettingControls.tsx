import React from 'react';
import {
  Box,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Slider,
  Switch,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { TypographyProps } from '@mui/material/Typography';
import type { AppSettings } from '../../types/settings';

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
