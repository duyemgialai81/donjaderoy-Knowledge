package com.example.server.security;

import com.example.server.entity.User;
import com.example.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

/**
 * Custom implementation of UserDetailsService.
 * This bean is required by Spring Security to load user details from the persistence layer.
 * It fulfills the dependency requirement of JwtAuthenticationFilter (mentioned in the error log).
 * * Note: It assumes the identifier passed (username) is the User ID, which is typical
 * when authenticating with a JWT subject.
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    // UserRepository được suy ra từ các file dịch vụ và JwtTokenIntrospector
    private final UserRepository userRepository;

    /**
     * Tải thông tin người dùng dựa trên định danh (ID/Username).
     * @param identifier ID người dùng (Subject từ JWT).
     * @return UserDetails object.
     * @throws UsernameNotFoundException nếu người dùng không tồn tại.
     */
    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        // Tìm người dùng bằng ID
        User user = userRepository.findById(identifier)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with identifier: " + identifier));

        // Chuyển đổi User entity sang Spring Security UserDetails
        List<SimpleGrantedAuthority> authorities = Collections.singletonList(
                // Giả định User.getRole() trả về giá trị có thể chuyển thành tên ROLE
                new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
        );

        return new org.springframework.security.core.userdetails.User(
                user.getId(), // Sử dụng ID làm Principal Name
                user.getPassword(), // Password đã hash
                authorities
        );
    }
}