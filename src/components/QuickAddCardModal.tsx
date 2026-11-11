/**
 * @module components/QuickAddCardModal
 * Slide-up sheet form for adding a new MTG card holding with live cost, valuation,
 * net profit, and ROI calculation preview.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getTranslations } from '../i18n/translations';
import { TABULAR_NUMS_STYLE, type AppTheme } from '../theme/tokens';
import type { AppPreferences, NewCardInput } from '../types/card';
import {
  formatMoney,
  formatSignedMoney,
  formatSignedPct,
  parseDecimalInput,
  parseIntInput,
  round2,
} from '../utils/cardMath';
import {
  buildCardPayload,
  CardFormFields,
  createCardFormValues,
  type CardFormValues,
} from './shared/CardFormFields';
import { ModalSheet } from './shared/ModalSheet';

/** Props accepted by {@link QuickAddCardModal}. */
export interface QuickAddCardModalProps {
  visible: boolean;
  theme: AppTheme;
  preferences: AppPreferences;
  onClose: () => void;
  onSave: (card: NewCardInput) => Promise<void>;
}

/**
 * Bottom-sheet modal for creating a new card inventory holding using shared
 * {@link CardFormFields} and real-time financial preview calculations.
 *
 * @param props Modal visibility, theme, preferences, close and persistence callbacks.
 * @returns Styled bottom-sheet modal element.
 */
export function QuickAddCardModal({
  visible,
  theme,
  preferences,
  onClose,
  onSave,
}: QuickAddCardModalProps) {
  const t = getTranslations(preferences.language);
  const [formValues, setFormValues] = useState<CardFormValues>(() =>
    createCardFormValues(null, preferences.language),
  );
  const [errorText, setErrorText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateForm(patch: Partial<CardFormValues>) {
    setFormValues((prev) => ({ ...prev, ...patch }));
  }

  const qty = parseIntInput(formValues.quantityText, 1);
  const unitCost = parseDecimalInput(formValues.unitCostText, 0);
  const shipping = parseDecimalInput(formValues.shippingText, 0);
  const marketUnit = parseDecimalInput(formValues.marketPriceText, 0);

  const previewCost = round2(unitCost * qty + shipping);
  const previewMarket = round2(marketUnit * qty);
  const previewProfit = round2(previewMarket - previewCost);
  const previewRoi = previewCost > 0 ? (previewProfit / previewCost) * 100 : null;

  async function handleSave() {
    if (!formValues.nameEs.trim() && !formValues.nameEn.trim()) {
      setErrorText(t.quickAdd.errMissingName);
      return;
    }
    if (!formValues.setCode.trim()) {
      setErrorText(t.quickAdd.errMissingSet);
      return;
    }

    const payload = buildCardPayload(formValues);
    if (!payload) {
      setErrorText(t.quickAdd.errMissingName);
      return;
    }

    setErrorText(null);
    setSaving(true);
    try {
      await onSave(payload);
      onClose();
    } catch {
      setErrorText(t.quickAdd.errSaveFailed);
      setSaving(false);
    }
  }

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      eyebrow={t.quickAdd.eyebrow}
      title={t.quickAdd.title}
      closeAccessibilityLabel={t.common.close}
      theme={theme}
      footer={
        <View style={styles.footerRow}>
          <Pressable
            onPress={onClose}
            disabled={saving}
            style={({ pressed }) => [
              styles.cancelBtn,
              {
                backgroundColor: theme.surfaceSubtle,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text style={[styles.cancelBtnText, { color: theme.text }]}>
              {t.common.cancel}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: theme.accent,
                opacity: saving || pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.saveBtnText, { color: theme.accentText }]}>
              {saving ? t.common.saving : t.quickAdd.submitButton}
            </Text>
          </Pressable>
        </View>
      }
    >
      <CardFormFields
        values={formValues}
        onChange={updateForm}
        mode="add"
        currency={preferences.currency}
        uiLanguage={preferences.language}
        t={t}
        theme={theme}
      />

      <View
        style={[
          styles.previewBox,
          {
            backgroundColor: theme.surfaceSubtle,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.previewCol}>
          <Text style={[styles.previewLabel, { color: theme.muted }]}>
            {t.quickAdd.previewCost}
          </Text>
          <Text
            style={[
              styles.previewVal,
              TABULAR_NUMS_STYLE,
              { color: theme.text },
            ]}
          >
            {formatMoney(previewCost, preferences)}
          </Text>
        </View>
        <View style={styles.previewCol}>
          <Text style={[styles.previewLabel, { color: theme.muted }]}>
            {t.quickAdd.previewValue}
          </Text>
          <Text
            style={[
              styles.previewVal,
              TABULAR_NUMS_STYLE,
              { color: theme.text },
            ]}
          >
            {formatMoney(previewMarket, preferences)}
          </Text>
        </View>
        <View style={styles.previewCol}>
          <Text style={[styles.previewLabel, { color: theme.muted }]}>
            {t.quickAdd.previewProfit}
          </Text>
          <Text
            style={[
              styles.previewVal,
              TABULAR_NUMS_STYLE,
              {
                color:
                  previewProfit === 0
                    ? theme.muted
                    : previewProfit > 0
                      ? theme.gain
                      : theme.loss,
              },
            ]}
          >
            {formatSignedMoney(previewProfit, preferences)} (
            {formatSignedPct(previewRoi, preferences.language)})
          </Text>
        </View>
      </View>

      {errorText ? (
        <Text style={[styles.errorText, { color: theme.loss }]}>
          {errorText}
        </Text>
      ) : null}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  previewBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  previewCol: {
    flex: 1,
    gap: 2,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  previewVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
