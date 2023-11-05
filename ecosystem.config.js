module.exports = {
  apps: [
    {
      name: 'hp-api',
      script: 'dist/src/api/index.js',
    },
    {
      name: 'defi-activity',
      script: 'dist/src/activity/index.js',
    },
  ],
};
