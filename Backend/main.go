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
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
	cfg := config.LoadConfig()

	db, err := config.InitDB(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	router := gin.New()
	router.Use(gin.LoggerWithConfig(gin.LoggerConfig{
		// The /ws route receives its JWT as a query parameter (browsers can't
		// set custom headers on a WebSocket handshake), so query strings must
		// never be logged or the token ends up in plaintext logs.
		SkipQueryString: true,
	}))
	router.Use(gin.Recovery())

	// CORS middleware
	router.Use(middleware.CORSMiddleware(cfg.CORSAllowedOrigin))

	// Max body size middleware (limit to 5MB, matches frontend validation)
	router.Use(middleware.MaxBodySize(5 * 1024 * 1024)) // 5MB

	// Prometheus request metrics + scrape endpoint
	router.Use(middleware.PrometheusMiddleware())
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Serve uploaded avatar files publicly (no auth required for <img> tags)
	router.Static("/uploads", "./uploads")

	// Initialize database services
	userService := services.NewUserService(db)
	accountService := services.NewAccountService(db)
	friendService := services.NewFriendService(db)
	notificationService := services.NewNotificationService(db)
	oauthService := services.NewOauthService()

	// Initialize OAuth Providers
	githubOauthProvider := oauth.NewGitHubProvider(cfg.GithubClientId, cfg.GithubSecret, cfg.GithubRedirectURL)
	oauthService.RegisterProvider("github", githubOauthProvider)
	googleOauthProvider := oauth.NewGoogleProvider(cfg.GoogleClientId, cfg.GoogleSecret, cfg.GoogleRedirectURL)
	oauthService.RegisterProvider("google", googleOauthProvider)

	// Intialize engine service
	engineService, err := services.NewEngineService(cfg.EngineHost, cfg.EnginePort)
	if err != nil {
		log.Fatalf("Failed to create engine service: %v", err)
	} else {
		log.Printf("Connection to engine running at %s:%s succeeded", cfg.EngineHost, cfg.EnginePort)
	}
	gameService := services.NewGameService(db, engineService)
	pokerTableService := services.NewPokerTableService(db)
	// Seat/hand state only ever lives in the ws package's in-memory poker
	// registry, never persisted — so any table still "open" from before
	// this process started is unrecoverable. Close them now, before the
	// registry (which starts fully empty) begins accepting new tables, so
	// a restart can't leave permanently unjoinable zombie tables sitting in
	// every user's lobby listing.
	if err := pokerTableService.CloseStaleOpenTables(); err != nil {
		log.Fatalf("Failed to close stale poker tables: %v", err)
	}

	// Initialize WebSockets
	wsState := ws.CreateWebSocketState(userService, friendService, notificationService, gameService, engineService, pokerTableService)
	go wsState.Start()

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userService, oauthService, cfg.JWTSecret, cfg.JWTExpiration, cfg.FrontendURL)
	userHandler := handlers.NewUserHandler(userService, accountService, friendService, notificationService, wsState)
	gameHandler := handlers.NewGameHandler(gameService, accountService)
	pokerTableHandler := handlers.NewPokerTableHandler(pokerTableService, userService, wsState)
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
		userRoutes.POST("/account/deposit", middleware.CreateRateLimiter(1000), userHandler.Deposit)
		userRoutes.POST("/account/withdraw", userHandler.Withdraw)
		userRoutes.POST("/:id/friends", userHandler.AddFriend)
		userRoutes.DELETE("/:id/friends", userHandler.RemoveFriend)
		userRoutes.GET("/friends", userHandler.EnumerateFriends)
		userRoutes.GET("/search", userHandler.SearchUsers)
		userRoutes.DELETE("/:id/notifications", userHandler.RemoveNotification)
		userRoutes.GET("/notifications", userHandler.EnumerateNotifications)
		userRoutes.PUT("/notifications/seen", userHandler.MarkNotificationsSeen)
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

	// Poker table routes (protected)
	pokerTableRoutes := router.Group("/poker-tables")
	pokerTableRoutes.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	{
		pokerTableRoutes.GET("", pokerTableHandler.ListTables)
		pokerTableRoutes.POST("", pokerTableHandler.CreateTable)
		pokerTableRoutes.GET("/:id", pokerTableHandler.GetTable)
		pokerTableRoutes.PUT("/:id/settings", pokerTableHandler.UpdateSettings)
		pokerTableRoutes.POST("/:id/close", pokerTableHandler.CloseTable)
		pokerTableRoutes.POST("/:id/invite", pokerTableHandler.InviteUser)
		pokerTableRoutes.POST("/:id/kick", pokerTableHandler.KickUser)
	}

	// WebSocket route
	router.GET("/ws", middleware.AuthFix, middleware.AuthMiddleware(cfg.JWTSecret), wsHandler.UpgradeConnection)

	log.Printf("Starting server on port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
