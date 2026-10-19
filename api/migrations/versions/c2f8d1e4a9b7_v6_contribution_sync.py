"""v6 contribution sync

Revision ID: c2f8d1e4a9b7
Revises: f3a7c92e51bd
Create Date: 2026-10-19
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = 'c2f8d1e4a9b7'
down_revision: Union[str, None] = 'f3a7c92e51bd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    with op.batch_alter_table('contributions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True))

def downgrade() -> None:
    with op.batch_alter_table('contributions', schema=None) as batch_op:
        batch_op.drop_column('last_synced_at')
