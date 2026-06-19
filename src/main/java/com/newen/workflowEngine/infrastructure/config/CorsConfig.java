package com.newen.workflowEngine.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuraci&oacute;n CORS para el frontend Angular.
 * <p>
 * En desarrollo Angular corre en {@code http://localhost:4200}.
 * Spring Boot rechazar&iacute;a las peticiones del navegador sin esta configuraci&oacute;n
 * porque el origen (4200) no coincide con el backend (8080 por defecto).
 * </p>
 *
 * <h3>&iquest;Por qu&eacute; es necesario?</h3>
 * El navegador aplica la Same-Origin Policy: una p&aacute;gina en {@code localhost:4200}
 * no puede hacer fetch a {@code localhost:8080} a menos que el servidor responda con
 * {@code Access-Control-Allow-Origin: http://localhost:4200}.
 *
 * <h3>En producci&oacute;n</h3>
 * Reemplazar {@code allowedOrigins} con el dominio real del frontend.
 * Si ambos corren en el mismo origen (ej: backend sirve el frontend empaquetado),
 * esta clase puede eliminarse.
 */
@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {

            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins("http://localhost:4200")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }
}
