/**
 * SPDX-FileCopyrightText: 2018-2022 SAP SE or an SAP affiliate company and Cloud Security Client Java contributors
 *
 * SPDX-License-Identifier: Apache-2.0
 */
package sample.spring.security;

import java.util.HashMap;
import java.util.Map;

import com.sap.cloud.security.comp.XsuaaTokenComp;
import com.sap.cloud.security.config.cf.CFConstants;
import com.sap.cloud.security.json.DefaultJsonObject;
import com.sap.cloud.security.token.AccessToken;
import com.sap.cloud.security.token.Token;
import com.sap.cloud.security.token.TokenClaims;

import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static com.sap.cloud.security.config.Service.XSUAA;

@RestController
public class ProviderController {

    private static final Logger logger = LoggerFactory.getLogger(ProviderController.class);

    /**
     * A (fake) data layer showing global method security features of Spring Security in combination with tokens from
     * XSUAA.
     */
    private DataService dataService;

    @Autowired
    public ProviderController(DataService dataService) {
        this.dataService = dataService;
    }

    @GetMapping("/products")
    public Map<String, Object> getProducts(@AuthenticationPrincipal Token token) {
        Map<String, Object> result = new HashMap<>();
        result.put("name", "Beer for " + token.getClaimAsString("family_name") + "," + token.getClaimAsString("given_name") + " from " +
                new DefaultJsonObject(System.getenv(CFConstants.VCAP_APPLICATION)).getAsStringList("application_uris").get(0));
        result.put("claims", token.getClaims());
        return result;
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
