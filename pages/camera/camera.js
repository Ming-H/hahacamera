Page({
    data: {
        devicePosition: 'front',
        tempImagePath: '',
        currentFilter: 'normal',
        filterTypes: ['normal', 'fat', 'thin', 'tall', 'short'],
        currentBgColor: 'none',
        bgColors: [
            { name: 'none', value: 'transparent', label: '关闭' },
            { name: 'warm', value: 'rgba(255, 220, 180, 0.5)', label: '暖色' },
            { name: 'cold', value: 'rgba(180, 220, 255, 0.5)', label: '冷色' },
            { name: 'pink', value: 'rgba(255, 200, 220, 0.5)', label: '粉色' }
        ],
        showGuide: true,
        showToast: false,
        toastType: 'success',
        toastText: '',
        cameraContext: null,
        cameraListener: null,
        canvasWidth: 0,
        canvasHeight: 0
    },

    onLoad() {
        // 显示相机引导框，3秒后自动隐藏
        setTimeout(() => {
            this.setData({
                showGuide: false
            });
        }, 3000);

        // 初始化相机上下文
        this.setData({
            cameraContext: wx.createCameraContext()
        });

        // 检查相机权限
        this.checkCameraAuth();

        // 获取设备信息以设置画布大小
        wx.getSystemInfo({
            success: (res) => {
                this.setData({
                    canvasWidth: res.windowWidth,
                    canvasHeight: res.windowHeight
                });
            }
        });

        // 设置页面不休眠
        wx.setKeepScreenOn({
            keepScreenOn: true
        });
    },

    onUnload() {
        // 停止预览
        if (this.data.cameraListener) {
            this.data.cameraListener.stop();
        }

        // 清除定时器
        if (this.previewInterval) {
            clearInterval(this.previewInterval);
        }

        // 取消屏幕常亮
        wx.setKeepScreenOn({
            keepScreenOn: false
        });
    },

    // 相机帧数据处理
    onCameraFrame(frame) {
        // 我们不再使用相机帧处理来应用滤镜，因为这会导致性能问题
        // 保留此方法是为了保持与 camera 组件的 bindframe 属性的兼容性
    },

    // 绘制实时滤镜效果
    drawFilterEffect() {
        if (this.data.currentFilter === 'normal') return;

        try {
            const ctx = wx.createCanvasContext('previewCanvas', this);
            const { canvasWidth, canvasHeight } = this.data;

            // 确保画布尺寸正确设置
            if (!canvasWidth || !canvasHeight) {
                wx.getSystemInfo({
                    success: (res) => {
                        this.setData({
                            canvasWidth: res.windowWidth,
                            canvasHeight: res.windowHeight
                        });
                    }
                });
                return;
            }

            ctx.clearRect(0, 0, canvasWidth, canvasHeight);

            // 优化：不再使用摄像头拍照而是直接在画布上应用变形
            // 应用不同的变形效果
            switch (this.data.currentFilter) {
                case 'fat':
                    ctx.save();
                    ctx.scale(1.2, 1);
                    ctx.setGlobalAlpha(0.7);
                    ctx.setFillStyle('rgba(0,0,0,0.2)');
                    ctx.fillRect(-canvasWidth * 0.1, 0, canvasWidth, canvasHeight);
                    ctx.restore();
                    break;
                case 'thin':
                    ctx.save();
                    ctx.scale(0.8, 1);
                    ctx.setGlobalAlpha(0.7);
                    ctx.setFillStyle('rgba(0,0,0,0.2)');
                    ctx.fillRect(canvasWidth * 0.1, 0, canvasWidth, canvasHeight);
                    ctx.restore();
                    break;
                case 'tall':
                    ctx.save();
                    ctx.scale(1, 1.2);
                    ctx.setGlobalAlpha(0.7);
                    ctx.setFillStyle('rgba(0,0,0,0.2)');
                    ctx.fillRect(0, -canvasHeight * 0.1, canvasWidth, canvasHeight);
                    ctx.restore();
                    break;
                case 'short':
                    ctx.save();
                    ctx.scale(1, 0.8);
                    ctx.setGlobalAlpha(0.7);
                    ctx.setFillStyle('rgba(0,0,0,0.2)');
                    ctx.fillRect(0, canvasHeight * 0.1, canvasWidth, canvasHeight);
                    ctx.restore();
                    break;
            }
            ctx.draw();
        } catch (error) {
            console.error('绘制滤镜效果失败：', error);
        }
    },

    // 开始实时预览
    startPreview() {
        // 若已经有listener，先停止
        if (this.data.cameraListener) {
            this.data.cameraListener.stop();
        }

        // 清除现有的预览定时器
        if (this.previewInterval) {
            clearInterval(this.previewInterval);
        }

        // 仅在需要滤镜时开启实时预览
        if (this.data.currentFilter !== 'normal') {
            // 立即绘制一次滤镜效果
            this.drawFilterEffect();

            // 使用较低频率的定时器来保持效果刷新，降低性能消耗
            this.previewInterval = setInterval(() => {
                if (this.data.currentFilter !== 'normal' && !this.data.tempImagePath) {
                    this.drawFilterEffect();
                } else {
                    clearInterval(this.previewInterval);
                }
            }, 500);
        }
    },

    // 检查相机权限
    checkCameraAuth() {
        wx.getSetting({
            success: res => {
                if (!res.authSetting['scope.camera']) {
                    wx.authorize({
                        scope: 'scope.camera',
                        success: () => {
                            console.log('相机授权成功');
                            this.startPreview();
                        },
                        fail: () => {
                            // 用户拒绝授权，引导打开设置页
                            wx.showModal({
                                title: '需要相机权限',
                                content: '请授权相机权限以使用拍照功能',
                                confirmText: '去设置',
                                success: (res) => {
                                    if (res.confirm) {
                                        wx.openSetting();
                                    }
                                }
                            });
                        }
                    });
                } else {
                    this.startPreview();
                }
            }
        });
    },

    // 返回上一页
    goBack() {
        wx.navigateBack();
    },

    // 切换相机前后摄像头
    switchCamera() {
        this.setData({
            devicePosition: this.data.devicePosition === 'front' ? 'back' : 'front'
        });
        this.showToast('success', '已切换到' + (this.data.devicePosition === 'front' ? '前置' : '后置') + '相机');

        // 切换后重新开始预览
        setTimeout(() => {
            this.startPreview();
        }, 300);
    },

    // 选择特定滤镜
    selectFilter(e) {
        const filter = e.currentTarget.dataset.filter;
        this.setData({
            currentFilter: filter
        });

        if (this.data.tempImagePath) {
            this.applyFilter(this.data.tempImagePath);
        } else {
            // 清除现有的预览定时器
            if (this.previewInterval) {
                clearInterval(this.previewInterval);
            }

            // 重新启动预览以应用新滤镜
            this.startPreview();

            // 立即绘制一次效果
            if (filter !== 'normal') {
                setTimeout(() => {
                    this.drawFilterEffect();
                }, 100);
            }
        }

        this.showToast('success', `已选择${this.getFilterName(filter)}滤镜`);
    },

    // 获取滤镜的中文名称
    getFilterName(filter) {
        const filterNames = {
            'normal': '原图',
            'fat': '胖胖',
            'thin': '瘦瘦',
            'tall': '高高',
            'short': '矮矮'
        };
        return filterNames[filter] || filter;
    },

    // 拍照
    takePhoto() {
        wx.getSetting({
            success: res => {
                if (res.authSetting['scope.camera']) {
                    this.doTakePhoto();
                } else {
                    this.checkCameraAuth();
                }
            }
        });
    },

    doTakePhoto() {
        const ctx = wx.createCameraContext();
        ctx.takePhoto({
            quality: 'low',
            compressed: true,
            success: (res) => {
                this.vibrate();
                this.compressImage(res.tempImagePath);
            },
            fail: (error) => {
                console.error('拍照失败：', error);
                this.showToast('error', '拍照失败');
            }
        });
    },

    // 设备振动反馈
    vibrate() {
        wx.vibrateShort({
            type: 'medium'
        });
    },

    compressImage(imagePath) {
        wx.compressImage({
            src: imagePath,
            quality: 50,
            success: (res) => {
                // 检查压缩后的图片大小
                wx.getFileInfo({
                    filePath: res.tempFilePath,
                    success: (fileInfo) => {
                        if (fileInfo.size > 2 * 1024 * 1024) { // 如果仍然大于2MB
                            // 继续压缩
                            this.compressImage(res.tempFilePath)
                        } else {
                            this.applyFilter(res.tempFilePath)
                        }
                    },
                    fail: () => {
                        // 如果无法获取文件信息，直接应用滤镜
                        this.applyFilter(res.tempFilePath)
                    }
                })
            },
            fail: (error) => {
                console.error('压缩失败：', error)
                this.showToast('error', '图片处理失败');
            }
        })
    },

    applyFilter(imagePath) {
        const that = this
        wx.getImageInfo({
            src: imagePath,
            success: (imageInfo) => {
                // 限制最大尺寸为512像素
                let canvasWidth = imageInfo.width
                let canvasHeight = imageInfo.height
                const maxSize = 512

                if (canvasWidth > maxSize || canvasHeight > maxSize) {
                    if (canvasWidth > canvasHeight) {
                        canvasHeight = (canvasHeight * maxSize) / canvasWidth
                        canvasWidth = maxSize
                    } else {
                        canvasWidth = (canvasWidth * maxSize) / canvasHeight
                        canvasHeight = maxSize
                    }
                }

                const ctx = wx.createCanvasContext('filterCanvas', this)

                // 设置画布尺寸
                ctx.width = canvasWidth
                ctx.height = canvasHeight

                switch (that.data.currentFilter) {
                    case 'fat':
                        this.applyFatEffect(ctx, imagePath, canvasWidth, canvasHeight)
                        break
                    case 'thin':
                        this.applyThinEffect(ctx, imagePath, canvasWidth, canvasHeight)
                        break
                    case 'tall':
                        this.applyTallEffect(ctx, imagePath, canvasWidth, canvasHeight)
                        break
                    case 'short':
                        this.applyShortEffect(ctx, imagePath, canvasWidth, canvasHeight)
                        break
                    default:
                        ctx.drawImage(imagePath, 0, 0, canvasWidth, canvasHeight)
                }

                ctx.draw(false, () => {
                    wx.canvasToTempFilePath({
                        canvasId: 'filterCanvas',
                        quality: 0.6,
                        destWidth: canvasWidth,
                        destHeight: canvasHeight,
                        success: (res) => {
                            // 检查最终图片大小
                            wx.getFileInfo({
                                filePath: res.tempFilePath,
                                success: (fileInfo) => {
                                    if (fileInfo.size > 2 * 1024 * 1024) {
                                        this.showToast('error', '图片太大，请重试');
                                    } else {
                                        that.setData({
                                            tempImagePath: res.tempFilePath
                                        });
                                    }
                                },
                                fail: () => {
                                    that.setData({
                                        tempImagePath: res.tempFilePath
                                    });
                                }
                            })
                        },
                        fail: (error) => {
                            console.error('滤镜应用失败：', error)
                            this.showToast('error', '处理失败');
                        }
                    })
                })
            }
        })
    },

    applyFatEffect(ctx, imagePath, width, height) {
        ctx.save()
        ctx.scale(1.2, 1)
        ctx.drawImage(imagePath, -width * 0.1, 0, width, height)
        ctx.restore()
    },

    applyThinEffect(ctx, imagePath, width, height) {
        ctx.save()
        ctx.scale(0.8, 1)
        ctx.drawImage(imagePath, width * 0.1, 0, width, height)
        ctx.restore()
    },

    applyTallEffect(ctx, imagePath, width, height) {
        ctx.save()
        ctx.scale(1, 1.2)
        ctx.drawImage(imagePath, 0, -height * 0.1, width, height)
        ctx.restore()
    },

    applyShortEffect(ctx, imagePath, width, height) {
        ctx.save()
        ctx.scale(1, 0.8)
        ctx.drawImage(imagePath, 0, height * 0.1, width, height)
        ctx.restore()
    },

    // 切换滤镜（旧方法，已被selectFilter替代）
    switchFilter() {
        const currentIndex = this.data.filterTypes.indexOf(this.data.currentFilter)
        const nextIndex = (currentIndex + 1) % this.data.filterTypes.length
        this.setData({
            currentFilter: this.data.filterTypes[nextIndex]
        });

        if (this.data.tempImagePath) {
            this.applyFilter(this.data.tempImagePath)
        } else {
            this.startPreview();
        }
    },

    // 切换补光颜色
    switchBgColor() {
        const currentIndex = this.data.bgColors.findIndex(color => color.name === this.data.currentBgColor);
        const nextIndex = (currentIndex + 1) % this.data.bgColors.length;
        const newColor = this.data.bgColors[nextIndex];

        this.setData({
            currentBgColor: newColor.name
        });

        this.showToast('success', `补光: ${newColor.label}`);
    },

    // 获取当前补光颜色值
    getCurrentBgColorValue() {
        const color = this.data.bgColors.find(c => c.name === this.data.currentBgColor);
        if (!color) return 'transparent';

        // 增强补光效果
        if (color.name === 'none') return 'transparent';
        if (color.name === 'warm') return 'rgba(255, 220, 180, 0.6)';
        if (color.name === 'cold') return 'rgba(180, 220, 255, 0.6)';
        if (color.name === 'pink') return 'rgba(255, 180, 220, 0.6)';

        return color.value;
    },

    // 获取当前补光颜色标签
    getCurrentBgColorLabel() {
        const color = this.data.bgColors.find(c => c.name === this.data.currentBgColor);
        return color ? color.label : '关闭';
    },

    // 保存照片
    savePhoto() {
        wx.saveImageToPhotosAlbum({
            filePath: this.data.tempImagePath,
            success: () => {
                this.showToast('success', '保存成功');

                // 短暂延迟后关闭预览
                setTimeout(() => {
                    this.setData({
                        tempImagePath: ''
                    });
                    // 再次启动预览
                    this.startPreview();
                }, 1500);
            },
            fail: (error) => {
                // 如果是权限问题
                if (error.errMsg.indexOf('auth') >= 0) {
                    wx.showModal({
                        title: '需要授权',
                        content: '保存照片需要获取相册权限',
                        confirmText: '去设置',
                        success: (res) => {
                            if (res.confirm) {
                                wx.openSetting();
                            }
                        }
                    });
                } else {
                    this.showToast('error', '保存失败');
                }
            }
        });
    },

    // 重拍
    retake() {
        this.setData({
            tempImagePath: ''
        });

        // 重新开始预览
        this.startPreview();
    },

    // 显示消息提示
    showToast(type, text) {
        this.setData({
            showToast: true,
            toastType: type,
            toastText: text
        });

        setTimeout(() => {
            this.setData({
                showToast: false
            });
        }, 2000);
    },

    // 相机错误处理
    error(e) {
        console.error('相机错误：', e.detail);
        wx.showToast({
            title: '相机出错了',
            icon: 'none'
        });
    }
}); 