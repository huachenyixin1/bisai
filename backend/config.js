// backend/config.js  
module.exports  = {
    // 原有日志配置 
    logging: {
      level: 'debug',
      modules: {
        evalmanage: {
          batchImport: true,
        },
      },
    },
   
    // 管理员账户配置（需要修改的部分）
    admin: {
      username: 'admin1',      // 管理员账号 
      password: 'admin123'     // 管理员密码（明文）
    }
  };