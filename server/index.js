const keys = require('./keys')

const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(bodyParser.json())

const { Pool } = require('pg')
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
})
pgClient.on('error', () => {
  console.log('Lost postgres connection.')
})
pgClient.on('connect', () => {
  pgClient
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.log(err))
})

const redis = require('redis')
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
})
const redisPublisher = redisClient.duplicate()

// Route handlers

app.get('/', (req, res) => {
  res.send('Hi')
})

app.get('/values/all', async (req, res) => {
  const values = await pgClient.query('SELECT * from values')
  res.send(values.rows)
})

app.get('/values/reset', async (req, res) => {
  await pgClient.query('DELETE from values')
  redisClient.del('values')
  res.send('ok')
})

app.get('/values/current', async (req, res) => {
  redisClient.hgetall('values', (err, values) => {
    if (err) console.error(err)
    res.send(values)
  })
})

app.post('/values', async (req, res) => {
  const index = req.body.index
  if (parseInt(index) > 40) {
    return res.status(442).send('Index too high')
  }
  redisClient.hset('values', index, 'Nothing yet!')
  redisPublisher.publish('insert', index) // new insert event for redis
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index])
  res.send({ working: true, index })
})

app.listen(5000, err => {
  console.log('Listening on port 5000...')
  if (err) console.error(err)
})
