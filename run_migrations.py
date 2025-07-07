import asyncio
import sys
from pathlib import Path

# Ensure the 'app' directory is in the Python path
ROOT_DIR = Path(__file__).parent
APP_DIR = ROOT_DIR / "app"
sys.path.append(str(ROOT_DIR))

from app.migrations.alembic_manager import AlembicMigrationManager

async def main():
    """
    Initializes the migration manager and runs the database upgrade.
    This will always use the latest code from disk.
    """
    print("--- Running dedicated migration script ---")
    # Assumes your DB file is named metadata.db in the root
    db_path = str(ROOT_DIR / "metadata.db")
    alembic_manager = AlembicMigrationManager(db_path)
    
    success, message = await alembic_manager.handle_database_upgrade()
    
    if not success:
        print(f"Migration Error: {message}")
        # Exit with a non-zero status code to indicate failure
        sys.exit(1)
    
    print(f"Migration Success: {message}")
    print("--- Migration script finished ---")

if __name__ == "__main__":
    asyncio.run(main())