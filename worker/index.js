const keys = require('./keys')
const redis = require('redis')

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
})

const sub = redisClient.duplicate()

function fib (index) {
  if (index < 2) return 1
  return fib(index - 1) + fib(index - 2)
}

/**
 * Everytime we detect a new value in redis,
 * we will run fibonacci function.
 */
sub.on('message', (channel, message) => {
  console.info('New value', message, 'on', channel)
  redisClient.hset('values', message, fib(parseInt(message)))
})
sub.subscribe('insert');
