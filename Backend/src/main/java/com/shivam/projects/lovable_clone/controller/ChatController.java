package com.shivam.projects.lovable_clone.controller;

import com.shivam.projects.lovable_clone.dto.chat.ChatRequest;
import com.shivam.projects.lovable_clone.dto.chat.ChatResponse;
import com.shivam.projects.lovable_clone.dto.chat.StreamResponse;
import com.shivam.projects.lovable_clone.service.AiGenerationService;
import com.shivam.projects.lovable_clone.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chat")
public class ChatController {

    private final AiGenerationService aiGenerationService;
    private final ChatService chatService;

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<StreamResponse>> streamChat(
            @RequestBody ChatRequest request) {

        return aiGenerationService.streamResponse(request.message(), request.projectId())
                .map(data -> ServerSentEvent.<StreamResponse>builder()
                        .data(data)
                        .build())
                .onErrorResume(ex -> {
                    String errorMsg = ex.getMessage();
                    if (errorMsg != null && (errorMsg.contains("429") || errorMsg.contains("Too Many Requests"))) {
                        errorMsg = "API Rate limit exceeded (429 Too Many Requests). Please wait a few seconds before trying again.";
                    } else {
                        errorMsg = "Service error: " + (errorMsg != null ? errorMsg : "Something went wrong.");
                    }
                    StreamResponse errResponse = new StreamResponse("<message phase=\"error\">\n\n⚠️ " + errorMsg + "\n</message>");
                    return Flux.just(ServerSentEvent.<StreamResponse>builder().data(errResponse).build());
                });
    }

    @GetMapping("/projects/{projectId}")
    public ResponseEntity<List<ChatResponse>> getChatHistory(
            @PathVariable Long projectId) {

        return ResponseEntity.ok(chatService.getProjectChatHistory(projectId));
    }
}
