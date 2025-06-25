// utils/reminderService.js
// 提醒服务 - 处理提醒数据的增删改查和业务逻辑

const dateUtils = require('./dateUtils')

class ReminderService {
  constructor() {
    this.storageKey = 'reminders'
    this.categoryKey = 'categories'
  }

  // 获取所有提醒
  async getAllReminders() {
    try {
      const reminders = wx.getStorageSync(this.storageKey) || []
      return reminders.map(reminder => this.processReminder(reminder))
    } catch (error) {
      console.error('获取提醒列表失败:', error)
      return []
    }
  }

  // 根据ID获取提醒
  async getReminderById(id) {
    try {
      const reminders = await this.getAllReminders()
      const reminder = reminders.find(item => item.id === parseInt(id))
      return reminder ? this.processReminder(reminder) : null
    } catch (error) {
      console.error('获取提醒详情失败:', error)
      return null
    }
  }

  // 添加提醒
  async addReminder(reminderData) {
    try {
      const reminders = wx.getStorageSync(this.storageKey) || []
      
      const newReminder = {
        id: Date.now(), // 使用时间戳作为ID
        ...reminderData,
        createTime: Date.now(),
        updateTime: Date.now(),
        status: this.calculateStatus(reminderData)
      }
      
      reminders.push(newReminder)
      wx.setStorageSync(this.storageKey, reminders)
      
      // 设置提醒通知
      await this.scheduleNotification(newReminder)
      
      return newReminder
    } catch (error) {
      console.error('添加提醒失败:', error)
      throw error
    }
  }

  // 更新提醒
  async updateReminder(id, updateData) {
    try {
      const reminders = wx.getStorageSync(this.storageKey) || []
      const index = reminders.findIndex(item => item.id === parseInt(id))
      
      if (index === -1) {
        throw new Error('提醒不存在')
      }
      
      const updatedReminder = {
        ...reminders[index],
        ...updateData,
        updateTime: Date.now(),
        status: this.calculateStatus({ ...reminders[index], ...updateData })
      }
      
      reminders[index] = updatedReminder
      wx.setStorageSync(this.storageKey, reminders)
      
      // 重新设置提醒通知
      await this.scheduleNotification(updatedReminder)
      
      return updatedReminder
    } catch (error) {
      console.error('更新提醒失败:', error)
      throw error
    }
  }

  // 删除提醒
  async deleteReminder(id) {
    try {
      const reminders = wx.getStorageSync(this.storageKey) || []
      const filteredReminders = reminders.filter(item => item.id !== parseInt(id))
      
      wx.setStorageSync(this.storageKey, filteredReminders)
      
      // 取消通知
      await this.cancelNotification(id)
      
      return true
    } catch (error) {
      console.error('删除提醒失败:', error)
      throw error
    }
  }

  // 批量删除提醒
  async batchDeleteReminders(ids) {
    try {
      const reminders = wx.getStorageSync(this.storageKey) || []
      const filteredReminders = reminders.filter(item => !ids.includes(item.id))
      
      wx.setStorageSync(this.storageKey, filteredReminders)
      
      // 批量取消通知
      for (const id of ids) {
        await this.cancelNotification(id)
      }
      
      return true
    } catch (error) {
      console.error('批量删除提醒失败:', error)
      throw error
    }
  }

