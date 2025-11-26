package sample.spring.security.migration.mapper;

import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import com.sap.cloud.security.ams.api.Principal;
import com.sap.cloud.security.spring.token.authentication.AuthenticationToken;

public interface XsuaaScopes2AmsPoliciesMapper {
    void map(AuthenticationToken jwtToken, Principal principal);
}
