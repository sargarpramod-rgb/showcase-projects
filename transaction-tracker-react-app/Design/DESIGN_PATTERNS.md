# Transaction Tracker - Java Design Patterns Guide

## Purpose

This document defines the design patterns used in the Transaction Tracker system.
It serves as a contract for implementation using Spring Boot.

---

# 1. Strategy Pattern (File Parsing)

## Intent

Encapsulate multiple file parsing algorithms (CSV, PDF, Excel) and make them interchangeable.

## Use Case

* File upload processing
* Different parsing logic per file type

## Design

### Interface

```java
public interface FileParser {
    List<Transaction> parse(InputStream inputStream);
}
```

### Implementations

* CsvFileParser
* PdfFileParser
* ExcelFileParser

### Factory Usage

```java
public class FileParserFactory {
    public static FileParser getParser(FileType type);
}
```

## Notes for Implementation

* Use Spring `@Component` for implementations
* Consider using Map<FileType, FileParser> for dynamic resolution

---

# 2. Factory Pattern (Object Creation)

## Intent

Centralize object creation logic.

## Use Cases

* FileParser creation
* NotificationService creation
* ML Model selection

## Design

```java
public interface NotificationService {
    void send(NotificationRequest request);
}
```

Implementations:

* EmailNotificationService
* SmsNotificationService
* PushNotificationService

Factory:

```java
public class NotificationFactory {
    public static NotificationService getService(NotificationType type);
}
```

## Notes

* Replace switch-case with Spring `@Qualifier` or `@Autowired Map<String, Bean>`

---

# 3. Chain of Responsibility (Processing Pipeline)

## Intent

Process file through multiple steps in sequence.

## Use Cases

* File validation
* Duplicate check
* Parsing
* Enrichment
* Persistence

## Design

```java
public abstract class ProcessingHandler {
    protected ProcessingHandler next;

    public ProcessingHandler setNext(ProcessingHandler next);

    public abstract void handle(FileContext context);
}
```

Handlers:

* ValidationHandler
* DuplicateCheckHandler
* ParsingHandler
* EnrichmentHandler
* PersistenceHandler

## Notes

* Chain should be configurable via Spring configuration
* Ensure failure handling at each stage

---

# 4. Observer Pattern (Event-Driven Architecture)

## Intent

Allow multiple consumers to react to events asynchronously.

## Use Cases

* Kafka consumers
* Notification service
* Aggregation service
* ML processing

## Design

Event:

```java
public class TransactionEvent {
    private String userId;
    private List<Transaction> transactions;
}
```

Listener:

```java
public interface EventListener {
    void onEvent(TransactionEvent event);
}
```

Implementations:

* NotificationListener
* AggregationListener
* MLListener

## Notes

* Use Kafka topics
* Each listener = separate consumer group

---

# 5. Template Method Pattern (Processing Workflow)

## Intent

Define fixed workflow while allowing step customization.

## Use Cases

* File processing flow

## Design

```java
public abstract class AbstractFileProcessor {

    public final void process(File file) {
        validate(file);
        List<Transaction> txns = parse(file);
        save(txns);
        postProcess(txns);
    }

    protected abstract void validate(File file);
    protected abstract List<Transaction> parse(File file);
    protected abstract void save(List<Transaction> txns);
    protected void postProcess(List<Transaction> txns) {}
}
```

## Notes

* Extend for CSV/PDF specific processors if needed

---

# 6. Decorator Pattern (Retry Mechanism)

## Intent

Add retry capability without modifying core logic.

## Use Cases

* Kafka message processing retry
* Replay mechanism

## Design

```java
public interface Processor {
    void process(Message message);
}
```

```java
public class RetryProcessor implements Processor {
    private Processor delegate;

    public void process(Message message);
}
```

## Notes

* Configurable retry count
* Integrate with Dead Letter Queue (DLQ)

---

# 7. Proxy Pattern (Caching Layer)

## Intent

Add caching layer transparently before hitting DB.

## Use Cases

* Dashboard API
* User preferences

## Design

```java
public interface DashboardService {
    DashboardResponse getDashboard(String userId);
}
```

```java
public class DashboardServiceProxy implements DashboardService {
    private DashboardServiceImpl service;
    private CacheService cache;

    public DashboardResponse getDashboard(String userId);
}
```

## Notes

* Use Redis
* Cache key: `dashboard:{userId}`
* TTL: configurable

---

# 8. CQRS (Command Query Responsibility Segregation)

## Intent

Separate read and write models.

## Use Cases

* Transaction writes → OLTP DB
* Dashboard reads → Aggregated DB / Cache

## Design

### Write Model

* TransactionService
* UploadService

### Read Model

* DashboardService
* AggregationService

## Notes

* Aggregation via Kafka consumers
* Eventual consistency model

---

# 9. Suggested Package Structure

```
com.project.transactiontracker
│
├── controller
├── service
│   ├── upload
│   ├── dashboard
│   ├── processing
│
├── parser (Strategy)
├── factory
├── handler (Chain of Responsibility)
├── event (Kafka models)
├── listener (Observer)
├── processor (Template + Decorator)
├── cache (Proxy)
├── repository
├── model
└── config
```

---

# 10. Implementation Guidelines

* Use Spring Boot annotations:

  * @Service
  * @Component
  * @Configuration

* Prefer constructor injection

* Use Lombok where appropriate

* Follow SOLID principles:

  * Single Responsibility
  * Open/Closed Principle

---

# 11. Non-Functional Considerations

* Idempotency → unique fileHash
* Retry → DLQ + replay table
* Scalability → Kafka partitions
* Observability → logs + metrics

---

# Final Note

This design ensures:

* Loose coupling
* High scalability
* Maintainability
* Extensibility

Copilot should generate implementations adhering to these interfaces and patterns.
