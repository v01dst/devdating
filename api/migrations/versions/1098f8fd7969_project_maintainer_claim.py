"""project maintainer claim

Revision ID: 1098f8fd7969
Revises: b93cd3fc42ec
Create Date: 2026-08-27 08:23:07.982816

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = '1098f8fd7969'
down_revision: Union[str, None] = 'b93cd3fc42ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('maintainer_user_id', sa.UUID(), nullable=True))
        batch_op.add_column(
            sa.Column('maintainer_verified', sa.Boolean(), nullable=False, server_default='0')
        )
        batch_op.create_index(
            batch_op.f('ix_projects_maintainer_user_id'), ['maintainer_user_id'], unique=False
        )
        batch_op.create_foreign_key(
            'fk_projects_maintainer_user_id_users',
            'users',
            ['maintainer_user_id'],
            ['id'],
            ondelete='SET NULL',
        )


def downgrade() -> None:
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.drop_constraint('fk_projects_maintainer_user_id_users', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_projects_maintainer_user_id'))
        batch_op.drop_column('maintainer_verified')
        batch_op.drop_column('maintainer_user_id')