package sample.spring.security.migration.mapper;

import java.util.Optional;

import com.sap.cloud.security.spring.config.XsuaaServiceConfiguration;

import sample.spring.security.migration.SpringContext;

public final class ScopeMapperConfiguration {
    public static final String MAPPER_TYPE = "com.sap.security.migration.scopeMapper.type";
    public static final String MAPPER_FILE_PATH = "com.sap.security.migration.scopeMapper.jsonConfigPath";
    private final String configuredMapper;
    private final String mapperFilePath;

    public enum TYPE {NONE, DEFAULT, FILE_BASED}

    public ScopeMapperConfiguration() {
        configuredMapper = SpringContext.getEnvProperty(MAPPER_TYPE);
        mapperFilePath = SpringContext.getEnvProperty(MAPPER_FILE_PATH);
    }

    public TYPE getMapperType() {
        if (configuredMapper == null) {
            return TYPE.NONE;
        }
        try {
            return TYPE.valueOf(configuredMapper);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "Invalid mapper type (" + MAPPER_TYPE + "): " + configuredMapper + " (Allowed: DEFAULT, FILE_BASED)");
        }
    }

    public XsuaaScopes2AmsPoliciesMapper getMapper() {
        return switch (getMapperType()) {
            case NONE -> (token, principal) -> {
            };
            case DEFAULT -> new DefaultXsuaaScope2AmsPolicyMapper();
            case FILE_BASED -> new FileBasedXsuaaScope2AmsPolicyMapper(getRequiredFilePath(), SpringContext.getBean(
                    XsuaaServiceConfiguration.class));
        };
    }

    private String getRequiredFilePath() {
        return Optional.ofNullable(mapperFilePath)
                .orElseThrow(() -> new IllegalStateException(
                        "For mapper type " + getMapperType() + ", a valid file path must be provided as env " + MAPPER_FILE_PATH));
    }
}
