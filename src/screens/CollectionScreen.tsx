import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { CardRow } from '../components/CardRow';
import { CollectionHeader } from '../components/CollectionHeader';
import {
  SearchAndFilters,
  type FilterCounts,
} from '../components/SearchAndFilters';
import { getTranslations } from '../i18n/translations';
import type { AppTheme } from '../theme/tokens';
import type {
  AppPreferences,
  CardFilter,
  CardHolding,
  CardSort,
} from '../types/card';
import {
  computeCardMetrics,
  computePortfolioSummary,
  filterAndSortCards,
  type CardWithMetrics,
} from '../utils/cardMath';

interface CollectionScreenProps {
  cards: CardHolding[];
  loading: boolean;
  loadError: string | null;
  onRetryLoad: () => void;
  theme: AppTheme;
  preferences: AppPreferences;
  onSelectCard: (cardId: string) => void;
  onOpenQuickAdd: () => void;
}

export function CollectionScreen({
  cards,
  loading,
  loadError,
  onRetryLoad,
  theme,
  preferences,
  onSelectCard,
  onOpenQuickAdd,
}: CollectionScreenProps) {
  const t = getTranslations(preferences.language);

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CardFilter>('all');
  const [activeSort, setActiveSort] = useState<CardSort>('value');

  const summary = useMemo(() => computePortfolioSummary(cards), [cards]);

  const filterCounts = useMemo<FilterCounts>(() => {
    let gain = 0;
    let loss = 0;
    let zeroCost = 0;
    for (const card of cards) {
      const m = computeCardMetrics(card);
      if (m.profit > 0) gain += 1;
      if (m.profit < 0) loss += 1;
      if (m.totalCost === 0) zeroCost += 1;
    }
    return {
      all: cards.length,
      gain,
      loss,
      zeroCost,
    };
  }, [cards]);

  const filteredItems = useMemo(
    () =>
      filterAndSortCards(
        cards,
        query,
        activeFilter,
        activeSort,
        preferences.language,
      ),
    [cards, query, activeFilter, activeSort, preferences.language],
  );

  const isFiltered = query.trim().length > 0 || activeFilter !== 'all';

  const handlePressCard = useCallback(
    (card: CardHolding) => {
      onSelectCard(card.id);
    },
    [onSelectCard],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<CardWithMetrics>) => (
      <CardRow
        card={item.card}
        metrics={item.metrics}
        theme={theme}
        preferences={preferences}
        isFirst={index === 0}
        isLast={index === filteredItems.length - 1}
        onPress={handlePressCard}
      />
    ),
    [theme, preferences, filteredItems.length, handlePressCard],
  );

  const renderSeparator = useCallback(
    () => (
      <View
        style={[
          styles.separatorOuter,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.separatorLine,
            { backgroundColor: theme.divider },
          ]}
        />
      </View>
    ),
    [theme],
  );

  const renderEmpty = useCallback(() => {
    if (cards.length === 0) {
      return (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {t.empty.collectionTitle}
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.muted }]}>
            {t.empty.collectionSubtitle}
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.emptyCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          {t.empty.noResultsTitle}
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.muted }]}>
          {t.empty.noResultsSubtitle}
        </Text>
        <Pressable
          onPress={() => {
            setQuery('');
            setActiveFilter('all');
          }}
          style={({ pressed }) => [
            styles.resetBtn,
            {
              backgroundColor: theme.accentSoft,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text style={[styles.resetBtnText, { color: theme.accent }]}>
            {t.empty.clearFilters}
          </Text>
        </Pressable>
      </View>
    );
  }, [cards.length, theme, t]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.topSection}>
        <CollectionHeader
          summary={summary}
          filteredCount={filteredItems.length}
          isFiltered={isFiltered}
          theme={theme}
          preferences={preferences}
        />

        <SearchAndFilters
          query={query}
          onChangeQuery={setQuery}
          activeFilter={activeFilter}
          onChangeFilter={setActiveFilter}
          activeSort={activeSort}
          onChangeSort={setActiveSort}
          counts={filterCounts}
          theme={theme}
          language={preferences.language}
        />
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={[styles.stateText, { color: theme.muted }]}>
            {t.common.loadingCollection}
          </Text>
        </View>
      ) : loadError ? (
        <View style={styles.centerState}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {t.common.loadErrorTitle}
          </Text>
          <Text style={[styles.stateText, { color: theme.muted }]}>
            {loadError}
          </Text>
          <Pressable
            onPress={onRetryLoad}
            style={({ pressed }) => [
              styles.resetBtn,
              {
                backgroundColor: theme.accentSoft,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text style={[styles.resetBtnText, { color: theme.accent }]}>
              {t.common.retry}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.card.id}
          renderItem={renderItem}
          ItemSeparatorComponent={renderSeparator}
          ListEmptyComponent={renderEmpty}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Signature Things 3 / Todoist Floating "+" Action Button */}
      <Pressable
        onPress={onOpenQuickAdd}
        accessibilityRole="button"
        accessibilityLabel={t.quickAdd.title}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.accent,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
      >
        <Text style={[styles.fabPlus, { color: theme.accentText }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    paddingHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 92,
  },
  separatorOuter: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 14,
  },
  separatorLine: {
    height: StyleSheet.hairlineWidth,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  stateText: {
    fontSize: 13,
    textAlign: 'center',
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  resetBtn: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 16,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  fabPlus: {
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 30,
    marginTop: Platform.OS === 'ios' ? -1 : -2,
  },
});
