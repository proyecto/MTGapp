/**
 * @module components/shared/CardFormFields
 * Unified card inventory form model, Factory helpers (`createCardFormValues`,
 * `buildCardPayload`), and shared form JSX consumed by both Add and Edit modals.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Translations } from '../../i18n/translations';
import type { AppTheme } from '../../theme/tokens';
import {
  CARD_CONDITIONS,
  CARD_LANGUAGES,
  type AppLanguage,
  type CardCondition,
  type CardHolding,
  type CurrencyCode,
  type NewCardInput,
} from '../../types/card';
import {
  parseDecimalInput,
  parseIntInput,
  todayIsoDate,
} from '../../utils/cardMath';
import { ChipSelector, FormField } from './FormControls';

/** Uncontrolled-text form state shared between QuickAdd and CardDetail edit flows. */
export interface CardFormValues {
  nameEs: string;
  nameEn: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  condition: CardCondition;
  language: string;
  quantityText: string;
  unitCostText: string;
  shippingText: string;
  marketPriceText: string;
  purchaseDate: string;
  orderId: string;
  deck: string;
}

const CONDITION_OPTIONS = CARD_CONDITIONS.map((c) => ({ value: c, label: c }));
const LANGUAGE_OPTIONS = CARD_LANGUAGES.map((l) => ({
  value: l,
  label: l.toUpperCase(),
}));

/**
 * Factory creating initialized {@link CardFormValues} for either a new card entry
 * or editing an existing {@link CardHolding}.
 *
 * @param card Existing card when editing, or `null`/`undefined` for a blank entry.
 * @param uiLanguage Active UI language controlling initial decimal formatting.
 * @returns Ready-to-bind form values state object.
 */
export function createCardFormValues(
  card: CardHolding | null | undefined,
  uiLanguage: AppLanguage,
): CardFormValues {
  const decimalSep = uiLanguage === 'en' ? '.' : ',';
  if (!card) {
    return {
      nameEs: '',
      nameEn: '',
      setCode: '3ED',
      setName: '',
      collectorNumber: '',
      condition: 'EX',
      language: 'en',
      quantityText: '1',
      unitCostText: '',
      shippingText: '0',
      marketPriceText: '',
      purchaseDate: todayIsoDate(),
      orderId: '',
      deck: '',
    };
  }

  return {
    nameEs: card.nameEs,
    nameEn: card.nameEn,
    setCode: card.setCode,
    setName: card.setName,
    collectorNumber: card.collectorNumber,
    condition: card.condition,
    language: card.language,
    quantityText: String(card.quantity),
    unitCostText: String(card.unitCostEur).replace('.', decimalSep),
    shippingText: String(card.shippingEur).replace('.', decimalSep),
    marketPriceText: String(card.marketPriceEur).replace('.', decimalSep),
    purchaseDate: card.purchaseDate,
    orderId: card.orderId ?? '',
    deck: card.deck ?? '',
  };
}

/**
 * Parses and validates {@link CardFormValues} into a structured {@link NewCardInput} payload
 * usable for both inserts and full updates.
 *
 * @param values Current form strings.
 * @param fallback Existing holding defaults when editing, or omitted on insert.
 * @returns Validated payload or `null` if required card name or set code are missing.
 */
export function buildCardPayload(
  values: CardFormValues,
  fallback?: Pick<
    CardHolding,
    'quantity' | 'unitCostEur' | 'shippingEur' | 'marketPriceEur' | 'purchaseDate'
  >,
): NewCardInput | null {
  const cleanNameEs = values.nameEs.trim();
  const cleanNameEn = values.nameEn.trim();
  const cleanSetCode = values.setCode.trim().toUpperCase();

  if ((!cleanNameEs && !cleanNameEn) || !cleanSetCode) {
    return null;
  }

  return {
    nameEs: cleanNameEs || cleanNameEn,
    nameEn: cleanNameEn || cleanNameEs,
    setCode: cleanSetCode,
    setName: values.setName.trim(),
    collectorNumber: values.collectorNumber.trim(),
    condition: values.condition,
    language: values.language,
    quantity: parseIntInput(values.quantityText, fallback?.quantity ?? 1),
    unitCostEur: parseDecimalInput(
      values.unitCostText,
      fallback?.unitCostEur ?? 0,
    ),
    shippingEur: parseDecimalInput(
      values.shippingText,
      fallback?.shippingEur ?? 0,
    ),
    marketPriceEur: parseDecimalInput(
      values.marketPriceText,
      fallback?.marketPriceEur ?? 0,
    ),
    purchaseDate:
      values.purchaseDate.trim() || fallback?.purchaseDate || todayIsoDate(),
    orderId: values.orderId.trim() || null,
    deck: values.deck.trim() || null,
  };
}

/** Props for {@link CardFormFields}. */
export interface CardFormFieldsProps {
  /** Current form state object. */
  values: CardFormValues;
  /** Partial state updater helper. */
  onChange: (patch: Partial<CardFormValues>) => void;
  /** `'add'` shows placeholders and autofocuses primary name; `'edit'` uses compact edit labels. */
  mode: 'add' | 'edit';
  /** Active display currency (`'USD'` renders the EUR-base hint). */
  currency: CurrencyCode;
  /** Active UI language controlling field labels and name field order. */
  uiLanguage: AppLanguage;
  /** Localized strings dictionary. */
  t: Translations;
  /** Active theme palette. */
  theme: AppTheme;
}

/**
 * Shared form body rendering card names, edition metadata, condition/language chips,
 * pricing fields, purchase date, deck, and order ID.
 *
 * @param props Form state, updater, mode, locale/currency context, and theme.
 * @returns Fragment of structured card input rows.
 */
