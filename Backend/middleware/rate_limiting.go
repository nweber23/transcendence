package middleware

import (
	"time"

	"net/http"
	"transcendence/utils"

	"github.com/gin-gonic/gin"
)

var retryAfterShared time.Time
var retryAfters map[uint]*time.Time = make(map[uint]*time.Time)

func CreateRateLimiter(minimumDelayInMilliseconds uint) gin.HandlerFunc {
	return func(c *gin.Context) {
		userInterfaceID, exists := c.Get("user_id")
		var retryAfterPT *time.Time
		if exists {
			userID := userInterfaceID.(uint)
			if retryAfters[userID] == nil {
				retryAfters[userID] = &time.Time{}
			}
			retryAfterPT = retryAfters[userID]
		} else {
			retryAfterPT = &retryAfterShared
		}
		var currentTime time.Time = time.Now()
		if currentTime.Before(*retryAfterPT) {
			c.Header("Retry-After", currentTime.Format("Wed, 01 02 2006 15:04:05 GMT"))
			utils.RespondError(c, http.StatusTooManyRequests, "rate_limited", "stop sending so many requests")
			c.Abort()
			return
		}
		*retryAfterPT = currentTime.Add(time.Duration(minimumDelayInMilliseconds * 1000000))
		c.Next()
	}
}