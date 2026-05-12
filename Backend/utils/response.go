package utils

import (
	"github.com/gin-gonic/gin"
)

type APIResponse struct {
	Error   *string     `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

func RespondSuccess(c *gin.Context, statusCode int, message string, data interface{}) {
	c.JSON(statusCode, APIResponse{
		Message: message,
		Data:    data,
	})
}

func RespondError(c *gin.Context, statusCode int, message string, data interface{}) {
	c.JSON(statusCode, APIResponse{
		Message: message,
		Data:    data,
	})
}
