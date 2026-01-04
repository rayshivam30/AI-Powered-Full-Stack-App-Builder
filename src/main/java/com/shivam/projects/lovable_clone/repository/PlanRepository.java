package com.shivam.projects.lovable_clone.repository;

import com.shivam.projects.lovable_clone.entity.Plan;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanRepository extends JpaRepository<Plan, Long> {
}
