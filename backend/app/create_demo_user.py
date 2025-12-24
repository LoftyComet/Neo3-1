import sys
import os
from sqlalchemy import text

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine

def create_demo_user():
    username = "demo_user"
    email = "demo@example.com"
    # This is the hash for "password" that we verified works with the current bcrypt version
    hashed_password = "$2b$12$8dt28ppsL95X3Sy8y33fd.11VYcjXCLw6RUwYq5lzUXq2Xfz//4Ky"
    
    print(f"--- Creating demo user: {username} ---")
    
    with engine.connect() as conn:
        # Check if exists first (by email or username)
        result = conn.execute(text("SELECT id FROM users WHERE username = :username OR email = :email"), 
                              {"username": username, "email": email})
        existing = result.fetchone()
        
        if existing:
            print("User already exists. Updating password...")
            conn.execute(text("UPDATE users SET hashed_password = :hash WHERE id = :id"), 
                         {"hash": hashed_password, "id": existing.id})
        else:
            print("Creating new user...")
            conn.execute(text("""
                INSERT INTO users (id, username, email, hashed_password, created_at)
                VALUES (uuid_generate_v4(), :username, :email, :hash, NOW())
            """), {"username": username, "email": email, "hash": hashed_password})
            
        conn.commit()
        print("✅ Demo user ready.")

if __name__ == "__main__":
    create_demo_user()
