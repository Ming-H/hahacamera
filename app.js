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

    // 处理日志文件访问错误
    try {
      const fs = wx.getFileSystemManager();
      const logDir = wx.env.USER_DATA_PATH + '/logs';
      try {
        fs.accessSync(logDir);
      } catch (e) {
        // 目录不存在，创建目录
        try {
          fs.mkdirSync(logDir, true);
        } catch (err) {
          console.error('创建日志目录失败', err);
        }
      }
    } catch (err) {
      console.error('文件系统操作失败', err);
    }
  },

  // 处理backgroundFetch回调
  onBackgroundFetchData(res) {
    // 简单记录而不处理，避免错误
    console.log('收到后台数据', res);
    return {
      errMsg: 'success',
      fetchedData: {}
    };
  },

  globalData: {
    userInfo: null
  }
})
