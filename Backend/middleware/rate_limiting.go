package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"transcendence/utils"

	"github.com/gin-gonic/gin"
)

func CreateRateLimiter(minimumDelayInMilliseconds uint) gin.HandlerFunc {
	var mutex sync.Mutex
	var shared time.Time
	retryAfters := make(map[uint]time.Time)

	return func(c *gin.Context) {
		userInterfaceID, exists := c.Get("user_id")
		currentTime := time.Now()

		mutex.Lock()
		var retryAfter time.Time
		var blocked bool
		if exists {
			userID := userInterfaceID.(uint)
			retryAfter = retryAfters[userID]
			blocked = currentTime.Before(retryAfter)
			if !blocked {
				retryAfters[userID] = currentTime.Add(time.Duration(minimumDelayInMilliseconds) * time.Millisecond)
			}
		} else {
			retryAfter = shared
			blocked = currentTime.Before(retryAfter)
			if !blocked {
				shared = currentTime.Add(time.Duration(minimumDelayInMilliseconds) * time.Millisecond)
			}
		}
		mutex.Unlock()

		if blocked {
			c.Header("Retry-After", strconv.Itoa(int(retryAfter.Sub(currentTime).Seconds()+1)))
			utils.RespondError(c, http.StatusTooManyRequests, "rate_limited", "stop sending so many requests")
			c.Abort()
			return
		}
		c.Next()
	}
}
