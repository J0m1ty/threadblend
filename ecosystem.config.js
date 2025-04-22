module.exports = {
    apps: [
        {
            name: 'threadblend',
            version: '1.0.0',
            script: 'npm',
            args: 'start',
            autorestart: true,
            watch: false,
            env_production: {
                NODE_ENV: 'production'
            },
            env_development: {
                NODE_ENV: 'development'
            }
        }
    ]
};