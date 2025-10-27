App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'your-env-id', // 需要替换为你的环境ID
        traceUser: true,
      });
    }

    // 检查登录状态
    this.checkLogin();
  },

  checkLogin: function() {
    const self = this;
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('[云函数] 登录成功，用户openid: ', res.result.openid);
        self.globalData.openid = res.result.openid;
        self.globalData.isLoggedIn = true;
      },
      fail: err => {
        console.error('[云函数] 登录失败', err);
        self.globalData.isLoggedIn = false;
      }
    });
  },

  globalData: {
    openid: '',
    userInfo: null,
    isLoggedIn: false,
    currentGroup: null,
  }
});
