const app = require('./app');
const config = require('./config/config');

// Start the server
app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});