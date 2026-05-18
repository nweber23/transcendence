package utils

import (
	"net"
	"regexp"
	"strings"
)

// ValidateEmail checks email format and verifies domain has MX records
func ValidateEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return false
	}
	emailParts := strings.Split(email, "@")
	if len(emailParts) != 2 {
		return false
	}
	domainParts := strings.Split(emailParts[1], ".")
	if len(domainParts) < 2 {
		return false
	}
	domainBase := strings.Join(domainParts[len(domainParts)-2:], ".")
	mxRecords, err := net.LookupMX(domainBase)
	if err != nil || len(mxRecords) == 0 {
		return false
	}
	return true
}
