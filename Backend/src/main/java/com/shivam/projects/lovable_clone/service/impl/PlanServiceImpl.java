package com.shivam.projects.lovable_clone.service.impl;

import com.shivam.projects.lovable_clone.dto.subscription.PlanResponse;
import com.shivam.projects.lovable_clone.entity.Plan;
import com.shivam.projects.lovable_clone.repository.PlanRepository;
import com.shivam.projects.lovable_clone.service.PlanService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlanServiceImpl implements PlanService {

    private final PlanRepository planRepository;

    @PostConstruct
    public void initDefaultPlans() {
        if (planRepository.count() == 0) {
            log.info("Seeding default subscription plans into database...");
            Plan freePlan = new Plan();
            freePlan.setName("Starter Free");
            freePlan.setStripePriceId("price_free");
            freePlan.setMaxProjects(3);
            freePlan.setMaxTokensPerDay(50000);
            freePlan.setMaxPreviews(100);
            freePlan.setUnlimitedAi(false);
            freePlan.setActive(true);

            Plan proPlan = new Plan();
            proPlan.setName("Pro Builder");
            proPlan.setStripePriceId("price_pro");
            proPlan.setMaxProjects(999);
            proPlan.setMaxTokensPerDay(1000000);
            proPlan.setMaxPreviews(9999);
            proPlan.setUnlimitedAi(true);
            proPlan.setActive(true);

            planRepository.saveAll(List.of(freePlan, proPlan));
            log.info("Default subscription plans seeded successfully.");
        }
    }

    @Override
    public List<PlanResponse> getAllActivePlans() {
        return planRepository.findByActiveTrue()
                .stream()
                .map(plan -> new PlanResponse(
                        plan.getId(),
                        plan.getName(),
                        plan.getMaxProjects(),
                        plan.getMaxTokensPerDay(),
                        plan.getUnlimitedAi(),
                        plan.getUnlimitedAi() ? "$20/mo" : "$0"
                ))
                .toList();
    }
}
