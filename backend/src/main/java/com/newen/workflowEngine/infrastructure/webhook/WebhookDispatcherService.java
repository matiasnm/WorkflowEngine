package com.newen.workflowEngine.infrastructure.webhook;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.client.RestClient;

import com.newen.workflowEngine.application.port.WorkflowExecutionRepository;
import com.newen.workflowEngine.domain.event.StateChanged;

@Profile("!memory")
@Component
public class WebhookDispatcherService {

    private static final Logger log = LoggerFactory.getLogger(WebhookDispatcherService.class);

    private final WorkflowExecutionRepository executionRepository;
    private final RestClient restClient;

    public WebhookDispatcherService(
        WorkflowExecutionRepository executionRepository)
    {
        this.executionRepository = executionRepository;
        this.restClient = RestClient.create();
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onStateChanged(StateChanged event) {
        executionRepository.findById(event.getExecutionId()).ifPresent(execution -> {
            String url = execution.getCallbackUrl();
            if (url == null || url.isBlank()) return;

            WebhookPayload payload = new WebhookPayload(
                event.getExecutionId().value(),
                event.getWorkflowId().value(),
                event.getFrom().code(),
                event.getFrom().name(),
                event.getTo().code(),
                event.getTo().name(),
                event.getTimestamp());
            try {
                restClient.post().uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload).retrieve().toBodilessEntity();
                log.info("Webhook delivered to {} for execution {}", url, event.getExecutionId());
            } catch (Exception ex) {
                log.warn("Webhook delivery failed: {}", ex.getMessage());
            }
        });
    }
}