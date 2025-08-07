import asyncio
import sys
from pathlib import Path
import subprocess
import os
# Ensure the 'app' directory is in the Python path
ROOT_DIR = Path(__file__).parent
APP_DIR = ROOT_DIR / "app"
sys.path.append(str(ROOT_DIR))

from app.migrations.alembic_manager import AlembicMigrationManager



# Add this function before main()
def handle_fresh_installation(db_path):
    """Handle installations where init_db() already created schema"""
    if os.path.exists(db_path):
        # Database exists (created by init_db), check migration status
        try:
            result = subprocess.run(["alembic", "current"], capture_output=True, text=True, check=True)
            print(f"Checking migration status: {result.stdout.strip()}")
            
            # Check if no migration history exists
            if not any(len(line.strip()) >= 12 and not line.startswith('INFO') 
                      for line in result.stdout.split('\n')):
                print("Database exists (via init_db) but no migration history - stamping with head")
                subprocess.run(["alembic", "stamp", "head"], check=True)
                return True
        except subprocess.CalledProcessError as e:
            print(f"Error checking migration status: {e.stderr}")
    return False


# Update main() function
async def main():
    """
    Migration script that works with init_db() pattern
    """
    print("--- Running migration script ---")
    db_path = str(ROOT_DIR / "metadata.db")
   
    
    # Now handle the migration history
    if handle_fresh_installation(db_path):
        print("Fresh installation: database created and stamped successfully")
        return
    
    # For existing installations with migration history, run normal migrations
    print("Running incremental migrations...")
    alembic_manager = AlembicMigrationManager(db_path)
    success, message = await alembic_manager.handle_database_upgrade()
    
    if not success:
        print(f"Migration Error: {message}")
        sys.exit(1)
    
    print(f"Migration Success: {message}")

if __name__ == "__main__":
    asyncio.run(main())