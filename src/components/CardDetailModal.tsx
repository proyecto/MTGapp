/**
 * @module components/CardDetailModal
 * Slide-up card inspector presenting valuation KPIs, interactive price evolution curves,
 * multi-store price comparison, grouped metadata, and inline edit/delete workflows.
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getCardPriceHistory } from '../db/cardsRepository';
import { getTranslations } from '../i18n/translations';
import { TABULAR_NUMS_STYLE, type AppTheme } from '../theme/tokens';
import {
  CONDITION_NAMES,
  PRICE_SOURCES,
  type AppPreferences,
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
} from '../utils/cardMath';
import { PriceEvolutionChart } from './PriceEvolutionChart';
import {
  buildCardPayload,
  CardFormFields,
  createCardFormValues,
  type CardFormValues,
} from './shared/CardFormFields';
import { ModalSheet } from './shared/ModalSheet';

/** Props accepted by {@link CardDetailModal}. */
export interface CardDetailModalProps {
  /** Selected card holding, or `null` when closed. */
  card: CardHolding | null;
  visible: boolean;
  theme: AppTheme;
  preferences: AppPreferences;
  /** Optional preloaded price history map keyed by store. */
  historyMapProp?: CardPriceHistoryMap;
  onClose: () => void;
  onUpdate: (id: string, patch: UpdateCardInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

/**
 * Full-detail inspector & editor modal for an existing {@link CardHolding}.
 *
 * @param props Selected card, preloaded history, update/delete handlers, theme, and preferences.
 * @returns Slide-up modal sheet or `null` when no card is selected.
 */
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
  const t = getTranslations(preferences.language);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchedHistoryMap, setFetchedHistoryMap] =
    useState<CardPriceHistoryMap | null>(null);
  const [selectedSource, setSelectedSource] =
    useState<PriceSource>('Cardmarket');
  const [historyRange, setHistoryRange] = useState<HistoryRange>('all');
  const [formValues, setFormValues] = useState<CardFormValues>(() =>
    createCardFormValues(card, preferences.language),
  );
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

  function updateForm(patch: Partial<CardFormValues>) {
    setFormValues((prev) => ({ ...prev, ...patch }));
  }

  function handleStartEdit() {
    if (!card) return;
    setErrorText(null);
    setFormValues(createCardFormValues(card, preferences.language));
    setIsEditing(true);
  }

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
    const payload = buildCardPayload(formValues, card);
    if (!payload) {
      setErrorText(t.detail.errMissingRequired);
      return;
    }

    setErrorText(null);
    setSaving(true);
    try {
      await onUpdate(card.id, payload);
      setIsEditing(false);
    } catch {
      setErrorText(t.detail.errUpdate);
    } finally {
      setSaving(false);
    }
  }

  const historyMap: CardPriceHistoryMap | null =
    historyMapProp !== undefined ? historyMapProp : fetchedHistoryMap;
  const primaryName = getCardPrimaryName(card, preferences.language);
  const secondaryName = getCardSecondaryName(card, preferences.language);
  const metrics = computeCardMetrics(card);
  const profitColor =
    metrics.profit === 0
      ? theme.muted
      : metrics.profit > 0
        ? theme.gain
        : theme.loss;

  const subtitleParts: string[] = [];
  if (secondaryName) subtitleParts.push(secondaryName);
  if (card.setName) subtitleParts.push(card.setName);
  if (card.collectorNumber) subtitleParts.push(`#${card.collectorNumber}`);

  const activePoints =
    historyMap?.[selectedSource] ?? historyMap?.Cardmarket ?? [];
  const activeSourceLabel: PriceSource = historyMap?.[selectedSource]?.length
    ? selectedSource
    : 'Cardmarket';
  const availableStoreCount = historyMap
    ? PRICE_SOURCES.filter((src) => (historyMap[src]?.length ?? 0) > 0).length
    : 0;

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      onRequestClose={() => (isEditing ? setIsEditing(false) : onClose())}
      title={primaryName}
      subtitle={subtitleParts.length > 0 ? subtitleParts.join(' · ') : undefined}
      titleBadge={
        <View
          style={[styles.setPill, { backgroundColor: theme.surfaceSubtle }]}
        >
          <Text style={[styles.setPillText, { color: theme.textSecondary }]}>
            {card.setCode}
          </Text>
        </View>
      }
      closeAccessibilityLabel={t.common.close}
      contentGap={isEditing ? 12 : 14}
      theme={theme}
      footer={
        <View style={styles.footerRow}>
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
                    style={[styles.actionBtnText, { color: theme.accentText }]}
                  >
                    {saving ? t.common.saving : t.common.save}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      }
    >
      {!isEditing ? (
        <>
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

          {historyMap === null ? (
            <View
              style={[
                styles.chartLoadingCard,
                { backgroundColor: theme.bg, borderColor: theme.border },
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

          {availableStoreCount > 1 && historyMap ? (
            <View
              style={[
                styles.detailCard,
                { backgroundColor: theme.bg, borderColor: theme.border },
              ]}
            >
              <View
                style={[
                  styles.storeSectionHeader,
                  { borderBottomColor: theme.divider },
                ]}
              >
                <Text style={[styles.storeSectionTitle, { color: theme.text }]}>
                  {t.detail.storePricesTitle}
                </Text>
                <Text style={[styles.storeSectionHint, { color: theme.muted }]}>
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
                            color: isSelected ? theme.accent : theme.muted,
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
                      {latest ? formatMoney(latest.price, preferences) : '—'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View
            style={[
              styles.detailCard,
              { backgroundColor: theme.bg, borderColor: theme.border },
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
        </>
      ) : (
        <CardFormFields
          values={formValues}
          onChange={updateForm}
          mode="edit"
          currency={preferences.currency}
          uiLanguage={preferences.language}
          t={t}
          theme={theme}
        />
      )}

      {errorText ? (
        <Text style={[styles.errorText, { color: theme.loss }]}>
          {errorText}
        </Text>
      ) : null}
    </ModalSheet>
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
  setPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  setPillText: {
    fontSize: 11,
    fontWeight: '700',
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
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
