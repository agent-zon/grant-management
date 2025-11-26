/**
 * SPDX-FileCopyrightText: 2018-2022 SAP SE or an SAP affiliate company and Cloud Security Client Java contributors
 *
 * SPDX-License-Identifier: Apache-2.0
 */
package sample.spring.security.junitjupiter;

import static com.sap.cloud.security.config.Service.IAS;
import static com.sap.cloud.security.config.Service.XSUAA;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.sap.cloud.security.test.extension.SecurityTestExtension;
import com.sap.cloud.security.token.Token;
import com.sap.cloud.security.xsuaa.tokenflows.TokenFlowException;
import com.sap.cloud.security.xsuaa.tokenflows.XsuaaTokenFlows;

@SpringBootTest
@java.lang.SuppressWarnings("squid:S2699")
@ActiveProfiles("multixsuaa") // properties are provided with /resources/application-multixsuaa.yml
class ApplicationTest {
    @Autowired
    XsuaaTokenFlows tokenflows;

    static SecurityTestExtension extension = SecurityTestExtension.forService(IAS).useApplicationServer();

    static SecurityTestExtension extension2 = SecurityTestExtension.forService(XSUAA).useApplicationServer();
    @Test
    void whenSpringContextIsBootstrapped_thenNoExceptions() throws TokenFlowException {
        assertNotNull(tokenflows.clientCredentialsTokenFlow());
    }

    @Test
    void requestWithIasToken_withPermission_ok() {
        String policyName = "ams.readAllSalesOrders";
        String jwt = extension.getContext().getPreconfiguredJwtGenerator().withClaimValues("test_policies", policyName)
                .createToken().getTokenValue();
        Token token = Token.create(jwt);
        assertEquals(policyName, token.getClaimAsStringList("test_policies").get(0));
        assertNull(token.getClaimAsString("scope"));
    }

    @Test
    void requestWithXsuaaToken_withPermission_ok() {
        String jwt= extension2.getContext().getPreconfiguredJwtGenerator().withLocalScopes("xx").createToken().getTokenValue();
        Token token = Token.create(jwt);
        String scope = token.getClaimAsStringList("scope").get(0);
        assertEquals("xx", scope.substring(scope.indexOf(".") + 1));

        assertNull(token.getClaimAsString("test_policies"));
    }
}
