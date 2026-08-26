"""issue difficulty scores

Revision ID: b93cd3fc42ec
Revises: a58003a00ec6
Create Date: 2026-08-26 02:55:29.086820

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = 'b93cd3fc42ec'
down_revision: Union[str, None] = 'a58003a00ec6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('issues', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('difficulty_score', sa.Numeric(precision=5, scale=2),
                      nullable=False, server_default='0')
        )
        batch_op.add_column(
            sa.Column('difficulty_confidence', sa.Numeric(precision=4, scale=3),
                      nullable=False, server_default='0')
        )


def downgrade() -> None:
    with op.batch_alter_table('issues', schema=None) as batch_op:
        batch_op.drop_column('difficulty_confidence')
        batch_op.drop_column('difficulty_score')
