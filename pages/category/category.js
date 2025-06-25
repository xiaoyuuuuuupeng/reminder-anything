// pages/category/category.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    categories: [
      { id: 1, name: '工作', color: '#FF6B6B', icon: '💼' },
      { id: 2, name: '学习', color: '#4ECDC4', icon: '📚' },
      { id: 3, name: '生活', color: '#45B7D1', icon: '🏠' },
      { id: 4, name: '健康', color: '#96CEB4', icon: '💚' },
      { id: 5, name: '娱乐', color: '#FFEAA7', icon: '🎮' },
      { id: 6, name: '其他', color: '#DDA0DD', icon: '📝' }
    ],
    showAddDialog: false,
    newCategoryName: '',
    selectedColor: '#FF6B6B',
    selectedIcon: '📝',
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF7675', '#74B9FF'],
    icons: ['💼', '📚', '🏠', '💚', '🎮', '📝', '⭐', '🎯', '💡', '🔔']
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadCategories();
  },

  /**
   * 加载分类数据
   */
  loadCategories() {
    const categories = wx.getStorageSync('categories') || this.data.categories;
    this.setData({
      categories: categories
    });
  },

  /**
   * 显示添加分类对话框
   */
  showAddCategory() {
    this.setData({
      showAddDialog: true,
      newCategoryName: '',
      selectedColor: '#FF6B6B',
      selectedIcon: '📝'
    });
  },

  /**
   * 隐藏添加分类对话框
   */
  hideAddDialog() {
    this.setData({
      showAddDialog: false
    });
  },

  /**
   * 输入分类名称
   */
  onCategoryNameInput(e) {
    this.setData({
      newCategoryName: e.detail.value
    });
  },

  /**
   * 选择颜色
   */
  selectColor(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({
      selectedColor: color
    });
  },

  /**
   * 选择图标
   */
  selectIcon(e) {
    const icon = e.currentTarget.dataset.icon;
    this.setData({
      selectedIcon: icon
    });
  },

  /**
   * 添加分类
   */
  addCategory() {
    const { newCategoryName, selectedColor, selectedIcon, categories } = this.data;
    
    if (!newCategoryName.trim()) {
      wx.showToast({
        title: '请输入分类名称',
        icon: 'none'
      });
      return;
    }

    // 检查分类名称是否已存在
    const exists = categories.some(cat => cat.name === newCategoryName.trim());
    if (exists) {
      wx.showToast({
        title: '分类名称已存在',
        icon: 'none'
      });
      return;
    }

    const newCategory = {
      id: Date.now(),
      name: newCategoryName.trim(),
      color: selectedColor,
      icon: selectedIcon
    };

    const updatedCategories = [...categories, newCategory];
    
    // 保存到本地存储
    wx.setStorageSync('categories', updatedCategories);
    
    this.setData({
      categories: updatedCategories,
      showAddDialog: false
    });

    wx.showToast({
      title: '添加成功',
      icon: 'success'
    });
  },

  /**
   * 删除分类
   */
  deleteCategory(e) {
    const id = e.currentTarget.dataset.id;
    const { categories } = this.data;
    
    wx.showModal({
      title: '确认删除',
      content: '删除分类后，该分类下的提醒将移至"其他"分类',
      success: (res) => {
        if (res.confirm) {
          const updatedCategories = categories.filter(cat => cat.id !== id);
          wx.setStorageSync('categories', updatedCategories);
          
          this.setData({
            categories: updatedCategories
          });

          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 编辑分类
   */
  editCategory(e) {
    const id = e.currentTarget.dataset.id;
    const category = this.data.categories.find(cat => cat.id === id);
    
    if (category) {
      this.setData({
        showAddDialog: true,
        newCategoryName: category.name,
        selectedColor: category.color,
        selectedIcon: category.icon,
        editingId: id
      });
    }
  },

  /**
   * 保存编辑
   */
  saveEdit() {
    const { newCategoryName, selectedColor, selectedIcon, categories, editingId } = this.data;
    
    if (!newCategoryName.trim()) {
      wx.showToast({
        title: '请输入分类名称',
        icon: 'none'
      });
      return;
    }

    const updatedCategories = categories.map(cat => {
      if (cat.id === editingId) {
        return {
          ...cat,
          name: newCategoryName.trim(),
          color: selectedColor,
          icon: selectedIcon
        };
      }
      return cat;
    });

    wx.setStorageSync('categories', updatedCategories);
    
    this.setData({
      categories: updatedCategories,
      showAddDialog: false,
      editingId: null
    });

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})