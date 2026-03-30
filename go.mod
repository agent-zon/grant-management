module mcp-ams

go 1.24.3

require (
	github.com/google/uuid v1.6.0
	github.com/gorilla/handlers v1.5.2
	github.com/gorilla/mux v1.8.1
	github.com/sap/cloud-identity-authorizations-golang-library v0.0.0-20250828104625-024081ab4ac7
)

require github.com/felixge/httpsnoop v1.0.3 // indirect

//
//replace (
//	github.com/sap/cloud-identity-authorizations-golang-library => target latest
//)
