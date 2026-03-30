package assignment

import (
	"time"

	"github.com/google/uuid"
	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"
)

type AssignedPoliciesResponse struct {
	Policies []AssignedPolicy `json:"policies"`
}

type AssignedPolicy struct {
	ID           uuid.UUID  `json:"id"`
	Name         string     `json:"name"`
	Policy       dcn.Policy `json:"policy"`
	LastModified time.Time  `json:"lastModified"`
	ModifiedBy   string     `json:"modifiedBy"`
}
