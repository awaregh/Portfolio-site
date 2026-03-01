-- sliding_window.lua
-- Sliding-window log using a Redis sorted set.
-- Each member is a unique request ID; score is the request timestamp in ms.
-- Expired entries are pruned on each call.
--
-- KEYS[1]  = sorted set key
-- ARGV[1]  = limit        (max requests per window)
-- ARGV[2]  = window_ms    (window size in milliseconds)
-- ARGV[3]  = now_ms       (Redis server time in ms)
-- ARGV[4]  = request_id   (unique ID for this request, e.g. UUIDv4)
--
-- Returns: {allowed (0|1), remaining, reset_ms}

local key        = KEYS[1]
local limit      = tonumber(ARGV[1])
local window     = tonumber(ARGV[2])
local now        = tonumber(ARGV[3])
local request_id = ARGV[4]

local window_start = now - window

-- Remove expired entries
redis.call("ZREMRANGEBYSCORE", key, "-inf", window_start)

local count = redis.call("ZCARD", key)
local allowed = 0

if count < limit then
  redis.call("ZADD", key, now, request_id)
  count = count + 1
  allowed = 1
end

local remaining = math.max(0, limit - count)
local oldest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
local reset_ms = window
if #oldest > 0 then
  reset_ms = window - (now - tonumber(oldest[2]))
end

redis.call("PEXPIRE", key, window + 1000)

return {allowed, remaining, reset_ms}
