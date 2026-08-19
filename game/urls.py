from django.urls import path

from . import views

app_name = "game"

urlpatterns = [
    path("", views.home, name="home"),
    path("level/<int:level_id>/", views.play_level, name="play_level"),
]
