# Contributing to SISKAMLING

Terima kasih telah tertarik untuk berkontribusi pada SISKAMLING! Dokumen ini menjelaskan bagaimana Anda dapat membantu mengembangkan proyek ini.

## 📋 Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)

## 📜 Code of Conduct

### Komitmen Kami
Kami berkomitmen untuk menyediakan lingkungan yang ramah, aman, dan inklusif bagi semua kontributor.

### Perilaku yang Dihargai
- Bersikap sopan dan menghormati pandangan berbeda
- Memberikan feedback yang konstruktif
- Fokus pada apa yang terbaik untuk komunitas
- Menunjukkan empati kepada anggota komunitas lain

### Perilaku yang Tidak Diterima
- Penggunaan bahasa atau gambar seksual
- Pelecehan atau serangan personal
- Trolling atau komentar yang merendahkan
- Pelecehan publik atau pribadi
- Ancaman kekerasan

## 🚀 Getting Started

### 1. Fork Repository
```bash
# Kunjungi https://github.com/affantian/SISKAMLING
# Klik tombol "Fork" di sudut kanan atas
```

### 2. Clone Fork Anda
```bash
git clone https://github.com/your-username/SISKAMLING.git
cd SISKAMLING
```

### 3. Tambahkan Upstream
```bash
git remote add upstream https://github.com/affantian/SISKAMLING.git
git fetch upstream
```

### 4. Setup Development Environment
```bash
# Buat virtual environment
python -m venv venv

# Aktivasi
source venv/bin/activate  # Linux/Mac
# atau
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements-dev.txt
```

### 5. Setup Pre-commit Hooks
```bash
pre-commit install
```

## 🔄 Development Workflow

### 1. Buat Branch untuk Fitur Anda
```bash
# Sync dengan upstream terbaru
git fetch upstream
git rebase upstream/main

# Buat branch baru
git checkout -b feature/deskripsi-singkat
# atau
git checkout -b fix/deskripsi-singkat
# atau
git checkout -b docs/deskripsi-singkat
```

### 2. Buat Perubahan
```bash
# Edit file-file yang diperlukan
# Pastikan mengikuti coding standards

# Run tests lokal
pytest

# Run linters
flake8 app/
black app/
```

### 3. Commit Perubahan
```bash
git add .
git commit -m "Type: Short description"
```

### 4. Push ke Fork Anda
```bash
git push origin feature/deskripsi-singkat
```

### 5. Buat Pull Request
- Kunjungi https://github.com/affantian/SISKAMLING
- Klik tombol "New Pull Request"
- Pilih branch Anda sebagai compare

## 📝 Coding Standards

### Python Style Guide (PEP 8)
```python
# ✅ Good
def calculate_total_price(items: list) -> float:
    """Calculate total price from items.
    
    Args:
        items: List of item dictionaries
        
    Returns:
        Total price as float
    """
    total = 0
    for item in items:
        total += item['price'] * item['quantity']
    return total

# ❌ Bad
def calc(x):
    t=0
    for i in x:
        t+=i['p']*i['q']
    return t
```

### Naming Conventions
```python
# Constants
MAX_ITEMS = 100
DEFAULT_TIMEOUT = 30

# Classes
class UserService:
    pass

class PatrolReport:
    pass

# Functions/Methods
def get_user_by_id(user_id: int):
    pass

def validate_email_format(email: str) -> bool:
    pass

# Variables
user_count = 0
is_active = True
patrol_data = {}
```

### Type Hints
```python
from typing import List, Dict, Optional

def get_users(page: int = 1) -> List[Dict]:
    pass

def find_user(user_id: int) -> Optional[User]:
    pass

def create_report(data: Dict) -> Report:
    pass
```

### Docstrings
```python
def process_patrol_data(patrol_id: int, location: str) -> bool:
    """Process patrol data and update status.
    
    Processes the patrol information including validation,
    location verification, and status updates.
    
    Args:
        patrol_id: The unique identifier for the patrol
        location: The location where patrol occurred
        
    Returns:
        True if processing was successful, False otherwise
        
    Raises:
        ValueError: If patrol_id is invalid
        LocationError: If location cannot be verified
        
    Example:
        >>> process_patrol_data(1, "Area A")
        True
    """
    pass
```

### Code Organization
```python
# 1. Imports
from typing import List
from flask import Blueprint, request
from app.models import User
from app.services import UserService

# 2. Constants
MAX_PAGE_SIZE = 100
DEFAULT_ROLE = 'user'

# 3. Helper Functions
def validate_input(data: dict) -> bool:
    pass

# 4. Main Classes/Functions
class UserHandler:
    def __init__(self):
        self.service = UserService()
```

## 📮 Commit Guidelines

### Commit Message Format
```
Type: Subject

Body

Footer
```

### Types
- `feat:` Fitur baru
- `fix:` Bug fixes
- `docs:` Dokumentasi
- `style:` Format, linting, tidak ada perubahan kode
- `refactor:` Refactoring kode tanpa fitur/fix baru
- `perf:` Improvement performa
- `test:` Menambah atau update tests
- `chore:` Maintenance

