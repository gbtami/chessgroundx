(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Chessground = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
function anim(mutation, state) {
    return state.animation.enabled ? animate(mutation, state) : render(mutation, state);
}
exports.anim = anim;
function render(mutation, state) {
    const result = mutation(state);
    state.dom.redraw();
    return result;
}
exports.render = render;
function makePiece(key, piece, firstRankIs0) {
    return {
        key: key,
        pos: util.key2pos(key, firstRankIs0),
        piece: piece
    };
}
function closer(piece, pieces) {
    return pieces.sort((p1, p2) => {
        return util.distanceSq(piece.pos, p1.pos) - util.distanceSq(piece.pos, p2.pos);
    })[0];
}
function computePlan(prevPieces, current) {
    const firstRankIs0 = current.dimensions.height === 10;
    const anims = {}, animedOrigs = [], fadings = {}, missings = [], news = [], prePieces = {};
    let curP, preP, i, vector;
    for (i in prevPieces) {
        prePieces[i] = makePiece(i, prevPieces[i], firstRankIs0);
    }
    for (const key of util.allKeys[current.geometry]) {
        curP = current.pieces[key];
        preP = prePieces[key];
        if (curP) {
            if (preP) {
                if (!util.samePiece(curP, preP.piece)) {
                    missings.push(preP);
                    news.push(makePiece(key, curP, firstRankIs0));
                }
            }
            else
                news.push(makePiece(key, curP, firstRankIs0));
        }
        else if (preP)
            missings.push(preP);
    }
    news.forEach(newP => {
        preP = closer(newP, missings.filter(p => util.samePiece(newP.piece, p.piece)));
        if (preP) {
            vector = [preP.pos[0] - newP.pos[0], preP.pos[1] - newP.pos[1]];
            anims[newP.key] = vector.concat(vector);
            animedOrigs.push(preP.key);
        }
    });
    missings.forEach(p => {
        if (!util.containsX(animedOrigs, p.key))
            fadings[p.key] = p.piece;
    });
    return {
        anims: anims,
        fadings: fadings
    };
}
function step(state, now) {
    const cur = state.animation.current;
    if (cur === undefined) {
        if (!state.dom.destroyed)
            state.dom.redrawNow();
        return;
    }
    const rest = 1 - (now - cur.start) * cur.frequency;
    if (rest <= 0) {
        state.animation.current = undefined;
        state.dom.redrawNow();
    }
    else {
        const ease = easing(rest);
        for (let i in cur.plan.anims) {
            const cfg = cur.plan.anims[i];
            cfg[2] = cfg[0] * ease;
            cfg[3] = cfg[1] * ease;
        }
        state.dom.redrawNow(true);
        requestAnimationFrame((now = performance.now()) => step(state, now));
    }
}
function animate(mutation, state) {
    const prevPieces = Object.assign({}, state.pieces);
    const result = mutation(state);
    const plan = computePlan(prevPieces, state);
    if (!isObjectEmpty(plan.anims) || !isObjectEmpty(plan.fadings)) {
        const alreadyRunning = state.animation.current && state.animation.current.start;
        state.animation.current = {
            start: performance.now(),
            frequency: 1 / state.animation.duration,
            plan: plan
        };
        if (!alreadyRunning)
            step(state, performance.now());
    }
    else {
        state.dom.redraw();
    }
    return result;
}
function isObjectEmpty(o) {
    for (let _ in o)
        return false;
    return true;
}
function easing(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

},{"./util":18}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const board = require("./board");
const fen_1 = require("./fen");
const config_1 = require("./config");
const anim_1 = require("./anim");
const drag_1 = require("./drag");
const explosion_1 = require("./explosion");
function start(state, redrawAll) {
    function toggleOrientation() {
        board.toggleOrientation(state);
        redrawAll();
    }
    ;
    return {
        set(config) {
            if (config.orientation && config.orientation !== state.orientation)
                toggleOrientation();
            (config.fen ? anim_1.anim : anim_1.render)(state => config_1.configure(state, config), state);
        },
        state,
        getFen: () => fen_1.write(state.pieces, state.geometry),
        toggleOrientation,
        setPieces(pieces) {
            anim_1.anim(state => board.setPieces(state, pieces), state);
        },
        selectSquare(key, force) {
            if (key)
                anim_1.anim(state => board.selectSquare(state, key, force), state);
            else if (state.selected) {
                board.unselect(state);
                state.dom.redraw();
            }
        },
        move(orig, dest) {
            anim_1.anim(state => board.baseMove(state, orig, dest), state);
        },
        newPiece(piece, key) {
            anim_1.anim(state => board.baseNewPiece(state, piece, key), state);
        },
        playPremove() {
            if (state.premovable.current) {
                if (anim_1.anim(board.playPremove, state))
                    return true;
                state.dom.redraw();
            }
            return false;
        },
        playPredrop(validate) {
            if (state.predroppable.current) {
                const result = board.playPredrop(state, validate);
                state.dom.redraw();
                return result;
            }
            return false;
        },
        cancelPremove() {
            anim_1.render(board.unsetPremove, state);
        },
        cancelPredrop() {
            anim_1.render(board.unsetPredrop, state);
        },
        cancelMove() {
            anim_1.render(state => { board.cancelMove(state); drag_1.cancel(state); }, state);
        },
        stop() {
            anim_1.render(state => { board.stop(state); drag_1.cancel(state); }, state);
        },
        explode(keys) {
            explosion_1.default(state, keys);
        },
        setAutoShapes(shapes) {
            anim_1.render(state => state.drawable.autoShapes = shapes, state);
        },
        setShapes(shapes) {
            anim_1.render(state => state.drawable.shapes = shapes, state);
        },
        getKeyAtDomPos(pos) {
            return board.getKeyAtDomPos(pos, board.whitePov(state), state.dom.bounds(), state.geometry);
        },
        redrawAll,
        dragNewPiece(piece, event, force) {
            drag_1.dragNewPiece(state, piece, event, force);
        },
        destroy() {
            board.stop(state);
            state.dom.unbind && state.dom.unbind();
            state.dom.destroyed = true;
        }
    };
}
exports.start = start;

},{"./anim":1,"./board":3,"./config":5,"./drag":6,"./explosion":10,"./fen":11}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const premove_1 = require("./premove");
const cg = require("./types");
function callUserFunction(f, ...args) {
    if (f)
        setTimeout(() => f(...args), 1);
}
exports.callUserFunction = callUserFunction;
function toggleOrientation(state) {
    state.orientation = util_1.opposite(state.orientation);
    state.animation.current =
        state.draggable.current =
            state.selected = undefined;
}
exports.toggleOrientation = toggleOrientation;
function reset(state) {
    state.lastMove = undefined;
    unselect(state);
    unsetPremove(state);
    unsetPredrop(state);
}
exports.reset = reset;
function setPieces(state, pieces) {
    for (let key in pieces) {
        const piece = pieces[key];
        if (piece)
            state.pieces[key] = piece;
        else
            delete state.pieces[key];
    }
}
exports.setPieces = setPieces;
function setCheck(state, color) {
    state.check = undefined;
    if (color === true)
        color = state.turnColor;
    if (color)
        for (let k in state.pieces) {
            if (state.pieces[k].role === 'king' && state.pieces[k].color === color) {
                state.check = k;
            }
        }
}
exports.setCheck = setCheck;
function setPremove(state, orig, dest, meta) {
    unsetPredrop(state);
    state.premovable.current = [orig, dest];
    callUserFunction(state.premovable.events.set, orig, dest, meta);
}
function unsetPremove(state) {
    if (state.premovable.current) {
        state.premovable.current = undefined;
        callUserFunction(state.premovable.events.unset);
    }
}
exports.unsetPremove = unsetPremove;
function setPredrop(state, role, key) {
    unsetPremove(state);
    state.predroppable.current = { role, key };
    callUserFunction(state.predroppable.events.set, role, key);
}
function unsetPredrop(state) {
    const pd = state.predroppable;
    if (pd.current) {
        pd.current = undefined;
        callUserFunction(pd.events.unset);
    }
}
exports.unsetPredrop = unsetPredrop;
function tryAutoCastle(state, orig, dest) {
    if (!state.autoCastle)
        return false;
    const king = state.pieces[orig];
    if (!king || king.role !== 'king')
        return false;
    const firstRankIs0 = state.dimensions.height === 10;
    const origPos = util_1.key2pos(orig, firstRankIs0);
    if (origPos[0] !== 5)
        return false;
    if (origPos[1] !== 1 && origPos[1] !== 8)
        return false;
    const destPos = util_1.key2pos(dest, firstRankIs0);
    let oldRookPos, newRookPos, newKingPos;
    if (destPos[0] === 7 || destPos[0] === 8) {
        oldRookPos = util_1.pos2key([8, origPos[1]], state.geometry);
        newRookPos = util_1.pos2key([6, origPos[1]], state.geometry);
        newKingPos = util_1.pos2key([7, origPos[1]], state.geometry);
    }
    else if (destPos[0] === 3 || destPos[0] === 1) {
        oldRookPos = util_1.pos2key([1, origPos[1]], state.geometry);
        newRookPos = util_1.pos2key([4, origPos[1]], state.geometry);
        newKingPos = util_1.pos2key([3, origPos[1]], state.geometry);
    }
    else
        return false;
    const rook = state.pieces[oldRookPos];
    if (!rook || rook.role !== 'rook')
        return false;
    delete state.pieces[orig];
    delete state.pieces[oldRookPos];
    state.pieces[newKingPos] = king;
    state.pieces[newRookPos] = rook;
    return true;
}
function baseMove(state, orig, dest) {
    const origPiece = state.pieces[orig], destPiece = state.pieces[dest];
    if (orig === dest || !origPiece)
        return false;
    const captured = (destPiece && destPiece.color !== origPiece.color) ? destPiece : undefined;
    if (dest == state.selected)
        unselect(state);
    callUserFunction(state.events.move, orig, dest, captured);
    if (!tryAutoCastle(state, orig, dest)) {
        state.pieces[dest] = origPiece;
        delete state.pieces[orig];
    }
    state.lastMove = [orig, dest];
    state.check = undefined;
    callUserFunction(state.events.change);
    return captured || true;
}
exports.baseMove = baseMove;
function baseNewPiece(state, piece, key, force) {
    if (state.pieces[key]) {
        if (force)
            delete state.pieces[key];
        else
            return false;
    }
    callUserFunction(state.events.dropNewPiece, piece, key);
    state.pieces[key] = piece;
    state.lastMove = [key];
    state.check = undefined;
    callUserFunction(state.events.change);
    state.movable.dests = undefined;
    state.turnColor = util_1.opposite(state.turnColor);
    return true;
}
exports.baseNewPiece = baseNewPiece;
function baseUserMove(state, orig, dest) {
    const result = baseMove(state, orig, dest);
    if (result) {
        state.movable.dests = undefined;
        state.turnColor = util_1.opposite(state.turnColor);
        state.animation.current = undefined;
    }
    return result;
}
function userMove(state, orig, dest) {
    if (canMove(state, orig, dest)) {
        const result = baseUserMove(state, orig, dest);
        if (result) {
            const holdTime = state.hold.stop();
            unselect(state);
            const metadata = {
                premove: false,
                ctrlKey: state.stats.ctrlKey,
                holdTime
            };
            if (result !== true)
                metadata.captured = result;
            callUserFunction(state.movable.events.after, orig, dest, metadata);
            return true;
        }
    }
    else if (canPremove(state, orig, dest)) {
        setPremove(state, orig, dest, {
            ctrlKey: state.stats.ctrlKey
        });
        unselect(state);
        return true;
    }
    unselect(state);
    return false;
}
exports.userMove = userMove;
function dropNewPiece(state, orig, dest, force) {
    if (canDrop(state, orig, dest) || force) {
        const piece = state.pieces[orig];
        delete state.pieces[orig];
        baseNewPiece(state, piece, dest, force);
        callUserFunction(state.movable.events.afterNewPiece, piece.role, dest, {
            predrop: false
        });
    }
    else if (canPredrop(state, orig, dest)) {
        setPredrop(state, state.pieces[orig].role, dest);
    }
    else {
        unsetPremove(state);
        unsetPredrop(state);
    }
    delete state.pieces[orig];
    unselect(state);
}
exports.dropNewPiece = dropNewPiece;
function selectSquare(state, key, force) {
    callUserFunction(state.events.select, key);
    if (state.selected) {
        if (state.selected === key && !state.draggable.enabled) {
            unselect(state);
            state.hold.cancel();
            return;
        }
        else if ((state.selectable.enabled || force) && state.selected !== key) {
            if (userMove(state, state.selected, key)) {
                state.stats.dragged = false;
                return;
            }
        }
    }
    if (isMovable(state, key) || isPremovable(state, key)) {
        setSelected(state, key);
        state.hold.start();
    }
}
exports.selectSquare = selectSquare;
function setSelected(state, key) {
    state.selected = key;
    if (isPremovable(state, key)) {
        state.premovable.dests = premove_1.default(state.pieces, key, state.premovable.castle, state.geometry, state.variant);
    }
    else
        state.premovable.dests = undefined;
}
exports.setSelected = setSelected;
function unselect(state) {
    state.selected = undefined;
    state.premovable.dests = undefined;
    state.hold.cancel();
}
exports.unselect = unselect;
function isMovable(state, orig) {
    const piece = state.pieces[orig];
    return !!piece && (state.movable.color === 'both' || (state.movable.color === piece.color &&
        state.turnColor === piece.color));
}
function canMove(state, orig, dest) {
    return orig !== dest && isMovable(state, orig) && (state.movable.free || (!!state.movable.dests && util_1.containsX(state.movable.dests[orig], dest)));
}
exports.canMove = canMove;
function canDrop(state, orig, dest) {
    const piece = state.pieces[orig];
    return !!piece && dest && (orig === dest || !state.pieces[dest]) && (state.movable.color === 'both' || (state.movable.color === piece.color &&
        state.turnColor === piece.color));
}
function isPremovable(state, orig) {
    const piece = state.pieces[orig];
    return !!piece && state.premovable.enabled &&
        state.movable.color === piece.color &&
        state.turnColor !== piece.color;
}
function canPremove(state, orig, dest) {
    return orig !== dest &&
        isPremovable(state, orig) &&
        util_1.containsX(premove_1.default(state.pieces, orig, state.premovable.castle, state.geometry, state.variant), dest);
}
function canPredrop(state, orig, dest) {
    const piece = state.pieces[orig];
    const destPiece = state.pieces[dest];
    return !!piece && dest &&
        (!destPiece || destPiece.color !== state.movable.color) &&
        state.predroppable.enabled &&
        (piece.role !== 'pawn' || (dest[1] !== '1' && dest[1] !== '8')) &&
        state.movable.color === piece.color &&
        state.turnColor !== piece.color;
}
function isDraggable(state, orig) {
    const piece = state.pieces[orig];
    return !!piece && state.draggable.enabled && (state.movable.color === 'both' || (state.movable.color === piece.color && (state.turnColor === piece.color || state.premovable.enabled)));
}
exports.isDraggable = isDraggable;
function playPremove(state) {
    const move = state.premovable.current;
    if (!move)
        return false;
    const orig = move[0], dest = move[1];
    let success = false;
    if (canMove(state, orig, dest)) {
        const result = baseUserMove(state, orig, dest);
        if (result) {
            const metadata = { premove: true };
            if (result !== true)
                metadata.captured = result;
            callUserFunction(state.movable.events.after, orig, dest, metadata);
            success = true;
        }
    }
    unsetPremove(state);
    return success;
}
exports.playPremove = playPremove;
function playPredrop(state, validate) {
    let drop = state.predroppable.current, success = false;
    if (!drop)
        return false;
    if (validate(drop)) {
        const piece = {
            role: drop.role,
            color: state.movable.color
        };
        if (baseNewPiece(state, piece, drop.key)) {
            callUserFunction(state.movable.events.afterNewPiece, drop.role, drop.key, {
                predrop: true
            });
            success = true;
        }
    }
    unsetPredrop(state);
    return success;
}
exports.playPredrop = playPredrop;
function cancelMove(state) {
    unsetPremove(state);
    unsetPredrop(state);
    unselect(state);
}
exports.cancelMove = cancelMove;
function stop(state) {
    state.movable.color =
        state.movable.dests =
            state.animation.current = undefined;
    cancelMove(state);
}
exports.stop = stop;
function getKeyAtDomPos(pos, asWhite, bounds, geom) {
    const bd = cg.dimensions[geom];
    let file = Math.ceil(bd.width * ((pos[0] - bounds.left) / bounds.width));
    if (!asWhite)
        file = bd.width + 1 - file;
    let rank = Math.ceil(bd.height - (bd.height * ((pos[1] - bounds.top) / bounds.height)));
    if (!asWhite)
        rank = bd.height + 1 - rank;
    return (file > 0 && file < bd.width + 1 && rank > 0 && rank < bd.height + 1) ? util_1.pos2key([file, rank], geom) : undefined;
}
exports.getKeyAtDomPos = getKeyAtDomPos;
function whitePov(s) {
    return s.orientation === 'white';
}
exports.whitePov = whitePov;

},{"./premove":13,"./types":17,"./util":18}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("./api");
const config_1 = require("./config");
const state_1 = require("./state");
const wrap_1 = require("./wrap");
const events = require("./events");
const render_1 = require("./render");
const svg = require("./svg");
const util = require("./util");
function Chessground(element, config) {
    const state = state_1.defaults();
    config_1.configure(state, config || {});
    function redrawAll() {
        let prevUnbind = state.dom && state.dom.unbind;
        const relative = state.viewOnly && !state.drawable.visible, elements = wrap_1.default(element, state, relative), bounds = util.memo(() => elements.board.getBoundingClientRect()), redrawNow = (skipSvg) => {
            render_1.default(state);
            if (!skipSvg && elements.svg)
                svg.renderSvg(state, elements.svg);
        };
        state.dom = {
            elements,
            bounds,
            redraw: debounceRedraw(redrawNow),
            redrawNow,
            unbind: prevUnbind,
            relative
        };
        state.drawable.prevSvgHash = '';
        redrawNow(false);
        events.bindBoard(state);
        if (!prevUnbind)
            state.dom.unbind = events.bindDocument(state, redrawAll);
        state.events.insert && state.events.insert(elements);
    }
    redrawAll();
    return api_1.start(state, redrawAll);
}
exports.Chessground = Chessground;
;
function debounceRedraw(redrawNow) {
    let redrawing = false;
    return () => {
        if (redrawing)
            return;
        redrawing = true;
        requestAnimationFrame(() => {
            redrawNow();
            redrawing = false;
        });
    };
}

},{"./api":2,"./config":5,"./events":9,"./render":14,"./state":15,"./svg":16,"./util":18,"./wrap":19}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const board_1 = require("./board");
const fen_1 = require("./fen");
const cg = require("./types");
function configure(state, config) {
    if (config.movable && config.movable.dests)
        state.movable.dests = undefined;
    merge(state, config);
    if (config.geometry)
        state.dimensions = cg.dimensions[config.geometry];
    if (config.fen) {
        state.pieces = fen_1.read(config.fen, state.geometry);
        state.drawable.shapes = [];
    }
    if (config.hasOwnProperty('check'))
        board_1.setCheck(state, config.check || false);
    if (config.hasOwnProperty('lastMove') && !config.lastMove)
        state.lastMove = undefined;
    else if (config.lastMove)
        state.lastMove = config.lastMove;
    if (state.selected)
        board_1.setSelected(state, state.selected);
    if (!state.animation.duration || state.animation.duration < 100)
        state.animation.enabled = false;
    if (!state.movable.rookCastle && state.movable.dests) {
        const rank = state.movable.color === 'white' ? 1 : 8, kingStartPos = 'e' + rank, dests = state.movable.dests[kingStartPos], king = state.pieces[kingStartPos];
        if (!dests || !king || king.role !== 'king')
            return;
        state.movable.dests[kingStartPos] = dests.filter(d => !((d === 'a' + rank) && dests.indexOf('c' + rank) !== -1) &&
            !((d === 'h' + rank) && dests.indexOf('g' + rank) !== -1));
    }
}
exports.configure = configure;
;
function merge(base, extend) {
    for (let key in extend) {
        if (isObject(base[key]) && isObject(extend[key]))
            merge(base[key], extend[key]);
        else
            base[key] = extend[key];
    }
}
function isObject(o) {
    return typeof o === 'object';
}

},{"./board":3,"./fen":11,"./types":17}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const board = require("./board");
const util = require("./util");
const draw_1 = require("./draw");
const anim_1 = require("./anim");
function start(s, e) {
    if (e.button !== undefined && e.button !== 0)
        return;
    if (e.touches && e.touches.length > 1)
        return;
    const bounds = s.dom.bounds(), position = util.eventPosition(e), orig = board.getKeyAtDomPos(position, board.whitePov(s), bounds, s.geometry);
    if (!orig)
        return;
    const piece = s.pieces[orig];
    const previouslySelected = s.selected;
    if (!previouslySelected && s.drawable.enabled && (s.drawable.eraseOnClick || (!piece || piece.color !== s.turnColor)))
        draw_1.clear(s);
    if (e.cancelable !== false &&
        (!e.touches || !s.movable.color || piece || previouslySelected || pieceCloseTo(s, position)))
        e.preventDefault();
    const hadPremove = !!s.premovable.current;
    const hadPredrop = !!s.predroppable.current;
    s.stats.ctrlKey = e.ctrlKey;
    if (s.selected && board.canMove(s, s.selected, orig)) {
        anim_1.anim(state => board.selectSquare(state, orig), s);
    }
    else {
        board.selectSquare(s, orig);
    }
    const stillSelected = s.selected === orig;
    const element = pieceElementByKey(s, orig);
    const firstRankIs0 = s.dimensions.height === 10;
    if (piece && element && stillSelected && board.isDraggable(s, orig)) {
        const squareBounds = computeSquareBounds(orig, board.whitePov(s), bounds, s.dimensions);
        s.draggable.current = {
            orig,
            origPos: util.key2pos(orig, firstRankIs0),
            piece,
            rel: position,
            epos: position,
            pos: [0, 0],
            dec: s.draggable.centerPiece ? [
                position[0] - (squareBounds.left + squareBounds.width / 2),
                position[1] - (squareBounds.top + squareBounds.height / 2)
            ] : [0, 0],
            started: s.draggable.autoDistance && s.stats.dragged,
            element,
            previouslySelected,
            originTarget: e.target
        };
        element.cgDragging = true;
        element.classList.add('dragging');
        const ghost = s.dom.elements.ghost;
        if (ghost) {
            ghost.className = `ghost ${piece.color} ${piece.role}`;
            util.translateAbs(ghost, util.posToTranslateAbs(bounds, s.dimensions)(util.key2pos(orig, firstRankIs0), board.whitePov(s)));
            util.setVisible(ghost, true);
        }
        processDrag(s);
    }
    else {
        if (hadPremove)
            board.unsetPremove(s);
        if (hadPredrop)
            board.unsetPredrop(s);
    }
    s.dom.redraw();
}
exports.start = start;
function pieceCloseTo(s, pos) {
    const asWhite = board.whitePov(s), bounds = s.dom.bounds(), radiusSq = Math.pow(bounds.width / 8, 2);
    for (let key in s.pieces) {
        const squareBounds = computeSquareBounds(key, asWhite, bounds, s.dimensions), center = [
            squareBounds.left + squareBounds.width / 2,
            squareBounds.top + squareBounds.height / 2
        ];
        if (util.distanceSq(center, pos) <= radiusSq)
            return true;
    }
    return false;
}
exports.pieceCloseTo = pieceCloseTo;
function dragNewPiece(s, piece, e, force) {
    const key = 'z0';
    s.pieces[key] = piece;
    s.dom.redraw();
    const position = util.eventPosition(e), asWhite = board.whitePov(s), bounds = s.dom.bounds(), squareBounds = computeSquareBounds(key, asWhite, bounds, s.dimensions);
    const rel = [
        (asWhite ? 0 : s.dimensions.width - 1) * squareBounds.width + bounds.left,
        (asWhite ? s.dimensions.height : -1) * squareBounds.height + bounds.top
    ];
    const firstRankIs0 = s.geometry === 3;
    s.draggable.current = {
        orig: key,
        origPos: util.key2pos('a0', firstRankIs0),
        piece,
        rel,
        epos: position,
        pos: [position[0] - rel[0], position[1] - rel[1]],
        dec: [-squareBounds.width / 2, -squareBounds.height / 2],
        started: true,
        element: () => pieceElementByKey(s, key),
        originTarget: e.target,
        newPiece: true,
        force: !!force
    };
    processDrag(s);
}
exports.dragNewPiece = dragNewPiece;
function processDrag(s) {
    requestAnimationFrame(() => {
        const cur = s.draggable.current;
        if (!cur)
            return;
        if (s.animation.current && s.animation.current.plan.anims[cur.orig])
            s.animation.current = undefined;
        const origPiece = s.pieces[cur.orig];
        if (!origPiece || !util.samePiece(origPiece, cur.piece))
            cancel(s);
        else {
            if (!cur.started && util.distanceSq(cur.epos, cur.rel) >= Math.pow(s.draggable.distance, 2))
                cur.started = true;
            if (cur.started) {
                if (typeof cur.element === 'function') {
                    const found = cur.element();
                    if (!found)
                        return;
                    found.cgDragging = true;
                    found.classList.add('dragging');
                    cur.element = found;
                }
                cur.pos = [
                    cur.epos[0] - cur.rel[0],
                    cur.epos[1] - cur.rel[1]
                ];
                const translation = util.posToTranslateAbs(s.dom.bounds(), s.dimensions)(cur.origPos, board.whitePov(s));
                translation[0] += cur.pos[0] + cur.dec[0];
                translation[1] += cur.pos[1] + cur.dec[1];
                util.translateAbs(cur.element, translation);
            }
        }
        processDrag(s);
    });
}
function move(s, e) {
    if (s.draggable.current && (!e.touches || e.touches.length < 2)) {
        s.draggable.current.epos = util.eventPosition(e);
    }
}
exports.move = move;
function end(s, e) {
    const cur = s.draggable.current;
    if (!cur)
        return;
    if (e.type === 'touchend' && e.cancelable !== false)
        e.preventDefault();
    if (e.type === 'touchend' && cur && cur.originTarget !== e.target && !cur.newPiece) {
        s.draggable.current = undefined;
        return;
    }
    board.unsetPremove(s);
    board.unsetPredrop(s);
    const eventPos = util.eventPosition(e) || cur.epos;
    const dest = board.getKeyAtDomPos(eventPos, board.whitePov(s), s.dom.bounds(), s.geometry);
    if (dest && cur.started && cur.orig !== dest) {
        if (cur.newPiece)
            board.dropNewPiece(s, cur.orig, dest, cur.force);
        else {
            s.stats.ctrlKey = e.ctrlKey;
            if (board.userMove(s, cur.orig, dest))
                s.stats.dragged = true;
        }
    }
    else if (cur.newPiece) {
        delete s.pieces[cur.orig];
    }
    else if (s.draggable.deleteOnDropOff && !dest) {
        delete s.pieces[cur.orig];
        board.callUserFunction(s.events.change);
    }
    if (cur && cur.orig === cur.previouslySelected && (cur.orig === dest || !dest))
        board.unselect(s);
    else if (!s.selectable.enabled)
        board.unselect(s);
    removeDragElements(s);
    s.draggable.current = undefined;
    s.dom.redraw();
}
exports.end = end;
function cancel(s) {
    const cur = s.draggable.current;
    if (cur) {
        if (cur.newPiece)
            delete s.pieces[cur.orig];
        s.draggable.current = undefined;
        board.unselect(s);
        removeDragElements(s);
        s.dom.redraw();
    }
}
exports.cancel = cancel;
function removeDragElements(s) {
    const e = s.dom.elements;
    if (e.ghost)
        util.setVisible(e.ghost, false);
}
function computeSquareBounds(key, asWhite, bounds, bd) {
    const firstRankIs0 = bd.height === 10;
    const pos = util.key2pos(key, firstRankIs0);
    if (!asWhite) {
        pos[0] = bd.width + 1 - pos[0];
        pos[1] = bd.height + 1 - pos[1];
    }
    return {
        left: bounds.left + bounds.width * (pos[0] - 1) / bd.width,
        top: bounds.top + bounds.height * (bd.height - pos[1]) / bd.height,
        width: bounds.width / bd.width,
        height: bounds.height / bd.height
    };
}
function pieceElementByKey(s, key) {
    let el = s.dom.elements.board.firstChild;
    while (el) {
        if (el.cgKey === key && el.tagName === 'PIECE')
            return el;
        el = el.nextSibling;
    }
    return undefined;
}

},{"./anim":1,"./board":3,"./draw":7,"./util":18}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const board_1 = require("./board");
const util_1 = require("./util");
const brushes = ['green', 'red', 'blue', 'yellow'];
function start(state, e) {
    if (e.touches && e.touches.length > 1)
        return;
    e.stopPropagation();
    e.preventDefault();
    e.ctrlKey ? board_1.unselect(state) : board_1.cancelMove(state);
    const pos = util_1.eventPosition(e), orig = board_1.getKeyAtDomPos(pos, board_1.whitePov(state), state.dom.bounds(), state.geometry);
    if (!orig)
        return;
    state.drawable.current = {
        orig,
        pos,
        brush: eventBrush(e)
    };
    processDraw(state);
}
exports.start = start;
function processDraw(state) {
    requestAnimationFrame(() => {
        const cur = state.drawable.current;
        if (cur) {
            const mouseSq = board_1.getKeyAtDomPos(cur.pos, board_1.whitePov(state), state.dom.bounds(), state.geometry);
            if (mouseSq !== cur.mouseSq) {
                cur.mouseSq = mouseSq;
                cur.dest = mouseSq !== cur.orig ? mouseSq : undefined;
                state.dom.redrawNow();
            }
            processDraw(state);
        }
    });
}
exports.processDraw = processDraw;
function move(state, e) {
    if (state.drawable.current)
        state.drawable.current.pos = util_1.eventPosition(e);
}
exports.move = move;
function end(state) {
    const cur = state.drawable.current;
    if (cur) {
        if (cur.mouseSq)
            addShape(state.drawable, cur);
        cancel(state);
    }
}
exports.end = end;
function cancel(state) {
    if (state.drawable.current) {
        state.drawable.current = undefined;
        state.dom.redraw();
    }
}
exports.cancel = cancel;
function clear(state) {
    if (state.drawable.shapes.length) {
        state.drawable.shapes = [];
        state.dom.redraw();
        onChange(state.drawable);
    }
}
exports.clear = clear;
function eventBrush(e) {
    return brushes[((e.shiftKey || e.ctrlKey) && util_1.isRightButton(e) ? 1 : 0) + (e.altKey ? 2 : 0)];
}
function addShape(drawable, cur) {
    const sameShape = (s) => s.orig === cur.orig && s.dest === cur.dest;
    const similar = drawable.shapes.filter(sameShape)[0];
    if (similar)
        drawable.shapes = drawable.shapes.filter(s => !sameShape(s));
    if (!similar || similar.brush !== cur.brush)
        drawable.shapes.push(cur);
    onChange(drawable);
}
function onChange(drawable) {
    if (drawable.onChange)
        drawable.onChange(drawable.shapes);
}

},{"./board":3,"./util":18}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const board = require("./board");
const util = require("./util");
const drag_1 = require("./drag");
function setDropMode(s, piece) {
    s.dropmode = {
        active: true,
        piece
    };
    drag_1.cancel(s);
}
exports.setDropMode = setDropMode;
function cancelDropMode(s) {
    s.dropmode = {
        active: false
    };
}
exports.cancelDropMode = cancelDropMode;
function drop(s, e) {
    if (!s.dropmode.active)
        return;
    board.unsetPremove(s);
    board.unsetPredrop(s);
    const piece = s.dropmode.piece;
    if (piece) {
        s.pieces.z0 = piece;
        const position = util.eventPosition(e);
        const dest = position && board.getKeyAtDomPos(position, board.whitePov(s), s.dom.bounds(), s.geometry);
        if (dest)
            board.dropNewPiece(s, 'z0', dest);
    }
    s.dom.redraw();
}
exports.drop = drop;

},{"./board":3,"./drag":6,"./util":18}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const drag = require("./drag");
const draw = require("./draw");
const drop_1 = require("./drop");
const util_1 = require("./util");
function bindBoard(s) {
    if (s.viewOnly)
        return;
    const boardEl = s.dom.elements.board, onStart = startDragOrDraw(s);
    boardEl.addEventListener('touchstart', onStart, { passive: false });
    boardEl.addEventListener('mousedown', onStart, { passive: false });
    if (s.disableContextMenu || s.drawable.enabled) {
        boardEl.addEventListener('contextmenu', e => e.preventDefault());
    }
}
exports.bindBoard = bindBoard;
function bindDocument(s, redrawAll) {
    const unbinds = [];
    if (!s.dom.relative && s.resizable) {
        const onResize = () => {
            s.dom.bounds.clear();
            requestAnimationFrame(redrawAll);
        };
        unbinds.push(unbindable(document.body, 'chessground.resize', onResize));
    }
    if (!s.viewOnly) {
        const onmove = dragOrDraw(s, drag.move, draw.move);
        const onend = dragOrDraw(s, drag.end, draw.end);
        ['touchmove', 'mousemove'].forEach(ev => unbinds.push(unbindable(document, ev, onmove)));
        ['touchend', 'mouseup'].forEach(ev => unbinds.push(unbindable(document, ev, onend)));
        const onScroll = () => s.dom.bounds.clear();
        unbinds.push(unbindable(window, 'scroll', onScroll, { passive: true }));
        unbinds.push(unbindable(window, 'resize', onScroll, { passive: true }));
    }
    return () => unbinds.forEach(f => f());
}
exports.bindDocument = bindDocument;
function unbindable(el, eventName, callback, options) {
    el.addEventListener(eventName, callback, options);
    return () => el.removeEventListener(eventName, callback);
}
function startDragOrDraw(s) {
    return e => {
        if (s.draggable.current)
            drag.cancel(s);
        else if (s.drawable.current)
            draw.cancel(s);
        else if (e.shiftKey || util_1.isRightButton(e)) {
            if (s.drawable.enabled)
                draw.start(s, e);
        }
        else if (!s.viewOnly) {
            if (s.dropmode.active)
                drop_1.drop(s, e);
            else
                drag.start(s, e);
        }
    };
}
function dragOrDraw(s, withDrag, withDraw) {
    return e => {
        if (e.shiftKey || util_1.isRightButton(e)) {
            if (s.drawable.enabled)
                withDraw(s, e);
        }
        else if (!s.viewOnly)
            withDrag(s, e);
    };
}

},{"./drag":6,"./draw":7,"./drop":8,"./util":18}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function explosion(state, keys) {
    state.exploding = { stage: 1, keys };
    state.dom.redraw();
    setTimeout(() => {
        setStage(state, 2);
        setTimeout(() => setStage(state, undefined), 120);
    }, 120);
}
exports.default = explosion;
function setStage(state, stage) {
    if (state.exploding) {
        if (stage)
            state.exploding.stage = stage;
        else
            state.exploding = undefined;
        state.dom.redraw();
    }
}

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const cg = require("./types");
exports.initial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const rolesVariants = {
    p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', q: 'queen', k: 'king', m: 'met', f: 'ferz', s: 'silver', c: 'cancellor', a: 'archbishop', h: 'hawk', e: 'elephant'
};
const rolesShogi = {
    p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', k: 'king', g: 'gold', s: 'silver', l: 'lance'
};
const rolesXiangqi = {
    p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', k: 'king', c: 'cannon', a: 'advisor'
};
const lettersVariants = {
    pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', queen: 'q', king: 'k', met: 'm', ferz: 'f', silver: 's', cancellor: 'c', archbishop: 'a', hawk: 'h', elephant: 'e'
};
const lettersShogi = {
    pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', king: 'k', gold: 'g', silver: 's', lance: 'l',
    ppawn: '+p', pknight: '+n', pbishop: '+b', prook: '+r', psilver: '+s', plance: '+l'
};
const lettersXiangqi = {
    pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', king: 'k', cannon: 'c', advisor: 'a'
};
function read(fen, geom) {
    if (fen === 'start')
        fen = exports.initial;
    if (fen.indexOf('[') !== -1)
        fen = fen.slice(0, fen.indexOf('['));
    const pieces = {};
    let row = fen.split("/").length;
    let col = 0;
    let promoted = false;
    const roles = (geom === 3 || geom === 6) ? rolesXiangqi : (geom === 1 || geom === 5) ? rolesShogi : rolesVariants;
    const firstRankIs0 = row === 10;
    const shogi = (row === 9 || row === 5);
    const miniShogi = row === 5;
    for (const c of fen) {
        switch (c) {
            case ' ': return pieces;
            case '/':
                --row;
                if (row === 0)
                    return pieces;
                col = 0;
                break;
            case '+':
                promoted = true;
                break;
            case '~':
                const piece = pieces[cg.files[col] + cg.ranks[firstRankIs0 ? row : row + 1]];
                if (piece)
                    piece.promoted = true;
                break;
            default:
                const nb = c.charCodeAt(0);
                if (nb < 58)
                    col += (c === '0') ? 9 : nb - 48;
                else {
                    ++col;
                    const role = c.toLowerCase();
                    let piece = {
                        role: roles[role],
                        color: (c === role ? shogi ? 'white' : 'black' : shogi ? 'black' : 'white')
                    };
                    if (promoted) {
                        piece.role = 'p' + piece.role;
                        piece.promoted = true;
                        promoted = false;
                    }
                    ;
                    if (miniShogi) {
                        pieces[cg.files[6 - col - 1] + cg.ranks[6 - row]] = piece;
                    }
                    else if (shogi) {
                        pieces[cg.files[10 - col - 1] + cg.ranks[10 - row]] = piece;
                    }
                    else {
                        pieces[cg.files[col - 1] + cg.ranks[firstRankIs0 ? row - 1 : row]] = piece;
                    }
                    ;
                }
        }
    }
    return pieces;
}
exports.read = read;
function write(pieces, geom) {
    var letters = {};
    switch (geom) {
        case 6:
        case 3:
            letters = lettersXiangqi;
            break;
        case 5:
        case 1:
            letters = lettersShogi;
            break;
        default:
            letters = lettersVariants;
            break;
    }
    ;
    return util_1.invNRanks.map(y => util_1.NRanks.map(x => {
        const piece = pieces[util_1.pos2key([x, y], geom)];
        if (piece) {
            const letter = letters[piece.role];
            return piece.color === 'white' ? letter.toUpperCase() : letter;
        }
        else
            return '1';
    }).join('')).join('/').replace(/1{2,}/g, s => s.length.toString());
}
exports.write = write;

},{"./types":17,"./util":18}],12:[function(require,module,exports){
module.exports = require("./chessground").Chessground;

},{"./chessground":4}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
const cg = require("./types");
function diff(a, b) {
    return Math.abs(a - b);
}
function pawn(color) {
    return (x1, y1, x2, y2) => diff(x1, x2) < 2 && (color === 'white' ? (y2 === y1 + 1 || (y1 <= 2 && y2 === (y1 + 2) && x1 === x2)) : (y2 === y1 - 1 || (y1 >= 7 && y2 === (y1 - 2) && x1 === x2)));
}
const knight = (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    const yd = diff(y1, y2);
    return (xd === 1 && yd === 2) || (xd === 2 && yd === 1);
};
const bishop = (x1, y1, x2, y2) => {
    return diff(x1, x2) === diff(y1, y2);
};
const rook = (x1, y1, x2, y2) => {
    return x1 === x2 || y1 === y2;
};
const queen = (x1, y1, x2, y2) => {
    return bishop(x1, y1, x2, y2) || rook(x1, y1, x2, y2);
};
function king(color, rookFiles, canCastle) {
    return (x1, y1, x2, y2) => (diff(x1, x2) < 2 && diff(y1, y2) < 2) || (canCastle && y1 === y2 && y1 === (color === 'white' ? 1 : 8) && ((x1 === 5 && (x2 === 3 || x2 === 7)) || util.containsX(rookFiles, x2)));
}
const met = (x1, y1, x2, y2) => {
    return diff(x1, x2) === diff(y1, y2) && diff(x1, x2) === 1;
};
const archbishop = (x1, y1, x2, y2) => {
    return bishop(x1, y1, x2, y2) || knight(x1, y1, x2, y2);
};
const cancellor = (x1, y1, x2, y2) => {
    return rook(x1, y1, x2, y2) || knight(x1, y1, x2, y2);
};
function lance(color) {
    return (x1, y1, x2, y2) => (x2 === x1 && (color === 'white' ? y2 > y1 : y2 < y1));
}
function silver(color) {
    return (x1, y1, x2, y2) => (met(x1, y1, x2, y2) || (x1 === x2 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1)));
}
function gold(color) {
    return (x1, y1, x2, y2) => (diff(x1, x2) < 2 && diff(y1, y2) < 2 && (color === 'white' ?
        !((x2 === x1 - 1 && y2 === y1 - 1) || (x2 === x1 + 1 && y2 === y1 - 1)) :
        !((x2 === x1 + 1 && y2 === y1 + 1) || (x2 === x1 - 1 && y2 === y1 + 1))));
}
function spawn(color) {
    return (x1, y1, x2, y2) => (x2 === x1 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1));
}
function sknight(color) {
    return (x1, y1, x2, y2) => color === 'white' ?
        (y2 === y1 + 2 && x2 === x1 - 1 || y2 === y1 + 2 && x2 === x1 + 1) :
        (y2 === y1 - 2 && x2 === x1 - 1 || y2 === y1 - 2 && x2 === x1 + 1);
}
const prook = (x1, y1, x2, y2) => {
    return rook(x1, y1, x2, y2) || (diff(x1, x2) < 2 && diff(y1, y2) < 2);
};
const pbishop = (x1, y1, x2, y2) => {
    return bishop(x1, y1, x2, y2) || (diff(x1, x2) < 2 && diff(y1, y2) < 2);
};
const sking = (x1, y1, x2, y2) => {
    return diff(x1, x2) < 2 && diff(y1, y2) < 2;
};
function xpawn(color) {
    return (x1, y1, x2, y2) => ((x2 === x1 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1)) ||
        (y2 === y1 && (x2 === x1 + 1 || x2 === x1 - 1) && (color === 'white' ? y1 > 5 : y1 < 6)));
}
const xbishop = (x1, y1, x2, y2) => {
    return diff(x1, x2) === diff(y1, y2) && diff(x1, x2) === 2;
};
const advisor = (x1, y1, x2, y2) => {
    return diff(x1, x2) === diff(y1, y2) && diff(x1, x2) === 1;
};
const xking = (x1, y1, x2, y2) => {
    return (x1 === x2 || y1 === y2) && diff(x1, x2) === 1;
};
const shakoElephant = (x1, y1, x2, y2) => {
    return diff(x1, x2) === diff(y1, y2) && (diff(x1, x2) === 1 || diff(x1, x2) === 2);
};
function rookFilesOf(pieces, color, firstRankIs0) {
    return Object.keys(pieces).filter(key => {
        const piece = pieces[key];
        return piece && piece.color === color && piece.role === 'rook';
    }).map((key) => util.key2pos(key, firstRankIs0)[0]);
}
function premove(pieces, key, canCastle, geom, variant) {
    const firstRankIs0 = cg.dimensions[geom].height === 10;
    const piece = pieces[key], pos = util.key2pos(key, firstRankIs0);
    let mobility;
    switch (geom) {
        case 6:
        case 3:
            switch (piece.role) {
                case 'pawn':
                    mobility = xpawn(piece.color);
                    break;
                case 'cannon':
                case 'rook':
                    mobility = rook;
                    break;
                case 'knight':
                    mobility = knight;
                    break;
                case 'bishop':
                    mobility = xbishop;
                    break;
                case 'advisor':
                    mobility = advisor;
                    break;
                case 'king':
                    mobility = xking;
                    break;
            }
            ;
            break;
        case 5:
        case 1:
            switch (piece.role) {
                case 'pawn':
                    mobility = spawn(piece.color);
                    break;
                case 'knight':
                    mobility = sknight(piece.color);
                    break;
                case 'bishop':
                    mobility = bishop;
                    break;
                case 'rook':
                    mobility = rook;
                    break;
                case 'king':
                    mobility = sking;
                    break;
                case 'silver':
                    mobility = silver(piece.color);
                    break;
                case 'ppawn':
                case 'plance':
                case 'pknight':
                case 'psilver':
                case 'gold':
                    mobility = gold(piece.color);
                    break;
                case 'lance':
                    mobility = lance(piece.color);
                    break;
                case 'prook':
                    mobility = prook;
                    break;
                case 'pbishop':
                    mobility = pbishop;
                    break;
            }
            ;
            break;
        default:
            switch (piece.role) {
                case 'pawn':
                    mobility = pawn(piece.color);
                    break;
                case 'knight':
                    mobility = knight;
                    break;
                case 'bishop':
                    mobility = bishop;
                    break;
                case 'rook':
                    mobility = rook;
                    break;
                case 'queen':
                    mobility = queen;
                    break;
                case 'king':
                    mobility = king(piece.color, rookFilesOf(pieces, piece.color, firstRankIs0), canCastle);
                    break;
                case 'hawk':
                case 'archbishop':
                    mobility = archbishop;
                    break;
                case 'elephant':
                    if (variant === 'shako') {
                        mobility = shakoElephant;
                    }
                    else {
                        mobility = cancellor;
                    }
                    break;
                case 'cancellor':
                    if (variant === 'shako') {
                        mobility = rook;
                    }
                    else {
                        mobility = cancellor;
                    }
                    break;
                case 'met':
                case 'ferz':
                    mobility = met;
                    break;
                case 'silver':
                    mobility = silver(piece.color);
                    break;
            }
            ;
            break;
    }
    ;
    const allkeys = util.allKeys[geom];
    const pos2keyGeom = (geom) => ((pos) => util.pos2key(pos, geom));
    const pos2key = pos2keyGeom(geom);
    const key2posRank0 = (firstrank0) => ((key) => util.key2pos(key, firstrank0));
    const key2pos = key2posRank0(firstRankIs0);
    return allkeys.map(key2pos).filter(pos2 => {
        return (pos[0] !== pos2[0] || pos[1] !== pos2[1]) && mobility(pos[0], pos[1], pos2[0], pos2[1]);
    }).map(pos2key);
}
exports.default = premove;
;

},{"./types":17,"./util":18}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const board_1 = require("./board");
const util = require("./util");
function render(s) {
    const firstRankIs0 = s.dimensions.height === 10;
    const asWhite = board_1.whitePov(s), posToTranslate = s.dom.relative ? util.posToTranslateRel : util.posToTranslateAbs(s.dom.bounds(), s.dimensions), translate = s.dom.relative ? util.translateRel : util.translateAbs, boardEl = s.dom.elements.board, pieces = s.pieces, curAnim = s.animation.current, anims = curAnim ? curAnim.plan.anims : {}, fadings = curAnim ? curAnim.plan.fadings : {}, curDrag = s.draggable.current, squares = computeSquareClasses(s), samePieces = {}, sameSquares = {}, movedPieces = {}, movedSquares = {}, piecesKeys = Object.keys(pieces);
    let k, p, el, pieceAtKey, elPieceName, anim, fading, pMvdset, pMvd, sMvdset, sMvd;
    el = boardEl.firstChild;
    while (el) {
        k = el.cgKey;
        if (isPieceNode(el)) {
            pieceAtKey = pieces[k];
            anim = anims[k];
            fading = fadings[k];
            elPieceName = el.cgPiece;
            if (el.cgDragging && (!curDrag || curDrag.orig !== k)) {
                el.classList.remove('dragging');
                translate(el, posToTranslate(util_1.key2pos(k, firstRankIs0), asWhite, s.dimensions));
                el.cgDragging = false;
            }
            if (!fading && el.cgFading) {
                el.cgFading = false;
                el.classList.remove('fading');
            }
            if (pieceAtKey) {
                if (anim && el.cgAnimating && elPieceName === pieceNameOf(pieceAtKey)) {
                    const pos = util_1.key2pos(k, firstRankIs0);
                    pos[0] += anim[2];
                    pos[1] += anim[3];
                    el.classList.add('anim');
                    translate(el, posToTranslate(pos, asWhite, s.dimensions));
                }
                else if (el.cgAnimating) {
                    el.cgAnimating = false;
                    el.classList.remove('anim');
                    translate(el, posToTranslate(util_1.key2pos(k, firstRankIs0), asWhite, s.dimensions));
                    if (s.addPieceZIndex)
                        el.style.zIndex = posZIndex(util_1.key2pos(k, firstRankIs0), asWhite);
                }
                if (elPieceName === pieceNameOf(pieceAtKey) && (!fading || !el.cgFading)) {
                    samePieces[k] = true;
                }
                else {
                    if (fading && elPieceName === pieceNameOf(fading)) {
                        el.classList.add('fading');
                        el.cgFading = true;
                    }
                    else {
                        if (movedPieces[elPieceName])
                            movedPieces[elPieceName].push(el);
                        else
                            movedPieces[elPieceName] = [el];
                    }
                }
            }
            else {
                if (movedPieces[elPieceName])
                    movedPieces[elPieceName].push(el);
                else
                    movedPieces[elPieceName] = [el];
            }
        }
        else if (isSquareNode(el)) {
            const cn = el.className;
            if (squares[k] === cn)
                sameSquares[k] = true;
            else if (movedSquares[cn])
                movedSquares[cn].push(el);
            else
                movedSquares[cn] = [el];
        }
        el = el.nextSibling;
    }
    for (const sk in squares) {
        if (!sameSquares[sk]) {
            sMvdset = movedSquares[squares[sk]];
            sMvd = sMvdset && sMvdset.pop();
            const translation = posToTranslate(util_1.key2pos(sk, firstRankIs0), asWhite, s.dimensions);
            if (sMvd) {
                sMvd.cgKey = sk;
                translate(sMvd, translation);
            }
            else {
                const squareNode = util_1.createEl('square', squares[sk]);
                squareNode.cgKey = sk;
                translate(squareNode, translation);
                boardEl.insertBefore(squareNode, boardEl.firstChild);
            }
        }
    }
    for (const j in piecesKeys) {
        k = piecesKeys[j];
        p = pieces[k];
        anim = anims[k];
        if (!samePieces[k]) {
            pMvdset = movedPieces[pieceNameOf(p)];
            pMvd = pMvdset && pMvdset.pop();
            if (pMvd) {
                pMvd.cgKey = k;
                if (pMvd.cgFading) {
                    pMvd.classList.remove('fading');
                    pMvd.cgFading = false;
                }
                const pos = util_1.key2pos(k, firstRankIs0);
                if (s.addPieceZIndex)
                    pMvd.style.zIndex = posZIndex(pos, asWhite);
                if (anim) {
                    pMvd.cgAnimating = true;
                    pMvd.classList.add('anim');
                    pos[0] += anim[2];
                    pos[1] += anim[3];
                }
                translate(pMvd, posToTranslate(pos, asWhite, s.dimensions));
            }
            else {
                const pieceName = pieceNameOf(p), pieceNode = util_1.createEl('piece', pieceName), pos = util_1.key2pos(k, firstRankIs0);
                pieceNode.cgPiece = pieceName;
                pieceNode.cgKey = k;
                if (anim) {
                    pieceNode.cgAnimating = true;
                    pos[0] += anim[2];
                    pos[1] += anim[3];
                }
                translate(pieceNode, posToTranslate(pos, asWhite, s.dimensions));
                if (s.addPieceZIndex)
                    pieceNode.style.zIndex = posZIndex(pos, asWhite);
                boardEl.appendChild(pieceNode);
            }
        }
    }
    for (const i in movedPieces)
        removeNodes(s, movedPieces[i]);
    for (const i in movedSquares)
        removeNodes(s, movedSquares[i]);
}
exports.default = render;
function isPieceNode(el) {
    return el.tagName === 'PIECE';
}
function isSquareNode(el) {
    return el.tagName === 'SQUARE';
}
function removeNodes(s, nodes) {
    for (const i in nodes)
        s.dom.elements.board.removeChild(nodes[i]);
}
function posZIndex(pos, asWhite) {
    let z = 2 + (pos[1] - 1) * 8 + (8 - pos[0]);
    if (asWhite)
        z = 67 - z;
    return z + '';
}
function pieceNameOf(piece) {
    return `${piece.color} ${piece.role}`;
}
function computeSquareClasses(s) {
    const squares = {};
    let i, k;
    if (s.lastMove && s.highlight.lastMove)
        for (i in s.lastMove) {
            if (s.lastMove[i] != 'z0') {
                addSquare(squares, s.lastMove[i], 'last-move');
            }
        }
    if (s.check && s.highlight.check)
        addSquare(squares, s.check, 'check');
    if (s.selected) {
        if (s.selected != 'z0') {
            addSquare(squares, s.selected, 'selected');
        }
        if (s.movable.showDests) {
            const dests = s.movable.dests && s.movable.dests[s.selected];
            if (dests)
                for (i in dests) {
                    k = dests[i];
                    addSquare(squares, k, 'move-dest' + (s.pieces[k] ? ' oc' : ''));
                }
            const pDests = s.premovable.dests;
            if (pDests)
                for (i in pDests) {
                    k = pDests[i];
                    addSquare(squares, k, 'premove-dest' + (s.pieces[k] ? ' oc' : ''));
                }
        }
    }
    const premove = s.premovable.current;
    if (premove)
        for (i in premove)
            addSquare(squares, premove[i], 'current-premove');
    else if (s.predroppable.current)
        addSquare(squares, s.predroppable.current.key, 'current-premove');
    const o = s.exploding;
    if (o)
        for (i in o.keys)
            addSquare(squares, o.keys[i], 'exploding' + o.stage);
    return squares;
}
function addSquare(squares, key, klass) {
    if (squares[key])
        squares[key] += ' ' + klass;
    else
        squares[key] = klass;
}

},{"./board":3,"./util":18}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fen = require("./fen");
const util_1 = require("./util");
function defaults() {
    return {
        pieces: fen.read(fen.initial, 0),
        orientation: 'white',
        turnColor: 'white',
        coordinates: true,
        autoCastle: true,
        viewOnly: false,
        disableContextMenu: false,
        resizable: true,
        addPieceZIndex: false,
        pieceKey: false,
        highlight: {
            lastMove: true,
            check: true
        },
        animation: {
            enabled: true,
            duration: 200
        },
        movable: {
            free: true,
            color: 'both',
            showDests: true,
            events: {},
            rookCastle: true
        },
        premovable: {
            enabled: true,
            showDests: true,
            castle: true,
            events: {}
        },
        predroppable: {
            enabled: false,
            events: {}
        },
        draggable: {
            enabled: true,
            distance: 3,
            autoDistance: true,
            centerPiece: true,
            showGhost: true,
            deleteOnDropOff: false
        },
        dropmode: {
            active: false
        },
        selectable: {
            enabled: true
        },
        stats: {
            dragged: !('ontouchstart' in window)
        },
        events: {},
        drawable: {
            enabled: true,
            visible: true,
            eraseOnClick: true,
            shapes: [],
            autoShapes: [],
            brushes: {
                green: { key: 'g', color: '#15781B', opacity: 1, lineWidth: 10 },
                red: { key: 'r', color: '#882020', opacity: 1, lineWidth: 10 },
                blue: { key: 'b', color: '#003088', opacity: 1, lineWidth: 10 },
                yellow: { key: 'y', color: '#e68f00', opacity: 1, lineWidth: 10 },
                paleBlue: { key: 'pb', color: '#003088', opacity: 0.4, lineWidth: 15 },
                paleGreen: { key: 'pg', color: '#15781B', opacity: 0.4, lineWidth: 15 },
                paleRed: { key: 'pr', color: '#882020', opacity: 0.4, lineWidth: 15 },
                paleGrey: { key: 'pgr', color: '#4a4a4a', opacity: 0.35, lineWidth: 15 }
            },
            pieces: {
                baseUrl: 'https://lichess1.org/assets/piece/cburnett/'
            },
            prevSvgHash: ''
        },
        hold: util_1.timer(),
        dimensions: { width: 8, height: 8 },
        geometry: 0,
        variant: 'chess',
    };
}
exports.defaults = defaults;

},{"./fen":11,"./util":18}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
function createElement(tagName) {
    return document.createElementNS('http://www.w3.org/2000/svg', tagName);
}
exports.createElement = createElement;
function renderSvg(state, root) {
    const d = state.drawable, curD = d.current, cur = curD && curD.mouseSq ? curD : undefined, arrowDests = {};
    d.shapes.concat(d.autoShapes).concat(cur ? [cur] : []).forEach(s => {
        if (s.dest)
            arrowDests[s.dest] = (arrowDests[s.dest] || 0) + 1;
    });
    const shapes = d.shapes.concat(d.autoShapes).map((s) => {
        return {
            shape: s,
            current: false,
            hash: shapeHash(s, arrowDests, false)
        };
    });
    if (cur)
        shapes.push({
            shape: cur,
            current: true,
            hash: shapeHash(cur, arrowDests, true)
        });
    const fullHash = shapes.map(sc => sc.hash).join('');
    if (fullHash === state.drawable.prevSvgHash)
        return;
    state.drawable.prevSvgHash = fullHash;
    const defsEl = root.firstChild;
    syncDefs(d, shapes, defsEl);
    syncShapes(state, shapes, d.brushes, arrowDests, root, defsEl);
}
exports.renderSvg = renderSvg;
function syncDefs(d, shapes, defsEl) {
    const brushes = {};
    let brush;
    shapes.forEach(s => {
        if (s.shape.dest) {
            brush = d.brushes[s.shape.brush];
            if (s.shape.modifiers)
                brush = makeCustomBrush(brush, s.shape.modifiers);
            brushes[brush.key] = brush;
        }
    });
    const keysInDom = {};
    let el = defsEl.firstChild;
    while (el) {
        keysInDom[el.getAttribute('cgKey')] = true;
        el = el.nextSibling;
    }
    for (let key in brushes) {
        if (!keysInDom[key])
            defsEl.appendChild(renderMarker(brushes[key]));
    }
}
function syncShapes(state, shapes, brushes, arrowDests, root, defsEl) {
    const bounds = state.dom.bounds(), hashesInDom = {}, toRemove = [];
    shapes.forEach(sc => { hashesInDom[sc.hash] = false; });
    let el = defsEl.nextSibling, elHash;
    while (el) {
        elHash = el.getAttribute('cgHash');
        if (hashesInDom.hasOwnProperty(elHash))
            hashesInDom[elHash] = true;
        else
            toRemove.push(el);
        el = el.nextSibling;
    }
    toRemove.forEach(el => root.removeChild(el));
    shapes.forEach(sc => {
        if (!hashesInDom[sc.hash])
            root.appendChild(renderShape(state, sc, brushes, arrowDests, bounds));
    });
}
function shapeHash({ orig, dest, brush, piece, modifiers }, arrowDests, current) {
    return [current, orig, dest, brush, dest && arrowDests[dest] > 1,
        piece && pieceHash(piece),
        modifiers && modifiersHash(modifiers)
    ].filter(x => x).join('');
}
function pieceHash(piece) {
    return [piece.color, piece.role, piece.scale].filter(x => x).join('');
}
function modifiersHash(m) {
    return '' + (m.lineWidth || '');
}
function renderShape(state, { shape, current, hash }, brushes, arrowDests, bounds) {
    const firstRankIs0 = state.dimensions.height === 10;
    let el;
    if (shape.piece)
        el = renderPiece(state.drawable.pieces.baseUrl, orient(util_1.key2pos(shape.orig, firstRankIs0), state.orientation, state.dimensions), shape.piece, bounds, state.dimensions);
    else {
        const orig = orient(util_1.key2pos(shape.orig, firstRankIs0), state.orientation, state.dimensions);
        if (shape.orig && shape.dest) {
            let brush = brushes[shape.brush];
            if (shape.modifiers)
                brush = makeCustomBrush(brush, shape.modifiers);
            el = renderArrow(brush, orig, orient(util_1.key2pos(shape.dest, firstRankIs0), state.orientation, state.dimensions), current, arrowDests[shape.dest] > 1, bounds, state.dimensions);
        }
        else
            el = renderCircle(brushes[shape.brush], orig, current, bounds, state.dimensions);
    }
    el.setAttribute('cgHash', hash);
    return el;
}
function renderCircle(brush, pos, current, bounds, bd) {
    const o = pos2px(pos, bounds, bd), widths = circleWidth(bounds, bd), radius = (bounds.width / bd.width) / 2;
    return setAttributes(createElement('circle'), {
        stroke: brush.color,
        'stroke-width': widths[current ? 0 : 1],
        fill: 'none',
        opacity: opacity(brush, current),
        cx: o[0],
        cy: o[1],
        r: radius - widths[1] / 2
    });
}
function renderArrow(brush, orig, dest, current, shorten, bounds, bd) {
    const m = arrowMargin(bounds, shorten && !current, bd), a = pos2px(orig, bounds, bd), b = pos2px(dest, bounds, bd), dx = b[0] - a[0], dy = b[1] - a[1], angle = Math.atan2(dy, dx), xo = Math.cos(angle) * m, yo = Math.sin(angle) * m;
    return setAttributes(createElement('line'), {
        stroke: brush.color,
        'stroke-width': lineWidth(brush, current, bounds, bd),
        'stroke-linecap': 'round',
        'marker-end': 'url(#arrowhead-' + brush.key + ')',
        opacity: opacity(brush, current),
        x1: a[0],
        y1: a[1],
        x2: b[0] - xo,
        y2: b[1] - yo
    });
}
function renderPiece(baseUrl, pos, piece, bounds, bd) {
    const o = pos2px(pos, bounds, bd), width = bounds.width / bd.width * (piece.scale || 1), height = bounds.width / bd.height * (piece.scale || 1), name = piece.color[0] + (piece.role === 'knight' ? 'n' : piece.role[0]).toUpperCase();
    return setAttributes(createElement('image'), {
        className: `${piece.role} ${piece.color}`,
        x: o[0] - width / 2,
        y: o[1] - height / 2,
        width: width,
        height: height,
        href: baseUrl + name + '.svg'
    });
}
function renderMarker(brush) {
    const marker = setAttributes(createElement('marker'), {
        id: 'arrowhead-' + brush.key,
        orient: 'auto',
        markerWidth: 4,
        markerHeight: 8,
        refX: 2.05,
        refY: 2.01
    });
    marker.appendChild(setAttributes(createElement('path'), {
        d: 'M0,0 V4 L3,2 Z',
        fill: brush.color
    }));
    marker.setAttribute('cgKey', brush.key);
    return marker;
}
function setAttributes(el, attrs) {
    for (let key in attrs)
        el.setAttribute(key, attrs[key]);
    return el;
}
function orient(pos, color, bd) {
    return color === 'white' ? pos : [bd.width + 1 - pos[0], bd.height + 1 - pos[1]];
}
function makeCustomBrush(base, modifiers) {
    const brush = {
        color: base.color,
        opacity: Math.round(base.opacity * 10) / 10,
        lineWidth: Math.round(modifiers.lineWidth || base.lineWidth)
    };
    brush.key = [base.key, modifiers.lineWidth].filter(x => x).join('');
    return brush;
}
function circleWidth(bounds, bd) {
    const base = bounds.width / (bd.width * 64);
    return [3 * base, 4 * base];
}
function lineWidth(brush, current, bounds, bd) {
    return (brush.lineWidth || 10) * (current ? 0.85 : 1) / (bd.width * 64) * bounds.width;
}
function opacity(brush, current) {
    return (brush.opacity || 1) * (current ? 0.9 : 1);
}
function arrowMargin(bounds, shorten, bd) {
    return (shorten ? 20 : 10) / (bd.width * 64) * bounds.width;
}
function pos2px(pos, bounds, bd) {
    return [(pos[0] - 0.5) * bounds.width / bd.width, (bd.height + 0.5 - pos[1]) * bounds.height / bd.height];
}

},{"./util":18}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
exports.ranks = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
;
exports.dimensions = [{ width: 8, height: 8 }, { width: 9, height: 9 }, { width: 10, height: 8 }, { width: 9, height: 10 }, { width: 10, height: 10 }, { width: 5, height: 5 }, { width: 7, height: 7 }];

},{}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cg = require("./types");
exports.colors = ['white', 'black'];
exports.NRanks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
exports.invNRanks = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const files5 = cg.files.slice(0, 5);
const files7 = cg.files.slice(0, 7);
const files8 = cg.files.slice(0, 8);
const files9 = cg.files.slice(0, 9);
const files10 = cg.files.slice(0, 10);
const ranks5 = cg.ranks.slice(1, 6);
const ranks7 = cg.ranks.slice(1, 8);
const ranks8 = cg.ranks.slice(1, 9);
const ranks9 = cg.ranks.slice(1, 10);
const ranks10 = cg.ranks.slice(0, 10);
const allKeys5x5 = Array.prototype.concat(...files5.map(c => ranks5.map(r => c + r)));
const allKeys7x7 = Array.prototype.concat(...files7.map(c => ranks7.map(r => c + r)));
const allKeys8x8 = Array.prototype.concat(...files8.map(c => ranks8.map(r => c + r)));
const allKeys9x9 = Array.prototype.concat(...files9.map(c => ranks9.map(r => c + r)));
const allKeys10x8 = Array.prototype.concat(...files10.map(c => ranks8.map(r => c + r)));
const allKeys9x10 = Array.prototype.concat(...files9.map(c => ranks10.map(r => c + r)));
const allKeys10x10 = Array.prototype.concat(...files10.map(c => ranks10.map(r => c + r)));
exports.allKeys = [allKeys8x8, allKeys9x9, allKeys10x8, allKeys9x10, allKeys10x10, allKeys5x5, allKeys7x7];
function pos2key(pos, geom) {
    const bd = cg.dimensions[geom];
    return exports.allKeys[geom][bd.height * pos[0] + pos[1] - bd.height - 1];
}
exports.pos2key = pos2key;
function key2pos(k, firstRankIs0) {
    const shift = firstRankIs0 ? 1 : 0;
    return [k.charCodeAt(0) - 96, k.charCodeAt(1) - 48 + shift];
}
exports.key2pos = key2pos;
function memo(f) {
    let v;
    const ret = () => {
        if (v === undefined)
            v = f();
        return v;
    };
    ret.clear = () => { v = undefined; };
    return ret;
}
exports.memo = memo;
exports.timer = () => {
    let startAt;
    return {
        start() { startAt = performance.now(); },
        cancel() { startAt = undefined; },
        stop() {
            if (!startAt)
                return 0;
            const time = performance.now() - startAt;
            startAt = undefined;
            return time;
        }
    };
};
exports.opposite = (c) => c === 'white' ? 'black' : 'white';
function containsX(xs, x) {
    return xs !== undefined && xs.indexOf(x) !== -1;
}
exports.containsX = containsX;
exports.distanceSq = (pos1, pos2) => {
    return Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[1] - pos2[1], 2);
};
exports.samePiece = (p1, p2) => p1.role === p2.role && p1.color === p2.color;
const posToTranslateBase = (pos, asWhite, xFactor, yFactor, bt) => [
    (asWhite ? pos[0] - 1 : bt.width - pos[0]) * xFactor,
    (asWhite ? bt.height - pos[1] : pos[1] - 1) * yFactor
];
exports.posToTranslateAbs = (bounds, bt) => {
    const xFactor = bounds.width / bt.width, yFactor = bounds.height / bt.height;
    return (pos, asWhite) => posToTranslateBase(pos, asWhite, xFactor, yFactor, bt);
};
exports.posToTranslateRel = (pos, asWhite, bt) => posToTranslateBase(pos, asWhite, 100 / bt.width, 100 / bt.height, bt);
exports.translateAbs = (el, pos) => {
    el.style.transform = `translate(${pos[0]}px,${pos[1]}px)`;
};
exports.translateRel = (el, percents) => {
    el.style.left = percents[0] + '%';
    el.style.top = percents[1] + '%';
};
exports.setVisible = (el, v) => {
    el.style.visibility = v ? 'visible' : 'hidden';
};
exports.eventPosition = e => {
    if (e.clientX || e.clientX === 0)
        return [e.clientX, e.clientY];
    if (e.touches && e.targetTouches[0])
        return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
    return undefined;
};
exports.isRightButton = (e) => e.buttons === 2 || e.button === 2;
exports.createEl = (tagName, className) => {
    const el = document.createElement(tagName);
    if (className)
        el.className = className;
    return el;
};

},{"./types":17}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const types_1 = require("./types");
const svg_1 = require("./svg");
function wrap(element, s, relative) {
    element.innerHTML = '';
    element.classList.add('cg-wrap');
    util_1.colors.forEach(c => element.classList.toggle('orientation-' + c, s.orientation === c));
    element.classList.toggle('manipulable', !s.viewOnly);
    const helper = util_1.createEl('cg-helper');
    element.appendChild(helper);
    const container = util_1.createEl('cg-container');
    helper.appendChild(container);
    const extension = util_1.createEl('extension');
    container.appendChild(extension);
    const board = util_1.createEl('cg-board');
    container.appendChild(board);
    let svg;
    if (s.drawable.visible && !relative) {
        svg = svg_1.createElement('svg');
        svg.appendChild(svg_1.createElement('defs'));
        container.appendChild(svg);
    }
    if (s.coordinates) {
        const orientClass = s.orientation === 'black' ? ' black' : '';
        const firstRankIs0 = s.dimensions.height === 10;
        const shift = firstRankIs0 ? 0 : 1;
        container.appendChild(renderCoords(types_1.ranks.slice(shift, s.dimensions.height + shift), 'ranks' + orientClass));
        container.appendChild(renderCoords(types_1.files.slice(0, s.dimensions.width), 'files' + orientClass));
    }
    let ghost;
    if (s.draggable.showGhost && !relative) {
        ghost = util_1.createEl('piece', 'ghost');
        util_1.setVisible(ghost, false);
        container.appendChild(ghost);
    }
    return {
        board,
        container,
        ghost,
        svg
    };
}
exports.default = wrap;
function renderCoords(elems, className) {
    const el = util_1.createEl('coords', className);
    let f;
    for (let i in elems) {
        f = util_1.createEl('coord');
        f.textContent = elems[i];
        el.appendChild(f);
    }
    return el;
}

},{"./svg":16,"./types":17,"./util":18}]},{},[12])(12)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYW5pbS50cyIsInNyYy9hcGkudHMiLCJzcmMvYm9hcmQudHMiLCJzcmMvY2hlc3Nncm91bmQudHMiLCJzcmMvY29uZmlnLnRzIiwic3JjL2RyYWcudHMiLCJzcmMvZHJhdy50cyIsInNyYy9kcm9wLnRzIiwic3JjL2V2ZW50cy50cyIsInNyYy9leHBsb3Npb24udHMiLCJzcmMvZmVuLnRzIiwic3JjL2luZGV4LmpzIiwic3JjL3ByZW1vdmUudHMiLCJzcmMvcmVuZGVyLnRzIiwic3JjL3N0YXRlLnRzIiwic3JjL3N2Zy50cyIsInNyYy90eXBlcy50cyIsInNyYy91dGlsLnRzIiwic3JjL3dyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0NBLCtCQUE4QjtBQTRCOUIsU0FBZ0IsSUFBSSxDQUFJLFFBQXFCLEVBQUUsS0FBWTtJQUN6RCxPQUFPLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3RGLENBQUM7QUFGRCxvQkFFQztBQUVELFNBQWdCLE1BQU0sQ0FBSSxRQUFxQixFQUFFLEtBQVk7SUFDM0QsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQy9CLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDbkIsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQUpELHdCQUlDO0FBV0QsU0FBUyxTQUFTLENBQUMsR0FBVyxFQUFFLEtBQWUsRUFBRSxZQUFxQjtJQUNwRSxPQUFPO1FBQ0wsR0FBRyxFQUFFLEdBQUc7UUFDUixHQUFHLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDO1FBQ3BDLEtBQUssRUFB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QUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN2RSxDQUFDO0FBR0QsTUFBTSxLQUFLLEdBQWEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtJQUN6QyxPQUFPLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDeEUsQ0FBQyxDQUFBO0FBR0QsTUFBTSxPQUFPLEdBQWEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtJQUMzQyxPQUFPLE1BQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDMUUsQ0FBQyxDQUFBO0FBR0QsTUFBTSxLQUFLLEdBQWEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtJQUN6QyxPQUFPLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFD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RUFBRSxFQUFzQjtJQUMvRSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO0FBQzlELENBQUM7QUFFRCxTQUFTLE1BQU0sQ0FBQyxHQUFXLEVBQUUsTUFBa0IsRUFBRSxFQUFzQjtJQUNyRSxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDNUcsQ0FBQzs7Ozs7QUNsS1ksUUFBQSxLQUFLLEdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNuRSxRQUFBLEtBQUssR0FBVyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztBQU9DLENBQUM7QUFFM0UsUUFBQSxVQUFVLEdBQXNCLENBQUMsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUMsRUFBRSxFQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBQyxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFDLEVBQUUsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUMsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBQyxFQUFFLEVBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFDLEVBQUUsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDOzs7OztBQ3ZHbk4sOEJBQThCO0FBRWpCLFFBQUEsTUFBTSxHQUFlLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBRXhDLFFBQUEsTUFBTSxHQUFhLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDbkQsUUFBQSxTQUFTLEdBQWEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUVuRSxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDcEMsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNwQyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDcEMsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBRXRDLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNwQyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDcEMsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUVyQyxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFFdEMsTUFBTSxVQUFVLEdBQWEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUYsTUFBTSxVQUFVLEdBQWEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUYsTUFBTSxVQUFVLEdBQWEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUYsTUFBTSxVQUFVLEdBQWEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUYsTUFBTSxXQUFXLEdBQWEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEcsTUFBTSxXQUFXLEdBQWEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEcsTUFBTSxZQUFZLEdBQWEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFckYsUUFBQSxPQUFPLEdBQUcsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztBQUVoSCxTQUFnQixPQUFPLENBQUMsR0FBVyxFQUFFLElBQWlCO0lBQ2xELE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0IsT0FBTyxlQUFPLENBQUMsSUFBSSxD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QUFPO1FBQ0wsS0FBSztRQUNMLFNBQVM7UUFDVCxLQUFLO1FBQ0wsR0FBRztLQUNKLENBQUM7QUFDSixDQUFDO0FBNURELHVCQTREQztBQUVELFNBQVMsWUFBWSxDQUFDLEtBQVksRUFBRSxTQUFpQjtJQUNuRCxNQUFNLEVBQUUsR0FBRyxlQUFRLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3pDLElBQUksQ0FBYyxDQUFDO0lBQ25CLEtBQUssSUFBSSxDQUFDLElBQUksS0FBSyxFQUFFO1FBQ25CLENBQUMsR0FBRyxlQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEIsQ0FBQyxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNuQjtJQUNELE9BQU8sRUFBRSxDQUFDO0FBQ1osQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAnLi91dGlsJ1xuaW1wb3J0ICogYXMgY2cgZnJvbSAnLi90eXBlcydcblxuZXhwb3J0IHR5cGUgTXV0YXRpb248QT4gPSAoc3RhdGU6IFN0YXRlKSA9PiBBO1xuXG4vLyAwLDEgYW5pbWF0aW9uIGdvYWxcbi8vIDIsMyBhbmltYXRpb24gY3VycmVudCBzdGF0dXNcbmV4cG9ydCB0eXBlIEFuaW1WZWN0b3IgPSBjZy5OdW1iZXJRdWFkXG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5pbVZlY3RvcnMge1xuICBba2V5OiBzdHJpbmddOiBBbmltVmVjdG9yXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5pbUZhZGluZ3Mge1xuICBba2V5OiBzdHJpbmddOiBjZy5QaWVjZVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFuaW1QbGFuIHtcbiAgYW5pbXM6IEFuaW1WZWN0b3JzO1xuICBmYWRpbmdzOiBBbmltRmFkaW5ncztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBbmltQ3VycmVudCB7XG4gIHN0YXJ0OiBET01IaWdoUmVzVGltZVN0YW1wO1xuICBmcmVxdWVuY3k6IGNnLktIejtcbiAgcGxhbjogQW5pbVBsYW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhbmltPEE+KG11dGF0aW9uOiBNdXRhdGlvbjxBPiwgc3RhdGU6IFN0YXRlKTogQSB7XG4gIHJldHVybiBzdGF0ZS5hbmltYXRpb24uZW5hYmxlZCA/IGFuaW1hdGUobXV0YXRpb24sIHN0YXRlKSA6IHJlbmRlcihtdXRhdGlvbiwgc3RhdGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyPEE+KG11dGF0aW9uOiBNdXRhdGlvbjxBPiwgc3RhdGU6IFN0YXRlKTogQSB7XG4gIGNvbnN0IHJlc3VsdCA9IG11dGF0aW9uKHN0YXRlKTtcbiAgc3RhdGUuZG9tLnJlZHJhdygpO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG5pbnRlcmZhY2UgQW5pbVBpZWNlIHtcbiAga2V5OiBjZy5LZXk7XG4gIHBvczogY2cuUG9zO1xuICBwaWVjZTogY2cuUGllY2U7XG59XG5pbnRlcmZhY2UgQW5pbVBpZWNlcyB7XG4gIFtrZXk6IHN0cmluZ106IEFuaW1QaWVjZVxufVxuXG5mdW5jdGlvbiBtYWtlUGllY2Uoa2V5OiBjZy5LZXksIHBpZWNlOiBjZy5QaWVjZSwgZmlyc3RSYW5rSXMwOiBib29sZWFuKTogQW5pbVBpZWNlIHtcbiAgcmV0dXJuIHtcbiAgICBrZXk6IGtleSxcbiAgICBwb3M6IHV0aWwua2V5MnBvcyhrZXksIGZpcnN0UmFua0lzMCksXG4gICAgcGllY2U6IHBpZWNlXG4gIH07XG59XG5cbmZ1bmN0aW9uIGNsb3NlcihwaWVjZTogQW5pbVBpZWNlLCBwaWVjZXM6IEFuaW1QaWVjZVtdKTogQW5pbVBpZWNlIHtcbiAgcmV0dXJuIHBpZWNlcy5zb3J0KChwMSwgcDIpID0+IHtcbiAgICByZXR1cm4gdXRpbC5kaXN0YW5jZVNxKHBpZWNlLnBvcywgcDEucG9zKSAtIHV0aWwuZGlzdGFuY2VTcShwaWVjZS5wb3MsIHAyLnBvcyk7XG4gIH0pWzBdO1xufVxuXG5mdW5jdGlvbiBjb21wdXRlUGxhbihwcmV2UGllY2VzOiBjZy5QaWVjZXMsIGN1cnJlbnQ6IFN0YXRlKTogQW5pbVBsYW4ge1xuICBjb25zdCBmaXJzdFJhbmtJczAgPSBjdXJyZW50LmRpbWVuc2lvbnMuaGVpZ2h0ID09PSAxMDtcbiAgY29uc3QgYW5pbXM6IEFuaW1WZWN0b3JzID0ge30sXG4gIGFuaW1lZE9yaWdzOiBjZy5LZXlbXSA9IFtdLFxuICBmYWRpbmdzOiBBbmltRmFkaW5ncyA9IHt9LFxuICBtaXNzaW5nczogQW5pbVBpZWNlW10gPSBbXSxcbiAgbmV3czogQW5pbVBpZWNlW10gPSBbXSxcbiAgcHJlUGllY2VzOiBBbmltUGllY2VzID0ge307XG4gIGxldCBjdXJQOiBjZy5QaWVjZSB8IHVuZGVmaW5lZCwgcHJlUDogQW5pbVBpZWNlIHwgdW5kZWZpbmVkLCBpOiBhbnksIHZlY3RvcjogY2cuTnVtYmVyUGFpcjtcbiAgZm9yIChpIGluIHByZXZQaWVjZXMpIHtcbiAgICBwcmVQaWVjZXNbaV0gPSBtYWtlUGllY2UoaSBhcyBjZy5LZXksIHByZXZQaWVjZXNbaV0hLCBmaXJzdFJhbmtJczApO1xuICB9XG4gIGZvciAoY29uc3Qga2V5IG9mIHV0aWwuYWxsS2V5c1tjdXJyZW50Lmdlb21ldHJ5XSkge1xuICAgIGN1clAgPSBjdXJyZW50LnBpZWNlc1trZXldO1xuICAgIHByZVAgPSBwcmVQaWVjZXNba2V5XTtcbiAgICBpZiAoY3VyUCkge1xuICAgICAgaWYgKHByZVApIHtcbiAgICAgICAgaWYgKCF1dGlsLnNhbWVQaWVjZShjdXJQLCBwcmVQLnBpZWNlKSkge1xuICAgICAgICAgIG1pc3NpbmdzLnB1c2gocHJlUCk7XG4gICAgICAgICAgbmV3cy5wdXNoKG1ha2VQaWVjZShrZXksIGN1clAsIGZpcnN0UmFua0lzMCkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgbmV3cy5wdXNoKG1ha2VQaWVjZShrZXksIGN1clAsIGZpcnN0UmFua0lzMCkpO1xuICAgIH0gZWxzZSBpZiAocHJlUCkgbWlzc2luZ3MucHVzaChwcmVQKTtcbiAgfVxuICBuZXdzLmZvckVhY2gobmV3UCA9PiB7XG4gICAgcHJlUCA9IGNsb3NlcihuZXdQLCBtaXNzaW5ncy5maWx0ZXIocCA9PiB1dGlsLnNhbWVQaWVjZShuZXdQLnBpZWNlLCBwLnBpZWNlKSkpO1xuICAgIGlmIChwcmVQKSB7XG4gICAgICB2ZWN0b3IgPSBbcHJlUC5wb3NbMF0gLSBuZXdQLnBvc1swXSwgcHJlUC5wb3NbMV0gLSBuZXdQLnBvc1sxXV07XG4gICAgICBhbmltc1tuZXdQLmtleV0gPSB2ZWN0b3IuY29uY2F0KHZlY3RvcikgYXMgQW5pbVZlY3RvcjtcbiAgICAgIGFuaW1lZE9yaWdzLnB1c2gocHJlUC5rZXkpO1xuICAgIH1cbiAgfSk7XG4gIG1pc3NpbmdzLmZvckVhY2gocCA9PiB7XG4gICAgaWYgKCF1dGlsLmNvbnRhaW5zWChhbmltZWRPcmlncywgcC5rZXkpKSBmYWRpbmdzW3Aua2V5XSA9IHAucGllY2U7XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgYW5pbXM6IGFuaW1zLFxuICAgIGZhZGluZ3M6IGZhZGluZ3NcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3RlcChzdGF0ZTogU3RhdGUsIG5vdzogRE9NSGlnaFJlc1RpbWVTdGFtcCk6IHZvaWQge1xuICBjb25zdCBjdXIgPSBzdGF0ZS5hbmltYXRpb24uY3VycmVudDtcbiAgaWYgKGN1ciA9PT0gdW5kZWZpbmVkKSB7IC8vIGFuaW1hdGlvbiB3YXMgY2FuY2VsZWQgOihcbiAgICBpZiAoIXN0YXRlLmRvbS5kZXN0cm95ZWQpIHN0YXRlLmRvbS5yZWRyYXdOb3coKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgcmVzdCA9IDEgLSAobm93IC0gY3VyLnN0YXJ0KSAqIGN1ci5mcmVxdWVuY3k7XG4gIGlmIChyZXN0IDw9IDApIHtcbiAgICBzdGF0ZS5hbmltYXRpb24uY3VycmVudCA9IHVuZGVmaW5lZDtcbiAgICBzdGF0ZS5kb20ucmVkcmF3Tm93KCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZWFzZSA9IGVhc2luZyhyZXN0KTtcbiAgICBmb3IgKGxldCBpIGluIGN1ci5wbGFuLmFuaW1zKSB7XG4gICAgICBjb25zdCBjZmcgPSBjdXIucGxhbi5hbmltc1tpXTtcbiAgICAgIGNmZ1syXSA9IGNmZ1swXSAqIGVhc2U7XG4gICAgICBjZmdbM10gPSBjZmdbMV0gKiBlYXNlO1xuICAgIH1cbiAgICBzdGF0ZS5kb20ucmVkcmF3Tm93KHRydWUpOyAvLyBvcHRpbWlzYXRpb246IGRvbid0IHJlbmRlciBTVkcgY2hhbmdlcyBkdXJpbmcgYW5pbWF0aW9uc1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgobm93ID0gcGVyZm9ybWFuY2Uubm93KCkpID0+IHN0ZXAoc3RhdGUsIG5vdykpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFuaW1hdGU8QT4obXV0YXRpb246IE11dGF0aW9uPEE+LCBzdGF0ZTogU3RhdGUpOiBBIHtcbiAgLy8gY2xvbmUgc3RhdGUgYmVmb3JlIG11dGF0aW5nIGl0XG4gIGNvbnN0IHByZXZQaWVjZXM6IGNnLlBpZWNlcyA9IHsuLi5zdGF0ZS5waWVjZXN9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IG11dGF0aW9uKHN0YXRlKTtcbiAgY29uc3QgcGxhbiA9IGNvbXB1dGVQbGFuKHByZXZQaWVjZXMsIHN0YXRlKTtcbiAgaWYgKCFpc09iamVjdEVtcHR5KHBsYW4uYW5pbXMpIHx8ICFpc09iamVjdEVtcHR5KHBsYW4uZmFkaW5ncykpIHtcbiAgICBjb25zdCBhbHJlYWR5UnVubmluZyA9IHN0YXRlLmFuaW1hdGlvbi5jdXJyZW50ICYmIHN0YXRlLmFuaW1hdGlvbi5jdXJyZW50LnN0YXJ0O1xuICAgIHN0YXRlLmFuaW1hdGlvbi5jdXJyZW50ID0ge1xuICAgICAgc3RhcnQ6IHBlcmZvcm1hbmNlLm5vdygpLFxuICAgICAgZnJlcXVlbmN5OiAxIC8gc3RhdGUuYW5pbWF0aW9uLmR1cmF0aW9uLFxuICAgICAgcGxhbjogcGxhblxuICAgIH07XG4gICAgaWYgKCFhbHJlYWR5UnVubmluZykgc3RlcChzdGF0ZSwgcGVyZm9ybWFuY2Uubm93KCkpO1xuICB9IGVsc2Uge1xuICAgIC8vIGRvbid0IGFuaW1hdGUsIGp1c3QgcmVuZGVyIHJpZ2h0IGF3YXlcbiAgICBzdGF0ZS5kb20ucmVkcmF3KCk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaXNPYmplY3RFbXB0eShvOiBhbnkpOiBib29sZWFuIHtcbiAgZm9yIChsZXQgXyBpbiBvKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiB0cnVlO1xufVxuLy8gaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vZ3JlLzE2NTAyOTRcbmZ1bmN0aW9uIGVhc2luZyh0OiBudW1iZXIpOiBudW1iZXIge1xuICByZXR1cm4gdCA8IDAuNSA/IDQgKiB0ICogdCAqIHQgOiAodCAtIDEpICogKDIgKiB0IC0gMikgKiAoMiAqIHQgLSAyKSArIDE7XG59XG4iLCJpbXBvcnQgeyBTdGF0ZSB9IGZyb20gJy4vc3RhdGUnXG5pbXBvcnQgKiBhcyBib2FyZCBmcm9tICcuL2JvYXJkJ1xuaW1wb3J0IHsgd3JpdGUgYXMgZmVuV3JpdGUgfSBmcm9tICcuL2ZlbidcbmltcG9ydCB7IENvbmZpZywgY29uZmlndXJlIH0gZnJvbSAnLi9jb25maWcnXG5pbXBvcnQgeyBhbmltLCByZW5kZXIgfSBmcm9tICcuL2FuaW0nXG5pbXBvcnQgeyBjYW5jZWwgYXMgZHJhZ0NhbmNlbCwgZHJhZ05ld1BpZWNlIH0gZnJvbSAnLi9kcmFnJ1xuaW1wb3J0IHsgRHJhd1NoYXBlIH0gZnJvbSAnLi9kcmF3J1xuaW1wb3J0IGV4cGxvc2lvbiBmcm9tICcuL2V4cGxvc2lvbidcbmltcG9ydCAqIGFzIGNnIGZyb20gJy4vdHlwZXMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgQXBpIHtcblxuICAvLyByZWNvbmZpZ3VyZSB0aGUgaW5zdGFuY2UuIEFjY2VwdHMgYWxsIGNvbmZpZyBvcHRpb25zLCBleGNlcHQgZm9yIHZpZXdPbmx5ICYgZHJhd2FibGUudmlzaWJsZS5cbiAgLy8gYm9hcmQgd2lsbCBiZSBhbmltYXRlZCBhY2NvcmRpbmdseSwgaWYgYW5pbWF0aW9ucyBhcmUgZW5hYmxlZC5cbiAgc2V0KGNvbmZpZzogQ29uZmlnKTogdm9pZDtcblxuICAvLyByZWFkIGNoZXNzZ3JvdW5kIHN0YXRlOyB3cml0ZSBhdCB5b3VyIG93biByaXNrcy5cbiAgc3RhdGU6IFN0YXRlO1xuXG4gIC8vIGdldCB0aGUgcG9zaXRpb24gYXMgYSBGRU4gc3RyaW5nIChvbmx5IGNvbnRhaW5zIHBpZWNlcywgbm8gZmxhZ3MpXG4gIC8vIGUuZy4gcm5icWtibnIvcHBwcHBwcHAvOC84LzgvOC9QUFBQUFBQUC9STkJRS0JOUlxuICBnZXRGZW4oKTogY2cuRkVOO1xuXG4gIC8vIGNoYW5nZSB0aGUgdmlldyBhbmdsZVxuICB0b2dnbGVPcmllbnRhdGlvbigpOiB2b2lkO1xuXG4gIC8vIHBlcmZvcm0gYSBtb3ZlIHByb2dyYW1tYXRpY2FsbHlcbiAgbW92ZShvcmlnOiBjZy5LZXksIGRlc3Q6IGNnLktleSk6IHZvaWQ7XG5cbiAgLy8gYWRkIGFuZC9vciByZW1vdmUgYXJiaXRyYXJ5IHBpZWNlcyBvbiB0aGUgYm9hcmRcbiAgc2V0UGllY2VzKHBpZWNlczogY2cuUGllY2VzRGlmZik6IHZvaWQ7XG5cbiAgLy8gY2xpY2sgYSBzcXVhcmUgcHJvZ3JhbW1hdGljYWxseVxuICBzZWxlY3RTcXVhcmUoa2V5OiBjZy5LZXkgfCBudWxsLCBmb3JjZT86IGJvb2xlYW4pOiB2b2lkO1xuXG4gIC8vIHB1dCBhIG5ldyBwaWVjZSBvbiB0aGUgYm9hcmRcbiAgbmV3UGllY2UocGllY2U6IGNnLlBpZWNlLCBrZXk6IGNnLktleSk6IHZvaWQ7XG5cbiAgLy8gcGxheSB0aGUgY3VycmVudCBwcmVtb3ZlLCBpZiBhbnk7IHJldHVybnMgdHJ1ZSBpZiBwcmVtb3ZlIHdhcyBwbGF5ZWRcbiAgcGxheVByZW1vdmUoKTogYm9vbGVhbjtcblxuICAvLyBjYW5jZWwgdGhlIGN1cnJlbnQgcHJlbW92ZSwgaWYgYW55XG4gIGNhbmNlbFByZW1vdmUoKTogdm9pZDtcblxuICAvLyBwbGF5IHRoZSBjdXJyZW50IHByZWRyb3AsIGlmIGFueTsgcmV0dXJucyB0cnVlIGlmIHByZW1vdmUgd2FzIHBsYXllZFxuICBwbGF5UHJlZHJvcCh2YWxpZGF0ZTogKGRyb3A6IGNnLkRyb3ApID0+IGJvb2xlYW4pOiBib29sZWFuO1xuXG4gIC8vIGNhbmNlbCB0aGUgY3VycmVudCBwcmVkcm9wLCBpZiBhbnlcbiAgY2FuY2VsUHJlZHJvcCgpOiB2b2lkO1xuXG4gIC8vIGNhbmNlbCB0aGUgY3VycmVudCBtb3ZlIGJlaW5nIG1hZGVcbiAgY2FuY2VsTW92ZSgpOiB2b2lkO1xuXG4gIC8vIGNhbmNlbCBjdXJyZW50IG1vdmUgYW5kIHByZXZlbnQgZnVydGhlciBvbmVzXG4gIHN0b3AoKTogdm9pZDtcblxuICAvLyBtYWtlIHNxdWFyZXMgZXhwbG9kZSAoYXRvbWljIGNoZXNzKVxuICBleHBsb2RlKGtleXM6IGNnLktleVtdKTogdm9pZDtcblxuICAvLyBwcm9ncmFtbWF0aWNhbGx5IGRyYXcgdXNlciBzaGFwZXNcbiAgc2V0U2hhcGVzKHNoYXBlczogRHJhd1NoYXBlW10pOiB2b2lkO1xuXG4gIC8vIHByb2dyYW1tYXRpY2FsbHkgZHJhdyBhdXRvIHNoYXBlc1xuICBzZXRBdXRvU2hhcGVzKHNoYXBlczogRHJhd1NoYXBlW10pOiB2b2lkO1xuXG4gIC8vIHNxdWFyZSBuYW1lIGF0IHRoaXMgRE9NIHBvc2l0aW9uIChsaWtlIFwiZTRcIilcbiAgZ2V0S2V5QXREb21Qb3MocG9zOiBjZy5OdW1iZXJQYWlyKTogY2cuS2V5IHwgdW5kZWZpbmVkO1xuXG4gIC8vIG9ubHkgdXNlZnVsIHdoZW4gQ1NTIGNoYW5nZXMgdGhlIGJvYXJkIHdpZHRoL2hlaWdodCByYXRpbyAoZm9yIDNEKVxuICByZWRyYXdBbGw6IGNnLlJlZHJhdztcblxuICAvLyBmb3IgY3Jhenlob3VzZSBhbmQgYm9hcmQgZWRpdG9yc1xuICBkcmFnTmV3UGllY2UocGllY2U6IGNnLlBpZWNlLCBldmVudDogY2cuTW91Y2hFdmVudCwgZm9yY2U/OiBib29sZWFuKTogdm9pZDtcblxuICAvLyB1bmJpbmRzIGFsbCBldmVudHNcbiAgLy8gKGltcG9ydGFudCBmb3IgZG9jdW1lbnQtd2lkZSBldmVudHMgbGlrZSBzY3JvbGwgYW5kIG1vdXNlbW92ZSlcbiAgZGVzdHJveTogY2cuVW5iaW5kXG59XG5cbi8vIHNlZSBBUEkgdHlwZXMgYW5kIGRvY3VtZW50YXRpb25zIGluIGR0cy9hcGkuZC50c1xuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0KHN0YXRlOiBTdGF0ZSwgcmVkcmF3QWxsOiBjZy5SZWRyYXcpOiBBcGkge1xuXG4gIGZ1bmN0aW9uIHRvZ2dsZU9yaWVudGF0aW9uKCkge1xuICAgIGJvYXJkLnRvZ2dsZU9yaWVudGF0aW9uKHN0YXRlKTtcbiAgICByZWRyYXdBbGwoKTtcbiAgfTtcblxuICByZXR1cm4ge1xuXG4gICAgc2V0KGNvbmZpZykge1xuICAgICAgaWYgKGNvbmZpZy5vcmllbnRhdGlvbiAmJiBjb25maWcub3JpZW50YXRpb24gIT09IHN0YXRlLm9yaWVudGF0aW9uKSB0b2dnbGVPcmllbnRhdGlvbigpO1xuICAgICAgKGNvbmZpZy5mZW4gPyBhbmltIDogcmVuZGVyKShzdGF0ZSA9PiBjb25maWd1cmUoc3RhdGUsIGNvbmZpZyksIHN0YXRlKTtcbiAgICB9LFxuXG4gICAgc3RhdGUsXG5cbiAgICBnZXRGZW46ICgpID0+IGZlbldyaXRlKHN0YXRlLnBpZWNlcywgc3RhdGUuZ2VvbWV0cnkpLFxuXG4gICAgdG9nZ2xlT3JpZW50YXRpb24sXG5cbiAgICBzZXRQaWVjZXMocGllY2VzKSB7XG4gICAgICBhbmltKHN0YXRlID0+IGJvYXJkLnNldFBpZWNlcyhzdGF0ZSwgcGllY2VzKSwgc3RhdGUpO1xuICAgIH0sXG5cbiAgICBzZWxlY3RTcXVhcmUoa2V5LCBmb3JjZSkge1xuICAgICAgaWYgKGtleSkgYW5pbShzdGF0ZSA9PiBib2FyZC5zZWxlY3RTcXVhcmUoc3RhdGUsIGtleSwgZm9yY2UpLCBzdGF0ZSk7XG4gICAgICBlbHNlIGlmIChzdGF0ZS5zZWxlY3RlZCkge1xuICAgICAgICBib2FyZC51bnNlbGVjdChzdGF0ZSk7XG4gICAgICAgIHN0YXRlLmRvbS5yZWRyYXcoKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgbW92ZShvcmlnLCBkZXN0KSB7XG4gICAgICBhbmltKHN0YXRlID0+IGJvYXJkLmJhc2VNb3ZlKHN0YXRlLCBvcmlnLCBkZXN0KSwgc3RhdGUpO1xuICAgIH0sXG5cbiAgICBuZXdQaWVjZShwaWVjZSwga2V5KSB7XG4gICAgICBhbmltKHN0YXRlID0+IGJvYXJkLmJhc2VOZXdQaWVjZShzdGF0ZSwgcGllY2UsIGtleSksIHN0YXRlKTtcbiAgICB9LFxuXG4gICAgcGxheVByZW1vdmUoKSB7XG4gICAgICBpZiAoc3RhdGUucHJlbW92YWJsZS5jdXJyZW50KSB7XG4gICAgICAgIGlmIChhbmltKGJvYXJkLnBsYXlQcmVtb3ZlLCBzdGF0ZSkpIHJldHVybiB0cnVlO1xuICAgICAgICAvLyBpZiB0aGUgcHJlbW92ZSBjb3VsZG4ndCBiZSBwbGF5ZWQsIHJlZHJhdyB0byBjbGVhciBpdCB1cFxuICAgICAgICBzdGF0ZS5kb20ucmVkcmF3KCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcblxuICAgIHBsYXlQcmVkcm9wKHZhbGlkYXRlKSB7XG4gICAgICBpZiAoc3RhdGUucHJlZHJvcHBhYmxlLmN1cnJlbnQpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYm9hcmQucGxheVByZWRyb3Aoc3RhdGUsIHZhbGlkYXRlKTtcbiAgICAgICAgc3RhdGUuZG9tLnJlZHJhdygpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG5cbiAgICBjYW5jZWxQcmVtb3ZlKCkge1xuICAgICAgcmVuZGVyKGJvYXJkLnVuc2V0UHJlbW92ZSwgc3RhdGUpO1xuICAgIH0sXG5cbiAgICBjYW5jZWxQcmVkcm9wKCkge1xuICAgICAgcmVuZGVyKGJvYXJkLnVuc2V0UHJlZHJvcCwgc3RhdGUpO1xuICAgIH0sXG5cbiAgICBjYW5jZWxNb3ZlKCkge1xuICAgICAgcmVuZGVyKHN0YXRlID0+IHsgYm9hcmQuY2FuY2VsTW92ZShzdGF0ZSk7IGRyYWdDYW5jZWwoc3RhdGUpOyB9LCBzdGF0ZSk7XG4gICAgfSxcblxuICAgIHN0b3AoKSB7XG4gICAgICByZW5kZXIoc3RhdGUgPT4geyBib2FyZC5zdG9wKHN0YXRlKTsgZHJhZ0NhbmNlbChzdGF0ZSk7IH0sIHN0YXRlKTtcbiAgICB9LFxuXG4gICAgZXhwbG9kZShrZXlzOiBjZy5LZXlbXSkge1xuICAgICAgZXhwbG9zaW9uKHN0YXRlLCBrZXlzKTtcbiAgICB9LFxuXG4gICAgc2V0QXV0b1NoYXBlcyhzaGFwZXM6IERyYXdTaGFwZVtdKSB7XG4gICAgICByZW5kZXIoc3RhdGUgPT4gc3RhdGUuZHJhd2FibGUuYXV0b1NoYXBlcyA9IHNoYXBlcywgc3RhdGUpO1xuICAgIH0sXG5cbiAgICBzZXRTaGFwZXMoc2hhcGVzOiBEcmF3U2hhcGVbXSkge1xuICAgICAgcmVuZGVyKHN0YXRlID0+IHN0YXRlLmRyYXdhYmxlLnNoYXBlcyA9IHNoYXBlcywgc3RhdGUpO1xuICAgIH0sXG5cbiAgICBnZXRLZXlBdERvbVBvcyhwb3MpIHtcbiAgICAgIHJldHVybiBib2FyZC5nZXRLZXlBdERvbVBvcyhwb3MsIGJvYXJkLndoaXRlUG92KHN0YXRlKSwgc3RhdGUuZG9tLmJvdW5kcygpLCBzdGF0ZS5nZW9tZXRyeSk7XG4gICAgfSxcblxuICAgIHJlZHJhd0FsbCxcblxuICAgIGRyYWdOZXdQaWVjZShwaWVjZSwgZXZlbnQsIGZvcmNlKSB7XG4gICAgICBkcmFnTmV3UGllY2Uoc3RhdGUsIHBpZWNlLCBldmVudCwgZm9yY2UpXG4gICAgfSxcblxuICAgIGRlc3Ryb3koKSB7XG4gICAgICBib2FyZC5zdG9wKHN0YXRlKTtcbiAgICAgIHN0YXRlLmRvbS51bmJpbmQgJiYgc3RhdGUuZG9tLnVuYmluZCgpO1xuICAgICAgc3RhdGUuZG9tLmRlc3Ryb3llZCA9IHRydWU7XG4gICAgfVxuICB9O1xufVxuIiwiaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJ1xuaW1wb3J0IHsgcG9zMmtleSwga2V5MnBvcywgb3Bwb3NpdGUsIGNvbnRhaW5zWCB9IGZyb20gJy4vdXRpbCdcbmltcG9ydCBwcmVtb3ZlIGZyb20gJy4vcHJlbW92ZSdcbmltcG9ydCAqIGFzIGNnIGZyb20gJy4vdHlwZXMnXG5cbmV4cG9ydCB0eXBlIENhbGxiYWNrID0gKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gY2FsbFVzZXJGdW5jdGlvbihmOiBDYWxsYmFjayB8IHVuZGVmaW5lZCwgLi4uYXJnczogYW55W10pOiB2b2lkIHtcbiAgaWYgKGYpIHNldFRpbWVvdXQoKCkgPT4gZiguLi5hcmdzKSwgMSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b2dnbGVPcmllbnRhdGlvbihzdGF0ZTogU3RhdGUpOiB2b2lkIHtcbiAgc3RhdGUub3JpZW50YXRpb24gPSBvcHBvc2l0ZShzdGF0ZS5vcmllbnRhdGlvbik7XG4gIHN0YXRlLmFuaW1hdGlvbi5jdXJyZW50ID1cbiAgc3RhdGUuZHJhZ2dhYmxlLmN1cnJlbnQgPVxuICBzdGF0ZS5zZWxlY3RlZCA9IHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0KHN0YXRlOiBTdGF0ZSk6IHZvaWQge1xuICBzdGF0ZS5sYXN0TW92ZSA9IHVuZGVmaW5lZDtcbiAgdW5zZWxlY3Qoc3RhdGUpO1xuICB1bnNldFByZW1vdmUoc3RhdGUpO1xuICB1bnNldFByZWRyb3Aoc3RhdGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0UGllY2VzKHN0YXRlOiBTdGF0ZSwgcGllY2VzOiBjZy5QaWVjZXNEaWZmKTogdm9pZCB7XG4gIGZvciAobGV0IGtleSBpbiBwaWVjZXMpIHtcbiAgICBjb25zdCBwaWVjZSA9IHBpZWNlc1trZXldO1xuICAgIGlmIChwaWVjZSkgc3RhdGUucGllY2VzW2tleV0gPSBwaWVjZTtcbiAgICBlbHNlIGRlbGV0ZSBzdGF0ZS5waWVjZXNba2V5XTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0Q2hlY2soc3RhdGU6IFN0YXRlLCBjb2xvcjogY2cuQ29sb3IgfCBib29sZWFuKTogdm9pZCB7XG4gIHN0YXRlLmNoZWNrID0gdW5kZWZpbmVkO1xuICBpZiAoY29sb3IgPT09IHRydWUpIGNvbG9yID0gc3RhdGUudHVybkNvbG9yO1xuICBpZiAoY29sb3IpIGZvciAobGV0IGsgaW4gc3RhdGUucGllY2VzKSB7XG4gICAgaWYgKHN0YXRlLnBpZWNlc1trXSEucm9sZSA9PT0gJ2tpbmcnICYmIHN0YXRlLnBpZWNlc1trXSEuY29sb3IgPT09IGNvbG9yKSB7XG4gICAgICBzdGF0ZS5jaGVjayA9IGsgYXMgY2cuS2V5O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRQcmVtb3ZlKHN0YXRlOiBTdGF0ZSwgb3JpZzogY2cuS2V5LCBkZXN0OiBjZy5LZXksIG1ldGE6IGNnLlNldFByZW1vdmVNZXRhZGF0YSk6IHZvaWQge1xuICB1bnNldFByZWRyb3Aoc3RhdGUpO1xuICBzdGF0ZS5wcmVtb3ZhYmxlLmN1cnJlbnQgPSBbb3JpZywgZGVzdF07XG4gIGNhbGxVc2VyRnVuY3Rpb24oc3RhdGUucHJlbW92YWJsZS5ldmVudHMuc2V0LCBvcmlnLCBkZXN0LCBtZXRhKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVuc2V0UHJlbW92ZShzdGF0ZTogU3RhdGUpOiB2b2lkIHtcbiAgaWYgKHN0YXRlLnByZW1vdmFibGUuY3VycmVudCkge1xuICAgIHN0YXRlLnByZW1vdmFibGUuY3VycmVudCA9IHVuZGVmaW5lZDtcbiAgICBjYWxsVXNlckZ1bmN0aW9uKHN0YXRlLnByZW1vdmFibGUuZXZlbnRzLnVuc2V0KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRQcmVkcm9wKHN0YXRlOiBTdGF0ZSwgcm9sZTogY2cuUm9sZSwga2V5OiBjZy5LZXkpOiB2b2lkIHtcbiAgdW5zZXRQcmVtb3ZlKHN0YXRlKTtcbiAgc3RhdGUucHJlZHJvcHBhYmxlLmN1cnJlbnQgPSB7IHJvbGUsIGtleSB9O1xuICBjYWxsVXNlckZ1bmN0aW9uKHN0YXRlLnByZWRyb3BwYWJsZS5ldmVudHMuc2V0LCByb2xlLCBrZXkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdW5zZXRQcmVkcm9wKHN0YXRlOiBTdGF0ZSk6IHZvaWQge1xuICBjb25zdCBwZCA9IHN0YXRlLnByZWRyb3BwYWJsZTtcbiAgaWYgKHBkLmN1cnJlbnQpIHtcbiAgICBwZC5jdXJyZW50ID0gdW5kZWZpbmVkO1xuICAgIGNhbGxVc2VyRnVuY3Rpb24ocGQuZXZlbnRzLnVuc2V0KTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0cnlBdXRvQ2FzdGxlKHN0YXRlOiBTdGF0ZSwgb3JpZzogY2cuS2V5LCBkZXN0OiBjZy5LZXkpOiBib29sZWFuIHtcbiAgaWYgKCFzdGF0ZS5hdXRvQ2FzdGxlKSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IGtpbmcgPSBzdGF0ZS5waWVjZXNbb3JpZ107XG4gIGlmICgha2luZyB8fCBraW5nLnJvbGUgIT09ICdraW5nJykgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBmaXJzdFJhbmtJczAgPSBzdGF0ZS5kaW1lbnNpb25zLmhlaWdodCA9PT0gMTA7XG4gIGNvbnN0IG9yaWdQb3MgPSBrZXkycG9zKG9yaWcsIGZpcnN0UmFua0lzMCk7XG4gIGlmIChvcmlnUG9zWzBdICE9PSA1KSByZXR1cm4gZmFsc2U7XG4gIGlmIChvcmlnUG9zWzFdICE9PSAxICYmIG9yaWdQb3NbMV0gIT09IDgpIHJldHVybiBmYWxzZTtcbiAgY29uc3QgZGVzdFBvcyA9IGtleTJwb3MoZGVzdCwgZmlyc3RSYW5rSXMwKTtcbiAgbGV0IG9sZFJvb2tQb3MsIG5ld1Jvb2tQb3MsIG5ld0tpbmdQb3M7XG4gIGlmIChkZXN0UG9zWzBdID09PSA3IHx8IGRlc3RQb3NbMF0gPT09IDgpIHtcbiAgICBvbGRSb29rUG9zID0gcG9zMmtleShbOCwgb3JpZ1Bvc1sxXV0sIHN0YXRlLmdlb21ldHJ5KTtcbiAgICBuZXdSb29rUG9zID0gcG9zMmtleShbNiwgb3JpZ1Bvc1sxXV0sIHN0YXRlLmdlb21ldHJ5KTtcbiAgICBuZXdLaW5nUG9zID0gcG9zMmtleShbNywgb3JpZ1Bvc1sxXV0sIHN0YXRlLmdlb21ldHJ5KTtcbiAgfSBlbHNlIGlmIChkZXN0UG9zWzBdID09PSAzIHx8IGRlc3RQb3NbMF0gPT09IDEpIHtcbiAgICBvbGRSb29rUG9zID0gcG9zMmtleShbMSwgb3JpZ1Bvc1sxXV0sIHN0YXRlLmdlb21ldHJ5KTtcbiAgICBuZXdSb29rUG9zID0gcG9zMmtleShbNCwgb3JpZ1Bvc1sxXV0sIHN0YXRlLmdlb21ldHJ5KTtcbiAgICBuZXdLaW5nUG9zID0gcG9zMmtleShbMywgb3JpZ1Bvc1sxXV0sIHN0YXRlLmdlb21ldHJ5KTtcbiAgfSBlbHNlIHJldHVybiBmYWxzZTtcblxuICBjb25zdCByb29rID0gc3RhdGUucGllY2VzW29sZFJvb2tQb3NdO1xuICBpZiAoIXJvb2sgfHwgcm9vay5yb2xlICE9PSAncm9vaycpIHJldHVybiBmYWxzZTtcblxuICBkZWxldGUgc3RhdGUucGllY2VzW29yaWddO1xuICBkZWxldGUgc3RhdGUucGllY2VzW29sZFJvb2tQb3NdO1xuXG4gIHN0YXRlLnBpZWNlc1tuZXdLaW5nUG9zXSA9IGtpbmdcbiAgc3RhdGUucGllY2VzW25ld1Jvb2tQb3NdID0gcm9vaztcbiAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBiYXNlTW92ZShzdGF0ZTogU3RhdGUsIG9yaWc6IGNnLktleSwgZGVzdDogY2cuS2V5KTogY2cuUGllY2UgfCBib29sZWFuIHtcbiAgY29uc3Qgb3JpZ1BpZWNlID0gc3RhdGUucGllY2VzW29yaWddLCBkZXN0UGllY2UgPSBzdGF0ZS5waWVjZXNbZGVzdF07XG4gIGlmIChvcmlnID09PSBkZXN0IHx8ICFvcmlnUGllY2UpIHJldHVybiBmYWxzZTtcbiAgY29uc3QgY2FwdHVyZWQgPSAoZGVzdFBpZWNlICYmIGRlc3RQaWVjZS5jb2xvciAhPT0gb3JpZ1BpZWNlLmNvbG9yKSA/IGRlc3RQaWVjZSA6IHVuZGVmaW5lZDtcbiAgaWYgKGRlc3QgPT0gc3RhdGUuc2VsZWN0ZWQpIHVuc2VsZWN0KHN0YXRlKTtcbiAgY2FsbFVzZXJGdW5jdGlvbihzdGF0ZS5ldmVudHMubW92ZSwgb3JpZywgZGVzdCwgY2FwdHVyZWQpO1xuICBpZiAoIXRyeUF1dG9DYXN0bGUoc3RhdGUsIG9yaWcsIGRlc3QpKSB7XG4gICAgc3RhdGUucGllY2VzW2Rlc3RdID0gb3JpZ1BpZWNlO1xuICAgIGRlbGV0ZSBzdGF0ZS5waWVjZXNbb3JpZ107XG4gIH1cbiAgc3RhdGUubGFzdE1vdmUgPSBbb3JpZywgZGVzdF07XG4gIHN0YXRlLmNoZWNrID0gdW5kZWZpbmVkO1xuICBjYWxsVXNlckZ1bmN0aW9uKHN0YXRlLmV2ZW50cy5jaGFuZ2UpO1xuICByZXR1cm4gY2FwdHVyZWQgfHwgdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJhc2VOZXdQaWVjZShzdGF0ZTogU3RhdGUsIHBpZWNlOiBjZy5QaWVjZSwga2V5OiBjZy5LZXksIGZvcmNlPzogYm9vbGVhbik6IGJvb2xlYW4ge1xuICBpZiAoc3RhdGUucGllY2VzW2tleV0pIHtcbiAgICBpZiAoZm9yY2UpIGRlbGV0ZSBzdGF0ZS5waWVjZXNba2V5XTtcbiAgICBlbHNlIHJldHVybiBmYWxzZTtcbiAgfVxuICBjYWxsVXNlckZ1bmN0aW9uKHN0YXRlLmV2ZW50cy5kcm9wTmV3UGllY2UsIHBpZWNlLCBrZXkpO1xuICBzdGF0ZS5waWVjZXNba2V5XSA9IHBpZWNlO1xuICBzdGF0ZS5sYXN0TW92ZSA9IFtrZXldO1xuICBzdGF0ZS5jaGVjayA9IHVuZGVmaW5lZDtcbiAgY2FsbFVzZXJGdW5jdGlvbihzdGF0ZS5ldmVudHMuY2hhbmdlKTtcbiAgc3RhdGUubW92YWJsZS5kZXN0cyA9IHVuZGVmaW5lZDtcbiAgc3RhdGUudHVybkNvbG9yID0gb3Bwb3NpdGUoc3RhdGUudHVybkNvbG9yKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGJhc2VVc2VyTW92ZShzdGF0ZTogU3RhdGUsIG9yaWc6IGNnLktleSwgZGVzdDogY2cuS2V5KTogY2cuUGllY2UgfCBib29sZWFuIHtcbiAgY29uc3QgcmVzdWx0ID0gYmFzZU1vdmUoc3RhdGUsIG9yaWcsIGRlc3QpO1xuICBpZiAocmVzdWx0KSB7XG4gICAgc3RhdGUubW92YWJsZS5kZXN0cyA9IHVuZGVmaW5lZDtcbiAgICBzdGF0ZS50dXJuQ29sb3IgPSBvcHBvc2l0ZShzdGF0ZS50dXJuQ29sb3IpO1xuICAgIHN0YXRlLmFuaW1hdGlvbi5jdXJyZW50ID0gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1c2VyTW92ZShzdGF0ZTogU3RhdGUsIG9yaWc6IGNnLktleSwgZGVzdDogY2cuS2V5KTogYm9vbGVhbiB7XG4gIGlmIChjYW5Nb3ZlKHN0YXRlLCBvcmlnLCBkZXN0KSkge1xuICAgIGNvbnN0IHJlc3VsdCA9IGJhc2VVc2VyTW92ZShzdGF0ZSwgb3JpZywgZGVzdCk7XG4gICAgaWYgKHJlc3VsdCkge1xuICAgICAgY29uc3QgaG9sZFRpbWUgPSBzdGF0ZS5ob2xkLnN0b3AoKTtcbiAgICAgIHVuc2VsZWN0KHN0YXRlKTtcbiAgICAgIGNvbnN0IG1ldGFkYXRhOiBjZy5Nb3ZlTWV0YWRhdGEgPSB7XG4gICAgICAgIHByZW1vdmU6IGZhbHNlLFxuICAgICAgICBjdHJsS2V5OiBzdGF0ZS5zdGF0cy5jdHJsS2V5LFxuICAgICAgICBob2xkVGltZVxuICAgICAgfTtcbiAgICAgIGlmIChyZXN1bHQgIT09IHRydWUpIG1ldGFkYXRhLmNhcHR1cmVkID0gcmVzdWx0O1xuICAgICAgY2FsbFVzZXJGdW5jdGlvbihzdGF0ZS5tb3ZhYmxlLmV2ZW50cy5hZnRlciwgb3JpZywgZGVzdCwgbWV0YWRhdGEpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9IGVsc2UgaWYgKGNhblByZW1vdmUoc3RhdGUsIG9yaWcsIGRlc3QpKSB7XG4gICAgc2V0UHJlbW92ZShzdGF0ZSwgb3JpZywgZGVzdCwge1xuICAgICAgY3RybEtleTogc3RhdGUuc3RhdHMuY3RybEtleVxuICAgIH0pO1xuICAgIHVuc2VsZWN0KHN0YXRlKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICB1bnNlbGVjdChzdGF0ZSk7XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRyb3BOZXdQaWVjZShzdGF0ZTogU3RhdGUsIG9yaWc6IGNnLktleSwgZGVzdDogY2cuS2V5LCBmb3JjZT86IGJvb2xlYW4pOiB2b2lkIHtcbiAgaWYgKGNhbkRyb3Aoc3RhdGUsIG9yaWcsIGRlc3QpIHx8IGZvcmNlKSB7XG4gICAgY29uc3QgcGllY2UgPSBzdGF0ZS5waWVjZXNbb3JpZ10hO1xuICAgIGRlbGV0ZSBzdGF0ZS5waWVjZXNbb3JpZ107XG4gICAgYmFzZU5ld1BpZWNlKHN0YXRlLCBwaWVjZSwgZGVzdCwgZm9yY2UpO1xuICAgIGNhbGxVc2VyRnVuY3Rpb24oc3RhdGUubW92YWJsZS5ldmVudHMuYWZ0ZXJOZXdQaWVjZSwgcGllY2Uucm9sZSwgZGVzdCwge1xuICAgICAgcHJlZHJvcDogZmFsc2VcbiAgICB9KTtcbiAgfSBlbHNlIGlmIChjYW5QcmVkcm9wKHN0YXRlLCBvcmlnLCBkZXN0KSkge1xuICAgIHNldFByZWRyb3Aoc3RhdGUsIHN0YXRlLnBpZWNlc1tvcmlnXSEucm9sZSwgZGVzdCk7XG4gIH0gZWxzZSB7XG4gICAgdW5zZXRQcmVtb3ZlKHN0YXRlKTtcbiAgICB1bnNldFByZWRyb3Aoc3RhdGUpO1xuICB9XG4gIGRlbGV0ZSBzdGF0ZS5waWVjZXNbb3JpZ107XG4gIHVuc2VsZWN0KHN0YXRlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlbGVjdFNxdWFyZShzdGF0ZTogU3RhdGUsIGtleTogY2cuS2V5LCBmb3JjZT86IGJvb2xlYW4pOiB2b2lkIHtcbiAgY2FsbFVzZXJGdW5jdGlvbihzdGF0ZS5ldmVudHMuc2VsZWN0LCBrZXkpO1xuICBpZiAoc3RhdGUuc2VsZWN0ZWQpIHtcbiAgICBpZiAoc3RhdGUuc2VsZWN0ZWQgPT09IGtleSAmJiAhc3RhdGUuZHJhZ2dhYmxlLmVuYWJsZWQpIHtcbiAgICAgIHVuc2VsZWN0KHN0YXRlKTtcbiAgICAgIHN0YXRlLmhvbGQuY2FuY2VsKCk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgoc3RhdGUuc2VsZWN0YWJsZS5lbmFibGVkIHx8IGZvcmNlKSAmJiBzdGF0ZS5zZWxlY3RlZCAhPT0ga2V5KSB7XG4gICAgICBpZiAodXNlck1vdmUoc3RhdGUsIHN0YXRlLnNlbGVjdGVkLCBrZXkpKSB7XG4gICAgICAgIHN0YXRlLnN0YXRzLmRyYWdnZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAoaXNNb3ZhYmxlKHN0YXRlLCBrZXkpIHx8IGlzUHJlbW92YWJsZShzdGF0ZSwga2V5KSkge1xuICAgIHNldFNlbGVjdGVkKHN0YXRlLCBrZXkpO1xuICAgIHN0YXRlLmhvbGQuc3RhcnQoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0U2VsZWN0ZWQoc3RhdGU6IFN0YXRlLCBrZXk6IGNnLktleSk6IHZvaWQge1xuICBzdGF0ZS5zZWxlY3RlZCA9IGtleTtcbiAgaWYgKGlzUHJlbW92YWJsZShzdGF0ZSwga2V5KSkge1xuICAgIHN0YXRlLnByZW1vdmFibGUuZGVzdHMgPSBwcmVtb3ZlKHN0YXRlLnBpZWNlcywga2V5LCBzdGF0ZS5wcmVtb3ZhYmxlLmNhc3RsZSwgc3RhdGUuZ2VvbWV0cnksIHN0YXRlLnZhcmlhbnQpO1xuICB9XG4gIGVsc2Ugc3RhdGUucHJlbW92YWJsZS5kZXN0cyA9IHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVuc2VsZWN0KHN0YXRlOiBTdGF0ZSk6IHZvaWQge1xuICBzdGF0ZS5zZWxlY3RlZCA9IHVuZGVmaW5lZDtcbiAgc3RhdGUucHJlbW92YWJsZS5kZXN0cyA9IHVuZGVmaW5lZDtcbiAgc3RhdGUuaG9sZC5jYW5jZWwoKTtcbn1cblxuZnVuY3Rpb24gaXNNb3ZhYmxlKHN0YXRlOiBTdGF0ZSwgb3JpZzogY2cuS2V5KTogYm9vbGVhbiB7XG4gIGNvbnN0IHBpZWNlID0gc3RhdGUucGllY2VzW29yaWddO1xuICByZXR1cm4gISFwaWVjZSAmJiAoXG4gICAgc3RhdGUubW92YWJsZS5jb2xvciA9PT0gJ2JvdGgnIHx8IChcbiAgICAgIHN0YXRlLm1vdmFibGUuY29sb3IgPT09IHBpZWNlLmNvbG9yICYmXG4gICAgICAgIHN0YXRlLnR1cm5Db2xvciA9PT0gcGllY2UuY29sb3JcbiAgICApKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbk1vdmUoc3RhdGU6IFN0YXRlLCBvcmlnOiBjZy5LZXksIGRlc3Q6IGNnLktleSk6IGJvb2xlYW4ge1xuICByZXR1cm4gb3JpZyAhPT0gZGVzdCAmJiBpc01vdmFibGUoc3RhdGUsIG9yaWcpICYmIChcbiAgICBzdGF0ZS5tb3ZhYmxlLmZyZWUgfHwgKCEhc3RhdGUubW92YWJsZS5kZXN0cyAmJiBjb250YWluc1goc3RhdGUubW92YWJsZS5kZXN0c1tvcmlnXSwgZGVzdCkpXG4gICk7XG59XG5cbmZ1bmN0aW9uIGNhbkRyb3Aoc3RhdGU6IFN0YXRlLCBvcmlnOiBjZy5LZXksIGRlc3Q6IGNnLktleSk6IGJvb2xlYW4ge1xuICBjb25zdCBwaWVjZSA9IHN0YXRlLnBpZWNlc1tvcmlnXTtcbiAgcmV0dXJuICEhcGllY2UgJiYgZGVzdCAmJiAob3JpZyA9PT0gZGVzdCB8fCAhc3RhdGUucGllY2VzW2Rlc3RdKSAmJiAoXG4gICAgc3RhdGUubW92YWJsZS5jb2xvciA9PT0gJ2JvdGgnIHx8IChcbiAgICAgIHN0YXRlLm1vdmFibGUuY29sb3IgPT09IHBpZWNlLmNvbG9yICYmXG4gICAgICAgIHN0YXRlLnR1cm5Db2xvciA9PT0gcGllY2UuY29sb3JcbiAgICApKTtcbn1cblxuXG5mdW5jdGlvbiBpc1ByZW1vdmFibGUoc3RhdGU6IFN0YXRlLCBvcmlnOiBjZy5LZXkpOiBib29sZWFuIHtcbiAgY29uc3QgcGllY2UgPSBzdGF0ZS5waWVjZXNbb3JpZ107XG4gIHJldHVybiAhIXBpZWNlICYmIHN0YXRlLnByZW1vdmFibGUuZW5hYmxlZCAmJlxuICBzdGF0ZS5tb3ZhYmxlLmNvbG9yID09PSBwaWVjZS5jb2xvciAmJlxuICAgIHN0YXRlLnR1cm5Db2xvciAhPT0gcGllY2UuY29sb3I7XG59XG5cbmZ1bmN0aW9uIGNhblByZW1vdmUoc3RhdGU6IFN0YXRlLCBvcmlnOiBjZy5LZXksIGRlc3Q6IGNnLktleSk6IGJvb2xlYW4ge1xuICByZXR1cm4gb3JpZyAhPT0gZGVzdCAmJlxuICBpc1ByZW1vdmFibGUoc3RhdGUsIG9yaWcpICYmXG4gIGNvbnRhaW5zWChwcmVtb3ZlKHN0YXRlLnBpZWNlcywgb3JpZywgc3RhdGUucHJlbW92YWJsZS5jYXN0bGUsIHN0YXRlLmdlb21ldHJ5LCBzdGF0ZS52YXJpYW50KSwgZGVzdCk7XG59XG5cbmZ1bmN0aW9uIGNhblByZWRyb3Aoc3RhdGU6IFN0YXRlLCBvcmlnOiBjZy5LZXksIGRlc3Q6IGNnLktleSk6IGJvb2xlYW4ge1xuICBjb25zdCBwaWVjZSA9IHN0YXRlLnBpZWNlc1tvcmlnXTtcbiAgY29uc3QgZGVzdFBpZWNlID0gc3RhdGUucGllY2VzW2Rlc3RdO1xuICByZXR1cm4gISFwaWVjZSAmJiBkZXN0ICYmXG4gICghZGVzdFBpZWNlIHx8IGRlc3RQaWVjZS5jb2xvciAhPT0gc3RhdGUubW92YWJsZS5jb2xvcikgJiZcbiAgc3RhdGUucHJlZHJvcHBhYmxlLmVuYWJsZWQgJiZcbiAgKHBpZWNlLnJvbGUgIT09ICdwYXduJyB8fCAoZGVzdFsxXSAhPT0gJzEnICYmIGRlc3RbMV0gIT09ICc4JykpICYmXG4gIHN0YXRlLm1vdmFibGUuY29sb3IgPT09IHBpZWNlLmNvbG9yICYmXG4gICAgc3RhdGUudHVybkNvbG9yICE9PSBwaWVjZS5jb2xvcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRHJhZ2dhYmxlKHN0YXRlOiBTdGF0ZSwgb3JpZzogY2cuS2V5KTogYm9vbGVhbiB7XG4gIGNvbnN0IHBpZWNlID0gc3RhdGUucGllY2VzW29yaWddO1xuICByZXR1cm4gISFwaWVjZSAmJiBzdGF0ZS5kcmFnZ2FibGUuZW5hYmxlZCAmJiAoXG4gICAgc3RhdGUubW92YWJsZS5jb2xvciA9PT0gJ2JvdGgnIHx8IChcbiAgICAgIHN0YXRlLm1vdmFibGUuY29sb3IgPT09IHBpZWNlLmNvbG9yICYmIChcbiAgICAgICAgc3RhdGUudHVybkNvbG9yID09PSBwaWVjZS5jb2xvciB8fCBzdGF0ZS5wcmVtb3ZhYmxlLmVuYWJsZWRcbiAgICAgIClcbiAgICApXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwbGF5UHJlbW92ZShzdGF0ZTogU3RhdGUpOiBib29sZWFuIHtcbiAgY29uc3QgbW92ZSA9IHN0YXRlLnByZW1vdmFibGUuY3VycmVudDtcbiAgaWYgKCFtb3ZlKSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IG9yaWcgPSBtb3ZlWzBdLCBkZXN0ID0gbW92ZVsxXTtcbiAgbGV0IHN1Y2Nlc3MgPSBmYWxzZTtcbiAgaWYgKGNhbk1vdmUoc3RhdGUsIG9yaWcsIGRlc3QpKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gYmFzZVVzZXJNb3ZlKHN0YXRlLCBvcmlnLCBkZXN0KTtcbiAgICBpZiAocmVzdWx0KSB7XG4gICAgICBjb25zdCBtZXRhZGF0YTogY2cuTW92ZU1ldGFkYXRhID0geyBwcmVtb3ZlOiB0cnVlIH07XG4gICAgICBpZiAocmVzdWx0ICE9PSB0cnVlKSBtZXRhZGF0YS5jYXB0dXJlZCA9IHJlc3VsdDtcbiAgICAgIGNhbGxVc2VyRnVuY3Rpb24oc3RhdGUubW92YWJsZS5ldmVudHMuYWZ0ZXIsIG9yaWcsIGRlc3QsIG1ldGFkYXRhKTtcbiAgICAgIHN1Y2Nlc3MgPSB0cnVlO1xuICAgIH1cbiAgfVxuICB1bnNldFByZW1vdmUoc3RhdGUpO1xuICByZXR1cm4gc3VjY2Vzcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBsYXlQcmVkcm9wKHN0YXRlOiBTdGF0ZSwgdmFsaWRhdGU6IChkcm9wOiBjZy5Ecm9wKSA9PiBib29sZWFuKTogYm9vbGVhbiB7XG4gIGxldCBkcm9wID0gc3RhdGUucHJlZHJvcHBhYmxlLmN1cnJlbnQsXG4gIHN1Y2Nlc3MgPSBmYWxzZTtcbiAgaWYgKCFkcm9wKSByZXR1cm4gZmFsc2U7XG4gIGlmICh2YWxpZGF0ZShkcm9wKSkge1xuICAgIGNvbnN0IHBpZWNlID0ge1xuICAgICAgcm9sZTogZHJvcC5yb2xlLFxuICAgICAgY29sb3I6IHN0YXRlLm1vdmFibGUuY29sb3JcbiAgICB9IGFzIGNnLlBpZWNlO1xuICAgIGlmIChiYXNlTmV3UGllY2Uoc3RhdGUsIHBpZWNlLCBkcm9wLmtleSkpIHtcbiAgICAgIGNhbGxVc2VyRnVuY3Rpb24oc3RhdGUubW92YWJsZS5ldmVudHMuYWZ0ZXJOZXdQaWVjZSwgZHJvcC5yb2xlLCBkcm9wLmtleSwge1xuICAgICAgICBwcmVkcm9wOiB0cnVlXG4gICAgICB9KTtcbiAgICAgIHN1Y2Nlc3MgPSB0cnVlO1xuICAgIH1cbiAgfVxuICB1bnNldFByZWRyb3Aoc3RhdGUpO1xuICByZXR1cm4gc3VjY2Vzcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbmNlbE1vdmUoc3RhdGU6IFN0YXRlKTogdm9pZCB7XG4gIHVuc2V0UHJlbW92ZShzdGF0ZSk7XG4gIHVuc2V0UHJlZHJvcChzdGF0ZSk7XG4gIHVuc2VsZWN0KHN0YXRlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0b3Aoc3RhdGU6IFN0YXRlKTogdm9pZCB7XG4gIHN0YXRlLm1vdmFibGUuY29sb3IgPVxuICBzdGF0ZS5tb3ZhYmxlLmRlc3RzID1cbiAgc3RhdGUuYW5pbWF0aW9uLmN1cnJlbnQgPSB1bmRlZmluZWQ7XG4gIGNhbmNlbE1vdmUoc3RhdGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0S2V5QXREb21Qb3MocG9zOiBjZy5OdW1iZXJQYWlyLCBhc1doaXRlOiBib29sZWFuLCBib3VuZHM6IENsaWVudFJlY3QsIGdlb206IGNnLkdlb21ldHJ5KTogY2cuS2V5IHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgYmQgPSBjZy5kaW1lbnNpb25zW2dlb21dO1xuICBsZXQgZmlsZSA9IE1hdGguY2VpbChiZC53aWR0aCAqICgocG9zWzBdIC0gYm91bmRzLmxlZnQpIC8gYm91bmRzLndpZHRoKSk7XG4gIGlmICghYXNXaGl0ZSkgZmlsZSA9IGJkLndpZHRoICsgMSAtIGZpbGU7XG4gIGxldCByYW5rID0gTWF0aC5jZWlsKGJkLmhlaWdodCAtIChiZC5oZWlnaHQgKiAoKHBvc1sxXSAtIGJvdW5kcy50b3ApIC8gYm91bmRzLmhlaWdodCkpKTtcbiAgaWYgKCFhc1doaXRlKSByYW5rID0gYmQuaGVpZ2h0ICsgMSAtIHJhbms7XG4gIHJldHVybiAoZmlsZSA+IDAgJiYgZmlsZSA8IGJkLndpZHRoICsgMSAmJiByYW5rID4gMCAmJiByYW5rIDwgYmQuaGVpZ2h0ICsgMSkgPyBwb3Mya2V5KFtmaWxlLCByYW5rXSwgZ2VvbSkgOiB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3aGl0ZVBvdihzOiBTdGF0ZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gcy5vcmllbnRhdGlvbiA9PT0gJ3doaXRlJztcbn1cbiIsImltcG9ydCB7IEFwaSwgc3RhcnQgfSBmcm9tICcuL2FwaSdcbmltcG9ydCB7IENvbmZpZywgY29uZmlndXJlIH0gZnJvbSAnLi9jb25maWcnXG5pbXBvcnQgeyBTdGF0ZSwgZGVmYXVsdHMgfSBmcm9tICcuL3N0YXRlJ1xuXG5pbXBvcnQgcmVuZGVyV3JhcCBmcm9tICcuL3dyYXAnO1xuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gJy4vZXZlbnRzJ1xuaW1wb3J0IHJlbmRlciBmcm9tICcuL3JlbmRlcic7XG5pbXBvcnQgKiBhcyBzdmcgZnJvbSAnLi9zdmcnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgZnVuY3Rpb24gQ2hlc3Nncm91bmQoZWxlbWVudDogSFRNTEVsZW1lbnQsIGNvbmZpZz86IENvbmZpZyk6IEFwaSB7XG5cbiAgY29uc3Qgc3RhdGUgPSBkZWZhdWx0cygpIGFzIFN0YXRlO1xuXG4gIGNvbmZpZ3VyZShzdGF0ZSwgY29uZmlnIHx8IHt9KTtcblxuICBmdW5jdGlvbiByZWRyYXdBbGwoKSB7XG4gICAgbGV0IHByZXZVbmJpbmQgPSBzdGF0ZS5kb20gJiYgc3RhdGUuZG9tLnVuYmluZDtcbiAgICAvLyBjb21wdXRlIGJvdW5kcyBmcm9tIGV4aXN0aW5nIGJvYXJkIGVsZW1lbnQgaWYgcG9zc2libGVcbiAgICAvLyB0aGlzIGFsbG93cyBub24tc3F1YXJlIGJvYXJkcyBmcm9tIENTUyB0byBiZSBoYW5kbGVkIChmb3IgM0QpXG4gICAgY29uc3QgcmVsYXRpdmUgPSBzdGF0ZS52aWV3T25seSAmJiAhc3RhdGUuZHJhd2FibGUudmlzaWJsZSxcbiAgICBlbGVtZW50cyA9IHJlbmRlcldyYXAoZWxlbWVudCwgc3RhdGUsIHJlbGF0aXZlKSxcbiAgICBib3VuZHMgPSB1dGlsLm1lbW8oKCkgPT4gZWxlbWVudHMuYm9hcmQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkpLFxuICAgIHJlZHJhd05vdyA9IChza2lwU3ZnPzogYm9vbGVhbikgPT4ge1xuICAgICAgcmVuZGVyKHN0YXRlKTtcbiAgICAgIGlmICghc2tpcFN2ZyAmJiBlbGVtZW50cy5zdmcpIHN2Zy5yZW5kZXJTdmcoc3RhdGUsIGVsZW1lbnRzLnN2Zyk7XG4gICAgfTtcbiAgICBzdGF0ZS5kb20gPSB7XG4gICAgICBlbGVtZW50cyxcbiAgICAgIGJvdW5kcyxcbiAgICAgIHJlZHJhdzogZGVib3VuY2VSZWRyYXcocmVkcmF3Tm93KSxcbiAgICAgIHJlZHJhd05vdyxcbiAgICAgIHVuYmluZDogcHJldlVuYmluZCxcbiAgICAgIHJlbGF0aXZlXG4gICAgfTtcbiAgICBzdGF0ZS5kcmF3YWJsZS5wcmV2U3ZnSGFzaCA9ICcnO1xuICAgIHJlZHJhd05vdyhmYWxzZSk7XG4gICAgZXZlbnRzLmJpbmRCb2FyZChzdGF0ZSk7XG4gICAgaWYgKCFwcmV2VW5iaW5kKSBzdGF0ZS5kb20udW5iaW5kID0gZXZlbnRzLmJpbmREb2N1bWVudChzdGF0ZSwgcmVkcmF3QWxsKTtcbiAgICBzdGF0ZS5ldmVudHMuaW5zZXJ0ICYmIHN0YXRlLmV2ZW50cy5pbnNlcnQoZWxlbWVudHMpO1xuICB9XG4gIHJlZHJhd0FsbCgpO1xuXG4gIHJldHVybiBzdGFydChzdGF0ZSwgcmVkcmF3QWxsKTtcbn07XG5cbmZ1bmN0aW9uIGRlYm91bmNlUmVkcmF3KHJlZHJhd05vdzogKHNraXBTdmc/OiBib29sZWFuKSA9PiB2b2lkKTogKCkgPT4gdm9pZCB7XG4gIGxldCByZWRyYXdpbmcgPSBmYWxzZTtcbiAgcmV0dXJuICgpID0+IHtcbiAgICBpZiAocmVkcmF3aW5nKSByZXR1cm47XG4gICAgcmVkcmF3aW5nID0gdHJ1ZTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgcmVkcmF3Tm93KCk7XG4gICAgICByZWRyYXdpbmcgPSBmYWxzZTtcbiAgICB9KTtcbiAgfTtcbn1cbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCB7IHNldENoZWNrLCBzZXRTZWxlY3RlZCB9IGZyb20gJy4vYm9hcmQnXG5pbXBvcnQgeyByZWFkIGFzIGZlblJlYWQgfSBmcm9tICcuL2ZlbidcbmltcG9ydCB7IERyYXdTaGFwZSwgRHJhd0JydXNoIH0gZnJvbSAnLi9kcmF3J1xuaW1wb3J0ICogYXMgY2cgZnJvbSAnLi90eXBlcydcblxuZXhwb3J0IGludGVyZmFjZSBDb25maWcge1xuICBmZW4/OiBjZy5GRU47IC8vIGNoZXNzIHBvc2l0aW9uIGluIEZvcnN5dGggbm90YXRpb25cbiAgb3JpZW50YXRpb24/OiBjZy5Db2xvcjsgLy8gYm9hcmQgb3JpZW50YXRpb24uIHdoaXRlIHwgYmxhY2tcbiAgdHVybkNvbG9yPzogY2cuQ29sb3I7IC8vIHR1cm4gdG8gcGxheS4gd2hpdGUgfCBibGFja1xuICBjaGVjaz86IGNnLkNvbG9yIHwgYm9vbGVhbjsgLy8gdHJ1ZSBmb3IgY3VycmVudCBjb2xvciwgZmFsc2UgdG8gdW5zZXRcbiAgbGFzdE1vdmU/OiBjZy5LZXlbXTsgLy8gc3F1YXJlcyBwYXJ0IG9mIHRoZSBsYXN0IG1vdmUgW1wiYzNcIiwgXCJjNFwiXVxuICBzZWxlY3RlZD86IGNnLktleTsgLy8gc3F1YXJlIGN1cnJlbnRseSBzZWxlY3RlZCBcImExXCJcbiAgY29vcmRpbmF0ZXM/OiBib29sZWFuOyAvLyBpbmNsdWRlIGNvb3JkcyBhdHRyaWJ1dGVzXG4gIGF1dG9DYXN0bGU/OiBib29sZWFuOyAvLyBpbW1lZGlhdGVseSBjb21wbGV0ZSB0aGUgY2FzdGxlIGJ5IG1vdmluZyB0aGUgcm9vayBhZnRlciBraW5nIG1vdmVcbiAgdmlld09ubHk/OiBib29sZWFuOyAvLyBkb24ndCBiaW5kIGV2ZW50czogdGhlIHVzZXIgd2lsbCBuZXZlciBiZSBhYmxlIHRvIG1vdmUgcGllY2VzIGFyb3VuZFxuICBkaXNhYmxlQ29udGV4dE1lbnU/OiBib29sZWFuOyAvLyBiZWNhdXNlIHdobyBuZWVkcyBhIGNvbnRleHQgbWVudSBvbiBhIGNoZXNzYm9hcmRcbiAgcmVzaXphYmxlPzogYm9vbGVhbjsgLy8gbGlzdGVucyB0byBjaGVzc2dyb3VuZC5yZXNpemUgb24gZG9jdW1lbnQuYm9keSB0byBjbGVhciBib3VuZHMgY2FjaGVcbiAgYWRkUGllY2VaSW5kZXg/OiBib29sZWFuOyAvLyBhZGRzIHotaW5kZXggdmFsdWVzIHRvIHBpZWNlcyAoZm9yIDNEKVxuICAvLyBwaWVjZUtleTogYm9vbGVhbjsgLy8gYWRkIGEgZGF0YS1rZXkgYXR0cmlidXRlIHRvIHBpZWNlIGVsZW1lbnRzXG4gIGhpZ2hsaWdodD86IHtcbiAgICBsYXN0TW92ZT86IGJvb2xlYW47IC8vIGFkZCBsYXN0LW1vdmUgY2xhc3MgdG8gc3F1YXJlc1xuICAgIGNoZWNrPzogYm9vbGVhbjsgLy8gYWRkIGNoZWNrIGNsYXNzIHRvIHNxdWFyZXNcbiAgfTtcbiAgYW5pbWF0aW9uPzoge1xuICAgIGVuYWJsZWQ/OiBib29sZWFuO1xuICAgIGR1cmF0aW9uPzogbnVtYmVyO1xuICB9O1xuICBtb3ZhYmxlPzoge1xuICAgIGZyZWU/OiBib29sZWFuOyAvLyBhbGwgbW92ZXMgYXJlIHZhbGlkIC0gYm9hcmQgZWRpdG9yXG4gICAgY29sb3I/OiBjZy5Db2xvciB8ICdib3RoJzsgLy8gY29sb3IgdGhhdCBjYW4gbW92ZS4gd2hpdGUgfCBibGFjayB8IGJvdGggfCB1bmRlZmluZWRcbiAgICBkZXN0cz86IHtcbiAgICAgIFtrZXk6IHN0cmluZ106IGNnLktleVtdXG4gICAgfTsgLy8gdmFsaWQgbW92ZXMuIHtcImEyXCIgW1wiYTNcIiBcImE0XCJdIFwiYjFcIiBbXCJhM1wiIFwiYzNcIl19XG4gICAgc2hvd0Rlc3RzPzogYm9vbGVhbjsgLy8gd2hldGhlciB0byBhZGQgdGhlIG1vdmUtZGVzdCBjbGFzcyBvbiBzcXVhcmVzXG4gICAgZXZlbnRzPzoge1xuICAgICAgYWZ0ZXI/OiAob3JpZzogY2cuS2V5LCBkZXN0OiBjZy5LZXksIG1ldGFkYXRhOiBjZy5Nb3ZlTWV0YWRhdGEpID0+IHZvaWQ7IC8vIGNhbGxlZCBhZnRlciB0aGUgbW92ZSBoYXMgYmVlbiBwbGF5ZWRcbiAgICAgIGFmdGVyTmV3UGllY2U/OiAocm9sZTogY2cuUm9sZSwga2V5OiBjZy5LZXksIG1ldGFkYXRhOiBjZy5Nb3ZlTWV0YWRhdGEpID0+IHZvaWQ7IC8vIGNhbGxlZCBhZnRlciBhIG5ldyBwaWVjZSBpcyBkcm9wcGVkIG9uIHRoZSBib2FyZFxuICAgIH07XG4gICAgcm9va0Nhc3RsZT86IGJvb2xlYW4gLy8gY2FzdGxlIGJ5IG1vdmluZyB0aGUga2luZyB0byB0aGUgcm9va1xuICB9O1xuICBwcmVtb3ZhYmxlPzoge1xuICAgIGVuYWJsZWQ/OiBib29sZWFuOyAvLyBhbGxvdyBwcmVtb3ZlcyBmb3IgY29sb3IgdGhhdCBjYW4gbm90IG1vdmVcbiAgICBzaG93RGVzdHM/OiBib29sZWFuOyAvLyB3aGV0aGVyIHRvIGFkZCB0aGUgcHJlbW92ZS1kZXN0IGNsYXNzIG9uIHNxdWFyZXNcbiAgICBjYXN0bGU/OiBib29sZWFuOyAvLyB3aGV0aGVyIHRvIGFsbG93IGtpbmcgY2FzdGxlIHByZW1vdmVzXG4gICAgZGVzdHM/OiBjZy5LZXlbXTsgLy8gcHJlbW92ZSBkZXN0aW5hdGlvbnMgZm9yIHRoZSBjdXJyZW50IHNlbGVjdGlvblxuICAgIGV2ZW50cz86IHtcbiAgICAgIHNldD86IChvcmlnOiBjZy5LZXksIGRlc3Q6IGNnLktleSwgbWV0YWRhdGE/OiBjZy5TZXRQcmVtb3ZlTWV0YWRhdGEpID0+IHZvaWQ7IC8vIGNhbGxlZCBhZnRlciB0aGUgcHJlbW92ZSBoYXMgYmVlbiBzZXRcbiAgICAgIHVuc2V0PzogKCkgPT4gdm9pZDsgIC8vIGNhbGxlZCBhZnRlciB0aGUgcHJlbW92ZSBoYXMgYmVlbiB1bnNldFxuICAgIH1cbiAgfTtcbiAgcHJlZHJvcHBhYmxlPzoge1xuICAgIGVuYWJsZWQ/OiBib29sZWFuOyAvLyBhbGxvdyBwcmVkcm9wcyBmb3IgY29sb3IgdGhhdCBjYW4gbm90IG1vdmVcbiAgICBldmVudHM/OiB7XG4gICAgICBzZXQ/OiAocm9sZTogY2cuUm9sZSwga2V5OiBjZy5LZXkpID0+IHZvaWQ7IC8vIGNhbGxlZCBhZnRlciB0aGUgcHJlZHJvcCBoYXMgYmVlbiBzZXRcbiAgICAgIHVuc2V0PzogKCkgPT4gdm9pZDsgLy8gY2FsbGVkIGFmdGVyIHRoZSBwcmVkcm9wIGhhcyBiZWVuIHVuc2V0XG4gICAgfVxuICB9O1xuICBkcmFnZ2FibGU/OiB7XG4gICAgZW5hYmxlZD86IGJvb2xlYW47IC8vIGFsbG93IG1vdmVzICYgcHJlbW92ZXMgdG8gdXNlIGRyYWcnbiBkcm9wXG4gICAgZGlzdGFuY2U/OiBudW1iZXI7IC8vIG1pbmltdW0gZGlzdGFuY2UgdG8gaW5pdGlhdGUgYSBkcmFnOyBpbiBwaXhlbHNcbiAgICBhdXRvRGlzdGFuY2U/OiBib29sZWFuOyAvLyBsZXRzIGNoZXNzZ3JvdW5kIHNldCBkaXN0YW5jZSB0byB6ZXJvIHdoZW4gdXNlciBkcmFncyBwaWVjZXNcbiAgICBjZW50ZXJQaWVjZT86IGJvb2xlYW47IC8vIGNlbnRlciB0aGUgcGllY2Ugb24gY3Vyc29yIGF0IGRyYWcgc3RhcnRcbiAgICBzaG93R2hvc3Q/OiBib29sZWFuOyAvLyBzaG93IGdob3N0IG9mIHBpZWNlIGJlaW5nIGRyYWdnZWRcbiAgICBkZWxldGVPbkRyb3BPZmY/OiBib29sZWFuOyAvLyBkZWxldGUgYSBwaWVjZSB3aGVuIGl0IGlzIGRyb3BwZWQgb2ZmIHRoZSBib2FyZFxuICB9O1xuICBzZWxlY3RhYmxlPzoge1xuICAgIC8vIGRpc2FibGUgdG8gZW5mb3JjZSBkcmFnZ2luZyBvdmVyIGNsaWNrLWNsaWNrIG1vdmVcbiAgICBlbmFibGVkPzogYm9vbGVhblxuICB9O1xuICBldmVudHM/OiB7XG4gICAgY2hhbmdlPzogKCkgPT4gdm9pZDsgLy8gY2FsbGVkIGFmdGVyIHRoZSBzaXR1YXRpb24gY2hhbmdlcyBvbiB0aGUgYm9hcmRcbiAgICAvLyBjYWxsZWQgYWZ0ZXIgYSBwaWVjZSBoYXMgYmVlbiBtb3ZlZC5cbiAgICAvLyBjYXB0dXJlZFBpZWNlIGlzIHVuZGVmaW5lZCBvciBsaWtlIHtjb2xvcjogJ3doaXRlJzsgJ3JvbGUnOiAncXVlZW4nfVxuICAgIG1vdmU/OiAob3JpZzogY2cuS2V5LCBkZXN0OiBjZy5LZXksIGNhcHR1cmVkUGllY2U/OiBjZy5QaWVjZSkgPT4gdm9pZDtcbiAgICBkcm9wTmV3UGllY2U/OiAocGllY2U6IGNnLlBpZWNlLCBrZXk6IGNnLktleSkgPT4gdm9pZDtcbiAgICBzZWxlY3Q/OiAoa2V5OiBjZy5LZXkpID0+IHZvaWQ7IC8vIGNhbGxlZCB3aGVuIGEgc3F1YXJlIGlzIHNlbGVjdGVkXG4gICAgaW5zZXJ0PzogKGVsZW1lbnRzOiBjZy5FbGVtZW50cykgPT4gdm9pZDsgLy8gd2hlbiB0aGUgYm9hcmQgRE9NIGhhcyBiZWVuIChyZSlpbnNlcnRlZFxuICB9O1xuICBkcmF3YWJsZT86IHtcbiAgICBlbmFibGVkPzogYm9vbGVhbjsgLy8gY2FuIGRyYXdcbiAgICB2aXNpYmxlPzogYm9vbGVhbjsgLy8gY2FuIHZpZXdcbiAgICBlcmFzZU9uQ2xpY2s/OiBib29sZWFuO1xuICAgIHNoYXBlcz86IERyYXdTaGFwZVtdO1xuICAgIGF1dG9TaGFwZXM/OiBEcmF3U2hhcGVbXTtcbiAgICBicnVzaGVzPzogRHJhd0JydXNoW107XG4gICAgcGllY2VzPzoge1xuICAgICAgYmFzZVVybD86IHN0cmluZztcbiAgICB9XG4gIH07XG4gIGdlb21ldHJ5PzogY2cuR2VvbWV0cnk7IC8vIGRpbTV4NSB8IGRpbTd4NyB8IGRpbTh4OCB8IGRpbTl4OSB8IGRpbTEweDggfCBkaW05eDEwIHwgZGltMTB4MTBcbiAgdmFyaWFudD86IGNnLlZhcmlhbnQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb25maWd1cmUoc3RhdGU6IFN0YXRlLCBjb25maWc6IENvbmZpZykge1xuXG4gIC8vIGRvbid0IG1lcmdlIGRlc3RpbmF0aW9ucy4gSnVzdCBvdmVycmlkZS5cbiAgaWYgKGNvbmZpZy5tb3ZhYmxlICYmIGNvbmZpZy5tb3ZhYmxlLmRlc3RzKSBzdGF0ZS5tb3ZhYmxlLmRlc3RzID0gdW5kZWZpbmVkO1xuXG4gIG1lcmdlKHN0YXRlLCBjb25maWcpO1xuXG4gIGlmIChjb25maWcuZ2VvbWV0cnkpIHN0YXRlLmRpbWVuc2lvbnMgPSBjZy5kaW1lbnNpb25zW2NvbmZpZy5nZW9tZXRyeV07XG5cbiAgLy8gaWYgYSBmZW4gd2FzIHByb3ZpZGVkLCByZXBsYWNlIHRoZSBwaWVjZXNcbiAgaWYgKGNvbmZpZy5mZW4pIHtcbiAgICBzdGF0ZS5waWVjZXMgPSBmZW5SZWFkKGNvbmZpZy5mZW4sIHN0YXRlLmdlb21ldHJ5KTtcbiAgICBzdGF0ZS5kcmF3YWJsZS5zaGFwZXMgPSBbXTtcbiAgfVxuXG4gIC8vIGFwcGx5IGNvbmZpZyB2YWx1ZXMgdGhhdCBjb3VsZCBiZSB1bmRlZmluZWQgeWV0IG1lYW5pbmdmdWxcbiAgaWYgKGNvbmZpZy5oYXNPd25Qcm9wZXJ0eSgnY2hlY2snKSkgc2V0Q2hlY2soc3RhdGUsIGNvbmZpZy5jaGVjayB8fCBmYWxzZSk7XG4gIGlmIChjb25maWcuaGFzT3duUHJvcGVydHkoJ2xhc3RNb3ZlJykgJiYgIWNvbmZpZy5sYXN0TW92ZSkgc3RhdGUubGFzdE1vdmUgPSB1bmRlZmluZWQ7XG4gIC8vIGluIGNhc2Ugb2YgWkggZHJvcCBsYXN0IG1vdmUsIHRoZXJlJ3MgYSBzaW5nbGUgc3F1YXJlLlxuICAvLyBpZiB0aGUgcHJldmlvdXMgbGFzdCBtb3ZlIGhhZCB0d28gc3F1YXJlcyxcbiAgLy8gdGhlIG1lcmdlIGFsZ29yaXRobSB3aWxsIGluY29ycmVjdGx5IGtlZXAgdGhlIHNlY29uZCBzcXVhcmUuXG4gIGVsc2UgaWYgKGNvbmZpZy5sYXN0TW92ZSkgc3RhdGUubGFzdE1vdmUgPSBjb25maWcubGFzdE1vdmU7XG5cbiAgLy8gZml4IG1vdmUvcHJlbW92ZSBkZXN0c1xuICBpZiAoc3RhdGUuc2VsZWN0ZWQpIHNldFNlbGVjdGVkKHN0YXRlLCBzdGF0ZS5zZWxlY3RlZCk7XG5cbiAgLy8gbm8gbmVlZCBmb3Igc3VjaCBzaG9ydCBhbmltYXRpb25zXG4gIGlmICghc3RhdGUuYW5pbWF0aW9uLmR1cmF0aW9uIHx8IHN0YXRlLmFuaW1hdGlvbi5kdXJhdGlvbiA8IDEwMCkgc3RhdGUuYW5pbWF0aW9uLmVuYWJsZWQgPSBmYWxzZTtcblxuICBpZiAoIXN0YXRlLm1vdmFibGUucm9va0Nhc3RsZSAmJiBzdGF0ZS5tb3ZhYmxlLmRlc3RzKSB7XG4gICAgY29uc3QgcmFuayA9IHN0YXRlLm1vdmFibGUuY29sb3IgPT09ICd3aGl0ZScgPyAxIDogOCxcbiAgICBraW5nU3RhcnRQb3MgPSAnZScgKyByYW5rLFxuICAgIGRlc3RzID0gc3RhdGUubW92YWJsZS5kZXN0c1traW5nU3RhcnRQb3NdLFxuICAgIGtpbmcgPSBzdGF0ZS5waWVjZXNba2luZ1N0YXJ0UG9zXTtcbiAgICBpZiAoIWRlc3RzIHx8ICFraW5nIHx8IGtpbmcucm9sZSAhPT0gJ2tpbmcnKSByZXR1cm47XG4gICAgc3RhdGUubW92YWJsZS5kZXN0c1traW5nU3RhcnRQb3NdID0gZGVzdHMuZmlsdGVyKGQgPT5cbiAgICAgICEoKGQgPT09ICdhJyArIHJhbmspICYmIGRlc3RzLmluZGV4T2YoJ2MnICsgcmFuayBhcyBjZy5LZXkpICE9PSAtMSkgJiZcbiAgICAgICAgISgoZCA9PT0gJ2gnICsgcmFuaykgJiYgZGVzdHMuaW5kZXhPZignZycgKyByYW5rIGFzIGNnLktleSkgIT09IC0xKVxuICAgICk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIG1lcmdlKGJhc2U6IGFueSwgZXh0ZW5kOiBhbnkpIHtcbiAgZm9yIChsZXQga2V5IGluIGV4dGVuZCkge1xuICAgIGlmIChpc09iamVjdChiYXNlW2tleV0pICYmIGlzT2JqZWN0KGV4dGVuZFtrZXldKSkgbWVyZ2UoYmFzZVtrZXldLCBleHRlbmRba2V5XSk7XG4gICAgZWxzZSBiYXNlW2tleV0gPSBleHRlbmRba2V5XTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc09iamVjdChvOiBhbnkpOiBib29sZWFuIHtcbiAgcmV0dXJuIHR5cGVvZiBvID09PSAnb2JqZWN0Jztcbn1cbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCAqIGFzIGJvYXJkIGZyb20gJy4vYm9hcmQnXG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4vdXRpbCdcbmltcG9ydCB7IGNsZWFyIGFzIGRyYXdDbGVhciB9IGZyb20gJy4vZHJhdydcbmltcG9ydCAqIGFzIGNnIGZyb20gJy4vdHlwZXMnXG5pbXBvcnQgeyBhbmltIH0gZnJvbSAnLi9hbmltJ1xuXG5leHBvcnQgaW50ZXJmYWNlIERyYWdDdXJyZW50IHtcbiAgb3JpZzogY2cuS2V5OyAvLyBvcmlnIGtleSBvZiBkcmFnZ2luZyBwaWVjZVxuICBvcmlnUG9zOiBjZy5Qb3M7XG4gIHBpZWNlOiBjZy5QaWVjZTtcbiAgcmVsOiBjZy5OdW1iZXJQYWlyOyAvLyB4OyB5IG9mIHRoZSBwaWVjZSBhdCBvcmlnaW5hbCBwb3NpdGlvblxuICBlcG9zOiBjZy5OdW1iZXJQYWlyOyAvLyBpbml0aWFsIGV2ZW50IHBvc2l0aW9uXG4gIHBvczogY2cuTnVtYmVyUGFpcjsgLy8gcmVsYXRpdmUgY3VycmVudCBwb3NpdGlvblxuICBkZWM6IGNnLk51bWJlclBhaXI7IC8vIHBpZWNlIGNlbnRlciBkZWNheVxuICBzdGFydGVkOiBib29sZWFuOyAvLyB3aGV0aGVyIHRoZSBkcmFnIGhhcyBzdGFydGVkOyBhcyBwZXIgdGhlIGRpc3RhbmNlIHNldHRpbmdcbiAgZWxlbWVudDogY2cuUGllY2VOb2RlIHwgKCgpID0+IGNnLlBpZWNlTm9kZSB8IHVuZGVmaW5lZCk7XG4gIG5ld1BpZWNlPzogYm9vbGVhbjsgLy8gaXQgaXQgYSBuZXcgcGllY2UgZnJvbSBvdXRzaWRlIHRoZSBib2FyZFxuICBmb3JjZT86IGJvb2xlYW47IC8vIGNhbiB0aGUgbmV3IHBpZWNlIHJlcGxhY2UgYW4gZXhpc3Rpbmcgb25lIChlZGl0b3IpXG4gIHByZXZpb3VzbHlTZWxlY3RlZD86IGNnLktleTtcbiAgb3JpZ2luVGFyZ2V0OiBFdmVudFRhcmdldCB8IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdGFydChzOiBTdGF0ZSwgZTogY2cuTW91Y2hFdmVudCk6IHZvaWQge1xuICBpZiAoZS5idXR0b24gIT09IHVuZGVmaW5lZCAmJiBlLmJ1dHRvbiAhPT0gMCkgcmV0dXJuOyAvLyBvbmx5IHRvdWNoIG9yIGxlZnQgY2xpY2tcbiAgaWYgKGUudG91Y2hlcyAmJiBlLnRvdWNoZXMubGVuZ3RoID4gMSkgcmV0dXJuOyAvLyBzdXBwb3J0IG9uZSBmaW5nZXIgdG91Y2ggb25seVxuICBjb25zdCBib3VuZHMgPSBzLmRvbS5ib3VuZHMoKSxcbiAgcG9zaXRpb24gPSB1dGlsLmV2ZW50UG9zaXRpb24oZSkgYXMgY2cuTnVtYmVyUGFpcixcbiAgb3JpZyA9IGJvYXJkLmdldEtleUF0RG9tUG9zKHBvc2l0aW9uLCBib2FyZC53aGl0ZVBvdihzKSwgYm91bmRzLCBzLmdlb21ldHJ5KTtcbiAgaWYgKCFvcmlnKSByZXR1cm47XG4gIGNvbnN0IHBpZWNlID0gcy5waWVjZXNbb3JpZ107XG4gIGNvbnN0IHByZXZpb3VzbHlTZWxlY3RlZCA9IHMuc2VsZWN0ZWQ7XG4gIGlmICghcHJldmlvdXNseVNlbGVjdGVkICYmIHMuZHJhd2FibGUuZW5hYmxlZCAmJiAoXG4gICAgcy5kcmF3YWJsZS5lcmFzZU9uQ2xpY2sgfHwgKCFwaWVjZSB8fCBwaWVjZS5jb2xvciAhPT0gcy50dXJuQ29sb3IpXG4gICkpIGRyYXdDbGVhcihzKTtcbiAgLy8gUHJldmVudCB0b3VjaCBzY3JvbGwgYW5kIGNyZWF0ZSBubyBjb3JyZXNwb25kaW5nIG1vdXNlIGV2ZW50LCBpZiB0aGVyZVxuICAvLyBpcyBhbiBpbnRlbnQgdG8gaW50ZXJhY3Qgd2l0aCB0aGUgYm9hcmQuIElmIG5vIGNvbG9yIGlzIG1vdmFibGVcbiAgLy8gKGFuZCB0aGUgYm9hcmQgaXMgbm90IGZvciB2aWV3aW5nIG9ubHkpLCB0b3VjaGVzIGFyZSBsaWtlbHkgaW50ZW5kZWQgdG9cbiAgLy8gc2VsZWN0IHNxdWFyZXMuXG4gIGlmIChlLmNhbmNlbGFibGUgIT09IGZhbHNlICYmXG4gICAgICAoIWUudG91Y2hlcyB8fCAhcy5tb3ZhYmxlLmNvbG9yIHx8IHBpZWNlIHx8IHByZXZpb3VzbHlTZWxlY3RlZCB8fCBwaWVjZUNsb3NlVG8ocywgcG9zaXRpb24pKSlcbiAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIGNvbnN0IGhhZFByZW1vdmUgPSAhIXMucHJlbW92YWJsZS5jdXJyZW50O1xuICBjb25zdCBoYWRQcmVkcm9wID0gISFzLnByZWRyb3BwYWJsZS5jdXJyZW50O1xuICBzLnN0YXRzLmN0cmxLZXkgPSBlLmN0cmxLZXk7XG4gIGlmIChzLnNlbGVjdGVkICYmIGJvYXJkLmNhbk1vdmUocywgcy5zZWxlY3RlZCwgb3JpZykpIHtcbiAgICBhbmltKHN0YXRlID0+IGJvYXJkLnNlbGVjdFNxdWFyZShzdGF0ZSwgb3JpZyksIHMpO1xuICB9IGVsc2Uge1xuICAgIGJvYXJkLnNlbGVjdFNxdWFyZShzLCBvcmlnKTtcbiAgfVxuICBjb25zdCBzdGlsbFNlbGVjdGVkID0gcy5zZWxlY3RlZCA9PT0gb3JpZztcbiAgY29uc3QgZWxlbWVudCA9IHBpZWNlRWxlbWVudEJ5S2V5KHMsIG9yaWcpO1xuICBjb25zdCBmaXJzdFJhbmtJczAgPSBzLmRpbWVuc2lvbnMuaGVpZ2h0ID09PSAxMDtcbiAgaWYgKHBpZWNlICYmIGVsZW1lbnQgJiYgc3RpbGxTZWxlY3RlZCAmJiBib2FyZC5pc0RyYWdnYWJsZShzLCBvcmlnKSkge1xuICAgIGNvbnN0IHNxdWFyZUJvdW5kcyA9IGNvbXB1dGVTcXVhcmVCb3VuZHMob3JpZywgYm9hcmQud2hpdGVQb3YocyksIGJvdW5kcywgcy5kaW1lbnNpb25zKTtcbiAgICBzLmRyYWdnYWJsZS5jdXJyZW50ID0ge1xuICAgICAgb3JpZyxcbiAgICAgIG9yaWdQb3M6IHV0aWwua2V5MnBvcyhvcmlnLCBmaXJzdFJhbmtJczApLFxuICAgICAgcGllY2UsXG4gICAgICByZWw6IHBvc2l0aW9uLFxuICAgICAgZXBvczogcG9zaXRpb24sXG4gICAgICBwb3M6IFswLCAwXSxcbiAgICAgIGRlYzogcy5kcmFnZ2FibGUuY2VudGVyUGllY2UgPyBbXG4gICAgICAgIHBvc2l0aW9uWzBdIC0gKHNxdWFyZUJvdW5kcy5sZWZ0ICsgc3F1YXJlQm91bmRzLndpZHRoIC8gMiksXG4gICAgICAgIHBvc2l0aW9uWzFdIC0gKHNxdWFyZUJvdW5kcy50b3AgKyBzcXVhcmVCb3VuZHMuaGVpZ2h0IC8gMilcbiAgICAgIF0gOiBbMCwgMF0sXG4gICAgICBzdGFydGVkOiBzLmRyYWdnYWJsZS5hdXRvRGlzdGFuY2UgJiYgcy5zdGF0cy5kcmFnZ2VkLFxuICAgICAgZWxlbWVudCxcbiAgICAgIHByZXZpb3VzbHlTZWxlY3RlZCxcbiAgICAgIG9yaWdpblRhcmdldDogZS50YXJnZXRcbiAgICB9O1xuICAgIGVsZW1lbnQuY2dEcmFnZ2luZyA9IHRydWU7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdkcmFnZ2luZycpO1xuICAgIC8vIHBsYWNlIGdob3N0XG4gICAgY29uc3QgZ2hvc3QgPSBzLmRvbS5lbGVtZW50cy5naG9zdDtcbiAgICBpZiAoZ2hvc3QpIHtcbiAgICAgIGdob3N0LmNsYXNzTmFtZSA9IGBnaG9zdCAke3BpZWNlLmNvbG9yfSAke3BpZWNlLnJvbGV9YDtcbiAgICAgIHV0aWwudHJhbnNsYXRlQWJzKGdob3N0LCB1dGlsLnBvc1RvVHJhbnNsYXRlQWJzKGJvdW5kcywgcy5kaW1lbnNpb25zKSh1dGlsLmtleTJwb3Mob3JpZywgZmlyc3RSYW5rSXMwKSwgYm9hcmQud2hpdGVQb3YocykpKTtcbiAgICAgIHV0aWwuc2V0VmlzaWJsZShnaG9zdCwgdHJ1ZSk7XG4gICAgfVxuICAgIHByb2Nlc3NEcmFnKHMpO1xuICB9IGVsc2Uge1xuICAgIGlmIChoYWRQcmVtb3ZlKSBib2FyZC51bnNldFByZW1vdmUocyk7XG4gICAgaWYgKGhhZFByZWRyb3ApIGJvYXJkLnVuc2V0UHJlZHJvcChzKTtcbiAgfVxuICBzLmRvbS5yZWRyYXcoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBpZWNlQ2xvc2VUbyhzOiBTdGF0ZSwgcG9zOiBjZy5Qb3MpOiBib29sZWFuIHtcbiAgY29uc3QgYXNXaGl0ZSA9IGJvYXJkLndoaXRlUG92KHMpLFxuICBib3VuZHMgPSBzLmRvbS5ib3VuZHMoKSxcbiAgcmFkaXVzU3EgPSBNYXRoLnBvdyhib3VuZHMud2lkdGggLyA4LCAyKTtcbiAgZm9yIChsZXQga2V5IGluIHMucGllY2VzKSB7XG4gICAgY29uc3Qgc3F1YXJlQm91bmRzID0gY29tcHV0ZVNxdWFyZUJvdW5kcyhrZXkgYXMgY2cuS2V5LCBhc1doaXRlLCBib3VuZHMsIHMuZGltZW5zaW9ucyksXG4gICAgY2VudGVyOiBjZy5Qb3MgPSBbXG4gICAgICBzcXVhcmVCb3VuZHMubGVmdCArIHNxdWFyZUJvdW5kcy53aWR0aCAvIDIsXG4gICAgICBzcXVhcmVCb3VuZHMudG9wICsgc3F1YXJlQm91bmRzLmhlaWdodCAvIDJcbiAgICBdO1xuICAgIGlmICh1dGlsLmRpc3RhbmNlU3EoY2VudGVyLCBwb3MpIDw9IHJhZGl1c1NxKSByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkcmFnTmV3UGllY2UoczogU3RhdGUsIHBpZWNlOiBjZy5QaWVjZSwgZTogY2cuTW91Y2hFdmVudCwgZm9yY2U/OiBib29sZWFuKTogdm9pZCB7XG5cbiAgY29uc3Qga2V5OiBjZy5LZXkgPSAnejAnO1xuXG4gIHMucGllY2VzW2tleV0gPSBwaWVjZTtcblxuICBzLmRvbS5yZWRyYXcoKTtcblxuICBjb25zdCBwb3NpdGlvbiA9IHV0aWwuZXZlbnRQb3NpdGlvbihlKSBhcyBjZy5OdW1iZXJQYWlyLFxuICBhc1doaXRlID0gYm9hcmQud2hpdGVQb3YocyksXG4gIGJvdW5kcyA9IHMuZG9tLmJvdW5kcygpLFxuICBzcXVhcmVCb3VuZHMgPSBjb21wdXRlU3F1YXJlQm91bmRzKGtleSwgYXNXaGl0ZSwgYm91bmRzLCBzLmRpbWVuc2lvbnMpO1xuXG4gIGNvbnN0IHJlbDogY2cuTnVtYmVyUGFpciA9IFtcbiAgICAoYXNXaGl0ZSA/IDAgOiBzLmRpbWVuc2lvbnMud2lkdGggLSAxKSAqIHNxdWFyZUJvdW5kcy53aWR0aCArIGJvdW5kcy5sZWZ0LFxuICAgIChhc1doaXRlID8gcy5kaW1lbnNpb25zLmhlaWdodCA6IC0xKSAqIHNxdWFyZUJvdW5kcy5oZWlnaHQgKyBib3VuZHMudG9wXG4gIF07XG5cbiAgY29uc3QgZmlyc3RSYW5rSXMwID0gcy5nZW9tZXRyeSA9PT0gY2cuR2VvbWV0cnkuZGltOXgxMDtcbiAgcy5kcmFnZ2FibGUuY3VycmVudCA9IHtcbiAgICBvcmlnOiBrZXksXG4gICAgb3JpZ1BvczogdXRpbC5rZXkycG9zKCdhMCcsIGZpcnN0UmFua0lzMCksXG4gICAgcGllY2UsXG4gICAgcmVsLFxuICAgIGVwb3M6IHBvc2l0aW9uLFxuICAgIHBvczogW3Bvc2l0aW9uWzBdIC0gcmVsWzBdLCBwb3NpdGlvblsxXSAtIHJlbFsxXV0sXG4gICAgZGVjOiBbLXNxdWFyZUJvdW5kcy53aWR0aCAvIDIsIC1zcXVhcmVCb3VuZHMuaGVpZ2h0IC8gMl0sXG4gICAgc3RhcnRlZDogdHJ1ZSxcbiAgICBlbGVtZW50OiAoKSA9PiBwaWVjZUVsZW1lbnRCeUtleShzLCBrZXkpLFxuICAgIG9yaWdpblRhcmdldDogZS50YXJnZXQsXG4gICAgbmV3UGllY2U6IHRydWUsXG4gICAgZm9yY2U6ICEhZm9yY2VcbiAgfTtcbiAgcHJvY2Vzc0RyYWcocyk7XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NEcmFnKHM6IFN0YXRlKTogdm9pZCB7XG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgY29uc3QgY3VyID0gcy5kcmFnZ2FibGUuY3VycmVudDtcbiAgICBpZiAoIWN1cikgcmV0dXJuO1xuICAgIC8vIGNhbmNlbCBhbmltYXRpb25zIHdoaWxlIGRyYWdnaW5nXG4gICAgaWYgKHMuYW5pbWF0aW9uLmN1cnJlbnQgJiYgcy5hbmltYXRpb24uY3VycmVudC5wbGFuLmFuaW1zW2N1ci5vcmlnXSkgcy5hbmltYXRpb24uY3VycmVudCA9IHVuZGVmaW5lZDtcbiAgICAvLyBpZiBtb3ZpbmcgcGllY2UgaXMgZ29uZSwgY2FuY2VsXG4gICAgY29uc3Qgb3JpZ1BpZWNlID0gcy5waWVjZXNbY3VyLm9yaWddO1xuICAgIGlmICghb3JpZ1BpZWNlIHx8ICF1dGlsLnNhbWVQaWVjZShvcmlnUGllY2UsIGN1ci5waWVjZSkpIGNhbmNlbChzKTtcbiAgICBlbHNlIHtcbiAgICAgIGlmICghY3VyLnN0YXJ0ZWQgJiYgdXRpbC5kaXN0YW5jZVNxKGN1ci5lcG9zLCBjdXIucmVsKSA+PSBNYXRoLnBvdyhzLmRyYWdnYWJsZS5kaXN0YW5jZSwgMikpIGN1ci5zdGFydGVkID0gdHJ1ZTtcbiAgICAgIGlmIChjdXIuc3RhcnRlZCkge1xuXG4gICAgICAgIC8vIHN1cHBvcnQgbGF6eSBlbGVtZW50c1xuICAgICAgICBpZiAodHlwZW9mIGN1ci5lbGVtZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgY29uc3QgZm91bmQgPSBjdXIuZWxlbWVudCgpO1xuICAgICAgICAgIGlmICghZm91bmQpIHJldHVybjtcbiAgICAgICAgICBmb3VuZC5jZ0RyYWdnaW5nID0gdHJ1ZTtcbiAgICAgICAgICBmb3VuZC5jbGFzc0xpc3QuYWRkKCdkcmFnZ2luZycpO1xuICAgICAgICAgIGN1ci5lbGVtZW50ID0gZm91bmQ7XG4gICAgICAgIH1cblxuICAgICAgICBjdXIucG9zID0gW1xuICAgICAgICAgIGN1ci5lcG9zWzBdIC0gY3VyLnJlbFswXSxcbiAgICAgICAgICBjdXIuZXBvc1sxXSAtIGN1ci5yZWxbMV1cbiAgICAgICAgXTtcblxuICAgICAgICAvLyBtb3ZlIHBpZWNlXG4gICAgICAgIGNvbnN0IHRyYW5zbGF0aW9uID0gdXRpbC5wb3NUb1RyYW5zbGF0ZUFicyhzLmRvbS5ib3VuZHMoKSwgcy5kaW1lbnNpb25zKShjdXIub3JpZ1BvcywgYm9hcmQud2hpdGVQb3YocykpO1xuICAgICAgICB0cmFuc2xhdGlvblswXSArPSBjdXIucG9zWzBdICsgY3VyLmRlY1swXTtcbiAgICAgICAgdHJhbnNsYXRpb25bMV0gKz0gY3VyLnBvc1sxXSArIGN1ci5kZWNbMV07XG4gICAgICAgIHV0aWwudHJhbnNsYXRlQWJzKGN1ci5lbGVtZW50LCB0cmFuc2xhdGlvbik7XG4gICAgICB9XG4gICAgfVxuICAgIHByb2Nlc3NEcmFnKHMpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1vdmUoczogU3RhdGUsIGU6IGNnLk1vdWNoRXZlbnQpOiB2b2lkIHtcbiAgLy8gc3VwcG9ydCBvbmUgZmluZ2VyIHRvdWNoIG9ubHlcbiAgaWYgKHMuZHJhZ2dhYmxlLmN1cnJlbnQgJiYgKCFlLnRvdWNoZXMgfHwgZS50b3VjaGVzLmxlbmd0aCA8IDIpKSB7XG4gICAgcy5kcmFnZ2FibGUuY3VycmVudC5lcG9zID0gdXRpbC5ldmVudFBvc2l0aW9uKGUpIGFzIGNnLk51bWJlclBhaXI7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVuZChzOiBTdGF0ZSwgZTogY2cuTW91Y2hFdmVudCk6IHZvaWQge1xuICBjb25zdCBjdXIgPSBzLmRyYWdnYWJsZS5jdXJyZW50O1xuICBpZiAoIWN1cikgcmV0dXJuO1xuICAvLyBjcmVhdGUgbm8gY29ycmVzcG9uZGluZyBtb3VzZSBldmVudFxuICBpZiAoZS50eXBlID09PSAndG91Y2hlbmQnICYmIGUuY2FuY2VsYWJsZSAhPT0gZmFsc2UpIGUucHJldmVudERlZmF1bHQoKTtcbiAgLy8gY29tcGFyaW5nIHdpdGggdGhlIG9yaWdpbiB0YXJnZXQgaXMgYW4gZWFzeSB3YXkgdG8gdGVzdCB0aGF0IHRoZSBlbmQgZXZlbnRcbiAgLy8gaGFzIHRoZSBzYW1lIHRvdWNoIG9yaWdpblxuICBpZiAoZS50eXBlID09PSAndG91Y2hlbmQnICYmIGN1ciAmJiBjdXIub3JpZ2luVGFyZ2V0ICE9PSBlLnRhcmdldCAmJiAhY3VyLm5ld1BpZWNlKSB7XG4gICAgcy5kcmFnZ2FibGUuY3VycmVudCA9IHVuZGVmaW5lZDtcbiAgICByZXR1cm47XG4gIH1cbiAgYm9hcmQudW5zZXRQcmVtb3ZlKHMpO1xuICBib2FyZC51bnNldFByZWRyb3Aocyk7XG4gIC8vIHRvdWNoZW5kIGhhcyBubyBwb3NpdGlvbjsgc28gdXNlIHRoZSBsYXN0IHRvdWNobW92ZSBwb3NpdGlvbiBpbnN0ZWFkXG4gIGNvbnN0IGV2ZW50UG9zOiBjZy5OdW1iZXJQYWlyID0gdXRpbC5ldmVudFBvc2l0aW9uKGUpIHx8IGN1ci5lcG9zO1xuICBjb25zdCBkZXN0ID0gYm9hcmQuZ2V0S2V5QXREb21Qb3MoZXZlbnRQb3MsIGJvYXJkLndoaXRlUG92KHMpLCBzLmRvbS5ib3VuZHMoKSwgcy5nZW9tZXRyeSk7XG4gIGlmIChkZXN0ICYmIGN1ci5zdGFydGVkICYmIGN1ci5vcmlnICE9PSBkZXN0KSB7XG4gICAgaWYgKGN1ci5uZXdQaWVjZSkgYm9hcmQuZHJvcE5ld1BpZWNlKHMsIGN1ci5vcmlnLCBkZXN0LCBjdXIuZm9yY2UpO1xuICAgIGVsc2Uge1xuICAgICAgcy5zdGF0cy5jdHJsS2V5ID0gZS5jdHJsS2V5O1xuICAgICAgaWYgKGJvYXJkLnVzZXJNb3ZlKHMsIGN1ci5vcmlnLCBkZXN0KSkgcy5zdGF0cy5kcmFnZ2VkID0gdHJ1ZTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoY3VyLm5ld1BpZWNlKSB7XG4gICAgZGVsZXRlIHMucGllY2VzW2N1ci5vcmlnXTtcbiAgfSBlbHNlIGlmIChzLmRyYWdnYWJsZS5kZWxldGVPbkRyb3BPZmYgJiYgIWRlc3QpIHtcbiAgICBkZWxldGUgcy5waWVjZXNbY3VyLm9yaWddO1xuICAgIGJvYXJkLmNhbGxVc2VyRnVuY3Rpb24ocy5ldmVudHMuY2hhbmdlKTtcbiAgfVxuICBpZiAoY3VyICYmIGN1ci5vcmlnID09PSBjdXIucHJldmlvdXNseVNlbGVjdGVkICYmIChjdXIub3JpZyA9PT0gZGVzdCB8fCAhZGVzdCkpXG4gICAgYm9hcmQudW5zZWxlY3Qocyk7XG4gIGVsc2UgaWYgKCFzLnNlbGVjdGFibGUuZW5hYmxlZCkgYm9hcmQudW5zZWxlY3Qocyk7XG5cbiAgcmVtb3ZlRHJhZ0VsZW1lbnRzKHMpO1xuXG4gIHMuZHJhZ2dhYmxlLmN1cnJlbnQgPSB1bmRlZmluZWQ7XG4gIHMuZG9tLnJlZHJhdygpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2FuY2VsKHM6IFN0YXRlKTogdm9pZCB7XG4gIGNvbnN0IGN1ciA9IHMuZHJhZ2dhYmxlLmN1cnJlbnQ7XG4gIGlmIChjdXIpIHtcbiAgICBpZiAoY3VyLm5ld1BpZWNlKSBkZWxldGUgcy5waWVjZXNbY3VyLm9yaWddO1xuICAgIHMuZHJhZ2dhYmxlLmN1cnJlbnQgPSB1bmRlZmluZWQ7XG4gICAgYm9hcmQudW5zZWxlY3Qocyk7XG4gICAgcmVtb3ZlRHJhZ0VsZW1lbnRzKHMpO1xuICAgIHMuZG9tLnJlZHJhdygpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZURyYWdFbGVtZW50cyhzOiBTdGF0ZSkge1xuICBjb25zdCBlID0gcy5kb20uZWxlbWVudHM7XG4gIGlmIChlLmdob3N0KSB1dGlsLnNldFZpc2libGUoZS5naG9zdCwgZmFsc2UpO1xufVxuXG5mdW5jdGlvbiBjb21wdXRlU3F1YXJlQm91bmRzKGtleTogY2cuS2V5LCBhc1doaXRlOiBib29sZWFuLCBib3VuZHM6IENsaWVudFJlY3QsIGJkOiBjZy5Cb2FyZERpbWVuc2lvbnMpIHtcbiAgY29uc3QgZmlyc3RSYW5rSXMwID0gYmQuaGVpZ2h0ID09PSAxMDtcbiAgY29uc3QgcG9zID0gdXRpbC5rZXkycG9zKGtleSwgZmlyc3RSYW5rSXMwKTtcbiAgaWYgKCFhc1doaXRlKSB7XG4gICAgcG9zWzBdID0gYmQud2lkdGggKyAxIC0gcG9zWzBdO1xuICAgIHBvc1sxXSA9IGJkLmhlaWdodCArIDEgLSBwb3NbMV07XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBsZWZ0OiBib3VuZHMubGVmdCArIGJvdW5kcy53aWR0aCAqIChwb3NbMF0gLSAxKSAvIGJkLndpZHRoLFxuICAgIHRvcDogYm91bmRzLnRvcCArIGJvdW5kcy5oZWlnaHQgKiAoYmQuaGVpZ2h0IC0gcG9zWzFdKSAvIGJkLmhlaWdodCxcbiAgICB3aWR0aDogYm91bmRzLndpZHRoIC8gYmQud2lkdGgsXG4gICAgaGVpZ2h0OiBib3VuZHMuaGVpZ2h0IC8gYmQuaGVpZ2h0XG4gIH07XG59XG5cbmZ1bmN0aW9uIHBpZWNlRWxlbWVudEJ5S2V5KHM6IFN0YXRlLCBrZXk6IGNnLktleSk6IGNnLlBpZWNlTm9kZSB8IHVuZGVmaW5lZCB7XG4gIGxldCBlbCA9IHMuZG9tLmVsZW1lbnRzLmJvYXJkLmZpcnN0Q2hpbGQgYXMgY2cuUGllY2VOb2RlO1xuICB3aGlsZSAoZWwpIHtcbiAgICBpZiAoZWwuY2dLZXkgPT09IGtleSAmJiBlbC50YWdOYW1lID09PSAnUElFQ0UnKSByZXR1cm4gZWw7XG4gICAgZWwgPSBlbC5uZXh0U2libGluZyBhcyBjZy5QaWVjZU5vZGU7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCB7IHVuc2VsZWN0LCBjYW5jZWxNb3ZlLCBnZXRLZXlBdERvbVBvcywgd2hpdGVQb3YgfSBmcm9tICcuL2JvYXJkJ1xuaW1wb3J0IHsgZXZlbnRQb3NpdGlvbiwgaXNSaWdodEJ1dHRvbiB9IGZyb20gJy4vdXRpbCdcbmltcG9ydCAqIGFzIGNnIGZyb20gJy4vdHlwZXMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgRHJhd1NoYXBlIHtcbiAgb3JpZzogY2cuS2V5O1xuICBkZXN0PzogY2cuS2V5O1xuICBicnVzaDogc3RyaW5nO1xuICBtb2RpZmllcnM/OiBEcmF3TW9kaWZpZXJzO1xuICBwaWVjZT86IERyYXdTaGFwZVBpZWNlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERyYXdTaGFwZVBpZWNlIHtcbiAgcm9sZTogY2cuUm9sZTtcbiAgY29sb3I6IGNnLkNvbG9yO1xuICBzY2FsZT86IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEcmF3QnJ1c2gge1xuICBrZXk6IHN0cmluZztcbiAgY29sb3I6IHN0cmluZztcbiAgb3BhY2l0eTogbnVtYmVyO1xuICBsaW5lV2lkdGg6IG51bWJlclxufVxuXG5leHBvcnQgaW50ZXJmYWNlIERyYXdCcnVzaGVzIHtcbiAgW25hbWU6IHN0cmluZ106IERyYXdCcnVzaDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEcmF3TW9kaWZpZXJzIHtcbiAgbGluZVdpZHRoPzogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERyYXdhYmxlIHtcbiAgZW5hYmxlZDogYm9vbGVhbjsgLy8gY2FuIGRyYXdcbiAgdmlzaWJsZTogYm9vbGVhbjsgLy8gY2FuIHZpZXdcbiAgZXJhc2VPbkNsaWNrOiBib29sZWFuO1xuICBvbkNoYW5nZT86IChzaGFwZXM6IERyYXdTaGFwZVtdKSA9PiB2b2lkO1xuICBzaGFwZXM6IERyYXdTaGFwZVtdOyAvLyB1c2VyIHNoYXBlc1xuICBhdXRvU2hhcGVzOiBEcmF3U2hhcGVbXTsgLy8gY29tcHV0ZXIgc2hhcGVzXG4gIGN1cnJlbnQ/OiBEcmF3Q3VycmVudDtcbiAgYnJ1c2hlczogRHJhd0JydXNoZXM7XG4gIC8vIGRyYXdhYmxlIFNWRyBwaWVjZXM7IHVzZWQgZm9yIGNyYXp5aG91c2UgZHJvcFxuICBwaWVjZXM6IHtcbiAgICBiYXNlVXJsOiBzdHJpbmdcbiAgfSxcbiAgcHJldlN2Z0hhc2g6IHN0cmluZ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERyYXdDdXJyZW50IHtcbiAgb3JpZzogY2cuS2V5OyAvLyBvcmlnIGtleSBvZiBkcmF3aW5nXG4gIGRlc3Q/OiBjZy5LZXk7IC8vIHNoYXBlIGRlc3QsIG9yIHVuZGVmaW5lZCBmb3IgY2lyY2xlXG4gIG1vdXNlU3E/OiBjZy5LZXk7IC8vIHNxdWFyZSBiZWluZyBtb3VzZWQgb3ZlclxuICBwb3M6IGNnLk51bWJlclBhaXI7IC8vIHJlbGF0aXZlIGN1cnJlbnQgcG9zaXRpb25cbiAgYnJ1c2g6IHN0cmluZzsgLy8gYnJ1c2ggbmFtZSBmb3Igc2hhcGVcbn1cblxuY29uc3QgYnJ1c2hlcyA9IFsnZ3JlZW4nLCAncmVkJywgJ2JsdWUnLCAneWVsbG93J107XG5cbmV4cG9ydCBmdW5jdGlvbiBzdGFydChzdGF0ZTogU3RhdGUsIGU6IGNnLk1vdWNoRXZlbnQpOiB2b2lkIHtcbiAgaWYgKGUudG91Y2hlcyAmJiBlLnRvdWNoZXMubGVuZ3RoID4gMSkgcmV0dXJuOyAvLyBzdXBwb3J0IG9uZSBmaW5nZXIgdG91Y2ggb25seVxuICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIGUuY3RybEtleSA/IHVuc2VsZWN0KHN0YXRlKSA6IGNhbmNlbE1vdmUoc3RhdGUpO1xuICBjb25zdCBwb3MgPSBldmVudFBvc2l0aW9uKGUpIGFzIGNnLk51bWJlclBhaXIsXG4gIG9yaWcgPSBnZXRLZXlBdERvbVBvcyhwb3MsIHdoaXRlUG92KHN0YXRlKSwgc3RhdGUuZG9tLmJvdW5kcygpLCBzdGF0ZS5nZW9tZXRyeSk7XG4gIGlmICghb3JpZykgcmV0dXJuO1xuICBzdGF0ZS5kcmF3YWJsZS5jdXJyZW50ID0ge1xuICAgIG9yaWcsXG4gICAgcG9zLFxuICAgIGJydXNoOiBldmVudEJydXNoKGUpXG4gIH07XG4gIHByb2Nlc3NEcmF3KHN0YXRlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByb2Nlc3NEcmF3KHN0YXRlOiBTdGF0ZSk6IHZvaWQge1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgIGNvbnN0IGN1ciA9IHN0YXRlLmRyYXdhYmxlLmN1cnJlbnQ7XG4gICAgaWYgKGN1cikge1xuICAgICAgY29uc3QgbW91c2VTcSA9IGdldEtleUF0RG9tUG9zKGN1ci5wb3MsIHdoaXRlUG92KHN0YXRlKSwgc3RhdGUuZG9tLmJvdW5kcygpLCBzdGF0ZS5nZW9tZXRyeSk7XG4gICAgICBpZiAobW91c2VTcSAhPT0gY3VyLm1vdXNlU3EpIHtcbiAgICAgICAgY3VyLm1vdXNlU3EgPSBtb3VzZVNxO1xuICAgICAgICBjdXIuZGVzdCA9IG1vdXNlU3EgIT09IGN1ci5vcmlnID8gbW91c2VTcSA6IHVuZGVmaW5lZDtcbiAgICAgICAgc3RhdGUuZG9tLnJlZHJhd05vdygpO1xuICAgICAgfVxuICAgICAgcHJvY2Vzc0RyYXcoc3RhdGUpO1xuICAgIH1cbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtb3ZlKHN0YXRlOiBTdGF0ZSwgZTogY2cuTW91Y2hFdmVudCk6IHZvaWQge1xuICBpZiAoc3RhdGUuZHJhd2FibGUuY3VycmVudCkgc3RhdGUuZHJhd2FibGUuY3VycmVudC5wb3MgPSBldmVudFBvc2l0aW9uKGUpIGFzIGNnLk51bWJlclBhaXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlbmQoc3RhdGU6IFN0YXRlKTogdm9pZCB7XG4gIGNvbnN0IGN1ciA9IHN0YXRlLmRyYXdhYmxlLmN1cnJlbnQ7XG4gIGlmIChjdXIpIHtcbiAgICBpZiAoY3VyLm1vdXNlU3EpIGFkZFNoYXBlKHN0YXRlLmRyYXdhYmxlLCBjdXIpO1xuICAgIGNhbmNlbChzdGF0ZSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbmNlbChzdGF0ZTogU3RhdGUpOiB2b2lkIHtcbiAgaWYgKHN0YXRlLmRyYXdhYmxlLmN1cnJlbnQpIHtcbiAgICBzdGF0ZS5kcmF3YWJsZS5jdXJyZW50ID0gdW5kZWZpbmVkO1xuICAgIHN0YXRlLmRvbS5yZWRyYXcoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xlYXIoc3RhdGU6IFN0YXRlKTogdm9pZCB7XG4gIGlmIChzdGF0ZS5kcmF3YWJsZS5zaGFwZXMubGVuZ3RoKSB7XG4gICAgc3RhdGUuZHJhd2FibGUuc2hhcGVzID0gW107XG4gICAgc3RhdGUuZG9tLnJlZHJhdygpO1xuICAgIG9uQ2hhbmdlKHN0YXRlLmRyYXdhYmxlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBldmVudEJydXNoKGU6IGNnLk1vdWNoRXZlbnQpOiBzdHJpbmcge1xuICByZXR1cm4gYnJ1c2hlc1soKGUuc2hpZnRLZXkgfHwgZS5jdHJsS2V5KSAmJiBpc1JpZ2h0QnV0dG9uKGUpID8gMSA6IDApICsgKGUuYWx0S2V5ID8gMiA6IDApXTtcbn1cblxuZnVuY3Rpb24gYWRkU2hhcGUoZHJhd2FibGU6IERyYXdhYmxlLCBjdXI6IERyYXdDdXJyZW50KTogdm9pZCB7XG4gIGNvbnN0IHNhbWVTaGFwZSA9IChzOiBEcmF3U2hhcGUpID0+IHMub3JpZyA9PT0gY3VyLm9yaWcgJiYgcy5kZXN0ID09PSBjdXIuZGVzdDtcbiAgY29uc3Qgc2ltaWxhciA9IGRyYXdhYmxlLnNoYXBlcy5maWx0ZXIoc2FtZVNoYXBlKVswXTtcbiAgaWYgKHNpbWlsYXIpIGRyYXdhYmxlLnNoYXBlcyA9IGRyYXdhYmxlLnNoYXBlcy5maWx0ZXIocyA9PiAhc2FtZVNoYXBlKHMpKTtcbiAgaWYgKCFzaW1pbGFyIHx8IHNpbWlsYXIuYnJ1c2ggIT09IGN1ci5icnVzaCkgZHJhd2FibGUuc2hhcGVzLnB1c2goY3VyKTtcbiAgb25DaGFuZ2UoZHJhd2FibGUpO1xufVxuXG5mdW5jdGlvbiBvbkNoYW5nZShkcmF3YWJsZTogRHJhd2FibGUpOiB2b2lkIHtcbiAgaWYgKGRyYXdhYmxlLm9uQ2hhbmdlKSBkcmF3YWJsZS5vbkNoYW5nZShkcmF3YWJsZS5zaGFwZXMpO1xufVxuIiwiaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJ1xuaW1wb3J0ICogYXMgY2cgZnJvbSAnLi90eXBlcydcbmltcG9ydCAqIGFzIGJvYXJkIGZyb20gJy4vYm9hcmQnXG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4vdXRpbCdcbmltcG9ydCB7IGNhbmNlbCBhcyBjYW5jZWxEcmFnIH0gZnJvbSAnLi9kcmFnJ1xuXG5leHBvcnQgZnVuY3Rpb24gc2V0RHJvcE1vZGUoczogU3RhdGUsIHBpZWNlPzogY2cuUGllY2UpOiB2b2lkIHtcbiAgcy5kcm9wbW9kZSA9IHtcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcGllY2VcbiAgfTtcbiAgY2FuY2VsRHJhZyhzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbmNlbERyb3BNb2RlKHM6IFN0YXRlKTogdm9pZCB7XG4gIHMuZHJvcG1vZGUgPSB7XG4gICAgYWN0aXZlOiBmYWxzZVxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZHJvcChzOiBTdGF0ZSwgZTogY2cuTW91Y2hFdmVudCk6IHZvaWQge1xuICBpZiAoIXMuZHJvcG1vZGUuYWN0aXZlKSByZXR1cm47XG5cbiAgYm9hcmQudW5zZXRQcmVtb3ZlKHMpO1xuICBib2FyZC51bnNldFByZWRyb3Aocyk7XG5cbiAgY29uc3QgcGllY2UgPSBzLmRyb3Btb2RlLnBpZWNlO1xuXG4gIGlmIChwaWVjZSkge1xuICAgIHMucGllY2VzLnowID0gcGllY2U7XG4gICAgY29uc3QgcG9zaXRpb24gPSB1dGlsLmV2ZW50UG9zaXRpb24oZSk7XG4gICAgY29uc3QgZGVzdCA9IHBvc2l0aW9uICYmIGJvYXJkLmdldEtleUF0RG9tUG9zKFxuICAgICAgcG9zaXRpb24sIGJvYXJkLndoaXRlUG92KHMpLCBzLmRvbS5ib3VuZHMoKSwgcy5nZW9tZXRyeSk7XG4gICAgaWYgKGRlc3QpIGJvYXJkLmRyb3BOZXdQaWVjZShzLCAnejAnLCBkZXN0KTtcbiAgfVxuICBzLmRvbS5yZWRyYXcoKTtcbn1cbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCAqIGFzIGRyYWcgZnJvbSAnLi9kcmFnJ1xuaW1wb3J0ICogYXMgZHJhdyBmcm9tICcuL2RyYXcnXG5pbXBvcnQgeyBkcm9wIH0gZnJvbSAnLi9kcm9wJ1xuaW1wb3J0IHsgaXNSaWdodEJ1dHRvbiB9IGZyb20gJy4vdXRpbCdcbmltcG9ydCAqIGFzIGNnIGZyb20gJy4vdHlwZXMnXG5cbnR5cGUgTW91Y2hCaW5kID0gKGU6IGNnLk1vdWNoRXZlbnQpID0+IHZvaWQ7XG50eXBlIFN0YXRlTW91Y2hCaW5kID0gKGQ6IFN0YXRlLCBlOiBjZy5Nb3VjaEV2ZW50KSA9PiB2b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gYmluZEJvYXJkKHM6IFN0YXRlKTogdm9pZCB7XG5cbiAgaWYgKHMudmlld09ubHkpIHJldHVybjtcblxuICBjb25zdCBib2FyZEVsID0gcy5kb20uZWxlbWVudHMuYm9hcmQsXG4gIG9uU3RhcnQgPSBzdGFydERyYWdPckRyYXcocyk7XG5cbiAgLy8gQ2Fubm90IGJlIHBhc3NpdmUsIGJlY2F1c2Ugd2UgcHJldmVudCB0b3VjaCBzY3JvbGxpbmcgYW5kIGRyYWdnaW5nIG9mXG4gIC8vIHNlbGVjdGVkIGVsZW1lbnRzLlxuICBib2FyZEVsLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBvblN0YXJ0IGFzIEV2ZW50TGlzdGVuZXIsIHsgcGFzc2l2ZTogZmFsc2UgfSk7XG4gIGJvYXJkRWwuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgb25TdGFydCBhcyBFdmVudExpc3RlbmVyLCB7IHBhc3NpdmU6IGZhbHNlIH0pO1xuXG4gIGlmIChzLmRpc2FibGVDb250ZXh0TWVudSB8fCBzLmRyYXdhYmxlLmVuYWJsZWQpIHtcbiAgICBib2FyZEVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgZSA9PiBlLnByZXZlbnREZWZhdWx0KCkpO1xuICB9XG59XG5cbi8vIHJldHVybnMgdGhlIHVuYmluZCBmdW5jdGlvblxuZXhwb3J0IGZ1bmN0aW9uIGJpbmREb2N1bWVudChzOiBTdGF0ZSwgcmVkcmF3QWxsOiBjZy5SZWRyYXcpOiBjZy5VbmJpbmQge1xuXG4gIGNvbnN0IHVuYmluZHM6IGNnLlVuYmluZFtdID0gW107XG5cbiAgaWYgKCFzLmRvbS5yZWxhdGl2ZSAmJiBzLnJlc2l6YWJsZSkge1xuICAgIGNvbnN0IG9uUmVzaXplID0gKCkgPT4ge1xuICAgICAgcy5kb20uYm91bmRzLmNsZWFyKCk7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUocmVkcmF3QWxsKTtcbiAgICB9O1xuICAgIHVuYmluZHMucHVzaCh1bmJpbmRhYmxlKGRvY3VtZW50LmJvZHksICdjaGVzc2dyb3VuZC5yZXNpemUnLCBvblJlc2l6ZSkpO1xuICB9XG5cbiAgaWYgKCFzLnZpZXdPbmx5KSB7XG5cbiAgICBjb25zdCBvbm1vdmU6IE1vdWNoQmluZCA9IGRyYWdPckRyYXcocywgZHJhZy5tb3ZlLCBkcmF3Lm1vdmUpO1xuICAgIGNvbnN0IG9uZW5kOiBNb3VjaEJpbmQgPSBkcmFnT3JEcmF3KHMsIGRyYWcuZW5kLCBkcmF3LmVuZCk7XG5cbiAgICBbJ3RvdWNobW92ZScsICdtb3VzZW1vdmUnXS5mb3JFYWNoKGV2ID0+IHVuYmluZHMucHVzaCh1bmJpbmRhYmxlKGRvY3VtZW50LCBldiwgb25tb3ZlKSkpO1xuICAgIFsndG91Y2hlbmQnLCAnbW91c2V1cCddLmZvckVhY2goZXYgPT4gdW5iaW5kcy5wdXNoKHVuYmluZGFibGUoZG9jdW1lbnQsIGV2LCBvbmVuZCkpKTtcblxuICAgIGNvbnN0IG9uU2Nyb2xsID0gKCkgPT4gcy5kb20uYm91bmRzLmNsZWFyKCk7XG4gICAgdW5iaW5kcy5wdXNoKHVuYmluZGFibGUod2luZG93LCAnc2Nyb2xsJywgb25TY3JvbGwsIHsgcGFzc2l2ZTogdHJ1ZSB9KSk7XG4gICAgdW5iaW5kcy5wdXNoKHVuYmluZGFibGUod2luZG93LCAncmVzaXplJywgb25TY3JvbGwsIHsgcGFzc2l2ZTogdHJ1ZSB9KSk7XG4gIH1cblxuICByZXR1cm4gKCkgPT4gdW5iaW5kcy5mb3JFYWNoKGYgPT4gZigpKTtcbn1cblxuZnVuY3Rpb24gdW5iaW5kYWJsZShlbDogRXZlbnRUYXJnZXQsIGV2ZW50TmFtZTogc3RyaW5nLCBjYWxsYmFjazogTW91Y2hCaW5kLCBvcHRpb25zPzogYW55KTogY2cuVW5iaW5kIHtcbiAgZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrIGFzIEV2ZW50TGlzdGVuZXIsIG9wdGlvbnMpO1xuICByZXR1cm4gKCkgPT4gZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrIGFzIEV2ZW50TGlzdGVuZXIpO1xufVxuXG5mdW5jdGlvbiBzdGFydERyYWdPckRyYXcoczogU3RhdGUpOiBNb3VjaEJpbmQge1xuICByZXR1cm4gZSA9PiB7XG4gICAgaWYgKHMuZHJhZ2dhYmxlLmN1cnJlbnQpIGRyYWcuY2FuY2VsKHMpO1xuICAgIGVsc2UgaWYgKHMuZHJhd2FibGUuY3VycmVudCkgZHJhdy5jYW5jZWwocyk7XG4gICAgZWxzZSBpZiAoZS5zaGlmdEtleSB8fCBpc1JpZ2h0QnV0dG9uKGUpKSB7IGlmIChzLmRyYXdhYmxlLmVuYWJsZWQpIGRyYXcuc3RhcnQocywgZSk7IH1cbiAgICBlbHNlIGlmICghcy52aWV3T25seSkge1xuICAgICAgaWYgKHMuZHJvcG1vZGUuYWN0aXZlKSBkcm9wKHMsIGUpO1xuICAgICAgZWxzZSBkcmFnLnN0YXJ0KHMsIGUpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gZHJhZ09yRHJhdyhzOiBTdGF0ZSwgd2l0aERyYWc6IFN0YXRlTW91Y2hCaW5kLCB3aXRoRHJhdzogU3RhdGVNb3VjaEJpbmQpOiBNb3VjaEJpbmQge1xuICByZXR1cm4gZSA9PiB7XG4gICAgaWYgKGUuc2hpZnRLZXkgfHwgaXNSaWdodEJ1dHRvbihlKSkgeyBpZiAocy5kcmF3YWJsZS5lbmFibGVkKSB3aXRoRHJhdyhzLCBlKTsgfVxuICAgIGVsc2UgaWYgKCFzLnZpZXdPbmx5KSB3aXRoRHJhZyhzLCBlKTtcbiAgfTtcbn1cbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCB7IEtleSB9IGZyb20gJy4vdHlwZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGV4cGxvc2lvbihzdGF0ZTogU3RhdGUsIGtleXM6IEtleVtdKTogdm9pZCB7XG4gIHN0YXRlLmV4cGxvZGluZyA9IHsgc3RhZ2U6IDEsIGtleXMgfTtcbiAgc3RhdGUuZG9tLnJlZHJhdygpO1xuICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICBzZXRTdGFnZShzdGF0ZSwgMik7XG4gICAgc2V0VGltZW91dCgoKSA9PiBzZXRTdGFnZShzdGF0ZSwgdW5kZWZpbmVkKSwgMTIwKTtcbiAgfSwgMTIwKTtcbn1cblxuZnVuY3Rpb24gc2V0U3RhZ2Uoc3RhdGU6IFN0YXRlLCBzdGFnZTogbnVtYmVyIHwgdW5kZWZpbmVkKTogdm9pZCB7XG4gIGlmIChzdGF0ZS5leHBsb2RpbmcpIHtcbiAgICBpZiAoc3RhZ2UpIHN0YXRlLmV4cGxvZGluZy5zdGFnZSA9IHN0YWdlO1xuICAgIGVsc2Ugc3RhdGUuZXhwbG9kaW5nID0gdW5kZWZpbmVkO1xuICAgIHN0YXRlLmRvbS5yZWRyYXcoKTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgcG9zMmtleSwgTlJhbmtzLCBpbnZOUmFua3MgfSBmcm9tICcuL3V0aWwnXG5pbXBvcnQgKiBhcyBjZyBmcm9tICcuL3R5cGVzJ1xuXG5leHBvcnQgY29uc3QgaW5pdGlhbDogY2cuRkVOID0gJ3JuYnFrYm5yL3BwcHBwcHBwLzgvOC84LzgvUFBQUFBQUFAvUk5CUUtCTlInO1xuXG5jb25zdCByb2xlc1ZhcmlhbnRzOiB7IFtsZXR0ZXI6IHN0cmluZ106IGNnLlJvbGUgfSA9IHtcbiAgICBwOiAncGF3bicsIHI6ICdyb29rJywgbjogJ2tuaWdodCcsIGI6ICdiaXNob3AnLCBxOiAncXVlZW4nLCBrOiAna2luZycsIG06ICdtZXQnLCBmOiAnZmVyeicsIHM6ICdzaWx2ZXInLCBjOiAnY2FuY2VsbG9yJywgYTogJ2FyY2hiaXNob3AnLCBoOiAnaGF3aycsIGU6ICdlbGVwaGFudCcgfTtcbi8vIHNob2dpXG5jb25zdCByb2xlc1Nob2dpOiB7IFtsZXR0ZXI6IHN0cmluZ106IGNnLlJvbGUgfSA9IHtcbiAgICBwOiAncGF3bicsIHI6ICdyb29rJywgbjogJ2tuaWdodCcsIGI6ICdiaXNob3AnLCBrOiAna2luZycsIGc6ICdnb2xkJywgczogJ3NpbHZlcicsIGw6ICdsYW5jZScgfTtcbi8vIHhpYW5ncWlcbmNvbnN0IHJvbGVzWGlhbmdxaTogeyBbbGV0dGVyOiBzdHJpbmddOiBjZy5Sb2xlIH0gPSB7XG4gICAgcDogJ3Bhd24nLCByOiAncm9vaycsIG46ICdrbmlnaHQnLCBiOiAnYmlzaG9wJywgazogJ2tpbmcnLCBjOiAnY2Fubm9uJywgYTogJ2Fkdmlzb3InIH07XG5cblxuY29uc3QgbGV0dGVyc1ZhcmlhbnRzID0ge1xuICAgIHBhd246ICdwJywgcm9vazogJ3InLCBrbmlnaHQ6ICduJywgYmlzaG9wOiAnYicsIHF1ZWVuOiAncScsIGtpbmc6ICdrJywgbWV0OiAnbScsIGZlcno6ICdmJywgc2lsdmVyOiAncycsIGNhbmNlbGxvcjogJ2MnLCBhcmNoYmlzaG9wOiAnYScsIGhhd2s6ICdoJywgZWxlcGhhbnQ6ICdlJyB9O1xuLy8gc2hvZ2lcbmNvbnN0IGxldHRlcnNTaG9naSA9IHtcbiAgICBwYXduOiAncCcsIHJvb2s6ICdyJywga25pZ2h0OiAnbicsIGJpc2hvcDogJ2InLCBraW5nOiAnaycsIGdvbGQ6ICdnJywgc2lsdmVyOiAncycsIGxhbmNlOiAnbCcsXG4gICAgcHBhd246ICcrcCcsIHBrbmlnaHQ6ICcrbicsIHBiaXNob3A6ICcrYicsIHByb29rOiAnK3InLCBwc2lsdmVyOiAnK3MnLCBwbGFuY2U6ICcrbCcgfTtcbi8vIHhpYW5ncWlcbmNvbnN0IGxldHRlcnNYaWFuZ3FpID0ge1xuICAgIHBhd246ICdwJywgcm9vazogJ3InLCBrbmlnaHQ6ICduJywgYmlzaG9wOiAnYicsIGtpbmc6ICdrJywgY2Fubm9uOiAnYycsIGFkdmlzb3I6ICdhJ307XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkKGZlbjogY2cuRkVOLCBnZW9tOiBjZy5HZW9tZXRyeSk6IGNnLlBpZWNlcyB7XG4gIGlmIChmZW4gPT09ICdzdGFydCcpIGZlbiA9IGluaXRpYWw7XG4gIGlmIChmZW4uaW5kZXhPZignWycpICE9PSAtMSkgZmVuID0gZmVuLnNsaWNlKDAsIGZlbi5pbmRleE9mKCdbJykpO1xuICBjb25zdCBwaWVjZXM6IGNnLlBpZWNlcyA9IHt9O1xuICBsZXQgcm93OiBudW1iZXIgPSBmZW4uc3BsaXQoXCIvXCIpLmxlbmd0aDtcbiAgbGV0IGNvbDogbnVtYmVyID0gMDtcbiAgbGV0IHByb21vdGVkOiBib29sZWFuID0gZmFsc2U7XG4gIGNvbnN0IHJvbGVzID0gKGdlb20gPT09IGNnLkdlb21ldHJ5LmRpbTl4MTAgfHwgZ2VvbSA9PT0gY2cuR2VvbWV0cnkuZGltN3g3KSA/IHJvbGVzWGlhbmdxaSA6IChnZW9tID09PSBjZy5HZW9tZXRyeS5kaW05eDkgfHwgZ2VvbSA9PT0gY2cuR2VvbWV0cnkuZGltNXg1KSA/IHJvbGVzU2hvZ2kgOiByb2xlc1ZhcmlhbnRzO1xuICBjb25zdCBmaXJzdFJhbmtJczAgPSByb3cgPT09IDEwO1xuICBjb25zdCBzaG9naSA9IChyb3cgPT09IDkgfHwgcm93ID09PSA1KTtcbiAgY29uc3QgbWluaVNob2dpID0gcm93ID09PSA1O1xuICBmb3IgKGNvbnN0IGMgb2YgZmVuKSB7XG4gICAgc3dpdGNoIChjKSB7XG4gICAgICBjYXNlICcgJzogcmV0dXJuIHBpZWNlcztcbiAgICAgIGNhc2UgJy8nOlxuICAgICAgICAtLXJvdztcbiAgICAgICAgaWYgKHJvdyA9PT0gMCkgcmV0dXJuIHBpZWNlcztcbiAgICAgICAgY29sID0gMDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICcrJzpcbiAgICAgICAgcHJvbW90ZWQgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ34nOlxuICAgICAgICBjb25zdCBwaWVjZSA9IHBpZWNlc1tjZy5maWxlc1tjb2xdICsgY2cucmFua3NbZmlyc3RSYW5rSXMwID8gcm93IDogcm93ICsgMV1dO1xuICAgICAgICBpZiAocGllY2UpIHBpZWNlLnByb21vdGVkID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb25zdCBuYiA9IGMuY2hhckNvZGVBdCgwKTtcbiAgICAgICAgaWYgKG5iIDwgNTgpIGNvbCArPSAoYyA9PT0gJzAnKSA/IDkgOiBuYiAtIDQ4O1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICArK2NvbDtcbiAgICAgICAgICBjb25zdCByb2xlID0gYy50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgIGxldCBwaWVjZSA9IHtcbiAgICAgICAgICAgIHJvbGU6IHJvbGVzW3JvbGVdLFxuICAgICAgICAgICAgY29sb3I6IChjID09PSByb2xlID8gc2hvZ2kgPyAnd2hpdGUnOiAnYmxhY2snIDogc2hvZ2kgPyAnYmxhY2snIDogJ3doaXRlJykgYXMgY2cuQ29sb3JcbiAgICAgICAgICB9IGFzIGNnLlBpZWNlO1xuICAgICAgICAgIGlmIChwcm9tb3RlZCkge1xuICAgICAgICAgICAgcGllY2Uucm9sZSA9ICdwJyArIHBpZWNlLnJvbGUgYXMgY2cuUm9sZTtcbiAgICAgICAgICAgIHBpZWNlLnByb21vdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHByb21vdGVkID0gZmFsc2U7XG4gICAgICAgICAgfTtcbiAgICAgICAgICBpZiAobWluaVNob2dpKSB7XG4gICAgICAgICAgICAgIHBpZWNlc1tjZy5maWxlc1s2IC0gY29sIC0gMV0gKyBjZy5yYW5rc1s2IC0gcm93XV0gPSBwaWVjZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHNob2dpKSB7XG4gICAgICAgICAgICAgIHBpZWNlc1tjZy5maWxlc1sxMCAtIGNvbCAtIDFdICsgY2cucmFua3NbMTAgLSByb3ddXSA9IHBpZWNlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBpZWNlc1tjZy5maWxlc1tjb2wgLSAxXSArIGNnLnJhbmtzW2ZpcnN0UmFua0lzMCA/IHJvdyAtIDEgOiByb3ddXSA9IHBpZWNlO1xuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHBpZWNlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlKHBpZWNlczogY2cuUGllY2VzLCBnZW9tOiBjZy5HZW9tZXRyeSk6IGNnLkZFTiB7XG4gIHZhciBsZXR0ZXJzOiBhbnkgPSB7fTtcbiAgc3dpdGNoIChnZW9tKSB7XG4gIGNhc2UgY2cuR2VvbWV0cnkuZGltN3g3OlxuICBjYXNlIGNnLkdlb21ldHJ5LmRpbTl4MTA6XG4gICAgbGV0dGVycyA9IGxldHRlcnNYaWFuZ3FpO1xuICAgIGJyZWFrO1xuICBjYXNlIGNnLkdlb21ldHJ5LmRpbTV4NTpcbiAgY2FzZSBjZy5HZW9tZXRyeS5kaW05eDk6XG4gICAgbGV0dGVycyA9IGxldHRlcnNTaG9naTtcbiAgICBicmVhaztcbiAgZGVmYXVsdDpcbiAgICBsZXR0ZXJzID0gbGV0dGVyc1ZhcmlhbnRzO1xuICAgIGJyZWFrXG4gIH07XG4gIHJldHVybiBpbnZOUmFua3MubWFwKHkgPT4gTlJhbmtzLm1hcCh4ID0+IHtcbiAgICAgIGNvbnN0IHBpZWNlID0gcGllY2VzW3BvczJrZXkoW3gsIHldLCBnZW9tKV07XG4gICAgICBpZiAocGllY2UpIHtcbiAgICAgICAgY29uc3QgbGV0dGVyOiBzdHJpbmcgPSBsZXR0ZXJzW3BpZWNlLnJvbGVdO1xuICAgICAgICByZXR1cm4gcGllY2UuY29sb3IgPT09ICd3aGl0ZScgPyBsZXR0ZXIudG9VcHBlckNhc2UoKSA6IGxldHRlcjtcbiAgICAgIH0gZWxzZSByZXR1cm4gJzEnO1xuICAgIH0pLmpvaW4oJycpXG4gICkuam9pbignLycpLnJlcGxhY2UoLzF7Mix9L2csIHMgPT4gcy5sZW5ndGgudG9TdHJpbmcoKSk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2NoZXNzZ3JvdW5kXCIpLkNoZXNzZ3JvdW5kO1xuIiwiaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWwnXG5pbXBvcnQgKiBhcyBjZyBmcm9tICcuL3R5cGVzJ1xuXG50eXBlIE1vYmlsaXR5ID0gKHgxOm51bWJlciwgeTE6bnVtYmVyLCB4MjpudW1iZXIsIHkyOm51bWJlcikgPT4gYm9vbGVhbjtcblxuZnVuY3Rpb24gZGlmZihhOiBudW1iZXIsIGI6bnVtYmVyKTpudW1iZXIge1xuICByZXR1cm4gTWF0aC5hYnMoYSAtIGIpO1xufVxuXG5mdW5jdGlvbiBwYXduKGNvbG9yOiBjZy5Db2xvcik6IE1vYmlsaXR5IHtcbiAgcmV0dXJuICh4MSwgeTEsIHgyLCB5MikgPT4gZGlmZih4MSwgeDIpIDwgMiAmJiAoXG4gICAgY29sb3IgPT09ICd3aGl0ZScgPyAoXG4gICAgICAvLyBhbGxvdyAyIHNxdWFyZXMgZnJvbSAxIGFuZCA4LCBmb3IgaG9yZGVcbiAgICAgIHkyID09PSB5MSArIDEgfHwgKHkxIDw9IDIgJiYgeTIgPT09ICh5MSArIDIpICYmIHgxID09PSB4MilcbiAgICApIDogKFxuICAgICAgeTIgPT09IHkxIC0gMSB8fCAoeTEgPj0gNyAmJiB5MiA9PT0gKHkxIC0gMikgJiYgeDEgPT09IHgyKVxuICAgIClcbiAgKTtcbn1cblxuY29uc3Qga25pZ2h0OiBNb2JpbGl0eSA9ICh4MSwgeTEsIHgyLCB5MikgPT4ge1xuICBjb25zdCB4ZCA9IGRpZmYoeDEsIHgyKTtcbiAgY29uc3QgeWQgPSBkaWZmKHkxLCB5Mik7XG4gIHJldHVybiAoeGQgPT09IDEgJiYgeWQgPT09IDIpIHx8ICh4ZCA9PT0gMiAmJiB5ZCA9PT0gMSk7XG59XG5cbmNvbnN0IGJpc2hvcDogTW9iaWxpdHkgPSAoeDEsIHkxLCB4MiwgeTIpID0+IHtcbiAgcmV0dXJuIGRpZmYoeDEsIHgyKSA9PT0gZGlmZih5MSwgeTIpO1xufVxuXG5jb25zdCByb29rOiBNb2JpbGl0eSA9ICh4MSwgeTEsIHgyLCB5MikgPT4ge1xuICByZXR1cm4geDEgPT09IHgyIHx8IHkxID09PSB5Mjtcbn1cblxuY29uc3QgcXVlZW46IE1vYmlsaXR5ID0gKHgxLCB5MSwgeDIsIHkyKSA9PiB7XG4gIHJldHVybiBiaXNob3AoeDEsIHkxLCB4MiwgeTIpIHx8IHJvb2soeDEsIHkxLCB4MiwgeTIpO1xufVxuXG5mdW5jdGlvbiBraW5nKGNvbG9yOiBjZy5Db2xvciwgcm9va0ZpbGVzOiBudW1iZXJbXSwgY2FuQ2FzdGxlOiBib29sZWFuKTogTW9iaWxpdHkge1xuICByZXR1cm4gKHgxLCB5MSwgeDIsIHkyKSAgPT4gKFxuICAgIGRpZmYoeDEsIHgyKSA8IDIgJiYgZGlmZih5MSwgeTIpIDwgMlxuICApIHx8IChcbiAgICBjYW5DYXN0bGUgJiYgeTEgPT09IHkyICYmIHkxID09PSAoY29sb3IgPT09ICd3aGl0ZScgPyAxIDogOCkgJiYgKFxuICAgICAgKHgxID09PSA1ICYmICh4MiA9PT0gMyB8fCB4MiA9PT0gNykpIHx8IHV0aWwuY29udGFpbnNYKHJvb2tGaWxlcywgeDIpXG4gICAgKVxuICApO1xufVxuXG4vLyBtYWtydWsvc2l0dHV5aW4gcXVlZW5cbmNvbnN0IG1ldDogTW9iaWxpdHkgPSAoeDEsIHkxLCB4MiwgeTIpID0+IHtcbiAgcmV0dXJuIGRpZmYoeDEsIHgyKSA9PT0gZGlmZih5MSwgeTIpICYmIGRpZmYoeDEsIHgyKSA9PT0gMTtcbn1cblxuLy8gY2FwYWJsYW5jYSBhcmNoYmlzaG9wLCBzZWlyYXdhbiBoYXdrXG5jb25zdCBhcmNoYmlzaG9wOiBNb2JpbGl0eSA9ICh4MSwgeTEsIHgyLCB5MikgPT4ge1xuICByZXR1cm4gYmlzaG9wKHgxLCB5MSwgeDIsIHkyKSB8fCBrbmlnaHQoeDEsIHkxLCB4MiwgeTIpO1xufVxuXG4vLyBjYXBhYmxhbmNhIGNhbmNlbGxvciwgc2VpcmF3YW4gZWxlcGhhbnRcbmNvbnN0IGNhbmNlbGxvcjogTW9iaWxpdHkgPSAoeDEsIHkxLCB4MiwgeTIpID0+IHtcbiAgcmV0dXJuIHJvb2soeDEsIHkxLCB4MiwgeTIpIHx8IGtuaWdodCh4MSwgeTEsIHgyLCB5Mik7XG59XG5cbi8vIHNob2dpIGxhbmNlXG5mdW5jdGlvbiBsYW5jZShjb2xvcjogY2cuQ29sb3IpOiBNb2JpbGl0eSB7XG4gIHJldHVybiAoeDEsIHkxLCB4MiwgeTIpID0+IChcbiAgICB4MiA9PT0geDEgJiYgKGNvbG9yID09PSAnd2hpdGUnID8geTIgPiB5MSA6IHkyIDwgeTEpXG4gICk7XG59XG5cbi8vIHNob2dpIHNpbHZlciwgbWFrcnVrL3NpdHR1eWluIGJpc2hvcFxuZnVuY3Rpb24gc2lsdmVyKGNvbG9yOiBjZy5Db2xvcik6IE1vYmlsaXR5IHtcbiAgcmV0dXJuICh4MSwgeTEsIHgyLCB5MikgID0+IChcbiAgICBtZXQoeDEsIHkxLCB4MiwgeTIpIHx8ICh4MSA9PT0geDIgJiYgKGNvbG9yID09PSAnd2hpdGUnID8geTIgPT09IHkxICsgMSA6IHkyID09PSB5MSAtIDEpKVxuICApO1xufVxuXG4vLyBzaG9naSBnb2xkLCBwcm9tb3RlZCBwYXduL2tuaWdodC9sYW5jZS9zaWx2ZXJcbmZ1bmN0aW9uIGdvbGQoY29sb3I6IGNnLkNvbG9yKTogTW9iaWxpdHkge1xuICByZXR1cm4gKHgxLCB5MSwgeDIsIHkyKSAgPT4gKFxuICAgIGRpZmYoeDEsIHgyKSA8IDIgJiYgZGlmZih5MSwgeTIpIDwgMiAmJiAoXG4gICAgICBjb2xvciA9PT0gJ3doaXRlJyA/XG4gICAgICAgICEoKHgyID09PSB4MSAtIDEgJiYgeTIgPT09IHkxIC0gMSkgfHwgKHgyID09PSB4MSArIDEgJiYgeTIgPT09IHkxIC0gMSkpIDpcbiAgICAgICAgISgoeDIgPT09IHgxICsgMSAmJiB5MiA9PT0geTEgKyAxKSB8fCAoeDIgPT09IHgxIC0gMSAmJiB5MiA9PT0geTEgKyAxKSlcbiAgICApXG4gICk7XG59XG5cbi8vIHNob2dpIHBhd25cbmZ1bmN0aW9uIHNwYXduKGNvbG9yOiBjZy5Db2xvcik6IE1vYmlsaXR5IHtcbiAgcmV0dXJuICh4MSwgeTEsIHgyLCB5MikgPT4gKHgyID09PSB4MSAmJiAoY29sb3IgPT09ICd3aGl0ZScgPyB5MiA9PT0geTEgKyAxIDogeTIgPT09IHkxIC0gMSkpO1xufVxuXG4vLyBzaG9naSBrbmlnaHRcbmZ1bmN0aW9uIHNrbmlnaHQoY29sb3I6IGNnLkNvbG9yKTogTW9iaWxpdHkge1xuICByZXR1cm4gKHgxLCB5MSwgeDIsIHkyKSA9PiBjb2xvciA9PT0gJ3doaXRlJyA/XG4gICAgKHkyID09PSB5MSArIDIgJiYgeDIgPT09IHgxIC0gMSB8fCB5MiA9PT0geTEgKyAyICYmIHgyID09PSB4MSArIDEpIDpcbiAgICAoeTIgPT09IHkxIC0gMiAmJiB4MiA9PT0geDEgLSAxIHx8IHkyID09PSB5MSAtIDIgJiYgeDIgPT09IHgxICsgMSk7XG59XG5cbi8vIHNob2dpIHByb21vdGVkIHJvb2tcbmNvbnN0IHByb29rOiBNb2JpbGl0eSA9ICh4MSwgeTEsIHgyLCB5MikgPT4ge1xuICByZXR1cm4gcm9vayh4MSwgeTEsIHgyLCB5MikgfHwgKGRpZmYoeDEsIHgyKSA8IDIgJiYgZGlmZih5MSwgeTIpIDwgMik7XG59XG5cbi8vIHNob2dpIHByb21vdGVkIGJpc2hvcFxuY29uc3QgcGJpc2hvcDogTW9iaWxpdHkgPSAoeDEsIHkxLCB4MiwgeTIpID0+IHtcbiAgcmV0dXJuIGJpc2hvcCh4MSwgeTEsIHgyLCB5MikgfHwgKGRpZmYoeDEsIHgyKSA8IDIgJiYgZGlmZih5MSwgeTIpIDwgMik7XG59XG5cbi8vIHNob2dpIGtpbmdcbmNvbnN0IHNraW5nOiBNb2JpbGl0eSA9ICh4MSwgeTEsIHgyLCB5MikgPT4ge1xuICByZXR1cm4gZGlmZih4MSwgeDIpIDwgMiAmJiBkaWZmKHkxLCB5MikgPCAyO1xufVxuXG4vLyB4aWFuZ3FpIHBhd25cbmZ1bmN0aW9uIHhwYXduKGNvbG9yOiBjZy5Db2xvcik6IE1vYmlsaXR5IHtcbiAgcmV0dXJuICh4MSwgeTEsIHgyLCB5MikgPT4gKFxuICAgICh4MiA9PT0geDEgJiYgKGNvbG9yID09PSAnd2hpdGUnID8geTIgPT09IHkxICsgMSA6IHkyID09PSB5MSAtIDEpKSB8fFxuICAgICh5MiA9PT0geTEgJiYgKHgyID09PSB4MSArIDEgfHwgeDIgPT09IHgxIC0gMSkgJiYgKGNvbG9yID09PSAnd2hpdGUnID8geTEgPiA1OiB5MSA8IDYpKVxuICAgICk7XG59XG5cbi8vIHhpYW5ncWkgYmlzaG9wXG5jb25zdCB4YmlzaG9wOiBNb2JpbGl0eSA9ICh4MSwgeTEsIHgyLCB5MikgPT4ge1xuICByZXR1cm4gZGlmZih4MSwgeDIpID09PSBkaWZmKHkxLCB5MikgJiYgZGlmZih4MSwgeDIpID09PSAyO1xufVxuXG4vLyB4aWFuZ3FpIGFkdmlzb3JcbmNvbnN0IGFkdmlzb3I6IE1vYmlsaXR5ID0gKHgxLCB5MSwgeDIsIHkyKSA9PiB7XG4gIHJldHVybiBkaWZmKHgxLCB4MikgPT09IGRpZmYoeTEsIHkyKSAmJiBkaWZmKHgxLCB4MikgPT09IDE7XG59XG5cbi8vIHhpYW5ncWkgZ2VuZXJhbChraW5nKVxuY29uc3QgeGtpbmc6IE1vYmlsaXR5ID0gKHgxLCB5MSwgeDIsIHkyKSA9PiB7XG4gIC8vIFRPRE86IGZseWluZyBnZW5lcmFsIGNhbiBjYXB0dXJlIG9wcCBnZW5lcmFsXG4gIHJldHVybiAoeDEgPT09IHgyIHx8IHkxID09PSB5MikgJiYgZGlmZih4MSwgeDIpID09PSAxO1xufVxuXG4vLyBzaGFrbyBlbGVwaGFudFxuY29uc3Qgc2hha29FbGVwaGFudDogTW9iaWxpdHkgPSAoeDEsIHkxLCB4MiwgeTIpID0+IHtcbiAgcmV0dXJuIGRpZmYoeDEsIHgyKSA9PT0gZGlmZih5MSwgeTIpICYmIChkaWZmKHgxLCB4MikgPT09IDEgfHwgZGlmZih4MSwgeDIpID09PSAyKTtcbn1cblxuZnVuY3Rpb24gcm9va0ZpbGVzT2YocGllY2VzOiBjZy5QaWVjZXMsIGNvbG9yOiBjZy5Db2xvciwgZmlyc3RSYW5rSXMwOiBib29sZWFuKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhwaWVjZXMpLmZpbHRlcihrZXkgPT4ge1xuICAgIGNvbnN0IHBpZWNlID0gcGllY2VzW2tleV07XG4gICAgcmV0dXJuIHBpZWNlICYmIHBpZWNlLmNvbG9yID09PSBjb2xvciAmJiBwaWVjZS5yb2xlID09PSAncm9vayc7XG4gIH0pLm1hcCgoa2V5OiBzdHJpbmcgKSA9PiB1dGlsLmtleTJwb3Moa2V5IGFzIGNnLktleSwgZmlyc3RSYW5rSXMwKVswXSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHByZW1vdmUocGllY2VzOiBjZy5QaWVjZXMsIGtleTogY2cuS2V5LCBjYW5DYXN0bGU6IGJvb2xlYW4sIGdlb206IGNnLkdlb21ldHJ5LCB2YXJpYW50OiBjZy5WYXJpYW50KTogY2cuS2V5W10ge1xuICBjb25zdCBmaXJzdFJhbmtJczAgPSBjZy5kaW1lbnNpb25zW2dlb21dLmhlaWdodCA9PT0gMTA7XG4gIGNvbnN0IHBpZWNlID0gcGllY2VzW2tleV0hLFxuICBwb3MgPSB1dGlsLmtleTJwb3Moa2V5LCBmaXJzdFJhbmtJczApO1xuICBsZXQgbW9iaWxpdHk6IE1vYmlsaXR5O1xuICAvLyBQaWVjZSBwcmVtb3ZlIGRlcGVuZHMgb24gY2hlc3MgdmFyaWFudCBub3Qgb24gYm9hcmQgZ2VvbWV0cnksIGJ1dCB3ZSB3aWxsIHVzZSBpdCBoZXJlXG4gIC8vIEYuZS4gc2hvZ2kgaXMgbm90IHRoZSBvbmx5IDl4OSB2YXJpYW50LCBzZWUgaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvSmVzb25fTW9yXG4gIHN3aXRjaCAoZ2VvbSkge1xuICBjYXNlIGNnLkdlb21ldHJ5LmRpbTd4NzpcbiAgY2FzZSBjZy5HZW9tZXRyeS5kaW05eDEwOlxuICAgIHN3aXRjaCAocGllY2Uucm9sZSkge1xuICAgIGNhc2UgJ3Bhd24nOlxuICAgICAgbW9iaWxpdHkgPSB4cGF3bihwaWVjZS5jb2xvcik7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjYW5ub24nOlxuICAgIGNhc2UgJ3Jvb2snOlxuICAgICAgbW9iaWxpdHkgPSByb29rO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAna25pZ2h0JzpcbiAgICAgIG1vYmlsaXR5ID0ga25pZ2h0O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnYmlzaG9wJzpcbiAgICAgIG1vYmlsaXR5ID0geGJpc2hvcDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Fkdmlzb3InOlxuICAgICAgbW9iaWxpdHkgPSBhZHZpc29yO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAna2luZyc6XG4gICAgICBtb2JpbGl0eSA9IHhraW5nO1xuICAgICAgYnJlYWs7XG4gICAgfTtcbiAgICBicmVhaztcbiAgY2FzZSBjZy5HZW9tZXRyeS5kaW01eDU6XG4gIGNhc2UgY2cuR2VvbWV0cnkuZGltOXg5OlxuICAgIHN3aXRjaCAocGllY2Uucm9sZSkge1xuICAgIGNhc2UgJ3Bhd24nOlxuICAgICAgbW9iaWxpdHkgPSBzcGF3bihwaWVjZS5jb2xvcik7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdrbmlnaHQnOlxuICAgICAgbW9iaWxpdHkgPSBza25pZ2h0KHBpZWNlLmNvbG9yKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Jpc2hvcCc6XG4gICAgICBtb2JpbGl0eSA9IGJpc2hvcDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3Jvb2snOlxuICAgICAgbW9iaWxpdHkgPSByb29rO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAna2luZyc6XG4gICAgICBtb2JpbGl0eSA9IHNraW5nO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnc2lsdmVyJzpcbiAgICAgIG1vYmlsaXR5ID0gc2lsdmVyKHBpZWNlLmNvbG9yKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3BwYXduJzpcbiAgICBjYXNlICdwbGFuY2UnOlxuICAgIGNhc2UgJ3BrbmlnaHQnOlxuICAgIGNhc2UgJ3BzaWx2ZXInOlxuICAgIGNhc2UgJ2dvbGQnOlxuICAgICAgbW9iaWxpdHkgPSBnb2xkKHBpZWNlLmNvbG9yKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2xhbmNlJzpcbiAgICAgIG1vYmlsaXR5ID0gbGFuY2UocGllY2UuY29sb3IpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncHJvb2snOlxuICAgICAgbW9iaWxpdHkgPSBwcm9vaztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3BiaXNob3AnOlxuICAgICAgbW9iaWxpdHkgPSBwYmlzaG9wO1xuICAgICAgYnJlYWs7XG4gICAgfTtcbiAgICBicmVhaztcbiAgZGVmYXVsdDpcbiAgICBzd2l0Y2ggKHBpZWNlLnJvbGUpIHtcbiAgICBjYXNlICdwYXduJzpcbiAgICAgIG1vYmlsaXR5ID0gcGF3bihwaWVjZS5jb2xvcik7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdrbmlnaHQnOlxuICAgICAgbW9iaWxpdHkgPSBrbmlnaHQ7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdiaXNob3AnOlxuICAgICAgbW9iaWxpdHkgPSBiaXNob3A7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyb29rJzpcbiAgICAgIG1vYmlsaXR5ID0gcm9vaztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3F1ZWVuJzpcbiAgICAgIG1vYmlsaXR5ID0gcXVlZW47XG4gICAgICBicmVhaztcbiAgICBjYXNlICdraW5nJzpcbiAgICAgIG1vYmlsaXR5ID0ga2luZyhwaWVjZS5jb2xvciwgcm9va0ZpbGVzT2YocGllY2VzLCBwaWVjZS5jb2xvciwgZmlyc3RSYW5rSXMwKSwgY2FuQ2FzdGxlKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2hhd2snOlxuICAgIGNhc2UgJ2FyY2hiaXNob3AnOlxuICAgICAgbW9iaWxpdHkgPSBhcmNoYmlzaG9wO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnZWxlcGhhbnQnOlxuICAgICAgaWYgKHZhcmlhbnQgPT09ICdzaGFrbycpIHtcbiAgICAgICAgbW9iaWxpdHkgPSBzaGFrb0VsZXBoYW50O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbW9iaWxpdHkgPSBjYW5jZWxsb3I7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjYW5jZWxsb3InOlxuICAgICAgaWYgKHZhcmlhbnQgPT09ICdzaGFrbycpIHtcbiAgICAgICAgLy8gY2Fubm9uXG4gICAgICAgIG1vYmlsaXR5ID0gcm9vaztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1vYmlsaXR5ID0gY2FuY2VsbG9yO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnbWV0JzpcbiAgICBjYXNlICdmZXJ6JzpcbiAgICAgIG1vYmlsaXR5ID0gbWV0O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnc2lsdmVyJzpcbiAgICAgIG1vYmlsaXR5ID0gc2lsdmVyKHBpZWNlLmNvbG9yKTtcbiAgICAgIGJyZWFrO1xuICAgIH07XG4gICAgYnJlYWs7XG4gIH07XG4gIGNvbnN0IGFsbGtleXMgPSB1dGlsLmFsbEtleXNbZ2VvbV07XG5cbiAgY29uc3QgcG9zMmtleUdlb20gPSAoZ2VvbTogY2cuR2VvbWV0cnkpID0+ICggKHBvczogY2cuUG9zKSA9PiB1dGlsLnBvczJrZXkocG9zLCBnZW9tKSApO1xuICBjb25zdCBwb3Mya2V5ID0gcG9zMmtleUdlb20oZ2VvbSk7XG5cbiAgY29uc3Qga2V5MnBvc1JhbmswID0gKGZpcnN0cmFuazA6IGJvb2xlYW4pID0+ICggKGtleTogY2cuS2V5KSA9PiB1dGlsLmtleTJwb3Moa2V5LCBmaXJzdHJhbmswKSApO1xuICBjb25zdCBrZXkycG9zID0ga2V5MnBvc1JhbmswKGZpcnN0UmFua0lzMCk7XG5cbiAgcmV0dXJuIGFsbGtleXMubWFwKGtleTJwb3MpLmZpbHRlcihwb3MyID0+IHtcbiAgICByZXR1cm4gKHBvc1swXSAhPT0gcG9zMlswXSB8fCBwb3NbMV0gIT09IHBvczJbMV0pICYmIG1vYmlsaXR5KHBvc1swXSwgcG9zWzFdLCBwb3MyWzBdLCBwb3MyWzFdKTtcbiAgfSkubWFwKHBvczJrZXkpO1xufTtcbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCB7IGtleTJwb3MsIGNyZWF0ZUVsIH0gZnJvbSAnLi91dGlsJ1xuaW1wb3J0IHsgd2hpdGVQb3YgfSBmcm9tICcuL2JvYXJkJ1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWwnXG5pbXBvcnQgeyBBbmltQ3VycmVudCwgQW5pbVZlY3RvcnMsIEFuaW1WZWN0b3IsIEFuaW1GYWRpbmdzIH0gZnJvbSAnLi9hbmltJ1xuaW1wb3J0IHsgRHJhZ0N1cnJlbnQgfSBmcm9tICcuL2RyYWcnXG5pbXBvcnQgKiBhcyBjZyBmcm9tICcuL3R5cGVzJ1xuXG4vLyBgJGNvbG9yICRyb2xlYFxudHlwZSBQaWVjZU5hbWUgPSBzdHJpbmc7XG5cbmludGVyZmFjZSBTYW1lUGllY2VzIHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9XG5pbnRlcmZhY2UgU2FtZVNxdWFyZXMgeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH1cbmludGVyZmFjZSBNb3ZlZFBpZWNlcyB7IFtwaWVjZU5hbWU6IHN0cmluZ106IGNnLlBpZWNlTm9kZVtdIH1cbmludGVyZmFjZSBNb3ZlZFNxdWFyZXMgeyBbY2xhc3NOYW1lOiBzdHJpbmddOiBjZy5TcXVhcmVOb2RlW10gfVxuaW50ZXJmYWNlIFNxdWFyZUNsYXNzZXMgeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfVxuXG4vLyBwb3J0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vdmVsb2NlL2xpY2hvYmlsZS9ibG9iL21hc3Rlci9zcmMvanMvY2hlc3Nncm91bmQvdmlldy5qc1xuLy8gaW4gY2FzZSBvZiBidWdzLCBibGFtZSBAdmVsb2NlXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZW5kZXIoczogU3RhdGUpOiB2b2lkIHtcbiAgY29uc3QgZmlyc3RSYW5rSXMwID0gcy5kaW1lbnNpb25zLmhlaWdodCA9PT0gMTA7XG4gIGNvbnN0IGFzV2hpdGU6IGJvb2xlYW4gPSB3aGl0ZVBvdihzKSxcbiAgcG9zVG9UcmFuc2xhdGUgPSBzLmRvbS5yZWxhdGl2ZSA/IHV0aWwucG9zVG9UcmFuc2xhdGVSZWwgOiB1dGlsLnBvc1RvVHJhbnNsYXRlQWJzKHMuZG9tLmJvdW5kcygpLCBzLmRpbWVuc2lvbnMpLFxuICB0cmFuc2xhdGUgPSBzLmRvbS5yZWxhdGl2ZSA/IHV0aWwudHJhbnNsYXRlUmVsIDogdXRpbC50cmFuc2xhdGVBYnMsXG4gIGJvYXJkRWw6IEhUTUxFbGVtZW50ID0gcy5kb20uZWxlbWVudHMuYm9hcmQsXG4gIHBpZWNlczogY2cuUGllY2VzID0gcy5waWVjZXMsXG4gIGN1ckFuaW06IEFuaW1DdXJyZW50IHwgdW5kZWZpbmVkID0gcy5hbmltYXRpb24uY3VycmVudCxcbiAgYW5pbXM6IEFuaW1WZWN0b3JzID0gY3VyQW5pbSA/IGN1ckFuaW0ucGxhbi5hbmltcyA6IHt9LFxuICBmYWRpbmdzOiBBbmltRmFkaW5ncyA9IGN1ckFuaW0gPyBjdXJBbmltLnBsYW4uZmFkaW5ncyA6IHt9LFxuICBjdXJEcmFnOiBEcmFnQ3VycmVudCB8IHVuZGVmaW5lZCA9IHMuZHJhZ2dhYmxlLmN1cnJlbnQsXG4gIHNxdWFyZXM6IFNxdWFyZUNsYXNzZXMgPSBjb21wdXRlU3F1YXJlQ2xhc3NlcyhzKSxcbiAgc2FtZVBpZWNlczogU2FtZVBpZWNlcyA9IHt9LFxuICBzYW1lU3F1YXJlczogU2FtZVNxdWFyZXMgPSB7fSxcbiAgbW92ZWRQaWVjZXM6IE1vdmVkUGllY2VzID0ge30sXG4gIG1vdmVkU3F1YXJlczogTW92ZWRTcXVhcmVzID0ge30sXG4gIHBpZWNlc0tleXM6IGNnLktleVtdID0gT2JqZWN0LmtleXMocGllY2VzKSBhcyBjZy5LZXlbXTtcbiAgbGV0IGs6IGNnLktleSxcbiAgcDogY2cuUGllY2UgfCB1bmRlZmluZWQsXG4gIGVsOiBjZy5QaWVjZU5vZGUgfCBjZy5TcXVhcmVOb2RlLFxuICBwaWVjZUF0S2V5OiBjZy5QaWVjZSB8IHVuZGVmaW5lZCxcbiAgZWxQaWVjZU5hbWU6IFBpZWNlTmFtZSxcbiAgYW5pbTogQW5pbVZlY3RvciB8IHVuZGVmaW5lZCxcbiAgZmFkaW5nOiBjZy5QaWVjZSB8IHVuZGVmaW5lZCxcbiAgcE12ZHNldDogY2cuUGllY2VOb2RlW10sXG4gIHBNdmQ6IGNnLlBpZWNlTm9kZSB8IHVuZGVmaW5lZCxcbiAgc012ZHNldDogY2cuU3F1YXJlTm9kZVtdLFxuICBzTXZkOiBjZy5TcXVhcmVOb2RlIHwgdW5kZWZpbmVkO1xuXG4gIC8vIHdhbGsgb3ZlciBhbGwgYm9hcmQgZG9tIGVsZW1lbnRzLCBhcHBseSBhbmltYXRpb25zIGFuZCBmbGFnIG1vdmVkIHBpZWNlc1xuICBlbCA9IGJvYXJkRWwuZmlyc3RDaGlsZCBhcyBjZy5QaWVjZU5vZGUgfCBjZy5TcXVhcmVOb2RlO1xuICB3aGlsZSAoZWwpIHtcbiAgICBrID0gZWwuY2dLZXk7XG4gICAgaWYgKGlzUGllY2VOb2RlKGVsKSkge1xuICAgICAgcGllY2VBdEtleSA9IHBpZWNlc1trXTtcbiAgICAgIGFuaW0gPSBhbmltc1trXTtcbiAgICAgIGZhZGluZyA9IGZhZGluZ3Nba107XG4gICAgICBlbFBpZWNlTmFtZSA9IGVsLmNnUGllY2U7XG4gICAgICAvLyBpZiBwaWVjZSBub3QgYmVpbmcgZHJhZ2dlZCBhbnltb3JlLCByZW1vdmUgZHJhZ2dpbmcgc3R5bGVcbiAgICAgIGlmIChlbC5jZ0RyYWdnaW5nICYmICghY3VyRHJhZyB8fCBjdXJEcmFnLm9yaWcgIT09IGspKSB7XG4gICAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoJ2RyYWdnaW5nJyk7XG4gICAgICAgIHRyYW5zbGF0ZShlbCwgcG9zVG9UcmFuc2xhdGUoa2V5MnBvcyhrLCBmaXJzdFJhbmtJczApLCBhc1doaXRlLCBzLmRpbWVuc2lvbnMpKTtcbiAgICAgICAgZWwuY2dEcmFnZ2luZyA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgLy8gcmVtb3ZlIGZhZGluZyBjbGFzcyBpZiBpdCBzdGlsbCByZW1haW5zXG4gICAgICBpZiAoIWZhZGluZyAmJiBlbC5jZ0ZhZGluZykge1xuICAgICAgICBlbC5jZ0ZhZGluZyA9IGZhbHNlO1xuICAgICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKCdmYWRpbmcnKTtcbiAgICAgIH1cbiAgICAgIC8vIHRoZXJlIGlzIG5vdyBhIHBpZWNlIGF0IHRoaXMgZG9tIGtleVxuICAgICAgaWYgKHBpZWNlQXRLZXkpIHtcbiAgICAgICAgLy8gY29udGludWUgYW5pbWF0aW9uIGlmIGFscmVhZHkgYW5pbWF0aW5nIGFuZCBzYW1lIHBpZWNlXG4gICAgICAgIC8vIChvdGhlcndpc2UgaXQgY291bGQgYW5pbWF0ZSBhIGNhcHR1cmVkIHBpZWNlKVxuICAgICAgICBpZiAoYW5pbSAmJiBlbC5jZ0FuaW1hdGluZyAmJiBlbFBpZWNlTmFtZSA9PT0gcGllY2VOYW1lT2YocGllY2VBdEtleSkpIHtcbiAgICAgICAgICBjb25zdCBwb3MgPSBrZXkycG9zKGssIGZpcnN0UmFua0lzMCk7XG4gICAgICAgICAgcG9zWzBdICs9IGFuaW1bMl07XG4gICAgICAgICAgcG9zWzFdICs9IGFuaW1bM107XG4gICAgICAgICAgZWwuY2xhc3NMaXN0LmFkZCgnYW5pbScpO1xuICAgICAgICAgIHRyYW5zbGF0ZShlbCwgcG9zVG9UcmFuc2xhdGUocG9zLCBhc1doaXRlLCBzLmRpbWVuc2lvbnMpKTtcbiAgICAgICAgfSBlbHNlIGlmIChlbC5jZ0FuaW1hdGluZykge1xuICAgICAgICAgIGVsLmNnQW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnYW5pbScpO1xuICAgICAgICAgIHRyYW5zbGF0ZShlbCwgcG9zVG9UcmFuc2xhdGUoa2V5MnBvcyhrLCBmaXJzdFJhbmtJczApLCBhc1doaXRlLCBzLmRpbWVuc2lvbnMpKTtcbiAgICAgICAgICBpZiAocy5hZGRQaWVjZVpJbmRleCkgZWwuc3R5bGUuekluZGV4ID0gcG9zWkluZGV4KGtleTJwb3MoaywgZmlyc3RSYW5rSXMwKSwgYXNXaGl0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2FtZSBwaWVjZTogZmxhZyBhcyBzYW1lXG4gICAgICAgIGlmIChlbFBpZWNlTmFtZSA9PT0gcGllY2VOYW1lT2YocGllY2VBdEtleSkgJiYgKCFmYWRpbmcgfHwgIWVsLmNnRmFkaW5nKSkge1xuICAgICAgICAgIHNhbWVQaWVjZXNba10gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIGRpZmZlcmVudCBwaWVjZTogZmxhZyBhcyBtb3ZlZCB1bmxlc3MgaXQgaXMgYSBmYWRpbmcgcGllY2VcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYgKGZhZGluZyAmJiBlbFBpZWNlTmFtZSA9PT0gcGllY2VOYW1lT2YoZmFkaW5nKSkge1xuICAgICAgICAgICAgZWwuY2xhc3NMaXN0LmFkZCgnZmFkaW5nJyk7XG4gICAgICAgICAgICBlbC5jZ0ZhZGluZyA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChtb3ZlZFBpZWNlc1tlbFBpZWNlTmFtZV0pIG1vdmVkUGllY2VzW2VsUGllY2VOYW1lXS5wdXNoKGVsKTtcbiAgICAgICAgICAgIGVsc2UgbW92ZWRQaWVjZXNbZWxQaWVjZU5hbWVdID0gW2VsXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIG5vIHBpZWNlOiBmbGFnIGFzIG1vdmVkXG4gICAgICBlbHNlIHtcbiAgICAgICAgaWYgKG1vdmVkUGllY2VzW2VsUGllY2VOYW1lXSkgbW92ZWRQaWVjZXNbZWxQaWVjZU5hbWVdLnB1c2goZWwpO1xuICAgICAgICBlbHNlIG1vdmVkUGllY2VzW2VsUGllY2VOYW1lXSA9IFtlbF07XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKGlzU3F1YXJlTm9kZShlbCkpIHtcbiAgICAgIGNvbnN0IGNuID0gZWwuY2xhc3NOYW1lO1xuICAgICAgaWYgKHNxdWFyZXNba10gPT09IGNuKSBzYW1lU3F1YXJlc1trXSA9IHRydWU7XG4gICAgICBlbHNlIGlmIChtb3ZlZFNxdWFyZXNbY25dKSBtb3ZlZFNxdWFyZXNbY25dLnB1c2goZWwpO1xuICAgICAgZWxzZSBtb3ZlZFNxdWFyZXNbY25dID0gW2VsXTtcbiAgICB9XG4gICAgZWwgPSBlbC5uZXh0U2libGluZyBhcyBjZy5QaWVjZU5vZGUgfCBjZy5TcXVhcmVOb2RlO1xuICB9XG5cbiAgLy8gd2FsayBvdmVyIGFsbCBzcXVhcmVzIGluIGN1cnJlbnQgc2V0LCBhcHBseSBkb20gY2hhbmdlcyB0byBtb3ZlZCBzcXVhcmVzXG4gIC8vIG9yIGFwcGVuZCBuZXcgc3F1YXJlc1xuICBmb3IgKGNvbnN0IHNrIGluIHNxdWFyZXMpIHtcbiAgICBpZiAoIXNhbWVTcXVhcmVzW3NrXSkge1xuICAgICAgc012ZHNldCA9IG1vdmVkU3F1YXJlc1tzcXVhcmVzW3NrXV07XG4gICAgICBzTXZkID0gc012ZHNldCAmJiBzTXZkc2V0LnBvcCgpO1xuICAgICAgY29uc3QgdHJhbnNsYXRpb24gPSBwb3NUb1RyYW5zbGF0ZShrZXkycG9zKHNrIGFzIGNnLktleSwgZmlyc3RSYW5rSXMwKSwgYXNXaGl0ZSwgcy5kaW1lbnNpb25zKTtcbiAgICAgIGlmIChzTXZkKSB7XG4gICAgICAgIHNNdmQuY2dLZXkgPSBzayBhcyBjZy5LZXk7XG4gICAgICAgIHRyYW5zbGF0ZShzTXZkLCB0cmFuc2xhdGlvbik7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgY29uc3Qgc3F1YXJlTm9kZSA9IGNyZWF0ZUVsKCdzcXVhcmUnLCBzcXVhcmVzW3NrXSkgYXMgY2cuU3F1YXJlTm9kZTtcbiAgICAgICAgc3F1YXJlTm9kZS5jZ0tleSA9IHNrIGFzIGNnLktleTtcbiAgICAgICAgdHJhbnNsYXRlKHNxdWFyZU5vZGUsIHRyYW5zbGF0aW9uKTtcbiAgICAgICAgYm9hcmRFbC5pbnNlcnRCZWZvcmUoc3F1YXJlTm9kZSwgYm9hcmRFbC5maXJzdENoaWxkKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyB3YWxrIG92ZXIgYWxsIHBpZWNlcyBpbiBjdXJyZW50IHNldCwgYXBwbHkgZG9tIGNoYW5nZXMgdG8gbW92ZWQgcGllY2VzXG4gIC8vIG9yIGFwcGVuZCBuZXcgcGllY2VzXG4gIGZvciAoY29uc3QgaiBpbiBwaWVjZXNLZXlzKSB7XG4gICAgayA9IHBpZWNlc0tleXNbal07XG4gICAgcCA9IHBpZWNlc1trXSE7XG4gICAgYW5pbSA9IGFuaW1zW2tdO1xuICAgIGlmICghc2FtZVBpZWNlc1trXSkge1xuICAgICAgcE12ZHNldCA9IG1vdmVkUGllY2VzW3BpZWNlTmFtZU9mKHApXTtcbiAgICAgIHBNdmQgPSBwTXZkc2V0ICYmIHBNdmRzZXQucG9wKCk7XG4gICAgICAvLyBhIHNhbWUgcGllY2Ugd2FzIG1vdmVkXG4gICAgICBpZiAocE12ZCkge1xuICAgICAgICAvLyBhcHBseSBkb20gY2hhbmdlc1xuICAgICAgICBwTXZkLmNnS2V5ID0gaztcbiAgICAgICAgaWYgKHBNdmQuY2dGYWRpbmcpIHtcbiAgICAgICAgICBwTXZkLmNsYXNzTGlzdC5yZW1vdmUoJ2ZhZGluZycpO1xuICAgICAgICAgIHBNdmQuY2dGYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwb3MgPSBrZXkycG9zKGssIGZpcnN0UmFua0lzMCk7XG4gICAgICAgIGlmIChzLmFkZFBpZWNlWkluZGV4KSBwTXZkLnN0eWxlLnpJbmRleCA9IHBvc1pJbmRleChwb3MsIGFzV2hpdGUpO1xuICAgICAgICBpZiAoYW5pbSkge1xuICAgICAgICAgIHBNdmQuY2dBbmltYXRpbmcgPSB0cnVlO1xuICAgICAgICAgIHBNdmQuY2xhc3NMaXN0LmFkZCgnYW5pbScpO1xuICAgICAgICAgIHBvc1swXSArPSBhbmltWzJdO1xuICAgICAgICAgIHBvc1sxXSArPSBhbmltWzNdO1xuICAgICAgICB9XG4gICAgICAgIHRyYW5zbGF0ZShwTXZkLCBwb3NUb1RyYW5zbGF0ZShwb3MsIGFzV2hpdGUsIHMuZGltZW5zaW9ucykpO1xuICAgICAgfVxuICAgICAgLy8gbm8gcGllY2UgaW4gbW92ZWQgb2JqOiBpbnNlcnQgdGhlIG5ldyBwaWVjZVxuICAgICAgLy8gYXNzdW1lcyB0aGUgbmV3IHBpZWNlIGlzIG5vdCBiZWluZyBkcmFnZ2VkXG4gICAgICBlbHNlIHtcblxuICAgICAgICBjb25zdCBwaWVjZU5hbWUgPSBwaWVjZU5hbWVPZihwKSxcbiAgICAgICAgcGllY2VOb2RlID0gY3JlYXRlRWwoJ3BpZWNlJywgcGllY2VOYW1lKSBhcyBjZy5QaWVjZU5vZGUsXG4gICAgICAgIHBvcyA9IGtleTJwb3MoaywgZmlyc3RSYW5rSXMwKTtcblxuICAgICAgICBwaWVjZU5vZGUuY2dQaWVjZSA9IHBpZWNlTmFtZTtcbiAgICAgICAgcGllY2VOb2RlLmNnS2V5ID0gaztcbiAgICAgICAgaWYgKGFuaW0pIHtcbiAgICAgICAgICBwaWVjZU5vZGUuY2dBbmltYXRpbmcgPSB0cnVlO1xuICAgICAgICAgIHBvc1swXSArPSBhbmltWzJdO1xuICAgICAgICAgIHBvc1sxXSArPSBhbmltWzNdO1xuICAgICAgICB9XG4gICAgICAgIHRyYW5zbGF0ZShwaWVjZU5vZGUsIHBvc1RvVHJhbnNsYXRlKHBvcywgYXNXaGl0ZSwgcy5kaW1lbnNpb25zKSk7XG5cbiAgICAgICAgaWYgKHMuYWRkUGllY2VaSW5kZXgpIHBpZWNlTm9kZS5zdHlsZS56SW5kZXggPSBwb3NaSW5kZXgocG9zLCBhc1doaXRlKTtcblxuICAgICAgICBib2FyZEVsLmFwcGVuZENoaWxkKHBpZWNlTm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gcmVtb3ZlIGFueSBlbGVtZW50IHRoYXQgcmVtYWlucyBpbiB0aGUgbW92ZWQgc2V0c1xuICBmb3IgKGNvbnN0IGkgaW4gbW92ZWRQaWVjZXMpIHJlbW92ZU5vZGVzKHMsIG1vdmVkUGllY2VzW2ldKTtcbiAgZm9yIChjb25zdCBpIGluIG1vdmVkU3F1YXJlcykgcmVtb3ZlTm9kZXMocywgbW92ZWRTcXVhcmVzW2ldKTtcbn1cblxuZnVuY3Rpb24gaXNQaWVjZU5vZGUoZWw6IGNnLlBpZWNlTm9kZSB8IGNnLlNxdWFyZU5vZGUpOiBlbCBpcyBjZy5QaWVjZU5vZGUge1xuICByZXR1cm4gZWwudGFnTmFtZSA9PT0gJ1BJRUNFJztcbn1cbmZ1bmN0aW9uIGlzU3F1YXJlTm9kZShlbDogY2cuUGllY2VOb2RlIHwgY2cuU3F1YXJlTm9kZSk6IGVsIGlzIGNnLlNxdWFyZU5vZGUge1xuICByZXR1cm4gZWwudGFnTmFtZSA9PT0gJ1NRVUFSRSc7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZU5vZGVzKHM6IFN0YXRlLCBub2RlczogSFRNTEVsZW1lbnRbXSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IGkgaW4gbm9kZXMpIHMuZG9tLmVsZW1lbnRzLmJvYXJkLnJlbW92ZUNoaWxkKG5vZGVzW2ldKTtcbn1cblxuZnVuY3Rpb24gcG9zWkluZGV4KHBvczogY2cuUG9zLCBhc1doaXRlOiBib29sZWFuKTogc3RyaW5nIHtcbiAgbGV0IHogPSAyICsgKHBvc1sxXSAtIDEpICogOCArICg4IC0gcG9zWzBdKTtcbiAgaWYgKGFzV2hpdGUpIHogPSA2NyAtIHo7XG4gIHJldHVybiB6ICsgJyc7XG59XG5cbmZ1bmN0aW9uIHBpZWNlTmFtZU9mKHBpZWNlOiBjZy5QaWVjZSk6IHN0cmluZyB7XG4gIHJldHVybiBgJHtwaWVjZS5jb2xvcn0gJHtwaWVjZS5yb2xlfWA7XG59XG5cbmZ1bmN0aW9uIGNvbXB1dGVTcXVhcmVDbGFzc2VzKHM6IFN0YXRlKTogU3F1YXJlQ2xhc3NlcyB7XG4gIGNvbnN0IHNxdWFyZXM6IFNxdWFyZUNsYXNzZXMgPSB7fTtcbiAgbGV0IGk6IGFueSwgazogY2cuS2V5O1xuICBpZiAocy5sYXN0TW92ZSAmJiBzLmhpZ2hsaWdodC5sYXN0TW92ZSkgZm9yIChpIGluIHMubGFzdE1vdmUpIHtcbiAgICBpZiAocy5sYXN0TW92ZVtpXSAhPSAnejAnKSB7XG4gICAgICBhZGRTcXVhcmUoc3F1YXJlcywgcy5sYXN0TW92ZVtpXSwgJ2xhc3QtbW92ZScpO1xuICAgIH1cbiAgfVxuICBpZiAocy5jaGVjayAmJiBzLmhpZ2hsaWdodC5jaGVjaykgYWRkU3F1YXJlKHNxdWFyZXMsIHMuY2hlY2ssICdjaGVjaycpO1xuICBpZiAocy5zZWxlY3RlZCkge1xuICAgIGlmIChzLnNlbGVjdGVkICE9ICd6MCcpIHtcbiAgICAgIGFkZFNxdWFyZShzcXVhcmVzLCBzLnNlbGVjdGVkLCAnc2VsZWN0ZWQnKTtcbiAgICB9XG4gICAgaWYgKHMubW92YWJsZS5zaG93RGVzdHMpIHtcbiAgICAgIGNvbnN0IGRlc3RzID0gcy5tb3ZhYmxlLmRlc3RzICYmIHMubW92YWJsZS5kZXN0c1tzLnNlbGVjdGVkXTtcbiAgICAgIGlmIChkZXN0cykgZm9yIChpIGluIGRlc3RzKSB7XG4gICAgICAgIGsgPSBkZXN0c1tpXTtcbiAgICAgICAgYWRkU3F1YXJlKHNxdWFyZXMsIGssICdtb3ZlLWRlc3QnICsgKHMucGllY2VzW2tdID8gJyBvYycgOiAnJykpO1xuICAgICAgfVxuICAgICAgY29uc3QgcERlc3RzID0gcy5wcmVtb3ZhYmxlLmRlc3RzO1xuICAgICAgaWYgKHBEZXN0cykgZm9yIChpIGluIHBEZXN0cykge1xuICAgICAgICBrID0gcERlc3RzW2ldO1xuICAgICAgICBhZGRTcXVhcmUoc3F1YXJlcywgaywgJ3ByZW1vdmUtZGVzdCcgKyAocy5waWVjZXNba10gPyAnIG9jJyA6ICcnKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGNvbnN0IHByZW1vdmUgPSBzLnByZW1vdmFibGUuY3VycmVudDtcbiAgaWYgKHByZW1vdmUpIGZvciAoaSBpbiBwcmVtb3ZlKSBhZGRTcXVhcmUoc3F1YXJlcywgcHJlbW92ZVtpXSwgJ2N1cnJlbnQtcHJlbW92ZScpO1xuICBlbHNlIGlmIChzLnByZWRyb3BwYWJsZS5jdXJyZW50KSBhZGRTcXVhcmUoc3F1YXJlcywgcy5wcmVkcm9wcGFibGUuY3VycmVudC5rZXksICdjdXJyZW50LXByZW1vdmUnKTtcblxuICBjb25zdCBvID0gcy5leHBsb2Rpbmc7XG4gIGlmIChvKSBmb3IgKGkgaW4gby5rZXlzKSBhZGRTcXVhcmUoc3F1YXJlcywgby5rZXlzW2ldLCAnZXhwbG9kaW5nJyArIG8uc3RhZ2UpO1xuXG4gIHJldHVybiBzcXVhcmVzO1xufVxuXG5mdW5jdGlvbiBhZGRTcXVhcmUoc3F1YXJlczogU3F1YXJlQ2xhc3Nlcywga2V5OiBjZy5LZXksIGtsYXNzOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKHNxdWFyZXNba2V5XSkgc3F1YXJlc1trZXldICs9ICcgJyArIGtsYXNzO1xuICBlbHNlIHNxdWFyZXNba2V5XSA9IGtsYXNzO1xufVxuIiwiaW1wb3J0ICogYXMgZmVuIGZyb20gJy4vZmVuJ1xuaW1wb3J0IHsgQW5pbUN1cnJlbnQgfSBmcm9tICcuL2FuaW0nXG5pbXBvcnQgeyBEcmFnQ3VycmVudCB9IGZyb20gJy4vZHJhZydcbmltcG9ydCB7IERyYXdhYmxlIH0gZnJvbSAnLi9kcmF3J1xuaW1wb3J0IHsgdGltZXIgfSBmcm9tICcuL3V0aWwnXG5pbXBvcnQgKiBhcyBjZyBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IGludGVyZmFjZSBTdGF0ZSB7XG4gIHBpZWNlczogY2cuUGllY2VzO1xuICBvcmllbnRhdGlvbjogY2cuQ29sb3I7IC8vIGJvYXJkIG9yaWVudGF0aW9uLiB3aGl0ZSB8IGJsYWNrXG4gIHR1cm5Db2xvcjogY2cuQ29sb3I7IC8vIHR1cm4gdG8gcGxheS4gd2hpdGUgfCBibGFja1xuICBjaGVjaz86IGNnLktleTsgLy8gc3F1YXJlIGN1cnJlbnRseSBpbiBjaGVjayBcImEyXCJcbiAgbGFzdE1vdmU/OiBjZy5LZXlbXTsgLy8gc3F1YXJlcyBwYXJ0IG9mIHRoZSBsYXN0IG1vdmUgW1wiYzNcIjsgXCJjNFwiXVxuICBzZWxlY3RlZD86IGNnLktleTsgLy8gc3F1YXJlIGN1cnJlbnRseSBzZWxlY3RlZCBcImExXCJcbiAgY29vcmRpbmF0ZXM6IGJvb2xlYW47IC8vIGluY2x1ZGUgY29vcmRzIGF0dHJpYnV0ZXNcbiAgYXV0b0Nhc3RsZTogYm9vbGVhbjsgLy8gaW1tZWRpYXRlbHkgY29tcGxldGUgdGhlIGNhc3RsZSBieSBtb3ZpbmcgdGhlIHJvb2sgYWZ0ZXIga2luZyBtb3ZlXG4gIHZpZXdPbmx5OiBib29sZWFuOyAvLyBkb24ndCBiaW5kIGV2ZW50czogdGhlIHVzZXIgd2lsbCBuZXZlciBiZSBhYmxlIHRvIG1vdmUgcGllY2VzIGFyb3VuZFxuICBkaXNhYmxlQ29udGV4dE1lbnU6IGJvb2xlYW47IC8vIGJlY2F1c2Ugd2hvIG5lZWRzIGEgY29udGV4dCBtZW51IG9uIGEgY2hlc3Nib2FyZFxuICByZXNpemFibGU6IGJvb2xlYW47IC8vIGxpc3RlbnMgdG8gY2hlc3Nncm91bmQucmVzaXplIG9uIGRvY3VtZW50LmJvZHkgdG8gY2xlYXIgYm91bmRzIGNhY2hlXG4gIGFkZFBpZWNlWkluZGV4OiBib29sZWFuOyAvLyBhZGRzIHotaW5kZXggdmFsdWVzIHRvIHBpZWNlcyAoZm9yIDNEKVxuICBwaWVjZUtleTogYm9vbGVhbjsgLy8gYWRkIGEgZGF0YS1rZXkgYXR0cmlidXRlIHRvIHBpZWNlIGVsZW1lbnRzXG4gIGhpZ2hsaWdodDoge1xuICAgIGxhc3RNb3ZlOiBib29sZWFuOyAvLyBhZGQgbGFzdC1tb3ZlIGNsYXNzIHRvIHNxdWFyZXNcbiAgICBjaGVjazogYm9vbGVhbjsgLy8gYWRkIGNoZWNrIGNsYXNzIHRvIHNxdWFyZXNcbiAgfTtcbiAgYW5pbWF0aW9uOiB7XG4gICAgZW5hYmxlZDogYm9vbGVhbjtcbiAgICBkdXJhdGlvbjogbnVtYmVyO1xuICAgIGN1cnJlbnQ/OiBBbmltQ3VycmVudDtcbiAgfTtcbiAgbW92YWJsZToge1xuICAgIGZyZWU6IGJvb2xlYW47IC8vIGFsbCBtb3ZlcyBhcmUgdmFsaWQgLSBib2FyZCBlZGl0b3JcbiAgICBjb2xvcj86IGNnLkNvbG9yIHwgJ2JvdGgnOyAvLyBjb2xvciB0aGF0IGNhbiBtb3ZlLiB3aGl0ZSB8IGJsYWNrIHwgYm90aFxuICAgIGRlc3RzPzogY2cuRGVzdHM7IC8vIHZhbGlkIG1vdmVzLiB7XCJhMlwiIFtcImEzXCIgXCJhNFwiXSBcImIxXCIgW1wiYTNcIiBcImMzXCJdfVxuICAgIHNob3dEZXN0czogYm9vbGVhbjsgLy8gd2hldGhlciB0byBhZGQgdGhlIG1vdmUtZGVzdCBjbGFzcyBvbiBzcXVhcmVzXG4gICAgZXZlbnRzOiB7XG4gICAgICBhZnRlcj86IChvcmlnOiBjZy5LZXksIGRlc3Q6IGNnLktleSwgbWV0YWRhdGE6IGNnLk1vdmVNZXRhZGF0YSkgPT4gdm9pZDsgLy8gY2FsbGVkIGFmdGVyIHRoZSBtb3ZlIGhhcyBiZWVuIHBsYXllZFxuICAgICAgYWZ0ZXJOZXdQaWVjZT86IChyb2xlOiBjZy5Sb2xlLCBrZXk6IGNnLktleSwgbWV0YWRhdGE6IGNnLk1vdmVNZXRhZGF0YSkgPT4gdm9pZDsgLy8gY2FsbGVkIGFmdGVyIGEgbmV3IHBpZWNlIGlzIGRyb3BwZWQgb24gdGhlIGJvYXJkXG4gICAgfTtcbiAgICByb29rQ2FzdGxlOiBib29sZWFuIC8vIGNhc3RsZSBieSBtb3ZpbmcgdGhlIGtpbmcgdG8gdGhlIHJvb2tcbiAgfTtcbiAgcHJlbW92YWJsZToge1xuICAgIGVuYWJsZWQ6IGJvb2xlYW47IC8vIGFsbG93IHByZW1vdmVzIGZvciBjb2xvciB0aGF0IGNhbiBub3QgbW92ZVxuICAgIHNob3dEZXN0czogYm9vbGVhbjsgLy8gd2hldGhlciB0byBhZGQgdGhlIHByZW1vdmUtZGVzdCBjbGFzcyBvbiBzcXVhcmVzXG4gICAgY2FzdGxlOiBib29sZWFuOyAvLyB3aGV0aGVyIHRvIGFsbG93IGtpbmcgY2FzdGxlIHByZW1vdmVzXG4gICAgZGVzdHM/OiBjZy5LZXlbXTsgLy8gcHJlbW92ZSBkZXN0aW5hdGlvbnMgZm9yIHRoZSBjdXJyZW50IHNlbGVjdGlvblxuICAgIGN1cnJlbnQ/OiBjZy5LZXlQYWlyOyAvLyBrZXlzIG9mIHRoZSBjdXJyZW50IHNhdmVkIHByZW1vdmUgW1wiZTJcIiBcImU0XCJdXG4gICAgZXZlbnRzOiB7XG4gICAgICBzZXQ/OiAob3JpZzogY2cuS2V5LCBkZXN0OiBjZy5LZXksIG1ldGFkYXRhPzogY2cuU2V0UHJlbW92ZU1ldGFkYXRhKSA9PiB2b2lkOyAvLyBjYWxsZWQgYWZ0ZXIgdGhlIHByZW1vdmUgaGFzIGJlZW4gc2V0XG4gICAgICB1bnNldD86ICgpID0+IHZvaWQ7ICAvLyBjYWxsZWQgYWZ0ZXIgdGhlIHByZW1vdmUgaGFzIGJlZW4gdW5zZXRcbiAgICB9XG4gIH07XG4gIHByZWRyb3BwYWJsZToge1xuICAgIGVuYWJsZWQ6IGJvb2xlYW47IC8vIGFsbG93IHByZWRyb3BzIGZvciBjb2xvciB0aGF0IGNhbiBub3QgbW92ZVxuICAgIGN1cnJlbnQ/OiB7IC8vIGN1cnJlbnQgc2F2ZWQgcHJlZHJvcCB7cm9sZTogJ2tuaWdodCc7IGtleTogJ2U0J31cbiAgICAgIHJvbGU6IGNnLlJvbGU7XG4gICAgICBrZXk6IGNnLktleVxuICAgIH07XG4gICAgZXZlbnRzOiB7XG4gICAgICBzZXQ/OiAocm9sZTogY2cuUm9sZSwga2V5OiBjZy5LZXkpID0+IHZvaWQ7IC8vIGNhbGxlZCBhZnRlciB0aGUgcHJlZHJvcCBoYXMgYmVlbiBzZXRcbiAgICAgIHVuc2V0PzogKCkgPT4gdm9pZDsgLy8gY2FsbGVkIGFmdGVyIHRoZSBwcmVkcm9wIGhhcyBiZWVuIHVuc2V0XG4gICAgfVxuICB9O1xuICBkcmFnZ2FibGU6IHtcbiAgICBlbmFibGVkOiBib29sZWFuOyAvLyBhbGxvdyBtb3ZlcyAmIHByZW1vdmVzIHRvIHVzZSBkcmFnJ24gZHJvcFxuICAgIGRpc3RhbmNlOiBudW1iZXI7IC8vIG1pbmltdW0gZGlzdGFuY2UgdG8gaW5pdGlhdGUgYSBkcmFnOyBpbiBwaXhlbHNcbiAgICBhdXRvRGlzdGFuY2U6IGJvb2xlYW47IC8vIGxldHMgY2hlc3Nncm91bmQgc2V0IGRpc3RhbmNlIHRvIHplcm8gd2hlbiB1c2VyIGRyYWdzIHBpZWNlc1xuICAgIGNlbnRlclBpZWNlOiBib29sZWFuOyAvLyBjZW50ZXIgdGhlIHBpZWNlIG9uIGN1cnNvciBhdCBkcmFnIHN0YXJ0XG4gICAgc2hvd0dob3N0OiBib29sZWFuOyAvLyBzaG93IGdob3N0IG9mIHBpZWNlIGJlaW5nIGRyYWdnZWRcbiAgICBkZWxldGVPbkRyb3BPZmY6IGJvb2xlYW47IC8vIGRlbGV0ZSBhIHBpZWNlIHdoZW4gaXQgaXMgZHJvcHBlZCBvZmYgdGhlIGJvYXJkXG4gICAgY3VycmVudD86IERyYWdDdXJyZW50O1xuICB9O1xuICBkcm9wbW9kZToge1xuICAgIGFjdGl2ZTogYm9vbGVhbjtcbiAgICBwaWVjZT86IGNnLlBpZWNlO1xuICB9XG4gIHNlbGVjdGFibGU6IHtcbiAgICAvLyBkaXNhYmxlIHRvIGVuZm9yY2UgZHJhZ2dpbmcgb3ZlciBjbGljay1jbGljayBtb3ZlXG4gICAgZW5hYmxlZDogYm9vbGVhblxuICB9O1xuICBzdGF0czoge1xuICAgIC8vIHdhcyBsYXN0IHBpZWNlIGRyYWdnZWQgb3IgY2xpY2tlZD9cbiAgICAvLyBuZWVkcyBkZWZhdWx0IHRvIGZhbHNlIGZvciB0b3VjaFxuICAgIGRyYWdnZWQ6IGJvb2xlYW4sXG4gICAgY3RybEtleT86IGJvb2xlYW5cbiAgfTtcbiAgZXZlbnRzOiB7XG4gICAgY2hhbmdlPzogKCkgPT4gdm9pZDsgLy8gY2FsbGVkIGFmdGVyIHRoZSBzaXR1YXRpb24gY2hhbmdlcyBvbiB0aGUgYm9hcmRcbiAgICAvLyBjYWxsZWQgYWZ0ZXIgYSBwaWVjZSBoYXMgYmVlbiBtb3ZlZC5cbiAgICAvLyBjYXB0dXJlZFBpZWNlIGlzIHVuZGVmaW5lZCBvciBsaWtlIHtjb2xvcjogJ3doaXRlJzsgJ3JvbGUnOiAncXVlZW4nfVxuICAgIG1vdmU/OiAob3JpZzogY2cuS2V5LCBkZXN0OiBjZy5LZXksIGNhcHR1cmVkUGllY2U/OiBjZy5QaWVjZSkgPT4gdm9pZDtcbiAgICBkcm9wTmV3UGllY2U/OiAocGllY2U6IGNnLlBpZWNlLCBrZXk6IGNnLktleSkgPT4gdm9pZDtcbiAgICBzZWxlY3Q/OiAoa2V5OiBjZy5LZXkpID0+IHZvaWQgLy8gY2FsbGVkIHdoZW4gYSBzcXVhcmUgaXMgc2VsZWN0ZWRcbiAgICBpbnNlcnQ/OiAoZWxlbWVudHM6IGNnLkVsZW1lbnRzKSA9PiB2b2lkOyAvLyB3aGVuIHRoZSBib2FyZCBET00gaGFzIGJlZW4gKHJlKWluc2VydGVkXG4gIH07XG4gIGRyYXdhYmxlOiBEcmF3YWJsZSxcbiAgZXhwbG9kaW5nPzogY2cuRXhwbG9kaW5nO1xuICBkb206IGNnLkRvbSxcbiAgaG9sZDogY2cuVGltZXIsXG4gIGRpbWVuc2lvbnM6IGNnLkJvYXJkRGltZW5zaW9ucywgLy8gbnVtYmVyIG9mIGxpbmVzIGFuZCByYW5rcyBvZiB0aGUgYm9hcmQge3dpZHRoOiAxMCwgaGVpZ2h0OiA4fVxuICBnZW9tZXRyeTogY2cuR2VvbWV0cnksIC8vIGRpbTh4OCB8IGRpbTl4OSB8IGRpbTEweDggfCBkaW05eDEwXG4gIHZhcmlhbnQ6IGNnLlZhcmlhbnQsXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0cygpOiBQYXJ0aWFsPFN0YXRlPiB7XG4gIHJldHVybiB7XG4gICAgcGllY2VzOiBmZW4ucmVhZChmZW4uaW5pdGlhbCwgY2cuR2VvbWV0cnkuZGltOHg4KSxcbiAgICBvcmllbnRhdGlvbjogJ3doaXRlJyxcbiAgICB0dXJuQ29sb3I6ICd3aGl0ZScsXG4gICAgY29vcmRpbmF0ZXM6IHRydWUsXG4gICAgYXV0b0Nhc3RsZTogdHJ1ZSxcbiAgICB2aWV3T25seTogZmFsc2UsXG4gICAgZGlzYWJsZUNvbnRleHRNZW51OiBmYWxzZSxcbiAgICByZXNpemFibGU6IHRydWUsXG4gICAgYWRkUGllY2VaSW5kZXg6IGZhbHNlLFxuICAgIHBpZWNlS2V5OiBmYWxzZSxcbiAgICBoaWdobGlnaHQ6IHtcbiAgICAgIGxhc3RNb3ZlOiB0cnVlLFxuICAgICAgY2hlY2s6IHRydWVcbiAgICB9LFxuICAgIGFuaW1hdGlvbjoge1xuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgIGR1cmF0aW9uOiAyMDBcbiAgICB9LFxuICAgIG1vdmFibGU6IHtcbiAgICAgIGZyZWU6IHRydWUsXG4gICAgICBjb2xvcjogJ2JvdGgnLFxuICAgICAgc2hvd0Rlc3RzOiB0cnVlLFxuICAgICAgZXZlbnRzOiB7fSxcbiAgICAgIHJvb2tDYXN0bGU6IHRydWVcbiAgICB9LFxuICAgIHByZW1vdmFibGU6IHtcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICBzaG93RGVzdHM6IHRydWUsXG4gICAgICBjYXN0bGU6IHRydWUsXG4gICAgICBldmVudHM6IHt9XG4gICAgfSxcbiAgICBwcmVkcm9wcGFibGU6IHtcbiAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgZXZlbnRzOiB7fVxuICAgIH0sXG4gICAgZHJhZ2dhYmxlOiB7XG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgZGlzdGFuY2U6IDMsXG4gICAgICBhdXRvRGlzdGFuY2U6IHRydWUsXG4gICAgICBjZW50ZXJQaWVjZTogdHJ1ZSxcbiAgICAgIHNob3dHaG9zdDogdHJ1ZSxcbiAgICAgIGRlbGV0ZU9uRHJvcE9mZjogZmFsc2VcbiAgICB9LFxuICAgIGRyb3Btb2RlOiB7XG4gICAgICBhY3RpdmU6IGZhbHNlXG4gICAgfSxcbiAgICBzZWxlY3RhYmxlOiB7XG4gICAgICBlbmFibGVkOiB0cnVlXG4gICAgfSxcbiAgICBzdGF0czoge1xuICAgICAgLy8gb24gdG91Y2hzY3JlZW4sIGRlZmF1bHQgdG8gXCJ0YXAtdGFwXCIgbW92ZXNcbiAgICAgIC8vIGluc3RlYWQgb2YgZHJhZ1xuICAgICAgZHJhZ2dlZDogISgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cpXG4gICAgfSxcbiAgICBldmVudHM6IHt9LFxuICAgIGRyYXdhYmxlOiB7XG4gICAgICBlbmFibGVkOiB0cnVlLCAvLyBjYW4gZHJhd1xuICAgICAgdmlzaWJsZTogdHJ1ZSwgLy8gY2FuIHZpZXdcbiAgICAgIGVyYXNlT25DbGljazogdHJ1ZSxcbiAgICAgIHNoYXBlczogW10sXG4gICAgICBhdXRvU2hhcGVzOiBbXSxcbiAgICAgIGJydXNoZXM6IHtcbiAgICAgICAgZ3JlZW46IHsga2V5OiAnZycsIGNvbG9yOiAnIzE1NzgxQicsIG9wYWNpdHk6IDEsIGxpbmVXaWR0aDogMTAgfSxcbiAgICAgICAgcmVkOiB7IGtleTogJ3InLCBjb2xvcjogJyM4ODIwMjAnLCBvcGFjaXR5OiAxLCBsaW5lV2lkdGg6IDEwIH0sXG4gICAgICAgIGJsdWU6IHsga2V5OiAnYicsIGNvbG9yOiAnIzAwMzA4OCcsIG9wYWNpdHk6IDEsIGxpbmVXaWR0aDogMTAgfSxcbiAgICAgICAgeWVsbG93OiB7IGtleTogJ3knLCBjb2xvcjogJyNlNjhmMDAnLCBvcGFjaXR5OiAxLCBsaW5lV2lkdGg6IDEwIH0sXG4gICAgICAgIHBhbGVCbHVlOiB7IGtleTogJ3BiJywgY29sb3I6ICcjMDAzMDg4Jywgb3BhY2l0eTogMC40LCBsaW5lV2lkdGg6IDE1IH0sXG4gICAgICAgIHBhbGVHcmVlbjogeyBrZXk6ICdwZycsIGNvbG9yOiAnIzE1NzgxQicsIG9wYWNpdHk6IDAuNCwgbGluZVdpZHRoOiAxNSB9LFxuICAgICAgICBwYWxlUmVkOiB7IGtleTogJ3ByJywgY29sb3I6ICcjODgyMDIwJywgb3BhY2l0eTogMC40LCBsaW5lV2lkdGg6IDE1IH0sXG4gICAgICAgIHBhbGVHcmV5OiB7IGtleTogJ3BncicsIGNvbG9yOiAnIzRhNGE0YScsIG9wYWNpdHk6IDAuMzUsIGxpbmVXaWR0aDogMTUgfVxuICAgICAgfSxcbiAgICAgIHBpZWNlczoge1xuICAgICAgICBiYXNlVXJsOiAnaHR0cHM6Ly9saWNoZXNzMS5vcmcvYXNzZXRzL3BpZWNlL2NidXJuZXR0LydcbiAgICAgIH0sXG4gICAgICBwcmV2U3ZnSGFzaDogJydcbiAgICB9LFxuICAgIGhvbGQ6IHRpbWVyKCksXG4gICAgZGltZW5zaW9uczoge3dpZHRoOiA4LCBoZWlnaHQ6IDh9LFxuICAgIGdlb21ldHJ5OiBjZy5HZW9tZXRyeS5kaW04eDgsXG4gICAgdmFyaWFudDogJ2NoZXNzJyxcbiAgfTtcbn1cbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCB7IGtleTJwb3MgfSBmcm9tICcuL3V0aWwnXG5pbXBvcnQgeyBEcmF3YWJsZSwgRHJhd1NoYXBlLCBEcmF3U2hhcGVQaWVjZSwgRHJhd0JydXNoLCBEcmF3QnJ1c2hlcywgRHJhd01vZGlmaWVycyB9IGZyb20gJy4vZHJhdydcbmltcG9ydCAqIGFzIGNnIGZyb20gJy4vdHlwZXMnXG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbGVtZW50KHRhZ05hbWU6IHN0cmluZyk6IFNWR0VsZW1lbnQge1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsIHRhZ05hbWUpO1xufVxuXG5pbnRlcmZhY2UgU2hhcGUge1xuICBzaGFwZTogRHJhd1NoYXBlO1xuICBjdXJyZW50OiBib29sZWFuO1xuICBoYXNoOiBIYXNoO1xufVxuXG5pbnRlcmZhY2UgQ3VzdG9tQnJ1c2hlcyB7XG4gIFtoYXNoOiBzdHJpbmddOiBEcmF3QnJ1c2hcbn1cblxuaW50ZXJmYWNlIEFycm93RGVzdHMge1xuICBba2V5OiBzdHJpbmddOiBudW1iZXI7IC8vIGhvdyBtYW55IGFycm93cyBsYW5kIG9uIGEgc3F1YXJlXG59XG5cbnR5cGUgSGFzaCA9IHN0cmluZztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlclN2ZyhzdGF0ZTogU3RhdGUsIHJvb3Q6IFNWR0VsZW1lbnQpOiB2b2lkIHtcblxuICBjb25zdCBkID0gc3RhdGUuZHJhd2FibGUsXG4gIGN1ckQgPSBkLmN1cnJlbnQsXG4gIGN1ciA9IGN1ckQgJiYgY3VyRC5tb3VzZVNxID8gY3VyRCBhcyBEcmF3U2hhcGUgOiB1bmRlZmluZWQsXG4gIGFycm93RGVzdHM6IEFycm93RGVzdHMgPSB7fTtcblxuICBkLnNoYXBlcy5jb25jYXQoZC5hdXRvU2hhcGVzKS5jb25jYXQoY3VyID8gW2N1cl0gOiBbXSkuZm9yRWFjaChzID0+IHtcbiAgICBpZiAocy5kZXN0KSBhcnJvd0Rlc3RzW3MuZGVzdF0gPSAoYXJyb3dEZXN0c1tzLmRlc3RdIHx8IDApICsgMTtcbiAgfSk7XG5cbiAgY29uc3Qgc2hhcGVzOiBTaGFwZVtdID0gZC5zaGFwZXMuY29uY2F0KGQuYXV0b1NoYXBlcykubWFwKChzOiBEcmF3U2hhcGUpID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgc2hhcGU6IHMsXG4gICAgICBjdXJyZW50OiBmYWxzZSxcbiAgICAgIGhhc2g6IHNoYXBlSGFzaChzLCBhcnJvd0Rlc3RzLCBmYWxzZSlcbiAgICB9O1xuICB9KTtcbiAgaWYgKGN1cikgc2hhcGVzLnB1c2goe1xuICAgIHNoYXBlOiBjdXIsXG4gICAgY3VycmVudDogdHJ1ZSxcbiAgICBoYXNoOiBzaGFwZUhhc2goY3VyLCBhcnJvd0Rlc3RzLCB0cnVlKVxuICB9KTtcblxuICBjb25zdCBmdWxsSGFzaCA9IHNoYXBlcy5tYXAoc2MgPT4gc2MuaGFzaCkuam9pbignJyk7XG4gIGlmIChmdWxsSGFzaCA9PT0gc3RhdGUuZHJhd2FibGUucHJldlN2Z0hhc2gpIHJldHVybjtcbiAgc3RhdGUuZHJhd2FibGUucHJldlN2Z0hhc2ggPSBmdWxsSGFzaDtcblxuICBjb25zdCBkZWZzRWwgPSByb290LmZpcnN0Q2hpbGQgYXMgU1ZHRWxlbWVudDtcblxuICBzeW5jRGVmcyhkLCBzaGFwZXMsIGRlZnNFbCk7XG4gIHN5bmNTaGFwZXMoc3RhdGUsIHNoYXBlcywgZC5icnVzaGVzLCBhcnJvd0Rlc3RzLCByb290LCBkZWZzRWwpO1xufVxuXG4vLyBhcHBlbmQgb25seS4gRG9uJ3QgdHJ5IHRvIHVwZGF0ZS9yZW1vdmUuXG5mdW5jdGlvbiBzeW5jRGVmcyhkOiBEcmF3YWJsZSwgc2hhcGVzOiBTaGFwZVtdLCBkZWZzRWw6IFNWR0VsZW1lbnQpIHtcbiAgY29uc3QgYnJ1c2hlczogQ3VzdG9tQnJ1c2hlcyA9IHt9O1xuICBsZXQgYnJ1c2g6IERyYXdCcnVzaDtcbiAgc2hhcGVzLmZvckVhY2gocyA9PiB7XG4gICAgaWYgKHMuc2hhcGUuZGVzdCkge1xuICAgICAgYnJ1c2ggPSBkLmJydXNoZXNbcy5zaGFwZS5icnVzaF07XG4gICAgICBpZiAocy5zaGFwZS5tb2RpZmllcnMpIGJydXNoID0gbWFrZUN1c3RvbUJydXNoKGJydXNoLCBzLnNoYXBlLm1vZGlmaWVycyk7XG4gICAgICBicnVzaGVzW2JydXNoLmtleV0gPSBicnVzaDtcbiAgICB9XG4gIH0pO1xuICBjb25zdCBrZXlzSW5Eb206IHtba2V5OiBzdHJpbmddOiBib29sZWFufSA9IHt9O1xuICBsZXQgZWw6IFNWR0VsZW1lbnQgPSBkZWZzRWwuZmlyc3RDaGlsZCBhcyBTVkdFbGVtZW50O1xuICB3aGlsZShlbCkge1xuICAgIGtleXNJbkRvbVtlbC5nZXRBdHRyaWJ1dGUoJ2NnS2V5JykgYXMgc3RyaW5nXSA9IHRydWU7XG4gICAgZWwgPSBlbC5uZXh0U2libGluZyBhcyBTVkdFbGVtZW50O1xuICB9XG4gIGZvciAobGV0IGtleSBpbiBicnVzaGVzKSB7XG4gICAgaWYgKCFrZXlzSW5Eb21ba2V5XSkgZGVmc0VsLmFwcGVuZENoaWxkKHJlbmRlck1hcmtlcihicnVzaGVzW2tleV0pKTtcbiAgfVxufVxuXG4vLyBhcHBlbmQgYW5kIHJlbW92ZSBvbmx5LiBObyB1cGRhdGVzLlxuZnVuY3Rpb24gc3luY1NoYXBlcyhzdGF0ZTogU3RhdGUsIHNoYXBlczogU2hhcGVbXSwgYnJ1c2hlczogRHJhd0JydXNoZXMsIGFycm93RGVzdHM6IEFycm93RGVzdHMsIHJvb3Q6IFNWR0VsZW1lbnQsIGRlZnNFbDogU1ZHRWxlbWVudCk6IHZvaWQge1xuICBjb25zdCBib3VuZHMgPSBzdGF0ZS5kb20uYm91bmRzKCksXG4gIGhhc2hlc0luRG9tOiB7W2hhc2g6IHN0cmluZ106IGJvb2xlYW59ID0ge30sXG4gIHRvUmVtb3ZlOiBTVkdFbGVtZW50W10gPSBbXTtcbiAgc2hhcGVzLmZvckVhY2goc2MgPT4geyBoYXNoZXNJbkRvbVtzYy5oYXNoXSA9IGZhbHNlOyB9KTtcbiAgbGV0IGVsOiBTVkdFbGVtZW50ID0gZGVmc0VsLm5leHRTaWJsaW5nIGFzIFNWR0VsZW1lbnQsIGVsSGFzaDogSGFzaDtcbiAgd2hpbGUoZWwpIHtcbiAgICBlbEhhc2ggPSBlbC5nZXRBdHRyaWJ1dGUoJ2NnSGFzaCcpIGFzIEhhc2g7XG4gICAgLy8gZm91bmQgYSBzaGFwZSBlbGVtZW50IHRoYXQncyBoZXJlIHRvIHN0YXlcbiAgICBpZiAoaGFzaGVzSW5Eb20uaGFzT3duUHJvcGVydHkoZWxIYXNoKSkgaGFzaGVzSW5Eb21bZWxIYXNoXSA9IHRydWU7XG4gICAgLy8gb3IgcmVtb3ZlIGl0XG4gICAgZWxzZSB0b1JlbW92ZS5wdXNoKGVsKTtcbiAgICBlbCA9IGVsLm5leHRTaWJsaW5nIGFzIFNWR0VsZW1lbnQ7XG4gIH1cbiAgLy8gcmVtb3ZlIG9sZCBzaGFwZXNcbiAgdG9SZW1vdmUuZm9yRWFjaChlbCA9PiByb290LnJlbW92ZUNoaWxkKGVsKSk7XG4gIC8vIGluc2VydCBzaGFwZXMgdGhhdCBhcmUgbm90IHlldCBpbiBkb21cbiAgc2hhcGVzLmZvckVhY2goc2MgPT4ge1xuICAgIGlmICghaGFzaGVzSW5Eb21bc2MuaGFzaF0pIHJvb3QuYXBwZW5kQ2hpbGQocmVuZGVyU2hhcGUoc3RhdGUsIHNjLCBicnVzaGVzLCBhcnJvd0Rlc3RzLCBib3VuZHMpKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHNoYXBlSGFzaCh7b3JpZywgZGVzdCwgYnJ1c2gsIHBpZWNlLCBtb2RpZmllcnN9OiBEcmF3U2hhcGUsIGFycm93RGVzdHM6IEFycm93RGVzdHMsIGN1cnJlbnQ6IGJvb2xlYW4pOiBIYXNoIHtcbiAgcmV0dXJuIFtjdXJyZW50LCBvcmlnLCBkZXN0LCBicnVzaCwgZGVzdCAmJiBhcnJvd0Rlc3RzW2Rlc3RdID4gMSxcbiAgICBwaWVjZSAmJiBwaWVjZUhhc2gocGllY2UpLFxuICAgIG1vZGlmaWVycyAmJiBtb2RpZmllcnNIYXNoKG1vZGlmaWVycylcbiAgXS5maWx0ZXIoeCA9PiB4KS5qb2luKCcnKTtcbn1cblxuZnVuY3Rpb24gcGllY2VIYXNoKHBpZWNlOiBEcmF3U2hhcGVQaWVjZSk6IEhhc2gge1xuICByZXR1cm4gW3BpZWNlLmNvbG9yLCBwaWVjZS5yb2xlLCBwaWVjZS5zY2FsZV0uZmlsdGVyKHggPT4geCkuam9pbignJyk7XG59XG5cbmZ1bmN0aW9uIG1vZGlmaWVyc0hhc2gobTogRHJhd01vZGlmaWVycyk6IEhhc2gge1xuICByZXR1cm4gJycgKyAobS5saW5lV2lkdGggfHwgJycpO1xufVxuXG5mdW5jdGlvbiByZW5kZXJTaGFwZShzdGF0ZTogU3RhdGUsIHtzaGFwZSwgY3VycmVudCwgaGFzaH06IFNoYXBlLCBicnVzaGVzOiBEcmF3QnJ1c2hlcywgYXJyb3dEZXN0czogQXJyb3dEZXN0cywgYm91bmRzOiBDbGllbnRSZWN0KTogU1ZHRWxlbWVudCB7XG4gIGNvbnN0IGZpcnN0UmFua0lzMCA9IHN0YXRlLmRpbWVuc2lvbnMuaGVpZ2h0ID09PSAxMDtcbiAgbGV0IGVsOiBTVkdFbGVtZW50O1xuICBpZiAoc2hhcGUucGllY2UpIGVsID0gcmVuZGVyUGllY2UoXG4gICAgc3RhdGUuZHJhd2FibGUucGllY2VzLmJhc2VVcmwsXG4gICAgb3JpZW50KGtleTJwb3Moc2hhcGUub3JpZywgZmlyc3RSYW5rSXMwKSwgc3RhdGUub3JpZW50YXRpb24sIHN0YXRlLmRpbWVuc2lvbnMpLFxuICAgIHNoYXBlLnBpZWNlLFxuICAgIGJvdW5kcyxcbiAgICBzdGF0ZS5kaW1lbnNpb25zKTtcbiAgZWxzZSB7XG4gICAgY29uc3Qgb3JpZyA9IG9yaWVudChrZXkycG9zKHNoYXBlLm9yaWcsIGZpcnN0UmFua0lzMCksIHN0YXRlLm9yaWVudGF0aW9uLCBzdGF0ZS5kaW1lbnNpb25zKTtcbiAgICBpZiAoc2hhcGUub3JpZyAmJiBzaGFwZS5kZXN0KSB7XG4gICAgICBsZXQgYnJ1c2g6IERyYXdCcnVzaCA9IGJydXNoZXNbc2hhcGUuYnJ1c2hdO1xuICAgICAgaWYgKHNoYXBlLm1vZGlmaWVycykgYnJ1c2ggPSBtYWtlQ3VzdG9tQnJ1c2goYnJ1c2gsIHNoYXBlLm1vZGlmaWVycyk7XG4gICAgICBlbCA9IHJlbmRlckFycm93KFxuICAgICAgICBicnVzaCxcbiAgICAgICAgb3JpZyxcbiAgICAgICAgb3JpZW50KGtleTJwb3Moc2hhcGUuZGVzdCwgZmlyc3RSYW5rSXMwKSwgc3RhdGUub3JpZW50YXRpb24sIHN0YXRlLmRpbWVuc2lvbnMpLFxuICAgICAgICBjdXJyZW50LFxuICAgICAgICBhcnJvd0Rlc3RzW3NoYXBlLmRlc3RdID4gMSxcbiAgICAgICAgYm91bmRzLFxuICAgICAgICBzdGF0ZS5kaW1lbnNpb25zKTtcbiAgICB9XG4gICAgZWxzZSBlbCA9IHJlbmRlckNpcmNsZShicnVzaGVzW3NoYXBlLmJydXNoXSwgb3JpZywgY3VycmVudCwgYm91bmRzLCBzdGF0ZS5kaW1lbnNpb25zKTtcbiAgfVxuICBlbC5zZXRBdHRyaWJ1dGUoJ2NnSGFzaCcsIGhhc2gpO1xuICByZXR1cm4gZWw7XG59XG5cbmZ1bmN0aW9uIHJlbmRlckNpcmNsZShicnVzaDogRHJhd0JydXNoLCBwb3M6IGNnLlBvcywgY3VycmVudDogYm9vbGVhbiwgYm91bmRzOiBDbGllbnRSZWN0LCBiZDogY2cuQm9hcmREaW1lbnNpb25zKTogU1ZHRWxlbWVudCB7XG4gIGNvbnN0IG8gPSBwb3MycHgocG9zLCBib3VuZHMsIGJkKSxcbiAgd2lkdGhzID0gY2lyY2xlV2lkdGgoYm91bmRzLCBiZCksXG4gIHJhZGl1cyA9IChib3VuZHMud2lkdGggLyBiZC53aWR0aCkgLyAyO1xuICByZXR1cm4gc2V0QXR0cmlidXRlcyhjcmVhdGVFbGVtZW50KCdjaXJjbGUnKSwge1xuICAgIHN0cm9rZTogYnJ1c2guY29sb3IsXG4gICAgJ3N0cm9rZS13aWR0aCc6IHdpZHRoc1tjdXJyZW50ID8gMCA6IDFdLFxuICAgIGZpbGw6ICdub25lJyxcbiAgICBvcGFjaXR5OiBvcGFjaXR5KGJydXNoLCBjdXJyZW50KSxcbiAgICBjeDogb1swXSxcbiAgICBjeTogb1sxXSxcbiAgICByOiByYWRpdXMgLSB3aWR0aHNbMV0gLyAyXG4gIH0pO1xufVxuXG5mdW5jdGlvbiByZW5kZXJBcnJvdyhicnVzaDogRHJhd0JydXNoLCBvcmlnOiBjZy5Qb3MsIGRlc3Q6IGNnLlBvcywgY3VycmVudDogYm9vbGVhbiwgc2hvcnRlbjogYm9vbGVhbiwgYm91bmRzOiBDbGllbnRSZWN0LCBiZDogY2cuQm9hcmREaW1lbnNpb25zKTogU1ZHRWxlbWVudCB7XG4gIGNvbnN0IG0gPSBhcnJvd01hcmdpbihib3VuZHMsIHNob3J0ZW4gJiYgIWN1cnJlbnQsIGJkKSxcbiAgYSA9IHBvczJweChvcmlnLCBib3VuZHMsIGJkKSxcbiAgYiA9IHBvczJweChkZXN0LCBib3VuZHMsIGJkKSxcbiAgZHggPSBiWzBdIC0gYVswXSxcbiAgZHkgPSBiWzFdIC0gYVsxXSxcbiAgYW5nbGUgPSBNYXRoLmF0YW4yKGR5LCBkeCksXG4gIHhvID0gTWF0aC5jb3MoYW5nbGUpICogbSxcbiAgeW8gPSBNYXRoLnNpbihhbmdsZSkgKiBtO1xuICByZXR1cm4gc2V0QXR0cmlidXRlcyhjcmVhdGVFbGVtZW50KCdsaW5lJyksIHtcbiAgICBzdHJva2U6IGJydXNoLmNvbG9yLFxuICAgICdzdHJva2Utd2lkdGgnOiBsaW5lV2lkdGgoYnJ1c2gsIGN1cnJlbnQsIGJvdW5kcywgYmQpLFxuICAgICdzdHJva2UtbGluZWNhcCc6ICdyb3VuZCcsXG4gICAgJ21hcmtlci1lbmQnOiAndXJsKCNhcnJvd2hlYWQtJyArIGJydXNoLmtleSArICcpJyxcbiAgICBvcGFjaXR5OiBvcGFjaXR5KGJydXNoLCBjdXJyZW50KSxcbiAgICB4MTogYVswXSxcbiAgICB5MTogYVsxXSxcbiAgICB4MjogYlswXSAtIHhvLFxuICAgIHkyOiBiWzFdIC0geW9cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlclBpZWNlKGJhc2VVcmw6IHN0cmluZywgcG9zOiBjZy5Qb3MsIHBpZWNlOiBEcmF3U2hhcGVQaWVjZSwgYm91bmRzOiBDbGllbnRSZWN0LCBiZDogY2cuQm9hcmREaW1lbnNpb25zKTogU1ZHRWxlbWVudCB7XG4gIGNvbnN0IG8gPSBwb3MycHgocG9zLCBib3VuZHMsIGJkKSxcbiAgd2lkdGggPSBib3VuZHMud2lkdGggLyBiZC53aWR0aCAqIChwaWVjZS5zY2FsZSB8fCAxKSxcbiAgaGVpZ2h0ID0gYm91bmRzLndpZHRoIC8gYmQuaGVpZ2h0ICogKHBpZWNlLnNjYWxlIHx8IDEpLFxuICBuYW1lID0gcGllY2UuY29sb3JbMF0gKyAocGllY2Uucm9sZSA9PT0gJ2tuaWdodCcgPyAnbicgOiBwaWVjZS5yb2xlWzBdKS50b1VwcGVyQ2FzZSgpO1xuICByZXR1cm4gc2V0QXR0cmlidXRlcyhjcmVhdGVFbGVtZW50KCdpbWFnZScpLCB7XG4gICAgY2xhc3NOYW1lOiBgJHtwaWVjZS5yb2xlfSAke3BpZWNlLmNvbG9yfWAsXG4gICAgeDogb1swXSAtIHdpZHRoIC8gMixcbiAgICB5OiBvWzFdIC0gaGVpZ2h0IC8gMixcbiAgICB3aWR0aDogd2lkdGgsXG4gICAgaGVpZ2h0OiBoZWlnaHQsXG4gICAgaHJlZjogYmFzZVVybCArIG5hbWUgKyAnLnN2ZydcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlck1hcmtlcihicnVzaDogRHJhd0JydXNoKTogU1ZHRWxlbWVudCB7XG4gIGNvbnN0IG1hcmtlciA9IHNldEF0dHJpYnV0ZXMoY3JlYXRlRWxlbWVudCgnbWFya2VyJyksIHtcbiAgICBpZDogJ2Fycm93aGVhZC0nICsgYnJ1c2gua2V5LFxuICAgIG9yaWVudDogJ2F1dG8nLFxuICAgIG1hcmtlcldpZHRoOiA0LFxuICAgIG1hcmtlckhlaWdodDogOCxcbiAgICByZWZYOiAyLjA1LFxuICAgIHJlZlk6IDIuMDFcbiAgfSk7XG4gIG1hcmtlci5hcHBlbmRDaGlsZChzZXRBdHRyaWJ1dGVzKGNyZWF0ZUVsZW1lbnQoJ3BhdGgnKSwge1xuICAgIGQ6ICdNMCwwIFY0IEwzLDIgWicsXG4gICAgZmlsbDogYnJ1c2guY29sb3JcbiAgfSkpO1xuICBtYXJrZXIuc2V0QXR0cmlidXRlKCdjZ0tleScsIGJydXNoLmtleSk7XG4gIHJldHVybiBtYXJrZXI7XG59XG5cbmZ1bmN0aW9uIHNldEF0dHJpYnV0ZXMoZWw6IFNWR0VsZW1lbnQsIGF0dHJzOiB7IFtrZXk6IHN0cmluZ106IGFueSB9KTogU1ZHRWxlbWVudCB7XG4gIGZvciAobGV0IGtleSBpbiBhdHRycykgZWwuc2V0QXR0cmlidXRlKGtleSwgYXR0cnNba2V5XSk7XG4gIHJldHVybiBlbDtcbn1cblxuZnVuY3Rpb24gb3JpZW50KHBvczogY2cuUG9zLCBjb2xvcjogY2cuQ29sb3IsIGJkOiBjZy5Cb2FyZERpbWVuc2lvbnMpOiBjZy5Qb3Mge1xuICByZXR1cm4gY29sb3IgPT09ICd3aGl0ZScgPyBwb3MgOiBbYmQud2lkdGggKyAxIC0gcG9zWzBdLCBiZC5oZWlnaHQgKyAxIC0gcG9zWzFdXTtcbn1cblxuZnVuY3Rpb24gbWFrZUN1c3RvbUJydXNoKGJhc2U6IERyYXdCcnVzaCwgbW9kaWZpZXJzOiBEcmF3TW9kaWZpZXJzKTogRHJhd0JydXNoIHtcbiAgY29uc3QgYnJ1c2g6IFBhcnRpYWw8RHJhd0JydXNoPiA9IHtcbiAgICBjb2xvcjogYmFzZS5jb2xvcixcbiAgICBvcGFjaXR5OiBNYXRoLnJvdW5kKGJhc2Uub3BhY2l0eSAqIDEwKSAvIDEwLFxuICAgIGxpbmVXaWR0aDogTWF0aC5yb3VuZChtb2RpZmllcnMubGluZVdpZHRoIHx8IGJhc2UubGluZVdpZHRoKVxuICB9O1xuICBicnVzaC5rZXkgPSBbYmFzZS5rZXksIG1vZGlmaWVycy5saW5lV2lkdGhdLmZpbHRlcih4ID0+IHgpLmpvaW4oJycpO1xuICByZXR1cm4gYnJ1c2ggYXMgRHJhd0JydXNoO1xufVxuXG5mdW5jdGlvbiBjaXJjbGVXaWR0aChib3VuZHM6IENsaWVudFJlY3QsIGJkOiBjZy5Cb2FyZERpbWVuc2lvbnMpOiBbbnVtYmVyLCBudW1iZXJdIHtcbiAgY29uc3QgYmFzZSA9IGJvdW5kcy53aWR0aCAvIChiZC53aWR0aCAqIDY0KTtcbiAgcmV0dXJuIFszICogYmFzZSwgNCAqIGJhc2VdO1xufVxuXG5mdW5jdGlvbiBsaW5lV2lkdGgoYnJ1c2g6IERyYXdCcnVzaCwgY3VycmVudDogYm9vbGVhbiwgYm91bmRzOiBDbGllbnRSZWN0LCBiZDogY2cuQm9hcmREaW1lbnNpb25zKTogbnVtYmVyIHtcbiAgcmV0dXJuIChicnVzaC5saW5lV2lkdGggfHwgMTApICogKGN1cnJlbnQgPyAwLjg1IDogMSkgLyAoYmQud2lkdGggKiA2NCkgKiBib3VuZHMud2lkdGg7XG59XG5cbmZ1bmN0aW9uIG9wYWNpdHkoYnJ1c2g6IERyYXdCcnVzaCwgY3VycmVudDogYm9vbGVhbik6IG51bWJlciB7XG4gIHJldHVybiAoYnJ1c2gub3BhY2l0eSB8fCAxKSAqIChjdXJyZW50ID8gMC45IDogMSk7XG59XG5cbmZ1bmN0aW9uIGFycm93TWFyZ2luKGJvdW5kczogQ2xpZW50UmVjdCwgc2hvcnRlbjogYm9vbGVhbiwgYmQ6IGNnLkJvYXJkRGltZW5zaW9ucyk6IG51bWJlciB7XG4gIHJldHVybiAoc2hvcnRlbiA/IDIwIDogMTApIC8gKGJkLndpZHRoICogNjQpICogYm91bmRzLndpZHRoO1xufVxuXG5mdW5jdGlvbiBwb3MycHgocG9zOiBjZy5Qb3MsIGJvdW5kczogQ2xpZW50UmVjdCwgYmQ6IGNnLkJvYXJkRGltZW5zaW9ucyk6IGNnLk51bWJlclBhaXIge1xuICByZXR1cm4gWyhwb3NbMF0gLSAwLjUpICogYm91bmRzLndpZHRoIC8gYmQud2lkdGgsIChiZC5oZWlnaHQgKyAwLjUgLSBwb3NbMV0pICogYm91bmRzLmhlaWdodCAvIGJkLmhlaWdodF07XG59XG4iLCJleHBvcnQgdHlwZSBWYXJpYW50ID0gJ2NoZXNzJyB8ICdtYWtydWsnIHwgJ2NhbWJvZGlhbicgfCAnc2l0dHV5aW4nIHwgJ3Nob2dpJyB8ICdtaW5pc2hvZ2knIHwgJ3hpYW5ncWknIHwgJ21pbml4aWFuZ3FpJyB8ICdjYXBhYmxhbmNhJyB8ICdzZWlyYXdhbicgfCAnY2FwYWhvdXNlJyB8ICdzaG91c2UnIHwgJ2dyYW5kJyB8ICdncmFuZGhvdXNlJyB8ICdnb3RoaWMnIHwgJ2dvdGhob3VzZScgfCAnc2hha28nIHwgdW5kZWZpbmVkO1xuZXhwb3J0IHR5cGUgQ29sb3IgPSAnd2hpdGUnIHwgJ2JsYWNrJztcbmV4cG9ydCB0eXBlIFJvbGUgPSAna2luZycgfCAncXVlZW4nIHwgJ3Jvb2snIHwgJ2Jpc2hvcCcgfCAna25pZ2h0JyB8ICdwYXduJyB8ICdjYW5jZWxsb3InIHwgJ2FyY2hiaXNob3AnIHwgJ2ZlcnonIHwgJ21ldCcgfCAnZ29sZCcgfCAnc2lsdmVyJyB8ICdsYW5jZSd8ICdwcGF3bicgfCAncGtuaWdodCcgfCAncGJpc2hvcCcgfCAncHJvb2snIHwgJ3BzaWx2ZXInIHwgJ3BsYW5jZScgfCAnYWR2aXNvcicgfCAnY2Fubm9uJyB8ICdoYXdrJyB8ICdlbGVwaGFudCc7XG5leHBvcnQgdHlwZSBLZXkgPSAgJ3owJyB8ICdhMCcgfCAnYjAnIHwgJ2MwJyB8ICdkMCcgfCAnZTAnIHwgJ2YwJyB8ICdnMCcgfCAnaDAnIHwgJ2kwJyB8ICdqMCcgfCAnYTEnIHwgJ2IxJyB8ICdjMScgfCAnZDEnIHwgJ2UxJyB8ICdmMScgfCAnZzEnIHwgJ2gxJyB8ICdpMScgfCAnajEnIHwgJ2EyJyB8ICdiMicgfCAnYzInIHwgJ2QyJyB8ICdlMicgfCAnZjInIHwgJ2cyJyB8ICdoMicgfCAnaTInIHwgJ2oyJyB8ICdhMycgfCAnYjMnIHwgJ2MzJyB8ICdkMycgfCAnZTMnIHwgJ2YzJyB8ICdnMycgfCAnaDMnIHwgJ2kzJyB8ICdqMycgfCAnYTQnIHwgJ2I0JyB8ICdjNCcgfCAnZDQnIHwgJ2U0JyB8ICdmNCcgfCAnZzQnIHwgJ2g0JyB8ICdpNCcgfCAnajQnIHwgJ2E1JyB8ICdiNScgfCAnYzUnIHwgJ2Q1JyB8ICdlNScgfCAnZjUnIHwgJ2c1JyB8ICdoNScgfCAnaTUnIHwgJ2o1JyB8ICdhNicgfCAnYjYnIHwgJ2M2JyB8ICdkNicgfCAnZTYnIHwgJ2Y2JyB8ICdnNicgfCAnaDYnIHwgJ2k2JyB8ICdqNicgfCAnYTcnIHwgJ2I3JyB8ICdjNycgfCAnZDcnIHwgJ2U3JyB8ICdmNycgfCAnZzcnIHwgJ2g3JyB8ICdpNycgfCAnajcnIHwgJ2E4JyB8ICdiOCcgfCAnYzgnIHwgJ2Q4JyB8ICdlOCcgfCAnZjgnIHwgJ2c4JyB8ICdoOCcgfCAnaTgnIHwgJ2o4JyB8ICdhOScgfCAnYjknIHwgJ2M5JyB8ICdkOScgfCAnZTknIHwgJ2Y5JyB8ICdnOScgfCAnaDknIHwgJ2k5JyB8ICdqOSc7XG5leHBvcnQgdHlwZSBGaWxlID0gJ2EnIHwgJ2InIHwgJ2MnIHwgJ2QnIHwgJ2UnIHwgJ2YnIHwgJ2cnIHwgJ2gnIHwgJ2knIHwgJ2onO1xuZXhwb3J0IHR5cGUgUmFuayA9ICcwJyB8ICcxJyB8ICcyJyB8ICczJyB8ICc0JyB8ICc1JyB8ICc2JyB8ICc3JyB8ICc4JyB8ICc5JyB8ICcxMCc7XG5leHBvcnQgdHlwZSBGRU4gPSBzdHJpbmc7XG5leHBvcnQgdHlwZSBQb3MgPSBbbnVtYmVyLCBudW1iZXJdO1xuZXhwb3J0IGludGVyZmFjZSBQaWVjZSB7XG4gIHJvbGU6IFJvbGU7XG4gIGNvbG9yOiBDb2xvcjtcbiAgcHJvbW90ZWQ/OiBib29sZWFuO1xufVxuZXhwb3J0IGludGVyZmFjZSBEcm9wIHtcbiAgcm9sZTogUm9sZTtcbiAga2V5OiBLZXk7XG59XG5leHBvcnQgaW50ZXJmYWNlIFBpZWNlcyB7XG4gIFtrZXk6IHN0cmluZ106IFBpZWNlIHwgdW5kZWZpbmVkO1xufVxuZXhwb3J0IGludGVyZmFjZSBQaWVjZXNEaWZmIHtcbiAgW2tleTogc3RyaW5nXTogUGllY2UgfCB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCB0eXBlIEtleVBhaXIgPSBbS2V5LCBLZXldO1xuXG5leHBvcnQgdHlwZSBOdW1iZXJQYWlyID0gW251bWJlciwgbnVtYmVyXTtcblxuZXhwb3J0IHR5cGUgTnVtYmVyUXVhZCA9IFtudW1iZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdO1xuXG5leHBvcnQgaW50ZXJmYWNlIERlc3RzIHtcbiAgW2tleTogc3RyaW5nXTogS2V5W11cbn1cblxuZXhwb3J0IGludGVyZmFjZSBFbGVtZW50cyB7XG4gIGJvYXJkOiBIVE1MRWxlbWVudDtcbiAgY29udGFpbmVyOiBIVE1MRWxlbWVudDtcbiAgZ2hvc3Q/OiBIVE1MRWxlbWVudDtcbiAgc3ZnPzogU1ZHRWxlbWVudDtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgRG9tIHtcbiAgZWxlbWVudHM6IEVsZW1lbnRzLFxuICBib3VuZHM6IE1lbW88Q2xpZW50UmVjdD47XG4gIHJlZHJhdzogKCkgPT4gdm9pZDtcbiAgcmVkcmF3Tm93OiAoc2tpcFN2Zz86IGJvb2xlYW4pID0+IHZvaWQ7XG4gIHVuYmluZD86IFVuYmluZDtcbiAgZGVzdHJveWVkPzogYm9vbGVhbjtcbiAgcmVsYXRpdmU/OiBib29sZWFuOyAvLyBkb24ndCBjb21wdXRlIGJvdW5kcywgdXNlIHJlbGF0aXZlICUgdG8gcGxhY2UgcGllY2VzXG59XG5leHBvcnQgaW50ZXJmYWNlIEV4cGxvZGluZyB7XG4gIHN0YWdlOiBudW1iZXI7XG4gIGtleXM6IEtleVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1vdmVNZXRhZGF0YSB7XG4gIHByZW1vdmU6IGJvb2xlYW47XG4gIGN0cmxLZXk/OiBib29sZWFuO1xuICBob2xkVGltZT86IG51bWJlcjtcbiAgY2FwdHVyZWQ/OiBQaWVjZTtcbiAgcHJlZHJvcD86IGJvb2xlYW47XG59XG5leHBvcnQgaW50ZXJmYWNlIFNldFByZW1vdmVNZXRhZGF0YSB7XG4gIGN0cmxLZXk/OiBib29sZWFuO1xufVxuXG5leHBvcnQgdHlwZSBXaW5kb3dFdmVudCA9ICdvbnNjcm9sbCcgfCAnb25yZXNpemUnO1xuXG5leHBvcnQgdHlwZSBNb3VjaEV2ZW50ID0gTW91c2VFdmVudCAmIFRvdWNoRXZlbnQ7XG5cbmV4cG9ydCBpbnRlcmZhY2UgS2V5ZWROb2RlIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBjZ0tleTogS2V5O1xufVxuZXhwb3J0IGludGVyZmFjZSBQaWVjZU5vZGUgZXh0ZW5kcyBLZXllZE5vZGUge1xuICBjZ1BpZWNlOiBzdHJpbmc7XG4gIGNnQW5pbWF0aW5nPzogYm9vbGVhbjtcbiAgY2dGYWRpbmc/OiBib29sZWFuO1xuICBjZ0RyYWdnaW5nPzogYm9vbGVhbjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgU3F1YXJlTm9kZSBleHRlbmRzIEtleWVkTm9kZSB7IH1cblxuZXhwb3J0IGludGVyZmFjZSBNZW1vPEE+IHsgKCk6IEE7IGNsZWFyOiAoKSA9PiB2b2lkOyB9XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGltZXIge1xuICBzdGFydDogKCkgPT4gdm9pZDtcbiAgY2FuY2VsOiAoKSA9PiB2b2lkO1xuICBzdG9wOiAoKSA9PiBudW1iZXI7XG59XG5cbmV4cG9ydCB0eXBlIFJlZHJhdyA9ICgpID0+IHZvaWQ7XG5leHBvcnQgdHlwZSBVbmJpbmQgPSAoKSA9PiB2b2lkO1xuZXhwb3J0IHR5cGUgTWlsbGlzZWNvbmRzID0gbnVtYmVyO1xuZXhwb3J0IHR5cGUgS0h6ID0gbnVtYmVyO1xuXG5leHBvcnQgY29uc3QgZmlsZXM6IEZpbGVbXSA9IFsnYScsICdiJywgJ2MnLCAnZCcsICdlJywgJ2YnLCAnZycsICdoJywgJ2knLCAnaiddO1xuZXhwb3J0IGNvbnN0IHJhbmtzOiBSYW5rW10gPSBbJzAnLCAnMScsICcyJywgJzMnLCAnNCcsICc1JywgJzYnLCAnNycsICc4JywgJzknLCAnMTAnXTtcblxuZXhwb3J0IGludGVyZmFjZSBCb2FyZERpbWVuc2lvbnMge1xuICB3aWR0aDogbnVtYmVyO1xuICBoZWlnaHQ6IG51bWJlcjtcbn1cblxuZXhwb3J0IGNvbnN0IGVudW0gR2VvbWV0cnkge2RpbTh4OCwgZGltOXg5LCBkaW0xMHg4LCBkaW05eDEwLCBkaW0xMHgxMCwgZGltNXg1LCBkaW03eDd9O1xuXG5leHBvcnQgY29uc3QgZGltZW5zaW9uczogQm9hcmREaW1lbnNpb25zW10gPSBbe3dpZHRoOiA4LCBoZWlnaHQ6IDh9LCB7d2lkdGg6IDksIGhlaWdodDogOX0sIHt3aWR0aDogMTAsIGhlaWdodDogOH0sIHt3aWR0aDogOSwgaGVpZ2h0OiAxMH0sIHt3aWR0aDogMTAsIGhlaWdodDogMTB9LCB7d2lkdGg6IDUsIGhlaWdodDogNX0sIHt3aWR0aDogNywgaGVpZ2h0OiA3fV07XG4iLCJpbXBvcnQgKiBhcyBjZyBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IGNvbnN0IGNvbG9yczogY2cuQ29sb3JbXSA9IFsnd2hpdGUnLCAnYmxhY2snXTtcblxuZXhwb3J0IGNvbnN0IE5SYW5rczogbnVtYmVyW10gPSBbMSwgMiwgMywgNCwgNSwgNiwgNywgOCwgOSwgMTBdO1xuZXhwb3J0IGNvbnN0IGludk5SYW5rczogbnVtYmVyW10gPSBbMTAsIDksIDgsIDcsIDYsIDUsIDQsIDMsIDIsIDFdO1xuXG5jb25zdCBmaWxlczUgPSBjZy5maWxlcy5zbGljZSgwLCA1KTtcbmNvbnN0IGZpbGVzNyA9IGNnLmZpbGVzLnNsaWNlKDAsIDcpO1xuY29uc3QgZmlsZXM4ID0gY2cuZmlsZXMuc2xpY2UoMCwgOCk7XG5jb25zdCBmaWxlczkgPSBjZy5maWxlcy5zbGljZSgwLCA5KTtcbmNvbnN0IGZpbGVzMTAgPSBjZy5maWxlcy5zbGljZSgwLCAxMCk7XG5cbmNvbnN0IHJhbmtzNSA9IGNnLnJhbmtzLnNsaWNlKDEsIDYpO1xuY29uc3QgcmFua3M3ID0gY2cucmFua3Muc2xpY2UoMSwgOCk7XG5jb25zdCByYW5rczggPSBjZy5yYW5rcy5zbGljZSgxLCA5KTtcbmNvbnN0IHJhbmtzOSA9IGNnLnJhbmtzLnNsaWNlKDEsIDEwKTtcbi8vIHdlIGhhdmUgdG8gY291bnQgcmFua3Mgc3RhcnRpbmcgZnJvbSAwIGFzIGluIFVDQ0lcbmNvbnN0IHJhbmtzMTAgPSBjZy5yYW5rcy5zbGljZSgwLCAxMCk7XG5cbmNvbnN0IGFsbEtleXM1eDU6IGNnLktleVtdID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdCguLi5maWxlczUubWFwKGMgPT4gcmFua3M1Lm1hcChyID0+IGMrcikpKTtcbmNvbnN0IGFsbEtleXM3eDc6IGNnLktleVtdID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdCguLi5maWxlczcubWFwKGMgPT4gcmFua3M3Lm1hcChyID0+IGMrcikpKTtcbmNvbnN0IGFsbEtleXM4eDg6IGNnLktleVtdID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdCguLi5maWxlczgubWFwKGMgPT4gcmFua3M4Lm1hcChyID0+IGMrcikpKTtcbmNvbnN0IGFsbEtleXM5eDk6IGNnLktleVtdID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdCguLi5maWxlczkubWFwKGMgPT4gcmFua3M5Lm1hcChyID0+IGMrcikpKTtcbmNvbnN0IGFsbEtleXMxMHg4OiBjZy5LZXlbXSA9IEFycmF5LnByb3RvdHlwZS5jb25jYXQoLi4uZmlsZXMxMC5tYXAoYyA9PiByYW5rczgubWFwKHIgPT4gYytyKSkpO1xuY29uc3QgYWxsS2V5czl4MTA6IGNnLktleVtdID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdCguLi5maWxlczkubWFwKGMgPT4gcmFua3MxMC5tYXAociA9PiBjK3IpKSk7XG5jb25zdCBhbGxLZXlzMTB4MTA6IGNnLktleVtdID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdCguLi5maWxlczEwLm1hcChjID0+IHJhbmtzMTAubWFwKHIgPT4gYytyKSkpO1xuXG5leHBvcnQgY29uc3QgYWxsS2V5cyA9IFthbGxLZXlzOHg4LCBhbGxLZXlzOXg5LCBhbGxLZXlzMTB4OCwgYWxsS2V5czl4MTAsIGFsbEtleXMxMHgxMCwgYWxsS2V5czV4NSwgYWxsS2V5czd4N107XG5cbmV4cG9ydCBmdW5jdGlvbiBwb3Mya2V5KHBvczogY2cuUG9zLCBnZW9tOiBjZy5HZW9tZXRyeSkge1xuICAgIGNvbnN0IGJkID0gY2cuZGltZW5zaW9uc1tnZW9tXTtcbiAgICByZXR1cm4gYWxsS2V5c1tnZW9tXVtiZC5oZWlnaHQgKiBwb3NbMF0gKyBwb3NbMV0gLSBiZC5oZWlnaHQgLSAxXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGtleTJwb3MoazogY2cuS2V5LCBmaXJzdFJhbmtJczA6IGJvb2xlYW4pIHtcbiAgY29uc3Qgc2hpZnQgPSBmaXJzdFJhbmtJczAgPyAxIDogMDtcbiAgcmV0dXJuIFtrLmNoYXJDb2RlQXQoMCkgLSA5Niwgay5jaGFyQ29kZUF0KDEpIC0gNDggKyBzaGlmdF0gYXMgY2cuUG9zO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWVtbzxBPihmOiAoKSA9PiBBKTogY2cuTWVtbzxBPiB7XG4gIGxldCB2OiBBIHwgdW5kZWZpbmVkO1xuICBjb25zdCByZXQ6IGFueSA9ICgpID0+IHtcbiAgICBpZiAodiA9PT0gdW5kZWZpbmVkKSB2ID0gZigpO1xuICAgIHJldHVybiB2O1xuICB9O1xuICByZXQuY2xlYXIgPSAoKSA9PiB7IHYgPSB1bmRlZmluZWQgfTtcbiAgcmV0dXJuIHJldDtcbn1cblxuZXhwb3J0IGNvbnN0IHRpbWVyOiAoKSA9PiBjZy5UaW1lciA9ICgpID0+IHtcbiAgbGV0IHN0YXJ0QXQ6IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgcmV0dXJuIHtcbiAgICBzdGFydCgpIHsgc3RhcnRBdCA9IHBlcmZvcm1hbmNlLm5vdygpIH0sXG4gICAgY2FuY2VsKCkgeyBzdGFydEF0ID0gdW5kZWZpbmVkIH0sXG4gICAgc3RvcCgpIHtcbiAgICAgIGlmICghc3RhcnRBdCkgcmV0dXJuIDA7XG4gICAgICBjb25zdCB0aW1lID0gcGVyZm9ybWFuY2Uubm93KCkgLSBzdGFydEF0O1xuICAgICAgc3RhcnRBdCA9IHVuZGVmaW5lZDtcbiAgICAgIHJldHVybiB0aW1lO1xuICAgIH1cbiAgfTtcbn1cblxuZXhwb3J0IGNvbnN0IG9wcG9zaXRlID0gKGM6IGNnLkNvbG9yKSA9PiBjID09PSAnd2hpdGUnID8gJ2JsYWNrJyA6ICd3aGl0ZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjb250YWluc1g8WD4oeHM6IFhbXSB8IHVuZGVmaW5lZCwgeDogWCk6IGJvb2xlYW4ge1xuICByZXR1cm4geHMgIT09IHVuZGVmaW5lZCAmJiB4cy5pbmRleE9mKHgpICE9PSAtMTtcbn1cblxuZXhwb3J0IGNvbnN0IGRpc3RhbmNlU3E6IChwb3MxOiBjZy5Qb3MsIHBvczI6IGNnLlBvcykgPT4gbnVtYmVyID0gKHBvczEsIHBvczIpID0+IHtcbiAgcmV0dXJuIE1hdGgucG93KHBvczFbMF0gLSBwb3MyWzBdLCAyKSArIE1hdGgucG93KHBvczFbMV0gLSBwb3MyWzFdLCAyKTtcbn1cblxuZXhwb3J0IGNvbnN0IHNhbWVQaWVjZTogKHAxOiBjZy5QaWVjZSwgcDI6IGNnLlBpZWNlKSA9PiBib29sZWFuID0gKHAxLCBwMikgPT5cbiAgcDEucm9sZSA9PT0gcDIucm9sZSAmJiBwMS5jb2xvciA9PT0gcDIuY29sb3I7XG5cbmNvbnN0IHBvc1RvVHJhbnNsYXRlQmFzZTogKHBvczogY2cuUG9zLCBhc1doaXRlOiBib29sZWFuLCB4RmFjdG9yOiBudW1iZXIsIHlGYWN0b3I6IG51bWJlciwgYnQ6IGNnLkJvYXJkRGltZW5zaW9ucykgPT4gY2cuTnVtYmVyUGFpciA9XG4ocG9zLCBhc1doaXRlLCB4RmFjdG9yLCB5RmFjdG9yLCBidCkgPT4gW1xuICAoYXNXaGl0ZSA/IHBvc1swXSAtIDEgOiBidC53aWR0aCAtIHBvc1swXSkgKiB4RmFjdG9yLFxuICAoYXNXaGl0ZSA/IGJ0LmhlaWdodCAtIHBvc1sxXSA6IHBvc1sxXSAtIDEpICogeUZhY3RvclxuXTtcblxuZXhwb3J0IGNvbnN0IHBvc1RvVHJhbnNsYXRlQWJzID0gKGJvdW5kczogQ2xpZW50UmVjdCwgYnQ6IGNnLkJvYXJkRGltZW5zaW9ucykgPT4ge1xuICBjb25zdCB4RmFjdG9yID0gYm91bmRzLndpZHRoIC8gYnQud2lkdGgsXG4gIHlGYWN0b3IgPSBib3VuZHMuaGVpZ2h0IC8gYnQuaGVpZ2h0O1xuICByZXR1cm4gKHBvczogY2cuUG9zLCBhc1doaXRlOiBib29sZWFuKSA9PiBwb3NUb1RyYW5zbGF0ZUJhc2UocG9zLCBhc1doaXRlLCB4RmFjdG9yLCB5RmFjdG9yLCBidCk7XG59O1xuXG5leHBvcnQgY29uc3QgcG9zVG9UcmFuc2xhdGVSZWw6IChwb3M6IGNnLlBvcywgYXNXaGl0ZTogYm9vbGVhbiwgYnQ6IGNnLkJvYXJkRGltZW5zaW9ucykgPT4gY2cuTnVtYmVyUGFpciA9XG4gIChwb3MsIGFzV2hpdGUsIGJ0KSA9PiBwb3NUb1RyYW5zbGF0ZUJhc2UocG9zLCBhc1doaXRlLCAxMDAgLyBidC53aWR0aCwgMTAwIC8gYnQuaGVpZ2h0LCBidCk7XG5cbmV4cG9ydCBjb25zdCB0cmFuc2xhdGVBYnMgPSAoZWw6IEhUTUxFbGVtZW50LCBwb3M6IGNnLlBvcykgPT4ge1xuICBlbC5zdHlsZS50cmFuc2Zvcm0gPSBgdHJhbnNsYXRlKCR7cG9zWzBdfXB4LCR7cG9zWzFdfXB4KWA7XG59XG5cbmV4cG9ydCBjb25zdCB0cmFuc2xhdGVSZWwgPSAoZWw6IEhUTUxFbGVtZW50LCBwZXJjZW50czogY2cuTnVtYmVyUGFpcikgPT4ge1xuICBlbC5zdHlsZS5sZWZ0ID0gcGVyY2VudHNbMF0gKyAnJSc7XG4gIGVsLnN0eWxlLnRvcCA9IHBlcmNlbnRzWzFdICsgJyUnO1xufVxuXG5leHBvcnQgY29uc3Qgc2V0VmlzaWJsZSA9IChlbDogSFRNTEVsZW1lbnQsIHY6IGJvb2xlYW4pID0+IHtcbiAgZWwuc3R5bGUudmlzaWJpbGl0eSA9IHYgPyAndmlzaWJsZScgOiAnaGlkZGVuJztcbn1cblxuLy8gdG91Y2hlbmQgaGFzIG5vIHBvc2l0aW9uIVxuZXhwb3J0IGNvbnN0IGV2ZW50UG9zaXRpb246IChlOiBjZy5Nb3VjaEV2ZW50KSA9PiBjZy5OdW1iZXJQYWlyIHwgdW5kZWZpbmVkID0gZSA9PiB7XG4gIGlmIChlLmNsaWVudFggfHwgZS5jbGllbnRYID09PSAwKSByZXR1cm4gW2UuY2xpZW50WCwgZS5jbGllbnRZXTtcbiAgaWYgKGUudG91Y2hlcyAmJiBlLnRhcmdldFRvdWNoZXNbMF0pIHJldHVybiBbZS50YXJnZXRUb3VjaGVzWzBdLmNsaWVudFgsIGUudGFyZ2V0VG91Y2hlc1swXS5jbGllbnRZXTtcbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGNvbnN0IGlzUmlnaHRCdXR0b24gPSAoZTogTW91c2VFdmVudCkgPT4gZS5idXR0b25zID09PSAyIHx8IGUuYnV0dG9uID09PSAyO1xuXG5leHBvcnQgY29uc3QgY3JlYXRlRWwgPSAodGFnTmFtZTogc3RyaW5nLCBjbGFzc05hbWU/OiBzdHJpbmcpID0+IHtcbiAgY29uc3QgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpO1xuICBpZiAoY2xhc3NOYW1lKSBlbC5jbGFzc05hbWUgPSBjbGFzc05hbWU7XG4gIHJldHVybiBlbDtcbn1cbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCB7IGNvbG9ycywgc2V0VmlzaWJsZSwgY3JlYXRlRWwgfSBmcm9tICcuL3V0aWwnXG5pbXBvcnQgeyBmaWxlcywgcmFua3MgfSBmcm9tICcuL3R5cGVzJ1xuaW1wb3J0IHsgY3JlYXRlRWxlbWVudCBhcyBjcmVhdGVTVkcgfSBmcm9tICcuL3N2ZydcbmltcG9ydCB7IEVsZW1lbnRzIH0gZnJvbSAnLi90eXBlcydcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gd3JhcChlbGVtZW50OiBIVE1MRWxlbWVudCwgczogU3RhdGUsIHJlbGF0aXZlOiBib29sZWFuKTogRWxlbWVudHMge1xuXG4gIC8vIC5jZy13cmFwIChlbGVtZW50IHBhc3NlZCB0byBDaGVzc2dyb3VuZClcbiAgLy8gICBjZy1oZWxwZXIgKDEyLjUlKVxuICAvLyAgICAgY2ctY29udGFpbmVyICg4MDAlKVxuICAvLyAgICAgICBjZy1ib2FyZFxuICAvLyAgICAgICBzdmdcbiAgLy8gICAgICAgY29vcmRzLnJhbmtzXG4gIC8vICAgICAgIGNvb3Jkcy5maWxlc1xuICAvLyAgICAgICBwaWVjZS5naG9zdFxuXG4gIGVsZW1lbnQuaW5uZXJIVE1MID0gJyc7XG5cbiAgLy8gZW5zdXJlIHRoZSBjZy13cmFwIGNsYXNzIGlzIHNldFxuICAvLyBzbyBib3VuZHMgY2FsY3VsYXRpb24gY2FuIHVzZSB0aGUgQ1NTIHdpZHRoL2hlaWdodCB2YWx1ZXNcbiAgLy8gYWRkIHRoYXQgY2xhc3MgeW91cnNlbGYgdG8gdGhlIGVsZW1lbnQgYmVmb3JlIGNhbGxpbmcgY2hlc3Nncm91bmRcbiAgLy8gZm9yIGEgc2xpZ2h0IHBlcmZvcm1hbmNlIGltcHJvdmVtZW50ISAoYXZvaWRzIHJlY29tcHV0aW5nIHN0eWxlKVxuICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2NnLXdyYXAnKTtcblxuICBjb2xvcnMuZm9yRWFjaChjID0+IGVsZW1lbnQuY2xhc3NMaXN0LnRvZ2dsZSgnb3JpZW50YXRpb24tJyArIGMsIHMub3JpZW50YXRpb24gPT09IGMpKTtcbiAgZWxlbWVudC5jbGFzc0xpc3QudG9nZ2xlKCdtYW5pcHVsYWJsZScsICFzLnZpZXdPbmx5KTtcblxuICBjb25zdCBoZWxwZXIgPSBjcmVhdGVFbCgnY2ctaGVscGVyJyk7XG4gIGVsZW1lbnQuYXBwZW5kQ2hpbGQoaGVscGVyKTtcbiAgY29uc3QgY29udGFpbmVyID0gY3JlYXRlRWwoJ2NnLWNvbnRhaW5lcicpO1xuICBoZWxwZXIuYXBwZW5kQ2hpbGQoY29udGFpbmVyKTtcblxuICBjb25zdCBleHRlbnNpb24gPSBjcmVhdGVFbCgnZXh0ZW5zaW9uJyk7XG4gIGNvbnRhaW5lci5hcHBlbmRDaGlsZChleHRlbnNpb24pO1xuICBjb25zdCBib2FyZCA9IGNyZWF0ZUVsKCdjZy1ib2FyZCcpO1xuICBjb250YWluZXIuYXBwZW5kQ2hpbGQoYm9hcmQpO1xuXG4gIGxldCBzdmc6IFNWR0VsZW1lbnQgfCB1bmRlZmluZWQ7XG4gIGlmIChzLmRyYXdhYmxlLnZpc2libGUgJiYgIXJlbGF0aXZlKSB7XG4gICAgc3ZnID0gY3JlYXRlU1ZHKCdzdmcnKTtcbiAgICBzdmcuYXBwZW5kQ2hpbGQoY3JlYXRlU1ZHKCdkZWZzJykpO1xuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChzdmcpO1xuICB9XG5cbiAgaWYgKHMuY29vcmRpbmF0ZXMpIHtcbiAgICBjb25zdCBvcmllbnRDbGFzcyA9IHMub3JpZW50YXRpb24gPT09ICdibGFjaycgPyAnIGJsYWNrJyA6ICcnO1xuICAgIGNvbnN0IGZpcnN0UmFua0lzMCA9IHMuZGltZW5zaW9ucy5oZWlnaHQgPT09IDEwO1xuICAgIGNvbnN0IHNoaWZ0ID0gZmlyc3RSYW5rSXMwID8gMCA6IDE7XG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHJlbmRlckNvb3JkcyhyYW5rcy5zbGljZShzaGlmdCwgcy5kaW1lbnNpb25zLmhlaWdodCArIHNoaWZ0KSwgJ3JhbmtzJyArIG9yaWVudENsYXNzKSk7XG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHJlbmRlckNvb3JkcyhmaWxlcy5zbGljZSgwLCBzLmRpbWVuc2lvbnMud2lkdGgpLCAnZmlsZXMnICsgb3JpZW50Q2xhc3MpKTtcbiAgfVxuXG4gIGxldCBnaG9zdDogSFRNTEVsZW1lbnQgfCB1bmRlZmluZWQ7XG4gIGlmIChzLmRyYWdnYWJsZS5zaG93R2hvc3QgJiYgIXJlbGF0aXZlKSB7XG4gICAgZ2hvc3QgPSBjcmVhdGVFbCgncGllY2UnLCAnZ2hvc3QnKTtcbiAgICBzZXRWaXNpYmxlKGdob3N0LCBmYWxzZSk7XG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGdob3N0KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYm9hcmQsXG4gICAgY29udGFpbmVyLFxuICAgIGdob3N0LFxuICAgIHN2Z1xuICB9O1xufVxuXG5mdW5jdGlvbiByZW5kZXJDb29yZHMoZWxlbXM6IGFueVtdLCBjbGFzc05hbWU6IHN0cmluZyk6IEhUTUxFbGVtZW50IHtcbiAgY29uc3QgZWwgPSBjcmVhdGVFbCgnY29vcmRzJywgY2xhc3NOYW1lKTtcbiAgbGV0IGY6IEhUTUxFbGVtZW50O1xuICBmb3IgKGxldCBpIGluIGVsZW1zKSB7XG4gICAgZiA9IGNyZWF0ZUVsKCdjb29yZCcpO1xuICAgIGYudGV4dENvbnRlbnQgPSBlbGVtc1tpXTtcbiAgICBlbC5hcHBlbmRDaGlsZChmKTtcbiAgfVxuICByZXR1cm4gZWw7XG59XG4iXX0=
