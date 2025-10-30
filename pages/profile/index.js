// pages/profile/index.js
Page({
  data: {
    loading: true,
    user: null,
  },

  loadUser() {
    const app = getApp();
    // 先使用缓存数据，加快首屏
    const cached = wx.getStorageSync('cachedUserInfo');
    if (cached) {
      this.setData({ user: cached });
    }
    if (app.globalData.openid) {
      const db = wx.cloud.database();
      db.collection('users').where({ _openid: app.globalData.openid }).get().then(res => {
        if (res.data) {
          const users = Array.isArray(res.data) ? res.data : [res.data];
          const u = users[0] || {};
          const profileStats = u.profile_stats || {};
          const display = {
            nickname:  u.nickname || '未命名用户',
            display_avatar: u.display_avatar || u.avatar || '',
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
      }).catch(() => {
        this.setData({ loading: false });
      });
    } else {
      this.setData({ loading: false });
    }
  },

  onShow() {
    this.loadUser();
  },

  goEditProfile() {
    // 进入同一个资料设置页复用逻辑
    wx.navigateTo({ url: '/pages/auth/profile-setup?edit=1' });
  },
});