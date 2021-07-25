module.exports = {
  apps: [{
    name: 'reactBot',
    script: './index.js',
    max_memory_restart: '1000M',
    // instances: 1,
    // exec_mode: 'cluster',
    watch: true,
    ignore_watch: ['node_modules', 'assets', 'helpers/tdlib/data/db'],
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
}
