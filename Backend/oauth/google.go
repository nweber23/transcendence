package oauth

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

type GoogleOauthProvider struct {
	clientSecret string
	clientId     string
	redirectUri  string
}

func NewGoogleProvider(clientId string, clientSecret string, redirectUri string) Provider {
	return &GoogleOauthProvider{
		clientSecret: clientSecret,
		clientId:     clientId,
		redirectUri:  redirectUri,
	}
}

func (o *GoogleOauthProvider) GetLoginUrl(state string) string {
	var u url.URL

	u.Scheme = "https"
	u.Host = "accounts.google.com"
	u.Path = "o/oauth2/v2/auth"
	q := u.Query()
	q.Set("client_id", o.clientId)
	q.Set("redirect_uri", o.redirectUri)
	q.Set("response_type", "code")
	q.Set("scope", "openid email profile")
	q.Set("state", state)
	u.RawQuery = q.Encode()
	return u.String()
}

type googleTokenResponse struct {
	AccessToken string `json:"access_token"`
	Error       string `json:"error"`
	ErrorDesc   string `json:"error_description"`
}

func (o *GoogleOauthProvider) ExchangeCode(code string) (string, error) {
	body := url.Values{}
	body.Add("code", code)
	body.Add("client_id", o.clientId)
	body.Add("client_secret", o.clientSecret)
	body.Add("redirect_uri", o.redirectUri)
	body.Add("grant_type", "authorization_code")

	req, err := http.NewRequest("POST", "https://oauth2.googleapis.com/token", nil)
	if err != nil {
		return "", err
	}
	req.URL.RawQuery = body.Encode()
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var tokenResp googleTokenResponse
	if err := json.Unmarshal(raw, &tokenResp); err != nil {
		return "", err
	}
	if tokenResp.Error != "" || tokenResp.AccessToken == "" {
		return "", fmt.Errorf("google token exchange failed: %s (%s)", tokenResp.Error, tokenResp.ErrorDesc)
	}
	return tokenResp.AccessToken, nil
}

type googleUserResponse struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

func (o *GoogleOauthProvider) GetUser(token string) (*OauthUser, error) {
	req, err := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google api returned status %d", resp.StatusCode)
	}

	var gUser googleUserResponse
	if err := json.NewDecoder(resp.Body).Decode(&gUser); err != nil {
		return nil, err
	}

	if gUser.Email == "" || !gUser.VerifiedEmail {
		return nil, fmt.Errorf("no verified email found on google account")
	}

	return &OauthUser{
		ID:        gUser.ID,
		Username:  gUser.Name,
		Email:     gUser.Email,
		AvatarURL: gUser.Picture,
	}, nil
}
