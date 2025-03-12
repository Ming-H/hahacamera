// app.js
App({
  onLaunch() {
    // 登录逻辑
    wx.login({
      success: res => {
        if (res.code) {
          console.log('登录成功，code:', res.code);
          // 可以将 code 发送到后端换取 openId 和 session_key
          // 这里暂时只存储登录状态
          wx.setStorage({
            key: 'isLoggedIn',
            data: true,
            success: () => {
              console.log('登录状态已保存');
            },
            fail: (error) => {
              console.error('保存登录状态失败：', error);
            }
          });
        } else {
          console.error('登录失败：', res.errMsg);
        }
      },
      fail: (error) => {
        console.error('wx.login 调用失败：', error);
      }
    });
  },
  globalData: {
    userInfo: null
  }
})
