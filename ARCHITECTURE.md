# SISKAMLING System Architecture

## 🏗️ Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
│   (React/Vue.js - Mobile & Web Applications)               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP/REST API
                     │
┌────────────────────▼────────────────────────────────────────┐
│              API Gateway & Load Balancer                    │
│           (Nginx / Cloud Load Balancer)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
     ┌───────────────┼───────────────┐
     │               │               │
┌────▼─────┐  ┌──────▼──────┐  ┌────▼─────┐
│ API      │  │ API        │  │ API      │
│ Server 1 │  │ Server 2   │  │ Server N │
│(Flask)   │  │ (Flask)    │  │ (Flask)  │
└────┬─────┘  └──────┬──────┘  └────┬─────┘
     │               │               │
     └───────────────┼───────────────┘
                     │
     ┌───────────────┼───────────────┐
     │               │               │
┌────▼──────────┐   │         ┌──────▼──────┐
│  PostgreSQL   │   │         │   Redis     │
│  Database     │   │         │  Cache      │
└───────────────┘   │         └─────────────┘
                    │
          ┌─────────▼─────────┐
          │  Message Queue    │
          │  (RabbitMQ/Redis) │
          └───────────────────┘
```

## 📁 Project Structure

```
SISKAMLING/
├── app/
│   ├── __init__.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── kamling.py
│   │   ├── patrol.py
│   │   └── report.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth_routes.py
│   │   ├── user_routes.py
│   │   ├── kamling_routes.py
│   │   ├── patrol_routes.py
│   │   └── report_routes.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── kamling_service.py
│   │   ├── patrol_service.py
│   │   └── report_service.py
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── decorators.py
│   │   ├── validators.py
│   │   ├── response.py
│   │   └── helpers.py
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── auth_middleware.py
│   │   ├── error_handler.py
│   │   └── logging.py
│   └── config.py
├── migrations/
│   ├── versions/
│   ├── env.py
│   └── script.py.mako
├── tests/
│   ├── __init__.py
│   ├── test_auth.py
│   ├── test_users.py
│   ├── test_kamling.py
│   ├── test_patrols.py
│   ├── test_reports.py
│   └── conftest.py
├── scripts/
│   ├── seed_database.py
│   ├── create_admin.py
│   └── backup_database.py
├── logs/
├── docs/
├── .env.example
├── .gitignore
├── requirements.txt
├── requirements-dev.txt
├── wsgi.py
├── app.py
├── config.py
└── README.md
```

## 🔄 Request/Response Flow

### Authentication Flow
```
1. User provides credentials
   ↓
2. POST /api/v1/auth/login
   ↓
3. AuthService validates credentials
   ↓
4. JWT tokens generated (access + refresh)
   ↓
5. Response with tokens
   ↓
6. Client stores tokens (localStorage/secure storage)
   ↓
7. Subsequent requests include Authorization header
```

### Data Flow for Patrol Creation
```
1. Client sends POST /api/v1/patrols
   │
2. API receives request
   │
3. AuthMiddleware validates JWT token
   │
4. RouteHandler (patrol_routes.py) receives request
   │
5. Data validation via Validators
   │
6. PatrolService processes business logic
   │
7. PatrolModel saves to database
   │
8. Cache is invalidated
   │
