#!/bin/bash
#set -x
echo "assuming cf cli 8..."

if [ "$1" ]; then
        cp $1 sk.tmp.sk
        cat $1 | jq --raw-output '.credentials.key' > key.pem
        export CLIENTID=`cat $1 | jq --raw-output '.credentials.clientid'`
        export URL=`cat $1 | jq --raw-output .credentials.url`

    if cat $1 | jq -e --raw-output '.credentials.key' > key.pem; then
        export CERT=`cat $1 | jq .credentials.certificate`
        echo "token:"
        echo curl  --cert certificate.pem --key key.pem  -XPOST $URL/oauth2/token -d "'grant_type=client_credentials&client_id="$CLIENTID"'"
        echo
    else
        echo "No key found"
    fi
    if cat $1 | jq -e --raw-output '.credentials.certificate' > certificate.pem; then
        export KEY=`cat $1 | jq .credentials.key`
    else
        echo "No certificate found"
    fi

        export OSB_URL=`cat $1 | jq --raw-output .credentials.osb_url`
    if cat $1 | jq -e --raw-output .credentials.prooftoken_url > /dev/null; then
            export PROOFTOKEN_URL=`cat $1 | jq --raw-output .credentials.prooftoken_url`
        echo "prooftoken_url"
        echo curl --cert certificate.pem --key key.pem   $PROOFTOKEN_URL
        echo
    else
        echo
    fi


    if cat $1 | jq -e --raw-output .credentials.osb_url > /dev/null; then
        export OSB_URL=`cat $1 | jq --raw-output .credentials.osb_url`
            echo "catalog"
        echo curl --cert certificate.pem --key key.pem  $OSB_URL/v2/catalog
        echo
        if [ "$KEY" ]; then
            echo "service manager registration command (adopt name)"
            echo smctl curl -X POST /v1/service_brokers -d \'\{ \
                        \"name\": \"reuse-service-name-to-adopt-$USER\",\
                        \"broker_url\": \"$OSB_URL\",\
                        \"credentials\":\{ \
                            \"tls\":\{ \
                            \"client_certificate\": $CERT,\
                            \"client_key\": $KEY \
                         \}\}\}\'
        fi
    else
        echo
    fi
else
        echo "call $0 <path to service-key json>"
fi
