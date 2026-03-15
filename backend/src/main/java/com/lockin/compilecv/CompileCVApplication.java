package com.lockin.compilecv;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import java.util.Properties;

import io.github.cdimascio.dotenv.Dotenv;

@SpringBootApplication
@EnableCaching
public class CompileCVApplication {

	public static void main(String[] args) {
		// Load .env.local from the root directory (../)
		try {
			Dotenv dotenv = Dotenv.configure()
					.directory("../")
					.filename(".env.local")
					.ignoreIfMissing()
					.load();

			dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));
			System.out.println("Loaded environment variables from .env.local");
		} catch (Exception e) {
			System.out.println("Could not load .env.local (might be in production or not found): " + e.getMessage());
		}

		System.setProperty("pdfbox.fontcache", System.getProperty("java.io.tmpdir"));

		SpringApplication.run(CompileCVApplication.class, args);
	}

}
