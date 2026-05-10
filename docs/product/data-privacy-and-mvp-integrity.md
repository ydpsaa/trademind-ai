# Data Privacy and MVP Integrity

TradeMind AI keeps product-facing language separate from implementation details.

User-facing pages should use product-safe labels:

- Database Service
- Secure Data Layer
- Data Isolation
- AI Service
- Calendar Data
- Market Data Feed
- Provider Not Connected
- Manual Data
- Sample Data
- Disabled

User-facing UI should not expose platform vendors, raw environment variable names, database table names, schema details, or raw status metadata keys. Technical vendor names may appear only in developer setup documentation, source code imports, and environment variable names where required by the implementation.

Calendar data must be labeled by source state. Manual or sample records should never be presented as a live provider feed. Market data, scanner, signal, backtest, broker, and execution modules remain not connected until their dedicated roadmap stages.
