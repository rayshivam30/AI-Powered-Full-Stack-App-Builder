package com.shivam.projects.lovable_clone.service;

import com.shivam.projects.lovable_clone.dto.subscription.CheckoutRequest;
import com.shivam.projects.lovable_clone.dto.subscription.CheckoutResponse;
import com.shivam.projects.lovable_clone.dto.subscription.PortalResponse;
import com.shivam.projects.lovable_clone.dto.subscription.SubscriptionResponse;
import com.shivam.projects.lovable_clone.enums.SubscriptionStatus;
import org.jspecify.annotations.Nullable;

import java.time.Instant;

public interface SubscriptionService {
    SubscriptionResponse getCurrentSubscription();

    void activateSubscription(Long userId, Long planId, String subscriptionId, String customerId);

    void updateSubscription(String subscriptionId, SubscriptionStatus status, Instant periodStart, Instant periodEnd, Boolean cancelAtPeriodEnd, Long planId);

    void cancelSubscription(String subscriptionId);

    void renewSubscriptionPeriod(String subId, Instant periodStart, Instant periodEnd);

    void markSubscriptionPastDue(String subId);
}
