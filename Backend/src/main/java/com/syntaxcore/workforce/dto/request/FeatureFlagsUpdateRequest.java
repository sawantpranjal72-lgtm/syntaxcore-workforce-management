package com.syntaxcore.workforce.dto.request;

import lombok.Data;

import java.util.Map;

@Data
public class FeatureFlagsUpdateRequest {
    private Map<String, Boolean> featureFlags;
}
