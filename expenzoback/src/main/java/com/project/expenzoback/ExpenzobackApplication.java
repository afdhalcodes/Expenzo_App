package com.project.expenzoback;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ExpenzobackApplication {

	public static void main(String[] args) {
		SpringApplication.run(ExpenzobackApplication.class, args);
	}

}
