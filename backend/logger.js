const config = require('./config');

// 日志级别优先级
const LEVELS = {
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  off: 5,
};

class Logger {
  constructor(moduleName) {
    this.moduleName = moduleName;
  }

  // 检查是否应该输出日志
  shouldLog(level) {
    const globalLevel = LEVELS[config.logging.level] || LEVELS.info;
    const logLevel = LEVELS[level] || LEVELS.info;

    // 如果全局级别设置为 off，则不输出任何日志
    if (globalLevel === LEVELS.off) {
      return false;
    }

    // 按日志级别比较
    if (logLevel < globalLevel) {
      return false;
    }

    // 检查模块级别的开关
    const moduleConfig = config.logging.modules[this.moduleName];
    if (moduleConfig && typeof moduleConfig === 'object') {
      // 针对特定路由的控制
      return moduleConfig.batchImport !== false;
    }

    return true;
  }

  debug(...args) {
    if (this.shouldLog('debug')) {
      console.debug(`[${this.moduleName}]`, ...args);
    }
  }

  info(...args) {
    if (this.shouldLog('info')) {
      console.info(`[${this.moduleName}]`, ...args);
    }
  }

  warn(...args) {
    if (this.shouldLog('warn')) {
      console.warn(`[${this.moduleName}]`, ...args);
    }
  }

  error(...args) {
    if (this.shouldLog('error')) {
      console.error(`[${this.moduleName}]`, ...args);
    }
  }
}

module.exports = (moduleName) => new Logger(moduleName);