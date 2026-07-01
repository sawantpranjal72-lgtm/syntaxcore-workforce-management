package com.syntaxcore.workforce;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableCaching
@EnableAsync
@EnableScheduling
public class WorkforceManagementApplication {

    public static void main(String[] args) {
        // Set default timezone to Asia/Kolkata (IST) for entire application
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
        SpringApplication.run(WorkforceManagementApplication.class, args);
    }
}
