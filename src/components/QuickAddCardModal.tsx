import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTranslations } from '../i18n/translations';
import {
  CARD_SHADOW_STYLE,
  TABULAR_NUMS_STYLE,
  type AppTheme,
} from '../theme/tokens';
import {
  CARD_CONDITIONS,
  CARD_LANGUAGES,
  type AppPreferences,
  type CardCondition,
  type NewCardInput,
} from '../types/card';
import {
  formatMoney,
  formatSignedMoney,
  formatSignedPct,
  parseDecimalInput,
  parseIntInput,
  round2,
  todayIsoDate,
} from '../utils/cardMath';

interface QuickAddCardModalProps {
  visible: boolean;
  theme: AppTheme;
  preferences: AppPreferences;
  onClose: () => void;
  onSave: (card: NewCardInput) => Promise<void>;
}

export function QuickAddCardModal({
  visible,
  theme,
  preferences,
  onClose,
  onSave,
}: QuickAddCardModalProps) {
  const insets = useSafeAreaInsets();
  const t = getTranslations(preferences.language);
  const isEn = preferences.language === 'en';

  const [nameEs, setNameEs] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [setCode, setSetCode] = useState('3ED');
  const [setName, setSetName] = useState('');
  const [collectorNumber, setCollectorNumber] = useState('');
  const [condition, setCondition] = useState<CardCondition>('EX');
  const [language, setLanguage] = useState<string>('en');
  const [quantityText, setQuantityText] = useState('1');
  const [unitCostText, setUnitCostText] = useState('');
  const [shippingText, setShippingText] = useState('0');
  const [marketPriceText, setMarketPriceText] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => todayIsoDate());
  const [orderId, setOrderId] = useState('');
  const [deck, setDeck] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const qty = parseIntInput(quantityText, 1);
  const unitCost = parseDecimalInput(unitCostText, 0);
  const shipping = parseDecimalInput(shippingText, 0);
  const marketUnit = parseDecimalInput(marketPriceText, 0);

  const previewCost = round2(unitCost * qty + shipping);
  const previewMarket = round2(marketUnit * qty);
  const previewProfit = round2(previewMarket - previewCost);
  const previewRoi = previewCost > 0 ? (previewProfit / previewCost) * 100 : null;

  async function handleSave() {
    const cleanNameEs = nameEs.trim();
    const cleanNameEn = nameEn.trim();
    const cleanSetCode = setCode.trim().toUpperCase();

    if (!cleanNameEs && !cleanNameEn) {
      setErrorText(t.quickAdd.errMissingName);
      return;
    }
    if (!cleanSetCode) {
      setErrorText(t.quickAdd.errMissingSet);
      return;
    }

    setErrorText(null);
    setSaving(true);
    try {
      await onSave({
        nameEs: cleanNameEs || cleanNameEn,
        nameEn: cleanNameEn || cleanNameEs,
        setCode: cleanSetCode,
        setName: setName.trim(),
        collectorNumber: collectorNumber.trim(),
        condition,
        language,
        quantity: qty,
        unitCostEur: unitCost,
        shippingEur: shipping,
        marketPriceEur: marketUnit,
        purchaseDate: purchaseDate.trim() || todayIsoDate(),
        orderId: orderId.trim() || null,
        deck: deck.trim() || null,
      });
      onClose();
    } catch {
      setErrorText(t.quickAdd.errSaveFailed);
      setSaving(false);
    }
  }

  const decimalPlaceholder = isEn ? '0.00' : '0,00';

  const nameEsBlock = (
    <View style={styles.fieldGroup} key="field-name-es">
      <Text style={[styles.label, { color: theme.muted }]}>
        {t.quickAdd.nameEsLabel}
      </Text>
      <TextInput
        value={nameEs}
        onChangeText={setNameEs}
        placeholder={t.quickAdd.nameEsPlaceholder}
        placeholderTextColor={theme.muted}
        autoFocus={!isEn}
        style={[
          styles.input,
          {
            backgroundColor: theme.bg,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
      />
    </View>
  );

  const nameEnBlock = (
    <View style={styles.fieldGroup} key="field-name-en">
      <Text style={[styles.label, { color: theme.muted }]}>
        {t.quickAdd.nameEnLabel}
      </Text>
      <TextInput
        value={nameEn}
        onChangeText={setNameEn}
        placeholder={t.quickAdd.nameEnPlaceholder}
        placeholderTextColor={theme.muted}
        autoFocus={isEn}
        style={[
          styles.input,
          {
            backgroundColor: theme.bg,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: theme.backdrop }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdropTap} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            CARD_SHADOW_STYLE,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingBottom: Math.max(16, insets.bottom + 12),
            },
          ]}
        >
          {/* Sheet Header */}
          <View style={[styles.header, { borderBottomColor: theme.divider }]}>
            <View>
              <Text style={[styles.headerEyebrow, { color: theme.muted }]}>
                {t.quickAdd.eyebrow}
              </Text>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                {t.quickAdd.title}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t.common.close}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: theme.surfaceSubtle,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.closeBtnText, { color: theme.muted }]}>
                ✕
              </Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formBody}
          >
            {/* Card Name ES + EN */}
            {isEn ? [nameEnBlock, nameEsBlock] : [nameEsBlock, nameEnBlock]}

            {/* Set Code + Collector Number + Set Name */}
            <View style={styles.row2}>
              <View style={[styles.fieldGroup, styles.colHalf]}>
                <Text style={[styles.label, { color: theme.muted }]}>
                  {t.quickAdd.setCodeLabel}
                </Text>
                <TextInput
                  value={setCode}
                  onChangeText={setSetCode}
                  placeholder="3ED"
                  placeholderTextColor={theme.muted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                />
              </View>

              <View style={[styles.fieldGroup, styles.colHalf]}>
                <Text style={[styles.label, { color: theme.muted }]}>
                  {t.quickAdd.collectorLabel}
                </Text>
                <TextInput
                  value={collectorNumber}
                  onChangeText={setCollectorNumber}
                  placeholder={t.quickAdd.collectorPlaceholder}
                  placeholderTextColor={theme.muted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.muted }]}>
                {t.quickAdd.setNameLabel}
              </Text>
              <TextInput
                value={setName}
                onChangeText={setSetName}
                placeholder={t.quickAdd.setNamePlaceholder}
                placeholderTextColor={theme.muted}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.bg,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
              />
            </View>

            {/* Condition Chips */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.muted }]}>
                {t.quickAdd.conditionLabel}
              </Text>
              <View style={styles.chipWrap}>
                {CARD_CONDITIONS.map((cond) => {
                  const selected = condition === cond;
                  return (
                    <Pressable
                      key={cond}
                      onPress={() => setCondition(cond)}
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
                            color: selected
                              ? theme.accentText
                              : theme.textSecondary,
                          },
                        ]}
                      >
                        {cond}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Language Chips */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.muted }]}>
                {t.quickAdd.languageLabel}
              </Text>
              <View style={styles.chipWrap}>
                {CARD_LANGUAGES.map((lang) => {
                  const selected = language === lang;
                  return (
                    <Pressable
                      key={lang}
                      onPress={() => setLanguage(lang)}
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
                            color: selected
                              ? theme.accentText
                              : theme.textSecondary,
                          },
                        ]}
                      >
                        {lang.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Numeric Prices Grid */}
            <View style={styles.row2}>
              <View style={[styles.fieldGroup, styles.colHalf]}>
                <Text style={[styles.label, { color: theme.muted }]}>
                  {t.quickAdd.quantityLabel}
                </Text>
                <TextInput
                  value={quantityText}
                  onChangeText={setQuantityText}
                  keyboardType="number-pad"
                  placeholder="1"
                  placeholderTextColor={theme.muted}
                  style={[
                    styles.input,
                    TABULAR_NUMS_STYLE,
                    {
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                />
              </View>

              <View style={[styles.fieldGroup, styles.colHalf]}>
                <Text style={[styles.label, { color: theme.muted }]}>
                  {t.quickAdd.unitCostLabel}
                </Text>
                <TextInput
                  value={unitCostText}
                  onChangeText={setUnitCostText}
                  keyboardType="decimal-pad"
                  placeholder={decimalPlaceholder}
                  placeholderTextColor={theme.muted}
                  style={[
                    styles.input,
                    TABULAR_NUMS_STYLE,
                    {
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.row2}>
              <View style={[styles.fieldGroup, styles.colHalf]}>
                <Text style={[styles.label, { color: theme.muted }]}>
                  {t.quickAdd.shippingLabel}
                </Text>
                <TextInput
                  value={shippingText}
                  onChangeText={setShippingText}
                  keyboardType="decimal-pad"
                  placeholder={decimalPlaceholder}
                  placeholderTextColor={theme.muted}
                  style={[
                    styles.input,
                    TABULAR_NUMS_STYLE,
                    {
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                />
              </View>

              <View style={[styles.fieldGroup, styles.colHalf]}>
                <Text style={[styles.label, { color: theme.muted }]}>
                  {t.quickAdd.marketPriceLabel}
                </Text>
                <TextInput
                  value={marketPriceText}
                  onChangeText={setMarketPriceText}
                  keyboardType="decimal-pad"
                  placeholder={decimalPlaceholder}
                  placeholderTextColor={theme.muted}
                  style={[
                    styles.input,
                    TABULAR_NUMS_STYLE,
                    {
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                />
              </View>
            </View>

            {preferences.currency === 'USD' ? (
              <Text style={[styles.hintText, { color: theme.muted }]}>
                {t.quickAdd.eurBaseHint}
              </Text>
            ) : null}

            {/* Optional Metadata */}
            <View style={styles.row2}>
              <View style={[styles.fieldGroup, styles.colHalf]}>
                <Text style={[styles.label, { color: theme.muted }]}>
                  {t.quickAdd.purchaseDateLabel}
                </Text>
                <TextInput
                  value={purchaseDate}
                  onChangeText={setPurchaseDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.muted}
                  style={[
                    styles.input,
                    TABULAR_NUMS_STYLE,
                    {
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                />
              </View>

              <View style={[styles.fieldGroup, styles.colHalf]}>
                <Text style={[styles.label, { color: theme.muted }]}>
                  {t.quickAdd.deckLabel}
                </Text>
                <TextInput
                  value={deck}
                  onChangeText={setDeck}
                  placeholder={t.quickAdd.deckPlaceholder}
                  placeholderTextColor={theme.muted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.muted }]}>
                {t.quickAdd.orderIdLabel}
              </Text>
              <TextInput
                value={orderId}
                onChangeText={setOrderId}
                placeholder={t.quickAdd.orderIdPlaceholder}
                placeholderTextColor={theme.muted}
                style={[
                  styles.input,
                  TABULAR_NUMS_STYLE,
                  {
                    backgroundColor: theme.bg,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
              />
            </View>

            {/* Live Calculation Preview */}
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
          </ScrollView>

          {/* Actions Footer */}
          <View style={[styles.footer, { borderTopColor: theme.divider }]}>
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formBody: {
    padding: 18,
    gap: 12,
  },
  fieldGroup: {
    gap: 5,
  },
  row2: {
    flexDirection: 'row',
    gap: 10,
  },
  colHalf: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 11,
    fontStyle: 'italic',
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
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
