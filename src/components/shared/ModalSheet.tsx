/**
 * @module components/shared/ModalSheet
 * Reusable Calm Paper slide-up bottom-sheet modal shell shared across all full/partial modal flows.
 */

import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CARD_SHADOW_STYLE, type AppTheme } from '../../theme/tokens';

/** Props accepted by {@link ModalSheet}. */
export interface ModalSheetProps {
  /** Controls modal visibility. */
  visible: boolean;
  /** Invoked when backdrop, close button, or hardware back closes the sheet. */
  onClose: () => void;
  /** Optional custom handler for Android hardware back (defaults to `onClose`). */
  onRequestClose?: () => void;
  /** Optional small uppercase category eyebrow above the title. */
  eyebrow?: string;
  /** Primary sheet heading. */
  title: string;
  /** Optional muted subtitle rendered beneath the title. */
  subtitle?: string;
  /** Optional badge node rendered inline to the left of the title (e.g. set code pill). */
  titleBadge?: React.ReactNode;
  /** Localized accessibility label for the `✕` close button. */
  closeAccessibilityLabel: string;
  /** Maximum height of the sheet container (defaults to `'88%'`). */
  maxHeight?: DimensionValue;
  /** Vertical gap between scrollable children (defaults to `12`). */
  contentGap?: number;
  /** Active application theme tokens. */
  theme: AppTheme;
  /** Scrollable body content. */
  children: React.ReactNode;
  /** Action bar pinned beneath the scroll view. */
  footer: React.ReactNode;
}

/**
 * Standardized slide-up bottom sheet handling safe area padding, keyboard avoidance,
 * backdrop dismissal, header chrome, scrollable body, and pinned action footer.
 *
 * @param props Sheet configuration and slots.
 * @returns Modal bottom sheet element.
 */
export function ModalSheet({
  visible,
  onClose,
  onRequestClose,
  eyebrow,
  title,
  subtitle,
  titleBadge,
  closeAccessibilityLabel,
  maxHeight = '88%',
  contentGap = 12,
  theme,
  children,
  footer,
}: ModalSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onRequestClose ?? onClose}
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
              maxHeight,
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingBottom: Math.max(16, insets.bottom + 12),
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: theme.divider }]}>
            <View style={styles.headerLeft}>
              {eyebrow ? (
                <Text style={[styles.headerEyebrow, { color: theme.muted }]}>
                  {eyebrow}
                </Text>
              ) : null}

              <View style={styles.titleRow}>
                {titleBadge}
                <Text
                  style={[styles.headerTitle, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {title}
                </Text>
              </View>

              {subtitle ? (
                <Text style={[styles.headerSubtitle, { color: theme.muted }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={closeAccessibilityLabel}
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
            contentContainerStyle={[styles.body, { gap: contentGap }]}
          >
            {children}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.divider }]}>
            {footer}
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  body: {
    padding: 18,
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

