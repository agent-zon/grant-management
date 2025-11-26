/**
 * SPDX-FileCopyrightText: 2018-2022 SAP SE or an SAP affiliate company and Cloud Security Client Java contributors
 *
 * SPDX-License-Identifier: Apache-2.0
 */
package sample.spring.security.junitjupiter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static sample.spring.security.util.MockBearerTokenRequestPostProcessor.bearerToken;

import java.io.IOException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.sap.cloud.security.test.api.SecurityTestContext;
import com.sap.cloud.security.test.extension.IasExtension;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("multixsuaa") // properties are provided with /resources/application-multixsuaa.yml
@ExtendWith(IasExtension.class)
class TestControllerIasTest {
	@Autowired
	private MockMvc mvc;

	private String jwt;
	private String jwtWithInvalidAudience;
	private String jwtWithoutPolicies;

	@BeforeEach
	void setup(SecurityTestContext securityTest) {
		jwt = securityTest.getPreconfiguredJwtGenerator()
				.withClaimsFromFile("/iasClaims.json")
				.withClaimValues("test_policies", "sales.adminAllSales")
				.createToken().getTokenValue();

		jwtWithoutPolicies = securityTest.getPreconfiguredJwtGenerator()
				.withClaimsFromFile("/iasClaims.json")
				.createToken().getTokenValue();

		jwtWithInvalidAudience = securityTest.getPreconfiguredJwtGenerator()
				.withClaimValue("aud", "invalid")
				.withClaimsFromFile("/iasClaims.json")
				.withClaimValues("test_policies", "sales.adminAllSales")
				.createToken().getTokenValue();
	}

	@Test
	void sayHello_OK() throws Exception {
		String response = mvc.perform(get("/sayHello").with(bearerToken(jwt)))
				.andExpect(status().isOk())
				.andReturn().getResponse().getContentAsString();

		assertTrue(response.contains("sb-clientId!t0815"));
		System.out.println(response);
		assertTrue(response.contains("the-app-tid"));
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
	void hasPolicyWithAuthorityRead_OK() throws Exception {
		String response = mvc
				.perform(get("/method").with(bearerToken(jwt)))
				.andExpect(status().isOk())
				.andReturn().getResponse().getContentAsString();

		assertEquals("You got the sensitive data for zone 'the-app-tid'.",response);
	}

	@Test
	void hasNoPolicy_Forbidden() throws Exception {
		mvc.perform(get("/method").with(bearerToken(jwtWithoutPolicies)))
				.andExpect(status().isForbidden());
	}

}