  // 搜索提醒
  async searchReminders(keyword) {
    try {
      const reminders = await this.getAllReminders()
      const lowerKeyword = keyword.toLowerCase()
      
      return reminders.filter(reminder => 
        reminder.title.toLowerCase().includes(lowerKeyword) ||
        (reminder.description && reminder.description.toLowerCase().includes(lowerKeyword)) ||
        (reminder.tags && reminder.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)))
      )
    } catch (error) {
      console.error('搜索提醒失败:', error)
      return []
    }
  }

  // 按分类筛选提醒
  async getRemindersByCategory(categoryId) {
    try {
      const reminders = await this.getAllReminders()
      return reminders.filter(reminder => reminder.categoryId === categoryId)
    } catch (error) {
      console.error('按分类获取提醒失败:', error)
      return []
    }
  }

  // 按状态筛选提醒
  async getRemindersByStatus(status) {
    try {
      const reminders = await this.getAllReminders()
      return reminders.filter(reminder => reminder.status === status)
    } catch (error) {
      console.error('按状态获取提醒失败:', error)
      return []
    }
  }

  // 获取即将到期的提醒
  async getUpcomingReminders(days = 7) {
    try {
      const reminders = await this.getAllReminders()
      const now = new Date()
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
      
      return reminders.filter(reminder => {
        const expireDate = new Date(reminder.expireDate)
        return expireDate >= now && expireDate <= futureDate && reminder.status !== 'completed'
      })
    } catch (error) {
      console.error('获取即将到期提醒失败:', error)
      return []
    }
  }

  // 获取已过期的提醒
  async getExpiredReminders() {
    try {
      const reminders = await this.getAllReminders()
      return reminders.filter(reminder => reminder.status === 'expired')
    } catch (error) {
      console.error('获取过期提醒失败:', error)
      return []
    }
  }

  // 获取统计数据
  async getStatistics() {
    try {
      const reminders = await this.getAllReminders()
      
      const stats = {
        total: reminders.length,
        normal: 0,
        warning: 0,
        expired: 0,
        completed: 0,
        byCategory: {},
        byPriority: {
          low: 0,
          normal: 0,
          high: 0
        }
      }
      
      reminders.forEach(reminder => {
        // 按状态统计
        stats[reminder.status] = (stats[reminder.status] || 0) + 1
        
        // 按分类统计
        const categoryId = reminder.categoryId
        stats.byCategory[categoryId] = (stats.byCategory[categoryId] || 0) + 1
        
        // 按优先级统计
        stats.byPriority[reminder.priority] = (stats.byPriority[reminder.priority] || 0) + 1
      })
      
      return stats
    } catch (error) {
      console.error('获取统计数据失败:', error)
      return {
        total: 0,
        normal: 0,
        warning: 0,
        expired: 0,
        completed: 0,
        byCategory: {},
        byPriority: { low: 0, normal: 0, high: 0 }
      }
    }
  }

  // 处理提醒数据（计算状态等）
  processReminder(reminder) {
    const processedReminder = {
      ...reminder,
      status: this.calculateStatus(reminder)
    }
    
    return processedReminder
  }

  // 计算提醒状态
  calculateStatus(reminder) {
    if (reminder.status === 'completed') {
      return 'completed'
    }
    
    const now = new Date()
    const expireDate = new Date(reminder.expireDate)
    const timeDiff = expireDate.getTime() - now.getTime()
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
    
    if (daysDiff < 0) {
      return 'expired'
    } else if (daysDiff <= reminder.remindDays) {
      return 'warning'
    } else {
      return 'normal'
    }
  }

  // 设置提醒通知
  async scheduleNotification(reminder) {
    try {
      // 取消之前的通知
      await this.cancelNotification(reminder.id)
      
      if (!reminder.enableWechatNotify && !reminder.enableAppNotify) {
        return
      }
      
      const now = new Date()
      const expireDate = new Date(reminder.expireDate)
      const remindDate = new Date(expireDate.getTime() - reminder.remindDays * 24 * 60 * 60 * 1000)
      
      // 设置提醒时间
      const [hours, minutes] = reminder.remindTime.split(':')
      remindDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      
      if (remindDate > now) {
        // 微信服务通知
        if (reminder.enableWechatNotify) {
          await this.scheduleWechatNotification(reminder, remindDate)
        }
        
        // 应用内通知
        if (reminder.enableAppNotify) {
          await this.scheduleAppNotification(reminder, remindDate)
        }
      }
      
      // 处理重复提醒
      if (reminder.repeatType !== 'none') {
        await this.scheduleRepeatNotification(reminder)
      }
      
    } catch (error) {
      console.error('设置通知失败:', error)
    }
  }

  // 设置微信服务通知
  async scheduleWechatNotification(reminder, remindDate) {
    try {
      // 这里需要调用微信的服务通知API
      // 由于小程序限制，实际实现需要后端配合
      console.log('设置微信服务通知:', reminder.title, remindDate)
    } catch (error) {
      console.error('设置微信通知失败:', error)
    }
  }

  // 设置应用内通知
  async scheduleAppNotification(reminder, remindDate) {
    try {
      // 使用本地存储记录待发送的通知
      const notifications = wx.getStorageSync('pendingNotifications') || []
      
      const notification = {
        id: `reminder_${reminder.id}`,
        reminderId: reminder.id,
        title: reminder.title,
        content: `${reminder.title}将在${reminder.remindDays}天后到期`,
        scheduleTime: remindDate.getTime(),
        type: 'reminder'
      }
      
      notifications.push(notification)
      wx.setStorageSync('pendingNotifications', notifications)
      
    } catch (error) {
      console.error('设置应用通知失败:', error)
    }
  }

  // 设置重复通知
  async scheduleRepeatNotification(reminder) {
    try {
      const repeatIntervals = {
        daily: 24 * 60 * 60 * 1000,
        weekly: 7 * 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000,
        yearly: 365 * 24 * 60 * 60 * 1000
      }
      
      const interval = repeatIntervals[reminder.repeatType]
      if (!interval) return
      
      // 记录重复提醒信息
      const repeatReminders = wx.getStorageSync('repeatReminders') || []
      const existingIndex = repeatReminders.findIndex(item => item.reminderId === reminder.id)
      
      const repeatInfo = {
        reminderId: reminder.id,
        repeatType: reminder.repeatType,
        interval,
        lastExecuted: Date.now(),
        nextExecution: Date.now() + interval
      }
      
      if (existingIndex >= 0) {
        repeatReminders[existingIndex] = repeatInfo
      } else {
        repeatReminders.push(repeatInfo)
      }
      
      wx.setStorageSync('repeatReminders', repeatReminders)
      
    } catch (error) {
      console.error('设置重复通知失败:', error)
    }
  }

  // 取消通知
  async cancelNotification(reminderId) {
    try {
      // 取消待发送通知
      const notifications = wx.getStorageSync('pendingNotifications') || []
      const filteredNotifications = notifications.filter(item => item.reminderId !== reminderId)
      wx.setStorageSync('pendingNotifications', filteredNotifications)
      
      // 取消重复通知
      const repeatReminders = wx.getStorageSync('repeatReminders') || []
      const filteredRepeats = repeatReminders.filter(item => item.reminderId !== reminderId)
      wx.setStorageSync('repeatReminders', filteredRepeats)
      
    } catch (error) {
      console.error('取消通知失败:', error)
    }
  }

  // 检查并发送待发送的通知
  async checkPendingNotifications() {
    try {
      const notifications = wx.getStorageSync('pendingNotifications') || []
      const now = Date.now()
      const toSend = []
      const remaining = []
      
      notifications.forEach(notification => {
        if (notification.scheduleTime <= now) {
          toSend.push(notification)
        } else {
          remaining.push(notification)
        }
      })
      
      // 发送到期的通知
      for (const notification of toSend) {
        await this.sendNotification(notification)
      }
      
      // 更新待发送列表
      wx.setStorageSync('pendingNotifications', remaining)
      
      return toSend.length
    } catch (error) {
      console.error('检查待发送通知失败:', error)
      return 0
    }
  }

  // 发送通知
  async sendNotification(notification) {
    try {
      // 这里可以实现实际的通知发送逻辑
      // 比如显示系统通知、发送模板消息等
      console.log('发送通知:', notification)
      
      // 记录通知历史
      const notificationHistory = wx.getStorageSync('notificationHistory') || []
      notificationHistory.unshift({
        ...notification,
        sentTime: Date.now()
      })
      
      // 只保留最近100条记录
      if (notificationHistory.length > 100) {
        notificationHistory.splice(100)
      }
      
      wx.setStorageSync('notificationHistory', notificationHistory)
      
    } catch (error) {
      console.error('发送通知失败:', error)
    }
  }

  // 处理重复提醒
  async processRepeatReminders() {
    try {
      const repeatReminders = wx.getStorageSync('repeatReminders') || []
      const now = Date.now()
      
      for (const repeatInfo of repeatReminders) {
        if (repeatInfo.nextExecution <= now) {
          const reminder = await this.getReminderById(repeatInfo.reminderId)
          if (reminder && reminder.status !== 'completed') {
            // 创建新的重复提醒
            const newExpireDate = new Date(reminder.expireDate)
            
            switch (repeatInfo.repeatType) {
              case 'daily':
                newExpireDate.setDate(newExpireDate.getDate() + 1)
                break
              case 'weekly':
                newExpireDate.setDate(newExpireDate.getDate() + 7)
                break
              case 'monthly':
                newExpireDate.setMonth(newExpireDate.getMonth() + 1)
                break
              case 'yearly':
                newExpireDate.setFullYear(newExpireDate.getFullYear() + 1)
                break
            }
            
            const newReminder = {
              ...reminder,
              id: undefined, // 让系统生成新ID
              expireDate: newExpireDate.getTime(),
              createTime: now,
              updateTime: now
            }
            
            await this.addReminder(newReminder)
            
            // 更新下次执行时间
            repeatInfo.lastExecuted = now
            repeatInfo.nextExecution = now + repeatInfo.interval
          }
        }
      }
      
      wx.setStorageSync('repeatReminders', repeatReminders)
      
    } catch (error) {
      console.error('处理重复提醒失败:', error)
    }
  }

  // 数据导出
  async exportData() {
    try {
      const reminders = await this.getAllReminders()
      const categories = wx.getStorageSync(this.categoryKey) || []
      const settings = wx.getStorageSync('userSettings') || {}
      
      const exportData = {
        version: '1.0',
        exportTime: Date.now(),
        reminders,
        categories,
        settings
      }
      
      return JSON.stringify(exportData, null, 2)
    } catch (error) {
      console.error('导出数据失败:', error)
      throw error
    }
  }

  // 数据导入
  async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData)
      
      if (data.reminders) {
        wx.setStorageSync(this.storageKey, data.reminders)
      }
      
      if (data.categories) {
        wx.setStorageSync(this.categoryKey, data.categories)
      }
      
      if (data.settings) {
        wx.setStorageSync('userSettings', data.settings)
      }
      
      return true
    } catch (error) {
      console.error('导入数据失败:', error)
      throw error
    }
  }

  // 清理过期数据
  async cleanupExpiredData() {
    try {
      // 清理已完成超过30天的提醒
      const reminders = wx.getStorageSync(this.storageKey) || []
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
      
      const filteredReminders = reminders.filter(reminder => {
        if (reminder.status === 'completed' && reminder.completedTime) {
          return reminder.completedTime > thirtyDaysAgo
        }
        return true
      })
      
      wx.setStorageSync(this.storageKey, filteredReminders)
      
      // 清理通知历史
      const notificationHistory = wx.getStorageSync('notificationHistory') || []
      const recentHistory = notificationHistory.filter(item => 
        item.sentTime > thirtyDaysAgo
      )
      wx.setStorageSync('notificationHistory', recentHistory)
      
      return true
    } catch (error) {
      console.error('清理过期数据失败:', error)
      return false
    }
  }
}

// 创建单例实例
const reminderService = new ReminderService()

module.exports = reminderService