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
      const systemInfo = wx.getSystemSetting();

      // Force default language to Chinese regardless of system setting (plugin removed)
      const selectedLanguage = 'zh';
      i18n.setLanguage(selectedLanguage);
      this.globalData.language = selectedLanguage;
      console.log('[Language] App language set to default:', selectedLanguage);
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
      success: async res => {
        console.log('[Cloud Function] Login successful, user openid:', res.result.openid);
        self.globalData.openid = res.result.openid;
        self.globalData.isLoggedIn = true;
        self.globalData.firstLogin = true;        

        // 拉取/创建用户文档并更新 last_login_at
        try {
          const db = wx.cloud.database();
          const userDoc = await db.collection('users').where({ _openid: res.result.openid}).get();
          if (userDoc.data.length > 0) {
            self.globalData.firstLogin = false;
            await db.collection('users').where({ _openid: res.result.openid}).update({
              data:{
              last_login_at: Date.now(),
              updated_at: Date.now(),
              }
            });
            self.globalData.userInfo = userDoc.data;
          } else {
            // 创建占位用户（不获取微信信息，只保存 ID，留待 profile-setup）
            const now = Date.now();
            const placeholder = {
              nickname: '',
              avatar: '',
              display_nickname: '',
              display_avatar: '',
              completed_profile: false,
              phone: '',
              bio: '',
              first_login_at: now,
              last_login_at: now,
              created_at: now,
              updated_at: now,
            };
            await db.collection('users').add({ data: placeholder });
            self.globalData.userInfo = placeholder;
          }

          // 根据是否完成 profile 跳转
          const completed = self.globalData.userInfo.completed_profile;
          if (self.globalData.firstLogin) {
            wx.reLaunch({ url: '/pages/auth/login?showLoginPrompt=true' });
          } else {
            wx.switchTab({ url: '/pages/index/index' });
          }
        } catch (e) {
          console.error('[Login Flow] User document handling failed', e);
        }
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
    firstLogin: true,
  }
});
