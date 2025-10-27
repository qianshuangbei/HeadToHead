/**pages/group/join.js*/
const api = require('../../utils/api.js');

Page({
  data: {
    accessCode: '',
    loading: false
  },

  onCodeInput(e) {
    this.setData({
      accessCode: e.detail.value.toUpperCase()
    });
  },

  handleJoin() {
    const code = this.data.accessCode.trim().toUpperCase();

    if (!code) {
      wx.showToast({
        title: '请输入分享码',
        icon: 'error'
      });
      return;
    }

    if (code.length !== 6) {
      wx.showToast({
        title: '分享码必须是6位',
        icon: 'error'
      });
      return;
    }

    this.setData({ loading: true });

    const app = getApp();

    api.joinGroupByCode(app.globalData.openid, code)
      .then(group => {
        wx.showToast({
          title: '加入成功！',
          icon: 'success'
        });

        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/group/detail?groupId=${group._id}`
          });
        }, 500);
      })
      .catch(err => {
        console.error('加入失败:', err);
        wx.showToast({
          title: err.message || '加入失败',
          icon: 'error'
        });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  handleScanCode() {
    wx.scanCode({
      onlyFromCamera: true,
      success: (res) => {
        // 如果扫到二维码，提取分享码
        const result = res.result;
        // 假设二维码中包含分享码，例如: ABC123
        this.setData({ accessCode: result.substring(0, 6).toUpperCase() });
      }
    });
  },

  handleCancel() {
    wx.navigateBack();
  }
});
