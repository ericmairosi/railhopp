// Quick debug script to check Darwin configuration
require('dotenv').config({ path: '.env.local' });

console.log('=== Darwin Configuration Debug ===');
console.log('DARWIN_ENABLED:', process.env.DARWIN_ENABLED);
console.log('DARWIN_USERNAME:', process.env.DARWIN_USERNAME);
console.log('DARWIN_PASSWORD:', process.env.DARWIN_PASSWORD ? 'SET (hidden)' : 'NOT SET');
console.log('DARWIN_QUEUE_URL:', process.env.DARWIN_QUEUE_URL);
console.log('DARWIN_QUEUE_NAME:', process.env.DARWIN_QUEUE_NAME);
console.log('DARWIN_CLIENT_ID:', process.env.DARWIN_CLIENT_ID);

console.log('\n=== STOMP Client Config Test ===');
const stompConfig = {
  enabled: process.env.DARWIN_ENABLED === 'true',
  username: process.env.DARWIN_USERNAME || 'your_darwin_username',
  password: process.env.DARWIN_PASSWORD || 'your_darwin_password',
  queueUrl: process.env.DARWIN_QUEUE_URL || 'ssl://datafeeds.nationalrail.co.uk:61613'
};

console.log('Config object:', {
  ...stompConfig,
  password: stompConfig.password ? 'SET (hidden)' : 'NOT SET'
});

const stompEnabled = Boolean(
  stompConfig.enabled && 
  stompConfig.username && 
  stompConfig.password &&
  stompConfig.username !== 'your_darwin_username'
);

console.log('STOMP isEnabled():', stompEnabled);

console.log('\n=== Pub/Sub Client Config Test ===');
const pubSubConfig = {
  enabled: process.env.DARWIN_ENABLED === 'true',
  queueUrl: process.env.DARWIN_QUEUE_URL,
  username: process.env.DARWIN_USERNAME || 'your_darwin_username',
  password: process.env.DARWIN_PASSWORD || 'your_darwin_password'
};

const pubSubEnabled = Boolean(
  pubSubConfig.enabled && 
  pubSubConfig.queueUrl && 
  pubSubConfig.username && 
  pubSubConfig.password &&
  pubSubConfig.username !== 'your_darwin_username'
);

console.log('Pub/Sub isEnabled():', pubSubEnabled);

console.log('\n=== Overall Result ===');
console.log('Overall Darwin isEnabled():', stompEnabled || pubSubEnabled);

// Also check for the API URL/Token approach mentioned in error
console.log('\n=== Legacy API Config (from error message) ===');
console.log('DARWIN_API_URL:', process.env.DARWIN_API_URL || 'NOT SET');
console.log('DARWIN_API_TOKEN:', process.env.DARWIN_API_TOKEN ? 'SET (hidden)' : 'NOT SET');
