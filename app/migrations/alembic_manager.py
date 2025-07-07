# app/migrations/alembic_manager.py
import subprocess

class AlembicMigrationManager:
    def __init__(self, db_path: str = None):
        """Initialize with database path (kept for interface compatibility)"""
        self.db_path = db_path or "metadata.db"

    async def handle_database_upgrade(self) -> tuple[bool, str]:
        """
        Simple database migration using alembic upgrade head
        No directory changes needed - already in project root
        """
        try:
            # Run upgrade head - we're already in the right directory
            result = subprocess.run(
                ["alembic", "upgrade", "head"],
                capture_output=True,
                text=True,
                check=True
            )
            
            # Check if anything was actually upgraded
            if "Running upgrade" in result.stdout:
                return True, f"Database upgraded successfully: {result.stdout.strip()}"
            else:
                return True, "Database is already up to date"
                
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr or e.stdout or str(e)
            return False, f"Database upgrade failed: {error_msg}"
        except Exception as e:
            return False, f"Error during database upgrade: {str(e)}"

    async def get_migration_status(self) -> dict:
        """Get detailed migration status for debugging"""
        try:
            # Get current version
            current_result = subprocess.run(
                ["alembic", "current"], 
                capture_output=True, 
                text=True,
                check=True
            )
            
            # Get head version  
            head_result = subprocess.run(
                ["alembic", "show", "head"], 
                capture_output=True, 
                text=True,
                check=True
            )
            
            return {
                "current": current_result.stdout.strip(),
                "head": head_result.stdout.strip(),
                "status": "ready"
            }
            
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr or e.stdout or str(e)
            return {"error": f"Command failed: {error_msg}", "status": "error"}
        except Exception as e:
            return {"error": str(e), "status": "error"}

    async def get_current_version(self) -> str:
        """Get current database version using alembic current command"""
        try:
            result = subprocess.run(
                ["alembic", "current"],
                capture_output=True,
                text=True,
                check=True
            )
            
            # Extract just the version ID from output like "2b4e8d9f6c3a (head)"
            import re
            match = re.search(r'([a-f0-9]{12})', result.stdout)
            return match.group(1) if match else "none"
            
        except subprocess.CalledProcessError:
            return "none"
        except Exception:
            return "unknown"