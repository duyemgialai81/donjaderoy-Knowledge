package com.example.server.service.impl;

import com.example.server.entity.Session;
import com.example.server.entity.User;
import com.example.server.model.dto.AuthDTO;
import com.example.server.model.dto.RegisterDTO;
import com.example.server.model.response.ResponseObject;
import com.example.server.repository.SessionRepository;
import com.example.server.repository.UserRepository;
import com.example.server.service.AuthService;
import com.example.server.security.JwtTokenProvider; // Import cần thiết
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private com.example.server.repository.DeviceRepository deviceRepository;

    // THÊM: Inject JwtTokenProvider để tạo token JWT
    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Override
    public ResponseObject login(AuthDTO authDTO) {
        Optional<User> maybe = userRepository.findByEmail(authDTO.getEmail());
        if (maybe.isEmpty()) return ResponseObject.error("User not found");

        User user = maybe.get();
        // Support two modes: bcrypt hashed in DB, or legacy plaintext seeded users.
        boolean ok = false;
        String stored = user.getPassword();
        if (stored != null && stored.startsWith("$2")) {
            // bcrypt
            ok = passwordEncoder.matches(authDTO.getPassword(), stored);
        } else {
            // legacy plaintext
            ok = stored.equals(authDTO.getPassword());
            if (ok) {
                // upgrade to hashed password
                user.setPassword(passwordEncoder.encode(authDTO.getPassword()));
                userRepository.save(user);
            }
        }

        if (!ok) return ResponseObject.error("Invalid credentials");

        // [FIX]: TẠO JWT Access Token thay vì UUID ngẫu nhiên
        String token = jwtTokenProvider.generateAccessToken(UUID.fromString(user.getId()));

        // Tạo session (Lưu ý: Nếu dùng JWT, việc lưu session vào DB không bắt buộc,
        // nhưng có thể dùng để quản lý trạng thái/logout thủ công)
        Session session = Session.builder()
                .id(UUID.randomUUID().toString())
                .userId(user.getId())
                .deviceId(authDTO.getDeviceId())
                .token(token) // Lưu JWT vào bảng sessions
                .ipAddress(authDTO.getIpAddress())
                .userAgent(authDTO.getUserAgent())
                .loginAt(LocalDateTime.now())
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build();

        sessionRepository.save(session);
        RegisterDTO registerDTO = new RegisterDTO();
        if (registerDTO.getDeviceId() == null && (registerDTO.getDeviceName() != null || registerDTO.getUserAgent() != null)) {
            var device = com.example.server.entity.Device.builder()
                    .id(UUID.randomUUID().toString())
                    .userId(user.getId())
                    .deviceName(registerDTO.getDeviceName())
                    .browser(registerDTO.getUserAgent())
                    .createdAt(LocalDateTime.now())
                    .lastSeen(LocalDateTime.now())
                    .build();
            var savedDev = deviceRepository.save(device);
            session.setDeviceId(savedDev.getId());
            sessionRepository.save(session);
        } else if (registerDTO.getDeviceId() != null) {
            deviceRepository.findById(registerDTO.getDeviceId()).ifPresent(d -> {
                d.setLastSeen(LocalDateTime.now());
                deviceRepository.save(d);
            });
        }

        // Save device if there is device info
        if (authDTO.getDeviceId() == null && (authDTO.getDeviceName() != null || authDTO.getUserAgent() != null)) {
            var device = com.example.server.entity.Device.builder()
                    .id(UUID.randomUUID().toString())
                    .userId(user.getId())
                    .deviceName(authDTO.getDeviceName())
                    .browser(authDTO.getUserAgent())
                    .createdAt(LocalDateTime.now())
                    .lastSeen(LocalDateTime.now())
                    .build();
            var savedDev = deviceRepository.save(device);
            session.setDeviceId(savedDev.getId());
            sessionRepository.save(session);
        } else if (authDTO.getDeviceId() != null) {
            // update last seen
            deviceRepository.findById(authDTO.getDeviceId()).ifPresent(d -> {
                d.setLastSeen(LocalDateTime.now());
                deviceRepository.save(d);
            });
        }

        // Return token and user info
        return ResponseObject.success(new LoginResult(user.getId(), user.getName(), token, session.getDeviceId()), "Login successful");
    }

    @Override
    public ResponseObject register(RegisterDTO registerDTO) {
        if (userRepository.findByEmail(registerDTO.getEmail()).isPresent()) {
            return ResponseObject.error("Email already exists");
        }

        // Create new user
        User user = User.builder()
                .id(UUID.randomUUID().toString())
                .name(registerDTO.getName())
                .email(registerDTO.getEmail())
                .password(passwordEncoder.encode(registerDTO.getPassword()))
                .role(User.Role.valueOf(registerDTO.getRole()))
                .points(0)
                .followers(0)
                .following(0)
                .postsCount(0)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        userRepository.save(user);

        // Auto-login: [FIX]: TẠO JWT Access Token thay vì UUID ngẫu nhiên
        String token = jwtTokenProvider.generateAccessToken(UUID.fromString(user.getId()));

        Session session = Session.builder()
                .id(UUID.randomUUID().toString())
                .userId(user.getId())
                .deviceId(null)
                .token(token) // Lưu JWT vào bảng sessions
                .ipAddress(null)
                .userAgent(null)
                .loginAt(LocalDateTime.now())
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build();
        sessionRepository.save(session);
        return ResponseObject.success(new LoginResult(user.getId(), user.getName(), token, session.getDeviceId()), "Register & logged in");
    }

    @Override
    public ResponseObject logout(String userId, String token) {
        Optional<Session> maybe = sessionRepository.findByToken(token);
        if (maybe.isEmpty()) return ResponseObject.error("Session not found");
        Session session = maybe.get();
        session.setLogoutAt(LocalDateTime.now());
        session.setIsActive(false);
        sessionRepository.save(session);
        return ResponseObject.success(null, "Logout success");
    }

    // Simple DTO for login response
    public static class LoginResult {
        private String userId;
        private String name;
        private String token;
        private String deviceId;

        public LoginResult(String userId, String name, String token, String deviceId) {
            this.userId = userId;
            this.name = name;
            this.token = token;
            this.deviceId = deviceId;
        }

        public String getUserId() { return userId; }
        public String getName() { return name; }
        public String getToken() { return token; }
        public String getDeviceId() { return deviceId; }
    }
}