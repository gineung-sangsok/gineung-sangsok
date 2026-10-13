"""CI가 돌아가는지 확인하는 최소 테스트. 실제 테스트가 생기면 지워도 된다."""


def test_packages_import():
    import track1_tagging  # noqa: F401
    import track2_recommend  # noqa: F401
