/**
 * SPDX-FileCopyrightText: 2018-2022 SAP SE or an SAP affiliate company and Cloud Security Client Java contributors
 *
 * SPDX-License-Identifier: Apache-2.0
 */
package sample.spring.security;

import java.util.HashMap;
import java.util.Map;

import com.sap.cloud.security.comp.XsuaaTokenComp;
import com.sap.cloud.security.token.AccessToken;
import com.sap.cloud.security.token.Token;
import com.sap.cloud.security.token.TokenClaims;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import static com.sap.cloud.security.config.Service.XSUAA;

import io.pivotal.labs.cfenv.CloudFoundryEnvironment;
import io.pivotal.labs.cfenv.CloudFoundryEnvironmentException;
import io.pivotal.labs.cfenv.CloudFoundryService;

@RestController
public class ConsumerController {

    private static final Logger logger = LoggerFactory.getLogger(ConsumerController.class);

    /**
     * A (fake) data layer showing global method security features of Spring Security in combination with tokens from
     * XSUAA.
     */
    private DataService dataService;

    @Value("${PRODUCTS_SERVICE_NAME}")
    private String productServiceName;

    @Autowired
    public ConsumerController(DataService dataService) {
        this.dataService = dataService;
    }

    @GetMapping("/home")
    public String getIndexPage() {
        return " <!DOCTYPE HTML>\n"+
                "<html>\n"+
                "    <head>IAS only</head>\n"+
                "    <body>\n"+
                "    <ul>\n"+
                "        <li><a href=\"/products\">Products API</a></li>\n"+
                "        <li><a href=\"/token\">User token</a></li>\n"+
                "        <li><a href=\"/tokenClaims\">User token claims</a></li>\n"+
                "    </ul>\n"+
                "    </body>\n"+
                "</html>";
    }

    @GetMapping("/products")
    public String getProducts(@AuthenticationPrincipal Token token) throws CloudFoundryEnvironmentException {

        RestTemplate restTemplate = new RestTemplate(new HttpComponentsClientHttpRequestFactory());

        MultiValueMap<String, String> headers = new LinkedMultiValueMap<>();
        headers.add("Authorization", "Bearer " + token.getTokenValue());

        HttpEntity entity = new HttpEntity<>(null, headers);

        CloudFoundryEnvironment environment = new CloudFoundryEnvironment(System::getenv);
        CloudFoundryService productService = environment.getService(System.getenv("PRODUCTS_SERVICE_NAME"));
        String serviceUrl = productService.getCredentials().get("url").toString();
        ResponseEntity<String> response = restTemplate.exchange(serviceUrl + "/products", HttpMethod.GET, entity, String.class);
        return response.getBody();
    }

    @GetMapping("/token")
    public String getToken(@AuthenticationPrincipal Token token) {
        return token.getTokenValue();
    }

    @GetMapping("/tokenClaims")
    public Map<String, Object> getTokenClaims(@AuthenticationPrincipal Token token) {
        return token.getClaims();
    }

    /**
     * An endpoint showing how to use Spring method security. Only if the request principal has the given scope will the
     * method be called. Otherwise a 403 error will be returned.
     */
    @GetMapping("/method")
    @PreAuthorize("hasAuthority('Read')")
    public String callMethodRemotely() {
        return dataService.readSensitiveData();
    }

}
