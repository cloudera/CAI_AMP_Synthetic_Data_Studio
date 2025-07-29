"""add_completed_rows

Revision ID: 2b4e8d9f6c3a
Revises: 1a8fdc23eb6f
Create Date: 2025-01-18 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2b4e8d9f6c3a'
down_revision: Union[str, None] = '1a8fdc23eb6f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add completed_rows column to generation_metadata table
    with op.batch_alter_table('generation_metadata', schema=None) as batch_op:
        batch_op.add_column(sa.Column('completed_rows', sa.Integer(), nullable=True))


def downgrade() -> None:
    # Remove completed_rows column from generation_metadata table
    with op.batch_alter_table('generation_metadata', schema=None) as batch_op:
        batch_op.drop_column('completed_rows') 