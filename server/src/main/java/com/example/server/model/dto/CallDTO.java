package com.example.server.model.dto;

import lombok.Data;

@Data
public class CallDTO {
    private String callId;          // ID cuộc gọi (tự tạo ở Frontend bằng UUID)
    private String conversationId;  // ID đoạn chat
    private String senderId;        // Người gọi/Người gửi tín hiệu
    private String receiverId;      // Người nghe
    private String type;            // Loại tín hiệu: "start", "accept", "reject", "end", "offer", "answer", "ice-candidate"
    private String callType;        // "audio" hoặc "video"
    private Object signalData;      // Chứa dữ liệu WebRTC (SDP/ICE)
}