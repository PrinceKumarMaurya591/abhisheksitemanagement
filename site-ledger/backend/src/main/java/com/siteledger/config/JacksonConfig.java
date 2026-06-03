package com.siteledger.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.hibernate6.Hibernate6Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class JacksonConfig {

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        // Register Java 8 date/time support
        mapper.registerModule(new JavaTimeModule());
        // Register Hibernate6 module to handle lazy-loading proxies properly
        Hibernate6Module hibernate6Module = new Hibernate6Module();
        // Don't force lazy loading during serialization - serialize only what's already loaded
        hibernate6Module.disable(Hibernate6Module.Feature.FORCE_LAZY_LOADING);
        mapper.registerModule(hibernate6Module);
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }
}
