from app import create_app
from app.config import get_config_class

app = create_app(get_config_class())
