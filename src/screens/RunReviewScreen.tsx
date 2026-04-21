/**
 * RunReviewScreen - Post-run results display
 * Shows score, stats, improvement tips, and LLM-generated summary
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { colors, fontSize, spacing, borderRadius, touchTarget } from '../utils/theme';
import { useLanguage } from '../contexts/LanguageContext';
import type { RunResult, IssueType, LLMSummaryResult } from '../types';
import type { TranslationKey } from '../utils/i18n';
import { prepareSummaryData, summarizeRunWithLLM } from '../utils/llmSummary';

type RootStackParamList = {
  Home: undefined;
  ActiveRun: undefined;
  RunReview: { run: RunResult };
};

interface RunReviewScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RunReview'>;
  route: RouteProp<RootStackParamList, 'RunReview'>;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function getIssueLabel(type: IssueType, t: (key: TranslationKey) => string): string {
  const labels: Record<IssueType, TranslationKey> = {
    back_seat: 'issue.back_seat',
    forward_pressure: 'issue.forward_pressure',
    upper_body_rotation: 'issue.upper_body_rotation',
    poor_angulation: 'issue.poor_angulation',
    skidding: 'issue.skidding',
    weight_imbalance: 'issue.weight_imbalance',
  };
  return t(labels[type] || 'issue.back_seat');
}

function getScoreColor(score: number): string {
  if (score >= 75) return colors.success;
  if (score >= 50) return colors.warning;
  return colors.danger;
}

function getDominantIssueLabel(dominant: IssueType | null, t: (key: TranslationKey) => string): string {
  if (!dominant) return t('runReview.none');
  return getIssueLabel(dominant, t);
}

// Group issues by type and count
interface GroupedIssue {
  type: IssueType;
  label: string;
  totalFrequency: number;
  maxSeverity: 'low' | 'medium' | 'high';
  tip: string;
}

function IssueCard({ item, t }: { item: GroupedIssue; t: (key: TranslationKey) => string }) {
  const severityColor =
    item.maxSeverity === 'high'
      ? colors.danger
      : item.maxSeverity === 'medium'
      ? colors.warning
      : colors.success;

  const severityKey: TranslationKey =
    item.maxSeverity === 'high'
      ? 'runReview.severity.high'
      : item.maxSeverity === 'medium'
      ? 'runReview.severity.medium'
      : 'runReview.severity.low';

  return (
    <View style={styles.issueCard}>
      <View style={[styles.severityDot, { backgroundColor: severityColor }]} />
      <View style={styles.issueContent}>
        <View style={styles.issueHeader}>
          <Text style={styles.issueName}>
            {item.label} × {item.totalFrequency}
          </Text>
          <View
            style={[
              styles.severityBadge,
              { backgroundColor: severityColor + '30' },
            ]}
          >
            <Text style={[styles.severityBadgeText, { color: severityColor }]}>
              {t(severityKey)}
            </Text>
          </View>
        </View>
        <Text style={styles.issueTip}>{item.tip}</Text>
      </View>
    </View>
  );
}

export default function RunReviewScreen({
  navigation,
  route,
}: RunReviewScreenProps) {
  const { t } = useLanguage();
  const { run } = route.params;

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [llmSummary, setLlmSummary] = useState<LLMSummaryResult | null>(null);
  const [llmError, setLlmError] = useState<string | null>(null);

  const groupedIssues = useMemo(() => {
    const grouped = run.issues.reduce<Map<IssueType, GroupedIssue>>((acc, issue) => {
      const existing = acc.get(issue.type);
      if (existing) {
        existing.totalFrequency += issue.frequency;
        const severityOrder: Record<string, number> = { low: 0, medium: 1, high: 2 };
        if (severityOrder[issue.severity] > severityOrder[existing.maxSeverity]) {
          existing.maxSeverity = issue.severity;
        }
      } else {
        acc.set(issue.type, {
          type: issue.type,
          label: getIssueLabel(issue.type, t),
          totalFrequency: issue.frequency,
          maxSeverity: issue.severity,
          tip: issue.tip,
        });
      }
      return acc;
    }, new Map());

    return Array.from(grouped.values()).sort(
      (a, b) => b.totalFrequency - a.totalFrequency
    );
  }, [run.issues, t]);

  const handleBackToHome = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  const handleGetAISummary = useCallback(async () => {
    if (isSummarizing) return;

    try {
      setIsSummarizing(true);
      setLlmError(null);

      const summaryData = prepareSummaryData(run);
      const result = await summarizeRunWithLLM(summaryData);
      setLlmSummary(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.sensorError');
      setLlmError(message);
    } finally {
      setIsSummarizing(false);
    }
  }, [run, isSummarizing, t]);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={groupedIssues}
        keyExtractor={(item) => item.type}
        renderItem={({ item }) => <IssueCard item={item} t={t} />}
        ListHeaderComponent={
          <>
            {/* Hero Score */}
            <View style={styles.scoreSection}>
              <Text style={[styles.scoreText, { color: getScoreColor(run.score) }]}>
                {run.score}
              </Text>
              <Text style={styles.scoreLabel}>{t('runReview.outOf100')}</Text>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>⏱</Text>
                <Text style={styles.statValue}>{formatDuration(run.duration)}</Text>
                <Text style={styles.statLabel}>{t('runReview.duration')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>↻</Text>
                <Text style={styles.statValue}>{run.turnCount}</Text>
                <Text style={styles.statLabel}>{t('runReview.turns')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>!</Text>
                <Text style={styles.statValue} numberOfLines={1}>
                  {getDominantIssueLabel(run.dominantIssue, t)}
                </Text>
                <Text style={styles.statLabel}>{t('runReview.mainIssue')}</Text>
              </View>
            </View>

            {/* AI Summary Button */}
            <TouchableOpacity
              style={[styles.aiSummaryButton, isSummarizing && styles.aiSummaryButtonDisabled]}
              onPress={handleGetAISummary}
              disabled={isSummarizing}
              activeOpacity={0.8}
            >
              <Text style={styles.aiSummaryButtonText}>
                {isSummarizing ? t('runReview.generating') : t('runReview.getAiSummary')}
              </Text>
            </TouchableOpacity>

            {/* LLM Summary Card */}
            {llmSummary && (
              <View style={styles.llmSummaryCard}>
                <Text style={styles.llmSummaryTitle}>{t('runReview.aiAnalysis')}</Text>
                <Text style={styles.llmSummaryText}>{llmSummary.summary}</Text>
                {llmSummary.keyInsights.length > 0 && (
                  <View style={styles.keyInsightsSection}>
                    <Text style={styles.keyInsightsTitle}>{t('runReview.keyInsights')}</Text>
                    {llmSummary.keyInsights.map((insight, index) => (
                      <View key={index} style={styles.insightRow}>
                        <Text style={styles.insightBullet}>•</Text>
                        <Text style={styles.insightText}>{insight}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* LLM Error */}
            {llmError && (
              <View style={styles.llmErrorCard}>
                <Text style={styles.llmErrorText}>{llmError}</Text>
              </View>
            )}

            {/* Issues Section Header */}
            <View style={styles.issuesHeader}>
              <Text style={styles.sectionTitle}>{t('runReview.areasToImprove')}</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyIssues}>
            <Text style={styles.emptyText}>
              🎉 {t('runReview.greatRun')}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Back to Home Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackToHome}
        activeOpacity={0.8}
      >
        <Text style={styles.backButtonText}>{t('runReview.backToHome')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  scoreSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  scoreText: {
    fontSize: fontSize.score,
    fontWeight: 'bold',
  },
  scoreLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.card,
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  statValue: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.label,
    marginTop: spacing.xs,
  },
  issuesHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  emptyIssues: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.success,
    fontSize: fontSize.body,
    textAlign: 'center',
  },
  issueCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  severityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: spacing.md,
  },
  issueContent: {
    flex: 1,
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  issueName: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  severityBadgeText: {
    fontSize: fontSize.label,
    fontWeight: '600',
  },
  issueTip: {
    color: colors.textSecondary,
    fontSize: fontSize.label,
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: colors.primary,
    height: touchTarget.minimum,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  backButtonText: {
    color: colors.background,
    fontSize: fontSize.body,
    fontWeight: 'bold',
  },
  aiSummaryButton: {
    backgroundColor: colors.primary,
    height: touchTarget.minimum,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  aiSummaryButtonDisabled: {
    opacity: 0.6,
  },
  aiSummaryButtonText: {
    color: colors.background,
    fontSize: fontSize.body,
    fontWeight: 'bold',
  },
  llmSummaryCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  llmSummaryTitle: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  llmSummaryText: {
    color: colors.text,
    fontSize: fontSize.label,
    lineHeight: 22,
  },
  keyInsightsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.textSecondary + '30',
  },
  keyInsightsTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.label,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  insightRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  insightBullet: {
    color: colors.primary,
    fontSize: fontSize.label,
    marginRight: spacing.sm,
    lineHeight: 20,
  },
  insightText: {
    color: colors.text,
    fontSize: fontSize.label,
    flex: 1,
    lineHeight: 20,
  },
  llmErrorCard: {
    backgroundColor: colors.danger + '20',
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  llmErrorText: {
    color: colors.danger,
    fontSize: fontSize.label,
  },
});
