"""v3 sync runs

Revision ID: e7b2c41d90aa
Revises: c41f2a9b77e3
Create Date: 2026-09-06
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = 'e7b2c41d90aa'
down_revision: Union[str, None] = 'c41f2a9b77e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'sync_runs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('state', sa.String(20), server_default='QUEUED', nullable=False),
        sa.Column('target', sa.Integer(), server_default='200', nullable=False),
        sa.Column('indexed', sa.Integer(), server_default='0', nullable=False),
        sa.Column('languages', sa.JSON(), server_default='[]', nullable=False),
        sa.Column('error', sa.Text(), server_default='', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

def downgrade() -> None:
    op.drop_table('sync_runs')
