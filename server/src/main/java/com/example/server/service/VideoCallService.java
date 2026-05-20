package com.example.server.service;

import com.example.server.entity.Message;
import com.example.server.entity.VideoCall;
import com.example.server.model.dto.CallDTO;
import com.example.server.repository.MessageRepository;
import com.example.server.repository.VideoCallRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class VideoCallService {

    @Autowired
    private VideoCallRepository videoCallRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Transactional
    public void startCallHistory(CallDTO callDTO) {
        VideoCall call = VideoCall.builder()
                .id(callDTO.getCallId())
                .conversationId(callDTO.getConversationId())
                .callerId(callDTO.getSenderId())
                .status(VideoCall.CallStatus.ongoing)
                .startedAt(LocalDateTime.now())
                .build();
        videoCallRepository.save(call);

        if (callDTO.getConversationId() == null || callDTO.getConversationId().isBlank()) {
            return;
        }

        String content = "video".equalsIgnoreCase(callDTO.getCallType())
                ? "Bat dau cuoc goi video"
                : "Bat dau cuoc goi thoai";

        Message msg = Message.builder()
                .id(UUID.randomUUID().toString())
                .conversationId(callDTO.getConversationId())
                .senderId(callDTO.getSenderId())
                .content(content)
                .messageType(Message.MessageType.text)
                .isDeleted(false)
                .createdAt(LocalDateTime.now())
                .build();
        messageRepository.save(msg);
    }

    @Transactional
    public void updateCallStatus(String callId, VideoCall.CallStatus status) {
        videoCallRepository.findById(callId).ifPresent(call -> {
            call.setStatus(status);
            call.setEndedAt(LocalDateTime.now());
            videoCallRepository.save(call);
        });
    }
}
