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

    def test_label_geometry_and_literal_text(self):
        for width, height, corner in [(8, 8, 'h8'), (9, 10, 'i:'), (16, 16, 'p@')]:
            with self.subTest(dimensions=(width, height)):
                self.page.locator('#board').evaluate(
                    '(el, size) => { el.style.width = size[0] + "px"; el.style.height = size[1] + "px"; }',
                    [width * 50, height * 50],
                )
                self.make_board({'fen': '/'.join([str(width)] * height),
                                 'dimensions': {'width': width, 'height': height},
                                 'animation': {'enabled': False}})
                self.page.evaluate('''corner => {
                    cg.setShapes([{orig:corner, brush:'blue', label:{text:'<svg onload="bad()"/> & A'}}]);
                    cg.state.dom.redrawNow();
                }''', corner)
                label = self.page.locator('g.cg-label')
                self.assertEqual(label.locator('text').text_content(), '<svg onload="bad()"/> & A')
                self.assertEqual(label.locator('svg, script').count(), 0)
                for orientation in ['white', 'black']:
                    self.page.evaluate('orientation => cg.set({orientation})', orientation)
                    self.page.wait_for_timeout(40)
                    box = label.locator('circle').bounding_box()
                    board = self.page.locator('cg-board').bounding_box()
                    expected_x = board['x'] + (width - 0.5 if orientation == 'white' else 0.5) * 50
                    expected_y = board['y'] + (0.5 if orientation == 'white' else height - 0.5) * 50
                    self.assertAlmostEqual(box['x'] + box['width'] / 2, expected_x, delta=0.2)
                    self.assertAlmostEqual(box['y'] + box['height'] / 2, expected_y, delta=0.2)
                self.page.evaluate('cg.destroy()')

    def test_labels_preserve_trusted_arrow_toggle_and_overlay_cleanup(self):
        self.make_board({'fen': '8/8/8/8/8/8/8/8',
                         'drawable': {'enabled': True, 'defaultSnapToValidMove': False},
                         'animation': {'enabled': False}})
        self.page.evaluate('''() => {
            cg.setShapes([{orig:'a1', dest:'h8', brush:'green', label:{text:'A'}}]);
            cg.setAutoShapes([{orig:'b2', label:{text:'B'}}]);
            cg.state.dom.redrawNow();
        }''')
        self.assertEqual(self.page.locator('g.cg-label').count(), 2)
        self.move(self.square(1, 1), self.square(8, 8), button='right')
        self.assertEqual(self.page.evaluate('cg.state.drawable.shapes'), [])
        self.assertEqual(self.page.locator('g.cg-label').count(), 1)
        self.page.evaluate('cg.setAutoShapes([])')
        self.page.wait_for_timeout(40)
        self.assertEqual(self.page.locator('g.cg-label').count(), 0)

    def test_pending_erase_pointer_preview_cancel_and_commit(self):
        for width, height, corner, orientation in [(8, 8, 'h8', 'white'), (9, 10, 'i:', 'black'), (16, 16, 'p@', 'white')]:
            with self.subTest(dimensions=(width, height), orientation=orientation):
                self.make_board({'fen': '/'.join([str(width)] * height),
                                 'dimensions': {'width': width, 'height': height},
                                 'orientation': orientation,
                                 'drawable': {'previewErase': True, 'defaultSnapToValidMove': False},
                                 'animation': {'enabled': False}})
                self.page.evaluate('''corner => {
                    window.annotation = {orig:'a1',dest:corner,brush:'green',below:true,
                        modifiers:{hilite:'#fff'},label:{text:'A'}};
                    window.changes=0;
                    cg.set({drawable:{onChange:()=>window.changes++}});
                    cg.setShapes([annotation]); cg.state.dom.redrawNow();
                    window.originalShape=JSON.stringify(annotation);
                    window.originalLine=document.querySelector('.cg-shapes-below .cg-hilite').innerHTML;
                }''', corner)
                src = self.square(1, 1, width, height, orientation)
                dst = self.square(width, height, width, height, orientation)
                self.page.mouse.move(*src)
                self.page.mouse.down(button='right')
                self.page.mouse.move(*dst, steps=12)
                self.page.wait_for_timeout(80)
                self.assertEqual(self.page.locator('.cg-shapes-below .cg-hilite').get_attribute('opacity'), '0.6')
                self.assertEqual(self.page.locator('.cg-shapes-below .cg-hilite').inner_html(), self.page.evaluate('originalLine'))
                self.assertEqual(self.page.locator('.cg-custom-below > g > g').get_attribute('opacity'), '0.6')
                self.assertEqual(self.page.locator('.cg-shapes > g > line').count(), 0)
                self.assertEqual(self.page.evaluate('changes'), 0)
                self.page.mouse.move(*self.square(2, 1, width, height, orientation), steps=6)
                self.page.wait_for_timeout(60)
                self.assertEqual(self.page.locator('.cg-shapes-below .cg-hilite').get_attribute('opacity'), '1')
                self.assertEqual(self.page.locator('.cg-shapes > g > line').count(), 1)
                self.page.mouse.move(*dst, steps=6)
                self.page.wait_for_timeout(60)
                self.assertEqual(self.page.locator('.cg-shapes-below .cg-hilite').get_attribute('opacity'), '0.6')
                # A second pointer start cancels the active drawing using existing input semantics.
                self.page.mouse.down(button='left')
                self.page.mouse.up(button='left')
                self.page.mouse.up(button='right')
                self.page.wait_for_timeout(60)
                self.assertFalse(self.page.evaluate('!!cg.state.drawable.current'))
                self.assertEqual(self.page.locator('.cg-shapes-below .cg-hilite').get_attribute('opacity'), '1')
                self.assertIsNone(self.page.locator('.cg-custom-below > g > g').get_attribute('opacity'))
                self.assertEqual(self.page.evaluate('JSON.stringify(annotation)'), self.page.evaluate('originalShape'))
                self.assertEqual(self.page.evaluate('changes'), 0)
                self.move(src, dst, button='right')
                self.assertEqual(self.page.evaluate('changes'), 1)
                self.assertEqual(self.page.evaluate('cg.state.drawable.shapes.length'), 0)
                self.assertEqual(self.page.locator('svg [cgHash*="pendingErase"]').count(), 0)
                self.page.evaluate('cg.destroy()')

    def test_pending_erase_trusted_touch_cancel_and_multitouch_rejection(self):
        self.enable_touch()
        self.make_board({'fen': '8/8/8/8/8/8/8/8',
                         'drawable': {'previewErase': True, 'defaultSnapToValidMove': False},
                         'animation': {'enabled': False}})
        self.page.evaluate('''() => {
            window.changes=0; window.trustedTouch=false;
            document.querySelector('cg-board').addEventListener('touchstart',e=>window.trustedTouch=e.isTrusted);
            cg.set({drawable:{onChange:()=>window.changes++}});
            cg.setShapes([{orig:'a1',brush:'green'}]);
        }''')
        session = self.page.context.new_cdp_session(self.page)
        x, y = self.square(1, 1)
        def dispatch(kind, points):
            session.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': points, 'modifiers': 8})
            self.page.wait_for_timeout(80)
        single = [{'x': x, 'y': y, 'id': 1}]
        dispatch('touchStart', single)
        self.assertTrue(self.page.evaluate('trustedTouch'))
        self.assertEqual(self.page.locator('.cg-shapes > g > circle').get_attribute('opacity'), '0.6')
        dispatch('touchCancel', [])
        self.assertFalse(self.page.evaluate('!!cg.state.drawable.current'))
        self.assertEqual(self.page.locator('.cg-shapes > g > circle').get_attribute('opacity'), '1')
        self.assertEqual(self.page.evaluate('changes'), 0)
        dispatch('touchStart', single + [{'x': x + 50, 'y': y, 'id': 2}])
        self.assertFalse(self.page.evaluate('!!cg.state.drawable.current'))
        self.assertEqual(self.page.locator('.cg-shapes > g > circle').get_attribute('opacity'), '1')
        dispatch('touchCancel', [])
        dispatch('touchStart', single)
        self.assertEqual(self.page.locator('.cg-shapes > g > circle').get_attribute('opacity'), '0.6')
        dispatch('touchEnd', [])
        self.assertEqual(self.page.evaluate('changes'), 1)
        self.assertEqual(self.page.evaluate('cg.state.drawable.shapes.length'), 0)
        session.detach()

    def test_below_svg_layers_do_not_intercept_piece_moves(self):
        self.make_board({'fen': '8/8/8/8/8/8/8/R7',
                         'movable': {'color': 'white', 'free': True},
                         'animation': {'enabled': False}})
        self.page.evaluate('''() => {
            cg.setAutoShapes([
                {orig:'a1', below:true, customSvg:'<rect width="100" height="100" fill="#ff0"/>'},
                {orig:'a1', dest:'h8', below:true, brush:'green', modifiers:{hilite:'#fff'}, label:{text:'A'}}
            ]);
            cg.state.dom.redrawNow();
        }''')
        stacking = self.page.evaluate('''() => {
            const els = [cg.state.dom.elements.svgBelow, cg.state.dom.elements.customSvgBelow];
            const piece = document.querySelector('cg-board piece');
            const result = els.map(el => {
                const s=getComputedStyle(el); return {position:s.position,pointerEvents:s.pointerEvents,zIndex:s.zIndex};
            });
            for (const el of [...els,piece]) el.style.pointerEvents='all';
            const r=piece.getBoundingClientRect();
            for (const fading of [false,true]) {
                piece.classList.toggle('fading', fading);
                const stack=document.elementsFromPoint(r.x+r.width/2,r.y+r.height/2);
                if (stack.indexOf(piece) < 0 || els.some(el => stack.indexOf(el) < 0 || stack.indexOf(el) < stack.indexOf(piece)))
                    throw Error('SVG covers piece or stacking sample is incomplete');
            }
            piece.classList.remove('fading');
            for (const el of [...els,piece]) el.style.removeProperty('pointer-events');
            return result;
        }''')
        self.assertEqual(stacking, [{'position': 'absolute', 'pointerEvents': 'none', 'zIndex': '0'}] * 2)
        self.move(self.square(1, 1), self.square(1, 2))
        self.assertEqual(self.page.evaluate("cg.state.boardState.pieces.get('a2')?.role"), 'r-piece')
        self.assertEqual(self.page.locator('svg.cg-custom-below .cg-label').count(), 1)
        self.page.evaluate('cg.setAutoShapes([])')
        self.page.wait_for_timeout(40)
        self.assertEqual(self.page.locator('svg.cg-shapes-below > g > *').count(), 0)
        self.assertEqual(self.page.locator('svg.cg-custom-below > g > *').count(), 0)

    def test_below_layer_geometry_after_resize_and_rotation(self):
        for width, height, corner in [(8, 8, 'h8'), (9, 10, 'i:'), (16, 16, 'p@')]:
            with self.subTest(dimensions=(width, height)):
                self.page.locator('#board').evaluate(
                    '(el, size) => { el.style.width=size[0]+"px"; el.style.height=size[1]+"px"; }',
                    [width * 50, height * 50],
                )
                self.make_board({'fen': '/'.join([str(width)] * height),
                                 'dimensions': {'width': width, 'height': height},
                                 'animation': {'enabled': False}})
                self.page.evaluate('''corner => {
                    cg.setShapes([
                        {orig:corner,below:true,brush:'blue',modifiers:{hilite:'#fff'},label:{text:'A'}},
                        {orig:corner,below:true,customSvg:'<rect width="100" height="100" fill="#fc0"/>'}
                    ]);
                    cg.state.dom.redrawNow();
                }''', corner)
                for orientation in ['white', 'black']:
                    self.page.evaluate('orientation => cg.set({orientation})', orientation)
                    self.page.locator('#board').evaluate(
                        '(el, size) => { el.style.width=size[0]+"px"; el.style.height=size[1]+"px"; }',
                        [width * 40, height * 40],
                    )
                    self.page.evaluate('cg.redrawAll()')
                    board = self.page.locator('cg-board').bounding_box()
                    rect = self.page.locator('svg.cg-custom-below svg rect').bounding_box()
                    circle = self.page.locator('svg.cg-shapes-below .cg-hilite circle').first.bounding_box()
                    x = board['x'] + (width - 1 if orientation == 'white' else 0) * board['width'] / width
                    y = board['y'] + (0 if orientation == 'white' else height - 1) * board['height'] / height
                    self.assertAlmostEqual(rect['x'], x, delta=0.2)
                    self.assertAlmostEqual(rect['y'], y, delta=0.2)
                    self.assertAlmostEqual(rect['width'], board['width'] / width, delta=0.2)
                    self.assertAlmostEqual(circle['x'] + circle['width'] / 2, x + rect['width'] / 2, delta=0.2)
                    self.assertAlmostEqual(circle['y'] + circle['height'] / 2, y + rect['height'] / 2, delta=0.2)
                self.page.evaluate('cg.destroy()')

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
