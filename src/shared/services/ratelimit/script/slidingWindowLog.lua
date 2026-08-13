-- slidingWindowLog.lua (updated)
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local windowStart = now - windowMs

redisClient.call('ZREMRANGEBYSCORE', KEYS[1], 0, windowStart)

local count = redisClient.call('ZCARD', KEYS[1])

if count < limit then
  redisClient.call('ZADD', KEYS[1], now, now .. '-' .. math.random())
  redisClient.call('PEXPIRE', KEYS[1], windowMs)
  return {1, count + 1, 0}
else
  -- oldest entry still in the window tells us exactly when a slot frees up
  local oldest = redisClient.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  local oldestTimestamp = tonumber(oldest[2])
  local retryAfterMs = (oldestTimestamp + windowMs) - now
  return {0, count, retryAfterMs}
end
