"""v2 notifications + contributions

Revision ID: c41f2a9b77e3
Revises: 1098f8fd7969
Create Date: 2026-09-05
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = 'c41f2a9b77e3'
down_revision: Union[str, None] = '1098f8fd7969'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'notifications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('type', sa.String(20), server_default='SYSTEM', nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('body', sa.Text(), server_default='', nullable=False),
        sa.Column('link', sa.Text(), server_default='', nullable=False),
        sa.Column('read', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_table(
        'contributions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('issue_id', sa.UUID(), nullable=True),
        sa.Column('repo', sa.String(200), server_default='', nullable=False),
        sa.Column('issue_number', sa.Integer(), server_default='0', nullable=False),
        sa.Column('state', sa.Enum('INTERESTED', 'CLAIMED', 'PR_OPEN', 'MERGED', name='contribution_state'), server_default='INTERESTED', nullable=False),
        sa.Column('pr_url', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['issue_id'], ['issues.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_contributions_user_id', 'contributions', ['user_id'])

def downgrade() -> None:
    op.drop_index('ix_contributions_user_id', table_name='contributions')
    op.drop_table('contributions')
    op.drop_index('ix_notifications_user_id', table_name='notifications')
    op.drop_table('notifications')
    sa.Enum(name='contribution_state').drop(op.get_bind(), checkfirst=True)
