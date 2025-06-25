// pages/statistics/statistics.js
const statisticsService = require('../../utils/statisticsService');
const dateUtils = require('../../utils/dateUtils');

Page({
  data: {
    // 加载状态
    loading: true,
    
    // 时间范围
    timeRange: 'week', // week, month, year
    
    // 基础统计
    basicStats: {
      total: 0,
      warning: 0,
      expired: 0,
      completed: 0
    },
    
    // 趋势数据
    trendData: {
      labels: [],
      datasets: []
    },
    
    // 分类统计
    categoryStats: [],
    
    // 使用习惯分析
    usageAnalysis: {
      timePreferences: [],
      completionRate: {
        overall: 0,
        thisWeek: 0,
        thisMonth: 0
      },
      activity: {
        dailyAverage: 0,
        weeklyTotal: 0,
        monthlyTotal: 0
      }
    },
    
    // 效率报告
    efficiencyReport: {
      score: 0,
      level: 'beginner',
      metrics: {
        onTimeRate: 0,
        responseTime: 0,
        planningAccuracy: 0,
        consistency: 0
      },
      insights: [],
      recommendations: []
    },
    
    // 图表配置
    chartOptions: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0,0,0,0.1)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  },

  onLoad() {
    this.loadStatistics();
  },

  onShow() {
    // 页面显示时刷新数据
    if (!this.data.loading) {
      this.loadStatistics();
    }
  },

  onPullDownRefresh() {
    this.loadStatistics().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载统计数据
  async loadStatistics() {
    try {
      this.setData({ loading: true });
      
      // 并行加载所有统计数据
      const [basicStats, trendStats, categoryStats, usageAnalysis, efficiencyReport] = await Promise.all([
        statisticsService.getBasicStats(),
        statisticsService.getTrendStats(this.data.timeRange),
        statisticsService.getCategoryStats(),
        statisticsService.getUsageAnalysis(),
        statisticsService.getEfficiencyReport()
      ]);
      
      // 处理趋势数据
      const trendData = this.processTrendData(trendStats);
      
      this.setData({
        basicStats,
        trendData,
        categoryStats,
        usageAnalysis,
        efficiencyReport,
        loading: false
      });
      
    } catch (error) {
      console.error('加载统计数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
      this.setData({ loading: false });
    }
  },

  // 处理趋势数据
  processTrendData(trendStats) {
    const { labels, data } = trendStats;
    
    return {
      labels,
      datasets: [
        {
          label: '新增提醒',
          data: data.added || [],
          borderColor: '#1890ff',
          backgroundColor: 'rgba(24, 144, 255, 0.1)',
          tension: 0.4
        },
        {
          label: '完成提醒',
          data: data.completed || [],
          borderColor: '#52c41a',
          backgroundColor: 'rgba(82, 196, 26, 0.1)',
          tension: 0.4
        },
        {
          label: '过期提醒',
          data: data.expired || [],
          borderColor: '#ff4d4f',
          backgroundColor: 'rgba(255, 77, 79, 0.1)',
          tension: 0.4
        }
      ]
    };
  },

  // 切换时间范围
  onTimeRangeChange(e) {
    const timeRange = e.currentTarget.dataset.range;
    if (timeRange === this.data.timeRange) return;
    
    this.setData({ timeRange });
    this.loadTrendData(timeRange);
  },

  // 加载趋势数据
  async loadTrendData(timeRange) {
    try {
      const trendStats = await statisticsService.getTrendStats(timeRange);
      const trendData = this.processTrendData(trendStats);
      
      this.setData({ trendData });
    } catch (error) {
      console.error('加载趋势数据失败:', error);
    }
  },

  // 查看分类详情
  onCategoryTap(e) {
    const { category } = e.currentTarget.dataset;
    
    wx.navigateTo({
      url: `/pages/index/index?category=${category.name}`
    });
  },

  // 导出数据
  async onExportData() {
    try {
      wx.showLoading({ title: '导出中...' });
      
      const exportData = await statisticsService.exportStatistics();
      
      // 生成文件名
      const now = new Date();
      const fileName = `提醒统计_${dateUtils.formatDate(now, 'YYYY-MM-DD')}.json`;
      
      // 保存到本地
      const fs = wx.getFileSystemManager();
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      
      fs.writeFile({
        filePath,
        data: JSON.stringify(exportData, null, 2),
        encoding: 'utf8',
        success: () => {
          wx.hideLoading();
          wx.showModal({
            title: '导出成功',
            content: `数据已保存到：${fileName}`,
            showCancel: false
          });
        },
        fail: (error) => {
          console.error('保存文件失败:', error);
          wx.hideLoading();
          wx.showToast({
            title: '导出失败',
            icon: 'error'
          });
        }
      });
      
    } catch (error) {
      console.error('导出数据失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '导出失败',
        icon: 'error'
      });
    }
  },

  // 刷新数据
  onRefreshData() {
    this.loadStatistics();
  },

  // 查看效率详情
  onEfficiencyTap() {
    const { efficiencyReport } = this.data;
    
    wx.showModal({
      title: '效率分析详情',
      content: this.formatEfficiencyDetails(efficiencyReport),
      showCancel: false
    });
  },

  // 格式化效率详情
  formatEfficiencyDetails(report) {
    const { score, level, metrics } = report;
    
    return `当前评分：${score}分\n` +
           `等级：${this.getLevelText(level)}\n\n` +
           `按时完成率：${(metrics.onTimeRate * 100).toFixed(1)}%\n` +
           `平均响应时间：${metrics.responseTime}小时\n` +
           `计划准确度：${(metrics.planningAccuracy * 100).toFixed(1)}%\n` +
           `使用一致性：${(metrics.consistency * 100).toFixed(1)}%`;
  },

  // 获取等级文本
  getLevelText(level) {
    const levelMap = {
      'beginner': '新手',
      'intermediate': '进阶',
      'advanced': '高级',
      'expert': '专家'
    };
    return levelMap[level] || '未知';
  },

  // 查看使用建议
  onViewRecommendations() {
    const { recommendations } = this.data.efficiencyReport;
    
    if (recommendations.length === 0) {
      wx.showToast({
        title: '暂无建议',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '使用建议',
      content: recommendations.join('\n\n'),
      showCancel: false
    });
  },

  // 查看洞察分析
  onViewInsights() {
    const { insights } = this.data.efficiencyReport;
    
    if (insights.length === 0) {
      wx.showToast({
        title: '暂无洞察',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '行为洞察',
      content: insights.join('\n\n'),
      showCancel: false
    });
  },

  // 跳转到添加页面
  onAddReminder() {
    wx.navigateTo({
      url: '/pages/add/add'
    });
  },

  // 获取时间范围文本
  getTimeRangeText(range) {
    const rangeMap = {
      'week': '本周',
      'month': '本月',
      'year': '本年'
    };
    return rangeMap[range] || '未知';
  },

  // 获取分类图标
  getCategoryIcon(category) {
    const iconMap = {
      '食品': '🍎',
      '药品': '💊',
      '日用品': '🧴',
      '证件': '📄',
      '账单': '💳',
      '纪念日': '🎂',
      '体检': '🏥',
      '其他': '📝'
    };
    return iconMap[category] || '📝';
  },

  // 获取分类颜色
  getCategoryColor(category) {
    const colorMap = {
      '食品': '#52c41a',
      '药品': '#ff4d4f',
      '日用品': '#1890ff',
      '证件': '#faad14',
      '账单': '#722ed1',
      '纪念日': '#eb2f96',
      '体检': '#13c2c2',
      '其他': '#666666'
    };
    return colorMap[category] || '#666666';
  },

  // 计算完成率百分比
  calculateCompletionRate(completed, total) {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  },

  // 格式化数字显示
  formatNumber(num) {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  },

  // 获取状态颜色
  getStatusColor(status) {
    const colorMap = {
      'normal': '#52c41a',
      'warning': '#faad14',
      'expired': '#ff4d4f',
      'completed': '#1890ff'
    };
    return colorMap[status] || '#666666';
  },

  // 页面分享
  onShareAppMessage() {
    const { basicStats } = this.data;
    
    return {
      title: `我已经管理了${basicStats.total}个提醒，完成率${this.calculateCompletionRate(basicStats.completed, basicStats.total)}%`,
      path: '/pages/index/index',
      imageUrl: '/images/share-statistics.png'
    };
  },

  // 页面分享到朋友圈
  onShareTimeline() {
    const { basicStats } = this.data;
    
    return {
      title: `智能提醒助手 - 已管理${basicStats.total}个提醒`,
      imageUrl: '/images/share-statistics.png'
    };
  }
});