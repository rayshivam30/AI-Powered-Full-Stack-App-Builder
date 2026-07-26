package com.shivam.projects.lovable_clone.service;

import com.shivam.projects.lovable_clone.dto.project.PreviewResponse;

public interface PreviewService {
    PreviewResponse deploy(Long projectId);
}
