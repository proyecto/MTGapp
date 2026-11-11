/**
 * @module components/SettingsModal
 * Slide-up preferences modal managing language (`ES`/`EN`), extensible theme registry
 * selection (`THEME_REGISTRY`), display currency (`EUR`/`USD`), and manual FX rate input.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getTranslations } from '../i18n/translations';
import {
  TABULAR_NUMS_STYLE,
  THEME_REGISTRY,
  type AppTheme,
} from '../theme/tokens';
import type {
  AppLanguage,
  AppPreferences,
  CurrencyCode,
  ThemeId,
} from '../types/card';
import {
  DEFAULT_EUR_TO_USD_RATE,
  normalizeExchangeRate,
  parseDecimalInput,
} from '../utils/cardMath';
import { ModalSheet } from './shared/ModalSheet';

/** Props accepted by {@link SettingsModal}. */
export interface SettingsModalProps {
  visible: boolean;
  theme: AppTheme;
  preferences: AppPreferences;
  onChangePreferences: (next: AppPreferences) => void;
  onClose: () => void;
}

const LANGUAGES: AppLanguage[] = ['es', 'en'];
const CURRENCIES: CurrencyCode[] = ['EUR', 'USD'];
const THEME_IDS = Object.keys(THEME_REGISTRY) as ThemeId[];

/**
 * Modal sheet letting users switch app + card-name language, theme palette,
 * display currency, and offline EUR→USD conversion rate.
 *
 * @param props Modal visibility, active theme, current preferences, update callback, and close callback.
 * @returns Settings bottom-sheet modal element.
 */
export function SettingsModal({
  visible,
  theme,
  preferences,
  onChangePreferences,
  onClose,
}: SettingsModalProps) {
  const t = getTranslations(preferences.language);

  const [rateText, setRateText] = useState(() =>
    String(preferences.eurToUsdRate).replace(
      '.',
      preferences.language === 'en' ? '.' : ',',
    ),
  );

  function handleSelectLanguage(language: AppLanguage) {
    if (language === preferences.language) return;
    setRateText(
      String(preferences.eurToUsdRate).replace(
        '.',
        language === 'en' ? '.' : ',',
      ),
    );
    onChangePreferences({ ...preferences, language });
  }

  function handleSelectTheme(themeId: ThemeId) {
    if (themeId === preferences.themeId) return;
    onChangePreferences({ ...preferences, themeId });
  }

  function handleSelectCurrency(currency: CurrencyCode) {
    if (currency === preferences.currency) return;
    onChangePreferences({ ...preferences, currency });
  }

  function handleChangeRate(raw: string) {
    setRateText(raw);
    const parsed = parseDecimalInput(raw, -1);
    if (parsed > 0.05 && parsed < 500) {
      const normalized = normalizeExchangeRate(parsed);
      if (normalized !== preferences.eurToUsdRate) {
        onChangePreferences({ ...preferences, eurToUsdRate: normalized });
      }
    }
  }

  function handleBlurRate() {
    const parsed = parseDecimalInput(rateText, DEFAULT_EUR_TO_USD_RATE);
    const normalized = normalizeExchangeRate(
      parsed > 0.05 ? parsed : DEFAULT_EUR_TO_USD_RATE,
    );
    setRateText(
      String(normalized).replace(
        '.',
        preferences.language === 'en' ? '.' : ',',
      ),
    );
    if (normalized !== preferences.eurToUsdRate) {
      onChangePreferences({ ...preferences, eurToUsdRate: normalized });
    }
  }

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      eyebrow={t.settings.eyebrow}
      title={t.settings.title}
      closeAccessibilityLabel={t.common.close}
      maxHeight="85%"
      theme={theme}
      footer={
        <View style={styles.footerRow}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.doneBtn,
              {
                backgroundColor: theme.accent,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.doneBtnText, { color: theme.accentText }]}>
              {t.common.close}
            </Text>
          </Pressable>
        </View>
      }
    >
      {/* 1. Language */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: theme.bg, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t.settings.languageTitle}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.muted }]}>
          {t.settings.languageSubtitle}
        </Text>
        <View style={styles.optionRow}>
          {LANGUAGES.map((lang) => {
            const selected = preferences.language === lang;
            return (
              <Pressable
                key={lang}
                onPress={() => handleSelectLanguage(lang)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.optionPill,
                  {
                    backgroundColor: selected ? theme.accent : theme.surface,
                    borderColor: selected ? theme.accent : theme.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionPillText,
                    { color: selected ? theme.accentText : theme.text },
                  ]}
                >
                  {t.settings.languages[lang]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 2. Theme (extensible from THEME_REGISTRY) */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: theme.bg, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t.settings.themeTitle}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.muted }]}>
          {t.settings.themeSubtitle}
        </Text>
        <View style={styles.optionRow}>
          {THEME_IDS.map((themeId) => {
            const selected = preferences.themeId === themeId;
            const swatchTheme = THEME_REGISTRY[themeId];
            return (
              <Pressable
                key={themeId}
                onPress={() => handleSelectTheme(themeId)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.optionPill,
                  {
                    backgroundColor: selected ? theme.accent : theme.surface,
                    borderColor: selected ? theme.accent : theme.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.themeSwatchRow}>
                  <View
                    style={[
                      styles.themeSwatch,
                      {
                        backgroundColor: swatchTheme.bg,
                        borderColor: swatchTheme.accent,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.optionPillText,
                      { color: selected ? theme.accentText : theme.text },
                    ]}
                  >
                    {t.settings.themes[themeId]}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 3. Currency */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: theme.bg, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t.settings.currencyTitle}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.muted }]}>
          {t.settings.currencySubtitle}
        </Text>
        <View style={styles.optionRow}>
          {CURRENCIES.map((curr) => {
            const selected = preferences.currency === curr;
            return (
              <Pressable
                key={curr}
                onPress={() => handleSelectCurrency(curr)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.optionPill,
                  {
                    backgroundColor: selected ? theme.accent : theme.surface,
                    borderColor: selected ? theme.accent : theme.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionPillText,
                    { color: selected ? theme.accentText : theme.text },
                  ]}
                >
                  {t.settings.currencies[curr]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {preferences.currency === 'USD' ? (
          <View style={[styles.rateBox, { borderTopColor: theme.divider }]}>
            <View style={styles.rateTextBlock}>
              <Text style={[styles.rateLabel, { color: theme.text }]}>
                {t.settings.rateLabel}
              </Text>
              <Text style={[styles.rateHint, { color: theme.muted }]}>
                {t.settings.rateHint}
              </Text>
            </View>
            <TextInput
              value={rateText}
              onChangeText={handleChangeRate}
              onBlur={handleBlurRate}
              keyboardType="decimal-pad"
              style={[
                styles.rateInput,
                TABULAR_NUMS_STYLE,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
            />
          </View>
        ) : null}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  optionPill: {
    flex: 1,
    minWidth: 110,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  themeSwatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  themeSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  rateBox: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rateTextBlock: {
    flex: 1,
    gap: 2,
  },
  rateLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  rateHint: {
    fontSize: 11,
  },
  rateInput: {
    width: 78,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerRow: {
    alignItems: 'flex-end',
  },
  doneBtn: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
