# Acme Corp Engineering

This workspace contains all software systems maintained by the Acme engineering organization.

## Systems

### E-Commerce Platform
Customer-facing online shopping platform serving 10M+ users.
- **Team**: Platform Team
- **Status**: Production
- **Tech Stack**: TypeScript, Python, PostgreSQL, Redis, Kafka

### Internal Tools
Admin dashboards and operations tooling for internal staff.
- **Team**: Internal Tools Team
- **Status**: Production
- **Tech Stack**: TypeScript, React

## Architecture

The e-commerce platform follows a microservices architecture with:
- **API Gateway** as the single entry point
- **User Service** for authentication and user management
- **Order Service** for order processing and fulfillment
- **Notification Service** for emails and SMS
- **PostgreSQL** as the primary data store
- **Redis** for caching and sessions
- **Kafka** for async event-driven communication between services
