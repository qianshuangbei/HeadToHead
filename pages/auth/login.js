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
        const userDoc = res.data[0];
        // 仅在已完成资料时自动跳转首页，避免自定义头像阶段被跳走
        if (userDoc.completed_profile) {
          wx.switchTab({ url: '/pages/index/index' });
          return;
        }
        // 否则显示选择浮层
        this.setData({ showChoiceSheet: true });
        return;
      }
      // 无用户记录，显示登录按钮
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
  async handleChooseWechatProfile() {
    // 直接获取头像和昵称，并更新 users 集合后跳转首页
    const app = getApp();
    try {
      const profileRes = await wx.getUserProfile({ desc: '获取头像和昵称' });
      const { avatarUrl, nickName } = profileRes.userInfo;
      // 若用户记录已存在则更新，否则创建
      await api.getUserOrCreate(app.globalData.openid, profileRes.userInfo);
      // 更新展示字段（与完整资料区分）
      await api.updateUserInfo(app.globalData.openid, {
        nickname: nickName,
        avatar: avatarUrl,
        display_nickname: nickName,
        display_avatar: avatarUrl,
        last_login_at: Date.now()
      });
      app.globalData.userInfo = profileRes.userInfo;
      wx.showToast({ title: '已更新', icon: 'success' });
      wx.switchTab({ url: '/pages/index/index' });
    } catch (e) {
      console.error('获取/更新微信资料失败', e);
      wx.showToast({ title: '操作失败', icon: 'error' });
    }
  },
  handleChooseCustomProfile() {
    // 展开自定义资料编辑区域
    this.setData({ showCustomEditor: true });
  },
  handlePickAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFilePaths[0];
        this.setData({ avatarTemp: tempPath });
      },
      fail: (e) => {
        console.error('选择头像失败', e);
      }
    });
  },
  handleCustomNicknameInput(e) {
    this.setData({ nicknameTemp: e.detail.value });
  },
  async handleSaveCustomProfile() {
    if (this.data.savingCustom) return;
    const app = getApp();
    const nickname = (this.data.nicknameTemp || '').trim();
    const avatar = this.data.avatarTemp || '';
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    this.setData({ savingCustom: true });
    try {
      // 确保用户存在
      await api.getUserOrCreate(app.globalData.openid, { nickName: nickname, avatarUrl: avatar });
      // 更新 users 集合
      await api.updateUserInfo(app.globalData.openid, {
        nickname,
        avatar,
        display_nickname: nickname,
        display_avatar: avatar,
        completed_profile: true,
        last_login_at: Date.now()
      });
      app.globalData.userInfo = { nickName: nickname, avatarUrl: avatar };
      wx.showToast({ title: '已保存', icon: 'success' });
      wx.switchTab({ url: '/pages/index/index' });
    } catch (e) {
      console.error('保存自定义资料失败', e);
      wx.showToast({ title: '保存失败', icon: 'error' });
    } finally {
      this.setData({ savingCustom: false });
    }
  }
});
