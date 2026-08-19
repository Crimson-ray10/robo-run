from django.http import Http404
from django.shortcuts import render

from .levels import LEVELS, get_level


def home(request):
    levels = sorted(LEVELS.values(), key=lambda lvl: lvl["id"])
    return render(request, "game/home.html", {"levels": levels})


def play_level(request, level_id):
    level = get_level(level_id)
    if level is None:
        raise Http404("Level not found")

    context = {
        "level": level,
        "total_levels": len(LEVELS),
    }
    return render(request, "game/play.html", context)
