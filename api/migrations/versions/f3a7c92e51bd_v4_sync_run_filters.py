"""v4 sync run filters

Revision ID: f3a7c92e51bd
Revises: e7b2c41d90aa
Create Date: 2026-09-06
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = 'f3a7c92e51bd'
down_revision: Union[str, None] = 'e7b2c41d90aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    with op.batch_alter_table('sync_runs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('label_groups', sa.JSON(), server_default='[]', nullable=False))
        batch_op.add_column(sa.Column('difficulty', sa.String(20), server_default='', nullable=False))

def downgrade() -> None:
    with op.batch_alter_table('sync_runs', schema=None) as batch_op:
        batch_op.drop_column('difficulty')
        batch_op.drop_column('label_groups')
