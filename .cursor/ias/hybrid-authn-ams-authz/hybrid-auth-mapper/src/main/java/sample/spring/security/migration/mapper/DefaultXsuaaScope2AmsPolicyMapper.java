package sample.spring.security.migration.mapper;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import com.sap.cloud.security.ams.api.Principal;
import com.sap.cloud.security.spring.config.XsuaaServiceConfiguration;
import com.sap.cloud.security.spring.token.authentication.AuthenticationToken;
import com.sap.cloud.security.token.XsuaaToken;

import sample.spring.security.migration.SpringContext;

public class DefaultXsuaaScope2AmsPolicyMapper implements XsuaaScopes2AmsPoliciesMapper {
    private static final Logger LOGGER = LoggerFactory.getLogger(DefaultXsuaaScope2AmsPolicyMapper.class);

    private final String xsappname;

    DefaultXsuaaScope2AmsPolicyMapper() {
        XsuaaServiceConfiguration config = SpringContext.getBean(XsuaaServiceConfiguration.class);
        this.xsappname = config.getProperty("xsappname");
    }

    @Override
    public void map(AuthenticationToken authToken, Principal principal) {
        String amsPolicyPrefix = xsappname + ".AMS_POLICY";
        if (authToken.getPrincipal() instanceof XsuaaToken xsuaaToken) {
            principal.getAttributes().setPolicies(
                    xsuaaToken.getScopes().stream()
                            .filter(scope -> scope.startsWith(amsPolicyPrefix))
                            .map(scope -> scope.substring(amsPolicyPrefix.length() + 1))
                            .peek(scope -> LOGGER.info("Mapping scope {}.{} into policy {}",
                                    amsPolicyPrefix, scope, scope))
                            .toList());
        }
    }
}
