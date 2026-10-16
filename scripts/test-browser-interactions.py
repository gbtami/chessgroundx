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


    def test_study_chapter_shapes_replace_without_stale_svg(self):
        """A chapter switch must replace arrows, circles and automatic hints."""
        self.make_board({'fen': '8/8/8/8/8/8/8/8',
                         'drawable': {'enabled': True},
                         'animation': {'enabled': False}})
        self.page.evaluate("""() => {
            cg.setShapes([{orig:'d1',dest:'g5',brush:'green'}]);
            cg.setAutoShapes([{orig:'a1',brush:'red'}]);
        }""")
        self.page.wait_for_timeout(80)
        self.assertEqual(self.page.evaluate('cg.state.drawable.shapes.length'), 1)
        self.assertEqual(self.page.evaluate('cg.state.drawable.autoShapes.length'), 1)
        old_svg = self.page.locator('svg.cg-shapes g').inner_html()
        self.assertTrue(old_svg)
        self.page.evaluate("""() => {
            cg.setShapes([{orig:'h8',brush:'blue'}]);
            cg.setAutoShapes([]);
        }""")
        self.page.wait_for_timeout(80)
        self.assertEqual(self.page.evaluate('cg.state.drawable.shapes.map(s=>s.orig)'), ['h8'])
        self.assertEqual(self.page.evaluate('cg.state.drawable.autoShapes.length'), 0)
        self.assertNotEqual(self.page.locator('svg.cg-shapes g').inner_html(), old_svg)
        self.page.evaluate('cg.setShapes([])')
        self.page.wait_for_timeout(80)
        self.assertEqual(self.page.locator('svg.cg-shapes g').inner_html(), '')

    def test_study_annotation_redraws_on_rotation(self):
        """Rotating the standalone board preserves and repositions annotations."""
        self.make_board({'fen': '8/8/8/8/8/8/8/R7',
                         'drawable': {'enabled': True},
                         'movable': {'color': 'white', 'free': True},
                         'animation': {'enabled': False}})
        self.page.evaluate("""() => cg.setShapes([{orig:'d1',dest:'g5',brush:'green'}])""")
        self.page.wait_for_timeout(80)
        svg_before = self.page.locator('svg.cg-shapes g').inner_html()
        self.page.evaluate('cg.toggleOrientation()')
        self.page.wait_for_timeout(80)
        self.assertEqual(self.page.evaluate('cg.state.drawable.shapes.length'), 1)
        self.assertNotEqual(self.page.locator('svg.cg-shapes g').inner_html(), svg_before)

    def enable_touch(self):
        """Use Chromium's touch-enabled context, not mouse event emulation."""
        self.page.close()
        self.touch_context = self.browser.new_context(
            viewport={'width': 1100, 'height': 950}, has_touch=True, is_mobile=True,
        )
        self.page = self.touch_context.new_page()
        self.page.set_content('''<style>body { margin: 0; }</style>
            <div id="board" style="width: 800px; height: 800px; position: relative;"></div>
            <div id="top" style="width:400px;height:60px;position:relative"></div><div id="bottom" style="width:400px;height:60px;position:relative"></div>''')
        self.page.add_style_tag(path=str(ROOT / 'assets/chessground.base.css'))
        self.page.add_style_tag(content='#bottom square {display:block;width:60px;height:60px;position:relative} #bottom piece {display:block;width:60px;height:60px;position:relative;pointer-events:auto}')
        self.page.add_script_tag(path=str(ROOT / 'dist/chessground.js'))
        self.addCleanup(self.touch_context.close)

    def touch_drag(self, src, dst):
        """Send trusted touchStart/touchMove/touchEnd via Chromium CDP."""
        session = self.page.context.new_cdp_session(self.page)
        def dispatch(kind, x, y):
            session.send('Input.dispatchTouchEvent', {
                'type': kind,
                'touchPoints': [] if kind == 'touchEnd' else [{'x': x, 'y': y, 'id': 1}],
            })
        dispatch('touchStart', *src)
        self.page.wait_for_timeout(120)
        for step in range(1, 13):
            fraction = step / 12
            dispatch('touchMove', src[0] + (dst[0] - src[0]) * fraction,
                     src[1] + (dst[1] - src[1]) * fraction)
            self.page.wait_for_timeout(20)
        dispatch('touchEnd', *dst)
        self.page.wait_for_timeout(150)
        session.detach()

    def test_trusted_touch_move(self):
        self.enable_touch()
        self.make_board({'fen':'8/8/8/8/8/8/8/R7',
                         'movable':{'color':'white','free':True},
                         'animation':{'enabled':False}})
        self.touch_drag(self.square(1, 1), self.square(1, 2))
        self.assertEqual(self.page.evaluate('cg.getFen()'), '8/8/8/8/8/8/R7/8')

    def test_trusted_touch_16x16_move(self):
        self.enable_touch()
        fen = '/'.join(['16'] * 15 + ['R15'])
        self.make_board({'fen':fen, 'dimensions':{'width':16,'height':16},
                         'movable':{'color':'white','free':True},
                         'animation':{'enabled':False}})
        self.touch_drag(self.square(1, 1, 16, 16), self.square(1, 16, 16, 16))
        self.assertEqual(self.page.evaluate("cg.state.boardState.pieces.get('a@')?.role"), 'r-piece')
        self.assertFalse(self.page.evaluate("cg.state.boardState.pieces.has('a1')"))

    def test_trusted_touch_pocket_drag(self):
        self.enable_touch()
        self.make_board({'fen':'8/8/8/8/8/8/8/8[R]',
                         'pocketRoles':{'white':['r-piece'],'black':[]},
                         'movable':{'color':'white','free':True},
                         'animation':{'enabled':False}}, pockets=True)
        rect = self.page.locator('#bottom piece[data-role="r-piece"]').bounding_box()
        self.assertIsNotNone(rect)
        self.touch_drag((rect['x'] + rect['width']/2, rect['y'] + rect['height']/2), self.square(3,3))
        self.assertEqual(self.page.evaluate("cg.state.boardState.pieces.get('c3')?.role"), 'r-piece')
        self.assertEqual(self.page.evaluate("cg.state.boardState.pockets.white.get('r-piece')"), 0)

    def test_mini_pocket_drag_after_orientation_redraw(self):
        self.page.evaluate("document.getElementById('board').classList.add('mini')")
        self.page.add_style_tag(content='''
            pocketbottom, pockettop {position:absolute;top:820px;width:60px;height:60px}
            pocketbottom {left:0} pockettop {left:80px}
            .pocket square, .pocket piece {display:block;position:relative;width:60px;height:60px;pointer-events:auto}
        ''')
        self.make_board({'fen':'8/8/8/8/8/8/8/8[Rr]',
                         'pocketRoles':{'white':['r-piece'],'black':['r-piece']},
                         'turnColor':'black', 'movable':{'color':'black','free':True},
                         'animation':{'enabled':False}})
        self.page.evaluate('cg.toggleOrientation()')
        self.page.wait_for_timeout(80)
        source = self.page.locator('pocketbottom piece[data-color="black"]')
        rect = source.bounding_box()
        self.assertIsNotNone(rect)
        self.move((rect['x'] + rect['width']/2, rect['y'] + rect['height']/2),
                  self.square(3,3,orientation='black'))
        self.assertEqual(self.page.evaluate("cg.state.boardState.pieces.get('c3')?.color"), 'black')
        self.assertEqual(self.page.evaluate("cg.state.boardState.pockets.black.get('r-piece')"), 0)

    def test_external_pocket_drag_after_repeated_redraw(self):
        self.make_board({'fen':'8/8/8/8/8/8/8/8[R]',
                         'pocketRoles':{'white':['r-piece'],'black':[]},
                         'movable':{'color':'white','free':True},
                         'animation':{'enabled':False}}, pockets=True)
        self.page.evaluate('''() => {
            cg.toggleOrientation(); cg.toggleOrientation(); cg.redrawAll();
            window.dropCount = 0;
            cg.set({movable:{events:{afterNewPiece:() => window.dropCount++}}});
        }''')
        rect = self.page.locator('#bottom piece[data-role="r-piece"]').bounding_box()
        self.assertIsNotNone(rect)
        self.move((rect['x'] + rect['width']/2, rect['y'] + rect['height']/2), self.square(4,4))
        self.assertEqual(self.page.evaluate("cg.state.boardState.pieces.get('d4')?.role"), 'r-piece')
        self.assertEqual(self.page.evaluate('dropCount'), 1)

    def test_trusted_touch_rectangular_board_black_orientation(self):
        self.enable_touch()
        self.page.evaluate("document.getElementById('board').style.width = '900px'")
        fen = '/'.join(['9'] * 9 + ['R8'])
        self.make_board({'fen':fen, 'dimensions':{'width':9,'height':10},
                         'orientation':'black', 'movable':{'color':'white','free':True},
                         'animation':{'enabled':False}})
        self.touch_drag((850,40), (50,760))
        self.assertEqual(self.page.evaluate("cg.state.boardState.pieces.get('i:')?.role"), 'r-piece')
        self.assertFalse(self.page.evaluate("cg.state.boardState.pieces.has('a1')"))

    def test_trusted_drag_with_js_hover_on_rank_16(self):
        fen = '/'.join(['16'] * 15 + ['R15'])
        self.make_board({'fen':fen, 'dimensions':{'width':16,'height':16},
                         'jsHover':True, 'movable':{'color':'white','free':False},
                         'animation':{'enabled':False}})
        self.page.evaluate("cg.set({movable:{dests:new Map([['a1',['p@']]])}})")
        self.page.mouse.move(*self.square(1,1,16,16))
        self.page.mouse.down()
        self.page.mouse.move(*self.square(16,16,16,16), steps=12)
        self.page.wait_for_timeout(100)
        self.assertEqual(self.page.locator('square.move-dest.hover[data-key="p@"]:visible').count(), 1)
        self.page.mouse.up()
        self.page.wait_for_timeout(80)
        self.assertEqual(self.page.evaluate("cg.state.boardState.pieces.get('p@')?.role"), 'r-piece')


if __name__ == '__main__':
    unittest.main(verbosity=2)
