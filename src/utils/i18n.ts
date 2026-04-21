/**
 * i18n utilities for Ski Coach MVP
 * Supports English (en) and Chinese (zh) languages
 */
export type Language = 'en' | 'zh';

// All translation keys used across the app
export type TranslationKey =
  // Home Screen
  | 'app.title'
  | 'home.connected'
  | 'home.simulator'
  | 'home.disconnected'
  | 'home.connectDevice'
  | 'home.startSkiing'
  | 'home.demoMode'
  | 'home.recentRuns'
  | 'home.noRunsYet'
  | 'home.language'
  // Active Run Screen
  | 'activeRun.endRun'
  | 'activeRun.turns'
  | 'activeRun.coaching.backSeat'
  | 'activeRun.coaching.shoulders'
  | 'activeRun.coaching.angulation'
  | 'activeRun.coaching.pressure'
  | 'activeRun.coaching.angulationTip'
  | 'activeRun.coaching.balance'
  // Run Review Screen
  | 'runReview.outOf100'
  | 'runReview.duration'
  | 'runReview.turns'
  | 'runReview.mainIssue'
  | 'runReview.none'
  | 'runReview.areasToImprove'
  | 'runReview.greatRun'
  | 'runReview.noMajorIssues'
  | 'runReview.backToHome'
  | 'runReview.severity.low'
  | 'runReview.severity.medium'
  | 'runReview.severity.high'
  | 'runReview.getAiSummary'
  | 'runReview.generating'
  | 'runReview.aiAnalysis'
  | 'runReview.keyInsights'
  // Issue Types
  | 'issue.back_seat'
  | 'issue.forward_pressure'
  | 'issue.upper_body_rotation'
  | 'issue.poor_angulation'
  | 'issue.skidding'
  | 'issue.weight_imbalance'
  // Coaching Tips
  | 'tip.backSeat'
  | 'tip.forwardPressure'
  | 'tip.upperBodyRotation'
  | 'tip.poorAngulation'
  | 'tip.skidding'
  | 'tip.weightImbalance'
  // Errors
  | 'error.connectionFailed'
  | 'error.sensorError';

type TranslationMap = Record<TranslationKey, string>;

const en: TranslationMap = {
  // Home Screen
  'app.title': 'Ski Coach',
  'home.connected': 'Connected',
  'home.simulator': 'Simulator',
  'home.disconnected': 'Disconnected',
  'home.connectDevice': 'CONNECT DEVICE',
  'home.startSkiing': 'START SKIING',
  'home.demoMode': 'Demo Mode',
  'home.recentRuns': 'Recent Runs',
  'home.noRunsYet': 'No runs yet. Hit Start!',
  'home.language': 'Language',
  // Active Run Screen
  'activeRun.endRun': 'END RUN',
  'activeRun.turns': 'Turns',
  'activeRun.coaching.backSeat': 'Keep weight forward',
  'activeRun.coaching.shoulders': 'Level shoulders',
  'activeRun.coaching.angulation': 'More angulation',
  'activeRun.coaching.pressure': 'Balance your pressure',
  'activeRun.coaching.angulationTip': 'Bend your knees more',
  'activeRun.coaching.balance': 'Center your weight',
  // Run Review Screen
  'runReview.outOf100': 'out of 100',
  'runReview.duration': 'Duration',
  'runReview.turns': 'Turns',
  'runReview.mainIssue': 'Main Issue',
  'runReview.none': 'None',
  'runReview.areasToImprove': 'Areas to Improve',
  'runReview.greatRun': 'Great run! No major issues detected.',
  'runReview.noMajorIssues': 'No major issues detected',
  'runReview.backToHome': 'BACK TO HOME',
  'runReview.severity.low': 'LOW',
  'runReview.severity.medium': 'MEDIUM',
  'runReview.severity.high': 'HIGH',
  'runReview.getAiSummary': 'Get AI Summary',
  'runReview.generating': 'Generating Summary...',
  'runReview.aiAnalysis': 'AI Analysis',
  'runReview.keyInsights': 'Key Insights',
  // Issue Types
  'issue.back_seat': 'Back Seat',
  'issue.forward_pressure': 'Forward Pressure',
  'issue.upper_body_rotation': 'Upper Body Rotation',
  'issue.poor_angulation': 'Poor Angulation',
  'issue.skidding': 'Skidding',
  'issue.weight_imbalance': 'Weight Imbalance',
  // Coaching Tips
  'tip.backSeat': 'Keep your weight forward over the balls of your feet',
  'tip.forwardPressure': 'Release pressure from the front of your boots',
  'tip.upperBodyRotation': 'Keep your shoulders parallel to the slope',
  'tip.poorAngulation': 'Increase knee bend and ankle flex for better angulation',
  'tip.skidding': 'Roll your edges more to reduce skidding',
  'tip.weightImbalance': 'Distribute weight more evenly between both feet',
  // Errors
  'error.connectionFailed': 'Failed to connect to device',
  'error.sensorError': 'Sensor error occurred',
};

