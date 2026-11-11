import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { getCardPriceHistory } from '../db/cardsRepository';
import { getTranslations } from '../i18n/translations';
import {
  CARD_SHADOW_STYLE,
  TABULAR_NUMS_STYLE,
  type AppTheme,
} from '../theme/tokens';
import {
  CARD_CONDITIONS,
  CARD_LANGUAGES,
  CONDITION_NAMES,
  PRICE_SOURCES,
  type AppPreferences,
  type CardCondition,
  type CardHolding,
  type CardPriceHistoryMap,
  type HistoryRange,
  type PriceSource,
  type UpdateCardInput,
} from '../types/card';
import {
  computeCardMetrics,
  formatMoney,
  formatSignedMoney,
  formatSignedPct,
  getCardPrimaryName,
  getCardSecondaryName,
  parseDecimalInput,
  parseIntInput,
} from '../utils/cardMath';
import { PriceEvolutionChart } from './PriceEvolutionChart';

interface CardDetailModalProps {
  card: CardHolding | null;
  visible: boolean;
  theme: AppTheme;
  preferences: AppPreferences;
  historyMapProp?: CardPriceHistoryMap;
  onClose: () => void;
  onUpdate: (id: string, patch: UpdateCardInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function CardDetailModal({
  card,
  visible,
  theme,
  preferences,
  historyMapProp,
  onClose,
  onUpdate,
  onDelete,
}: CardDetailModalProps) {
  const insets = useSafeAreaInsets();
  const t = getTranslations(preferences.language);
  const isEn = preferences.language === 'en';

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchedHistoryMap, setFetchedHistoryMap] =
    useState<CardPriceHistoryMap | null>(null);
  const [selectedSource, setSelectedSource] =
    useState<PriceSource>('Cardmarket');
  const [historyRange, setHistoryRange] = useState<HistoryRange>('all');

  const [nameEs, setNameEs] = useState(() => card?.nameEs ?? '');
  const [nameEn, setNameEn] = useState(() => card?.nameEn ?? '');
  const [setCode, setSetCode] = useState(() => card?.setCode ?? '');
  const [setName, setSetName] = useState(() => card?.setName ?? '');
  const [collectorNumber, setCollectorNumber] = useState(
    () => card?.collectorNumber ?? '',
  );
  const [condition, setCondition] = useState<CardCondition>(
    () => card?.condition ?? 'EX',
  );
  const [language, setLanguage] = useState(() => card?.language ?? 'en');
  const [quantityText, setQuantityText] = useState(
    () => String(card?.quantity ?? 1),
  );
  const [unitCostText, setUnitCostText] = useState(
    () => String(card?.unitCostEur ?? 0).replace('.', ','),
  );
  const [shippingText, setShippingText] = useState(
    () => String(card?.shippingEur ?? 0).replace('.', ','),
  );
  const [marketPriceText, setMarketPriceText] = useState(
    () => String(card?.marketPriceEur ?? 0).replace('.', ','),
  );
  const [purchaseDate, setPurchaseDate] = useState(
    () => card?.purchaseDate ?? '',
  );
  const [orderId, setOrderId] = useState(() => card?.orderId ?? '');
  const [deck, setDeck] = useState(() => card?.deck ?? '');
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !card || historyMapProp !== undefined) {
      return;
    }
    let cancelled = false;
    getCardPriceHistory(card)
      .then((data) => {
        if (!cancelled) {
          setFetchedHistoryMap(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFetchedHistoryMap({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, [visible, card, historyMapProp]);

  if (!card) {
    return null;
  }

  const historyMap: CardPriceHistoryMap | null =
    historyMapProp !== undefined ? historyMapProp : fetchedHistoryMap;

  const primaryName = getCardPrimaryName(card, preferences.language);
  const secondaryName = getCardSecondaryName(card, preferences.language);

  function handleStartEdit() {
    if (!card) return;
    setErrorText(null);
    setNameEs(card.nameEs);
    setNameEn(card.nameEn);
    setSetCode(card.setCode);
    setSetName(card.setName);
    setCollectorNumber(card.collectorNumber);
    setCondition(card.condition);
    setLanguage(card.language);
    setQuantityText(String(card.quantity));
    const decimalSep = isEn ? '.' : ',';
    setUnitCostText(String(card.unitCostEur).replace('.', decimalSep));
    setShippingText(String(card.shippingEur).replace('.', decimalSep));
    setMarketPriceText(String(card.marketPriceEur).replace('.', decimalSep));
    setPurchaseDate(card.purchaseDate);
    setOrderId(card.orderId ?? '');
    setDeck(card.deck ?? '');
    setIsEditing(true);
  }

  const metrics = computeCardMetrics(card);
  const profitColor =
    metrics.profit === 0
      ? theme.muted
      : metrics.profit > 0
        ? theme.gain
        : theme.loss;

  async function executeDelete(targetId: string) {
    setSaving(true);
    setErrorText(null);
    try {
      await onDelete(targetId);
      onClose();
    } catch {
      setErrorText(t.detail.errDelete);
    } finally {
      setSaving(false);
    }
  }

  function handleConfirmDelete() {
    if (!card) return;
    const message = t.detail.deleteConfirmBody(primaryName, card.setCode);

    if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
      if (globalThis.confirm(message)) {
        void executeDelete(card.id);
      }
      return;
    }

    Alert.alert(t.detail.deleteConfirmTitle, message, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => {
          void executeDelete(card.id);
        },
      },
    ]);
  }

  async function handleSaveEdit() {
    if (!card) return;
    const cleanNameEs = nameEs.trim();
    const cleanNameEn = nameEn.trim();
    const cleanSet = setCode.trim().toUpperCase();
    if ((!cleanNameEs && !cleanNameEn) || !cleanSet) {
      setErrorText(t.detail.errMissingRequired);
      return;
    }

    setErrorText(null);
    setSaving(true);
    try {
      await onUpdate(card.id, {
        nameEs: cleanNameEs || cleanNameEn,
        nameEn: cleanNameEn || cleanNameEs,
        setCode: cleanSet,
        setName: setName.trim(),
        collectorNumber: collectorNumber.trim(),
        condition,
        language,
        quantity: parseIntInput(quantityText, card.quantity),
        unitCostEur: parseDecimalInput(unitCostText, card.unitCostEur),
        shippingEur: parseDecimalInput(shippingText, card.shippingEur),
        marketPriceEur: parseDecimalInput(marketPriceText, card.marketPriceEur),
        purchaseDate: purchaseDate.trim() || card.purchaseDate,
        orderId: orderId.trim() || null,
        deck: deck.trim() || null,
      });
      setIsEditing(false);
    } catch {
      setErrorText(t.detail.errUpdate);
    } finally {
      setSaving(false);
    }
  }

  const subtitleParts: string[] = [];
  if (secondaryName) {
    subtitleParts.push(secondaryName);
  }
  if (card.setName) {
    subtitleParts.push(card.setName);
  }
  if (card.collectorNumber) {
    subtitleParts.push(`#${card.collectorNumber}`);
  }

  const activePoints =
    historyMap?.[selectedSource] ?? historyMap?.Cardmarket ?? [];
  const activeSourceLabel: PriceSource = historyMap?.[selectedSource]?.length
    ? selectedSource
    : 'Cardmarket';
  const availableStoreCount = historyMap
    ? PRICE_SOURCES.filter((src) => (historyMap[src]?.length ?? 0) > 0).length
    : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (isEditing) {
          setIsEditing(false);
        } else {
          onClose();
        }
      }}
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
            <View style={styles.headerLeft}>
              <View style={styles.headerTitleRow}>
                <View
                  style={[
                    styles.setPill,
                    { backgroundColor: theme.surfaceSubtle },
                  ]}
                >
                  <Text
                    style={[styles.setPillText, { color: theme.textSecondary }]}
                  >
                    {card.setCode}
                  </Text>
                </View>
                <Text
                  style={[styles.headerTitle, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {primaryName}
                </Text>
              </View>
              {subtitleParts.length > 0 ? (
                <Text style={[styles.headerSubtitle, { color: theme.muted }]}>
                  {subtitleParts.join(' · ')}
                </Text>
              ) : null}
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
            contentContainerStyle={styles.body}
          >
            {!isEditing ? (
              <>
                {/* Hero Valuation Strip */}
                <View
                  style={[
                    styles.kpiStrip,
                    {
                      backgroundColor: theme.surfaceSubtle,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={styles.kpiCell}>
                    <Text style={[styles.kpiLabel, { color: theme.muted }]}>
                      {t.detail.currentValue}
                    </Text>
                    <Text
                      style={[
                        styles.kpiValue,
                        TABULAR_NUMS_STYLE,
                        { color: theme.text },
                      ]}
                    >
                      {formatMoney(metrics.totalMarket, preferences)}
                    </Text>
                  </View>

                  <View style={styles.kpiCell}>
                    <Text style={[styles.kpiLabel, { color: theme.muted }]}>
                      {t.detail.investment}
                    </Text>
                    <Text
                      style={[
                        styles.kpiValue,
                        TABULAR_NUMS_STYLE,
                        { color: theme.text },
                      ]}
                    >
                      {formatMoney(metrics.totalCost, preferences)}
                    </Text>
                  </View>

                  <View style={styles.kpiCell}>
                    <Text style={[styles.kpiLabel, { color: theme.muted }]}>
                      {t.detail.profit}
                    </Text>
                    <Text
                      style={[
                        styles.kpiValue,
                        TABULAR_NUMS_STYLE,
                        { color: profitColor },
                      ]}
                    >
                      {formatSignedMoney(metrics.profit, preferences)}
                    </Text>
                    <Text
                      style={[
                        styles.kpiSub,
                        TABULAR_NUMS_STYLE,
                        { color: profitColor },
                      ]}
                    >
                      {formatSignedPct(metrics.roiPct, preferences.language)}
                    </Text>
                  </View>
                </View>

                {/* Price Evolution Chart */}
                {historyMap === null ? (
                  <View
                    style={[
                      styles.chartLoadingCard,
                      {
                        backgroundColor: theme.bg,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <ActivityIndicator size="small" color={theme.accent} />
                  </View>
                ) : (
                  <PriceEvolutionChart
                    points={activePoints}
                    source={activeSourceLabel}
                    range={historyRange}
                    onChangeRange={setHistoryRange}
                    unitCostEur={card.unitCostEur}
                    theme={theme}
                    preferences={preferences}
                  />
                )}

                {/* Multi-store comparison */}
                {availableStoreCount > 1 && historyMap ? (
                  <View
                    style={[
                      styles.detailCard,
                      {
                        backgroundColor: theme.bg,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.storeSectionHeader,
                        { borderBottomColor: theme.divider },
                      ]}
                    >
                      <Text
                        style={[styles.storeSectionTitle, { color: theme.text }]}
                      >
                        {t.detail.storePricesTitle}
                      </Text>
                      <Text
                        style={[styles.storeSectionHint, { color: theme.muted }]}
                      >
                        {t.detail.storePricesHint}
                      </Text>
                    </View>
                    {PRICE_SOURCES.map((sourceName, index) => {
                      const pts = historyMap[sourceName];
                      const latest =
                        pts && pts.length > 0 ? pts[pts.length - 1] : null;
                      const isSelected = activeSourceLabel === sourceName;
                      const isLastStore = index === PRICE_SOURCES.length - 1;
                      return (
                        <Pressable
                          key={sourceName}
                          disabled={!latest}
                          onPress={() => setSelectedSource(sourceName)}
                          style={({ pressed }) => [
                            styles.detailRow,
                            !isLastStore && {
                              borderBottomWidth: StyleSheet.hairlineWidth,
                              borderBottomColor: theme.divider,
                            },
                            pressed &&
                              latest && { backgroundColor: theme.surfaceSubtle },
                          ]}
                        >
                          <View style={styles.storeLabelWrap}>
                            <View
                              style={[
                                styles.storeDot,
                                {
                                  backgroundColor: isSelected
                                    ? theme.accent
                                    : theme.border,
                                },
                              ]}
                            />
                            <Text
                              style={[
                                styles.detailLabel,
                                {
                                  color: isSelected
                                    ? theme.accent
                                    : theme.muted,
                                  fontWeight: isSelected ? '600' : '400',
                                },
                              ]}
                            >
                              {sourceName}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.detailValue,
                              TABULAR_NUMS_STYLE,
                              {
                                color: latest
                                  ? isSelected
                                    ? theme.accent
                                    : theme.text
                                  : theme.muted,
                              },
                            ]}
                          >
                            {latest
                              ? formatMoney(latest.price, preferences)
                              : '—'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                {/* Grouped Detail Metadata Rows */}
                <View
                  style={[
                    styles.detailCard,
                    {
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <DetailRow
                    label={t.detail.condition}
                    value={`${card.condition} · ${CONDITION_NAMES[card.condition]}`}
                    theme={theme}
                  />
                  <DetailRow
                    label={t.detail.language}
                    value={card.language.toUpperCase()}
                    theme={theme}
                  />
                  <DetailRow
                    label={t.detail.quantity}
                    value={`${card.quantity} ${card.quantity === 1 ? t.common.copySingular : t.common.copyPlural}`}
                    theme={theme}
                    tabular
                  />
                  <DetailRow
                    label={t.detail.unitCost}
                    value={formatMoney(card.unitCostEur, preferences)}
                    theme={theme}
                    tabular
                  />
                  <DetailRow
                    label={t.detail.shipping}
                    value={formatMoney(card.shippingEur, preferences)}
                    theme={theme}
                    tabular
                  />
                  <DetailRow
                    label={t.detail.marketUnit}
                    value={formatMoney(card.marketPriceEur, preferences)}
                    theme={theme}
                    tabular
                  />
                  <DetailRow
                    label={t.detail.purchaseDate}
                    value={card.purchaseDate || '—'}
                    theme={theme}
                    tabular
                  />
                  <DetailRow
                    label={t.detail.orderId}
                    value={card.orderId ?? '—'}
                    theme={theme}
                    tabular
                  />
                  <DetailRow
                    label={t.detail.deck}
                    value={card.deck ?? '—'}
                    theme={theme}
                  />
                  <DetailRow
                    label={t.detail.cardId}
                    value={card.id}
                    theme={theme}
                    tabular
                    isLast
                  />
                </View>

                {errorText ? (
                  <Text style={[styles.errorText, { color: theme.loss }]}>
                    {errorText}
                  </Text>
                ) : null}
              </>
            ) : (
              /* Edit Form */
              <View style={styles.editForm}>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.muted }]}>
                    {t.detail.nameEsEdit}
                  </Text>
                  <TextInput
                    value={nameEs}
                    onChangeText={setNameEs}
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

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.muted }]}>
                    {t.detail.nameEnEdit}
                  </Text>
                  <TextInput
                    value={nameEn}
                    onChangeText={setNameEn}
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

                <View style={styles.row2}>
                  <View style={[styles.fieldGroup, styles.colHalf]}>
                    <Text style={[styles.label, { color: theme.muted }]}>
                      {t.detail.setCodeEdit}
                    </Text>
                    <TextInput
                      value={setCode}
                      onChangeText={setSetCode}
                      autoCapitalize="characters"
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
                    {t.detail.setNameEdit}
                  </Text>
                  <TextInput
                    value={setName}
                    onChangeText={setSetName}
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

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.muted }]}>
                    {t.detail.condition}
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
                              backgroundColor: selected
                                ? theme.accent
                                : theme.bg,
                              borderColor: selected
                                ? theme.accent
                                : theme.border,
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

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.muted }]}>
                    {t.detail.language}
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
                              backgroundColor: selected
                                ? theme.accent
                                : theme.bg,
                              borderColor: selected
                                ? theme.accent
                                : theme.border,
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

                <View style={styles.row2}>
                  <View style={[styles.fieldGroup, styles.colHalf]}>
                    <Text style={[styles.label, { color: theme.muted }]}>
                      {t.quickAdd.quantityLabel}
                    </Text>
                    <TextInput
                      value={quantityText}
                      onChangeText={setQuantityText}
                      keyboardType="number-pad"
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

                <View style={styles.row2}>
                  <View style={[styles.fieldGroup, styles.colHalf]}>
                    <Text style={[styles.label, { color: theme.muted }]}>
                      {t.detail.purchaseDate}
                    </Text>
                    <TextInput
                      value={purchaseDate}
                      onChangeText={setPurchaseDate}
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
                      {t.detail.deck}
                    </Text>
                    <TextInput
                      value={deck}
                      onChangeText={setDeck}
                      placeholder={t.detail.optional}
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
                    {t.detail.orderId}
                  </Text>
                  <TextInput
                    value={orderId}
                    onChangeText={setOrderId}
                    placeholder={t.detail.optional}
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

                {errorText ? (
                  <Text style={[styles.errorText, { color: theme.loss }]}>
                    {errorText}
                  </Text>
                ) : null}
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: theme.divider }]}>
            {!isEditing ? (
              <>
                <Pressable
                  onPress={handleConfirmDelete}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    {
                      backgroundColor: theme.lossBg,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.actionBtnText, { color: theme.loss }]}>
                    {t.common.delete}
                  </Text>
                </Pressable>

                <View style={styles.footerRight}>
                  <Pressable
                    onPress={handleStartEdit}
                    disabled={saving}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      {
                        backgroundColor: theme.accentSoft,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.actionBtnText, { color: theme.accent }]}>
                      {t.common.edit}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={onClose}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      {
                        backgroundColor: theme.surfaceSubtle,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.actionBtnText, { color: theme.text }]}>
                      {t.common.close}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View />
                <View style={styles.footerRight}>
                  <Pressable
                    onPress={() => setIsEditing(false)}
                    disabled={saving}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      {
                        backgroundColor: theme.surfaceSubtle,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.actionBtnText, { color: theme.text }]}>
                      {t.common.cancel}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSaveEdit}
                    disabled={saving}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      {
                        backgroundColor: theme.accent,
                        opacity: saving || pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: theme.accentText },
                      ]}
                    >
                      {saving ? t.common.saving : t.common.save}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  theme: AppTheme;
  tabular?: boolean;
  isLast?: boolean;
}

function DetailRow({ label, value, theme, tabular, isLast }: DetailRowProps) {
  return (
    <View
      style={[
        styles.detailRow,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.divider,
        },
      ]}
    >
      <Text style={[styles.detailLabel, { color: theme.muted }]}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          tabular && TABULAR_NUMS_STYLE,
          { color: theme.text },
        ]}
      >
        {value}
      </Text>
    </View>
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  setPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '400',
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
  body: {
    padding: 18,
    gap: 14,
  },
  kpiStrip: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    gap: 8,
  },
  kpiCell: {
    flex: 1,
    gap: 2,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  kpiSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  chartLoadingCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  storeSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  storeSectionHint: {
    fontSize: 11,
    fontWeight: '400',
  },
  storeLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  detailCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '400',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  editForm: {
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
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
