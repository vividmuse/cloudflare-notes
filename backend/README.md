# Notes Backend

A lightweight SQLite-based backend for the notes application.

## Features

- 🚀 Fast and lightweight SQLite database
- 🔄 RESTful API endpoints
- 📝 Note CRUD operations
- 🏷️ Tag management
- ✅ Todo functionality
- 📌 Pin/Unpin support
- 🔍 Full-text search
- 📅 Date-based filtering

## Tech Stack

- Python
- Flask
- SQLite3
- SQLAlchemy (Optional)

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  tags TEXT NOT NULL DEFAULT '[]',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_todo BOOLEAN NOT NULL DEFAULT FALSE
);
```

## API Endpoints

### Notes

- `GET /api/notes` - Get all notes
  - Query parameters:
    - `search`: Search in content
    - `tag`: Filter by tag
    - `date`: Filter by date
    - `is_todo`: Filter todo items
    - `is_pinned`: Filter pinned notes

- `POST /api/notes` - Create a new note
  ```json
  {
    "content": "Note content with #tags",
    "is_todo": false,
    "is_pinned": false
  }
  ```

- `GET /api/notes/:id` - Get a specific note

- `PUT /api/notes/:id` - Update a note
  ```json
  {
    "content": "Updated content",
    "is_todo": false,
    "is_pinned": false
  }
  ```

- `PATCH /api/notes/:id` - Partially update a note
  ```json
  {
    "is_pinned": true
  }
  ```

- `DELETE /api/notes/:id` - Delete a note

### Tags

- `GET /api/tags` - Get all unique tags

## Getting Started

1. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Initialize database:
```bash
python init_db.py
```

4. Start the server:
```bash
python app.py
```

## Development

### Requirements

Create `requirements.txt`:
```
Flask==3.0.0
Flask-CORS==4.0.0
python-dotenv==1.0.0
```

### Environment Variables

Create `.env`:
```
FLASK_APP=app.py
FLASK_ENV=development
DATABASE_URL=notes.db
```

## Testing

Run tests:
```bash
python -m pytest
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 