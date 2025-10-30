// pages/auth/profile-setup.js
Page({
  data: {
    step: 'editing',
    mode: '', // wechat | custom
    nickname: '',
    avatarTempPath: '',
    bio: '',
    bioLength: 0,
    handedness: '', // left | right
    racket_primary: '',
    tagInput: '',
    tags: [], // max 20
    uploading: false,
    saving: false,
    error: '',
  },

  onLoad(options) {
    const app = getApp();
    const info = app.globalData.userInfo[0];
    if (info) {
      this.setData({
        mode: info.completed_profile ? 'custom' : this.data.mode,
        nickname: this.data.nickname || info.display_nickname || info.nickname || '',
        avatarTempPath: this.data.avatarTempPath || info.display_avatar || info.avatar || '',
        bio: info.bio || '',
        bioLength: (info.bio || '').length,
        handedness: info.handedness || this.data.handedness,
        racket_primary: info.racket_primary || this.data.racket_primary,
        tags: info.tags || this.data.tags,
      });
    }
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  onBioInput(e) {
    const value = e.detail.value || '';
    this.setData({ bio: value, bioLength: value.length });
  },

  onHandednessChange(e) {
    this.setData({ handedness: e.detail.value });
  },

  onRacketInput(e) {
    this.setData({ racket_primary: e.detail.value });
  },

  onTagInput(e) {
    this.setData({ tagInput: e.detail.value });
  },

  onTagConfirm(e) {
    const raw = (e.detail.value || '').trim();
    if (!raw) return;
    // Chinese char length check (<=12)
    const lengthOk = raw.length <= 12; // Rough count; for strict multi-byte you could refine later
    if (!lengthOk) {
      this.setData({ error: '标签长度不能超过12个字符' });
      return;
    }
    const tags = this.data.tags.slice();
    if (tags.length >= 20) {
      this.setData({ error: '最多添加20个标签' });
      return;
    }
    if (tags.includes(raw)) {
      this.setData({ error: '标签已存在' });
      return;
    }
    tags.push(raw);
    this.setData({ tags, tagInput: '', error: '' });
  },

  removeTag(e) {
    const idx = e.currentTarget.dataset.index;
    const tags = this.data.tags.slice();
    tags.splice(idx, 1);
    this.setData({ tags });
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
    if (!this.data.avatarTempPath) {
      return ''; // 未选择头像
    }

    console.log('=== uploadAvatarIfNeeded ===');
    console.log('avatarTempPath:', this.data.avatarTempPath);

    // 只有云存储 fileID (cloud://) 才直接返回，其他都需要上传
    if (this.data.avatarTempPath.startsWith('cloud://')) {
      console.log('Already cloud file, returning as-is');
      return this.data.avatarTempPath;
    }

    // 检查是否是无效的路径（如 http://tmp/）
    if (this.data.avatarTempPath.startsWith('http://tmp/') ||
        !this.data.avatarTempPath.includes('.')) {
      console.warn('Invalid avatar path detected, skipping upload');
      this.setData({ error: '头像路径无效，请重新选择图片' });
      return '';
    }

    // 所有其他路径（wxfile://, 本地路径等）都需要上传
    console.log('Uploading file to cloud storage...');
    this.setData({ uploading: true });
    try {
      const openid = getApp().globalData.openid;
      const ext = this.data.avatarTempPath.split('.').pop();
      const cloudPath = `avatars/${openid}_${Date.now()}.${ext}`;
      const res = await wx.cloud.uploadFile({
        cloudPath,
        filePath: this.data.avatarTempPath,
      });
      console.log('Upload success, fileID:', res.fileID);
      return res.fileID;
    } catch (e) {
      console.error('Upload failed:', e);
      this.setData({ error: '头像上传失败: ' + (e.errMsg || e.message || '未知错误') });
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
      await db.collection('users').where({ _openid: openid}).update({
        data:{
          display_nickname: this.data.nickname,
          display_avatar: displayAvatar,
          bio: this.data.bio,
          completed_profile: true,
          handedness: this.data.handedness,
          racket_primary: this.data.racket_primary,
          tags: this.data.tags,
          updated_at: Date.now(),
        }
      });
      app.globalData.userInfo = {
        ...app.globalData.userInfo,
        display_nickname: this.data.nickname,
        display_avatar: displayAvatar,
        bio: this.data.bio,
        completed_profile: true,
        handedness: this.data.handedness,
        racket_primary: this.data.racket_primary,
        tags: this.data.tags,
      };
      wx.setStorageSync('hasProfile', true);
      wx.setStorageSync('cachedUserInfo', {
        display_nickname: this.data.nickname,
        display_avatar: displayAvatar,
        bio: this.data.bio,
        handedness: this.data.handedness,
        racket_primary: this.data.racket_primary,
        tags: this.data.tags,
      });
      wx.switchTab({ url: '/pages/group/list' });
    } catch (e) {
      console.error('save profile error', e);
      this.setData({ error: '保存失败，请重试' });
    } finally {
      this.setData({ saving: false });
    }
  },
});