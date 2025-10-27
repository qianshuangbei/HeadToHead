/**
 * Internationalization (i18n) Module
 * Manages multi-language support for user-facing messages
 *
 * Usage:
 *   const i18n = require('../../utils/i18n.js');
 *   i18n.setLanguage('en'); // 'en' or 'zh'
 *   wx.showToast({ title: i18n.t('loginSuccess') });
 */

const translations = {
  en: {
    // Authentication
    'loginSuccess': 'Login successful',
    'loginFailed': 'Login failed',
    'userDeniedAuth': 'User denied authorization',

    // Loading
    'loading': 'Loading...',
    'loadFailed': 'Load failed',
    'loadUserInfoFailed': 'Failed to load user info',
    'loadGroupsFailed': 'Failed to load groups',
    'loadGroupDetailsFailed': 'Failed to load group details',
    'loadSeasonsFailed': 'Failed to load seasons',
    'loadRankingsFailed': 'Failed to load rankings',
    'loadPendingMatchesFailed': 'Failed to load pending matches',
    'loadRecentMatchesFailed': 'Failed to load recent matches',
    'loadOpponentsFailed': 'Failed to load opponents',
    'loadSeasonFailed': 'Failed to load season',

    // Group operations
    'createGroupSuccess': 'Creation successful!',
    'createGroupFailed': 'Creation failed',
    'joinGroupSuccess': 'Join successful!',
    'joinGroupFailed': 'Join failed',
    'accessCodeCopied': 'Access code copied',
    'confirmLeaveGroup': 'Confirm leave group',
    'confirmLeaveGroupContent': 'Are you sure you want to leave this group?',
    'groupLeftSuccess': 'Left group',

    // Group creation validation
    'enterGroupName': 'Please enter group name',
    'enterSeasonName': 'Please enter season name',
    'selectSeasonDates': 'Please select season dates',

    // Match operations
    'uploadSuccess': 'Upload successful!',
    'uploadFailed': 'Upload failed',
    'approvalPassed': 'Review passed',
    'approvalRejected': 'Rejected',
    'approveFailed': 'Failed to approve match',
    'rejectFailed': 'Failed to reject match',

    // Match upload validation
    'selectOpponent': 'Please select opponent',
    'enterSet1Score': 'Please enter set 1 score',
    'enterSet2Score': 'Please enter set 2 score',

    // Group join validation
    'enterAccessCode': 'Please enter access code',
    'accessCodeMust6Digits': 'Access code must be 6 digits',

    // Unknown player fallback
    'unknownPlayer': 'Unknown Player',
  },
  zh: {
    // Authentication
    'loginSuccess': '登录成功',
    'loginFailed': '登录失败',
    'userDeniedAuth': '用户拒绝授权',

    // Loading
    'loading': '加载中...',
    'loadFailed': '加载失败',
    'loadUserInfoFailed': '加载用户信息失败',
    'loadGroupsFailed': '加载Group失败',
    'loadGroupDetailsFailed': '加载Group详情失败',
    'loadSeasonsFailed': '加载赛季失败',
    'loadRankingsFailed': '加载排名失败',
    'loadPendingMatchesFailed': '加载待审核比赛失败',
    'loadRecentMatchesFailed': '加载最近比赛失败',
    'loadOpponentsFailed': '加载对手失败',
    'loadSeasonFailed': '加载赛季失败',

    // Group operations
    'createGroupSuccess': '创建成功！',
    'createGroupFailed': '创建失败',
    'joinGroupSuccess': '加入成功！',
    'joinGroupFailed': '加入失败',
    'accessCodeCopied': '已复制分享码',
    'confirmLeaveGroup': '确认退出',
    'confirmLeaveGroupContent': '确认要退出该Group吗？',
    'groupLeftSuccess': '已退出',

    // Group creation validation
    'enterGroupName': '请输入Group名称',
    'enterSeasonName': '请输入赛季名称',
    'selectSeasonDates': '请选择赛季日期',

    // Match operations
    'uploadSuccess': '上传成功！',
    'uploadFailed': '上传失败',
    'approvalPassed': '审核通过',
    'approvalRejected': '已拒绝',
    'approveFailed': '审核失败',
    'rejectFailed': '拒绝失败',

    // Match upload validation
    'selectOpponent': '请选择对手',
    'enterSet1Score': '请输入第一盘比分',
    'enterSet2Score': '请输入第二盘比分',

    // Group join validation
    'enterAccessCode': '请输入分享码',
    'accessCodeMust6Digits': '分享码必须是6位',

    // Unknown player fallback
    'unknownPlayer': '未知玩家',
  }
};

// Default language will be auto-detected in app.js via initializeLanguage()
// Fallback to English if auto-detection fails
let currentLanguage = 'en';

/**
 * Set the current language
 * @param {string} lang - Language code ('en' or 'zh')
 */
function setLanguage(lang) {
  if (translations[lang]) {
    currentLanguage = lang;
  } else {
    console.warn(`[i18n] Language '${lang}' not supported, falling back to '${currentLanguage}'`);
  }
}

/**
 * Get current language
 * @returns {string} Current language code
 */
function getLanguage() {
  return currentLanguage;
}

/**
 * Translate a message key
 * @param {string} key - Message key
 * @param {object} params - Optional parameters for string interpolation
 * @returns {string} Translated message
 */
function translate(key, params = {}) {
  let message = translations[currentLanguage]?.[key];

  if (!message) {
    console.warn(`[i18n] Missing translation for key '${key}' in language '${currentLanguage}'`);
    message = translations['en'][key] || key; // Fallback to English
  }

  // Simple string interpolation: replace {param} with param value
  Object.keys(params).forEach(param => {
    message = message.replace(new RegExp(`{${param}}`, 'g'), params[param]);
  });

  return message;
}

/**
 * Alias for translate()
 */
function t(key, params) {
  return translate(key, params);
}

module.exports = {
  setLanguage,
  getLanguage,
  translate,
  t,
  translations
};
