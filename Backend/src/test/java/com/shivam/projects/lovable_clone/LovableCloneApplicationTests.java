package com.shivam.projects.lovable_clone;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"spring.ai.openai.api-key=test-key",
		"jwt.secret-key=01234567890123456789012345678901",
		"stripe.api.secret=test-key",
		"stripe.webhook.secret=test-key"
})
class LovableCloneApplicationTests {

	@Test
	void contextLoads() {
	}

}