9. Response returned to client
```

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Kamling Table
```sql
CREATE TABLE kamling (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    shift VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    phone_number VARCHAR(20),
    location VARCHAR(255),
    last_patrol TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Patrols Table
```sql
CREATE TABLE patrols (
    id SERIAL PRIMARY KEY,
    kamling_id INTEGER NOT NULL REFERENCES kamling(id),
    location VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Reports Table
```sql
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    kamling_id INTEGER NOT NULL REFERENCES kamling(id),
    description TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    timestamp TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolution TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔐 Security Architecture

### Authentication & Authorization
- **JWT (JSON Web Tokens)** untuk stateless authentication
- **Access Token** (short-lived, 1 hour default)
- **Refresh Token** (long-lived, 7 days default)
- **Password Hashing** menggunakan bcrypt

### Security Layers
```
┌─────────────────────────────────────┐
│ Input Validation Layer              │
├─────────────────────────────────────┤
│ Authentication Layer (JWT)          │
├─────────────────────────────────────┤
│ Authorization Layer (Role-based)    │
├─────────────────────────────────────┤
│ Business Logic Layer                │
├─────────────────────────────────────┤
│ Data Access Layer (Database)        │
└─────────────────────────────────────┘
```

### CORS Configuration
```python
CORS_ORIGINS = [
    "http://localhost:3000",      # Dev frontend
    "https://app.siskamling.com"  # Production
]
```

## 🚀 Deployment Architecture

### Development Environment
```
Local Machine
└── Flask Development Server (Port 5000)
    └── SQLite/PostgreSQL Database
```

### Production Environment
```
Load Balancer (Nginx)
├── Gunicorn Server 1
├── Gunicorn Server 2
├── Gunicorn Server N
└── PostgreSQL Database (Replica Set)
    ├── Primary Database
    ├── Read Replica 1
    └── Read Replica N
```

### Docker Setup
```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/siskamling
    depends_on:
      - db
      - redis

  db:
    image: postgres:12
    environment:
      - POSTGRES_DB=siskamling
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## 📈 Scalability Considerations

### Horizontal Scaling
- Stateless API servers (multiple instances)
- Load balancing across instances
- Shared database and cache layer

### Vertical Scaling
- Increase server resources
- Database optimization
- Query caching

### Database Optimization
- Indexes on frequently queried columns
- Connection pooling
- Read replicas for high-traffic reads

## 🔄 CI/CD Pipeline

```
Git Push
   │
   ├─→ Lint & Format Check
   │
   ├─→ Run Tests
   │   ├─ Unit Tests
   │   ├─ Integration Tests
   │   └─ API Tests
   │
   ├─→ Build Docker Image
   │
   ├─→ Push to Registry
   │
   ├─→ Deploy to Staging
   │
   ├─→ Run Smoke Tests
   │
   └─→ Deploy to Production
```

## 📝 Design Patterns

### Repository Pattern
```python
class UserRepository:
    def find_by_id(self, id):
        return User.query.get(id)
    
    def find_by_username(self, username):
        return User.query.filter_by(username=username).first()
    
    def save(self, user):
        db.session.add(user)
        db.session.commit()
```

### Service Layer Pattern
```python
class UserService:
    def __init__(self, repository):
        self.repository = repository
    
    def create_user(self, data):
        # Business logic here
        user = User(**data)
        self.repository.save(user)
        return user
```

### Middleware Pattern
```python
@app.before_request
def auth_middleware():
    token = request.headers.get('Authorization')
    if not token:
        return {'error': 'Missing token'}, 401
```

## 🧪 Testing Strategy

### Unit Tests
- Test individual functions and methods
- Mock external dependencies
- Coverage > 80%

### Integration Tests
- Test interaction between components
- Test database operations
- Test API endpoints

### End-to-End Tests
- Full user workflows
- Authentication flows
- Error scenarios

## 📊 Monitoring & Logging

### Logging Levels
```python
DEBUG    - Detailed information
INFO     - General information
WARNING  - Warning messages
ERROR    - Error messages
CRITICAL - Critical issues
```

### Metrics to Monitor
- Request/response times
- Error rates
- Database query performance
- Cache hit rates
- Concurrent users

## 🔧 Configuration Management

### Environment Variables
```env
FLASK_ENV=development/production
DEBUG=True/False
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=...
LOG_LEVEL=INFO
```

### Configuration Levels
```python
class Config:
    # Base configuration
    pass

class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
```

## 📞 Support & Documentation
- Architecture diagrams in `/docs`
- API documentation in `API_DOCUMENTATION.md`
- Backend setup guide in `BACKEND_SETUP.md`
