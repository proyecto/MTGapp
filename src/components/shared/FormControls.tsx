/**
 * @module components/shared/FormControls
 * Reusable UI form primitives (`SegmentedToggle`, `ChipSelector`, `FormField`)
 * ensuring uniform typography, contrast, and accessibility across screens and modals.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { TABULAR_NUMS_STYLE, type AppTheme } from '../../theme/tokens';

/** Option item consumed by {@link SegmentedToggle} and {@link ChipSelector}. */
export interface SelectOption<T extends string> {
  /** Underlying option value. */
  value: T;
  /** Visible option label. */
  label: string;
}

/** Props for {@link SegmentedToggle}. */
export interface SegmentedToggleProps<T extends string> {
  /** Currently selected value. */
  value: T;
  /** Ordered toggle options. */
  options: readonly SelectOption<T>[];
  /** Selection change callback. */
  onChange: (next: T) => void;
  /** Active application theme tokens. */
  theme: AppTheme;
}

/**
 * Compact pill-in-well segmented control used for range zoom (`7D | 30D | All`),
 * store comparison (`Store | 5 Stores`), and unit/total chart toggles.
 *
 * @param props Control value, options, callback, and theme.
 * @returns Segmented toggle group element.
 */
export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  theme,
}: SegmentedToggleProps<T>) {
  return (
    <View
      style={[
        styles.segmentedGroup,
        { backgroundColor: theme.surfaceSubtle },
      ]}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.segmentedBtn,
              active && { backgroundColor: theme.surface },
            ]}
          >
            <Text
              style={[
                styles.segmentedBtnText,
                {
                  color: active ? theme.accent : theme.muted,
                  fontWeight: active ? '700' : '500',
                },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Props for {@link ChipSelector}. */
export interface ChipSelectorProps<T extends string> {
  /** Section field label. */
  label: string;
  /** Currently selected value. */
  value: T;
  /** Clickable chip options. */
  options: readonly SelectOption<T>[];
  /** Selection change callback. */
  onChange: (next: T) => void;
  /** Active application theme tokens. */
  theme: AppTheme;
}

/**
 * Wrapping selector strip of bordered chips (used for card conditions and print languages).
 *
 * @param props Label, selected value, chip items, callback, and theme.
 * @returns Labeled chip group element.
 */
export function ChipSelector<T extends string>({
  label,
  value,
  options,
  onChange,
  theme,
}: ChipSelectorProps<T>) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <View style={styles.chipWrap}>
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? theme.accent : theme.bg,
                  borderColor: selected ? theme.accent : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: selected ? theme.accentText : theme.textSecondary,
                  },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Props for {@link FormField}. */
export interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  /** Descriptive label rendered above the text input. */
  label: string;
  /** Active application theme tokens. */
  theme: AppTheme;
  /** Applies tabular monospace numerals when true (recommended for amounts and dates). */
  tabular?: boolean;
  /** Stretches the field inside two-column rows when true. */
  halfWidth?: boolean;
}

/**
 * Labeled text input styled consistently for light and dark Calm Paper surfaces.
 *
 * @param props Field label, styling options, and forwarded `TextInput` props.
 * @returns Labeled input view.
 */
export function FormField({
  label,
  theme,
  tabular = false,
  halfWidth = false,
  ...inputProps
}: FormFieldProps) {
  return (
    <View style={[styles.fieldGroup, halfWidth && styles.colHalf]}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.muted}
        {...inputProps}
        style={[
          styles.input,
          tabular && TABULAR_NUMS_STYLE,
          {
            backgroundColor: theme.bg,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  segmentedGroup: {
    flexDirection: 'row',
    borderRadius: 9,
    padding: 2,
    gap: 2,
    flexShrink: 0,
  },
  segmentedBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  segmentedBtnText: {
    fontSize: 11,
  },
  fieldGroup: {
    gap: 5,
  },
  colHalf: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

