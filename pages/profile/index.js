// pages/profile/index.js
Page({
  data: {
    loading: true,
    user: null,
  },

  async loadUser() {
    const app = getApp();
    // 先使用缓存数据，加快首屏
    const cached = wx.getStorageSync('cachedUserInfo');
    if (cached) {
      this.setData({ user: cached });
    }
    if (app.globalData.openid) {
      const db = wx.cloud.database();
      try {
        const res = await db.collection('users').where({ _openid: app.globalData.openid }).get();
        if (res.data) {
          const users = Array.isArray(res.data) ? res.data : [res.data];
          const u = users[0] || {};
          const profileStats = u.profile_stats || {};

          let avatarUrl = u.display_avatar || u.avatar || '';

          // 如果是 cloud:// fileID，转换为临时 URL
          if (avatarUrl && avatarUrl.startsWith('cloud://')) {
            try {
              const urlRes = await wx.cloud.getTempFileURL({
                fileList: [avatarUrl],
              });
              if (urlRes.fileList && urlRes.fileList[0] && urlRes.fileList[0].tempFileURL) {
                avatarUrl = urlRes.fileList[0].tempFileURL;
              }
            } catch (e) {
              console.error('Failed to convert avatar URL:', e);
            }
          }

          const display = {
            nickname:  u.nickname || '未命名用户',
            display_avatar: avatarUrl,
            completed_profile: !!u.completed_profile,
            handedness: u.handedness || '',
            racket_primary: u.racket_primary || '',
            tags: u.tags || [],
            bio: u.bio || '',
            location: u.location || '',
            stats: {
              matches: profileStats.matches || u.match_count || 0,
              followers: profileStats.followers || u.followers_count || 0,
              following: profileStats.following || u.following_count || 0,
            },
          };
          this.setData({ user: display, loading: false });
          wx.setStorageSync('cachedUserInfo', display);
        } else {
          this.setData({ loading: false });
        }
      } catch (err) {
        console.error('Failed to load user:', err);
        this.setData({ loading: false });
      }
    } else {
      this.setData({ loading: false });
    }
  },

  onShow() {
    this.loadUser();
  },

  goEditProfile() {
    wx.navigateTo({ url: '/pages/auth/profile-setup' });
  },
});