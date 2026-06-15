package com.siteledger.service;

import com.siteledger.entity.UserEntity;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Service for enforcing time-based access control.
 * 
 * Rules:
 * - SITE_INCHARGE: 5 days full access (view + edit), no delete
 * - MUNSHI: 24 hours view-only, no edit, no delete
 * - MATE: 24 hours view-only, no edit, no delete
 * - OWNER/OFFICE_ADMIN: Unlimited access with edit/delete
 */
@Service
public class TimeAccessService {

    private static final Duration SITE_INCHARGE_WINDOW = Duration.ofDays(5);
    private static final Duration STAFF_VIEW_WINDOW = Duration.ofHours(24);

    /**
     * Check if user can view an entry based on its creation time.
     */
    public boolean canViewEntry(UserEntity user, LocalDateTime entryCreatedAt) {
        if (user == null || entryCreatedAt == null) return false;

        // OWNER and OFFICE_ADMIN have unlimited view access
        if (isOwnerOrAdmin(user)) return true;

        // Other roles need to be within their time window
        if (roleHasTimeLimit(user)) {
            return isWithinTimeWindow(entryCreatedAt, getViewWindow(user));
        }

        return false;
    }

    /**
     * Check if user can edit an entry based on its creation time.
     */
    public boolean canEditEntry(UserEntity user, LocalDateTime entryCreatedAt) {
        if (user == null || entryCreatedAt == null) return false;

        // OWNER and OFFICE_ADMIN have unlimited edit access
        if (isOwnerOrAdmin(user)) return true;

        // Only SITE_INCHARGE can edit, within 5-day window
        if (user.getRole() == UserEntity.Role.SITE_INCHARGE) {
            return isWithinTimeWindow(entryCreatedAt, SITE_INCHARGE_WINDOW);
        }

        // MUNSHI and MATE cannot edit
        return false;
    }

    /**
     * Check if user can delete an entry.
     */
    public boolean canDeleteEntry(UserEntity user) {
        if (user == null) return false;
        // Only OWNER and OFFICE_ADMIN can delete
        return isOwnerOrAdmin(user);
    }

    /**
     * Get the remaining time description for an entry (for UI display).
     */
    public String getRemainingTime(UserEntity user, LocalDateTime entryCreatedAt) {
        if (user == null || entryCreatedAt == null) return "No access";

        if (isOwnerOrAdmin(user)) return "Unlimited";

        if (!roleHasTimeLimit(user)) return "No access";

        Duration window = getViewWindow(user);
        long elapsedMinutes = ChronoUnit.MINUTES.between(entryCreatedAt, LocalDateTime.now());
        long remainingMinutes = window.toMinutes() - elapsedMinutes;

        if (remainingMinutes <= 0) return "Expired";
        if (remainingMinutes < 60) return remainingMinutes + " minutes";
        if (remainingMinutes < 1440) return (remainingMinutes / 60) + " hours";
        return (remainingMinutes / 1440) + " days";
    }

    /**
     * Check if entry has timed out for the given user.
     */
    public boolean isEntryExpired(UserEntity user, LocalDateTime entryCreatedAt) {
        if (isOwnerOrAdmin(user)) return false;
        return !isWithinTimeWindow(entryCreatedAt, getViewWindow(user));
    }

    // --- Private helpers ---

    private boolean isOwnerOrAdmin(UserEntity user) {
        return user.getRole() == UserEntity.Role.OWNER 
            || user.getRole() == UserEntity.Role.OFFICE_ADMIN;
    }

    private boolean roleHasTimeLimit(UserEntity user) {
        return user.getRole() == UserEntity.Role.SITE_INCHARGE
            || user.getRole() == UserEntity.Role.MUNSHI
            || user.getRole() == UserEntity.Role.MATE;
    }

    private Duration getViewWindow(UserEntity user) {
        return switch (user.getRole()) {
            case SITE_INCHARGE -> SITE_INCHARGE_WINDOW;
            case MUNSHI, MATE -> STAFF_VIEW_WINDOW;
            default -> Duration.ZERO;
        };
    }

    private boolean isWithinTimeWindow(LocalDateTime createdAt, Duration window) {
        return ChronoUnit.MINUTES.between(createdAt, LocalDateTime.now()) <= window.toMinutes();
    }
}
