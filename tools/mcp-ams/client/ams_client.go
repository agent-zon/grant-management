package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"path"
	"strings"

	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams"
	"github.com/sap/cloud-identity-authorizations-golang-library/pkg/ams/dcn"

	"mcp-ams/internal/models"
)

type AMSClient struct {
	authzManager *ams.AuthorizationManager
	authz        *ams.Authorizations
	dcnSchema    dcn.Schema
}

func NewAMSClient(path string) *AMSClient {
	client := &AMSClient{}
	failedStartup, cancelFunc := context.WithCancel(context.Background())
	authzManager := ams.NewAuthorizationManagerForFs(path, func(err error) {
		log.Println(err)
		cancelFunc()
	})
	loader := dcn.NewLocalLoader(path, func(err error) {
		log.Println(err)
	})
	dcnLoaded := <-loader.DCNChannel
	client.dcnSchema = dcnLoaded.Schemas[0]

	select {
	case <-failedStartup.Done():
		log.Fatalln("Failed to start AMS client")
	case <-authzManager.WhenReady():
		log.Println("Successfully initialized AMS client")
	}

	client.authzManager = authzManager
	return client
}

func (c *AMSClient) SetPolicies(policies ...string) {
	c.authz = c.authzManager.AuthorizationsForPolicies(policies)
}

func (c *AMSClient) GetDummyDecision(primitive string, resource string, attributes map[string]any) {
	//decision := authz.Inquire("access", "tools.add_comment_to_pending_review", TestSchema{Tools{AddCommentToPendingReviewOwner{Owner: "d064953"}}})
	appInput := c.BuildAppInput(primitive, resource, attributes)
	var dcnResourceName string
	if primitive != "" && resource != "" {
		dcnResourceName = strings.Join([]string{primitive, resource}, ".")
	}
	decision := c.authz.Inquire("access", dcnResourceName, appInput)
	if decision.IsGranted() {
		log.Println("You may use the tool!")
	} else if decision.IsDenied() {
		log.Println("Sorry, you are not allowed to use this tool!")
	} else {
		log.Printf("You can only use this tool if you set the following tool attributes: %s", decision.Condition())
	}
}

func (c *AMSClient) GetResources() {
	resources := c.authz.GetResources()
	log.Printf("You may use the following resources: %s", strings.Join(resources, ", "))
}

func (c *AMSClient) BuildAppInput(primitive string, resource string, attributes map[string]any) map[string]any {
	return map[string]interface{}{
		primitive: map[string]interface{}{
			resource: attributes,
		},
	}
}

func (c *AMSClient) GetAttributesForResource(primitive, resource string) {
	res := models.GetAttributesForResource(c.dcnSchema.Definition, strings.Join([]string{primitive, resource}, "."))

	ra, err := json.MarshalIndent(res, "", "  ")
	if err != nil {
		log.Fatalln(err)
	}
	log.Printf("%s", ra)

}

func main() {
	cwd, _ := os.Getwd()
	log.Printf("cwd: %s", cwd)
	client := NewAMSClient(path.Join("client/testdata"))
	client.SetPolicies("scai.test", "scai.test2")

	//// Granted
	//client.GetDummyDecision("tools", "add_comment_to_pending_review", map[string]any{
	//	"owner": "d064953",
	//})

	////// Denied
	//client.GetDummyDecision("tools", "delete_repo", nil)
	//
	//////// Condition
	//client.GetDummyDecision("tools", "add_comment_to_pending_review", nil)
	//
	////// Get all resources
	//client.GetResources()
	//
	client.GetAttributesForResource("tools", "add_comment_to_pending_review")
}
