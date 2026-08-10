package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"transcendence/utils"

	"github.com/gin-gonic/gin"
)

var retryAfterMutex sync.Mutex
var retryAfterShared time.Time
var retryAfters = make(map[uint]time.Time)

func CreateRateLimiter(minimumDelayInMilliseconds uint) gin.HandlerFunc {
	return func(c *gin.Context) {
		userInterfaceID, exists := c.Get("user_id")
		currentTime := time.Now()

		retryAfterMutex.Lock()
		defer retryAfterMutex.Unlock()

		var retryAfter time.Time
		if exists {
			userID := userInterfaceID.(uint)
			retryAfter = retryAfters[userID]
			if currentTime.Before(retryAfter) {
				c.Header("Retry-After", strconv.Itoa(int(retryAfter.Sub(currentTime).Seconds()+1)))
				utils.RespondError(c, http.StatusTooManyRequests, "rate_limited", "stop sending so many requests")
				c.Abort()
				return
			}
			retryAfters[userID] = currentTime.Add(time.Duration(minimumDelayInMilliseconds) * time.Millisecond)
		} else {
			retryAfter = retryAfterShared
			if currentTime.Before(retryAfter) {
				c.Header("Retry-After", strconv.Itoa(int(retryAfter.Sub(currentTime).Seconds()+1)))
				utils.RespondError(c, http.StatusTooManyRequests, "rate_limited", "stop sending so many requests")
				c.Abort()
				return
			}
			retryAfterShared = currentTime.Add(time.Duration(minimumDelayInMilliseconds) * time.Millisecond)
		}
		c.Next()
	}
}
