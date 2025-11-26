package sample.spring.security.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import com.sap.cloud.security.ams.api.AttributesProcessor;
import com.sap.cloud.security.ams.api.Principal;
import com.sap.cloud.security.spring.token.authentication.AuthenticationToken;

import sample.spring.security.migration.mapper.ScopeMapperConfiguration;
import sample.spring.security.migration.mapper.XsuaaScopes2AmsPoliciesMapper;

public class XsuaaScopes2AttributesProcessor implements AttributesProcessor {
    private static final Logger LOGGER = LoggerFactory.getLogger(XsuaaScopes2AttributesProcessor.class);

    static {
        System.setProperty("sap.security.authorization.dcl.authority-resource", "$SCOPES");
    }

    @Override
    public void processAttributes(Principal principal) {
        LOGGER.info("start processor");
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof AuthenticationToken authToken) {

            // Theoretically the configuration should only be loaded once in the constructor.
            // But in multi tests environment, the instance of this Processor is shared between tests.
            // If the environments are having different test context, the result may fail depends on the order of the test execution.
            new ScopeMapperConfiguration().getMapper().map(authToken, principal);
        }
    }
}