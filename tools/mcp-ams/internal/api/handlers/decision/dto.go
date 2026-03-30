package decision

type UsageAuthorizedRequest struct {
	Primitive string `json:"primitive"`
	Name      string `json:"name"`
	//Input     expression.Input `json:"input"`
	Input map[string]any `json:"input"`
}

type UsageAuthorizedResponse struct {
	Granted   bool   `json:"granted"`
	Denied    bool   `json:"denied"`
	Condition string `json:"condition,omitempty"`
}
