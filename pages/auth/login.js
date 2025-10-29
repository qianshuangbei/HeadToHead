// pages/auth/login.js
const api = require('../../utils/api.js');
Page({
  data: {
    showLoginPrompt: false,
    checking: true,
    showChoiceSheet: false,
    userInfo: {}
  },
  onShow() {
    this.checkUser();
  },
  onUnload() {
    if (this._openidTimer) clearInterval(this._openidTimer);
  },
  waitForOpenid() {
    const app = getApp();
    let attempts = 0;
    this.setData({ checking: true, showLoginPrompt: false });
    this._openidTimer = setInterval(() => {
      attempts++;
      if (app.globalData.openid) {
        clearInterval(this._openidTimer);
        this._openidTimer = null;
        this.checkUser();
      } else if (attempts >= 50) { // ~10秒超时
        clearInterval(this._openidTimer);
        this._openidTimer = null;
        // 超时仍未获得 openid，显示登录按钮用于手动触发流程（需保证后续能获取 openid）
        this.setData({ checking: false, showLoginPrompt: true });
      }
    }, 200);
  },
  async checkUser() {
    const app = getApp();
    const openid = app.globalData.openid;
    if (!openid) {
      this.waitForOpenid();
      return;
    }
    const db = api.initCloudBase();
    try {
      const res = await db.collection('users').where({ _openid: openid }).get();
      if (res && res.data && res.data.length > 0) {
        wx.switchTab({ url: '/pages/index/index' });
        return;
      }
      this.setData({ showLoginPrompt: true });
    } catch (e) {
      console.error('checkUser error', e);
      this.setData({ showLoginPrompt: true });
    } finally {
      this.setData({ checking: false });
    }
  },
  handleLogin() {
    wx.getUserProfile({
      desc: '获取头像和昵称',
      success: (res) => {
        const app = getApp();
        const userInfo = res.userInfo;
        api.getUserOrCreate(app.globalData.openid, userInfo)
          .then(() => {
            wx.showToast({ title: '登录成功', icon: 'success' });
            // 保存用户信息，展示选择浮层
            this.setData({ userInfo, showChoiceSheet: true });
            // 存入 global 供 profile-setup 使用
            app.globalData.userInfo = userInfo;
          }).catch(err => {
            console.error('Login failed:', err);
            wx.showToast({ title: '登录失败', icon: 'error' });
          });
      },
      fail: err => {
        console.log('User denied authorization:', err);
      }
    });
  },
  handleChooseWechatProfile() {
    wx.navigateTo({ url: '/pages/auth/profile-setup?mode=wechat' });
  },
  handleChooseCustomProfile() {
    wx.navigateTo({ url: '/pages/auth/profile-setup?mode=custom' });
  }
});
