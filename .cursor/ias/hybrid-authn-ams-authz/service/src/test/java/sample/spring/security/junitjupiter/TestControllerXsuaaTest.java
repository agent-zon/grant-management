/**
 * SPDX-FileCopyrightText: 2018-2022 SAP SE or an SAP affiliate company and Cloud Security Client Java contributors
 * <br/>
 * SPDX-License-Identifier: Apache-2.0
 */
package sample.spring.security.junitjupiter;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static sample.spring.security.util.MockBearerTokenRequestPostProcessor.bearerToken;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.sap.cloud.security.test.api.SecurityTestContext;
import com.sap.cloud.security.test.extension.XsuaaExtension;

@SpringBootTest
@AutoConfigureMockMvc
@ExtendWith(XsuaaExtension.class)
@ActiveProfiles("multixsuaa") // properties are provided with /resources/application-multixsuaa.yml
class TestControllerXsuaaTest {
    @Autowired
    private MockMvc mvc;

    private String jwt;
    private String jwtWithInvalidAudience;

    @BeforeEach
    void setup(SecurityTestContext securityTest) {
        jwt = securityTest.getPreconfiguredJwtGenerator()
                .withLocalScopes("AMS_POLICY.sales.adminAllSales")
                .createToken().getTokenValue();
        jwtWithInvalidAudience = securityTest.getPreconfiguredJwtGenerator()
                .withClaimValue("aud", "invalid")
                .withClaimValue("azp", "invalid")
                .withLocalScopes("AMS_POLICY.sales.adminAllSales")
                .createToken().getTokenValue();
    }

    @Test
    void sayHello_OK() throws Exception {
        String response = mvc.perform(get("/sayHello").with(bearerToken(jwt)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertTrue(response.contains("sb-clientId!t0815"));
        System.out.println(response);
        assertTrue(response.contains("the-zone-id"));
    }

    @Test
    void sayHello_Unauthorized() throws Exception {
        mvc.perform(get("/sayHello").with(bearerToken(jwtWithInvalidAudience)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void sayHelloCompatibility_NotFound() throws Exception {
        mvc.perform(get("/comp/sayHello").with(bearerToken(jwt)))
                .andExpect(status().isNotFound());
    }

    @Test
    void hasScopeRead_OK() throws Exception {
        String response = mvc
                .perform(get("/method").with(bearerToken(jwt)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertTrue(response.contains("You got the sensitive data for zone 'the-zone-id'."));
    }

    @Test
    void hasNoScopeRead_FORBIDDEN(SecurityTestContext securityTest) throws Exception {
        String jwtNoScopes = securityTest.getPreconfiguredJwtGenerator()
                .withClaimValue("scope", "anything")
                .createToken().getTokenValue();

        mvc.perform(get("/method").with(bearerToken(jwtNoScopes)))
                .andExpect(status().isForbidden());
    }
}

