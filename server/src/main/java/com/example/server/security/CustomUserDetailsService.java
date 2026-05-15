package com.example.server.security;

import com.example.server.entity.User;
import com.example.server.repository.UserRepository;
import com.example.server.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        User user = userRepository.findById(identifier)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with identifier: " + identifier));

        Set<String> permissions = permissionService.getEffectivePermissions(user);
        List<SimpleGrantedAuthority> authorities = permissions.stream()
                .map(permission -> new SimpleGrantedAuthority("PERM_" + permission))
                .collect(Collectors.toList());
        authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));

        return new AppUserPrincipal(user, permissions, authorities);
    }
}
