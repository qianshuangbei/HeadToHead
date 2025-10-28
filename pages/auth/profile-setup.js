// pages/auth/profile-setup.js
Page({
  data: {
    step: 'choose', // choose | editing
    mode: '', // wechat | custom
    nickname: '',
    avatarTempPath: '',
    uploading: false,
    saving: false,
    error: '',
  },

  chooseWeChatProfile() {
    this.setData({ mode: 'wechat', error: '' });
    wx.getUserProfile({
      desc: '获取头像和昵称',
      success: (res) => {
        const userInfo = res.userInfo;
        this.setData({ nickname: userInfo.nickName, avatarTempPath: userInfo.avatarUrl, step: 'editing' });
      },
      fail: () => {
        this.setData({ error: '微信授权失败，可手动填写' });
      }
    });
  },

  chooseCustomProfile() {
    this.setData({ mode: 'custom', step: 'editing', error: '' });
  },

  onLoad(options) {
    // 如果是编辑模式，预填当前资料
    if (options && options.edit === '1') {
      const app = getApp();
      const info = app.globalData.userInfo;
      if (info) {
        this.setData({
          step: 'editing',
          mode: info.completed_profile ? 'custom' : '',
          nickname: info.display_nickname || info.nickname || '',
          avatarTempPath: info.display_avatar || info.avatar || '',
        });
      }
    }
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  selectAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const path = res.tempFilePaths[0];
        this.setData({ avatarTempPath: path });
      }
    });
  },

  validateNickname(name) {
    if (!name) return '昵称不能为空';
    if (name.length < 2) return '昵称至少2个字符';
    if (name.length > 16) return '昵称最多16个字符';
    return '';
  },

  async uploadAvatarIfNeeded() {
    if (!this.data.avatarTempPath || this.data.avatarTempPath.startsWith('https://')) {
      return this.data.avatarTempPath; // 微信头像或未选择
    }
    this.setData({ uploading: true });
    try {
      const openid = getApp().globalData.openid;
      const ext = this.data.avatarTempPath.split('.').pop();
      const cloudPath = `avatars/${openid}_${Date.now()}.${ext}`;
      const res = await wx.cloud.uploadFile({
        cloudPath,
        filePath: this.data.avatarTempPath,
      });
      return res.fileID;
    } catch (e) {
      this.setData({ error: '头像上传失败' });
      return '';
    } finally {
      this.setData({ uploading: false });
    }
  },

  async saveProfile() {
    const nickErr = this.validateNickname(this.data.nickname);
    if (nickErr) {
      this.setData({ error: nickErr });
      return;
    }
    this.setData({ saving: true, error: '' });
    const app = getApp();
    const openid = app.globalData.openid;
    const db = wx.cloud.database();
    try {
      const displayAvatar = await this.uploadAvatarIfNeeded();
      await db.collection('users').doc(openid).update({
        display_nickname: this.data.nickname,
        display_avatar: displayAvatar,
        completed_profile: true,
        updated_at: Date.now(),
      });
      app.globalData.userInfo = {
        ...app.globalData.userInfo,
        display_nickname: this.data.nickname,
        display_avatar: displayAvatar,
        completed_profile: true,
      };
      wx.setStorageSync('hasProfile', true);
      wx.setStorageSync('cachedUserInfo', {
        display_nickname: this.data.nickname,
        display_avatar: displayAvatar,
      });
      wx.switchTab({ url: '/pages/group/list' });
    } catch (e) {
      this.setData({ error: '保存失败，请重试' });
    } finally {
      this.setData({ saving: false });
    }
  },
});