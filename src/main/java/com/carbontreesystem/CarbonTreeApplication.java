package com.carbontreesystem;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CarbonTreeApplication {

    public static void main(String[] args) {
        SpringApplication.run(CarbonTreeApplication.class, args);
    }
}