- **Category**: [[Behavioural Patterns]].
- **Intent**: Avoids coupling the sender of a request to its receiver by giving multiple handler objects a chance to process the request. It links receiving objects together into a single sequential chain and passes the request along until an object handles it dynamically.

## The Core Concept

In standard object-oriented programming, when a client subsystem needs to execute a request, it usually holds a direct, explicit reference to the specific receiver object responsible for fulfilling that task. However, this tight coupling creates significant structural vulnerabilities when designing complex request pipelines:

1. **Sender-Receiver Tight Coupling**: The sender must explicitly know the exact type, API, and availability of the receiver. If the receiving logic changes, or if multiple optional entities might handle that data, the client code becomes cluttered with deep conditional `switch` or `if-else` blocks.
2. **Inability to Handle Dynamic Request Streams**: When an application must process an unpredictable stream of varying incoming requests (e.g., incoming multi-tiered web filters, distinct input formats, or tiered support escalation), cramming these rules into a single centralized engine destroys modular reusability.

![[Pasted image 20260707163822.png]]

The **Chain of Responsibility Pattern** addresses this problem by decoupling senders and receivers entirely. The sender remains completely unaware of who will eventually handle the request. Instead of a single destination, the request is dispatched to the entry point of a sequential chain of autonomous handler objects. Each handler evaluates whether it satisfies the necessary criteria to process the request; if it cannot, it transparently passes the payload down to its designated successor.

## The Request Processing Pipeline Topology

The relationships between handlers form a clear, single-linked linear queue. When a client fires a request to the first node, the execution flow follows a sequential cascade:

```
  [ Client Request ]
          │
          ▼
  ┌────────────────────────────────────────────────────────┐
  │ Concrete Handler A (e.g., AuthenticationFilter)        │
  │  - Rules do not match request?                         │
  │  - Action: Delegates down to the next handler         │
  └──────┬─────────────────────────────────────────────────┘
         │ (Passes along)
         ▼
  ┌────────────────────────────────────────────────────────┐
  │ Concrete Handler B (e.g., SpamFilter)                  │
  │  - Rules match request?                                 │
  │  - Action: Processes request locally & terminates chain│
  └────────────────────────────────────────────────────────┘
```

### Routing Mechanics & Premature Termination Safeguards

1. **Dynamic Cascade**: When a request enters the chain, the active node evaluates its built-in filtering conditions. If it matches, it executes its custom operations and stops the loop. If it fails to match, it calls the `next` handler pointer.
2. **The "Unsatisfied" Fallback**: If the request traverses every node and reaches the end of the chain without triggering any match rules, the request remains unsatisfied and safely exits the system.
3. **Premature Termination Risk**: A major architectural risk is if an intermediate handler fails to match a rule but mistakenly forgets to forward the request down the chain, causing the entire lifecycle to freeze. To prevent this, systems implement strict boilerplate template algorithms inside the abstract handler class to guarantee forward routing occurs automatically.

> **Did You Know?** This mechanism is fundamentally similar to how multi-layered `try/catch` exception handling works in languages like Java, where an exception bubbles through sequential catch blocks until a matching type signature captures it.
> ![[Pasted image 20260707163923.png]]


## Core Participant Roles

The pattern utilizes an abstract layer to keep all elements interchangeable and decouple implementations:

- **Handler Interface / Abstract Class**: Defines the mandatory signature for handling operations (typically a uniform `handleRequest()` method) and maintains a reference pointer to the next successor `Handler` object in the chain.
- **Concrete Handlers**: Inherit from the abstract superclass. They check incoming requests against their localized criteria, processing matching requests or executing the forward-delegation call to their successor.
- **Client**: Instantiates the concrete handler stack, links them together to form the operational chain, and initiates processing by passing requests strictly to the head of the chain.
![[Pasted image 20260707164017.png]]
## Step-by-Step Code Implementation 

This example demonstrates an email filtering pipeline where incoming items are sequentially passed through spam and marketing tag checks.
### Step 1: Create the Abstract Handler Class

This abstract blueprint forces all custom filters to support successor linking and establishes the uniform execution route.
```java
public abstract class EmailHandler {
    protected EmailHandler nextHandler; // The successor reference pointer

    public void setNextHandler(EmailHandler nextHandler) {
        this.nextHandler = nextHandler;
    }

    // Boilerplate routine ensures requests are forwarded safely if unmatched
    public final void handleRequest(String emailType, String content) {
        if (canHandle(emailType)) {
            process(content);
        } else if (nextHandler != null) {
            // Forward safely down the pipeline
            nextHandler.handleRequest(emailType, content);
        } else {
            System.out.println("[END OF CHAIN] No filter matched this request. Message archived.");
        }
    }

    protected abstract boolean canHandle(String emailType);
    protected abstract void process(String content);
}
```

### Step 2: Implement Concrete Handlers

Each concrete class encapsulates exactly one localized, highly cohesive checking function.

```java
public class SpamFilter extends EmailHandler {
    @Override
    protected boolean canHandle(String emailType) {
        return emailType.equalsIgnoreCase("SPAM");
    }

    @Override
    protected void process(String content) {
        System.out.println("[SPAM FILTER] Threat detected! Shifting email to Spam vault.");
        System.out.println("Purging malicious content payload: " + content);
    }
}
```


```java
public class MarketingFilter extends EmailHandler {
    @Override
    protected boolean canHandle(String emailType) {
        return emailType.equalsIgnoreCase("MARKETING");
    }

    @Override
    protected void process(String content) {
        System.out.println("[MARKETING FILTER] Flagging message with low-priority promotional tags.");
        System.out.println("Processing newsletter text: " + content);
    }
}
```

## Execution and Pipeline Setup

The client application sets up the chain by linking the individual filter instances together. Once initialized, requests are fired into the head of the pipeline.

```java
public class MailServerApplication {
    public static void main(String[] args) {
        // 1. Instantiate the individual concrete handler nodes
        EmailHandler spamDetector = new SpamFilter();
        EmailHandler marketingTagger = new MarketingFilter();

        // 2. Link the nodes together to establish the sequential pipeline
        spamDetector.setNextHandler(marketingTagger);

        // 3. Dispatch a stream of different requests to the entry node
        System.out.println("--- Inbound Message 1 ---");
        spamDetector.handleRequest("SPAM", "Earn cash fast! Click this link now!");
        System.out.println();

        System.out.println("--- Inbound Message 2 ---");
        spamDetector.handleRequest("MARKETING", "Weekly newsletter: Discover new design patterns.");
        System.out.println();

        System.out.println("--- Inbound Message 3 ---");
        // This request will pass completely through the chain unmatched
        spamDetector.handleRequest("PERSONAL", "Hi, are we still meeting up for coffee tomorrow?");
    }
}
```

## Architectural Evaluation and Design Principles Mapping

- **Decouples Sender and Receiver**: The client system sending the request remains completely separated from the receiver code that handles it. You can modify or change any receiver block without altering the sender's client code.
    
- **Promotes Single Responsibility Principle (SRP)**: Instead of a massive class with long conditional blocks handling every possible routing choice, responsibilities are cleanly divided. Each class focuses entirely on one cohesive task (e.g., spam detection or marketing tagging).
    
- **Enables Dynamic Responsibility Assignment**: The structure provides high runtime flexibility. Developers can dynamically add new filter nodes, remove layers, or reorder the chain at runtime without breaking the underlying application layout.

Tags: [[Design Patterns]] | [[Behavioural Patterns]]

- type: article
	title: "test2" 
	url: "test2.com"