package com.example.server.config;

import com.example.server.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.ArrayList;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Cho phép React kết nối
                .withSockJS(); // Bật fallback SockJS
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Cấu hình các kênh để gửi tin nhắn về Client
        registry.enableSimpleBroker("/user", "/topic", "/queue");

        // Đường dẫn API mà React sẽ publish lên (ví dụ: /app/chat.sendMessage)
        registry.setApplicationDestinationPrefixes("/app");

        // Hỗ trợ gửi tin nhắn trực tiếp đến 1 user cụ thể (messagingTemplate.convertAndSendToUser)
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    System.out.println("🔵 [WebSocket] Nhận yêu cầu CONNECT");
                    String authHeader = accessor.getFirstNativeHeader("Authorization");

                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        System.out.println("🔵 [WebSocket] Đã thấy Token trong Header");
                        String token = authHeader.substring(7);

                        try {
                            if (jwtTokenProvider.validateToken(token)) {
                                System.out.println("🔵 [WebSocket] Token HỢP LỆ");
                                String userId = jwtTokenProvider.getUserIdFromToken(token);
                                System.out.println("🔵 [WebSocket] Giải mã ra UserId: " + userId);

                                if (userId != null && !userId.isEmpty()) {
                                    UsernamePasswordAuthenticationToken authentication =
                                            new UsernamePasswordAuthenticationToken(userId, null, new ArrayList<>());
                                    accessor.setUser(authentication);
                                    System.out.println("✅ [WebSocket] Đã thiết lập Principal thành công!");
                                }
                            } else {
                                System.out.println("🔴 [WebSocket] Token KHÔNG HỢP LỆ");
                            }
                        } catch (Exception e) {
                            System.out.println("🔴 [WebSocket] LỖI CRASH KHI GIẢI MÃ TOKEN: ");
                            e.printStackTrace();
                        }
                    } else {
                        System.out.println("🔴 [WebSocket] Không tìm thấy chuỗi 'Bearer ' trong Header");
                    }
                }
                return message;
            }
        });
    }
}