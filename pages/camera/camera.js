Page({
    data: {
        devicePosition: 'front',
        tempImagePath: '',
        currentFilter: 'normal',
        currentBgColor: 'none',
        bgColors: [
            { name: 'none', value: 'transparent', label: '关闭' },
            { name: 'warm', value: 'rgba(255, 220, 180, 0.5)', label: '暖色' },
            { name: 'cold', value: 'rgba(180, 220, 255, 0.5)', label: '冷色' },
            { name: 'pink', value: 'rgba(255, 200, 220, 0.5)', label: '粉色' }
        ],
        currentBgColorValue: 'transparent',
        currentBgColorLabel: '关闭',
        showGuide: true,
        showToast: false,
        toastType: 'success',
        toastText: '',
        cameraContext: null,
        cameraListener: null,
        canvasWidth: 0,
        canvasHeight: 0,
        showLightSelector: false
    },

    onLoad() {
        console.log('相机页面加载');
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

        // 初始化补光颜色值和标签
        const initialColor = this.data.currentBgColor;
        const colorObj = this.data.bgColors.find(c => c.name === initialColor);
        this.setData({
            currentBgColorValue: this._getBgColorValue(initialColor),
            currentBgColorLabel: colorObj ? colorObj.label : '关闭',
            showLightSelector: false  // 确保不显示选择器
        });

        // 获取设备信息以设置画布大小
        wx.getSystemInfo({
            success: (res) => {
                console.log('获取设备信息成功，设置画布大小:', res.windowWidth, 'x', res.windowHeight);
                this.setData({
                    canvasWidth: res.windowWidth,
                    canvasHeight: res.windowHeight
                }, () => {
                    // 确保设置完画布大小后再检查权限并启动预览
                    this.checkCameraAuth();
                });
            }
        });

        // 设置页面不休眠
        wx.setKeepScreenOn({
            keepScreenOn: true
        });
    },

    onShow() {
        console.log('相机页面显示，当前滤镜:', this.data.currentFilter);
        // 确保页面显示时应用补光效果
        console.log('相机页面显示，当前补光设置：', this.data.currentBgColor);

        // 如果显示该页面时没有预览，启动预览
        if (this.data.currentFilter !== 'normal' && !this.previewInterval) {
            console.log('页面显示时启动预览');
            this.startPreview();
        }

        // 延迟一点时间执行，确保UI已完全加载
        setTimeout(() => {
            // 强制刷新补光效果
            const currentColor = this.data.currentBgColor;
            console.log('刷新补光效果，临时设置为none');
            this.setData({
                currentBgColor: 'none',
                currentBgColorValue: 'transparent',
                currentBgColorLabel: '关闭'
            });
            setTimeout(() => {
                console.log('恢复补光效果为：', currentColor);
                const colorObj = this.data.bgColors.find(c => c.name === currentColor);
                this.setData({
                    currentBgColor: currentColor,
                    currentBgColorValue: this._getBgColorValue(currentColor),
                    currentBgColorLabel: colorObj ? colorObj.label : '关闭'
                });
            }, 100);

            // 如果有滤镜效果但没有预览显示，重新绘制一次
            if (this.data.currentFilter !== 'normal' && !this.data.tempImagePath) {
                console.log('页面显示时重新绘制滤镜');
                this.drawFilterEffect();
            }
        }, 300);
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

    // 统一应用补光效果的方法 - 在预览和照片处理中共用
    applyLightingEffect(ctx, width, height, colorName) {
        if (colorName === 'none') return;

        // 获取补光颜色
        const bgColor = this._getBgColorValue(colorName);

        // 应用双层补光效果
        ctx.save();

        // 输出更详细的日志
        console.log('应用补光 - 颜色名称:', colorName, '颜色值:', bgColor, '应用区域:', width, 'x', height);

        // 第一层：Screen混合模式，使颜色更加明显
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        // 第二层：Lighten混合模式，增加柔和的辉光效果
        ctx.globalCompositeOperation = 'lighten';
        const secondColor = bgColor.replace(/[\d.]+\)$/, '0.15)');
        console.log('应用第二层补光 - 颜色值:', secondColor);
        ctx.fillStyle = secondColor;
        ctx.fillRect(0, 0, width, height);

        ctx.restore();

        console.log('已应用补光效果:', bgColor);
    },

    // 绘制实时预览效果 - 只保留补光功能
    drawFilterEffect() {
        try {
            console.log('绘制补光效果');
            const ctx = wx.createCanvasContext('previewCanvas', this);
            const { canvasWidth, canvasHeight } = this.data;

            // 确保画布尺寸正确设置
            if (!canvasWidth || !canvasHeight) {
                wx.getSystemInfo({
                    success: (res) => {
                        this.setData({
                            canvasWidth: res.windowWidth,
                            canvasHeight: res.windowHeight
                        }, () => {
                            // 设置完尺寸后立即重新尝试绘制
                            setTimeout(() => this.drawFilterEffect(), 50);
                        });
                    }
                });
                return;
            }

            // 清除整个画布
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);

            // 添加补光效果
            if (this.data.currentBgColor !== 'none') {
                // 使用统一的补光效果应用函数
                this.applyLightingEffect(ctx, canvasWidth, canvasHeight, this.data.currentBgColor);
            }

            // 绘制画布
            ctx.draw(false, () => {
                console.log('Canvas 绘制完成');
            });
        } catch (error) {
            console.error('绘制补光效果时出错：', error);
        }
    },

    // 开始实时预览
    startPreview() {
        console.log('开始预览');
        // 若已经有listener，先停止
        if (this.data.cameraListener) {
            this.data.cameraListener.stop();
        }

        // 清除现有的预览定时器
        if (this.previewInterval) {
            console.log('清除旧的预览定时器');
            clearInterval(this.previewInterval);
        }

        // 立即绘制一次预览效果
        this.drawFilterEffect();

        console.log('启动预览定时器');
        // 使用较高频率的定时器来保持效果刷新，提高实时性
        this.previewInterval = setInterval(() => {
            if (!this.data.tempImagePath) {
                this.drawFilterEffect();
            }
        }, 100); // 保持100ms的刷新率
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
                            // 授权成功立即启动预览
                            setTimeout(() => {
                                this.startPreview();
                            }, 300); // 稍微延迟以确保相机组件已经准备好
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
                    console.log('相机已有授权，启动预览');
                    // 已有授权，立即启动预览
                    setTimeout(() => {
                        this.startPreview();
                    }, 300); // 稍微延迟以确保相机组件已经准备好
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

    // 拍照
    takePhoto() {
        // 记录拍照时的补光状态
        console.log('拍照 - 当前补光状态:', this.data.currentBgColor,
            '补光颜色值:', this._getBgColorValue(this.data.currentBgColor));

        // 检查相机权限并拍照
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

    // 应用补光效果到图片
    applyFilter(imagePath) {
        console.log('应用补光效果到照片 - 当前补光状态:', this.data.currentBgColor,
            '补光颜色值:', this._getBgColorValue(this.data.currentBgColor));

        const that = this;
        wx.getImageInfo({
            src: imagePath,
            success: (imageInfo) => {
                // 限制最大尺寸为512像素
                let canvasWidth = imageInfo.width;
                let canvasHeight = imageInfo.height;
                const maxSize = 512;

                if (canvasWidth > maxSize || canvasHeight > maxSize) {
                    if (canvasWidth > canvasHeight) {
                        canvasHeight = (canvasHeight * maxSize) / canvasWidth;
                        canvasWidth = maxSize;
                    } else {
                        canvasWidth = (canvasWidth * maxSize) / canvasHeight;
                        canvasHeight = maxSize;
                    }
                }

                const ctx = wx.createCanvasContext('filterCanvas', this);

                // 设置画布尺寸
                ctx.width = canvasWidth;
                ctx.height = canvasHeight;

                // 先绘制原图
                ctx.drawImage(imagePath, 0, 0, canvasWidth, canvasHeight);

                // 应用补光效果
                if (that.data.currentBgColor !== 'none') {
                    // 使用统一的补光效果应用函数
                    that.applyLightingEffect(ctx, canvasWidth, canvasHeight, that.data.currentBgColor);
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
                            });
                        },
                        fail: (error) => {
                            console.error('补光应用失败：', error);
                            this.showToast('error', '处理失败');
                        }
                    });
                });
            }
        });
    },

    // 切换补光颜色
    switchBgColor() {
        const currentIndex = this.data.bgColors.findIndex(color => color.name === this.data.currentBgColor);
        const nextIndex = (currentIndex + 1) % this.data.bgColors.length;
        const newColor = this.data.bgColors[nextIndex];

        this.setData({
            currentBgColor: newColor.name,
            currentBgColorValue: this._getBgColorValue(newColor.name),
            currentBgColorLabel: newColor.label
        });

        // 触发振动反馈
        wx.vibrateShort({ type: 'light' });

        this.showToast('success', `补光: ${newColor.label}`);
    },

    // 获取当前补光颜色值（内部方法）
    _getBgColorValue(colorName) {
        const color = this.data.bgColors.find(c => c.name === colorName);
        if (!color) return 'transparent';

        // 增强补光效果 - 使用不透明度更高和更饱和的颜色
        if (colorName === 'none') return 'transparent';

        // 使用与照片相同的补光颜色
        if (colorName === 'warm') return 'rgba(255, 160, 50, 0.45)';
        if (colorName === 'cold') return 'rgba(100, 180, 255, 0.45)';
        if (colorName === 'pink') return 'rgba(255, 120, 180, 0.45)';

        return color.value;
    },

    // 获取照片专用的补光颜色值（更高饱和度和不透明度）
    _getPhotoLightColor: function (colorName) {
        // 直接使用_getBgColorValue确保一致性
        return this._getBgColorValue(colorName);
    },

    // 选择补光颜色
    selectBgColor(e) {
        const color = e.currentTarget.dataset.color;

        // 记录上一个颜色
        const prevColor = this.data.currentBgColor;
        console.log(`切换补光效果：${prevColor} -> ${color}`);

        const colorObj = this.data.bgColors.find(c => c.name === color);

        this.setData({
            currentBgColor: color,
            currentBgColorValue: this._getBgColorValue(color),
            currentBgColorLabel: colorObj ? colorObj.label : '关闭',
            showLightSelector: false
        });

        // 如果是从"无"切换到有颜色，或者反之，需要特殊处理
        if ((prevColor === 'none' && color !== 'none') || (prevColor !== 'none' && color === 'none')) {
            // 延迟一点点时间让UI更新
            setTimeout(() => {
                wx.vibrateShort({ type: 'light' });
            }, 100);
        }

        if (colorObj) {
            this.showToast('success', `补光: ${colorObj.label}`);
        }
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
    },

    // 顶部按钮 - 切换补光颜色
    toggleLightSelector() {
        // 直接调用切换补光颜色的方法，而不是显示选择器
        this.switchBgColor();
    },

    // 点击屏幕其他区域隐藏选择器
    onTapScreen() {
        if (this.data.showLightSelector) {
            this.setData({
                showLightSelector: false
            });
        }
    },

    // 阻止事件冒泡
    stopPropagation() {
        // 空函数，仅用于阻止事件冒泡
    },

    // 打开相册
    openGallery() {
        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album'],
            success: (res) => {
                if (res.tempFiles && res.tempFiles.length > 0) {
                    const imagePath = res.tempFiles[0].tempFilePath;
                    // 应用当前选择的滤镜效果
                    this.applyFilter(imagePath);
                }
            },
            fail: (err) => {
                if (err.errMsg.indexOf('auth') >= 0) {
                    wx.showModal({
                        title: '需要授权',
                        content: '访问相册需要获取相册权限',
                        confirmText: '去设置',
                        success: (res) => {
                            if (res.confirm) {
                                wx.openSetting();
                            }
                        }
                    });
                } else {
                    this.showToast('error', '打开相册失败');
                }
            }
        });
    },
}); 