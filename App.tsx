/**
 * @module App
 * Root Expo application entrypoint orchestrating SQLite hydration, user preferences,
 * top-level navigation between Collection and Analytics tabs, and slide-up modal sheets.
 */

import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavBar, type AppTab } from './src/components/BottomNavBar';
import { CardDetailModal } from './src/components/CardDetailModal';
import { QuickAddCardModal } from './src/components/QuickAddCardModal';
import { SettingsModal } from './src/components/SettingsModal';
import {
  deleteCard,
  getAllPriceHistory,
  getCardPriceHistory,
  getPreferences,
  insertCard,
  listCards,
  savePreferences,
  updateCard,
} from './src/db/cardsRepository';
import { getTranslations } from './src/i18n/translations';
import { CollectionScreen } from './src/screens/CollectionScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { resolveTheme } from './src/theme/tokens';
import type {
  AppPreferences,
  CardHolding,
  CardPriceHistoryMap,
  NewCardInput,
  ThemeId,
  UpdateCardInput,
} from './src/types/card';
import {
  DEFAULT_EUR_TO_USD_RATE,
  getCardPrimaryName,
} from './src/utils/cardMath';

/**
 * Stateful root coordinator managing portfolio state, preferences, toasts, and modals.
 *
 * @returns Root application view wrapped in `SafeAreaView`.
 */
