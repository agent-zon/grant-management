package sample.spring.security.migration.mapper;

import java.io.File;
import java.io.IOException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sap.cloud.security.ams.api.Principal;
import com.sap.cloud.security.spring.config.XsuaaServiceConfiguration;
import com.sap.cloud.security.spring.token.authentication.AuthenticationToken;
import com.sap.cloud.security.token.XsuaaToken;

import lombok.Data;
import sample.spring.security.migration.SpringContext;

public class FileBasedXsuaaScope2AmsPolicyMapper implements XsuaaScopes2AmsPoliciesMapper {
    private static final Logger LOGGER = LoggerFactory.getLogger(FileBasedXsuaaScope2AmsPolicyMapper.class);
    private final String xsappname;

    private final Map<String, String> config = new HashMap<>();

    @Data
    private static class MapConfig {
        String scope;
        String policy;
    }

    public FileBasedXsuaaScope2AmsPolicyMapper(String filePath, XsuaaServiceConfiguration xsuaaServiceConfiguration) {
        try {
            MapConfig[] mapConfigs = new ObjectMapper().readValue(
                    new File(getClass().getClassLoader().getResource(filePath).getFile()), MapConfig[].class);
            System.out.println("config12 " + mapConfigs.length + "\t" + mapConfigs[0]);
            Arrays.stream(mapConfigs).forEach(entry -> {
                config.put(entry.scope, entry.policy);
            });
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        this.xsappname = xsuaaServiceConfiguration.getProperty("xsappname");
    }

    @Override
    public void map(AuthenticationToken authToken, Principal principal) {
        if (authToken.getPrincipal() instanceof XsuaaToken xsuaaToken) {
            principal.getAttributes().setPolicies(
                    xsuaaToken.getScopes().stream()
                            .filter(scope -> scope.startsWith(xsappname))
                            .map(scope -> scope.substring(xsappname.length() + 1))
                            .filter(config.keySet()::contains)
                            .peek(scope -> LOGGER.info("Mapping scope {} ...", scope))
                            .map(config::get)
                            .peek(policy -> LOGGER.info(" into policy {}", policy))
                            .toList());
        }
    }
}
