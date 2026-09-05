# api/tests/test_v2.py
def test_v2_models_importable():
    from app.models import Contribution, Notification
    assert Notification.__tablename__ == "notifications"
    assert Contribution.__tablename__ == "contributions"
