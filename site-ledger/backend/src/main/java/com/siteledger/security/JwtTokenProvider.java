package com.siteledger.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    /**
     * Secure fallback key (512-bit) used when the configured app.jwt.secret is
     * empty, null, or too short. This prevents WeakKeyException crashes on startup.
     * CHANGE THIS in production via the app.jwt.secret property or APP_JWT_SECRET env var.
     */
    private static final String FALLBACK_SECRET =
        "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970337336763979244226452948404D635166546A576E5A7234753778214125442A47";

    private final SecretKey jwtSecret;
    private final long jwtExpirationMs;

    public JwtTokenProvider(
            @Value("${app.jwt.secret:}") String jwtSecret,
            @Value("${app.jwt.expiration-ms}") long jwtExpirationMs) {
        this.jwtExpirationMs = jwtExpirationMs;
        this.jwtSecret = resolveSecret(jwtSecret);
    }

    /**
     * Safely resolves the JWT signing key. Uses the configured secret if valid,
     * otherwise falls back to the hardcoded FALLBACK_SECRET.
     */
    private SecretKey resolveSecret(String configuredSecret) {
        String effectiveSecret = configuredSecret;

        // If the configured secret is empty, null, or whitespace-only, use fallback
        if (effectiveSecret == null || effectiveSecret.isBlank()) {
            log.warn("APP_JWT_SECRET / app.jwt.secret is EMPTY! Using built-in fallback key. " +
                     "Set a strong secret via the APP_JWT_SECRET environment variable for production security.");
            effectiveSecret = FALLBACK_SECRET;
        }

        try {
            byte[] keyBytes = Decoders.BASE64.decode(effectiveSecret);
            if (keyBytes.length < 32) {
                log.warn("APP_JWT_SECRET / app.jwt.secret decodes to {} bits (< 256 bit minimum). " +
                         "Falling back to built-in secure key.", keyBytes.length * 8);
                effectiveSecret = FALLBACK_SECRET;
                keyBytes = Decoders.BASE64.decode(effectiveSecret);
            }
            log.info("JWT signing key initialized ({} bits)", keyBytes.length * 8);
            return Keys.hmacShaKeyFor(keyBytes);
        } catch (Exception e) {
            log.error("Failed to decode JWT secret ({}). Falling back to built-in key.", e.getMessage());
            return Keys.hmacShaKeyFor(Decoders.BASE64.decode(FALLBACK_SECRET));
        }
    }

    public String generateToken(String username, String role) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .subject(username)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(jwtSecret)
                .compact();
    }

    public String getUsernameFromToken(String token) {
        return Jwts.parser()
                .verifyWith(jwtSecret)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public String getRoleFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(jwtSecret)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.get("role", String.class);
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(jwtSecret).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
