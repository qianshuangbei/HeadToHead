App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('Please use WeChat base library 2.2.3 or above to enable cloud capabilities');
    } else {
      wx.cloud.init({
        env: 'cloud1-6g31j7da6d87ae35', // Replace with your environment ID
        traceUser: true,
      });
    }

    // Initialize language based on WeChat system settings
    this.initializeLanguage();

    // Check login status
    this.checkLogin();
  },

  /**
   * Initialize application language based on user's WeChat system settings
   * Detects language from wx.getSystemInfoSync() and sets i18n accordingly
   */
  initializeLanguage: function() {
    try {
      const i18n = require('./utils/i18n.js');
      const systemInfo = wx.getSystemInfoSync();

      // Get system language code (e.g., 'zh', 'en', 'zh-Hans', 'en-US', etc.)
      const systemLanguage = systemInfo.language || 'en';
      console.log('[Language] System language detected:', systemLanguage);

      // Determine language: Chinese (zh-*) or English (everything else)
      let selectedLanguage = 'en'; // Default to English
      if (systemLanguage.startsWith('zh')) {
        selectedLanguage = 'zh';
      }

      i18n.setLanguage(selectedLanguage);
      this.globalData.language = selectedLanguage;
      console.log('[Language] App language set to:', selectedLanguage);
    } catch (error) {
      console.error('[Language] Failed to initialize language:', error);
      // Fallback: default to English
      this.globalData.language = 'en';
    }
  },

  checkLogin: function() {
    const self = this;
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('[Cloud Function] Login successful, user openid:', res.result.openid);
        self.globalData.openid = res.result.openid;
        self.globalData.isLoggedIn = true;
      },
      fail: err => {
        console.error('[Cloud Function] Login failed', err);
        self.globalData.isLoggedIn = false;
      }
    });
  },

  globalData: {
    openid: '',
    userInfo: null,
    isLoggedIn: false,
    currentGroup: null,
    language: 'en', // Will be set by initializeLanguage()
  }
});
