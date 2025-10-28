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
        console.error('Failed to join group:', err);
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
        // If QR code is scanned, extract access code
        const result = res.result;
        // Assumes QR code contains access code, e.g: ABC123
        this.setData({ accessCode: result.substring(0, 6).toUpperCase() });
      }
    });
  },

  handleCancel() {
    wx.navigateBack();
  }
});
