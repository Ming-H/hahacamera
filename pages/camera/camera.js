Page({
    data: {
        devicePosition: 'front',
        tempImagePath: '',
        currentFilter: 'normal',
        filterTypes: ['normal', 'fat', 'thin', 'tall', 'short']
    },

    onLoad() {
        // 检查相机权限
        wx.authorize({
            scope: 'scope.camera',
            success() {
                console.log('相机授权成功')
            },
            fail() {
                wx.showToast({
                    title: '请授权相机权限',
                    icon: 'none'
                })
            }
        })
    },

    switchCamera() {
        this.setData({
            devicePosition: this.data.devicePosition === 'front' ? 'back' : 'front'
        })
    },

    takePhoto() {
        const ctx = wx.createCameraContext()
        ctx.takePhoto({
            quality: 'low',        // 降低拍照质量
            compressed: true,      // 开启压缩
            success: (res) => {
                this.compressImage(res.tempImagePath)
            },
            fail: (error) => {
                console.error('拍照失败：', error)
                wx.showToast({
                    title: '拍照失败',
                    icon: 'none'
                })
            }
        })
    },

    compressImage(imagePath) {
        wx.compressImage({
            src: imagePath,
            quality: 50,         // 降低压缩质量到50
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
                wx.showToast({
                    title: '图片处理失败',
                    icon: 'none'
                })
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
                        quality: 0.6,    // 降低输出质量
                        destWidth: canvasWidth,    // 指定输出图片的宽度
                        destHeight: canvasHeight,  // 指定输出图片的高度
                        success: (res) => {
                            // 检查最终图片大小
                            wx.getFileInfo({
                                filePath: res.tempFilePath,
                                success: (fileInfo) => {
                                    if (fileInfo.size > 2 * 1024 * 1024) {
                                        wx.showToast({
                                            title: '图片太大，请重试',
                                            icon: 'none'
                                        })
                                    } else {
                                        that.setData({
                                            tempImagePath: res.tempFilePath
                                        })
                                    }
                                },
                                fail: () => {
                                    that.setData({
                                        tempImagePath: res.tempFilePath
                                    })
                                }
                            })
                        },
                        fail: (error) => {
                            console.error('滤镜应用失败：', error)
                            wx.showToast({
                                title: '处理失败',
                                icon: 'none'
                            })
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

    switchFilter() {
        const currentIndex = this.data.filterTypes.indexOf(this.data.currentFilter)
        const nextIndex = (currentIndex + 1) % this.data.filterTypes.length
        this.setData({
            currentFilter: this.data.filterTypes[nextIndex]
        })
        if (this.data.tempImagePath) {
            this.applyFilter(this.data.tempImagePath)
        }
    },

    savePhoto() {
        wx.saveImageToPhotosAlbum({
            filePath: this.data.tempImagePath,
            success: () => {
                wx.showToast({
                    title: '保存成功',
                    icon: 'success'
                })
            },
            fail: () => {
                wx.showToast({
                    title: '保存失败',
                    icon: 'none'
                })
            }
        })
    },

    retake() {
        this.setData({
            tempImagePath: ''
        })
    },

    error(e) {
        console.error(e.detail)
    }
}) 