package com.syntaxcore.workforce.enums;

public enum Role {
    SUPER_ADMIN,
    ADMINISTRATOR,
    PROJECT_MANAGER,
    HR_MANAGER,
    EMPLOYEE,
    INTERN,
    STUDENT;

    public boolean isAtLeast(Role other) {
        return this.ordinal() <= other.ordinal();
    }

    public String getDisplayName() {
        return switch (this) {
            case SUPER_ADMIN    -> "Super Admin";
            case ADMINISTRATOR  -> "Administrator";
            case PROJECT_MANAGER-> "Project Manager";
            case HR_MANAGER     -> "HR Manager";
            case EMPLOYEE       -> "Employee";
            case INTERN         -> "Intern";
            case STUDENT        -> "Student";
        };
    }
}
