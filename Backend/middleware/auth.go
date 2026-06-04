package middleware

import (
	"fmt"
	"strings"

	"transcendence/utils"

	"github.com/gin-gonic/gin"
)

func AuthFix(c *gin.Context) {
	c.Request.Header.Set("Authorization", "Bearer " + c.Query("token"))
	c.Next()
}

// AuthMiddleware validates JWT token from Authorization header
func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.RespondError(c, 401, "unauthorized", "missing authorization header")
			fmt.Printf("Missing authorization header")
			c.Abort()
			return
		}
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			utils.RespondError(c, 401, "unauthorized", "invalid authorization header")
			fmt.Printf("Invalid authorization header")
			c.Abort()
			return
		}
		tokenString := parts[1]
		claims, err := utils.ValidateToken(tokenString, jwtSecret)
		if err != nil {
			utils.RespondError(c, 401, "unauthorized", "invalid or expired token")
			fmt.Printf("Invalid or expired token")
			c.Abort()
			return
		}
		// Store user ID in context for handlers to use
		c.Set("user_id", claims.UserID)
		c.Next()
	}
}
