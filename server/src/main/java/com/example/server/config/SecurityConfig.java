package com.example.server.config;

import com.example.server.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    private static final String[] PUBLIC_URLS = {
            "/api/auth/**",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html"
    };

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Liệt kê các origin được phép (bao gồm local và production)
        configuration.setAllowedOrigins(List.of(
                "https://donjaderoy-knowledge-kq84.vercel.app", // Frontend trên Vercel
                "http://localhost:3000",                        // React (CRA)
                "http://localhost:5173",                        // Vite
                "http://localhost:8080",                        // Cổng local khác nếu cần
                "http://127.0.0.1:5173",
                "http://127.0.0.1:3000"
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));

        configuration.setAllowCredentials(true);  // Cho phép gửi cookie/token
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/uploads/**").permitAll()
                        .requestMatchers(PUBLIC_URLS).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/leaderboard/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/posts/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/posts-like/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/posts-like/*/likes/count").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/posts-like/*/like-status").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/users/me/avatar").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/users/*/avatar").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/files").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/files/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/majors/**").permitAll()
                        .requestMatchers("/api/chat/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/users", "/api/users/**").authenticated()
                        .requestMatchers("/api/sessions/**").authenticated()
                        .requestMatchers("/api/devices/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/subject/**", "/api/subject").authenticated()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