const zh: TranslationMap = {
  // Home Screen
  'app.title': '滑雪教练',
  'home.connected': '已连接',
  'home.simulator': '模拟器',
  'home.disconnected': '未连接',
  'home.connectDevice': '连接设备',
  'home.startSkiing': '开始滑雪',
  'home.demoMode': '演示模式',
  'home.recentRuns': '最近滑行',
  'home.noRunsYet': '还没有记录，开始滑行吧！',
  'home.language': '语言',
  // Active Run Screen
  'activeRun.endRun': '结束滑行',
  'activeRun.turns': '转弯',
  'activeRun.coaching.backSeat': '重心向前',
  'activeRun.coaching.shoulders': '肩膀水平',
  'activeRun.coaching.angulation': '加强立刃',
  'activeRun.coaching.pressure': '平衡压力',
  'activeRun.coaching.angulationTip': '增加膝盖弯曲',
  'activeRun.coaching.balance': '重心居中',
  // Run Review Screen
  'runReview.outOf100': '总分 100',
  'runReview.duration': '时长',
  'runReview.turns': '转弯',
  'runReview.mainIssue': '主要问题',
  'runReview.none': '无',
  'runReview.areasToImprove': '需要改进的地方',
  'runReview.greatRun': '滑得很棒！未检测到重大问题。',
  'runReview.noMajorIssues': '未检测到重大问题',
  'runReview.backToHome': '返回首页',
  'runReview.severity.low': '低',
  'runReview.severity.medium': '中',
  'runReview.severity.high': '高',
  'runReview.getAiSummary': '获取AI分析',
  'runReview.generating': '正在生成分析...',
  'runReview.aiAnalysis': 'AI分析',
  'runReview.keyInsights': '关键洞察',
  // Issue Types
  'issue.back_seat': '重心靠后',
  'issue.forward_pressure': '前脚压力过大',
  'issue.upper_body_rotation': '上半身旋转',
  'issue.poor_angulation': '立刃不足',
  'issue.skidding': '推雪滑行',
  'issue.weight_imbalance': '重心失衡',
  // Coaching Tips
  'tip.backSeat': '将重心向前放在脚掌位置',
  'tip.forwardPressure': '释放前靴部分的压力',
  'tip.upperBodyRotation': '保持肩膀与雪道平行',
  'tip.poorAngulation': '增加膝盖弯曲和踝关节屈伸以改善立刃',
  'tip.skidding': '加强板刃翻转以减少推雪',
  'tip.weightImbalance': '更均匀地分配两脚之间的重量',
  // Errors
  'error.connectionFailed': '设备连接失败',
  'error.sensorError': '传感器发生错误',
};

const translations: Record<Language, TranslationMap> = { en, zh };

/**
 * Get a translation by key and language
 * Falls back to English if key is missing
 */
export function t(key: TranslationKey, lang: Language): string {
  const translation = translations[lang]?.[key];
  if (translation !== undefined) {
    return translation;
  }
  // Fallback to English
  const fallback = translations.en[key];
  if (fallback !== undefined) {
    return fallback;
  }
  // Return key itself as last resort
  return key;
}

/**
 * Get the display name for a language
 */
export function getLanguageDisplayName(lang: Language): string {
  return lang === 'en' ? 'EN' : '中文';
}

/**
 * Get all available languages
 */
export function getAvailableLanguages(): Language[] {
  return ['en', 'zh'];
}
