from setuptools import setup, find_packages

setup(
    name="malinas-slot-matrix",
    version="1.0.0",
    description="Malinas DC dock slot matrix engine — Kellanova / GXO",
    packages=find_packages(),
    python_requires=">=3.10",
    entry_points={
        "console_scripts": [
            "malinas-slots=malinas_slot_matrix.cli:main",
        ]
    },
)
