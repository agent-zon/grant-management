export cds_requires_auth_credentials=$(npx cds env requires.auth.credentials --resolve-bindings --profile hybrid)


export cds_requires_destinations_credentials=$(npx cds env requires.destinations.credentials --resolve-bindings --profile hybrid)

echo "cds_requires_auth_credentials: $cds_requires_auth_credentials"
echo "cds_requires_destinations_credentials: $cds_requires_destinations_credentials"



 npx cds bind --profile hybrid --exec --  docker run --it -e cds_requires_auth_credentials=$cds_requires_auth_credentials -e cds_requires_destinations_credentials=$cds_requires_destinations_credentials -p 9000:5000  scai-dev.common.repositories.cloud.sap/grant-management/approuter:v13



 docker run -v $PWD/app/router/default-env.json:default-env.json -v $PWD/.cdsrc-private.json:$PWD/.cdsrc-private.json -v $PWD/.cdsrc.yaml:$PWD/.cdsrc.yaml -it --rm -e cds_requires_auth_credentials=$cds_requires_auth_credentials -e cds_requires_destinations_credentials=$cds_requires_destinations_credentials -p 9000:5000  scai-dev.common.repositories.cloud.sap/grant-management/approuter:v13 node node_modules/@sap/approuter/approuter.js  

docker: Error response from daemon: invalid volume specification: '/host_mnt/Users/I347305/aspire-proxy/agent-grants/.cdsrc-private.json:.cdsrc-private.json': invalid mount config for type "bind": invalid mount path: '.cdsrc-private.json' mount path must be absolute

 docker run -it --rm -p 9000:5000  scai-dev.common.repositories.cloud.sap/grant-management/approuter:v13  node 
