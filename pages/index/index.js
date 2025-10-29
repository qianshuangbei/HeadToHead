/**index.js*/
const api = require('../../utils/api.js');
Page({
  data: {
    userInfo: {},
    groups: [],
  },
  onLoad() {
    this.ensureLogin();
  },
  onShow() {
    this.ensureLogin();
  },
  ensureLogin() {
    const app = getApp();
    if (!app.globalData.openid) {
      // 未获取到 openid，跳转登录页
      wx.navigateTo({ url: '/pages/auth/login' });
      return;
    }
    // 已有 openid，则加载数据
    this.loadUserInfo();
    this.loadGroups();
  },
  loadUserInfo() {
    const app = getApp();
    const db = api.initCloudBase();
    db.collection('users').where({ _openid: app.globalData.openid}).get()
      .then(res => {
        if (res.data && res.data.length > 0) {
          // 这里可能返回数组，需要取第一条
          this.setData({ userInfo: res.data[0] });
        }
      })
      .catch(err => {
        console.error('Failed to load user info:', err);
      });
  },
  loadGroups() {
    const app = getApp();
    wx.showLoading({ title: 'Loading...' });
    api.getUserGroups(app.globalData.openid)
      .then(groups => {
        this.setData({ groups });
        wx.hideLoading();
      })
      .catch(err => {
        console.error('Failed to load groups:', err);
        wx.hideLoading();
        wx.showToast({ title: '加载失败', icon: 'error' });
      });
  },
  handleCreateGroup() {
    wx.navigateTo({ url: '/pages/group/create' });
  },
  handleJoinGroup() {
    wx.navigateTo({ url: '/pages/group/join' });
  },
  handleSelectGroup(e) {
    const groupId = e.currentTarget.dataset.groupId;
    wx.navigateTo({ url: `/pages/group/detail?groupId=${groupId}` });
  }
});