function AppContent() {
  const systemScheme = useColorScheme();
  const systemDefaultThemeId: ThemeId =
    systemScheme === 'dark' ? 'dark' : 'light';

  const [preferences, setPreferences] = useState<AppPreferences>(() => ({
    language: 'es',
    themeId: systemDefaultThemeId,
    currency: 'EUR',
    eurToUsdRate: DEFAULT_EUR_TO_USD_RATE,
  }));
  const [cards, setCards] = useState<CardHolding[]>([]);
  const [priceHistoryByCard, setPriceHistoryByCard] = useState<
    Record<string, CardPriceHistoryMap>
  >({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [activeTab, setActiveTab] = useState<AppTab>('collection');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [quickAddSession, setQuickAddSession] = useState(0);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsSession, setSettingsSession] = useState(0);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadStartedRef = useRef(false);

  const theme = resolveTheme(preferences.themeId);
  const t = getTranslations(preferences.language);
  const loadError = loadFailed ? t.common.dbOpenError : null;

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (initialLoadStartedRef.current) {
      return;
    }
    initialLoadStartedRef.current = true;
    let cancelled = false;

    Promise.all([
      listCards(),
      getAllPriceHistory(),
      getPreferences(systemDefaultThemeId),
    ])
      .then(([loadedCards, loadedHistory, loadedPrefs]) => {
        if (!cancelled) {
          setCards(loadedCards);
          setPriceHistoryByCard(loadedHistory);
          setPreferences(loadedPrefs);
          setLoadFailed(false);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadFailed(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [systemDefaultThemeId]);

  const handleRetryLoad = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const [loadedCards, loadedHistory, loadedPrefs] = await Promise.all([
        listCards(),
        getAllPriceHistory(),
        getPreferences(systemDefaultThemeId),
      ]);
      setCards(loadedCards);
      setPriceHistoryByCard(loadedHistory);
      setPreferences(loadedPrefs);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [systemDefaultThemeId]);

  const handleChangePreferences = useCallback((next: AppPreferences) => {
    setPreferences(next);
    void savePreferences(next);
  }, []);

  const selectedCard = useMemo(
    () => cards.find((c) => c.id === selectedCardId) ?? null,
    [cards, selectedCardId],
  );

  const handleAddCard = useCallback(
    async (input: NewCardInput) => {
      const created = await insertCard(input);
      const cardHistory = await getCardPriceHistory(created);
      setCards((prev) => [created, ...prev]);
      setPriceHistoryByCard((prev) => ({
        ...prev,
        [created.id]: cardHistory,
      }));
      showToast(
        t.toasts.added(getCardPrimaryName(created, preferences.language)),
      );
    },
    [preferences.language, showToast, t.toasts],
  );

  const handleUpdateCard = useCallback(
    async (id: string, patch: UpdateCardInput) => {
      const updated = await updateCard(id, patch);
      if (updated) {
        const cardHistory = await getCardPriceHistory(updated);
        setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
        setPriceHistoryByCard((prev) => ({
          ...prev,
          [id]: cardHistory,
        }));
        showToast(
          t.toasts.updated(getCardPrimaryName(updated, preferences.language)),
        );
      }
    },
    [preferences.language, showToast, t.toasts],
  );

  const handleDeleteCard = useCallback(
    async (id: string) => {
      const target = cards.find((c) => c.id === id);
      await deleteCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
      setPriceHistoryByCard((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSelectedCardId(null);
      showToast(
        t.toasts.deleted(
          target
            ? getCardPrimaryName(target, preferences.language)
            : undefined,
        ),
      );
    },
    [cards, preferences.language, showToast, t.toasts],
  );

  const handleOpenSettings = useCallback(() => {
    setSettingsSession((prev) => prev + 1);
    setSettingsVisible(true);
  }, []);

  const handleOpenQuickAdd = useCallback(() => {
    setQuickAddSession((prev) => prev + 1);
    setQuickAddVisible(true);
  }, []);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: theme.bg }]}
    >
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />

      <View style={styles.contentArea}>
        {activeTab === 'collection' ? (
          <CollectionScreen
            cards={cards}
            loading={loading}
            loadError={loadError}
            onRetryLoad={() => void handleRetryLoad()}
            theme={theme}
            preferences={preferences}
            onSelectCard={setSelectedCardId}
            onOpenQuickAdd={handleOpenQuickAdd}
          />
        ) : (
          <DashboardScreen
            cards={cards}
            priceHistoryByCard={priceHistoryByCard}
            loading={loading}
            loadError={loadError}
            onRetryLoad={() => void handleRetryLoad()}
            theme={theme}
            preferences={preferences}
            onSelectCard={setSelectedCardId}
          />
        )}

        {/* Subtle Toast Feedback above BottomNavBar */}
        {toastMessage ? (
          <View
            pointerEvents="none"
            style={[
              styles.toast,
              {
                right: activeTab === 'collection' ? 86 : 16,
                backgroundColor:
                  theme.mode === 'light' ? '#18181B' : '#27272A',
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={styles.toastText} numberOfLines={1}>
              {toastMessage}
            </Text>
          </View>
        ) : null}
      </View>

      <BottomNavBar
        activeTab={activeTab}
        settingsOpen={settingsVisible}
        onSelectTab={setActiveTab}
        onOpenSettings={handleOpenSettings}
        theme={theme}
        language={preferences.language}
      />

      <QuickAddCardModal
        key={`quick-add-${quickAddSession}`}
        visible={quickAddVisible}
        theme={theme}
        preferences={preferences}
        onClose={() => setQuickAddVisible(false)}
        onSave={handleAddCard}
      />

      <CardDetailModal
        key={`card-detail-${selectedCard?.id ?? 'none'}`}
        card={selectedCard}
        visible={selectedCard !== null}
        theme={theme}
        preferences={preferences}
        historyMapProp={
          selectedCard ? priceHistoryByCard[selectedCard.id] : undefined
        }
        onClose={() => setSelectedCardId(null)}
        onUpdate={handleUpdateCard}
        onDelete={handleDeleteCard}
      />

      <SettingsModal
        key={`settings-${settingsSession}`}
        visible={settingsVisible}
        theme={theme}
        preferences={preferences}
        onChangePreferences={handleChangePreferences}
        onClose={() => setSettingsVisible(false)}
      />
    </SafeAreaView>
  );
}

/**
 * Root exported Expo component providing `SafeAreaProvider` context.
 *
 * @returns Top-level React element.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
  toast: {
    position: 'absolute',
    left: 16,
    bottom: 18,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
});
