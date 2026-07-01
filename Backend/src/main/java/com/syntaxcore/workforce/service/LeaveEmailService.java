package com.syntaxcore.workforce.service;

import com.syntaxcore.workforce.entity.LeaveRequest;

/**
 * Sends email notifications to admin-configured recipients whenever
 * a leave request is raised, approved, or rejected.
 */
public interface LeaveEmailService {

    /** Notify all configured active recipients that a new leave request has been raised. */
    void notifyLeaveRaised(LeaveRequest leave);

    /** Notify the employee that their leave was approved/rejected. */
    void notifyLeaveDecision(LeaveRequest leave, boolean approved);
}
