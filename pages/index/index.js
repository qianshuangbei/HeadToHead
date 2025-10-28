/**index.js*/
const api = require('../../utils/api.js');

Page({
  data: {
    isLoggedIn: false,
    userInfo: {},
    groups: [],
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    if (this.data.isLoggedIn) {
      this.loadGroups();
    }
  },

  // Check login status
  checkLoginStatus() {
    const app = getApp();
    if (app.globalData.isLoggedIn && app.globalData.openid) {
      this.setData({ isLoggedIn: true });
      this.loadUserInfo();
      this.loadGroups();
    }
  },

  // Handle login
  handleLogin() {
    const self = this;
    wx.getUserProfile({
      desc: 'Get your avatar and nickname to display your identity',
      success: (res) => {
        const userInfo = res.userInfo;
        const app = getApp();

        // Save user info
        api.getUserOrCreate(app.globalData.openid, userInfo).then(() => {
          self.setData({
            isLoggedIn: true,
            userInfo: userInfo
          });
          self.loadGroups();

          wx.showToast({
            title: '登录成功',
            icon: 'success'
          });
        }).catch(err => {
          console.error('Login failed:', err);
          wx.showToast({
            title: '登录失败',
            icon: 'error'
          });
        });
      },
      fail: err => {
        console.log('User denied authorization:', err);
      }
    });
  },

  // Load user info
  loadUserInfo() {
    const app = getApp();
    const db = api.initCloudBase();

    db.collection('users').doc(app.globalData.openid).get()
      .then(res => {
        if (res.data) {
          this.setData({ userInfo: res.data });
        }
      })
      .catch(err => {
        console.error('Failed to load user info:', err);
      });
  },

  // Load groups list
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
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      });
  },

  // Handle group creation
  handleCreateGroup() {
    wx.navigateTo({
      url: '/pages/group/create'
    });
  },

  // Handle group join
  handleJoinGroup() {
    wx.navigateTo({
      url: '/pages/group/join'
    });
  },

  // Select group to enter details
  handleSelectGroup(e) {
    const groupId = e.currentTarget.dataset.groupId;
    wx.navigateTo({
      url: `/pages/group/detail?groupId=${groupId}`
    });
  }
});
