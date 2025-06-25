module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true
  },
  extends: [
    'standard'
  ],
  globals: {
    // 微信小程序全局变量
    wx: 'readonly',
    App: 'readonly',
    Page: 'readonly',
    Component: 'readonly',
    Behavior: 'readonly',
    getApp: 'readonly',
    getCurrentPages: 'readonly',
    // 微信小程序API
    console: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  rules: {
    // 代码风格
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'never'],
    'comma-dangle': ['error', 'never'],
    'space-before-function-paren': ['error', 'always'],
    
    // 变量
    'no-unused-vars': ['warn', { 
      'vars': 'all', 
      'args': 'after-used',
      'ignoreRestSiblings': false 
    }],
    'no-undef': 'error',
    
    // 函数
    'no-empty-function': 'warn',
    'prefer-arrow-callback': 'warn',
    
    // 对象和数组
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    
    // 条件语句
    'eqeqeq': ['error', 'always'],
    'no-else-return': 'warn',
    
    // 注释
    'spaced-comment': ['error', 'always'],
    
    // 微信小程序特定规则
    'no-console': 'off', // 允许console，微信小程序调试需要
    'camelcase': ['error', { 'properties': 'never' }] // 允许属性名不是驼峰
  },
  
  // 忽略特定文件
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '*.min.js'
  ]
}