package com.shivam.projects.lovable_clone.repository;

import com.shivam.projects.lovable_clone.entity.Plan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlanRepository extends JpaRepository<Plan, Long> {
    Optional<Plan> findByStripePriceId(String id);
    List<Plan> findByActiveTrue();
}
