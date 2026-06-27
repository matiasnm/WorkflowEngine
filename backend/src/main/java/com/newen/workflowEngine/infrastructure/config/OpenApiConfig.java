package com.newen.workflowEngine.infrastructure.config;

import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;

/**
 * OpenAPI configuration that defines the API-key security scheme.
 * <p>
 * This adds an "Authorize" button to the Swagger UI where users can enter
 * their API key. The key is then included in the {@code X-API-Key} header
 * on every test request.
 */
@Configuration
@OpenAPIDefinition(info = @Info(title = "Workflow Engine API", version = "1.0"))
@SecurityScheme(
        name = "ApiKey",
        type = SecuritySchemeType.APIKEY,
        in = SecuritySchemeIn.HEADER,
        paramName = "X-API-Key"
)
public class OpenApiConfig {

}
