package oauth

type OauthUser struct {
	ID        string
	Username  string
	Email     string
	AvatarURL string
}

type Provider interface {
	// GetLoginUrl builds the provider's authorization URL. state must be an
	// unpredictable, per-login value the caller verifies on callback to
	// prevent CSRF against the OAuth flow.
	GetLoginUrl(state string) string
	ExchangeCode(code string) (string, error)
	GetUser(token string) (*OauthUser, error)
}