### Contoh Commits
```
feat: Add patrol status filtering to API

- Implement status filter in GET /patrols
- Add new filter parameter to service layer
- Update API documentation

Closes #123

---

fix: Resolve null pointer exception in kamling service

When a kamling record is deleted but patrol data still references it,
the system would crash. Now we handle this gracefully.

- Add null check before accessing kamling data
- Add test case for orphaned patrol records

Fixes #456

---

docs: Update API documentation for reports endpoint

- Add request/response examples
- Document priority levels
- Add error codes reference

---

test: Add unit tests for user authentication

- Test JWT token generation
- Test token validation
- Test refresh token flow
```

## 🔀 Pull Request Process

### Before Submitting PR
- [ ] Fork dan clone repository
- [ ] Create branch dari `main`
- [ ] Buat perubahan minimal
- [ ] Run tests dan pastikan passing
- [ ] Update dokumentasi jika diperlukan
- [ ] Commit dengan message yang jelas
- [ ] Push ke fork Anda

### PR Description Template
```markdown
## Description
Jelaskan apa yang diubah dan mengapa.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #(issue number)

## Testing
Jelaskan bagaimana Anda telah menguji perubahan:
- [ ] Added unit tests
- [ ] Added integration tests
- [ ] Tested manually

## Screenshots (jika applicable)
Tambahkan screenshot untuk UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Comments for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] Tests passing locally
```

### Review Process
1. **Author Review**: Anda review sendiri PR sebelum submit
2. **Maintainer Review**: Maintainer akan review code
3. **Feedback**: Perbaiki feedback dari reviewers
4. **Approval**: Setelah approval, PR dapat di-merge

## 🧪 Testing Requirements

### Run Tests
```bash
# Run all tests
pytest

# Run dengan coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py -v

# Run dengan verbose output
pytest -v --tb=short
```

### Test Structure
```python
import pytest
from app.services import UserService
from unittest.mock import Mock, patch

class TestUserService:
    """Test cases for UserService."""
    
    @pytest.fixture
    def service(self):
        """Provide UserService instance."""
        return UserService()
    
    def test_create_user_success(self, service):
        """Test successful user creation."""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'securepass123'
        }
        
        user = service.create_user(data)
        
        assert user.username == 'testuser'
        assert user.email == 'test@example.com'
    
    def test_create_user_duplicate_username(self, service):
        """Test creation with duplicate username."""
        data = {'username': 'existing', 'email': 'test@example.com'}
        
        with pytest.raises(ValueError):
            service.create_user(data)
```

### Test Coverage Goals
- **Overall Coverage**: > 80%
- **Critical Code**: > 90%
- **Utils**: > 85%

## 📚 Documentation

### Update Documentation
```bash
# Saat menambah fitur baru
1. Update API_DOCUMENTATION.md dengan endpoint baru
2. Update BACKEND_SETUP.md jika ada perubahan setup
3. Update ARCHITECTURE.md jika ada perubahan struktur
```

### Documentation Standards
- Gunakan Bahasa Indonesia/English yang jelas
- Sertakan contoh kode
- Jelaskan parameter dan return values
- Dokumentasi inline untuk logic kompleks

### Example Documentation
```markdown
## Create Patrol Endpoint

**Endpoint:** `POST /api/v1/patrols`

**Description:** Membuat patrol baru untuk kamling

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "kamling_id": 1,
  "location": "Area A",
  "status": "completed",
  "notes": "Semua aman"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {...}
}
```

**Error Cases:**
- 401: Token invalid/expired
- 400: Invalid request body
- 404: Kamling not found
```

## 🐛 Reporting Bugs

### Bug Report Template
```markdown
## Description
Deskripsi singkat tentang bug

## Steps to Reproduce
1. ...
2. ...
3. ...

## Expected Behavior
Apa yang seharusnya terjadi

## Actual Behavior
Apa yang benar-benar terjadi

## Environment
- OS: 
- Python Version:
- Flask Version:
- Database:

## Error Logs
```
Paste error logs here
```

## Possible Solution
Jika Anda punya ide cara memperbaikinya
```

## 🎯 Feature Requests

### Feature Request Template
```markdown
## Description
Deskripsi fitur yang diminta

## Use Case
Kapan dan mengapa fitur ini dibutuhkan

## Proposed Solution
Bagaimana cara mengimplementasikan fitur ini

## Alternative Solutions
Solusi alternatif lain yang mungkin

## Additional Context
Informasi tambahan yang relevan
```

## ❓ Questions?

- **Issues**: https://github.com/affantian/SISKAMLING/issues
- **Discussions**: https://github.com/affantian/SISKAMLING/discussions

## 📜 License

Dengan berkontribusi, Anda setuju bahwa kontribusi Anda akan dilisensikan di bawah lisensi yang sama dengan proyek ini.

---

**Terima kasih telah berkontribusi pada SISKAMLING! 🙏**
