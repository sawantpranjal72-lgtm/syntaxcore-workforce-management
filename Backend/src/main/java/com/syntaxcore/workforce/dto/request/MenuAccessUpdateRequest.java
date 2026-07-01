package com.syntaxcore.workforce.dto.request;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class MenuAccessUpdateRequest {
    private Map<String, List<String>> menuAccess;
}
