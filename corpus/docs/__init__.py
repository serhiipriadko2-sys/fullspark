"""
Искра 2FA - Двухфакторная аутентификация для экосистемы Искра

Этот модуль предоставляет комплексную систему 2FA на основе TOTP,
интегрированную с архитектурой экосистемы Искра.
"""

__version__ = "1.0.0"
__author__ = "Claude Code Security Agent"
__email__ = "security@iskra.ai"

from .core import TOTPManager
from .models import User2FA, BackupCode, RecoveryToken
from .security import TwoFAEncryption
from .recovery import RecoveryManager, AdminRecoveryManager
from .integration import FractalLogger, ChaosTesting, MetaAnalysis

__all__ = [
    "TOTPManager",
    "User2FA", 
    "BackupCode",
    "RecoveryToken",
    "TwoFAEncryption",
    "RecoveryManager",
    "AdminRecoveryManager",
    "FractalLogger",
    "ChaosTesting", 
    "MetaAnalysis"
]
