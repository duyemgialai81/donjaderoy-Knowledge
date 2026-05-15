package com.example.server.config;

import com.example.server.security.JwtAuthenticationFilter; // Cần thiết cho cấu hình Filter thủ công
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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
@RequiredArgsConstructor
public class SecurityConfig {
    // [CẤU HÌNH FILTER THỦ CÔNG] Inject filter JWT của bạn
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private static final String[] PUBLIC_URLS = {
            "/api/auth/**",
            "/v3/api-docs/**",
            "/swagger-ui/**"
    };

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("http://localhost:3000"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                // [FIX]: Tắt quản lý Session vì chúng ta dùng JWT (STATELESS)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                // [FIX]: VÔ HIỆU HÓA HOÀN TOÀN TẤT CẢ CƠ CHẾ XÁC THỰC KHÁC
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/ws/**").permitAll()
                        // Public endpoints
                        .requestMatchers(PUBLIC_URLS).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/posts/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/posts-like/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/posts-like/*/likes/count").permitAll()
                        // Nếu muốn cho phép nặc danh kiểm tra trạng thái like (chỉ trả về false nếu chưa login)
                        .requestMatchers(HttpMethod.GET, "/api/posts-like/*/like-status").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/majors/**").permitAll()
                        .requestMatchers("/api/chat/**").authenticated()

                        // Protected endpoints
                        .requestMatchers(HttpMethod.GET, "/api/users", "/api/users/**").authenticated()
                        .requestMatchers("/api/sessions/**").authenticated()
                        .requestMatchers("/api/devices/**").authenticated()
                        .requestMatchers(HttpMethod.GET,"/api/subject/**", "/api/subject").authenticated() // Yêu cầu xác thực nếu không phải public
                        // Các request còn lại yêu cầu xác thực
                        .anyRequest().authenticated()
                )
                // 3. [CƠ CHẾ XÁC THỰC]: Chèn JWT Filter thủ công vào trước UsernamePasswordAuthenticationFilter
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        // VÌ CƠ CHẾ XÁC THỰC ĐÃ CHUYỂN HOÀN TOÀN SANG FILTER, HÃY ĐẢM BẢO RẰNG BẠN KHÔNG CÒN CẤU HÌNH JWT/OPAQUE TOKEN RESOURCE SERVER (oauth2ResourceServer) Ở ĐÂY NỮA.

        return http.build();
    }
}