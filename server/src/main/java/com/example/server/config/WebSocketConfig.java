package com.example.server.config;

import com.example.server.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
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
        registry.addEndpoint("/ws-native")
                .setAllowedOriginPatterns("*");

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // ✅ Dev: cho phép mọi origin. Prod: thay bằng "https://yourdomain.com"
                .withSockJS() // ✅ Bắt buộc để hỗ trợ fallback
                .setHeartbeatTime(25000); // ✅ Server sẽ ping client mỗi 25s nếu không có traffic
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // ✅ Cấu hình SimpleBroker với scheduler riêng để heartbeat ổn định
        registry.enableSimpleBroker("/user", "/topic", "/queue")
                .setHeartbeatValue(new long[]{10000, 10000}) // [client-ping-server, server-ping-client] (ms)
                .setTaskScheduler(heartbeatScheduler()); // ✅ Quan trọng: tránh heartbeat bị block

        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                // ✅ Fix 1: Kiểm tra null an toàn
                if (accessor == null) {
                    return message;
                }

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
                                    accessor.setUser(authentication); // ✅ Gán user vào session
                                    System.out.println("✅ [WebSocket] Đã thiết lập Principal thành công!");
                                }
                            } else {
                                System.out.println("🔴 [WebSocket] Token KHÔNG HỢP LỆ hoặc đã hết hạn");
                                // ✅ Tuỳ chọn: throw exception để client nhận lỗi ngay
                                // throw new MessageDeliveryException("Invalid token");
                            }
                        } catch (Exception e) {
                            System.out.println("🔴 [WebSocket] LỖI CRASH KHI GIẢI MÃ TOKEN: " + e.getMessage());
                            e.printStackTrace();
                        }
                    } else {
                        System.out.println("🔴 [WebSocket] Không tìm thấy chuỗi 'Bearer ' trong Header");
                    }
                }

                // ✅ Fix 2 (Tuỳ chọn): Kiểm tra auth khi SUBSCRIBE vào kênh private
                // if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                //     String destination = accessor.getDestination();
                //     if (destination != null && destination.startsWith("/user/") && accessor.getUser() == null) {
                //         throw new MessageDeliveryException("Unauthorized subscription to private channel");
                //     }
                // }

                return message;
            }
        });
    }

    // ✅ Bean riêng cho heartbeat scheduler
    @Bean
    public TaskScheduler heartbeatScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(4); // Đủ cho ~1000 concurrent connections
        scheduler.setThreadNamePrefix("ws-heartbeat-");
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        scheduler.initialize();
        return scheduler;
    }
}
//package com.example.server.config;
//
//import com.example.server.security.JwtTokenProvider;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//import org.springframework.messaging.Message;
//import org.springframework.messaging.MessageChannel;
//import org.springframework.messaging.simp.config.ChannelRegistration;
//import org.springframework.messaging.simp.config.MessageBrokerRegistry;
//import org.springframework.messaging.simp.stomp.StompCommand;
//import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
//import org.springframework.messaging.support.ChannelInterceptor;
//import org.springframework.messaging.support.MessageHeaderAccessor;
//import org.springframework.scheduling.TaskScheduler;
//import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
//import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
//import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
//import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
//import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
//
//import java.util.ArrayList;
//
//@Configuration
//@EnableWebSocketMessageBroker
//public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
//
//    @Autowired
//    private JwtTokenProvider jwtTokenProvider;
//
//    @Override
//    public void registerStompEndpoints(StompEndpointRegistry registry) {
//        registry.addEndpoint("/ws")
//                .setAllowedOriginPatterns("*")
//                .withSockJS()
//                .setHeartbeatTime(25000);
//    }
//
//    @Override
//    public void configureMessageBroker(MessageBrokerRegistry registry) {
//        // ✅ Cấu hình SimpleBroker với scheduler riêng để heartbeat ổn định
//        registry.enableSimpleBroker("/user", "/topic", "/queue")
//                .setHeartbeatValue(new long[]{10000, 10000}) // [client-ping-server, server-ping-client] (ms)
//                .setTaskScheduler(heartbeatScheduler()); // ✅ Quan trọng: tránh heartbeat bị block
//
//        registry.setApplicationDestinationPrefixes("/app");
//        registry.setUserDestinationPrefix("/user");
//    }
//
//    @Override
//    public void configureClientInboundChannel(ChannelRegistration registration) {
//        registration.interceptors(new ChannelInterceptor() {
//            @Override
//            public Message<?> preSend(Message<?> message, MessageChannel channel) {
//                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
//
//                // ✅ Fix 1: Kiểm tra null an toàn
//                if (accessor == null) {
//                    return message;
//                }
//
//                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
//                    System.out.println("🔵 [WebSocket] Nhận yêu cầu CONNECT");
//                    String authHeader = accessor.getFirstNativeHeader("Authorization");
//
//                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
//                        System.out.println("🔵 [WebSocket] Đã thấy Token trong Header");
//                        String token = authHeader.substring(7);
//
//                        try {
//                            if (jwtTokenProvider.validateToken(token)) {
//                                System.out.println("🔵 [WebSocket] Token HỢP LỆ");
//                                String userId = jwtTokenProvider.getUserIdFromToken(token);
//                                System.out.println("🔵 [WebSocket] Giải mã ra UserId: " + userId);
//
//                                if (userId != null && !userId.isEmpty()) {
//                                    UsernamePasswordAuthenticationToken authentication =
//                                            new UsernamePasswordAuthenticationToken(userId, null, new ArrayList<>());
//                                    accessor.setUser(authentication); // ✅ Gán user vào session
//                                    System.out.println("✅ [WebSocket] Đã thiết lập Principal thành công!");
//                                }
//                            } else {
//                                System.out.println("🔴 [WebSocket] Token KHÔNG HỢP LỆ hoặc đã hết hạn");
//                                throw new org.springframework.messaging.MessageDeliveryException("Invalid or expired token");
//                            }
//                        } catch (Exception e) {
//                            System.out.println("🔴 [WebSocket] LỖI CRASH KHI GIẢI MÃ TOKEN: " + e.getMessage());
//                            e.printStackTrace();
//                        }
//                    } else {
//                        System.out.println("🔴 [WebSocket] Không tìm thấy chuỗi 'Bearer ' trong Header");
//                    }
//                }
//
//                // ✅ Fix 2 (Tuỳ chọn): Kiểm tra auth khi SUBSCRIBE vào kênh private
//                // if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
//                //     String destination = accessor.getDestination();
//                //     if (destination != null && destination.startsWith("/user/") && accessor.getUser() == null) {
//                //         throw new MessageDeliveryException("Unauthorized subscription to private channel");
//                //     }
//                // }
//
//                return message;
//            }
//        });
//    }
//
//    // ✅ Bean riêng cho heartbeat scheduler
//    @Bean
//    public TaskScheduler heartbeatScheduler() {
//        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
//        scheduler.setPoolSize(4); // Đủ cho ~1000 concurrent connections
//        scheduler.setThreadNamePrefix("ws-heartbeat-");
//        scheduler.setWaitForTasksToCompleteOnShutdown(true);
//        scheduler.initialize();
//        return scheduler;
//    }
//}
//
//
