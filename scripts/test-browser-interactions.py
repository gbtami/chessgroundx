#!/usr/bin/env python3
"""Local Chromium regressions for trusted ChessgroundX pointer events.

Prerequisites: Python playwright, an installed Chromium, and `pnpm run dist`.
Run: python scripts/test-browser-interactions.py
No web server, external requests, or production PyChess connection is used.
"""
import os
from pathlib import Path
import unittest

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class BrowserInteractions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(
            executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
            headless=True, args=['--no-sandbox'],
        )

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def setUp(self):
        self.page = self.browser.new_page(viewport={'width': 1100, 'height': 950})
        self.page.set_content('''<style>body { margin: 0; }</style>
            <div id="board" style="width: 800px; height: 800px; position: relative;"></div>
            <div id="top" style="width:400px;height:60px;position:relative"></div><div id="bottom" style="width:400px;height:60px;position:relative"></div>''')
        self.page.add_style_tag(path=str(ROOT / 'assets/chessground.base.css'))
        self.page.add_style_tag(content='#bottom square {display:block;width:60px;height:60px;position:relative} #bottom piece {display:block;width:60px;height:60px;position:relative;pointer-events:auto}')
        self.page.add_script_tag(path=str(ROOT / 'dist/chessground.js'))

    def tearDown(self):
        self.page.close()

    def make_board(self, config, pockets=False):
        self.page.evaluate('''({ config, pockets }) => {
            window.cg = Chessground(document.getElementById('board'), config,
                pockets ? document.getElementById('top') : undefined,
                pockets ? document.getElementById('bottom') : undefined);
        }''', {'config': config, 'pockets': pockets})
        self.page.wait_for_timeout(80)

    def square(self, file, rank, width=8, height=8, orientation='white'):
        x = file - 1 if orientation == 'white' else width - file
        y = height - rank if orientation == 'white' else rank - 1
        return (800 * (x + 0.5) / width, 800 * (y + 0.5) / height)

    def move(self, src, dst, button='left'):
        self.page.mouse.move(*src)
        self.page.mouse.down(button=button)
        self.page.mouse.move(*dst, steps=12)
        self.page.wait_for_timeout(100)
        self.page.mouse.up(button=button)
        self.page.wait_for_timeout(80)

    def test_trusted_piece_drag(self):
        self.make_board({'fen':'8/8/8/8/8/8/8/R7',
                         'movable': {'color':'white','free':True},
                         'animation': {'enabled':False}})
        self.move(self.square(1,1), self.square(1,2))
        self.assertEqual(self.page.evaluate('cg.getFen()'), '8/8/8/8/8/8/R7/8')

    def test_trusted_16x16_drag(self):
        fen = '/'.join(['16'] * 15 + ['R15'])
        self.make_board({'fen':fen, 'dimensions':{'width':16,'height':16},
                         'movable':{'color':'white','free':True},
                         'animation':{'enabled':False}})
        self.move(self.square(1,1,16,16), self.square(1,16,16,16))
        self.assertEqual(self.page.evaluate("cg.state.boardState.pieces.get('a@')?.role"), 'r-piece')
        self.assertFalse(self.page.evaluate("cg.state.boardState.pieces.has('a1')"))

    def test_trusted_right_mouse_arrow_and_orientation(self):
        self.make_board({'fen':'8/8/8/8/8/8/8/8','drawable':{'enabled':True,'defaultSnapToValidMove':False},
                         'animation':{'enabled':False}})
        self.move(self.square(4,1), self.square(7,5), button='right')
        self.assertEqual(self.page.evaluate('cg.state.drawable.shapes.map(s=>[s.orig,s.dest])'), [['d1','g5']])
        before = self.page.locator('svg.cg-shapes g').inner_html()
        self.page.evaluate('cg.toggleOrientation()')
        self.page.wait_for_timeout(90)
        self.assertEqual(self.page.evaluate('cg.state.drawable.shapes.map(s=>[s.orig,s.dest])'), [['d1','g5']])
        after = self.page.locator('svg.cg-shapes g').inner_html()
        self.assertNotEqual(before, after, 'arrow SVG coordinates must update on flip')
        self.page.evaluate('cg.toggleOrientation()')
        self.page.wait_for_timeout(90)
        self.assertEqual(self.page.locator('svg.cg-shapes g').inner_html(), before)

    def test_trusted_pocket_drag(self):
        self.make_board({'fen':'8/8/8/8/8/8/8/8[R]',
                         'pocketRoles':{'white':['r-piece'],'black':[]},
                         'movable':{'color':'white','free':True},
                         'animation':{'enabled':False}}, pockets=True)
        source = self.page.locator('#bottom piece[data-role="r-piece"]')
        self.assertEqual(source.get_attribute('data-nb'), '1')
        rect = source.bounding_box()
        self.assertIsNotNone(rect)
        self.move((rect['x'] + rect['width']/2, rect['y'] + rect['height']/2), self.square(3,3))
        self.assertEqual(self.page.evaluate("cg.state.boardState.pieces.get('c3')?.role"), 'r-piece')
        self.assertEqual(self.page.evaluate("cg.state.boardState.pockets.white.get('r-piece')"), 0)


    def test_trusted_pocket_drag_rejected_on_occupied_square(self):
        self.make_board({'fen':'8/8/8/8/8/8/8/R7[R]',
                         'pocketRoles':{'white':['r-piece'],'black':[]},
                         'movable':{'color':'white','free':True},
                         'animation':{'enabled':False}}, pockets=True)
        rect = self.page.locator('#bottom piece[data-role="r-piece"]').bounding_box()
        self.assertIsNotNone(rect)
        self.move((rect['x'] + rect['width']/2, rect['y'] + rect['height']/2), self.square(1,1))
        self.assertEqual(self.page.evaluate("cg.state.boardState.pieces.get('a1')?.role"), 'r-piece')
        self.assertEqual(self.page.evaluate("cg.state.boardState.pockets.white.get('r-piece')"), 1)
        self.assertFalse(self.page.evaluate("cg.state.boardState.pieces.has('a0')"))


if __name__ == '__main__':
    unittest.main(verbosity=2)
