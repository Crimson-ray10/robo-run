from django.test import TestCase, Client
from django.urls import reverse
from .levels import LEVELS, get_level

VALID_BLOCK_TYPES = {"move", "turnLeft", "turnRight", "repeat"}


class LevelDefinitionsTestCase(TestCase):
    def test_all_four_levels_exist(self):
        self.assertEqual(len(LEVELS), 4)
        for i in range(1, 5):
            self.assertIn(i, LEVELS)
            self.assertEqual(LEVELS[i]["id"], i)

    def test_level_timers(self):
        self.assertEqual(LEVELS[1]["time_limit"], 120)  # 2 minutes for Level 1
        self.assertEqual(LEVELS[2]["time_limit"], 180)  # 3 minutes for Level 2
        self.assertEqual(LEVELS[3]["time_limit"], 180)  # 3 minutes for Level 3
        self.assertEqual(LEVELS[4]["time_limit"], 180)  # 3 minutes for Level 4

    def test_level_three_has_first_column_and_2_1_obstacles(self):
        self.assertIn([2, 1], LEVELS[3]["obstacles"])
        for y in range(1, 10):
            self.assertIn([0, y], LEVELS[3]["obstacles"])

    def test_level_four_has_first_column_and_specific_obstacles(self):
        self.assertIn([5, 9], LEVELS[4]["obstacles"])
        self.assertIn([5, 11], LEVELS[4]["obstacles"])
        for y in range(1, 12):
            self.assertIn([0, y], LEVELS[4]["obstacles"])

    def test_level_grid_bounds_and_validity(self):
        for lvl_id, lvl in LEVELS.items():
            w = lvl["grid_width"]
            h = lvl["grid_height"]
            start = lvl["start"]
            finish = lvl["finish"]
            obstacles = lvl["obstacles"]

            # Bounds
            self.assertTrue(0 <= start["x"] < w, f"Level {lvl_id} start x out of bounds")
            self.assertTrue(0 <= start["y"] < h, f"Level {lvl_id} start y out of bounds")
            self.assertIn(start["dir"], ["right", "down", "left", "up"], f"Level {lvl_id} invalid start dir")

            self.assertTrue(0 <= finish["x"] < w, f"Level {lvl_id} finish x out of bounds")
            self.assertTrue(0 <= finish["y"] < h, f"Level {lvl_id} finish y out of bounds")

            # Start and finish cannot be the same
            self.assertFalse(start["x"] == finish["x"] and start["y"] == finish["y"], f"Level {lvl_id} start equals finish")

            # Start and finish cannot be obstacles
            for obs in obstacles:
                self.assertTrue(0 <= obs[0] < w and 0 <= obs[1] < h, f"Level {lvl_id} obstacle {obs} out of bounds")
                self.assertFalse(obs[0] == start["x"] and obs[1] == start["y"], f"Level {lvl_id} start on obstacle {obs}")
                self.assertFalse(obs[0] == finish["x"] and obs[1] == finish["y"], f"Level {lvl_id} finish on obstacle {obs}")

            # Allowed blocks
            self.assertTrue(len(lvl["allowed_blocks"]) > 0)
            for b in lvl["allowed_blocks"]:
                self.assertIn(b, VALID_BLOCK_TYPES, f"Level {lvl_id} invalid block {b}")

    def test_level_progression_chaining(self):
        self.assertEqual(LEVELS[1]["next_level"], 2)
        self.assertEqual(LEVELS[2]["next_level"], 3)
        self.assertEqual(LEVELS[3]["next_level"], 4)
        self.assertIsNone(LEVELS[4]["next_level"])


class ViewsTestCase(TestCase):
    def setUp(self):
        self.client = Client()

    def test_home_view(self):
        response = self.client.get(reverse("game:home"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "game/home.html")
        self.assertEqual(len(response.context["levels"]), 4)

    def test_play_valid_levels(self):
        for lvl_id in range(1, 5):
            response = self.client.get(reverse("game:play_level", args=[lvl_id]))
            self.assertEqual(response.status_code, 200)
            self.assertTemplateUsed(response, "game/play.html")
            self.assertEqual(response.context["level"]["id"], lvl_id)
            self.assertEqual(response.context["total_levels"], 4)

    def test_play_invalid_level_404(self):
        response = self.client.get(reverse("game:play_level", args=[99]))
        self.assertEqual(response.status_code, 404)
