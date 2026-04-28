//package com.example.the_autumn.security;
//
//import com.example.the_autumn.entity.Session;
//import com.example.the_autumn.entity.User;
//import com.example.the_autumn.repository.SessionRepository;
//import com.example.the_autumn.repository.UserRepository;
//import jakarta.servlet.http.HttpServletRequest;
//import jakarta.servlet.http.HttpServletResponse;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.stereotype.Component;
//import org.springframework.web.servlet.HandlerInterceptor;
//
//import java.util.Optional;
//
//@Component
//public class SessionInterceptor implements HandlerInterceptor {
//
//    public static final String ATTR_USER = "CURRENT_USER";
//
//    @Autowired
//    private SessionRepository sessionRepository;
//
//    @Autowired
//    private UserRepository userRepository;
//
//    @Override
//    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
//        String token = request.getHeader("X-Auth-Token");
//        if (token != null && !token.isBlank()) {
//            Optional<Session> maybe = sessionRepository.findByToken(token);
//            if (maybe.isPresent() && maybe.get().getIsActive() != null && maybe.get().getIsActive()) {
//                Session s = maybe.get();
//                Optional<User> user = userRepository.findById(s.getUserId());
//                if (user.isPresent()) {
//                    request.setAttribute(ATTR_USER, user.get());
//                }
//            }
//        }
//        return true; // don't block requests here; controllers will check for authenticated endpoints
//    }
//}
