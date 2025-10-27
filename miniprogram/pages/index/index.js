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

  // 检查登录状态
  checkLoginStatus() {
    const app = getApp();
    if (app.globalData.isLoggedIn && app.globalData.openid) {
      this.setData({ isLoggedIn: true });
      this.loadUserInfo();
      this.loadGroups();
    }
  },

  // 处理登录
  handleLogin() {
    const self = this;
    wx.getUserProfile({
      desc: '获取您的头像和昵称用于显示身份',
      success: (res) => {
        const userInfo = res.userInfo;
        const app = getApp();

        // 保存用户信息
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
          console.error('登录失败:', err);
          wx.showToast({
            title: '登录失败',
            icon: 'error'
          });
        });
      },
      fail: err => {
        console.log('用户拒绝授权:', err);
      }
    });
  },

  // 加载用户信息
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
        console.error('加载用户信息失败:', err);
      });
  },

  // 加载Group列表
  loadGroups() {
    const app = getApp();

    wx.showLoading({ title: '加载中...' });

    api.getUserGroups(app.globalData.openid)
      .then(groups => {
        this.setData({ groups });
        wx.hideLoading();
      })
      .catch(err => {
        console.error('加载Group失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      });
  },

  // 处理创建Group
  handleCreateGroup() {
    wx.navigateTo({
      url: '/pages/group/create'
    });
  },

  // 处理加入Group
  handleJoinGroup() {
    wx.navigateTo({
      url: '/pages/group/join'
    });
  },

  // 选择Group进入详情
  handleSelectGroup(e) {
    const groupId = e.currentTarget.dataset.groupId;
    wx.navigateTo({
      url: `/pages/group/detail?groupId=${groupId}`
    });
  }
});
