import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getTranslations } from '../i18n/translations';
import {
  CARD_SHADOW_STYLE,
  TABULAR_NUMS_STYLE,
  type AppTheme,
} from '../theme/tokens';
import type { AppLanguage, CardFilter, CardSort } from '../types/card';

export interface FilterCounts {
  all: number;
  gain: number;
  loss: number;
  zeroCost: number;
}

interface SearchAndFiltersProps {
  query: string;
  onChangeQuery: (value: string) => void;
  activeFilter: CardFilter;
  onChangeFilter: (filter: CardFilter) => void;
  activeSort: CardSort;
  onChangeSort: (sort: CardSort) => void;
  counts: FilterCounts;
  theme: AppTheme;
  language: AppLanguage;
}

const FILTER_KEYS: CardFilter[] = ['all', 'gain', 'loss', 'zeroCost'];
const SORT_KEYS: CardSort[] = ['value', 'profit', 'loss', 'roi', 'name', 'date'];

export function SearchAndFilters({
  query,
  onChangeQuery,
  activeFilter,
  onChangeFilter,
  activeSort,
  onChangeSort,
  counts,
  theme,
  language,
}: SearchAndFiltersProps) {
  const t = getTranslations(language);
  const [focused, setFocused] = useState(false);
  const [sortModalOpen, setSortModalOpen] = useState(false);

  const currentSort = t.search.sorts[activeSort] ?? t.search.sorts.value;

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: theme.surface,
            borderColor: focused ? theme.accent : theme.border,
          },
        ]}
      >
        {/* Minimal Geometric Magnifying Glass */}
        <View style={styles.searchIconWrap} accessible={false}>
          <View
            style={[
              styles.searchLens,
              { borderColor: focused ? theme.accent : theme.muted },
            ]}
          />
          <View
            style={[
              styles.searchHandle,
              { backgroundColor: focused ? theme.accent : theme.muted },
            ]}
          />
        </View>

        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t.search.placeholder}
          placeholderTextColor={theme.muted}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchInput, { color: theme.text }]}
          accessibilityLabel={t.search.placeholder}
        />

        {query.length > 0 ? (
          <Pressable
            onPress={() => onChangeQuery('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t.search.clearLabel}
            style={({ pressed }) => [
              styles.clearBtn,
              {
                backgroundColor: theme.surfaceSubtle,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <Text style={[styles.clearBtnText, { color: theme.muted }]}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Filter Pills + Sort Button */}
      <View style={styles.controlsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsScroll}
          style={styles.pillsContainer}
        >
          {FILTER_KEYS.map((key) => {
            const isSelected = activeFilter === key;
            const count = counts[key];
            return (
              <Pressable
                key={key}
                onPress={() => onChangeFilter(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => [
                  styles.pill,
                  {
                    backgroundColor: isSelected ? theme.accent : theme.surface,
                    borderColor: isSelected ? theme.accent : theme.border,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    TABULAR_NUMS_STYLE,
                    { color: isSelected ? theme.accentText : theme.muted },
                  ]}
                >
                  {t.search.filters[key]} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          onPress={() => setSortModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={currentSort.label}
          style={({ pressed }) => [
            styles.sortButton,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text style={[styles.sortButtonText, { color: theme.textSecondary }]}>
            {t.search.sortLabel(currentSort.shortLabel)}
          </Text>
        </Pressable>
      </View>

      {/* Calm Sort Picker Modal */}
      <Modal
        visible={sortModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalOpen(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: theme.backdrop }]}
          onPress={() => setSortModalOpen(false)}
        >
          <Pressable
            onPress={() => {}}
            style={[
              styles.sortSheet,
              CARD_SHADOW_STYLE,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[styles.sortHeader, { borderBottomColor: theme.divider }]}
            >
              <Text style={[styles.sortTitle, { color: theme.text }]}>
                {t.search.sortModalTitle}
              </Text>
              <Pressable
                onPress={() => setSortModalOpen(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t.common.close}
              >
                <Text style={[styles.closeLabel, { color: theme.muted }]}>
                  ✕
                </Text>
              </Pressable>
            </View>

            {SORT_KEYS.map((sortKey, idx) => {
              const selected = sortKey === activeSort;
              const opt = t.search.sorts[sortKey];
              return (
                <Pressable
                  key={sortKey}
                  onPress={() => {
                    onChangeSort(sortKey);
                    setSortModalOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.sortOption,
                    idx > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: theme.divider,
                    },
                    pressed && { backgroundColor: theme.surfaceSubtle },
                  ]}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      {
                        color: selected ? theme.accent : theme.text,
                        fontWeight: selected ? '600' : '400',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {selected ? (
                    <Text style={[styles.checkMark, { color: theme.accent }]}>
                      ✓
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    gap: 10,
  },
  searchIconWrap: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchLens: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1.6,
    position: 'absolute',
    top: 1,
    left: 1,
  },
  searchHandle: {
    width: 5,
    height: 1.6,
    borderRadius: 1,
    position: 'absolute',
    bottom: 2,
    right: 1,
    transform: [{ rotate: '45deg' }],
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillsContainer: {
    flex: 1,
  },
  pillsScroll: {
    gap: 6,
    paddingRight: 4,
  },
  pill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  sortSheet: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sortHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  closeLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  sortOptionText: {
    fontSize: 14,
  },
  checkMark: {
    fontSize: 15,
    fontWeight: '700',
  },
});
