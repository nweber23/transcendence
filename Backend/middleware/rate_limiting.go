package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"transcendence/utils"

	"github.com/gin-gonic/gin"
)

const cleanupInterval = 5 * time.Minute

// unauthenticatedRateLimitKey buckets every caller with no known user_id
// (e.g. not yet authenticated) into a single shared slot, same as before
// KeyedRateLimiter was extracted.
const unauthenticatedRateLimitKey uint = 0

// KeyedRateLimiter enforces a minimum delay between calls sharing the same
// key. It's usable outside of Gin middleware (e.g. from a handler that
// hasn't authenticated the caller yet, so no gin.Context "user_id" exists).
type KeyedRateLimiter struct {
	mutex       sync.Mutex
	minDelay    time.Duration
	retryAfters map[uint]time.Time
	lastCleanup time.Time
}

func NewKeyedRateLimiter(minimumDelayInMilliseconds uint) *KeyedRateLimiter {
	return &KeyedRateLimiter{
		minDelay:    time.Duration(minimumDelayInMilliseconds) * time.Millisecond,
		retryAfters: make(map[uint]time.Time),
	}
}

// Allow reports whether a call keyed by key may proceed now. If not,
// retryAfter is how long the caller should wait before trying again.
func (r *KeyedRateLimiter) Allow(key uint) (blocked bool, retryAfter time.Duration) {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	currentTime := time.Now()
	if currentTime.Sub(r.lastCleanup) > cleanupInterval {
		for existingKey, until := range r.retryAfters {
			if currentTime.After(until) {
				delete(r.retryAfters, existingKey)
			}
		}
		r.lastCleanup = currentTime
	}

	until := r.retryAfters[key]
	blocked = currentTime.Before(until)
	if !blocked {
		r.retryAfters[key] = currentTime.Add(r.minDelay)
		return false, 0
	}
	return true, until.Sub(currentTime)
}

func CreateRateLimiter(minimumDelayInMilliseconds uint) gin.HandlerFunc {
	limiter := NewKeyedRateLimiter(minimumDelayInMilliseconds)

	return func(c *gin.Context) {
		key := unauthenticatedRateLimitKey
		if userInterfaceID, exists := c.Get("user_id"); exists {
			key = userInterfaceID.(uint)
		}

		blocked, retryAfter := limiter.Allow(key)
		if blocked {
			c.Header("Retry-After", strconv.Itoa(int(retryAfter.Seconds()+1)))
			utils.RespondError(c, http.StatusTooManyRequests, "rate_limited", "stop sending so many requests")
			c.Abort()
			return
		}
		c.Next()
	}
}
