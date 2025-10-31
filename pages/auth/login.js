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
  onLoad(options) {
    // 直接使用从 app.js 传递过来的参数
    if (options.showLoginPrompt === 'true') {
      this.setData({ showLoginPrompt: true, checking: false });
    }
  },
  
  onShow() {
  },

  onUnload() {
    if (this._openidTimer) clearInterval(this._openidTimer);
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
