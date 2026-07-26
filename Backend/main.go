package main

import (
	"log"

	"transcendence/config"
	"transcendence/handlers"
	"transcendence/middleware"
	"transcendence/oauth"
	"transcendence/services"
	"transcendence/ws"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()

	db, err := config.InitDB(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	router := gin.Default()

	// CORS middleware
	router.Use(middleware.CORSMiddleware(cfg.CORSAllowedOrigin))

	// Serve uploaded avatar files publicly (no auth required for <img> tags)
	router.Static("/uploads", "./uploads")

	// Initialize services
	userService := services.NewUserService(db)
	accountService := services.NewAccountService(db)
	friendService := services.NewFriendService(db)
	gameService := services.NewGameService(db)
	engineClient := services.NewEngineClient(cfg.EngineHost, cfg.EnginePort)
	notificationService := services.NewNotificationService(db)
	oauthService := services.NewOauthService()

	// Initialize OAuth Providers
	githubOauthProvider := oauth.NewGitHubProvider(cfg.GithubClientId, cfg.GithubSecret, "http://localhost:3334/auth/github/callback")
	oauthService.RegisterProvider("github", githubOauthProvider)

	// Initialize WebSockets
	wsState := ws.CreateWebSocketState(userService, friendService, notificationService)
	go wsState.Main()

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userService, oauthService, cfg.JWTSecret, cfg.JWTExpiration)
	userHandler := handlers.NewUserHandler(userService, accountService, friendService, notificationService, wsState)
	gameHandler := handlers.NewGameHandler(gameService, accountService, engineClient)
	wsHandler := handlers.NewWebSocketHandler(wsState)

	// Auth routes
	authRoutes := router.Group("/auth")
	{
		authRoutes.POST("/register", authHandler.Register)
		authRoutes.POST("/login", authHandler.Login)
		authRoutes.POST("/logout", authHandler.Logout)
		authRoutes.GET("/:provider", authHandler.OauthLogin)
		authRoutes.GET("/:provider/callback", authHandler.OauthCallback)
	}

	// User routes (protected)
	userRoutes := router.Group("/user")
	userRoutes.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	{
		userRoutes.GET("/profile", userHandler.GetProfile)
		userRoutes.PUT("/profile", userHandler.UpdateProfile)
		userRoutes.POST("/avatar", userHandler.UploadAvatar)
		userRoutes.GET("/account", userHandler.GetAccount)
		userRoutes.GET("/account/transactions", userHandler.GetTransactionHistory)
		userRoutes.POST("/account/deposit", userHandler.Deposit)
		userRoutes.POST("/account/withdraw", userHandler.Withdraw)
		userRoutes.POST("/:id/friends", userHandler.AddFriend)
		userRoutes.DELETE("/:id/friends", userHandler.RemoveFriend)
		userRoutes.GET("/friends", userHandler.EnumerateFriends)
		userRoutes.GET("/search", userHandler.SearchUsers)
		userRoutes.DELETE("/:id/notifications", userHandler.RemoveNotification)
		userRoutes.GET("/notifications", userHandler.EnumerateNotifications)
		userRoutes.GET("/notification_types", userHandler.GetNotificationTypes)
		userRoutes.PUT("/notification_types", userHandler.SetNotificationTypes)
	}

	// Game routes (protected)
	gameRoutes := router.Group("/games")
	gameRoutes.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	{
		gameRoutes.GET("", gameHandler.GetGames)
		gameRoutes.POST("", gameHandler.CreateGame)
		gameRoutes.GET("/:id", gameHandler.GetGame)
		gameRoutes.POST("/:id/action", gameHandler.ExecuteAction)
	}

	// WebSocket route
	router.GET("/ws", middleware.AuthFix, middleware.AuthMiddleware(cfg.JWTSecret), wsHandler.UpgradeConnection)

	log.Printf("Starting server on port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
