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
    // 缓存 openid 和 app 引用，避免多次调用 getApp()
    this.app = app;
    this.openid = app.globalData.openid;

    // Stale-While-Revalidate 策略：先使用缓存快速显示，然后从数据库获取最新数据
    this.loadUserInfo();
  },

  async loadUserInfo() {
    // 1. 先尝试使用缓存数据（快速首屏）
    const cached = wx.getStorageSync('cachedUserInfo');
    if (cached) {
      this.setData({
        mode: cached.completed_profile ? 'custom' : this.data.mode,
        nickname: cached.display_nickname || cached.nickname || '',
        avatarTempPath: cached.display_avatar || cached.avatar || '',
        bio: cached.bio || '',
        bioLength: (cached.bio || '').length,
        handedness: cached.handedness || '',
        racket_primary: cached.racket_primary || '',
        tags: cached.tags || [],
      });
    }

    // 2. 从数据库获取最新数据
    if (this.openid) {
      try {
        const db = wx.cloud.database();
        const res = await db.collection('users').where({ _openid: this.openid }).get();
        if (res.data && res.data.length > 0) {
          const info = res.data[0];
          this.setData({
            mode: info.completed_profile ? 'custom' : this.data.mode,
            nickname: info.display_nickname || info.nickname || '',
            avatarTempPath: info.display_avatar || info.avatar || '',
            bio: info.bio || '',
            bioLength: (info.bio || '').length,
            handedness: info.handedness || '',
            racket_primary: info.racket_primary || '',
            tags: info.tags || [],
          });
          // 更新缓存
          wx.setStorageSync('cachedUserInfo', info);
        }
      } catch (e) {
        console.error('Load user info error:', e);
      }
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
      sizeType: ['original'], // 先选择原图，稍后自己压缩
      sourceType: ['album', 'camera'],
      success: (res) => {
        const path = res.tempFilePaths[0];
        // 压缩图片后再保存
        this.compressAvatar(path);
      }
    });
  },

  async compressAvatar(filePath) {
    try {
      // 获取图片信息
      const info = await wx.getImageInfo({ src: filePath });
      console.log('Original image size:', info.width, 'x', info.height);

      // 计算压缩后的尺寸（最大 800x800，保持宽高比）
      const maxSize = 800;
      let targetWidth = info.width;
      let targetHeight = info.height;

      if (info.width > maxSize || info.height > maxSize) {
        if (info.width > info.height) {
          targetWidth = maxSize;
          targetHeight = Math.round((info.height / info.width) * maxSize);
        } else {
          targetHeight = maxSize;
          targetWidth = Math.round((info.width / info.height) * maxSize);
        }
      }

      console.log('Target image size:', targetWidth, 'x', targetHeight);

      // 使用 canvas 压缩图片
      const canvas = wx.createOffscreenCanvas({
        type: '2d',
        width: targetWidth,
        height: targetHeight
      });

      const ctx = canvas.getContext('2d');

      // 创建 Image 对象
      const img = canvas.createImage();

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = filePath;
      });

      // 绘制并压缩
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // 导出为临时文件（quality 0.8 = 80% 质量）
      const compressedPath = canvas.toTempFilePathSync({
        fileType: 'jpg',
        quality: 0.8,
        destWidth: targetWidth,
        destHeight: targetHeight
      });

      console.log('Compressed image saved to:', compressedPath);
      this.setData({ avatarTempPath: compressedPath });
    } catch (e) {
      console.error('Image compression failed:', e);
      // 压缩失败，使用原图
      wx.showToast({ title: '图片压缩失败，使用原图', icon: 'none' });
      this.setData({ avatarTempPath: filePath });
    }
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
      const ext = this.data.avatarTempPath.split('.').pop();
      const cloudPath = `avatars/${this.openid}_${Date.now()}.${ext}`;
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
    const db = wx.cloud.database();
    try {
      const displayAvatar = await this.uploadAvatarIfNeeded();
      await db.collection('users').where({ _openid: this.openid}).update({
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
      this.app.globalData.userInfo = {
        ...this.app.globalData.userInfo,
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