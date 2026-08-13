-- KEYS[1] = rate limit key
-- ARGV[1] = window length in seconds
-- ARGV[2] = max requests allowed

local current = redisClient.call('INCR', KEYS[1])
if current == 1 then
  -- only set expiry on the FIRST request in this window —
  -- calling EXPIRE every time would keep resetting the TTL and the
  -- window would never actually close
  redisClient.call('EXPIRE', KEYS[1], ARGV[1])
end

local ttl = redisClient.call('TTL', KEYS[1])
local limit = tonumber(ARGV[2])

if current > limit then
  return {0, current, ttl}   -- rejected
else
  return {1, current, ttl}   -- allowed
end