export function CardFormFields({
  values,
  onChange,
  mode,
  currency,
  uiLanguage,
  t,
  theme,
}: CardFormFieldsProps) {
  const isAdd = mode === 'add';
  const isEn = uiLanguage === 'en';
  const decimalPlaceholder = isEn ? '0.00' : '0,00';

  const nameEsField = (
    <FormField
      key="field-name-es"
      label={isAdd ? t.quickAdd.nameEsLabel : t.detail.nameEsEdit}
      value={values.nameEs}
      onChangeText={(nameEs) => onChange({ nameEs })}
      placeholder={isAdd ? t.quickAdd.nameEsPlaceholder : undefined}
      autoFocus={isAdd && !isEn}
      theme={theme}
    />
  );

  const nameEnField = (
    <FormField
      key="field-name-en"
      label={isAdd ? t.quickAdd.nameEnLabel : t.detail.nameEnEdit}
      value={values.nameEn}
      onChangeText={(nameEn) => onChange({ nameEn })}
      placeholder={isAdd ? t.quickAdd.nameEnPlaceholder : undefined}
      autoFocus={isAdd && isEn}
      theme={theme}
    />
  );

  return (
    <>
      {isAdd && isEn ? [nameEnField, nameEsField] : [nameEsField, nameEnField]}

      <View style={styles.row2}>
        <FormField
          halfWidth
          label={isAdd ? t.quickAdd.setCodeLabel : t.detail.setCodeEdit}
          value={values.setCode}
          onChangeText={(setCode) => onChange({ setCode })}
          placeholder={isAdd ? '3ED' : undefined}
          autoCapitalize="characters"
          autoCorrect={false}
          theme={theme}
        />
        <FormField
          halfWidth
          label={t.quickAdd.collectorLabel}
          value={values.collectorNumber}
          onChangeText={(collectorNumber) => onChange({ collectorNumber })}
          placeholder={isAdd ? t.quickAdd.collectorPlaceholder : undefined}
          theme={theme}
        />
      </View>

      <FormField
        label={isAdd ? t.quickAdd.setNameLabel : t.detail.setNameEdit}
        value={values.setName}
        onChangeText={(setName) => onChange({ setName })}
        placeholder={isAdd ? t.quickAdd.setNamePlaceholder : undefined}
        theme={theme}
      />

      <ChipSelector
        label={isAdd ? t.quickAdd.conditionLabel : t.detail.condition}
        value={values.condition}
        options={CONDITION_OPTIONS}
        onChange={(condition) => onChange({ condition })}
        theme={theme}
      />

      <ChipSelector
        label={isAdd ? t.quickAdd.languageLabel : t.detail.language}
        value={values.language}
        options={LANGUAGE_OPTIONS}
        onChange={(language) => onChange({ language })}
        theme={theme}
      />

      <View style={styles.row2}>
        <FormField
          halfWidth
          tabular
          label={t.quickAdd.quantityLabel}
          value={values.quantityText}
          onChangeText={(quantityText) => onChange({ quantityText })}
          keyboardType="number-pad"
          placeholder={isAdd ? '1' : undefined}
          theme={theme}
        />
        <FormField
          halfWidth
          tabular
          label={t.quickAdd.unitCostLabel}
          value={values.unitCostText}
          onChangeText={(unitCostText) => onChange({ unitCostText })}
          keyboardType="decimal-pad"
          placeholder={isAdd ? decimalPlaceholder : undefined}
          theme={theme}
        />
      </View>

      <View style={styles.row2}>
        <FormField
          halfWidth
          tabular
          label={t.quickAdd.shippingLabel}
          value={values.shippingText}
          onChangeText={(shippingText) => onChange({ shippingText })}
          keyboardType="decimal-pad"
          placeholder={isAdd ? decimalPlaceholder : undefined}
          theme={theme}
        />
        <FormField
          halfWidth
          tabular
          label={t.quickAdd.marketPriceLabel}
          value={values.marketPriceText}
          onChangeText={(marketPriceText) => onChange({ marketPriceText })}
          keyboardType="decimal-pad"
          placeholder={isAdd ? decimalPlaceholder : undefined}
          theme={theme}
        />
      </View>

      {currency === 'USD' ? (
        <Text style={[styles.hintText, { color: theme.muted }]}>
          {t.quickAdd.eurBaseHint}
        </Text>
      ) : null}

      <View style={styles.row2}>
        <FormField
          halfWidth
          tabular
          label={isAdd ? t.quickAdd.purchaseDateLabel : t.detail.purchaseDate}
          value={values.purchaseDate}
          onChangeText={(purchaseDate) => onChange({ purchaseDate })}
          placeholder="YYYY-MM-DD"
          theme={theme}
        />
        <FormField
          halfWidth
          label={isAdd ? t.quickAdd.deckLabel : t.detail.deck}
          value={values.deck}
          onChangeText={(deck) => onChange({ deck })}
          placeholder={
            isAdd ? t.quickAdd.deckPlaceholder : t.detail.optional
          }
          theme={theme}
        />
      </View>

      <FormField
        tabular
        label={isAdd ? t.quickAdd.orderIdLabel : t.detail.orderId}
        value={values.orderId}
        onChangeText={(orderId) => onChange({ orderId })}
        placeholder={isAdd ? t.quickAdd.orderIdPlaceholder : t.detail.optional}
        theme={theme}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row2: {
    flexDirection: 'row',
    gap: 10,
  },
  hintText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});

