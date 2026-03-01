-- token_bucket.lua
-- Atomically reads bucket state, refills tokens proportional to elapsed
-- time since last access, and decrements one token.
--
-- KEYS[1]  = bucket key  (e.g. "ratelimit:{tenant}:{endpoint}")
-- ARGV[1]  = capacity    (max tokens)
-- ARGV[2]  = refill_rate (tokens per second)
-- ARGV[3]  = now_ms      (Redis server time in ms, from TIME command)
--
-- Returns: {allowed (0|1), remaining, reset_ms}

local key       = KEYS[1]
local capacity  = tonumber(ARGV[1])
local rate      = tonumber(ARGV[2])
local now       = tonumber(ARGV[3])

local bucket = redis.call("HMGET", key, "tokens", "last_refill")
local tokens     = tonumber(bucket[1]) or capacity
local last_refill = tonumber(bucket[2]) or now

local elapsed = math.max(0, now - last_refill) / 1000.0
tokens = math.min(capacity, tokens + elapsed * rate)

local allowed = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
end

local reset_ms = math.ceil((capacity - tokens) / rate * 1000)

redis.call("HMSET", key, "tokens", tokens, "last_refill", now)
redis.call("PEXPIRE", key, math.ceil(capacity / rate * 1000) + 1000)

return {allowed, math.floor(tokens), reset_ms}
