// pages/auth/login.js
const api = require('../../utils/api.js');
const db = api.initCloudBase();
Page({
  data: {
    showLoginPrompt: false,
    checking: true,
    showChoiceSheet: false,
    userInfo: {},
    avatarUrl: '',
    nickName: '',
    submitting: false
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
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail 
    var submitting = this.data.nickName != '';
    this.setData({
      avatarUrl: avatarUrl,
      submitting: submitting
    })
    this.onSwitch();
  },
  onNicknameInput(e){
    this.setData({nickName: e.detail.value});
    var submitting = this.data.avatarUrl != '';
    this.setData({submitting: submitting});
    this.onSwitch();
  },
  async onSwitch(){
    const app = getApp();
    if(this.data.submitting){
      try {
        // 上传头像到云存储
        let cloudAvatarUrl = this.data.avatarUrl;

        console.log('=== onSwitch upload avatar ===');
        console.log('Original avatarUrl:', this.data.avatarUrl);

        // 如果是临时文件路径，需要上传到云存储
        if (this.data.avatarUrl && !this.data.avatarUrl.startsWith('cloud://')) {
          // 检查是否是无效路径
          if (this.data.avatarUrl.startsWith('http://tmp/')) {
            console.warn('Invalid avatar path, skipping upload');
            wx.showToast({ title: '头像路径无效，请重新选择', icon: 'error' });
            return;
          }

          console.log('Uploading avatar to cloud storage...');
          const ext = this.data.avatarUrl.split('.').pop();
          const cloudPath = `avatars/${app.globalData.openid}_${Date.now()}.${ext}`;
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: this.data.avatarUrl,
          });
          cloudAvatarUrl = uploadRes.fileID;
          console.log('Upload success, fileID:', cloudAvatarUrl);
        }

        await db.collection('users').where({ _openid: app.globalData.openid }).update({
          data:{
            display_nickname: this.data.nickname,
            display_avatar: cloudAvatarUrl,
            avatar: cloudAvatarUrl,
            nickname: this.data.nickName,
            completed_profile: true,
            handedness: this.data.handedness,
            racket_primary: this.data.racket_primary,
            tags: this.data.tags,
            updated_at: Date.now(),
          }
        });

        wx.switchTab({
          url: '/pages/index/index',
        });
      } catch (e) {
        console.error('Save profile error:', e);
        wx.showToast({ title: '保存失败: ' + (e.errMsg || e.message), icon: 'error' });
      }
    }
  },
  async checkUser() {
    const app = getApp();
    const openid = app.globalData.openid;
    if (!openid) {
      this.waitForOpenid();
      return;
    }
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
            // 延后 toast 到真正资料确定前
            this.setData({ userInfo, showChoiceSheet: true });
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
});
