package com.shivam.projects.lovable_clone.controller;

import com.shivam.projects.lovable_clone.dto.subscription.PlanLimitsResponse;
import com.shivam.projects.lovable_clone.dto.subscription.UsageTodayResponse;
import com.shivam.projects.lovable_clone.service.UsageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/usage")
public class UsageController {

    private final UsageService usageService;

    @GetMapping("/today")
    public ResponseEntity<UsageTodayResponse> getTodayUsage() {
        return ResponseEntity.ok(usageService.getTodayUsage());
    }

}
