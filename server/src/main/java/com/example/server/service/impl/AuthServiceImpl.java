package com.example.server.service.impl;

import com.example.server.config.AppProperties;
import com.example.server.entity.*;
import com.example.server.model.dto.*;
import com.example.server.model.response.ResponseObject;
import com.example.server.repository.*;
import com.example.server.security.JwtTokenProvider;
import com.example.server.service.AuthService;
import com.example.server.service.EmailService;
import com.example.server.service.GoogleTokenVerifierService;
import com.example.server.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final DeviceRepository deviceRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final BanRepository banRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final EmailService emailService;
    private final GoogleTokenVerifierService googleTokenVerifierService;
    private final PermissionService permissionService;
    private final AppProperties appProperties;

    @Override
    @Transactional
    public ResponseObject login(AuthDTO authDTO) {
        if (authDTO == null || authDTO.getEmail() == null || authDTO.getPassword() == null) {
            return ResponseObject.error("Missing email or password");
        }

        User user = userRepository.findByEmail(normalizeEmail(authDTO.getEmail())).orElse(null);
        if (user == null) {
            return ResponseObject.error("Account not found");
        }

        String authBlockReason = getAuthenticationBlockReason(user);
        if (authBlockReason != null) {
            return ResponseObject.error(authBlockReason);
        }
        if (user.getPassword() == null || user.getPassword().isBlank()) {
            return ResponseObject.error("This account uses Google login");
        }
        if (!matchesPassword(user, authDTO.getPassword())) {
            return ResponseObject.error("Invalid credentials");
        }

        if (user.getEmailVerified() == null) {
            user.setEmailVerified(true);
        }
        if (user.getAuthProvider() == null) {
            user.setAuthProvider(User.AuthProvider.local);
        }
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        return ResponseObject.success(buildAuthResult(user, extractDeviceContext(authDTO)), "Login successful");
    }

    @Override
    @Transactional
    public ResponseObject register(RegisterDTO registerDTO) {
        if (registerDTO == null || registerDTO.getEmail() == null) {
            return ResponseObject.error("Missing register data");
        }
        if (registerDTO.getOtp() == null || registerDTO.getOtp().isBlank()) {
            return requestRegisterOtp(registerDTO);
        }

        String email = normalizeEmail(registerDTO.getEmail());
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseObject.error("Email already exists");
        }

        EmailVerificationToken token = emailVerificationTokenRepository
                .findTopByEmailAndUsedFalseOrderByCreatedAtDesc(email)
                .orElse(null);
        if (token == null) {
            return ResponseObject.error("Register OTP not found");
        }
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseObject.error("Register OTP expired");
        }
        if (!Objects.equals(token.getToken(), registerDTO.getOtp())) {
            return ResponseObject.error("Register OTP is invalid");
        }

        User.Role role;
        try {
            role = normalizePublicRole(token.getPendingRole());
        } catch (IllegalArgumentException ex) {
            return ResponseObject.error(ex.getMessage());
        }

        User user = User.builder()
                .id(UUID.randomUUID().toString())
                .name(token.getPendingName())
                .email(email)
                .password(token.getPasswordHash())
                .role(role)
                .majorId(token.getMajorId())
                .className(token.getClassName())
                .points(0)
                .followers(0)
                .following(0)
                .postsCount(0)
                .isActive(true)
                .authProvider(User.AuthProvider.local)
                .emailVerified(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        userRepository.save(user);

        token.setUserId(user.getId());
        token.setUsed(true);
        token.setVerifiedAt(LocalDateTime.now());
        emailVerificationTokenRepository.save(token);

        return ResponseObject.success(buildAuthResult(user, extractDeviceContext(token)), "Register successful");
    }

    @Override
    @Transactional
    public ResponseObject requestRegisterOtp(RegisterDTO registerDTO) {
        if (registerDTO == null) {
            return ResponseObject.error("Missing register data");
        }
        String email = normalizeEmail(registerDTO.getEmail());
        if (email == null || registerDTO.getPassword() == null || registerDTO.getName() == null) {
            return ResponseObject.error("Missing register fields");
        }
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseObject.error("Email already exists");
        }

        User.Role requestedRole;
        try {
            requestedRole = normalizePublicRole(registerDTO.getRole());
        } catch (IllegalArgumentException ex) {
            return ResponseObject.error(ex.getMessage());
        }

        String otp = generateOtp();
        expireEmailTokens(email);

        EmailVerificationToken token = EmailVerificationToken.builder()
                .id(UUID.randomUUID().toString())
                .email(email)
                .token(otp)
                .passwordHash(passwordEncoder.encode(registerDTO.getPassword()))
                .pendingName(registerDTO.getName())
                .pendingRole(requestedRole.name())
                .majorId(registerDTO.getMajorId())
                .className(registerDTO.getClassName())
                .deviceId(registerDTO.getDeviceId())
                .deviceName(registerDTO.getDeviceName())
                .userAgent(registerDTO.getUserAgent())
                .ipAddress(registerDTO.getIpAddress())
                .expiresAt(LocalDateTime.now().plusMinutes(appProperties.getOtp().getRegisterExpirationMinutes()))
                .used(false)
                .createdAt(LocalDateTime.now())
                .build();
        emailVerificationTokenRepository.save(token);

        emailService.sendOtpEmail(
                email,
                "OTP for registration",
                "Your registration OTP",
                otp,
                appProperties.getOtp().getRegisterExpirationMinutes() + " minutes"
        );
        return ResponseObject.success(Map.of("email", email), "Register OTP sent");
    }

    @Override
    @Transactional
    public ResponseObject loginWithGoogle(GoogleLoginDTO googleLoginDTO) {
        if (googleLoginDTO == null || googleLoginDTO.getIdToken() == null || googleLoginDTO.getIdToken().isBlank()) {
            return ResponseObject.error("Missing Google ID token");
        }

        User.Role requestedRole;
        try {
            requestedRole = normalizePublicRole(googleLoginDTO.getRole());
        } catch (IllegalArgumentException ex) {
            return ResponseObject.error(ex.getMessage());
        }

        GoogleTokenVerifierService.GoogleUserProfile profile;
        try {
            profile = googleTokenVerifierService.verify(googleLoginDTO.getIdToken());
        } catch (Exception ex) {
            return ResponseObject.error("Invalid Google token: " + ex.getMessage());
        }

        User user = userRepository.findByGoogleId(profile.subject())
                .or(() -> userRepository.findByEmail(normalizeEmail(profile.email())))
                .orElseGet(() -> User.builder()
                        .id(UUID.randomUUID().toString())
                        .email(normalizeEmail(profile.email()))
                        .name(profile.name() != null ? profile.name() : profile.email())
                        .avatar(profile.picture())
                        .role(requestedRole)
                        .points(0)
                        .followers(0)
                        .following(0)
                        .postsCount(0)
                        .isActive(true)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build());

        if (user.getRole() == null) {
            user.setRole(requestedRole);
        }
        user.setGoogleId(profile.subject());
        user.setAuthProvider(User.AuthProvider.google);
        user.setEmailVerified(true);
        user.setIsActive(true);
        user.setUpdatedAt(LocalDateTime.now());
        user.setLastLoginAt(LocalDateTime.now());
        if (user.getAvatar() == null) {
            user.setAvatar(profile.picture());
        }
        userRepository.save(user);

        String authBlockReason = getAuthenticationBlockReason(user);
        if (authBlockReason != null) {
            return ResponseObject.error(authBlockReason);
        }
        return ResponseObject.success(buildAuthResult(user, extractDeviceContext(googleLoginDTO)), "Google login successful");
    }

    @Override
    @Transactional
    public ResponseObject requestPasswordReset(ForgotPasswordRequestDTO requestDTO) {
        if (requestDTO == null || requestDTO.getEmail() == null) {
            return ResponseObject.error("Missing email");
        }
        String email = normalizeEmail(requestDTO.getEmail());
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseObject.success(Map.of("email", email), "If the email exists, reset OTP has been sent");
        }
        if (user.getPassword() == null || user.getPassword().isBlank()) {
            return ResponseObject.error("This account uses Google login only");
        }

        String otp = generateOtp();
        expireResetTokens(email);

        PasswordResetToken token = PasswordResetToken.builder()
                .id(UUID.randomUUID().toString())
                .userId(user.getId())
                .email(email)
                .token(otp)
                .expiresAt(LocalDateTime.now().plusMinutes(appProperties.getOtp().getResetExpirationMinutes()))
                .used(false)
                .createdAt(LocalDateTime.now())
                .build();
        passwordResetTokenRepository.save(token);

        emailService.sendOtpEmail(
                email,
                "OTP for password reset",
                "Your password reset OTP",
                otp,
                appProperties.getOtp().getResetExpirationMinutes() + " minutes"
        );
        return ResponseObject.success(Map.of("email", email), "Reset OTP sent");
    }

    @Override
    @Transactional
    public ResponseObject resetPassword(ResetPasswordDTO resetPasswordDTO) {
        if (resetPasswordDTO == null || resetPasswordDTO.getEmail() == null
                || resetPasswordDTO.getOtp() == null || resetPasswordDTO.getNewPassword() == null) {
            return ResponseObject.error("Missing reset password data");
        }

        String email = normalizeEmail(resetPasswordDTO.getEmail());
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseObject.error("Account not found");
        }

        PasswordResetToken token = passwordResetTokenRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc(email)
                .orElse(null);
        if (token == null) {
            return ResponseObject.error("Reset OTP not found");
        }
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseObject.error("Reset OTP expired");
        }
        if (!Objects.equals(token.getToken(), resetPasswordDTO.getOtp())) {
            return ResponseObject.error("Reset OTP is invalid");
        }

        user.setPassword(passwordEncoder.encode(resetPasswordDTO.getNewPassword()));
        if (user.getAuthProvider() == null) {
            user.setAuthProvider(User.AuthProvider.local);
        }
        user.setEmailVerified(true);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        token.setUsed(true);
        token.setVerifiedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(token);

        LocalDateTime now = LocalDateTime.now();
        sessionRepository.findByUserId(user.getId()).forEach(session -> {
            session.setIsActive(false);
            session.setLogoutAt(now);
        });
        return ResponseObject.success(null, "Password reset successful");
    }

    @Override
    @Transactional
    public ResponseObject logout(String userId, String token) {
        Session session = sessionRepository.findByToken(token).orElse(null);
        if (session == null) {
            return ResponseObject.error("Session not found");
        }
        if (!Objects.equals(session.getUserId(), userId)) {
            return ResponseObject.error("Cannot revoke another user's session");
        }
        session.setLogoutAt(LocalDateTime.now());
        session.setIsActive(false);
        sessionRepository.save(session);
        return ResponseObject.success(null, "Logout successful");
    }

    private boolean matchesPassword(User user, String rawPassword) {
        String stored = user.getPassword();
        if (stored != null && stored.startsWith("$2")) {
            return passwordEncoder.matches(rawPassword, stored);
        }
        boolean matches = Objects.equals(stored, rawPassword);
        if (matches) {
            user.setPassword(passwordEncoder.encode(rawPassword));
            userRepository.save(user);
        }
        return matches;
    }

    private String getAuthenticationBlockReason(User user) {
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            return "Account is inactive";
        }
        if (banRepository.hasActiveBan(user.getId(), LocalDateTime.now())) {
            return "Account is banned";
        }
        return null;
    }

    private AuthResult buildAuthResult(User user, DeviceContext deviceContext) {
        String token = jwtTokenProvider.generateAccessToken(UUID.fromString(user.getId()));
        String deviceId = resolveDevice(user, deviceContext);
        Session session = Session.builder()
                .id(UUID.randomUUID().toString())
                .userId(user.getId())
                .deviceId(deviceId)
                .token(token)
                .ipAddress(deviceContext.ipAddress())
                .userAgent(deviceContext.userAgent())
                .loginAt(LocalDateTime.now())
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build();
        sessionRepository.save(session);

        return new AuthResult(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.getAuthProvider() != null ? user.getAuthProvider().name() : null,
                Boolean.TRUE.equals(user.getEmailVerified()),
                token,
                deviceId,
                new ArrayList<>(permissionService.getEffectivePermissions(user))
        );
    }

    private String resolveDevice(User user, DeviceContext context) {
        if (context.deviceId() != null && !context.deviceId().isBlank()) {
            deviceRepository.findById(context.deviceId()).ifPresent(device -> {
                device.setLastSeen(LocalDateTime.now());
                deviceRepository.save(device);
            });
            return context.deviceId();
        }

        if ((context.deviceName() == null || context.deviceName().isBlank())
                && (context.userAgent() == null || context.userAgent().isBlank())) {
            return null;
        }

        Device device = Device.builder()
                .id(UUID.randomUUID().toString())
                .userId(user.getId())
                .deviceName(context.deviceName())
                .browser(context.userAgent())
                .createdAt(LocalDateTime.now())
                .lastSeen(LocalDateTime.now())
                .build();
        return deviceRepository.save(device).getId();
    }

    private void expireEmailTokens(String email) {
        List<EmailVerificationToken> tokens = emailVerificationTokenRepository.findByEmailAndUsedFalse(email);
        tokens.forEach(token -> token.setUsed(true));
        emailVerificationTokenRepository.saveAll(tokens);
    }

    private void expireResetTokens(String email) {
        List<PasswordResetToken> tokens = passwordResetTokenRepository.findByEmailAndUsedFalse(email);
        tokens.forEach(token -> token.setUsed(true));
        passwordResetTokenRepository.saveAll(tokens);
    }

    private String generateOtp() {
        return String.format("%06d", new Random().nextInt(1_000_000));
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private User.Role normalizePublicRole(String role) {
        if (role == null || role.isBlank()) {
            return User.Role.student;
        }
        User.Role normalized = User.Role.valueOf(role.trim().toLowerCase());
        if (normalized == User.Role.admin) {
            throw new IllegalArgumentException("Self-register admin is not allowed");
        }
        return normalized;
    }

    private DeviceContext extractDeviceContext(AuthDTO dto) {
        return new DeviceContext(dto.getDeviceId(), dto.getDeviceName(), dto.getUserAgent(), dto.getIpAddress());
    }

    private DeviceContext extractDeviceContext(GoogleLoginDTO dto) {
        return new DeviceContext(dto.getDeviceId(), dto.getDeviceName(), dto.getUserAgent(), dto.getIpAddress());
    }

    private DeviceContext extractDeviceContext(EmailVerificationToken token) {
        return new DeviceContext(token.getDeviceId(), token.getDeviceName(), token.getUserAgent(), token.getIpAddress());
    }

    private record DeviceContext(String deviceId, String deviceName, String userAgent, String ipAddress) {
    }

    public record AuthResult(String userId,
                             String name,
                             String email,
                             String role,
                             String authProvider,
                             boolean emailVerified,
                             String token,
                             String deviceId,
                             List<String> permissions) {
    }
}
