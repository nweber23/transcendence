package services

import "transcendence/oauth"

type OauthService struct {
	providers map[string]oauth.Provider
}

func NewOauthService() *OauthService {
	return &OauthService{
		providers: map[string]oauth.Provider{},
	}
}

func (o *OauthService) RegisterProvider(name string, provider oauth.Provider) {
	o.providers[name] = provider
}

func (o *OauthService) GetProvider(name string) oauth.Provider {
	if p, ok := o.providers[name]; ok {
		return p
	}
	return nil
}
