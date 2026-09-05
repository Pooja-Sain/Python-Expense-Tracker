# Empty on purpose: having a conftest.py at the project root is what makes
# pytest add this directory to sys.path, so "from app.xxx import yyy" works
# in tests/ without needing to install the project as a package.
