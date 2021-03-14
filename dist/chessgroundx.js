(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Chessground = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.render = exports.anim = void 0;
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
exports.start = void 0;
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
exports.whitePov = exports.getKeyAtDomPos = exports.stop = exports.cancelMove = exports.playPredrop = exports.playPremove = exports.isDraggable = exports.canMove = exports.unselect = exports.setSelected = exports.selectSquare = exports.dropNewPiece = exports.userMove = exports.baseNewPiece = exports.baseMove = exports.unsetPredrop = exports.unsetPremove = exports.setCheck = exports.setPieces = exports.reset = exports.toggleOrientation = exports.callUserFunction = void 0;
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
exports.Chessground = void 0;
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
exports.configure = void 0;
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
        const pieces = fen_1.read(config.fen, state.geometry);
        if (state.pieces['z0'] !== undefined)
            pieces['z0'] = state.pieces['z0'];
        state.pieces = pieces;
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
exports.cancel = exports.end = exports.move = exports.dragNewPiece = exports.pieceCloseTo = exports.start = void 0;
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
    s.draggable.current = {
        orig: key,
        origPos: util.key2pos('a0', false),
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
exports.clear = exports.cancel = exports.end = exports.move = exports.processDraw = exports.start = void 0;
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
exports.drop = exports.cancelDropMode = exports.setDropMode = void 0;
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
exports.bindDocument = exports.bindBoard = void 0;
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
exports.write = exports.read = exports.initial = void 0;
const util_1 = require("./util");
const cg = require("./types");
exports.initial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const rolesVariants = {
    p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', q: 'queen', k: 'king',
    m: 'met', f: 'ferz', s: 'silver', c: 'chancellor', a: 'archbishop',
    h: 'hawk', e: 'elephant', y: 'yurt', l: 'lancer', u: 'unicorn', d: 'dragon', o: 'cannon'
};
const rolesShogi = {
    p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', k: 'king', g: 'gold', s: 'silver', l: 'lance'
};
const rolesDobutsu = {
    c: 'chancellor', e: 'elephant', l: 'king', g: 'gold', h: 'hawk'
};
const rolesXiangqi = {
    p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', k: 'king', c: 'cannon', a: 'advisor', m: 'banner'
};
const lettersVariants = {
    pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', queen: 'q', king: 'k', met: 'm', ferz: 'f', silver: 's', chancellor: 'c', archbishop: 'a', hawk: 'h', elephant: 'e',
    ppawn: '+p', pknight: '+n', pbishop: '+b', prook: '+r', pferz: '+f', yurt: 'y', lancer: 'l',
    unicorn: 'u', dragon: 'd', cannon: 'o'
};
const lettersShogi = {
    pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', king: 'k', gold: 'g', silver: 's', lance: 'l',
    ppawn: '+p', pknight: '+n', pbishop: '+b', prook: '+r', psilver: '+s', plance: '+l'
};
const lettersDobutsu = {
    chancellor: 'c', elephant: 'e', king: 'l', gold: 'g', hawk: 'h',
    pchancellor: '+c'
};
const lettersXiangqi = {
    pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', king: 'k', cannon: 'c', advisor: 'a', banner: 'm'
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
    let roles = rolesVariants;
    switch (geom) {
        case 3:
        case 6:
            roles = rolesXiangqi;
            break;
        case 1:
        case 8:
        case 5:
            roles = rolesShogi;
            break;
        case 7:
            roles = rolesDobutsu;
            break;
    }
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
                const piece = pieces[util_1.pos2key([col, row], geom)];
                if (piece) {
                    piece.promoted = true;
                    if (piece.role == 'met')
                        piece.role = 'ferz';
                }
                ;
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
                        color: (c === role ? 'black' : 'white')
                    };
                    if (promoted) {
                        piece.role = 'p' + piece.role;
                        piece.promoted = true;
                        promoted = false;
                    }
                    ;
                    pieces[util_1.pos2key([col, row], geom)] = piece;
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
        case 7:
            letters = lettersDobutsu;
            break;
        case 5:
        case 8:
        case 1:
            letters = lettersShogi;
            break;
        default:
            letters = lettersVariants;
            break;
    }
    ;
    const bd = cg.dimensions[geom];
    return util_1.invNRanks.slice(-bd.height).map(y => util_1.NRanks.slice(0, bd.width).map(x => {
        const piece = pieces[util_1.pos2key([x, y], geom)];
        if (piece) {
            const letter = letters[piece.role] + ((piece.promoted && (letters[piece.role].charAt(0) !== '+')) ? '~' : '');
            return (piece.color === 'white') ? letter.toUpperCase() : letter;
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
const bPalace = [
    [4, 10], [5, 10], [6, 10],
    [4, 9], [5, 9], [6, 9],
    [4, 8], [5, 8], [6, 8],
];
const wPalace = [
    [4, 3], [5, 3], [6, 3],
    [4, 2], [5, 2], [6, 2],
    [4, 1], [5, 1], [6, 1],
];
const bPalace7 = [
    [3, 7], [4, 7], [5, 7],
    [3, 6], [4, 6], [5, 6],
    [3, 5], [4, 5], [5, 5],
];
const wPalace7 = [
    [3, 3], [4, 3], [5, 3],
    [3, 2], [4, 2], [5, 2],
    [3, 1], [4, 1], [5, 1],
];
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
const wazir = (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    const yd = diff(y1, y2);
    return (xd === 1 && yd === 0) || (xd === 0 && yd === 1);
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
const kniroo = (x1, y1, x2, y2) => {
    return knight(x1, y1, x2, y2) || rook(x1, y1, x2, y2);
};
const knibis = (x1, y1, x2, y2) => {
    return knight(x1, y1, x2, y2) || bishop(x1, y1, x2, y2);
};
function king(color, rookFiles, canCastle) {
    return (x1, y1, x2, y2) => (diff(x1, x2) < 2 && diff(y1, y2) < 2) || (canCastle && y1 === y2 && y1 === (color === 'white' ? 1 : 8) && ((x1 === 5 && ((util.containsX(rookFiles, 1) && x2 === 3) || (util.containsX(rookFiles, 8) && x2 === 7))) ||
        util.containsX(rookFiles, x2)));
}
const met = (x1, y1, x2, y2) => {
    return diff(x1, x2) === diff(y1, y2) && diff(x1, x2) === 1;
};
const archbishop = (x1, y1, x2, y2) => {
    return bishop(x1, y1, x2, y2) || knight(x1, y1, x2, y2);
};
const chancellor = (x1, y1, x2, y2) => {
    return rook(x1, y1, x2, y2) || knight(x1, y1, x2, y2);
};
const centaur = (x1, y1, x2, y2) => {
    return sking(x1, y1, x2, y2) || knight(x1, y1, x2, y2);
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
function xbishop(color) {
    return (x1, y1, x2, y2) => (diff(x1, x2) === diff(y1, y2) && diff(x1, x2) === 2 && (color === 'white' ? y2 < 6 : y2 > 5));
}
function xadvisor(color, geom) {
    const palace = (color == 'white') ? ((geom === 6) ? wPalace7 : wPalace) : ((geom === 6) ? bPalace7 : bPalace);
    return (x1, y1, x2, y2) => (diff(x1, x2) === diff(y1, y2) && diff(x1, x2) === 1 && palace.some(point => (point[0] === x2 && point[1] === y2)));
}
function xking(color, geom) {
    const palace = (color == 'white') ? ((geom === 6) ? wPalace7 : wPalace) : ((geom === 6) ? bPalace7 : bPalace);
    return (x1, y1, x2, y2) => (((x1 === x2 && diff(y1, y2) === 1) || (y1 === y2 && diff(x1, x2) === 1)) && palace.some(point => (point[0] === x2 && point[1] === y2)));
}
const shakoElephant = (x1, y1, x2, y2) => {
    return diff(x1, x2) === diff(y1, y2) && (diff(x1, x2) === 1 || diff(x1, x2) === 2);
};
const jbishop = (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    const yd = diff(y1, y2);
    return (xd === 2 && yd === 3) || (xd === 3 && yd === 2);
};
function jpawn(color) {
    return (x1, y1, x2, y2) => ((x2 === x1 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1)) ||
        (y2 === y1 && (x2 === x1 + 1 || x2 === x1 - 1)));
}
function jking(color) {
    const palace = (color == 'white') ? wPalace : bPalace;
    return (x1, y1, x2, y2) => (diff(x1, x2) < 2 && diff(y1, y2) < 2 && palace.some(point => (point[0] === x2 && point[1] === y2)));
}
const leopard = (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    const yd = diff(y1, y2);
    return ((xd === 1 || xd === 2)
        && (yd === 1 || yd === 2));
};
const mhawk = (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    const yd = diff(y1, y2);
    return ((xd === 0 && (yd === 2 || yd === 3))
        || (yd === 0 && (xd === 2 || xd === 3))
        || (xd === yd && (xd === 2 || xd === 3)));
};
const melephant = (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    const yd = diff(y1, y2);
    return (xd === 1 || yd === 1
        || (xd === 2 && (yd === 0 || yd === 2))
        || (xd === 0 && yd === 2));
};
const mcannon = (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    const yd = diff(y1, y2);
    return ((xd < 3)
        && ((yd < 2) || (yd === 2 && xd === 0)));
};
const unicorn = (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    const yd = diff(y1, y2);
    return knight(x1, y1, x2, y2) || (xd === 1 && yd === 3) || (xd === 3 && yd === 1);
};
const dragon = (x1, y1, x2, y2) => {
    return knight(x1, y1, x2, y2) || queen(x1, y1, x2, y2);
};
const fortress = (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    const yd = diff(y1, y2);
    return ((xd === yd && xd < 4)
        || (yd === 0 && xd === 2)
        || (yd === 2 && xd < 2));
};
const spider = (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    const yd = diff(y1, y2);
    return (xd < 3 && yd < 3
        && !(xd === 1 && yd === 0)
        && !(xd === 0 && yd === 1));
};
function rookFilesOf(pieces, color, firstRankIs0) {
    const backrank = color == 'white' ? '1' : '8';
    return Object.keys(pieces).filter(key => {
        const piece = pieces[key];
        return key[1] === backrank && piece && piece.color === color && piece.role === 'rook';
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
                    if (variant === 'janggi' || geom === 6) {
                        mobility = jpawn(piece.color);
                    }
                    else {
                        mobility = xpawn(piece.color);
                    }
                    break;
                case 'banner':
                    mobility = kniroo;
                    break;
                case 'cannon':
                case 'rook':
                    mobility = rook;
                    break;
                case 'knight':
                    mobility = knight;
                    break;
                case 'bishop':
                    if (variant === 'janggi') {
                        mobility = jbishop;
                    }
                    else {
                        mobility = xbishop(piece.color);
                    }
                    break;
                case 'advisor':
                    if (variant === 'janggi') {
                        mobility = jking(piece.color);
                    }
                    else {
                        mobility = xadvisor(piece.color, geom);
                    }
                    break;
                case 'king':
                    if (variant === 'janggi') {
                        mobility = jking(piece.color);
                    }
                    else {
                        mobility = xking(piece.color, geom);
                    }
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
        case 7:
            switch (piece.role) {
                case 'chancellor':
                    mobility = spawn(piece.color);
                    break;
                case 'elephant':
                    mobility = met;
                    break;
                case 'gold':
                    mobility = wazir;
                    break;
                case 'king':
                    mobility = sking;
                    break;
                case 'pchancellor':
                    mobility = gold(piece.color);
                    break;
            }
            break;
        default:
            switch (piece.role) {
                case 'pawn':
                    mobility = pawn(piece.color);
                    break;
                case 'knight':
                    mobility = knight;
                    break;
                case 'pknight':
                    mobility = centaur;
                    break;
                case 'bishop':
                    mobility = bishop;
                    break;
                case 'rook':
                    mobility = rook;
                    break;
                case 'pferz':
                case 'queen':
                    mobility = queen;
                    break;
                case 'ppawn':
                    mobility = sking;
                    break;
                case 'king':
                    if (variant === 'synochess' && piece.color === 'black') {
                        mobility = sking;
                    }
                    else {
                        mobility = king(piece.color, rookFilesOf(pieces, piece.color, firstRankIs0), canCastle);
                    }
                    break;
                case 'hawk':
                    if (variant === 'orda') {
                        mobility = centaur;
                    }
                    else if (variant === 'musketeer') {
                        mobility = mhawk;
                    }
                    else {
                        mobility = archbishop;
                    }
                    break;
                case 'pbishop':
                case 'archbishop':
                    switch (variant) {
                        case 'orda':
                            mobility = knibis;
                            break;
                        case 'synochess':
                            mobility = sking;
                            break;
                        default:
                            mobility = archbishop;
                    }
                    break;
                case 'lancer':
                    if (variant === 'musketeer') {
                        mobility = leopard;
                    }
                    else {
                        mobility = kniroo;
                    }
                    break;
                case 'elephant':
                    if (variant === 'shako' || variant === 'synochess') {
                        mobility = shakoElephant;
                    }
                    else if (variant === 'musketeer') {
                        mobility = melephant;
                    }
                    else {
                        mobility = chancellor;
                    }
                    break;
                case 'prook':
                case 'chancellor':
                    if (variant === 'shako' || variant === 'synochess') {
                        mobility = rook;
                    }
                    else {
                        mobility = chancellor;
                    }
                    break;
                case 'met':
                case 'ferz':
                    if (variant === 'musketeer') {
                        mobility = fortress;
                    }
                    else
                        mobility = met;
                    break;
                case 'yurt':
                case 'silver':
                    if (variant === 'synochess') {
                        mobility = jpawn(piece.color);
                    }
                    else if (variant === 'musketeer') {
                        mobility = spider;
                    }
                    else {
                        mobility = silver(piece.color);
                    }
                    break;
                case 'cannon':
                    mobility = mcannon;
                    break;
                case 'unicorn':
                    mobility = unicorn;
                    break;
                case 'dragon':
                    mobility = dragon;
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
exports.defaults = void 0;
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
        notation: 0,
    };
}
exports.defaults = defaults;

},{"./fen":11,"./util":18}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderSvg = exports.createElement = void 0;
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
    const o = pos2px(pos, bounds, bd), width = bounds.width / bd.width * (piece.scale || 1), height = bounds.height / bd.height * (piece.scale || 1), name = piece.color[0] + (piece.role === 'knight' ? 'n' : piece.role[0]).toUpperCase();
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
exports.shogiVariants = exports.dimensions = exports.ranks = exports.files = void 0;
exports.files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
exports.ranks = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
;
;
exports.dimensions = [{ width: 8, height: 8 }, { width: 9, height: 9 }, { width: 10, height: 8 }, { width: 9, height: 10 }, { width: 10, height: 10 }, { width: 5, height: 5 }, { width: 7, height: 7 }, { width: 3, height: 4 }, { width: 5, height: 6 }];
exports.shogiVariants = ['shogi', 'minishogi', 'kyotoshogi', 'dobutsu', 'gorogoro'];

},{}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEl = exports.isRightButton = exports.eventPosition = exports.setVisible = exports.translateRel = exports.translateAbs = exports.posToTranslateRel = exports.posToTranslateAbs = exports.samePiece = exports.distanceSq = exports.containsX = exports.opposite = exports.timer = exports.memo = exports.key2pos = exports.pos2key = exports.allKeys = exports.invNRanks = exports.NRanks = exports.colors = void 0;
const cg = require("./types");
exports.colors = ['white', 'black'];
exports.NRanks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
exports.invNRanks = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const files3 = cg.files.slice(0, 3);
const files5 = cg.files.slice(0, 5);
const files7 = cg.files.slice(0, 7);
const files8 = cg.files.slice(0, 8);
const files9 = cg.files.slice(0, 9);
const files10 = cg.files.slice(0, 10);
const ranks4 = cg.ranks.slice(1, 5);
const ranks5 = cg.ranks.slice(1, 6);
const ranks6 = cg.ranks.slice(1, 7);
const ranks7 = cg.ranks.slice(1, 8);
const ranks8 = cg.ranks.slice(1, 9);
const ranks9 = cg.ranks.slice(1, 10);
const ranks10 = cg.ranks.slice(0, 10);
const allKeys3x4 = Array.prototype.concat(...files3.map(c => ranks4.map(r => c + r)));
const allKeys5x5 = Array.prototype.concat(...files5.map(c => ranks5.map(r => c + r)));
const allKeys5x6 = Array.prototype.concat(...files5.map(c => ranks6.map(r => c + r)));
const allKeys7x7 = Array.prototype.concat(...files7.map(c => ranks7.map(r => c + r)));
const allKeys8x8 = Array.prototype.concat(...files8.map(c => ranks8.map(r => c + r)));
const allKeys9x9 = Array.prototype.concat(...files9.map(c => ranks9.map(r => c + r)));
const allKeys10x8 = Array.prototype.concat(...files10.map(c => ranks8.map(r => c + r)));
const allKeys9x10 = Array.prototype.concat(...files9.map(c => ranks10.map(r => c + r)));
const allKeys10x10 = Array.prototype.concat(...files10.map(c => ranks10.map(r => c + r)));
exports.allKeys = [allKeys8x8, allKeys9x9, allKeys10x8, allKeys9x10, allKeys10x10, allKeys5x5, allKeys7x7, allKeys3x4, allKeys5x6];
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
    el.style.transform = `translate(${percents[0]}%,${percents[1]}%)`;
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
        const shogi = (types_1.shogiVariants.includes(s.variant));
        if (shogi) {
            container.appendChild(renderCoords(types_1.ranks.slice(1, s.dimensions.height + 1).reverse(), 'files' + orientClass));
            container.appendChild(renderCoords(types_1.ranks.slice(1, s.dimensions.width + 1).reverse(), 'ranks' + orientClass));
        }
        else if (s.notation === 6) {
            container.appendChild(renderCoords((['0']).concat(types_1.ranks.slice(1, 10).reverse()), 'ranks' + orientClass));
            container.appendChild(renderCoords(types_1.ranks.slice(1, 10), 'files' + orientClass));
        }
        else {
            container.appendChild(renderCoords(types_1.ranks.slice(1, s.dimensions.height + 1), 'ranks' + orientClass));
            container.appendChild(renderCoords(types_1.files.slice(0, s.dimensions.width), 'files' + orientClass));
        }
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYW5pbS50cyIsInNyYy9hcGkudHMiLCJzcmMvYm9hcmQudHMiLCJzcmMvY2hlc3Nncm91bmQudHMiLCJzcmMvY29uZmlnLnRzIiwic3JjL2RyYWcudHMiLCJzcmMvZHJhdy50cyIsInNyYy9kcm9wLnRzIiwic3JjL2V2ZW50cy50cyIsInNyYy9leHBsb3Npb24udHMiLCJzcmMvZmVuLnRzIiwic3JjL2luZGV4LmpzIiwic3JjL3ByZW1vdmUudHMiLCJzcmMvcmVuZGVyLnRzIiwic3JjL3N0YXRlLnRzIiwic3JjL3N2Zy50cyIsInNyYy90eXBlcy50cyIsInNyYy91dGlsLnRzIiwic3JjL3dyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7QUNDQSwrQkFBOEI7QUE0QjlCLFNBQWdCLElBQUksQ0FBSSxRQUFxQixFQUFFLEtBQVk7SUFDekQsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUN0RixDQUFDO0FBRkQsb0JBRUM7QUFFRCxTQUFnQixNQUFNLENBQUksUUFBcUIsRUFBRSxLQUFZO0lBQzNELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMvQixLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ25CLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFKRCx3QkFJQztBQVdELFNBQVMsU0FBUyxDQUFDLEdBQVcsRUFBRSxLQUFlLEVBQUUsWUFBcUI7SUFDcEUsT0FBTztRQUNMLEdBQUcsRUFBRSxHQUFHO1FBQ1IsR0FBRyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQztRQUNwQyxLQUFLLEVB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QUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3RCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztDQUN6QixDQUFDO0FBQ0YsTUFBTSxRQUFRLEdBQUc7SUFDYixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDdEIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3RCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztDQUN6QixDQUFDO0FBRUYsU0FBUyxJQUFJLENBQUMsQ0FBUyxFQUFFLENBQVE7SUFDL0IsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN6QixDQUFDO0FBRUQsU0FBUyxJQUFJLENBQUMsS0FBZTtJQUMzQixPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUM3QyxLQUFLLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUVsQixFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FDM0QsQ0FBQyxDQUFDLENBQUMsQ0FDRixFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FDM0QsQ0FDRixDQUFDO0FBQ0osQ0FBQztBQUVELE1BQU0sTUFBTSxHQUFhLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7SUFDMUMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN4QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3hCLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQzFELENBQUMsQ0FBQTtBQUVELE1BQU0sS0FBSyxHQUFhLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7SUFDekMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN4QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3hCLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQzFELENBQUMsQ0FBQTtBQUVELE1BQU0sTUFBTSxHQUFhLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7SUFDMUMsT0FBTyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFBO0FBRUQsTUFBTSxJQUFJLEdBQWEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtJQUN4QyxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQztBQUNoQyxDQUFDLENBQUE7QUFFRCxNQUFNLEtBQUssR0FBYSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0lBQ3pDLE9BQU8sTUFBTSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUN4RCxDQUFDLENBQUE7QUFFRCxNQUFNLE1BQU0sR0FBYSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0lBQzFDLE9BQU8sTUFBTSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUN4RCxDQUFDLENBQUE7QUFFRCxNQUFNLE1BQU0sR0FBYSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0lBQzFDLE9BQU8sTUFBTSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUMxRCxDQUFDLENBQUE7QUFFRCxTQUFTLElBQUksQ0FBQyxLQUFlLEVBQUUsU0FBbUIsRUFBRSxTQUFrQjtJQUNwRSxPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFHLEVBQUUsQ0FBQyxDQUMxQixJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FDckMsSUFBSSxDQUNILFNBQVMsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLEtBQUssS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDOUQsQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4RyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FDOUIsQ0FDRixDQUFDO0FBQ0osQ0FBQztBQUdELE1BQU0sR0FBRyxHQUFhLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7SUFDdkMsT0FBTyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDN0QsQ0FBQyxDQUFBO0FBR0QsTUFBTSxVQUFVLEdBQWEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtJQUM5QyxPQUFPLE1BQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxNQUFNLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDMUQsQ0FBQyxDQUFBO0FBR0QsTUFBTSxVQUFVLEdBQWEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUs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QUFLLE9BQU8sQ0FBQyxDQUFDO1FBQzVDLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN2RSxDQUFDO0FBR0QsTUFBTSxLQUFLLEdBQWEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtJQUN6QyxPQUFPLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDeEUsQ0FBQyxDQUFBO0FBR0QsTUFBTSxPQUFPLEdBQWEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtJQUMzQyxPQUFPLE1BQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDMUUsQ0FBQyxDQUFBO0FBR0QsTUFBTSxLQUFLLEdBQWEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtJQUN6QyxPQUFPLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzlDLENBQUMsQ0FBQTtBQUdELFNBQVMsS0FBSyxDQUFDLEtBQWU7SUFDNUIsT0FBTyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FDekIsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDbEUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUN2RixDQUFDO0FBQ04sQ0FBQztBQUdELFNBQVMsT0FBTyxDQUFDLEtBQWU7SUFDOUIsT0FBTyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FDekIsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUMzRixDQUFDO0FBQ04sQ0FBQztBQUdELFNBQVMsUUFBUSxDQUFDLEtBQWUsRUFBRSxJQUFpQjtJQUNoRCxNQUFNLE1BQU0sR0FBRyxDQUFDLEtBQUssSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUEsT0FBTyxDQUFDLENBQUM7SUFDL0ksT0FBTyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FDdkIsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQ3BILENBQUM7QUFDTixDQUFDO0FBR0QsU0FBUyxLQUFLLENBQUMsS0FBZSxFQUFFLElBQWlCO0lBQzdDLE1BQU0sTUFBTSxHQUFHLENBQUMsS0FBSyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQXVCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQSxPQUFPLENBQUMsQ0FBQztJQUMvSSxPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUN2QixDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FDekksQ0FBQztBQUNOLENBQUM7QUFHRCxNQUFNLGFBQWEsR0FBYSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0lBQ2pELE9BQU8sSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUNyRixDQUFDLENBQUE7QUFHRCxNQUFNLE9BQU8sR0FBYSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0lBQzNDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDeEIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN4QixPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUMxRCxDQUFDLENBQUE7QUFHRCxTQUFTLEtBQUssQ0FBQyxLQUFlO0lBQzVCLE9BQU8sQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQ3pCLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FDOUMsQ0FBQztBQUNOLENBQUM7QUFHRCxTQUFTLEtBQUssQ0FBQyxLQUFlO0lBQzFCLE1BQU0sTUFBTSxHQUFHLENBQUMsS0FBSyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUN2RCxPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUN2QixJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUNyRyxDQUFDO0FBQ04sQ0FBQztBQUdELE1BQU0sT0FBTyxHQUFhLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7SUFDM0MsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxD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Z0IsRUFBRSxFQUFzQjtJQUMvRSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO0FBQzlELENBQUM7QUFFRCxTQUFTLE1BQU0sQ0FBQyxHQUFXLEVBQUUsTUFBa0IsRUFBRSxFQUFzQjtJQUNyRSxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDNUcsQ0FBQzs7Ozs7O0FDbEtZLFFBQUEsS0FBSyxHQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDbkUsUUFBQSxLQUFLLEdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFPaUIsQ0FBQztBQUNhLENBQUM7QUFFekcsUUFBQSxVQUFVLEdBQXNCLENBQUMsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUMsRUFBRSxFQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBQyxFQUFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFDLEVBQUUsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUMsRUFBRSxFQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBQyxFQUFFLEVBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFDLEVBQUUsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUMsRUFBRSxFQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBQyxFQUFFLEVBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQztBQUVwUCxRQUFBLGFBQWEsR0FBYyxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQzs7Ozs7O0FDMUduRyw4QkFBOEI7QUFFakIsUUFBQSxNQUFNLEdBQWUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFFeEMsUUFBQSxNQUFNLEdBQWEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUNuRCxRQUFBLFNBQVMsR0FBYSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBRW5FLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNwQyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDcEMsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNwQyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDcEMsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBRXRDLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNwQyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDcEMsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNwQyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDcEMsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBRXJDLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUV0QyxNQUFNLFVBQVUsR0FBYSxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5RixNQUFNLFVBQVUsR0FBYSxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5RixNQUFNLFVBQVUsR0FBYSxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5RixNQUFNLFVBQVUsR0FBYSxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5RixNQUFNLFVBQVUsR0FBYSxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5RixNQUFNLFVBQVUsR0FBYSxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5RixNQUFNLFdBQVcsR0FBYSxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRyxNQUFNLFdBQVcsR0FBYSxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRyxNQUFNLFlBQVksR0FBYSxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUVyRixRQUFBLE9BQU8sR0FBRyxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFFeEksU0FBZ0IsT0FBTyxDQUFDLEdBQVcsRUFBRSxJQUFpQjtJQUNsRCxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLE9BQU8sZUFBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3RFLENBQUM7QUFIRCwwQkFHQztBQUVELFNBQWdCLE9BQU8sQ0FBQyxDQUFTLEVBQUUsWUFBcUI7SUFDdEQsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFXLENBQUM7QUFDeEUsQ0FBQztBQUhELDBCQUdDO0FBRUQsU0FBZ0IsSUFBSSxDQUFJLENBQVU7SUFDaEMsSUFBSSxDQUFnQixDQUFDO0lBQ3JCLE1BQU0sR0FBRyxHQUFRLEdBQUcsRUFBRTtRQUNwQixJQUFJLENBQUMsS0FBSyxTQUFTO1lBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzdCLE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQyxDQUFDO0lBQ0YsR0FBRyxDQUFDLEtBQUssR0FBRyxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFBLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQVJELG9CQVFDO0FBRVksUUFBQSxLQUFLLEdBQW1CLEdBQUcsRUFBRTtJQUN4QyxJQUFJLE9BQTJCLENBQUM7SUFDaEMsT0FBTztRQUNMLEtBQUssS0FBSyxPQUFPLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFBLENBQUMsQ0FBQztRQUN2QyxNQUFNLEtBQUssT0FBTyxHQUFHLFNBQVMsQ0FBQSxDQUFDLENBQUM7UUFDaEMsSUFBSTtZQUNGLElBQUksQ0FBQyxPQUFPO2dCQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3ZCLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxPQUFPLENBQUM7WUFDekMsT0FBTyxHQUFHLFNBQVMsQ0FBQztZQUNwQixPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7S0FDRixDQUFDO0FBQ0osQ0FBQyxDQUFBO0FBRVksUUFBQSxRQUFRLEdBQUcsQ0FBQyxDQUFXLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBRTNFLFNBQWdCLFNBQVMsQ0FBSSxFQUFtQixFQUFFLENBQUk7SUFDcEQsT0FBTyxFQUFFLEtBQUssU0FBUyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDbEQsQ0FBQztBQUZELDhCQUVDO0FBRVksUUFBQSxVQUFVLEdBQTJDLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFO0lBQy9FLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN6RSxDQUFDLENBQUE7QUFFWSxRQUFBLFNBQVMsR0FBNEMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FDM0UsRUFBRSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDLEtBQUssQ0FBQztBQUUvQyxNQUFNLGtCQUFrQixHQUN4QixDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO0lBQ3RDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU87SUFDcEQsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTztDQUN0RCxDQUFDO0FBRVcsUUFBQSxpQkFBaUIsR0FBRyxDQUFDLE1BQWtCLEVBQUUsRUFBc0IsRUFBRSxFQUFFO0lBQzlFLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFDdkMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQztJQUNwQyxPQUFPLENBQUMsR0FBVyxFQUFFLE9BQWdCLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztBQUNuRyxDQUFDLENBQUM7QUFFVyxRQUFBLGlCQUFpQixHQUM1QixDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEdBQUcsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBRWpGLFFBQUEsWUFBWSxHQUFHLENBQUMsRUFBZSxFQUFFLEdBQWtCLEVBQUUsRUFBRTtJQUNsRSxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUM1RCxDQUFDLENBQUE7QUFFWSxRQUFBLFlBQVksR0FBRyxDQUFDLEVBQWUsRUFBRSxRQUF1QixFQUFFLEVBQUU7SUFDdkUsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsYUFBYSxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDcEUsQ0FBQyxDQUFBO0FBRVksUUFBQSxVQUFVLEdBQUcsQ0FBQyxFQUFlLEVBQUUsQ0FBVSxFQUFFLEVBQUU7SUFDeEQsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUNqRCxDQUFDLENBQUE7QUFHWSxRQUFBLGFBQWEsR0FBb0QsQ0FBQyxDQUFDLEVBQUU7SUFDaEYsSUFBSSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQztRQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNoRSxJQUFJLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNyRyxPQUFPLFNBQVMsQ0FBQztBQUNuQixDQUFDLENBQUE7QUFFWSxRQUFBLGFBQWEsR0FBRyxDQUFDLENBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUM7QUFFckUsUUFBQSxRQUFRLEdBQUcsQ0FBQyxPQUFlLEVBQUUsU0FBa0IsRUFBRSxFQUFFO0lBQzlELE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDM0MsSUFBSSxTQUFTO1FBQUUsRUFBRSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFDeEMsT0FBTyxFQUFFLENBQUM7QUFDWixDQUFDLENBQUE7Ozs7O0FDekhELGlDQUFxRDtBQUNyRCxtQ0FBeUU7QUFDekUsK0JBQWtEO0FBRWxELFNBQXdCLElBQUksQ0FBQyxPQUFvQixFQUFFLENBQVEsRUFBRSxRQUFpQjtJQVc1RSxPQUFPLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztJQU12QixPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUVqQyxhQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsY0FBYyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkYsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBRXJELE1BQU0sTUFBTSxHQUFHLGVBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNyQyxPQUFPLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzVCLE1BQU0sU0FBUyxHQUFHLGVBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBRTlCLE1BQU0sU0FBUyxHQUFHLGVBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN4QyxTQUFTLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2pDLE1BQU0sS0FBSyxHQUFHLGVBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNuQyxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRTdCLElBQUksR0FBMkIsQ0FBQztJQUNoQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ25DLEdBQUcsR0FBRyxtQkFBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3ZCLEdBQUcsQ0FBQyxXQUFXLENBQUMsbUJBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ25DLFNBQVMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDNUI7SUFFRCxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUU7UUFDakIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLFdBQVcsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQzlELE1BQU0sS0FBSyxHQUFHLENBQUMscUJBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDbEQsSUFBSSxLQUFLLEVBQUU7WUFDUCxTQUFTLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxhQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUM5RyxTQUFTLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxhQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQztTQUNoSDthQUFNLElBQUksQ0FBQyxDQUFDLFFBQVEsTUFBb0IsRUFBRTtZQUN2QyxTQUFTLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxPQUFPLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUN6RyxTQUFTLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxhQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxPQUFPLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQztTQUNsRjthQUFNO1lBQ0gsU0FBUyxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsYUFBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsT0FBTyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDcEcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsYUFBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRSxPQUFPLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQztTQUNsRztLQUNGO0lBRUQsSUFBSSxLQUE4QixDQUFDO0lBQ25DLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLElBQUksQ0FBQyxRQUFRLEVBQUU7UUFDdEMsS0FBSyxHQUFHLGVBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbkMsaUJBQVUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekIsU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUM5QjtJQUVELE9BQU87UUFDTCxLQUFLO1FBQ0wsU0FBUztRQUNULEtBQUs7UUFDTCxHQUFHO0tBQ0osQ0FBQztBQUNKLENBQUM7QUFuRUQsdUJBbUVDO0FBRUQsU0FBUyxZQUFZLENBQUMsS0FBWSxFQUFFLFNBQWlCO0lBQ25ELE1BQU0sRUFBRSxHQUFHLGVBQVEsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDekMsSUFBSSxDQUFjLENBQUM7SUFDbkIsS0FBSyxJQUFJLENBQUMsSUFBSSxLQUFLLEVBQUU7UUFDbkIsQ0FBQyxHQUFHLGVBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN0QixDQUFDLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6QixFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ25CO0lBQ0QsT0FBTyxFQUFFLENBQUM7QUFDWixDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJ1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWwnXG5pbXBvcnQgKiBhcyBjZyBmcm9tICcuL3R5cGVzJ1xuXG5leHBvcnQgdHlwZSBNdXRhdGlvbjxBPiA9IChzdGF0ZTogU3RhdGUpID0+IEE7XG5cbi8vIDAsMSBhbmltYXRpb24gZ29hbFxuLy8gMiwzIGFuaW1hdGlvbiBjdXJyZW50IHN0YXR1c1xuZXhwb3J0IHR5cGUgQW5pbVZlY3RvciA9IGNnLk51bWJlclF1YWRcblxuZXhwb3J0IGludGVyZmFjZSBBbmltVmVjdG9ycyB7XG4gIFtrZXk6IHN0cmluZ106IEFuaW1WZWN0b3Jcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBbmltRmFkaW5ncyB7XG4gIFtrZXk6IHN0cmluZ106IGNnLlBpZWNlXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5pbVBsYW4ge1xuICBhbmltczogQW5pbVZlY3RvcnM7XG4gIGZhZGluZ3M6IEFuaW1GYWRpbmdzO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFuaW1DdXJyZW50IHtcbiAgc3RhcnQ6IERPTUhpZ2hSZXNUaW1lU3RhbXA7XG4gIGZyZXF1ZW5jeTogY2cuS0h6O1xuICBwbGFuOiBBbmltUGxhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFuaW08QT4obXV0YXRpb246IE11dGF0aW9uPEE+LCBzdGF0ZTogU3RhdGUpOiBBIHtcbiAgcmV0dXJuIHN0YXRlLmFuaW1hdGlvbi5lbmFibGVkID8gYW5pbWF0ZShtdXRhdGlvbiwgc3RhdGUpIDogcmVuZGVyKG11dGF0aW9uLCBzdGF0ZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXI8QT4obXV0YXRpb246IE11dGF0aW9uPEE+LCBzdGF0ZTogU3RhdGUpOiBBIHtcbiAgY29uc3QgcmVzdWx0ID0gbXV0YXRpb24oc3RhdGUpO1xuICBzdGF0ZS5kb20ucmVkcmF3KCk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmludGVyZmFjZSBBbmltUGllY2Uge1xuICBrZXk6IGNnLktleTtcbiAgcG9zOiBjZy5Qb3M7XG4gIHBpZWNlOiBjZy5QaWVjZTtcbn1cbmludGVyZmFjZSBBbmltUGllY2VzIHtcbiAgW2tleTogc3RyaW5nXTogQW5pbVBpZWNlXG59XG5cbmZ1bmN0aW9uIG1ha2VQaWVjZShrZXk6IGNnLktleSwgcGllY2U6IGNnLlBpZWNlLCBmaXJzdFJhbmtJczA6IGJvb2xlYW4pOiBBbmltUGllY2Uge1xuICByZXR1cm4ge1xuICAgIGtleToga2V5LFxuICAgIHBvczogdXRpbC5rZXkycG9zKGtleSwgZmlyc3RSYW5rSXMwKSxcbiAgICBwaWVjZTogcGllY2VcbiAgfTtcbn1cblxuZnVuY3Rpb24gY2xvc2VyKHBpZWNlOiBBbmltUGllY2UsIHBpZWNlczogQW5pbVBpZWNlW10pOiBBbmltUGllY2Uge1xuICByZXR1cm4gcGllY2VzLnNvcnQoKHAxLCBwMikgPT4ge1xuICAgIHJldHVybiB1dGlsLmRpc3RhbmNlU3EocGllY2UucG9zLCBwMS5wb3MpIC0gdXRpbC5kaXN0YW5jZVNxKHBpZWNlLnBvcywgcDIucG9zKTtcbiAgfSlbMF07XG59XG5cbmZ1bmN0aW9uIGNvbXB1dGVQbGFuKHByZXZQaWVjZXM6IGNnLlBpZWNlcywgY3VycmVudDogU3RhdGUpOiBBbmltUGxhbiB7XG4gIGNvbnN0IGZpcnN0UmFua0lzMCA9IGN1cnJlbnQuZGltZW5zaW9ucy5oZWlnaHQgPT09IDEwO1xuICBjb25zdCBhbmltczogQW5pbVZlY3RvcnMgPSB7fSxcbiAgYW5pbWVkT3JpZ3M6IGNnLktleVtdID0gW10sXG4gIGZhZGluZ3M6IEFuaW1GYWRpbmdzID0ge30sXG4gIG1pc3NpbmdzOiBBbmltUGllY2VbXSA9IFtdLFxuICBuZXdzOiBBbmltUGllY2VbXSA9IFtdLFxuICBwcmVQaWVjZXM6IEFuaW1QaWVjZXMgPSB7fTtcbiAgbGV0IGN1clA6IGNnLlBpZWNlIHwgdW5kZWZpbmVkLCBwcmVQOiBBbmltUGllY2UgfCB1bmRlZmluZWQsIGk6IGFueSwgdmVjdG9yOiBjZy5OdW1iZXJQYWlyO1xuICBmb3IgKGkgaW4gcHJldlBpZWNlcykge1xuICAgIHByZVBpZWNlc1tpXSA9IG1ha2VQaWVjZShpIGFzIGNnLktleSwgcHJldlBpZWNlc1tpXSEsIGZpcnN0UmFua0lzMCk7XG4gIH1cbiAgZm9yIChjb25zdCBrZXkgb2YgdXRpbC5hbGxLZXlzW2N1cnJlbnQuZ2VvbWV0cnldKSB7XG4gICAgY3VyUCA9IGN1cnJlbnQucGllY2VzW2tleV07XG4gICAgcHJlUCA9IHByZVBpZWNlc1trZXldO1xuICAgIGlmIChjdXJQKSB7XG4gICAgICBpZiAocHJlUCkge1xuICAgICAgICBpZiAoIXV0aWwuc2FtZVBpZWNlKGN1clAsIHByZVAucGllY2UpKSB7XG4gICAgICAgICAgbWlzc2luZ3MucHVzaChwcmVQKTtcbiAgICAgICAgICBuZXdzLnB1c2gobWFrZVBpZWNlKGtleSwgY3VyUCwgZmlyc3RSYW5rSXMwKSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBuZXdzLnB1c2gobWFrZVBpZWNlKGtleSwgY3VyUCwgZmlyc3RSYW5rSXMwKSk7XG4gICAgfSBlbHNlIGlmIChwcmVQKSBtaXNzaW5ncy5wdXNoKHByZVApO1xuICB9XG4gIG5ld3MuZm9yRWFjaChuZXdQID0+IHtcbiAgICBwcmVQID0gY2xvc2VyKG5ld1AsIG1pc3NpbmdzLmZpbHRlcihwID0+IHV0aWwuc2FtZVBpZWNlKG5ld1AucGllY2UsIHAucGllY2UpKSk7XG4gICAgaWYgKHByZVApIHtcbiAgICAgIHZlY3RvciA9IFtwcmVQLnBvc1swXSAtIG5ld1AucG9zWzBdLCBwcmVQLnBvc1sxXSAtIG5ld1AucG9zWzFdXTtcbiAgICAgIGFuaW1zW25ld1Aua2V5XSA9IHZlY3Rvci5jb25jYXQodmVjdG9yKSBhcyBBbmltVmVjdG9yO1xuICAgICAgYW5pbWVkT3JpZ3MucHVzaChwcmVQLmtleSk7XG4gICAgfVxuICB9KTtcbiAgbWlzc2luZ3MuZm9yRWFjaChwID0+IHtcbiAgICBpZiAoIXV0aWwuY29udGFpbnNYKGFuaW1lZE9yaWdzLCBwLmtleSkpIGZhZGluZ3NbcC5rZXldID0gcC5waWVjZTtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBhbmltczogYW5pbXMsXG4gICAgZmFkaW5nczogZmFkaW5nc1xuICB9O1xufVxuXG5mdW5jdGlvbiBzdGVwKHN0YXRlOiBTdGF0ZSwgbm93OiBET01IaWdoUmVzVGltZVN0YW1wKTogdm9pZCB7XG4gIGNvbnN0IGN1ciA9IHN0YXRlLmFuaW1hdGlvbi5jdXJyZW50O1xuICBpZiAoY3VyID09PSB1bmRlZmluZWQpIHsgLy8gYW5pbWF0aW9uIHdhcyBjYW5jZWxlZCA6KFxuICAgIGlmICghc3RhdGUuZG9tLmRlc3Ryb3llZCkgc3RhdGUuZG9tLnJlZHJhd05vdygpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCByZXN0ID0gMSAtIChub3cgLSBjdXIuc3RhcnQpICogY3VyLmZyZXF1ZW5jeTtcbiAgaWYgKHJlc3QgPD0gMCkge1xuICAgIHN0YXRlLmFuaW1hdGlvbi5jdXJyZW50ID0gdW5kZWZpbmVkO1xuICAgIHN0YXRlLmRvbS5yZWRyYXdOb3coKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBlYXNlID0gZWFzaW5nKHJlc3QpO1xuICAgIGZvciAobGV0IGkgaW4gY3VyLnBsYW4uYW5pbXMpIHtcbiAgICAgIGNvbnN0IGNmZyA9IGN1ci5wbGFuLmFuaW1zW2ldO1xuICAgICAgY2ZnWzJdID0gY2ZnWzBdICogZWFzZTtcbiAgICAgIGNmZ1szXSA9IGNmZ1sxXSAqIGVhc2U7XG4gICAgfVxuICAgIHN0YXRlLmRvbS5yZWRyYXdOb3codHJ1ZSk7IC8vIG9wdGltaXNhdGlvbjogZG9uJ3QgcmVuZGVyIFNWRyBjaGFuZ2VzIGR1cmluZyBhbmltYXRpb25zXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKChub3cgPSBwZXJmb3JtYW5jZS5ub3coKSkgPT4gc3RlcChzdGF0ZSwgbm93KSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYW5pbWF0ZTxBPihtdXRhdGlvbjogTXV0YXRpb248QT4sIHN0YXRlOiBTdGF0ZSk6IEEge1xuICAvLyBjbG9uZSBzdGF0ZSBiZWZvcmUgbXV0YXRpbmcgaXRcbiAgY29uc3QgcHJldlBpZWNlczogY2cuUGllY2VzID0gey4uLnN0YXRlLnBpZWNlc307XG5cbiAgY29uc3QgcmVzdWx0ID0gbXV0YXRpb24oc3RhdGUpO1xuICBjb25zdCBwbGFuID0gY29tcHV0ZVBsYW4ocHJldlBpZWNlcywgc3RhdGUpO1xuICBpZiAoIWlzT2JqZWN0RW1wdHkocGxhbi5hbmltcykgfHwgIWlzT2JqZWN0RW1wdHkocGxhbi5mYWRpbmdzKSkge1xuICAgIGNvbnN0IGFscmVhZHlSdW5uaW5nID0gc3RhdGUuYW5pbWF0aW9uLmN1cnJlbnQgJiYgc3RhdGUuYW5pbWF0aW9uLmN1cnJlbnQuc3RhcnQ7XG4gICAgc3RhdGUuYW5pbWF0aW9uLmN1cnJlbnQgPSB7XG4gICAgICBzdGFydDogcGVyZm9ybWFuY2Uubm93KCksXG4gICAgICBmcmVxdWVuY3k6IDEgLyBzdGF0ZS5hbmltYXRpb24uZHVyYXRpb24sXG4gICAgICBwbGFuOiBwbGFuXG4gICAgfTtcbiAgICBpZiAoIWFscmVhZHlSdW5uaW5nKSBzdGVwKHN0YXRlLCBwZXJmb3JtYW5jZS5ub3coKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gZG9uJ3QgYW5pbWF0ZSwganVzdCByZW5kZXIgcmlnaHQgYXdheVxuICAgIHN0YXRlLmRvbS5yZWRyYXcoKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBpc09iamVjdEVtcHR5KG86IGFueSk6IGJvb2xlYW4ge1xuICBmb3IgKGxldCBfIGluIG8pIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHRydWU7XG59XG4vLyBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9ncmUvMTY1MDI5NFxuZnVuY3Rpb24gZWFzaW5nKHQ6IG51bWJlcik6IG51bWJlciB7XG4gIHJldHVybiB0IDwgMC41ID8gNCAqIHQgKiB0ICogdCA6ICh0IC0gMSkgKiAoMiAqIHQgLSAyKSAqICgyICogdCAtIDIpICsgMTtcbn1cbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCAqIGFzIGJvYXJkIGZyb20gJy4vYm9hcmQnXG5pbXBvcnQgeyB3cml0ZSBhcyBmZW5Xcml0ZSB9IGZyb20gJy4vZmVuJ1xuaW1wb3J0IHsgQ29uZmlnLCBjb25maWd1cmUgfSBmcm9tICcuL2NvbmZpZydcbmltcG9ydCB7IGFuaW0sIHJlbmRlciB9IGZyb20gJy4vYW5pbSdcbmltcG9ydCB7IGNhbmNlbCBhcyBkcmFnQ2FuY2VsLCBkcmFnTmV3UGllY2UgfSBmcm9tICcuL2RyYWcnXG5pbXBvcnQgeyBEcmF3U2hhcGUgfSBmcm9tICcuL2RyYXcnXG5pbXBvcnQgZXhwbG9zaW9uIGZyb20gJy4vZXhwbG9zaW9uJ1xuaW1wb3J0ICogYXMgY2cgZnJvbSAnLi90eXBlcydcblxuZXhwb3J0IGludGVyZmFjZSBBcGkge1xuXG4gIC8vIHJlY29uZmlndXJlIHRoZSBpbnN0YW5jZS4gQWNjZXB0cyBhbGwgY29uZmlnIG9wdGlvbnMsIGV4Y2VwdCBmb3Igdmlld09ubHkgJiBkcmF3YWJsZS52aXNpYmxlLlxuICAvLyBib2FyZCB3aWxsIGJlIGFuaW1hdGVkIGFjY29yZGluZ2x5LCBpZiBhbmltYXRpb25zIGFyZSBlbmFibGVkLlxuICBzZXQoY29uZmlnOiBDb25maWcpOiB2b2lkO1xuXG4gIC8vIHJlYWQgY2hlc3Nncm91bmQgc3RhdGU7IHdyaXRlIGF0IHlvdXIgb3duIHJpc2tzLlxuICBzdGF0ZTogU3RhdGU7XG5cbiAgLy8gZ2V0IHRoZSBwb3NpdGlvbiBhcyBhIEZFTiBzdHJpbmcgKG9ubHkgY29udGFpbnMgcGllY2VzLCBubyBmbGFncylcbiAgLy8gZS5nLiBybmJxa2Juci9wcHBwcHBwcC84LzgvOC84L1BQUFBQUFBQL1JOQlFLQk5SXG4gIGdldEZlbigpOiBjZy5GRU47XG5cbiAgLy8gY2hhbmdlIHRoZSB2aWV3IGFuZ2xlXG4gIHRvZ2dsZU9yaWVudGF0aW9uKCk6IHZvaWQ7XG5cbiAgLy8gcGVyZm9ybSBhIG1vdmUgcHJvZ3JhbW1hdGljYWxseVxuICBtb3ZlKG9yaWc6IGNnLktleSwgZGVzdDogY2cuS2V5KTogdm9pZDtcblxuICAvLyBhZGQgYW5kL29yIHJlbW92ZSBhcmJpdHJhcnkgcGllY2VzIG9uIHRoZSBib2FyZFxuICBzZXRQaWVjZXMocGllY2VzOiBjZy5QaWVjZXNEaWZmKTogdm9pZDtcblxuICAvLyBjbGljayBhIHNxdWFyZSBwcm9ncmFtbWF0aWNhbGx5XG4gIHNlbGVjdFNxdWFyZShrZXk6IGNnLktleSB8IG51bGwsIGZvcmNlPzogYm9vbGVhbik6IHZvaWQ7XG5cbiAgLy8gcHV0IGEgbmV3IHBpZWNlIG9uIHRoZSBib2FyZFxuICBuZXdQaWVjZShwaWVjZTogY2cuUGllY2UsIGtleTogY2cuS2V5KTogdm9pZDtcblxuICAvLyBwbGF5IHRoZSBjdXJyZW50IHByZW1vdmUsIGlmIGFueTsgcmV0dXJucyB0cnVlIGlmIHByZW1vdmUgd2FzIHBsYXllZFxuICBwbGF5UHJlbW92ZSgpOiBib29sZWFuO1xuXG4gIC8vIGNhbmNlbCB0aGUgY3VycmVudCBwcmVtb3ZlLCBpZiBhbnlcbiAgY2FuY2VsUHJlbW92ZSgpOiB2b2lkO1xuXG4gIC8vIHBsYXkgdGhlIGN1cnJlbnQgcHJlZHJvcCwgaWYgYW55OyByZXR1cm5zIHRydWUgaWYgcHJlbW92ZSB3YXMgcGxheWVkXG4gIHBsYXlQcmVkcm9wKHZhbGlkYXRlOiAoZHJvcDogY2cuRHJvcCkgPT4gYm9vbGVhbik6IGJvb2xlYW47XG5cbiAgLy8gY2FuY2VsIHRoZSBjdXJyZW50IHByZWRyb3AsIGlmIGFueVxuICBjYW5jZWxQcmVkcm9wKCk6IHZvaWQ7XG5cbiAgLy8gY2FuY2VsIHRoZSBjdXJyZW50IG1vdmUgYmVpbmcgbWFkZVxuICBjYW5jZWxNb3ZlKCk6IHZvaWQ7XG5cbiAgLy8gY2FuY2VsIGN1cnJlbnQgbW92ZSBhbmQgcHJldmVudCBmdXJ0aGVyIG9uZXNcbiAgc3RvcCgpOiB2b2lkO1xuXG4gIC8vIG1ha2Ugc3F1YXJlcyBleHBsb2RlIChhdG9taWMgY2hlc3MpXG4gIGV4cGxvZGUoa2V5czogY2cuS2V5W10pOiB2b2lkO1xuXG4gIC8vIHByb2dyYW1tYXRpY2FsbHkgZHJhdyB1c2VyIHNoYXBlc1xuICBzZXRTaGFwZXMoc2hhcGVzOiBEcmF3U2hhcGVbXSk6IHZvaWQ7XG5cbiAgLy8gcHJvZ3JhbW1hdGljYWxseSBkcmF3IGF1dG8gc2hhcGVzXG4gIHNldEF1dG9TaGFwZXMoc2hhcGVzOiBEcmF3U2hhcGVbXSk6IHZvaWQ7XG5cbiAgLy8gc3F1YXJlIG5hbWUgYXQgdGhpcyBET00gcG9zaXRpb24gKGxpa2UgXCJlNFwiKVxuICBnZXRLZXlBdERvbVBvcyhwb3M6IGNnLk51bWJlclBhaXIpOiBjZy5LZXkgfCB1bmRlZmluZWQ7XG5cbiAgLy8gb25seSB1c2VmdWwgd2hlbiBDU1MgY2hhbmdlcyB0aGUgYm9hcmQgd2lkdGgvaGVpZ2h0IHJhdGlvIChmb3IgM0QpXG4gIHJlZHJhd0FsbDogY2cuUmVkcmF3O1xuXG4gIC8vIGZvciBjcmF6eWhvdXNlIGFuZCBib2FyZCBlZGl0b3JzXG4gIGRyYWdOZXdQaWVjZShwaWVjZTogY2cuUGllY2UsIGV2ZW50OiBjZy5Nb3VjaEV2ZW50LCBmb3JjZT86IGJvb2xlYW4pOiB2b2lkO1xuXG4gIC8vIHVuYmluZHMgYWxsIGV2ZW50c1xuICAvLyAoaW1wb3J0YW50IGZvciBkb2N1bWVudC13aWRlIGV2ZW50cyBsaWtlIHNjcm9sbCBhbmQgbW91c2Vtb3ZlKVxuICBkZXN0cm95OiBjZy5VbmJpbmRcbn1cblxuLy8gc2VlIEFQSSB0eXBlcyBhbmQgZG9jdW1lbnRhdGlvbnMgaW4gZHRzL2FwaS5kLnRzXG5leHBvcnQgZnVuY3Rpb24gc3RhcnQoc3RhdGU6IFN0YXRlLCByZWRyYXdBbGw6IGNnLlJlZHJhdyk6IEFwaSB7XG5cbiAgZnVuY3Rpb24gdG9nZ2xlT3JpZW50YXRpb24oKSB7XG4gICAgYm9hcmQudG9nZ2xlT3JpZW50YXRpb24oc3RhdGUpO1xuICAgIHJlZHJhd0FsbCgpO1xuICB9O1xuXG4gIHJldHVybiB7XG5cbiAgICBzZXQoY29uZmlnKSB7XG4gICAgICBpZiAoY29uZmlnLm9yaWVudGF0aW9uICYmIGNvbmZpZy5vcmllbnRhdGlvbiAhPT0gc3RhdGUub3JpZW50YXRpb24pIHRvZ2dsZU9yaWVudGF0aW9uKCk7XG4gICAgICAoY29uZmlnLmZlbiA/IGFuaW0gOiByZW5kZXIpKHN0YXRlID0+IGNvbmZpZ3VyZShzdGF0ZSwgY29uZmlnKSwgc3RhdGUpO1xuICAgIH0sXG5cbiAgICBzdGF0ZSxcblxuICAgIGdldEZlbjogKCkgPT4gZmVuV3JpdGUoc3RhdGUucGllY2VzLCBzdGF0ZS5nZW9tZXRyeSksXG5cbiAgICB0b2dnbGVPcmllbnRhdGlvbixcblxuICAgIHNldFBpZWNlcyhwaWVjZXMpIHtcbiAgICAgIGFuaW0oc3RhdGUgPT4gYm9hcmQuc2V0UGllY2VzKHN0YXRlLCBwaWVjZXMpLCBzdGF0ZSk7XG4gICAgfSxcblxuICAgIHNlbGVjdFNxdWFyZShrZXksIGZvcmNlKSB7XG4gICAgICBpZiAoa2V5KSBhbmltKHN0YXRlID0+IGJvYXJkLnNlbGVjdFNxdWFyZShzdGF0ZSwga2V5LCBmb3JjZSksIHN0YXRlKTtcbiAgICAgIGVsc2UgaWYgKHN0YXRlLnNlbGVjdGVkKSB7XG4gICAgICAgIGJvYXJkLnVuc2VsZWN0KHN0YXRlKTtcbiAgICAgICAgc3RhdGUuZG9tLnJlZHJhdygpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBtb3ZlKG9yaWcsIGRlc3QpIHtcbiAgICAgIGFuaW0oc3RhdGUgPT4gYm9hcmQuYmFzZU1vdmUoc3RhdGUsIG9yaWcsIGRlc3QpLCBzdGF0ZSk7XG4gICAgfSxcblxuICAgIG5ld1BpZWNlKHBpZWNlLCBrZXkpIHtcbiAgICAgIGFuaW0oc3RhdGUgPT4gYm9hcmQuYmFzZU5ld1BpZWNlKHN0YXRlLCBwaWVjZSwga2V5KSwgc3RhdGUpO1xuICAgIH0sXG5cbiAgICBwbGF5UHJlbW92ZSgpIHtcbiAgICAgIGlmIChzdGF0ZS5wcmVtb3ZhYmxlLmN1cnJlbnQpIHtcbiAgICAgICAgaWYgKGFuaW0oYm9hcmQucGxheVByZW1vdmUsIHN0YXRlKSkgcmV0dXJuIHRydWU7XG4gICAgICAgIC8vIGlmIHRoZSBwcmVtb3ZlIGNvdWxkbid0IGJlIHBsYXllZCwgcmVkcmF3IHRvIGNsZWFyIGl0IHVwXG4gICAgICAgIHN0YXRlLmRvbS5yZWRyYXcoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuXG4gICAgcGxheVByZWRyb3AodmFsaWRhdGUpIHtcbiAgICAgIGlmIChzdGF0ZS5wcmVkcm9wcGFibGUuY3VycmVudCkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBib2FyZC5wbGF5UHJlZHJvcChzdGF0ZSwgdmFsaWRhdGUpO1xuICAgICAgICBzdGF0ZS5kb20ucmVkcmF3KCk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcblxuICAgIGNhbmNlbFByZW1vdmUoKSB7XG4gICAgICByZW5kZXIoYm9hcmQudW5zZXRQcmVtb3ZlLCBzdGF0ZSk7XG4gICAgfSxcblxuICAgIGNhbmNlbFByZWRyb3AoKSB7XG4gICAgICByZW5kZXIoYm9hcmQudW5zZXRQcmVkcm9wLCBzdGF0ZSk7XG4gICAgfSxcblxuICAgIGNhbmNlbE1vdmUoKSB7XG4gICAgICByZW5kZXIoc3RhdGUgPT4geyBib2FyZC5jYW5jZWxNb3ZlKHN0YXRlKTsgZHJhZ0NhbmNlbChzdGF0ZSk7IH0sIHN0YXRlKTtcbiAgICB9LFxuXG4gICAgc3RvcCgpIHtcbiAgICAgIHJlbmRlcihzdGF0ZSA9PiB7IGJvYXJkLnN0b3Aoc3RhdGUpOyBkcmFnQ2FuY2VsKHN0YXRlKTsgfSwgc3RhdGUpO1xuICAgIH0sXG5cbiAgICBleHBsb2RlKGtleXM6IGNnLktleVtdKSB7XG4gICAgICBleHBsb3Npb24oc3RhdGUsIGtleXMpO1xuICAgIH0sXG5cbiAgICBzZXRBdXRvU2hhcGVzKHNoYXBlczogRHJhd1NoYXBlW10pIHtcbiAgICAgIHJlbmRlcihzdGF0ZSA9PiBzdGF0ZS5kcmF3YWJsZS5hdXRvU2hhcGVzID0gc2hhcGVzLCBzdGF0ZSk7XG4gICAgfSxcblxuICAgIHNldFNoYXBlcyhzaGFwZXM6IERyYXdTaGFwZVtdKSB7XG4gICAgICByZW5kZXIoc3RhdGUgPT4gc3RhdGUuZHJhd2FibGUuc2hhcGVzID0gc2hhcGVzLCBzdGF0ZSk7XG4gICAgfSxcblxuICAgIGdldEtleUF0RG9tUG9zKHBvcykge1xuICAgICAgcmV0dXJuIGJvYXJkLmdldEtleUF0RG9tUG9zKHBvcywgYm9hcmQud2hpdGVQb3Yoc3RhdGUpLCBzdGF0ZS5kb20uYm91bmRzKCksIHN0YXRlLmdlb21ldHJ5KTtcbiAgICB9LFxuXG4gICAgcmVkcmF3QWxsLFxuXG4gICAgZHJhZ05ld1BpZWNlKHBpZWNlLCBldmVudCwgZm9yY2UpIHtcbiAgICAgIGRyYWdOZXdQaWVjZShzdGF0ZSwgcGllY2UsIGV2ZW50LCBmb3JjZSlcbiAgICB9LFxuXG4gICAgZGVzdHJveSgpIHtcbiAgICAgIGJvYXJkLnN0b3Aoc3RhdGUpO1xuICAgICAgc3RhdGUuZG9tLnVuYmluZCAmJiBzdGF0ZS5kb20udW5iaW5kKCk7XG4gICAgICBzdGF0ZS5kb20uZGVzdHJveWVkID0gdHJ1ZTtcbiAgICB9XG4gIH07XG59XG4iLCJpbXBvcnQgeyBTdGF0ZSB9IGZyb20gJy4vc3RhdGUnXG5pbXBvcnQgeyBwb3Mya2V5LCBrZXkycG9zLCBvcHBvc2l0ZSwgY29udGFpbnNYIH0gZnJvbSAnLi91dGlsJ1xuaW1wb3J0IHByZW1vdmUgZnJvbSAnLi9wcmVtb3ZlJ1xuaW1wb3J0ICogYXMgY2cgZnJvbSAnLi90eXBlcydcblxuZXhwb3J0IHR5cGUgQ2FsbGJhY2sgPSAoLi4uYXJnczogYW55W10pID0+IHZvaWQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxsVXNlckZ1bmN0aW9uKGY6IENhbGxiYWNrIHwgdW5kZWZpbmVkLCAuLi5hcmdzOiBhbnlbXSk6IHZvaWQge1xuICBpZiAoZikgc2V0VGltZW91dCgoKSA9PiBmKC4uLmFyZ3MpLCAxKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvZ2dsZU9yaWVudGF0aW9uKHN0YXRlOiBTdGF0ZSk6IHZvaWQge1xuICBzdGF0ZS5vcmllbnRhdGlvbiA9IG9wcG9zaXRlKHN0YXRlLm9yaWVudGF0aW9uKTtcbiAgc3RhdGUuYW5pbWF0aW9uLmN1cnJlbnQgPVxuICBzdGF0ZS5kcmFnZ2FibGUuY3VycmVudCA9XG4gIHN0YXRlLnNlbGVjdGVkID0gdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzZXQoc3RhdGU6IFN0YXRlKTogdm9pZCB7XG4gIHN0YXRlLmxhc3RNb3ZlID0gdW5kZWZpbmVkO1xuICB1bnNlbGVjdChzdGF0ZSk7XG4gIHVuc2V0UHJlbW92ZShzdGF0ZSk7XG4gIHVuc2V0UHJlZHJvcChzdGF0ZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRQaWVjZXMoc3RhdGU6IFN0YXRlLCBwaWVjZXM6IGNnLlBpZWNlc0RpZmYpOiB2b2lkIHtcbiAgZm9yIChsZXQga2V5IGluIHBpZWNlcykge1xuICAgIGNvbnN0IHBpZWNlID0gcGllY2VzW2tleV07XG4gICAgaWYgKHBpZWNlKSBzdGF0ZS5waWVjZXNba2V5XSA9IHBpZWNlO1xuICAgIGVsc2UgZGVsZXRlIHN0YXRlLnBpZWNlc1trZXldO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRDaGVjayhzdGF0ZTogU3RhdGUsIGNvbG9yOiBjZy5Db2xvciB8IGJvb2xlYW4pOiB2b2lkIHtcbiAgc3RhdGUuY2hlY2sgPSB1bmRlZmluZWQ7XG4gIGlmIChjb2xvciA9PT0gdHJ1ZSkgY29sb3IgPSBzdGF0ZS50dXJuQ29sb3I7XG4gIGlmIChjb2xvcikgZm9yIChsZXQgayBpbiBzdGF0ZS5waWVjZXMpIHtcbiAgICBpZiAoc3RhdGUucGllY2VzW2tdIS5yb2xlID09PSAna2luZycgJiYgc3RhdGUucGllY2VzW2tdIS5jb2xvciA9PT0gY29sb3IpIHtcbiAgICAgIHN0YXRlLmNoZWNrID0gayBhcyBjZy5LZXk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHNldFByZW1vdmUoc3RhdGU6IFN0YXRlLCBvcmlnOiBjZy5LZXksIGRlc3Q6IGNnLktleSwgbWV0YTogY2cuU2V0UHJlbW92ZU1ldGFkYXRhKTogdm9pZCB7XG4gIHVuc2V0UHJlZHJvcChzdGF0ZSk7XG4gIHN0YXRlLnByZW1vdmFibGUuY3VycmVudCA9IFtvcmlnLCBkZXN0XTtcbiAgY2FsbFVzZXJGdW5jdGlvbihzdGF0ZS5wcmVtb3ZhYmxlLmV2ZW50cy5zZXQsIG9yaWcsIGRlc3QsIG1ldGEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdW5zZXRQcmVtb3ZlKHN0YXRlOiBTdGF0ZSk6IHZvaWQge1xuICBpZiAoc3RhdGUucHJlbW92YWJsZS5jdXJyZW50KSB7XG4gICAgc3RhdGUucHJlbW92YWJsZS5jdXJyZW50ID0gdW5kZWZpbmVkO1xuICAgIGNhbGxVc2VyRnVuY3Rpb24oc3RhdGUucHJlbW92YWJsZS5ldmVudHMudW5zZXQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNldFByZWRyb3Aoc3RhdGU6IFN0YXRlLCByb2xlOiBjZy5Sb2xlLCBrZXk6IGNnLktleSk6IHZvaWQge1xuICB1bnNldFByZW1vdmUoc3RhdGUpO1xuICBzdGF0ZS5wcmVkcm9wcGFibGUuY3VycmVudCA9IHsgcm9sZSwga2V5IH07XG4gIGNhbGxVc2VyRnVuY3Rpb24oc3RhdGUucHJlZHJvcHBhYmxlLmV2ZW50cy5zZXQsIHJvbGUsIGtleSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1bnNldFByZWRyb3Aoc3RhdGU6IFN0YXRlKTogdm9pZCB7XG4gIGNvbnN0IHBkID0gc3RhdGUucHJlZHJvcHBhYmxlO1xuICBpZiAocGQuY3VycmVudCkge1xuICAgIHBkLmN1cnJlbnQgPSB1bmRlZmluZWQ7XG4gICAgY2FsbFVzZXJGdW5jdGlvbihwZC5ldmVudHMudW5zZXQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRyeUF1dG9DYXN0bGUoc3RhdGU6IFN0YXRlLCBvcmlnOiBjZy5LZXksIGRlc3Q6IGNnLktleSk6IGJvb2xlYW4ge1xuICBpZiAoIXN0YXRlLmF1dG9DYXN0bGUpIHJldHVybiBmYWxzZTtcbiAgY29uc3Qga2luZyA9IHN0YXRlLnBpZWNlc1tvcmlnXTtcbiAgaWYgKCFraW5nIHx8IGtpbmcucm9sZSAhPT0gJ2tpbmcnKSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IGZpcnN0UmFua0lzMCA9IHN0YXRlLmRpbWVuc2lvbnMuaGVpZ2h0ID09PSAxMDtcbiAgY29uc3Qgb3JpZ1BvcyA9IGtleTJwb3Mob3JpZywgZmlyc3RSYW5rSXMwKTtcbiAgaWYgKG9yaWdQb3NbMF0gIT09IDUpIHJldHVybiBmYWxzZTtcbiAgaWYgKG9yaWdQb3NbMV0gIT09IDEgJiYgb3JpZ1Bvc1sxXSAhPT0gOCkgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBkZXN0UG9zID0ga2V5MnBvcyhkZXN0LCBmaXJzdFJhbmtJczApO1xuICBsZXQgb2xkUm9va1BvcywgbmV3Um9va1BvcywgbmV3S2luZ1BvcztcbiAgaWYgKGRlc3RQb3NbMF0gPT09IDcgfHwgZGVzdFBvc1swXSA9PT0gOCkge1xuICAgIG9sZFJvb2tQb3MgPSBwb3Mya2V5KFs4LCBvcmlnUG9zWzFdXSwgc3RhdGUuZ2VvbWV0cnkpO1xuICAgIG5ld1Jvb2tQb3MgPSBwb3Mya2V5KFs2LCBvcmlnUG9zWzFdXSwgc3RhdGUuZ2VvbWV0cnkpO1xuICAgIG5ld0tpbmdQb3MgPSBwb3Mya2V5KFs3LCBvcmlnUG9zWzFdXSwgc3RhdGUuZ2VvbWV0cnkpO1xuICB9IGVsc2UgaWYgKGRlc3RQb3NbMF0gPT09IDMgfHwgZGVzdFBvc1swXSA9PT0gMSkge1xuICAgIG9sZFJvb2tQb3MgPSBwb3Mya2V5KFsxLCBvcmlnUG9zWzFdXSwgc3RhdGUuZ2VvbWV0cnkpO1xuICAgIG5ld1Jvb2tQb3MgPSBwb3Mya2V5KFs0LCBvcmlnUG9zWzFdXSwgc3RhdGUuZ2VvbWV0cnkpO1xuICAgIG5ld0tpbmdQb3MgPSBwb3Mya2V5KFszLCBvcmlnUG9zWzFdXSwgc3RhdGUuZ2VvbWV0cnkpO1xuICB9IGVsc2UgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IHJvb2sgPSBzdGF0ZS5waWVjZXNbb2xkUm9va1Bvc107XG4gIGlmICghcm9vayB8fCByb29rLnJvbGUgIT09ICdyb29rJykgcmV0dXJuIGZhbHNlO1xuXG4gIGRlbGV0ZSBzdGF0ZS5waWVjZXNbb3JpZ107XG4gIGRlbGV0ZSBzdGF0ZS5waWVjZXNbb2xkUm9va1Bvc107XG5cbiAgc3RhdGUucGllY2VzW25ld0tpbmdQb3NdID0ga2luZ1xuICBzdGF0ZS5waWVjZXNbbmV3Um9va1Bvc10gPSByb29rO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJhc2VNb3ZlKHN0YXRlOiBTdGF0ZSwgb3JpZzogY2cuS2V5LCBkZXN0OiBjZy5LZXkpOiBjZy5QaWVjZSB8IGJvb2xlYW4ge1xuICBjb25zdCBvcmlnUGllY2UgPSBzdGF0ZS5waWVjZXNbb3JpZ10sIGRlc3RQaWVjZSA9IHN0YXRlLnBpZWNlc1tkZXN0XTtcbiAgaWYgKG9yaWcgPT09IGRlc3QgfHwgIW9yaWdQaWVjZSkgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBjYXB0dXJlZCA9IChkZXN0UGllY2UgJiYgZGVzdFBpZWNlLmNvbG9yICE9PSBvcmlnUGllY2UuY29sb3IpID8gZGVzdFBpZWNlIDogdW5kZWZpbmVkO1xuICBpZiAoZGVzdCA9PSBzdGF0ZS5zZWxlY3RlZCkgdW5zZWxlY3Qoc3RhdGUpO1xuICBjYWxsVXNlckZ1bmN0aW9uKHN0YXRlLmV2ZW50cy5tb3ZlLCBvcmlnLCBkZXN0LCBjYXB0dXJlZCk7XG4gIGlmICghdHJ5QXV0b0Nhc3RsZShzdGF0ZSwgb3JpZywgZGVzdCkpIHtcbiAgICBzdGF0ZS5waWVjZXNbZGVzdF0gPSBvcmlnUGllY2U7XG4gICAgZGVsZXRlIHN0YXRlLnBpZWNlc1tvcmlnXTtcbiAgfVxuICBzdGF0ZS5sYXN0TW92ZSA9IFtvcmlnLCBkZXN0XTtcbiAgc3RhdGUuY2hlY2sgPSB1bmRlZmluZWQ7XG4gIGNhbGxVc2VyRnVuY3Rpb24oc3RhdGUuZXZlbnRzLmNoYW5nZSk7XG4gIHJldHVybiBjYXB0dXJlZCB8fCB0cnVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYmFzZU5ld1BpZWNlKHN0YXRlOiBTdGF0ZSwgcGllY2U6IGNnLlBpZWNlLCBrZXk6IGNnLktleSwgZm9yY2U/OiBib29sZWFuKTogYm9vbGVhbiB7XG4gIGlmIChzdGF0ZS5waWVjZXNba2V5XSkge1xuICAgIGlmIChmb3JjZSkgZGVsZXRlIHN0YXRlLnBpZWNlc1trZXldO1xuICAgIGVsc2UgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGNhbGxVc2VyRnVuY3Rpb24oc3RhdGUuZXZlbnRzLmRyb3BOZXdQaWVjZSwgcGllY2UsIGtleSk7XG4gIHN0YXRlLnBpZWNlc1trZXldID0gcGllY2U7XG4gIHN0YXRlLmxhc3RNb3ZlID0gW2tleV07XG4gIHN0YXRlLmNoZWNrID0gdW5kZWZpbmVkO1xuICBjYWxsVXNlckZ1bmN0aW9uKHN0YXRlLmV2ZW50cy5jaGFuZ2UpO1xuICBzdGF0ZS5tb3ZhYmxlLmRlc3RzID0gdW5kZWZpbmVkO1xuICBzdGF0ZS50dXJuQ29sb3IgPSBvcHBvc2l0ZShzdGF0ZS50dXJuQ29sb3IpO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gYmFzZVVzZXJNb3ZlKHN0YXRlOiBTdGF0ZSwgb3JpZzogY2cuS2V5LCBkZXN0OiBjZy5LZXkpOiBjZy5QaWVjZSB8IGJvb2xlYW4ge1xuICBjb25zdCByZXN1bHQgPSBiYXNlTW92ZShzdGF0ZSwgb3JpZywgZGVzdCk7XG4gIGlmIChyZXN1bHQpIHtcbiAgICBzdGF0ZS5tb3ZhYmxlLmRlc3RzID0gdW5kZWZpbmVkO1xuICAgIHN0YXRlLnR1cm5Db2xvciA9IG9wcG9zaXRlKHN0YXRlLnR1cm5Db2xvcik7XG4gICAgc3RhdGUuYW5pbWF0aW9uLmN1cnJlbnQgPSB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVzZXJNb3ZlKHN0YXRlOiBTdGF0ZSwgb3JpZzogY2cuS2V5LCBkZXN0OiBjZy5LZXkpOiBib29sZWFuIHtcbiAgaWYgKGNhbk1vdmUoc3RhdGUsIG9yaWcsIGRlc3QpKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gYmFzZVVzZXJNb3ZlKHN0YXRlLCBvcmlnLCBkZXN0KTtcbiAgICBpZiAocmVzdWx0KSB7XG4gICAgICBjb25zdCBob2xkVGltZSA9IHN0YXRlLmhvbGQuc3RvcCgpO1xuICAgICAgdW5zZWxlY3Qoc3RhdGUpO1xuICAgICAgY29uc3QgbWV0YWRhdGE6IGNnLk1vdmVNZXRhZGF0YSA9IHtcbiAgICAgICAgcHJlbW92ZTogZmFsc2UsXG4gICAgICAgIGN0cmxLZXk6IHN0YXRlLnN0YXRzLmN0cmxLZXksXG4gICAgICAgIGhvbGRUaW1lXG4gICAgICB9O1xuICAgICAgaWYgKHJlc3VsdCAhPT0gdHJ1ZSkgbWV0YWRhdGEuY2FwdHVyZWQgPSByZXN1bHQ7XG4gICAgICBjYWxsVXNlckZ1bmN0aW9uKHN0YXRlLm1vdmFibGUuZXZlbnRzLmFmdGVyLCBvcmlnLCBkZXN0LCBtZXRhZGF0YSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoY2FuUHJlbW92ZShzdGF0ZSwgb3JpZywgZGVzdCkpIHtcbiAgICBzZXRQcmVtb3ZlKHN0YXRlLCBvcmlnLCBkZXN0LCB7XG4gICAgICBjdHJsS2V5OiBzdGF0ZS5zdGF0cy5jdHJsS2V5XG4gICAgfSk7XG4gICAgdW5zZWxlY3Qoc3RhdGUpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHVuc2VsZWN0KHN0YXRlKTtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZHJvcE5ld1BpZWNlKHN0YXRlOiBTdGF0ZSwgb3JpZzogY2cuS2V5LCBkZXN0OiBjZy5LZXksIGZvcmNlPzogYm9vbGVhbik6IHZvaWQge1xuICBpZiAoY2FuRHJvcChzdGF0ZSwgb3JpZywgZGVzdCkgfHwgZm9yY2UpIHtcbiAgICBjb25zdCBwaWVjZSA9IHN0YXRlLnBpZWNlc1tvcmlnXSE7XG4gICAgZGVsZXRlIHN0YXRlLnBpZWNlc1tvcmlnXTtcbiAgICBiYXNlTmV3UGllY2Uoc3RhdGUsIHBpZWNlLCBkZXN0LCBmb3JjZSk7XG4gICAgY2FsbFVzZXJGdW5jdGlvbihzdGF0ZS5tb3ZhYmxlLmV2ZW50cy5hZnRlck5ld1BpZWNlLCBwaWVjZS5yb2xlLCBkZXN0LCB7XG4gICAgICBwcmVkcm9wOiBmYWxzZVxuICAgIH0pO1xuICB9IGVsc2UgaWYgKGNhblByZWRyb3Aoc3RhdGUsIG9yaWcsIGRlc3QpKSB7XG4gICAgc2V0UHJlZHJvcChzdGF0ZSwgc3RhdGUucGllY2VzW29yaWddIS5yb2xlLCBkZXN0KTtcbiAgfSBlbHNlIHtcbiAgICB1bnNldFByZW1vdmUoc3RhdGUpO1xuICAgIHVuc2V0UHJlZHJvcChzdGF0ZSk7XG4gIH1cbiAgZGVsZXRlIHN0YXRlLnBpZWNlc1tvcmlnXTtcbiAgdW5zZWxlY3Qoc3RhdGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VsZWN0U3F1YXJlKHN0YXRlOiBTdGF0ZSwga2V5OiBjZy5LZXksIGZvcmNlPzogYm9vbGVhbik6IHZvaWQge1xuICBjYWxsVXNlckZ1bmN0aW9uKHN0YXRlLmV2ZW50cy5zZWxlY3QsIGtleSk7XG4gIGlmIChzdGF0ZS5zZWxlY3RlZCkge1xuICAgIGlmIChzdGF0ZS5zZWxlY3RlZCA9PT0ga2V5ICYmICFzdGF0ZS5kcmFnZ2FibGUuZW5hYmxlZCkge1xuICAgICAgdW5zZWxlY3Qoc3RhdGUpO1xuICAgICAgc3RhdGUuaG9sZC5jYW5jZWwoKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKChzdGF0ZS5zZWxlY3RhYmxlLmVuYWJsZWQgfHwgZm9yY2UpICYmIHN0YXRlLnNlbGVjdGVkICE9PSBrZXkpIHtcbiAgICAgIGlmICh1c2VyTW92ZShzdGF0ZSwgc3RhdGUuc2VsZWN0ZWQsIGtleSkpIHtcbiAgICAgICAgc3RhdGUuc3RhdHMuZHJhZ2dlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChpc01vdmFibGUoc3RhdGUsIGtleSkgfHwgaXNQcmVtb3ZhYmxlKHN0YXRlLCBrZXkpKSB7XG4gICAgc2V0U2VsZWN0ZWQoc3RhdGUsIGtleSk7XG4gICAgc3RhdGUuaG9sZC5zdGFydCgpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRTZWxlY3RlZChzdGF0ZTogU3RhdGUsIGtleTogY2cuS2V5KTogdm9pZCB7XG4gIHN0YXRlLnNlbGVjdGVkID0ga2V5O1xuICBpZiAoaXNQcmVtb3ZhYmxlKHN0YXRlLCBrZXkpKSB7XG4gICAgc3RhdGUucHJlbW92YWJsZS5kZXN0cyA9IHByZW1vdmUoc3RhdGUucGllY2VzLCBrZXksIHN0YXRlLnByZW1vdmFibGUuY2FzdGxlLCBzdGF0ZS5nZW9tZXRyeSwgc3RhdGUudmFyaWFudCk7XG4gIH1cbiAgZWxzZSBzdGF0ZS5wcmVtb3ZhYmxlLmRlc3RzID0gdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdW5zZWxlY3Qoc3RhdGU6IFN0YXRlKTogdm9pZCB7XG4gIHN0YXRlLnNlbGVjdGVkID0gdW5kZWZpbmVkO1xuICBzdGF0ZS5wcmVtb3ZhYmxlLmRlc3RzID0gdW5kZWZpbmVkO1xuICBzdGF0ZS5ob2xkLmNhbmNlbCgpO1xufVxuXG5mdW5jdGlvbiBpc01vdmFibGUoc3RhdGU6IFN0YXRlLCBvcmlnOiBjZy5LZXkpOiBib29sZWFuIHtcbiAgY29uc3QgcGllY2UgPSBzdGF0ZS5waWVjZXNbb3JpZ107XG4gIHJldHVybiAhIXBpZWNlICYmIChcbiAgICBzdGF0ZS5tb3ZhYmxlLmNvbG9yID09PSAnYm90aCcgfHwgKFxuICAgICAgc3RhdGUubW92YWJsZS5jb2xvciA9PT0gcGllY2UuY29sb3IgJiZcbiAgICAgICAgc3RhdGUudHVybkNvbG9yID09PSBwaWVjZS5jb2xvclxuICAgICkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2FuTW92ZShzdGF0ZTogU3RhdGUsIG9yaWc6IGNnLktleSwgZGVzdDogY2cuS2V5KTogYm9vbGVhbiB7XG4gIHJldHVybiBvcmlnICE9PSBkZXN0ICYmIGlzTW92YWJsZShzdGF0ZSwgb3JpZykgJiYgKFxuICAgIHN0YXRlLm1vdmFibGUuZnJlZSB8fCAoISFzdGF0ZS5tb3ZhYmxlLmRlc3RzICYmIGNvbnRhaW5zWChzdGF0ZS5tb3ZhYmxlLmRlc3RzW29yaWddLCBkZXN0KSlcbiAgKTtcbn1cblxuZnVuY3Rpb24gY2FuRHJvcChzdGF0ZTogU3RhdGUsIG9yaWc6IGNnLktleSwgZGVzdDogY2cuS2V5KTogYm9vbGVhbiB7XG4gIGNvbnN0IHBpZWNlID0gc3RhdGUucGllY2VzW29yaWddO1xuICByZXR1cm4gISFwaWVjZSAmJiBkZXN0ICYmIChvcmlnID09PSBkZXN0IHx8ICFzdGF0ZS5waWVjZXNbZGVzdF0pICYmIChcbiAgICBzdGF0ZS5tb3ZhYmxlLmNvbG9yID09PSAnYm90aCcgfHwgKFxuICAgICAgc3RhdGUubW92YWJsZS5jb2xvciA9PT0gcGllY2UuY29sb3IgJiZcbiAgICAgICAgc3RhdGUudHVybkNvbG9yID09PSBwaWVjZS5jb2xvclxuICAgICkpO1xufVxuXG5cbmZ1bmN0aW9uIGlzUHJlbW92YWJsZShzdGF0ZTogU3RhdGUsIG9yaWc6IGNnLktleSk6IGJvb2xlYW4ge1xuICBjb25zdCBwaWVjZSA9IHN0YXRlLnBpZWNlc1tvcmlnXTtcbiAgcmV0dXJuICEhcGllY2UgJiYgc3RhdGUucHJlbW92YWJsZS5lbmFibGVkICYmXG4gIHN0YXRlLm1vdmFibGUuY29sb3IgPT09IHBpZWNlLmNvbG9yICYmXG4gICAgc3RhdGUudHVybkNvbG9yICE9PSBwaWVjZS5jb2xvcjtcbn1cblxuZnVuY3Rpb24gY2FuUHJlbW92ZShzdGF0ZTogU3RhdGUsIG9yaWc6IGNnLktleSwgZGVzdDogY2cuS2V5KTogYm9vbGVhbiB7XG4gIHJldHVybiBvcmlnICE9PSBkZXN0ICYmXG4gIGlzUHJlbW92YWJsZShzdGF0ZSwgb3JpZykgJiZcbiAgY29udGFpbnNYKHByZW1vdmUoc3RhdGUucGllY2VzLCBvcmlnLCBzdGF0ZS5wcmVtb3ZhYmxlLmNhc3RsZSwgc3RhdGUuZ2VvbWV0cnksIHN0YXRlLnZhcmlhbnQpLCBkZXN0KTtcbn1cblxuZnVuY3Rpb24gY2FuUHJlZHJvcChzdGF0ZTogU3RhdGUsIG9yaWc6IGNnLktleSwgZGVzdDogY2cuS2V5KTogYm9vbGVhbiB7XG4gIGNvbnN0IHBpZWNlID0gc3RhdGUucGllY2VzW29yaWddO1xuICBjb25zdCBkZXN0UGllY2UgPSBzdGF0ZS5waWVjZXNbZGVzdF07XG4gIHJldHVybiAhIXBpZWNlICYmIGRlc3QgJiZcbiAgKCFkZXN0UGllY2UgfHwgZGVzdFBpZWNlLmNvbG9yICE9PSBzdGF0ZS5tb3ZhYmxlLmNvbG9yKSAmJlxuICBzdGF0ZS5wcmVkcm9wcGFibGUuZW5hYmxlZCAmJlxuICAocGllY2Uucm9sZSAhPT0gJ3Bhd24nIHx8IChkZXN0WzFdICE9PSAnMScgJiYgZGVzdFsxXSAhPT0gJzgnKSkgJiZcbiAgc3RhdGUubW92YWJsZS5jb2xvciA9PT0gcGllY2UuY29sb3IgJiZcbiAgICBzdGF0ZS50dXJuQ29sb3IgIT09IHBpZWNlLmNvbG9yO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNEcmFnZ2FibGUoc3RhdGU6IFN0YXRlLCBvcmlnOiBjZy5LZXkpOiBib29sZWFuIHtcbiAgY29uc3QgcGllY2UgPSBzdGF0ZS5waWVjZXNbb3JpZ107XG4gIHJldHVybiAhIXBpZWNlICYmIHN0YXRlLmRyYWdnYWJsZS5lbmFibGVkICYmIChcbiAgICBzdGF0ZS5tb3ZhYmxlLmNvbG9yID09PSAnYm90aCcgfHwgKFxuICAgICAgc3RhdGUubW92YWJsZS5jb2xvciA9PT0gcGllY2UuY29sb3IgJiYgKFxuICAgICAgICBzdGF0ZS50dXJuQ29sb3IgPT09IHBpZWNlLmNvbG9yIHx8IHN0YXRlLnByZW1vdmFibGUuZW5hYmxlZFxuICAgICAgKVxuICAgIClcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBsYXlQcmVtb3ZlKHN0YXRlOiBTdGF0ZSk6IGJvb2xlYW4ge1xuICBjb25zdCBtb3ZlID0gc3RhdGUucHJlbW92YWJsZS5jdXJyZW50O1xuICBpZiAoIW1vdmUpIHJldHVybiBmYWxzZTtcbiAgY29uc3Qgb3JpZyA9IG1vdmVbMF0sIGRlc3QgPSBtb3ZlWzFdO1xuICBsZXQgc3VjY2VzcyA9IGZhbHNlO1xuICBpZiAoY2FuTW92ZShzdGF0ZSwgb3JpZywgZGVzdCkpIHtcbiAgICBjb25zdCByZXN1bHQgPSBiYXNlVXNlck1vdmUoc3RhdGUsIG9yaWcsIGRlc3QpO1xuICAgIGlmIChyZXN1bHQpIHtcbiAgICAgIGNvbnN0IG1ldGFkYXRhOiBjZy5Nb3ZlTWV0YWRhdGEgPSB7IHByZW1vdmU6IHRydWUgfTtcbiAgICAgIGlmIChyZXN1bHQgIT09IHRydWUpIG1ldGFkYXRhLmNhcHR1cmVkID0gcmVzdWx0O1xuICAgICAgY2FsbFVzZXJGdW5jdGlvbihzdGF0ZS5tb3ZhYmxlLmV2ZW50cy5hZnRlciwgb3JpZywgZGVzdCwgbWV0YWRhdGEpO1xuICAgICAgc3VjY2VzcyA9IHRydWU7XG4gICAgfVxuICB9XG4gIHVuc2V0UHJlbW92ZShzdGF0ZSk7XG4gIHJldHVybiBzdWNjZXNzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGxheVByZWRyb3Aoc3RhdGU6IFN0YXRlLCB2YWxpZGF0ZTogKGRyb3A6IGNnLkRyb3ApID0+IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgbGV0IGRyb3AgPSBzdGF0ZS5wcmVkcm9wcGFibGUuY3VycmVudCxcbiAgc3VjY2VzcyA9IGZhbHNlO1xuICBpZiAoIWRyb3ApIHJldHVybiBmYWxzZTtcbiAgaWYgKHZhbGlkYXRlKGRyb3ApKSB7XG4gICAgY29uc3QgcGllY2UgPSB7XG4gICAgICByb2xlOiBkcm9wLnJvbGUsXG4gICAgICBjb2xvcjogc3RhdGUubW92YWJsZS5jb2xvclxuICAgIH0gYXMgY2cuUGllY2U7XG4gICAgaWYgKGJhc2VOZXdQaWVjZShzdGF0ZSwgcGllY2UsIGRyb3Aua2V5KSkge1xuICAgICAgY2FsbFVzZXJGdW5jdGlvbihzdGF0ZS5tb3ZhYmxlLmV2ZW50cy5hZnRlck5ld1BpZWNlLCBkcm9wLnJvbGUsIGRyb3Aua2V5LCB7XG4gICAgICAgIHByZWRyb3A6IHRydWVcbiAgICAgIH0pO1xuICAgICAgc3VjY2VzcyA9IHRydWU7XG4gICAgfVxuICB9XG4gIHVuc2V0UHJlZHJvcChzdGF0ZSk7XG4gIHJldHVybiBzdWNjZXNzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2FuY2VsTW92ZShzdGF0ZTogU3RhdGUpOiB2b2lkIHtcbiAgdW5zZXRQcmVtb3ZlKHN0YXRlKTtcbiAgdW5zZXRQcmVkcm9wKHN0YXRlKTtcbiAgdW5zZWxlY3Qoc3RhdGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RvcChzdGF0ZTogU3RhdGUpOiB2b2lkIHtcbiAgc3RhdGUubW92YWJsZS5jb2xvciA9XG4gIHN0YXRlLm1vdmFibGUuZGVzdHMgPVxuICBzdGF0ZS5hbmltYXRpb24uY3VycmVudCA9IHVuZGVmaW5lZDtcbiAgY2FuY2VsTW92ZShzdGF0ZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRLZXlBdERvbVBvcyhwb3M6IGNnLk51bWJlclBhaXIsIGFzV2hpdGU6IGJvb2xlYW4sIGJvdW5kczogQ2xpZW50UmVjdCwgZ2VvbTogY2cuR2VvbWV0cnkpOiBjZy5LZXkgfCB1bmRlZmluZWQge1xuICBjb25zdCBiZCA9IGNnLmRpbWVuc2lvbnNbZ2VvbV07XG4gIGxldCBmaWxlID0gTWF0aC5jZWlsKGJkLndpZHRoICogKChwb3NbMF0gLSBib3VuZHMubGVmdCkgLyBib3VuZHMud2lkdGgpKTtcbiAgaWYgKCFhc1doaXRlKSBmaWxlID0gYmQud2lkdGggKyAxIC0gZmlsZTtcbiAgbGV0IHJhbmsgPSBNYXRoLmNlaWwoYmQuaGVpZ2h0IC0gKGJkLmhlaWdodCAqICgocG9zWzFdIC0gYm91bmRzLnRvcCkgLyBib3VuZHMuaGVpZ2h0KSkpO1xuICBpZiAoIWFzV2hpdGUpIHJhbmsgPSBiZC5oZWlnaHQgKyAxIC0gcmFuaztcbiAgcmV0dXJuIChmaWxlID4gMCAmJiBmaWxlIDwgYmQud2lkdGggKyAxICYmIHJhbmsgPiAwICYmIHJhbmsgPCBiZC5oZWlnaHQgKyAxKSA/IHBvczJrZXkoW2ZpbGUsIHJhbmtdLCBnZW9tKSA6IHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdoaXRlUG92KHM6IFN0YXRlKTogYm9vbGVhbiB7XG4gIHJldHVybiBzLm9yaWVudGF0aW9uID09PSAnd2hpdGUnO1xufVxuIiwiaW1wb3J0IHsgQXBpLCBzdGFydCB9IGZyb20gJy4vYXBpJ1xuaW1wb3J0IHsgQ29uZmlnLCBjb25maWd1cmUgfSBmcm9tICcuL2NvbmZpZydcbmltcG9ydCB7IFN0YXRlLCBkZWZhdWx0cyB9IGZyb20gJy4vc3RhdGUnXG5cbmltcG9ydCByZW5kZXJXcmFwIGZyb20gJy4vd3JhcCc7XG5pbXBvcnQgKiBhcyBldmVudHMgZnJvbSAnLi9ldmVudHMnXG5pbXBvcnQgcmVuZGVyIGZyb20gJy4vcmVuZGVyJztcbmltcG9ydCAqIGFzIHN2ZyBmcm9tICcuL3N2Zyc7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBDaGVzc2dyb3VuZChlbGVtZW50OiBIVE1MRWxlbWVudCwgY29uZmlnPzogQ29uZmlnKTogQXBpIHtcblxuICBjb25zdCBzdGF0ZSA9IGRlZmF1bHRzKCkgYXMgU3RhdGU7XG5cbiAgY29uZmlndXJlKHN0YXRlLCBjb25maWcgfHwge30pO1xuXG4gIGZ1bmN0aW9uIHJlZHJhd0FsbCgpIHtcbiAgICBsZXQgcHJldlVuYmluZCA9IHN0YXRlLmRvbSAmJiBzdGF0ZS5kb20udW5iaW5kO1xuICAgIC8vIGNvbXB1dGUgYm91bmRzIGZyb20gZXhpc3RpbmcgYm9hcmQgZWxlbWVudCBpZiBwb3NzaWJsZVxuICAgIC8vIHRoaXMgYWxsb3dzIG5vbi1zcXVhcmUgYm9hcmRzIGZyb20gQ1NTIHRvIGJlIGhhbmRsZWQgKGZvciAzRClcbiAgICBjb25zdCByZWxhdGl2ZSA9IHN0YXRlLnZpZXdPbmx5ICYmICFzdGF0ZS5kcmF3YWJsZS52aXNpYmxlLFxuICAgIGVsZW1lbnRzID0gcmVuZGVyV3JhcChlbGVtZW50LCBzdGF0ZSwgcmVsYXRpdmUpLFxuICAgIGJvdW5kcyA9IHV0aWwubWVtbygoKSA9PiBlbGVtZW50cy5ib2FyZC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSksXG4gICAgcmVkcmF3Tm93ID0gKHNraXBTdmc/OiBib29sZWFuKSA9PiB7XG4gICAgICByZW5kZXIoc3RhdGUpO1xuICAgICAgaWYgKCFza2lwU3ZnICYmIGVsZW1lbnRzLnN2Zykgc3ZnLnJlbmRlclN2ZyhzdGF0ZSwgZWxlbWVudHMuc3ZnKTtcbiAgICB9O1xuICAgIHN0YXRlLmRvbSA9IHtcbiAgICAgIGVsZW1lbnRzLFxuICAgICAgYm91bmRzLFxuICAgICAgcmVkcmF3OiBkZWJvdW5jZVJlZHJhdyhyZWRyYXdOb3cpLFxuICAgICAgcmVkcmF3Tm93LFxuICAgICAgdW5iaW5kOiBwcmV2VW5iaW5kLFxuICAgICAgcmVsYXRpdmVcbiAgICB9O1xuICAgIHN0YXRlLmRyYXdhYmxlLnByZXZTdmdIYXNoID0gJyc7XG4gICAgcmVkcmF3Tm93KGZhbHNlKTtcbiAgICBldmVudHMuYmluZEJvYXJkKHN0YXRlKTtcbiAgICBpZiAoIXByZXZVbmJpbmQpIHN0YXRlLmRvbS51bmJpbmQgPSBldmVudHMuYmluZERvY3VtZW50KHN0YXRlLCByZWRyYXdBbGwpO1xuICAgIHN0YXRlLmV2ZW50cy5pbnNlcnQgJiYgc3RhdGUuZXZlbnRzLmluc2VydChlbGVtZW50cyk7XG4gIH1cbiAgcmVkcmF3QWxsKCk7XG5cbiAgcmV0dXJuIHN0YXJ0KHN0YXRlLCByZWRyYXdBbGwpO1xufTtcblxuZnVuY3Rpb24gZGVib3VuY2VSZWRyYXcocmVkcmF3Tm93OiAoc2tpcFN2Zz86IGJvb2xlYW4pID0+IHZvaWQpOiAoKSA9PiB2b2lkIHtcbiAgbGV0IHJlZHJhd2luZyA9IGZhbHNlO1xuICByZXR1cm4gKCkgPT4ge1xuICAgIGlmIChyZWRyYXdpbmcpIHJldHVybjtcbiAgICByZWRyYXdpbmcgPSB0cnVlO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICByZWRyYXdOb3coKTtcbiAgICAgIHJlZHJhd2luZyA9IGZhbHNlO1xuICAgIH0pO1xuICB9O1xufVxuIiwiaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJ1xuaW1wb3J0IHsgc2V0Q2hlY2ssIHNldFNlbGVjdGVkIH0gZnJvbSAnLi9ib2FyZCdcbmltcG9ydCB7IHJlYWQgYXMgZmVuUmVhZCB9IGZyb20gJy4vZmVuJ1xuaW1wb3J0IHsgRHJhd1NoYXBlLCBEcmF3QnJ1c2ggfSBmcm9tICcuL2RyYXcnXG5pbXBvcnQgKiBhcyBjZyBmcm9tICcuL3R5cGVzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbmZpZyB7XG4gIGZlbj86IGNnLkZFTjsgLy8gY2hlc3MgcG9zaXRpb24gaW4gRm9yc3l0aCBub3RhdGlvblxuICBvcmllbnRhdGlvbj86IGNnLkNvbG9yOyAvLyBib2FyZCBvcmllbnRhdGlvbi4gd2hpdGUgfCBibGFja1xuICB0dXJuQ29sb3I/OiBjZy5Db2xvcjsgLy8gdHVybiB0byBwbGF5LiB3aGl0ZSB8IGJsYWNrXG4gIGNoZWNrPzogY2cuQ29sb3IgfCBib29sZWFuOyAvLyB0cnVlIGZvciBjdXJyZW50IGNvbG9yLCBmYWxzZSB0byB1bnNldFxuICBsYXN0TW92ZT86IGNnLktleVtdOyAvLyBzcXVhcmVzIHBhcnQgb2YgdGhlIGxhc3QgbW92ZSBbXCJjM1wiLCBcImM0XCJdXG4gIHNlbGVjdGVkPzogY2cuS2V5OyAvLyBzcXVhcmUgY3VycmVudGx5IHNlbGVjdGVkIFwiYTFcIlxuICBjb29yZGluYXRlcz86IGJvb2xlYW47IC8vIGluY2x1ZGUgY29vcmRzIGF0dHJpYnV0ZXNcbiAgYXV0b0Nhc3RsZT86IGJvb2xlYW47IC8vIGltbWVkaWF0ZWx5IGNvbXBsZXRlIHRoZSBjYXN0bGUgYnkgbW92aW5nIHRoZSByb29rIGFmdGVyIGtpbmcgbW92ZVxuICB2aWV3T25seT86IGJvb2xlYW47IC8vIGRvbid0IGJpbmQgZXZlbnRzOiB0aGUgdXNlciB3aWxsIG5ldmVyIGJlIGFibGUgdG8gbW92ZSBwaWVjZXMgYXJvdW5kXG4gIGRpc2FibGVDb250ZXh0TWVudT86IGJvb2xlYW47IC8vIGJlY2F1c2Ugd2hvIG5lZWRzIGEgY29udGV4dCBtZW51IG9uIGEgY2hlc3Nib2FyZFxuICByZXNpemFibGU/OiBib29sZWFuOyAvLyBsaXN0ZW5zIHRvIGNoZXNzZ3JvdW5kLnJlc2l6ZSBvbiBkb2N1bWVudC5ib2R5IHRvIGNsZWFyIGJvdW5kcyBjYWNoZVxuICBhZGRQaWVjZVpJbmRleD86IGJvb2xlYW47IC8vIGFkZHMgei1pbmRleCB2YWx1ZXMgdG8gcGllY2VzIChmb3IgM0QpXG4gIC8vIHBpZWNlS2V5OiBib29sZWFuOyAvLyBhZGQgYSBkYXRhLWtleSBhdHRyaWJ1dGUgdG8gcGllY2UgZWxlbWVudHNcbiAgaGlnaGxpZ2h0Pzoge1xuICAgIGxhc3RNb3ZlPzogYm9vbGVhbjsgLy8gYWRkIGxhc3QtbW92ZSBjbGFzcyB0byBzcXVhcmVzXG4gICAgY2hlY2s/OiBib29sZWFuOyAvLyBhZGQgY2hlY2sgY2xhc3MgdG8gc3F1YXJlc1xuICB9O1xuICBhbmltYXRpb24/OiB7XG4gICAgZW5hYmxlZD86IGJvb2xlYW47XG4gICAgZHVyYXRpb24/OiBudW1iZXI7XG4gIH07XG4gIG1vdmFibGU/OiB7XG4gICAgZnJlZT86IGJvb2xlYW47IC8vIGFsbCBtb3ZlcyBhcmUgdmFsaWQgLSBib2FyZCBlZGl0b3JcbiAgICBjb2xvcj86IGNnLkNvbG9yIHwgJ2JvdGgnOyAvLyBjb2xvciB0aGF0IGNhbiBtb3ZlLiB3aGl0ZSB8IGJsYWNrIHwgYm90aCB8IHVuZGVmaW5lZFxuICAgIGRlc3RzPzoge1xuICAgICAgW2tleTogc3RyaW5nXTogY2cuS2V5W11cbiAgICB9OyAvLyB2YWxpZCBtb3Zlcy4ge1wiYTJcIiBbXCJhM1wiIFwiYTRcIl0gXCJiMVwiIFtcImEzXCIgXCJjM1wiXX1cbiAgICBzaG93RGVzdHM/OiBib29sZWFuOyAvLyB3aGV0aGVyIHRvIGFkZCB0aGUgbW92ZS1kZXN0IGNsYXNzIG9uIHNxdWFyZXNcbiAgICBldmVudHM/OiB7XG4gICAgICBhZnRlcj86IChvcmlnOiBjZy5LZXksIGRlc3Q6IGNnLktleSwgbWV0YWRhdGE6IGNnLk1vdmVNZXRhZGF0YSkgPT4gdm9pZDsgLy8gY2FsbGVkIGFmdGVyIHRoZSBtb3ZlIGhhcyBiZWVuIHBsYXllZFxuICAgICAgYWZ0ZXJOZXdQaWVjZT86IChyb2xlOiBjZy5Sb2xlLCBrZXk6IGNnLktleSwgbWV0YWRhdGE6IGNnLk1vdmVNZXRhZGF0YSkgPT4gdm9pZDsgLy8gY2FsbGVkIGFmdGVyIGEgbmV3IHBpZWNlIGlzIGRyb3BwZWQgb24gdGhlIGJvYXJkXG4gICAgfTtcbiAgICByb29rQ2FzdGxlPzogYm9vbGVhbiAvLyBjYXN0bGUgYnkgbW92aW5nIHRoZSBraW5nIHRvIHRoZSByb29rXG4gIH07XG4gIHByZW1vdmFibGU/OiB7XG4gICAgZW5hYmxlZD86IGJvb2xlYW47IC8vIGFsbG93IHByZW1vdmVzIGZvciBjb2xvciB0aGF0IGNhbiBub3QgbW92ZVxuICAgIHNob3dEZXN0cz86IGJvb2xlYW47IC8vIHdoZXRoZXIgdG8gYWRkIHRoZSBwcmVtb3ZlLWRlc3QgY2xhc3Mgb24gc3F1YXJlc1xuICAgIGNhc3RsZT86IGJvb2xlYW47IC8vIHdoZXRoZXIgdG8gYWxsb3cga2luZyBjYXN0bGUgcHJlbW92ZXNcbiAgICBkZXN0cz86IGNnLktleVtdOyAvLyBwcmVtb3ZlIGRlc3RpbmF0aW9ucyBmb3IgdGhlIGN1cnJlbnQgc2VsZWN0aW9uXG4gICAgZXZlbnRzPzoge1xuICAgICAgc2V0PzogKG9yaWc6IGNnLktleSwgZGVzdDogY2cuS2V5LCBtZXRhZGF0YT86IGNnLlNldFByZW1vdmVNZXRhZGF0YSkgPT4gdm9pZDsgLy8gY2FsbGVkIGFmdGVyIHRoZSBwcmVtb3ZlIGhhcyBiZWVuIHNldFxuICAgICAgdW5zZXQ/OiAoKSA9PiB2b2lkOyAgLy8gY2FsbGVkIGFmdGVyIHRoZSBwcmVtb3ZlIGhhcyBiZWVuIHVuc2V0XG4gICAgfVxuICB9O1xuICBwcmVkcm9wcGFibGU/OiB7XG4gICAgZW5hYmxlZD86IGJvb2xlYW47IC8vIGFsbG93IHByZWRyb3BzIGZvciBjb2xvciB0aGF0IGNhbiBub3QgbW92ZVxuICAgIGV2ZW50cz86IHtcbiAgICAgIHNldD86IChyb2xlOiBjZy5Sb2xlLCBrZXk6IGNnLktleSkgPT4gdm9pZDsgLy8gY2FsbGVkIGFmdGVyIHRoZSBwcmVkcm9wIGhhcyBiZWVuIHNldFxuICAgICAgdW5zZXQ/OiAoKSA9PiB2b2lkOyAvLyBjYWxsZWQgYWZ0ZXIgdGhlIHByZWRyb3AgaGFzIGJlZW4gdW5zZXRcbiAgICB9XG4gIH07XG4gIGRyYWdnYWJsZT86IHtcbiAgICBlbmFibGVkPzogYm9vbGVhbjsgLy8gYWxsb3cgbW92ZXMgJiBwcmVtb3ZlcyB0byB1c2UgZHJhZyduIGRyb3BcbiAgICBkaXN0YW5jZT86IG51bWJlcjsgLy8gbWluaW11bSBkaXN0YW5jZSB0byBpbml0aWF0ZSBhIGRyYWc7IGluIHBpeGVsc1xuICAgIGF1dG9EaXN0YW5jZT86IGJvb2xlYW47IC8vIGxldHMgY2hlc3Nncm91bmQgc2V0IGRpc3RhbmNlIHRvIHplcm8gd2hlbiB1c2VyIGRyYWdzIHBpZWNlc1xuICAgIGNlbnRlclBpZWNlPzogYm9vbGVhbjsgLy8gY2VudGVyIHRoZSBwaWVjZSBvbiBjdXJzb3IgYXQgZHJhZyBzdGFydFxuICAgIHNob3dHaG9zdD86IGJvb2xlYW47IC8vIHNob3cgZ2hvc3Qgb2YgcGllY2UgYmVpbmcgZHJhZ2dlZFxuICAgIGRlbGV0ZU9uRHJvcE9mZj86IGJvb2xlYW47IC8vIGRlbGV0ZSBhIHBpZWNlIHdoZW4gaXQgaXMgZHJvcHBlZCBvZmYgdGhlIGJvYXJkXG4gIH07XG4gIHNlbGVjdGFibGU/OiB7XG4gICAgLy8gZGlzYWJsZSB0byBlbmZvcmNlIGRyYWdnaW5nIG92ZXIgY2xpY2stY2xpY2sgbW92ZVxuICAgIGVuYWJsZWQ/OiBib29sZWFuXG4gIH07XG4gIGV2ZW50cz86IHtcbiAgICBjaGFuZ2U/OiAoKSA9PiB2b2lkOyAvLyBjYWxsZWQgYWZ0ZXIgdGhlIHNpdHVhdGlvbiBjaGFuZ2VzIG9uIHRoZSBib2FyZFxuICAgIC8vIGNhbGxlZCBhZnRlciBhIHBpZWNlIGhhcyBiZWVuIG1vdmVkLlxuICAgIC8vIGNhcHR1cmVkUGllY2UgaXMgdW5kZWZpbmVkIG9yIGxpa2Uge2NvbG9yOiAnd2hpdGUnOyAncm9sZSc6ICdxdWVlbid9XG4gICAgbW92ZT86IChvcmlnOiBjZy5LZXksIGRlc3Q6IGNnLktleSwgY2FwdHVyZWRQaWVjZT86IGNnLlBpZWNlKSA9PiB2b2lkO1xuICAgIGRyb3BOZXdQaWVjZT86IChwaWVjZTogY2cuUGllY2UsIGtleTogY2cuS2V5KSA9PiB2b2lkO1xuICAgIHNlbGVjdD86IChrZXk6IGNnLktleSkgPT4gdm9pZDsgLy8gY2FsbGVkIHdoZW4gYSBzcXVhcmUgaXMgc2VsZWN0ZWRcbiAgICBpbnNlcnQ/OiAoZWxlbWVudHM6IGNnLkVsZW1lbnRzKSA9PiB2b2lkOyAvLyB3aGVuIHRoZSBib2FyZCBET00gaGFzIGJlZW4gKHJlKWluc2VydGVkXG4gIH07XG4gIGRyYXdhYmxlPzoge1xuICAgIGVuYWJsZWQ/OiBib29sZWFuOyAvLyBjYW4gZHJhd1xuICAgIHZpc2libGU/OiBib29sZWFuOyAvLyBjYW4gdmlld1xuICAgIGVyYXNlT25DbGljaz86IGJvb2xlYW47XG4gICAgc2hhcGVzPzogRHJhd1NoYXBlW107XG4gICAgYXV0b1NoYXBlcz86IERyYXdTaGFwZVtdO1xuICAgIGJydXNoZXM/OiBEcmF3QnJ1c2hbXTtcbiAgICBwaWVjZXM/OiB7XG4gICAgICBiYXNlVXJsPzogc3RyaW5nO1xuICAgIH1cbiAgfTtcbiAgZ2VvbWV0cnk/OiBjZy5HZW9tZXRyeTsgLy8gZGltM3g0IHwgZGltNXg1IHwgZGltN3g3IHwgZGltOHg4IHwgZGltOXg5IHwgZGltMTB4OCB8IGRpbTl4MTAgfCBkaW0xMHgxMFxuICB2YXJpYW50PzogY2cuVmFyaWFudDtcbiAgbm90YXRpb24/OiBjZy5Ob3RhdGlvbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbmZpZ3VyZShzdGF0ZTogU3RhdGUsIGNvbmZpZzogQ29uZmlnKSB7XG5cbiAgLy8gZG9uJ3QgbWVyZ2UgZGVzdGluYXRpb25zLiBKdXN0IG92ZXJyaWRlLlxuICBpZiAoY29uZmlnLm1vdmFibGUgJiYgY29uZmlnLm1vdmFibGUuZGVzdHMpIHN0YXRlLm1vdmFibGUuZGVzdHMgPSB1bmRlZmluZWQ7XG5cbiAgbWVyZ2Uoc3RhdGUsIGNvbmZpZyk7XG5cbiAgaWYgKGNvbmZpZy5nZW9tZXRyeSkgc3RhdGUuZGltZW5zaW9ucyA9IGNnLmRpbWVuc2lvbnNbY29uZmlnLmdlb21ldHJ5XTtcblxuICAvLyBpZiBhIGZlbiB3YXMgcHJvdmlkZWQsIHJlcGxhY2UgdGhlIHBpZWNlc1xuICBpZiAoY29uZmlnLmZlbikge1xuICAgIGNvbnN0IHBpZWNlcyA9IGZlblJlYWQoY29uZmlnLmZlbiwgc3RhdGUuZ2VvbWV0cnkpO1xuICAgIC8vIHByZXZlbnQgdG8gY2FuY2VsKCkgYWxyZWFkeSBzdGFydGVkIHBpZWNlIGRyYWcgZnJvbSBwb2NrZXQhXG4gICAgaWYgKHN0YXRlLnBpZWNlc1snejAnXSAhPT0gdW5kZWZpbmVkKSBwaWVjZXNbJ3owJ10gPSBzdGF0ZS5waWVjZXNbJ3owJ107XG4gICAgc3RhdGUucGllY2VzID0gcGllY2VzO1xuICAgIHN0YXRlLmRyYXdhYmxlLnNoYXBlcyA9IFtdO1xuICB9XG5cbiAgLy8gYXBwbHkgY29uZmlnIHZhbHVlcyB0aGF0IGNvdWxkIGJlIHVuZGVmaW5lZCB5ZXQgbWVhbmluZ2Z1bFxuICBpZiAoY29uZmlnLmhhc093blByb3BlcnR5KCdjaGVjaycpKSBzZXRDaGVjayhzdGF0ZSwgY29uZmlnLmNoZWNrIHx8IGZhbHNlKTtcbiAgaWYgKGNvbmZpZy5oYXNPd25Qcm9wZXJ0eSgnbGFzdE1vdmUnKSAmJiAhY29uZmlnLmxhc3RNb3ZlKSBzdGF0ZS5sYXN0TW92ZSA9IHVuZGVmaW5lZDtcbiAgLy8gaW4gY2FzZSBvZiBaSCBkcm9wIGxhc3QgbW92ZSwgdGhlcmUncyBhIHNpbmdsZSBzcXVhcmUuXG4gIC8vIGlmIHRoZSBwcmV2aW91cyBsYXN0IG1vdmUgaGFkIHR3byBzcXVhcmVzLFxuICAvLyB0aGUgbWVyZ2UgYWxnb3JpdGhtIHdpbGwgaW5jb3JyZWN0bHkga2VlcCB0aGUgc2Vjb25kIHNxdWFyZS5cbiAgZWxzZSBpZiAoY29uZmlnLmxhc3RNb3ZlKSBzdGF0ZS5sYXN0TW92ZSA9IGNvbmZpZy5sYXN0TW92ZTtcblxuICAvLyBmaXggbW92ZS9wcmVtb3ZlIGRlc3RzXG4gIGlmIChzdGF0ZS5zZWxlY3RlZCkgc2V0U2VsZWN0ZWQoc3RhdGUsIHN0YXRlLnNlbGVjdGVkKTtcblxuICAvLyBubyBuZWVkIGZvciBzdWNoIHNob3J0IGFuaW1hdGlvbnNcbiAgaWYgKCFzdGF0ZS5hbmltYXRpb24uZHVyYXRpb24gfHwgc3RhdGUuYW5pbWF0aW9uLmR1cmF0aW9uIDwgMTAwKSBzdGF0ZS5hbmltYXRpb24uZW5hYmxlZCA9IGZhbHNlO1xuXG4gIGlmICghc3RhdGUubW92YWJsZS5yb29rQ2FzdGxlICYmIHN0YXRlLm1vdmFibGUuZGVzdHMpIHtcbiAgICBjb25zdCByYW5rID0gc3RhdGUubW92YWJsZS5jb2xvciA9PT0gJ3doaXRlJyA/IDEgOiA4LFxuICAgIGtpbmdTdGFydFBvcyA9ICdlJyArIHJhbmssXG4gICAgZGVzdHMgPSBzdGF0ZS5tb3ZhYmxlLmRlc3RzW2tpbmdTdGFydFBvc10sXG4gICAga2luZyA9IHN0YXRlLnBpZWNlc1traW5nU3RhcnRQb3NdO1xuICAgIGlmICghZGVzdHMgfHwgIWtpbmcgfHwga2luZy5yb2xlICE9PSAna2luZycpIHJldHVybjtcbiAgICBzdGF0ZS5tb3ZhYmxlLmRlc3RzW2tpbmdTdGFydFBvc10gPSBkZXN0cy5maWx0ZXIoZCA9PlxuICAgICAgISgoZCA9PT0gJ2EnICsgcmFuaykgJiYgZGVzdHMuaW5kZXhPZignYycgKyByYW5rIGFzIGNnLktleSkgIT09IC0xKSAmJlxuICAgICAgICAhKChkID09PSAnaCcgKyByYW5rKSAmJiBkZXN0cy5pbmRleE9mKCdnJyArIHJhbmsgYXMgY2cuS2V5KSAhPT0gLTEpXG4gICAgKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gbWVyZ2UoYmFzZTogYW55LCBleHRlbmQ6IGFueSkge1xuICBmb3IgKGxldCBrZXkgaW4gZXh0ZW5kKSB7XG4gICAgaWYgKGlzT2JqZWN0KGJhc2Vba2V5XSkgJiYgaXNPYmplY3QoZXh0ZW5kW2tleV0pKSBtZXJnZShiYXNlW2tleV0sIGV4dGVuZFtrZXldKTtcbiAgICBlbHNlIGJhc2Vba2V5XSA9IGV4dGVuZFtrZXldO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KG86IGFueSk6IGJvb2xlYW4ge1xuICByZXR1cm4gdHlwZW9mIG8gPT09ICdvYmplY3QnO1xufVxuIiwiaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJ1xuaW1wb3J0ICogYXMgYm9hcmQgZnJvbSAnLi9ib2FyZCdcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAnLi91dGlsJ1xuaW1wb3J0IHsgY2xlYXIgYXMgZHJhd0NsZWFyIH0gZnJvbSAnLi9kcmF3J1xuaW1wb3J0ICogYXMgY2cgZnJvbSAnLi90eXBlcydcbmltcG9ydCB7IGFuaW0gfSBmcm9tICcuL2FuaW0nXG5cbmV4cG9ydCBpbnRlcmZhY2UgRHJhZ0N1cnJlbnQge1xuICBvcmlnOiBjZy5LZXk7IC8vIG9yaWcga2V5IG9mIGRyYWdnaW5nIHBpZWNlXG4gIG9yaWdQb3M6IGNnLlBvcztcbiAgcGllY2U6IGNnLlBpZWNlO1xuICByZWw6IGNnLk51bWJlclBhaXI7IC8vIHg7IHkgb2YgdGhlIHBpZWNlIGF0IG9yaWdpbmFsIHBvc2l0aW9uXG4gIGVwb3M6IGNnLk51bWJlclBhaXI7IC8vIGluaXRpYWwgZXZlbnQgcG9zaXRpb25cbiAgcG9zOiBjZy5OdW1iZXJQYWlyOyAvLyByZWxhdGl2ZSBjdXJyZW50IHBvc2l0aW9uXG4gIGRlYzogY2cuTnVtYmVyUGFpcjsgLy8gcGllY2UgY2VudGVyIGRlY2F5XG4gIHN0YXJ0ZWQ6IGJvb2xlYW47IC8vIHdoZXRoZXIgdGhlIGRyYWcgaGFzIHN0YXJ0ZWQ7IGFzIHBlciB0aGUgZGlzdGFuY2Ugc2V0dGluZ1xuICBlbGVtZW50OiBjZy5QaWVjZU5vZGUgfCAoKCkgPT4gY2cuUGllY2VOb2RlIHwgdW5kZWZpbmVkKTtcbiAgbmV3UGllY2U/OiBib29sZWFuOyAvLyBpdCBpdCBhIG5ldyBwaWVjZSBmcm9tIG91dHNpZGUgdGhlIGJvYXJkXG4gIGZvcmNlPzogYm9vbGVhbjsgLy8gY2FuIHRoZSBuZXcgcGllY2UgcmVwbGFjZSBhbiBleGlzdGluZyBvbmUgKGVkaXRvcilcbiAgcHJldmlvdXNseVNlbGVjdGVkPzogY2cuS2V5O1xuICBvcmlnaW5UYXJnZXQ6IEV2ZW50VGFyZ2V0IHwgbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0KHM6IFN0YXRlLCBlOiBjZy5Nb3VjaEV2ZW50KTogdm9pZCB7XG4gIGlmIChlLmJ1dHRvbiAhPT0gdW5kZWZpbmVkICYmIGUuYnV0dG9uICE9PSAwKSByZXR1cm47IC8vIG9ubHkgdG91Y2ggb3IgbGVmdCBjbGlja1xuICBpZiAoZS50b3VjaGVzICYmIGUudG91Y2hlcy5sZW5ndGggPiAxKSByZXR1cm47IC8vIHN1cHBvcnQgb25lIGZpbmdlciB0b3VjaCBvbmx5XG4gIGNvbnN0IGJvdW5kcyA9IHMuZG9tLmJvdW5kcygpLFxuICBwb3NpdGlvbiA9IHV0aWwuZXZlbnRQb3NpdGlvbihlKSBhcyBjZy5OdW1iZXJQYWlyLFxuICBvcmlnID0gYm9hcmQuZ2V0S2V5QXREb21Qb3MocG9zaXRpb24sIGJvYXJkLndoaXRlUG92KHMpLCBib3VuZHMsIHMuZ2VvbWV0cnkpO1xuICBpZiAoIW9yaWcpIHJldHVybjtcbiAgY29uc3QgcGllY2UgPSBzLnBpZWNlc1tvcmlnXTtcbiAgY29uc3QgcHJldmlvdXNseVNlbGVjdGVkID0gcy5zZWxlY3RlZDtcbiAgaWYgKCFwcmV2aW91c2x5U2VsZWN0ZWQgJiYgcy5kcmF3YWJsZS5lbmFibGVkICYmIChcbiAgICBzLmRyYXdhYmxlLmVyYXNlT25DbGljayB8fCAoIXBpZWNlIHx8IHBpZWNlLmNvbG9yICE9PSBzLnR1cm5Db2xvcilcbiAgKSkgZHJhd0NsZWFyKHMpO1xuICAvLyBQcmV2ZW50IHRvdWNoIHNjcm9sbCBhbmQgY3JlYXRlIG5vIGNvcnJlc3BvbmRpbmcgbW91c2UgZXZlbnQsIGlmIHRoZXJlXG4gIC8vIGlzIGFuIGludGVudCB0byBpbnRlcmFjdCB3aXRoIHRoZSBib2FyZC4gSWYgbm8gY29sb3IgaXMgbW92YWJsZVxuICAvLyAoYW5kIHRoZSBib2FyZCBpcyBub3QgZm9yIHZpZXdpbmcgb25seSksIHRvdWNoZXMgYXJlIGxpa2VseSBpbnRlbmRlZCB0b1xuICAvLyBzZWxlY3Qgc3F1YXJlcy5cbiAgaWYgKGUuY2FuY2VsYWJsZSAhPT0gZmFsc2UgJiZcbiAgICAgICghZS50b3VjaGVzIHx8ICFzLm1vdmFibGUuY29sb3IgfHwgcGllY2UgfHwgcHJldmlvdXNseVNlbGVjdGVkIHx8IHBpZWNlQ2xvc2VUbyhzLCBwb3NpdGlvbikpKVxuICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgY29uc3QgaGFkUHJlbW92ZSA9ICEhcy5wcmVtb3ZhYmxlLmN1cnJlbnQ7XG4gIGNvbnN0IGhhZFByZWRyb3AgPSAhIXMucHJlZHJvcHBhYmxlLmN1cnJlbnQ7XG4gIHMuc3RhdHMuY3RybEtleSA9IGUuY3RybEtleTtcbiAgaWYgKHMuc2VsZWN0ZWQgJiYgYm9hcmQuY2FuTW92ZShzLCBzLnNlbGVjdGVkLCBvcmlnKSkge1xuICAgIGFuaW0oc3RhdGUgPT4gYm9hcmQuc2VsZWN0U3F1YXJlKHN0YXRlLCBvcmlnKSwgcyk7XG4gIH0gZWxzZSB7XG4gICAgYm9hcmQuc2VsZWN0U3F1YXJlKHMsIG9yaWcpO1xuICB9XG4gIGNvbnN0IHN0aWxsU2VsZWN0ZWQgPSBzLnNlbGVjdGVkID09PSBvcmlnO1xuICBjb25zdCBlbGVtZW50ID0gcGllY2VFbGVtZW50QnlLZXkocywgb3JpZyk7XG4gIGNvbnN0IGZpcnN0UmFua0lzMCA9IHMuZGltZW5zaW9ucy5oZWlnaHQgPT09IDEwO1xuICBpZiAocGllY2UgJiYgZWxlbWVudCAmJiBzdGlsbFNlbGVjdGVkICYmIGJvYXJkLmlzRHJhZ2dhYmxlKHMsIG9yaWcpKSB7XG4gICAgY29uc3Qgc3F1YXJlQm91bmRzID0gY29tcHV0ZVNxdWFyZUJvdW5kcyhvcmlnLCBib2FyZC53aGl0ZVBvdihzKSwgYm91bmRzLCBzLmRpbWVuc2lvbnMpO1xuICAgIHMuZHJhZ2dhYmxlLmN1cnJlbnQgPSB7XG4gICAgICBvcmlnLFxuICAgICAgb3JpZ1BvczogdXRpbC5rZXkycG9zKG9yaWcsIGZpcnN0UmFua0lzMCksXG4gICAgICBwaWVjZSxcbiAgICAgIHJlbDogcG9zaXRpb24sXG4gICAgICBlcG9zOiBwb3NpdGlvbixcbiAgICAgIHBvczogWzAsIDBdLFxuICAgICAgZGVjOiBzLmRyYWdnYWJsZS5jZW50ZXJQaWVjZSA/IFtcbiAgICAgICAgcG9zaXRpb25bMF0gLSAoc3F1YXJlQm91bmRzLmxlZnQgKyBzcXVhcmVCb3VuZHMud2lkdGggLyAyKSxcbiAgICAgICAgcG9zaXRpb25bMV0gLSAoc3F1YXJlQm91bmRzLnRvcCArIHNxdWFyZUJvdW5kcy5oZWlnaHQgLyAyKVxuICAgICAgXSA6IFswLCAwXSxcbiAgICAgIHN0YXJ0ZWQ6IHMuZHJhZ2dhYmxlLmF1dG9EaXN0YW5jZSAmJiBzLnN0YXRzLmRyYWdnZWQsXG4gICAgICBlbGVtZW50LFxuICAgICAgcHJldmlvdXNseVNlbGVjdGVkLFxuICAgICAgb3JpZ2luVGFyZ2V0OiBlLnRhcmdldFxuICAgIH07XG4gICAgZWxlbWVudC5jZ0RyYWdnaW5nID0gdHJ1ZTtcbiAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2RyYWdnaW5nJyk7XG4gICAgLy8gcGxhY2UgZ2hvc3RcbiAgICBjb25zdCBnaG9zdCA9IHMuZG9tLmVsZW1lbnRzLmdob3N0O1xuICAgIGlmIChnaG9zdCkge1xuICAgICAgZ2hvc3QuY2xhc3NOYW1lID0gYGdob3N0ICR7cGllY2UuY29sb3J9ICR7cGllY2Uucm9sZX1gO1xuICAgICAgdXRpbC50cmFuc2xhdGVBYnMoZ2hvc3QsIHV0aWwucG9zVG9UcmFuc2xhdGVBYnMoYm91bmRzLCBzLmRpbWVuc2lvbnMpKHV0aWwua2V5MnBvcyhvcmlnLCBmaXJzdFJhbmtJczApLCBib2FyZC53aGl0ZVBvdihzKSkpO1xuICAgICAgdXRpbC5zZXRWaXNpYmxlKGdob3N0LCB0cnVlKTtcbiAgICB9XG4gICAgcHJvY2Vzc0RyYWcocyk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKGhhZFByZW1vdmUpIGJvYXJkLnVuc2V0UHJlbW92ZShzKTtcbiAgICBpZiAoaGFkUHJlZHJvcCkgYm9hcmQudW5zZXRQcmVkcm9wKHMpO1xuICB9XG4gIHMuZG9tLnJlZHJhdygpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGllY2VDbG9zZVRvKHM6IFN0YXRlLCBwb3M6IGNnLk51bWJlclBhaXIpOiBib29sZWFuIHtcbiAgY29uc3QgYXNXaGl0ZSA9IGJvYXJkLndoaXRlUG92KHMpLFxuICBib3VuZHMgPSBzLmRvbS5ib3VuZHMoKSxcbiAgcmFkaXVzU3EgPSBNYXRoLnBvdyhib3VuZHMud2lkdGggLyA4LCAyKTtcbiAgZm9yIChsZXQga2V5IGluIHMucGllY2VzKSB7XG4gICAgY29uc3Qgc3F1YXJlQm91bmRzID0gY29tcHV0ZVNxdWFyZUJvdW5kcyhrZXkgYXMgY2cuS2V5LCBhc1doaXRlLCBib3VuZHMsIHMuZGltZW5zaW9ucyksXG4gICAgY2VudGVyOiBjZy5OdW1iZXJQYWlyID0gW1xuICAgICAgc3F1YXJlQm91bmRzLmxlZnQgKyBzcXVhcmVCb3VuZHMud2lkdGggLyAyLFxuICAgICAgc3F1YXJlQm91bmRzLnRvcCArIHNxdWFyZUJvdW5kcy5oZWlnaHQgLyAyXG4gICAgXTtcbiAgICBpZiAodXRpbC5kaXN0YW5jZVNxKGNlbnRlciwgcG9zKSA8PSByYWRpdXNTcSkgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZHJhZ05ld1BpZWNlKHM6IFN0YXRlLCBwaWVjZTogY2cuUGllY2UsIGU6IGNnLk1vdWNoRXZlbnQsIGZvcmNlPzogYm9vbGVhbik6IHZvaWQge1xuXG4gIGNvbnN0IGtleTogY2cuS2V5ID0gJ3owJztcblxuICBzLnBpZWNlc1trZXldID0gcGllY2U7XG5cbiAgcy5kb20ucmVkcmF3KCk7XG5cbiAgY29uc3QgcG9zaXRpb24gPSB1dGlsLmV2ZW50UG9zaXRpb24oZSkgYXMgY2cuTnVtYmVyUGFpcixcbiAgYXNXaGl0ZSA9IGJvYXJkLndoaXRlUG92KHMpLFxuICBib3VuZHMgPSBzLmRvbS5ib3VuZHMoKSxcbiAgc3F1YXJlQm91bmRzID0gY29tcHV0ZVNxdWFyZUJvdW5kcyhrZXksIGFzV2hpdGUsIGJvdW5kcywgcy5kaW1lbnNpb25zKTtcblxuICBjb25zdCByZWw6IGNnLk51bWJlclBhaXIgPSBbXG4gICAgKGFzV2hpdGUgPyAwIDogcy5kaW1lbnNpb25zLndpZHRoIC0gMSkgKiBzcXVhcmVCb3VuZHMud2lkdGggKyBib3VuZHMubGVmdCxcbiAgICAoYXNXaGl0ZSA/IHMuZGltZW5zaW9ucy5oZWlnaHQgOiAtMSkgKiBzcXVhcmVCb3VuZHMuaGVpZ2h0ICsgYm91bmRzLnRvcFxuICBdO1xuXG4gIHMuZHJhZ2dhYmxlLmN1cnJlbnQgPSB7XG4gICAgb3JpZzoga2V5LFxuICAgIG9yaWdQb3M6IHV0aWwua2V5MnBvcygnYTAnLCBmYWxzZSksXG4gICAgcGllY2UsXG4gICAgcmVsLFxuICAgIGVwb3M6IHBvc2l0aW9uLFxuICAgIHBvczogW3Bvc2l0aW9uWzBdIC0gcmVsWzBdLCBwb3NpdGlvblsxXSAtIHJlbFsxXV0sXG4gICAgZGVjOiBbLXNxdWFyZUJvdW5kcy53aWR0aCAvIDIsIC1zcXVhcmVCb3VuZHMuaGVpZ2h0IC8gMl0sXG4gICAgc3RhcnRlZDogdHJ1ZSxcbiAgICBlbGVtZW50OiAoKSA9PiBwaWVjZUVsZW1lbnRCeUtleShzLCBrZXkpLFxuICAgIG9yaWdpblRhcmdldDogZS50YXJnZXQsXG4gICAgbmV3UGllY2U6IHRydWUsXG4gICAgZm9yY2U6ICEhZm9yY2VcbiAgfTtcbiAgcHJvY2Vzc0RyYWcocyk7XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NEcmFnKHM6IFN0YXRlKTogdm9pZCB7XG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgY29uc3QgY3VyID0gcy5kcmFnZ2FibGUuY3VycmVudDtcbiAgICBpZiAoIWN1cikgcmV0dXJuO1xuICAgIC8vIGNhbmNlbCBhbmltYXRpb25zIHdoaWxlIGRyYWdnaW5nXG4gICAgaWYgKHMuYW5pbWF0aW9uLmN1cnJlbnQgJiYgcy5hbmltYXRpb24uY3VycmVudC5wbGFuLmFuaW1zW2N1ci5vcmlnXSkgcy5hbmltYXRpb24uY3VycmVudCA9IHVuZGVmaW5lZDtcbiAgICAvLyBpZiBtb3ZpbmcgcGllY2UgaXMgZ29uZSwgY2FuY2VsXG4gICAgY29uc3Qgb3JpZ1BpZWNlID0gcy5waWVjZXNbY3VyLm9yaWddO1xuICAgIGlmICghb3JpZ1BpZWNlIHx8ICF1dGlsLnNhbWVQaWVjZShvcmlnUGllY2UsIGN1ci5waWVjZSkpIGNhbmNlbChzKTtcbiAgICBlbHNlIHtcbiAgICAgIGlmICghY3VyLnN0YXJ0ZWQgJiYgdXRpbC5kaXN0YW5jZVNxKGN1ci5lcG9zLCBjdXIucmVsKSA+PSBNYXRoLnBvdyhzLmRyYWdnYWJsZS5kaXN0YW5jZSwgMikpIGN1ci5zdGFydGVkID0gdHJ1ZTtcbiAgICAgIGlmIChjdXIuc3RhcnRlZCkge1xuXG4gICAgICAgIC8vIHN1cHBvcnQgbGF6eSBlbGVtZW50c1xuICAgICAgICBpZiAodHlwZW9mIGN1ci5lbGVtZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgY29uc3QgZm91bmQgPSBjdXIuZWxlbWVudCgpO1xuICAgICAgICAgIGlmICghZm91bmQpIHJldHVybjtcbiAgICAgICAgICBmb3VuZC5jZ0RyYWdnaW5nID0gdHJ1ZTtcbiAgICAgICAgICBmb3VuZC5jbGFzc0xpc3QuYWRkKCdkcmFnZ2luZycpO1xuICAgICAgICAgIGN1ci5lbGVtZW50ID0gZm91bmQ7XG4gICAgICAgIH1cblxuICAgICAgICBjdXIucG9zID0gW1xuICAgICAgICAgIGN1ci5lcG9zWzBdIC0gY3VyLnJlbFswXSxcbiAgICAgICAgICBjdXIuZXBvc1sxXSAtIGN1ci5yZWxbMV1cbiAgICAgICAgXTtcblxuICAgICAgICAvLyBtb3ZlIHBpZWNlXG4gICAgICAgIGNvbnN0IHRyYW5zbGF0aW9uID0gdXRpbC5wb3NUb1RyYW5zbGF0ZUFicyhzLmRvbS5ib3VuZHMoKSwgcy5kaW1lbnNpb25zKShjdXIub3JpZ1BvcywgYm9hcmQud2hpdGVQb3YocykpO1xuICAgICAgICB0cmFuc2xhdGlvblswXSArPSBjdXIucG9zWzBdICsgY3VyLmRlY1swXTtcbiAgICAgICAgdHJhbnNsYXRpb25bMV0gKz0gY3VyLnBvc1sxXSArIGN1ci5kZWNbMV07XG4gICAgICAgIHV0aWwudHJhbnNsYXRlQWJzKGN1ci5lbGVtZW50LCB0cmFuc2xhdGlvbik7XG4gICAgICB9XG4gICAgfVxuICAgIHByb2Nlc3NEcmFnKHMpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1vdmUoczogU3RhdGUsIGU6IGNnLk1vdWNoRXZlbnQpOiB2b2lkIHtcbiAgLy8gc3VwcG9ydCBvbmUgZmluZ2VyIHRvdWNoIG9ubHlcbiAgaWYgKHMuZHJhZ2dhYmxlLmN1cnJlbnQgJiYgKCFlLnRvdWNoZXMgfHwgZS50b3VjaGVzLmxlbmd0aCA8IDIpKSB7XG4gICAgcy5kcmFnZ2FibGUuY3VycmVudC5lcG9zID0gdXRpbC5ldmVudFBvc2l0aW9uKGUpIGFzIGNnLk51bWJlclBhaXI7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVuZChzOiBTdGF0ZSwgZTogY2cuTW91Y2hFdmVudCk6IHZvaWQge1xuICBjb25zdCBjdXIgPSBzLmRyYWdnYWJsZS5jdXJyZW50O1xuICBpZiAoIWN1cikgcmV0dXJuO1xuICAvLyBjcmVhdGUgbm8gY29ycmVzcG9uZGluZyBtb3VzZSBldmVudFxuICBpZiAoZS50eXBlID09PSAndG91Y2hlbmQnICYmIGUuY2FuY2VsYWJsZSAhPT0gZmFsc2UpIGUucHJldmVudERlZmF1bHQoKTtcbiAgLy8gY29tcGFyaW5nIHdpdGggdGhlIG9yaWdpbiB0YXJnZXQgaXMgYW4gZWFzeSB3YXkgdG8gdGVzdCB0aGF0IHRoZSBlbmQgZXZlbnRcbiAgLy8gaGFzIHRoZSBzYW1lIHRvdWNoIG9yaWdpblxuICBpZiAoZS50eXBlID09PSAndG91Y2hlbmQnICYmIGN1ciAmJiBjdXIub3JpZ2luVGFyZ2V0ICE9PSBlLnRhcmdldCAmJiAhY3VyLm5ld1BpZWNlKSB7XG4gICAgcy5kcmFnZ2FibGUuY3VycmVudCA9IHVuZGVmaW5lZDtcbiAgICByZXR1cm47XG4gIH1cbiAgYm9hcmQudW5zZXRQcmVtb3ZlKHMpO1xuICBib2FyZC51bnNldFByZWRyb3Aocyk7XG4gIC8vIHRvdWNoZW5kIGhhcyBubyBwb3NpdGlvbjsgc28gdXNlIHRoZSBsYXN0IHRvdWNobW92ZSBwb3NpdGlvbiBpbnN0ZWFkXG4gIGNvbnN0IGV2ZW50UG9zOiBjZy5OdW1iZXJQYWlyID0gdXRpbC5ldmVudFBvc2l0aW9uKGUpIHx8IGN1ci5lcG9zO1xuICBjb25zdCBkZXN0ID0gYm9hcmQuZ2V0S2V5QXREb21Qb3MoZXZlbnRQb3MsIGJvYXJkLndoaXRlUG92KHMpLCBzLmRvbS5ib3VuZHMoKSwgcy5nZW9tZXRyeSk7XG4gIGlmIChkZXN0ICYmIGN1ci5zdGFydGVkICYmIGN1ci5vcmlnICE9PSBkZXN0KSB7XG4gICAgaWYgKGN1ci5uZXdQaWVjZSkgYm9hcmQuZHJvcE5ld1BpZWNlKHMsIGN1ci5vcmlnLCBkZXN0LCBjdXIuZm9yY2UpO1xuICAgIGVsc2Uge1xuICAgICAgcy5zdGF0cy5jdHJsS2V5ID0gZS5jdHJsS2V5O1xuICAgICAgaWYgKGJvYXJkLnVzZXJNb3ZlKHMsIGN1ci5vcmlnLCBkZXN0KSkgcy5zdGF0cy5kcmFnZ2VkID0gdHJ1ZTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoY3VyLm5ld1BpZWNlKSB7XG4gICAgZGVsZXRlIHMucGllY2VzW2N1ci5vcmlnXTtcbiAgfSBlbHNlIGlmIChzLmRyYWdnYWJsZS5kZWxldGVPbkRyb3BPZmYgJiYgIWRlc3QpIHtcbiAgICBkZWxldGUgcy5waWVjZXNbY3VyLm9yaWddO1xuICAgIGJvYXJkLmNhbGxVc2VyRnVuY3Rpb24ocy5ldmVudHMuY2hhbmdlKTtcbiAgfVxuICBpZiAoY3VyICYmIGN1ci5vcmlnID09PSBjdXIucHJldmlvdXNseVNlbGVjdGVkICYmIChjdXIub3JpZyA9PT0gZGVzdCB8fCAhZGVzdCkpXG4gICAgYm9hcmQudW5zZWxlY3Qocyk7XG4gIGVsc2UgaWYgKCFzLnNlbGVjdGFibGUuZW5hYmxlZCkgYm9hcmQudW5zZWxlY3Qocyk7XG5cbiAgcmVtb3ZlRHJhZ0VsZW1lbnRzKHMpO1xuXG4gIHMuZHJhZ2dhYmxlLmN1cnJlbnQgPSB1bmRlZmluZWQ7XG4gIHMuZG9tLnJlZHJhdygpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2FuY2VsKHM6IFN0YXRlKTogdm9pZCB7XG4gIGNvbnN0IGN1ciA9IHMuZHJhZ2dhYmxlLmN1cnJlbnQ7XG4gIGlmIChjdXIpIHtcbiAgICBpZiAoY3VyLm5ld1BpZWNlKSBkZWxldGUgcy5waWVjZXNbY3VyLm9yaWddO1xuICAgIHMuZHJhZ2dhYmxlLmN1cnJlbnQgPSB1bmRlZmluZWQ7XG4gICAgYm9hcmQudW5zZWxlY3Qocyk7XG4gICAgcmVtb3ZlRHJhZ0VsZW1lbnRzKHMpO1xuICAgIHMuZG9tLnJlZHJhdygpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZURyYWdFbGVtZW50cyhzOiBTdGF0ZSkge1xuICBjb25zdCBlID0gcy5kb20uZWxlbWVudHM7XG4gIGlmIChlLmdob3N0KSB1dGlsLnNldFZpc2libGUoZS5naG9zdCwgZmFsc2UpO1xufVxuXG5mdW5jdGlvbiBjb21wdXRlU3F1YXJlQm91bmRzKGtleTogY2cuS2V5LCBhc1doaXRlOiBib29sZWFuLCBib3VuZHM6IENsaWVudFJlY3QsIGJkOiBjZy5Cb2FyZERpbWVuc2lvbnMpIHtcbiAgY29uc3QgZmlyc3RSYW5rSXMwID0gYmQuaGVpZ2h0ID09PSAxMDtcbiAgY29uc3QgcG9zID0gdXRpbC5rZXkycG9zKGtleSwgZmlyc3RSYW5rSXMwKTtcbiAgaWYgKCFhc1doaXRlKSB7XG4gICAgcG9zWzBdID0gYmQud2lkdGggKyAxIC0gcG9zWzBdO1xuICAgIHBvc1sxXSA9IGJkLmhlaWdodCArIDEgLSBwb3NbMV07XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBsZWZ0OiBib3VuZHMubGVmdCArIGJvdW5kcy53aWR0aCAqIChwb3NbMF0gLSAxKSAvIGJkLndpZHRoLFxuICAgIHRvcDogYm91bmRzLnRvcCArIGJvdW5kcy5oZWlnaHQgKiAoYmQuaGVpZ2h0IC0gcG9zWzFdKSAvIGJkLmhlaWdodCxcbiAgICB3aWR0aDogYm91bmRzLndpZHRoIC8gYmQud2lkdGgsXG4gICAgaGVpZ2h0OiBib3VuZHMuaGVpZ2h0IC8gYmQuaGVpZ2h0XG4gIH07XG59XG5cbmZ1bmN0aW9uIHBpZWNlRWxlbWVudEJ5S2V5KHM6IFN0YXRlLCBrZXk6IGNnLktleSk6IGNnLlBpZWNlTm9kZSB8IHVuZGVmaW5lZCB7XG4gIGxldCBlbCA9IHMuZG9tLmVsZW1lbnRzLmJvYXJkLmZpcnN0Q2hpbGQgYXMgY2cuUGllY2VOb2RlO1xuICB3aGlsZSAoZWwpIHtcbiAgICBpZiAoZWwuY2dLZXkgPT09IGtleSAmJiBlbC50YWdOYW1lID09PSAnUElFQ0UnKSByZXR1cm4gZWw7XG4gICAgZWwgPSBlbC5uZXh0U2libGluZyBhcyBjZy5QaWVjZU5vZGU7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCB7IHVuc2VsZWN0LCBjYW5jZWxNb3ZlLCBnZXRLZXlBdERvbVBvcywgd2hpdGVQb3YgfSBmcm9tICcuL2JvYXJkJ1xuaW1wb3J0IHsgZXZlbnRQb3NpdGlvbiwgaXNSaWdodEJ1dHRvbiB9IGZyb20gJy4vdXRpbCdcbmltcG9ydCAqIGFzIGNnIGZyb20gJy4vdHlwZXMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgRHJhd1NoYXBlIHtcbiAgb3JpZzogY2cuS2V5O1xuICBkZXN0PzogY2cuS2V5O1xuICBicnVzaDogc3RyaW5nO1xuICBtb2RpZmllcnM/OiBEcmF3TW9kaWZpZXJzO1xuICBwaWVjZT86IERyYXdTaGFwZVBpZWNlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERyYXdTaGFwZVBpZWNlIHtcbiAgcm9sZTogY2cuUm9sZTtcbiAgY29sb3I6IGNnLkNvbG9yO1xuICBzY2FsZT86IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEcmF3QnJ1c2gge1xuICBrZXk6IHN0cmluZztcbiAgY29sb3I6IHN0cmluZztcbiAgb3BhY2l0eTogbnVtYmVyO1xuICBsaW5lV2lkdGg6IG51bWJlclxufVxuXG5leHBvcnQgaW50ZXJmYWNlIERyYXdCcnVzaGVzIHtcbiAgW25hbWU6IHN0cmluZ106IERyYXdCcnVzaDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEcmF3TW9kaWZpZXJzIHtcbiAgbGluZVdpZHRoPzogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERyYXdhYmxlIHtcbiAgZW5hYmxlZDogYm9vbGVhbjsgLy8gY2FuIGRyYXdcbiAgdmlzaWJsZTogYm9vbGVhbjsgLy8gY2FuIHZpZXdcbiAgZXJhc2VPbkNsaWNrOiBib29sZWFuO1xuICBvbkNoYW5nZT86IChzaGFwZXM6IERyYXdTaGFwZVtdKSA9PiB2b2lkO1xuICBzaGFwZXM6IERyYXdTaGFwZVtdOyAvLyB1c2VyIHNoYXBlc1xuICBhdXRvU2hhcGVzOiBEcmF3U2hhcGVbXTsgLy8gY29tcHV0ZXIgc2hhcGVzXG4gIGN1cnJlbnQ/OiBEcmF3Q3VycmVudDtcbiAgYnJ1c2hlczogRHJhd0JydXNoZXM7XG4gIC8vIGRyYXdhYmxlIFNWRyBwaWVjZXM7IHVzZWQgZm9yIGNyYXp5aG91c2UgZHJvcFxuICBwaWVjZXM6IHtcbiAgICBiYXNlVXJsOiBzdHJpbmdcbiAgfSxcbiAgcHJldlN2Z0hhc2g6IHN0cmluZ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERyYXdDdXJyZW50IHtcbiAgb3JpZzogY2cuS2V5OyAvLyBvcmlnIGtleSBvZiBkcmF3aW5nXG4gIGRlc3Q/OiBjZy5LZXk7IC8vIHNoYXBlIGRlc3QsIG9yIHVuZGVmaW5lZCBmb3IgY2lyY2xlXG4gIG1vdXNlU3E/OiBjZy5LZXk7IC8vIHNxdWFyZSBiZWluZyBtb3VzZWQgb3ZlclxuICBwb3M6IGNnLk51bWJlclBhaXI7IC8vIHJlbGF0aXZlIGN1cnJlbnQgcG9zaXRpb25cbiAgYnJ1c2g6IHN0cmluZzsgLy8gYnJ1c2ggbmFtZSBmb3Igc2hhcGVcbn1cblxuY29uc3QgYnJ1c2hlcyA9IFsnZ3JlZW4nLCAncmVkJywgJ2JsdWUnLCAneWVsbG93J107XG5cbmV4cG9ydCBmdW5jdGlvbiBzdGFydChzdGF0ZTogU3RhdGUsIGU6IGNnLk1vdWNoRXZlbnQpOiB2b2lkIHtcbiAgaWYgKGUudG91Y2hlcyAmJiBlLnRvdWNoZXMubGVuZ3RoID4gMSkgcmV0dXJuOyAvLyBzdXBwb3J0IG9uZSBmaW5nZXIgdG91Y2ggb25seVxuICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIGUuY3RybEtleSA/IHVuc2VsZWN0KHN0YXRlKSA6IGNhbmNlbE1vdmUoc3RhdGUpO1xuICBjb25zdCBwb3MgPSBldmVudFBvc2l0aW9uKGUpIGFzIGNnLk51bWJlclBhaXIsXG4gIG9yaWcgPSBnZXRLZXlBdERvbVBvcyhwb3MsIHdoaXRlUG92KHN0YXRlKSwgc3RhdGUuZG9tLmJvdW5kcygpLCBzdGF0ZS5nZW9tZXRyeSk7XG4gIGlmICghb3JpZykgcmV0dXJuO1xuICBzdGF0ZS5kcmF3YWJsZS5jdXJyZW50ID0ge1xuICAgIG9yaWcsXG4gICAgcG9zLFxuICAgIGJydXNoOiBldmVudEJydXNoKGUpXG4gIH07XG4gIHByb2Nlc3NEcmF3KHN0YXRlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByb2Nlc3NEcmF3KHN0YXRlOiBTdGF0ZSk6IHZvaWQge1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgIGNvbnN0IGN1ciA9IHN0YXRlLmRyYXdhYmxlLmN1cnJlbnQ7XG4gICAgaWYgKGN1cikge1xuICAgICAgY29uc3QgbW91c2VTcSA9IGdldEtleUF0RG9tUG9zKGN1ci5wb3MsIHdoaXRlUG92KHN0YXRlKSwgc3RhdGUuZG9tLmJvdW5kcygpLCBzdGF0ZS5nZW9tZXRyeSk7XG4gICAgICBpZiAobW91c2VTcSAhPT0gY3VyLm1vdXNlU3EpIHtcbiAgICAgICAgY3VyLm1vdXNlU3EgPSBtb3VzZVNxO1xuICAgICAgICBjdXIuZGVzdCA9IG1vdXNlU3EgIT09IGN1ci5vcmlnID8gbW91c2VTcSA6IHVuZGVmaW5lZDtcbiAgICAgICAgc3RhdGUuZG9tLnJlZHJhd05vdygpO1xuICAgICAgfVxuICAgICAgcHJvY2Vzc0RyYXcoc3RhdGUpO1xuICAgIH1cbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtb3ZlKHN0YXRlOiBTdGF0ZSwgZTogY2cuTW91Y2hFdmVudCk6IHZvaWQge1xuICBpZiAoc3RhdGUuZHJhd2FibGUuY3VycmVudCkgc3RhdGUuZHJhd2FibGUuY3VycmVudC5wb3MgPSBldmVudFBvc2l0aW9uKGUpIGFzIGNnLk51bWJlclBhaXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlbmQoc3RhdGU6IFN0YXRlKTogdm9pZCB7XG4gIGNvbnN0IGN1ciA9IHN0YXRlLmRyYXdhYmxlLmN1cnJlbnQ7XG4gIGlmIChjdXIpIHtcbiAgICBpZiAoY3VyLm1vdXNlU3EpIGFkZFNoYXBlKHN0YXRlLmRyYXdhYmxlLCBjdXIpO1xuICAgIGNhbmNlbChzdGF0ZSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbmNlbChzdGF0ZTogU3RhdGUpOiB2b2lkIHtcbiAgaWYgKHN0YXRlLmRyYXdhYmxlLmN1cnJlbnQpIHtcbiAgICBzdGF0ZS5kcmF3YWJsZS5jdXJyZW50ID0gdW5kZWZpbmVkO1xuICAgIHN0YXRlLmRvbS5yZWRyYXcoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xlYXIoc3RhdGU6IFN0YXRlKTogdm9pZCB7XG4gIGlmIChzdGF0ZS5kcmF3YWJsZS5zaGFwZXMubGVuZ3RoKSB7XG4gICAgc3RhdGUuZHJhd2FibGUuc2hhcGVzID0gW107XG4gICAgc3RhdGUuZG9tLnJlZHJhdygpO1xuICAgIG9uQ2hhbmdlKHN0YXRlLmRyYXdhYmxlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBldmVudEJydXNoKGU6IGNnLk1vdWNoRXZlbnQpOiBzdHJpbmcge1xuICByZXR1cm4gYnJ1c2hlc1soKGUuc2hpZnRLZXkgfHwgZS5jdHJsS2V5KSAmJiBpc1JpZ2h0QnV0dG9uKGUpID8gMSA6IDApICsgKGUuYWx0S2V5ID8gMiA6IDApXTtcbn1cblxuZnVuY3Rpb24gYWRkU2hhcGUoZHJhd2FibGU6IERyYXdhYmxlLCBjdXI6IERyYXdDdXJyZW50KTogdm9pZCB7XG4gIGNvbnN0IHNhbWVTaGFwZSA9IChzOiBEcmF3U2hhcGUpID0+IHMub3JpZyA9PT0gY3VyLm9yaWcgJiYgcy5kZXN0ID09PSBjdXIuZGVzdDtcbiAgY29uc3Qgc2ltaWxhciA9IGRyYXdhYmxlLnNoYXBlcy5maWx0ZXIoc2FtZVNoYXBlKVswXTtcbiAgaWYgKHNpbWlsYXIpIGRyYXdhYmxlLnNoYXBlcyA9IGRyYXdhYmxlLnNoYXBlcy5maWx0ZXIocyA9PiAhc2FtZVNoYXBlKHMpKTtcbiAgaWYgKCFzaW1pbGFyIHx8IHNpbWlsYXIuYnJ1c2ggIT09IGN1ci5icnVzaCkgZHJhd2FibGUuc2hhcGVzLnB1c2goY3VyKTtcbiAgb25DaGFuZ2UoZHJhd2FibGUpO1xufVxuXG5mdW5jdGlvbiBvbkNoYW5nZShkcmF3YWJsZTogRHJhd2FibGUpOiB2b2lkIHtcbiAgaWYgKGRyYXdhYmxlLm9uQ2hhbmdlKSBkcmF3YWJsZS5vbkNoYW5nZShkcmF3YWJsZS5zaGFwZXMpO1xufVxuIiwiaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJ1xuaW1wb3J0ICogYXMgY2cgZnJvbSAnLi90eXBlcydcbmltcG9ydCAqIGFzIGJvYXJkIGZyb20gJy4vYm9hcmQnXG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4vdXRpbCdcbmltcG9ydCB7IGNhbmNlbCBhcyBjYW5jZWxEcmFnIH0gZnJvbSAnLi9kcmFnJ1xuXG5leHBvcnQgZnVuY3Rpb24gc2V0RHJvcE1vZGUoczogU3RhdGUsIHBpZWNlPzogY2cuUGllY2UpOiB2b2lkIHtcbiAgcy5kcm9wbW9kZSA9IHtcbiAgICBhY3RpdmU6IHRydWUsXG4gICAgcGllY2VcbiAgfTtcbiAgY2FuY2VsRHJhZyhzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbmNlbERyb3BNb2RlKHM6IFN0YXRlKTogdm9pZCB7XG4gIHMuZHJvcG1vZGUgPSB7XG4gICAgYWN0aXZlOiBmYWxzZVxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZHJvcChzOiBTdGF0ZSwgZTogY2cuTW91Y2hFdmVudCk6IHZvaWQge1xuICBpZiAoIXMuZHJvcG1vZGUuYWN0aXZlKSByZXR1cm47XG5cbiAgYm9hcmQudW5zZXRQcmVtb3ZlKHMpO1xuICBib2FyZC51bnNldFByZWRyb3Aocyk7XG5cbiAgY29uc3QgcGllY2UgPSBzLmRyb3Btb2RlLnBpZWNlO1xuXG4gIGlmIChwaWVjZSkge1xuICAgIHMucGllY2VzLnowID0gcGllY2U7XG4gICAgY29uc3QgcG9zaXRpb24gPSB1dGlsLmV2ZW50UG9zaXRpb24oZSk7XG4gICAgY29uc3QgZGVzdCA9IHBvc2l0aW9uICYmIGJvYXJkLmdldEtleUF0RG9tUG9zKFxuICAgICAgcG9zaXRpb24sIGJvYXJkLndoaXRlUG92KHMpLCBzLmRvbS5ib3VuZHMoKSwgcy5nZW9tZXRyeSk7XG4gICAgaWYgKGRlc3QpIGJvYXJkLmRyb3BOZXdQaWVjZShzLCAnejAnLCBkZXN0KTtcbiAgfVxuICBzLmRvbS5yZWRyYXcoKTtcbn1cbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCAqIGFzIGRyYWcgZnJvbSAnLi9kcmFnJ1xuaW1wb3J0ICogYXMgZHJhdyBmcm9tICcuL2RyYXcnXG5pbXBvcnQgeyBkcm9wIH0gZnJvbSAnLi9kcm9wJ1xuaW1wb3J0IHsgaXNSaWdodEJ1dHRvbiB9IGZyb20gJy4vdXRpbCdcbmltcG9ydCAqIGFzIGNnIGZyb20gJy4vdHlwZXMnXG5cbnR5cGUgTW91Y2hCaW5kID0gKGU6IGNnLk1vdWNoRXZlbnQpID0+IHZvaWQ7XG50eXBlIFN0YXRlTW91Y2hCaW5kID0gKGQ6IFN0YXRlLCBlOiBjZy5Nb3VjaEV2ZW50KSA9PiB2b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gYmluZEJvYXJkKHM6IFN0YXRlKTogdm9pZCB7XG5cbiAgaWYgKHMudmlld09ubHkpIHJldHVybjtcblxuICBjb25zdCBib2FyZEVsID0gcy5kb20uZWxlbWVudHMuYm9hcmQsXG4gIG9uU3RhcnQgPSBzdGFydERyYWdPckRyYXcocyk7XG5cbiAgLy8gQ2Fubm90IGJlIHBhc3NpdmUsIGJlY2F1c2Ugd2UgcHJldmVudCB0b3VjaCBzY3JvbGxpbmcgYW5kIGRyYWdnaW5nIG9mXG4gIC8vIHNlbGVjdGVkIGVsZW1lbnRzLlxuICBib2FyZEVsLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBvblN0YXJ0IGFzIEV2ZW50TGlzdGVuZXIsIHsgcGFzc2l2ZTogZmFsc2UgfSk7XG4gIGJvYXJkRWwuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgb25TdGFydCBhcyBFdmVudExpc3RlbmVyLCB7IHBhc3NpdmU6IGZhbHNlIH0pO1xuXG4gIGlmIChzLmRpc2FibGVDb250ZXh0TWVudSB8fCBzLmRyYXdhYmxlLmVuYWJsZWQpIHtcbiAgICBib2FyZEVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgZSA9PiBlLnByZXZlbnREZWZhdWx0KCkpO1xuICB9XG59XG5cbi8vIHJldHVybnMgdGhlIHVuYmluZCBmdW5jdGlvblxuZXhwb3J0IGZ1bmN0aW9uIGJpbmREb2N1bWVudChzOiBTdGF0ZSwgcmVkcmF3QWxsOiBjZy5SZWRyYXcpOiBjZy5VbmJpbmQge1xuXG4gIGNvbnN0IHVuYmluZHM6IGNnLlVuYmluZFtdID0gW107XG5cbiAgaWYgKCFzLmRvbS5yZWxhdGl2ZSAmJiBzLnJlc2l6YWJsZSkge1xuICAgIGNvbnN0IG9uUmVzaXplID0gKCkgPT4ge1xuICAgICAgcy5kb20uYm91bmRzLmNsZWFyKCk7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUocmVkcmF3QWxsKTtcbiAgICB9O1xuICAgIHVuYmluZHMucHVzaCh1bmJpbmRhYmxlKGRvY3VtZW50LmJvZHksICdjaGVzc2dyb3VuZC5yZXNpemUnLCBvblJlc2l6ZSkpO1xuICB9XG5cbiAgaWYgKCFzLnZpZXdPbmx5KSB7XG5cbiAgICBjb25zdCBvbm1vdmU6IE1vdWNoQmluZCA9IGRyYWdPckRyYXcocywgZHJhZy5tb3ZlLCBkcmF3Lm1vdmUpO1xuICAgIGNvbnN0IG9uZW5kOiBNb3VjaEJpbmQgPSBkcmFnT3JEcmF3KHMsIGRyYWcuZW5kLCBkcmF3LmVuZCk7XG5cbiAgICBbJ3RvdWNobW92ZScsICdtb3VzZW1vdmUnXS5mb3JFYWNoKGV2ID0+IHVuYmluZHMucHVzaCh1bmJpbmRhYmxlKGRvY3VtZW50LCBldiwgb25tb3ZlKSkpO1xuICAgIFsndG91Y2hlbmQnLCAnbW91c2V1cCddLmZvckVhY2goZXYgPT4gdW5iaW5kcy5wdXNoKHVuYmluZGFibGUoZG9jdW1lbnQsIGV2LCBvbmVuZCkpKTtcblxuICAgIGNvbnN0IG9uU2Nyb2xsID0gKCkgPT4gcy5kb20uYm91bmRzLmNsZWFyKCk7XG4gICAgdW5iaW5kcy5wdXNoKHVuYmluZGFibGUod2luZG93LCAnc2Nyb2xsJywgb25TY3JvbGwsIHsgcGFzc2l2ZTogdHJ1ZSB9KSk7XG4gICAgdW5iaW5kcy5wdXNoKHVuYmluZGFibGUod2luZG93LCAncmVzaXplJywgb25TY3JvbGwsIHsgcGFzc2l2ZTogdHJ1ZSB9KSk7XG4gIH1cblxuICByZXR1cm4gKCkgPT4gdW5iaW5kcy5mb3JFYWNoKGYgPT4gZigpKTtcbn1cblxuZnVuY3Rpb24gdW5iaW5kYWJsZShlbDogRXZlbnRUYXJnZXQsIGV2ZW50TmFtZTogc3RyaW5nLCBjYWxsYmFjazogTW91Y2hCaW5kLCBvcHRpb25zPzogYW55KTogY2cuVW5iaW5kIHtcbiAgZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrIGFzIEV2ZW50TGlzdGVuZXIsIG9wdGlvbnMpO1xuICByZXR1cm4gKCkgPT4gZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrIGFzIEV2ZW50TGlzdGVuZXIpO1xufVxuXG5mdW5jdGlvbiBzdGFydERyYWdPckRyYXcoczogU3RhdGUpOiBNb3VjaEJpbmQge1xuICByZXR1cm4gZSA9PiB7XG4gICAgaWYgKHMuZHJhZ2dhYmxlLmN1cnJlbnQpIGRyYWcuY2FuY2VsKHMpO1xuICAgIGVsc2UgaWYgKHMuZHJhd2FibGUuY3VycmVudCkgZHJhdy5jYW5jZWwocyk7XG4gICAgZWxzZSBpZiAoZS5zaGlmdEtleSB8fCBpc1JpZ2h0QnV0dG9uKGUpKSB7IGlmIChzLmRyYXdhYmxlLmVuYWJsZWQpIGRyYXcuc3RhcnQocywgZSk7IH1cbiAgICBlbHNlIGlmICghcy52aWV3T25seSkge1xuICAgICAgaWYgKHMuZHJvcG1vZGUuYWN0aXZlKSBkcm9wKHMsIGUpO1xuICAgICAgZWxzZSBkcmFnLnN0YXJ0KHMsIGUpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gZHJhZ09yRHJhdyhzOiBTdGF0ZSwgd2l0aERyYWc6IFN0YXRlTW91Y2hCaW5kLCB3aXRoRHJhdzogU3RhdGVNb3VjaEJpbmQpOiBNb3VjaEJpbmQge1xuICByZXR1cm4gZSA9PiB7XG4gICAgaWYgKGUuc2hpZnRLZXkgfHwgaXNSaWdodEJ1dHRvbihlKSkgeyBpZiAocy5kcmF3YWJsZS5lbmFibGVkKSB3aXRoRHJhdyhzLCBlKTsgfVxuICAgIGVsc2UgaWYgKCFzLnZpZXdPbmx5KSB3aXRoRHJhZyhzLCBlKTtcbiAgfTtcbn1cbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCB7IEtleSB9IGZyb20gJy4vdHlwZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGV4cGxvc2lvbihzdGF0ZTogU3RhdGUsIGtleXM6IEtleVtdKTogdm9pZCB7XG4gIHN0YXRlLmV4cGxvZGluZyA9IHsgc3RhZ2U6IDEsIGtleXMgfTtcbiAgc3RhdGUuZG9tLnJlZHJhdygpO1xuICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICBzZXRTdGFnZShzdGF0ZSwgMik7XG4gICAgc2V0VGltZW91dCgoKSA9PiBzZXRTdGFnZShzdGF0ZSwgdW5kZWZpbmVkKSwgMTIwKTtcbiAgfSwgMTIwKTtcbn1cblxuZnVuY3Rpb24gc2V0U3RhZ2Uoc3RhdGU6IFN0YXRlLCBzdGFnZTogbnVtYmVyIHwgdW5kZWZpbmVkKTogdm9pZCB7XG4gIGlmIChzdGF0ZS5leHBsb2RpbmcpIHtcbiAgICBpZiAoc3RhZ2UpIHN0YXRlLmV4cGxvZGluZy5zdGFnZSA9IHN0YWdlO1xuICAgIGVsc2Ugc3RhdGUuZXhwbG9kaW5nID0gdW5kZWZpbmVkO1xuICAgIHN0YXRlLmRvbS5yZWRyYXcoKTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgcG9zMmtleSwgTlJhbmtzLCBpbnZOUmFua3MgfSBmcm9tICcuL3V0aWwnXG5pbXBvcnQgKiBhcyBjZyBmcm9tICcuL3R5cGVzJ1xuXG5leHBvcnQgY29uc3QgaW5pdGlhbDogY2cuRkVOID0gJ3JuYnFrYm5yL3BwcHBwcHBwLzgvOC84LzgvUFBQUFBQUFAvUk5CUUtCTlInO1xuXG5jb25zdCByb2xlc1ZhcmlhbnRzOiB7IFtsZXR0ZXI6IHN0cmluZ106IGNnLlJvbGUgfSA9IHtcbiAgICBwOiAncGF3bicsIHI6ICdyb29rJywgbjogJ2tuaWdodCcsIGI6ICdiaXNob3AnLCBxOiAncXVlZW4nLCBrOiAna2luZycsXG4gICAgbTogJ21ldCcsIGY6ICdmZXJ6JywgczogJ3NpbHZlcicsIGM6ICdjaGFuY2VsbG9yJywgYTogJ2FyY2hiaXNob3AnLFxuICAgIGg6ICdoYXdrJywgZTogJ2VsZXBoYW50JywgeTogJ3l1cnQnLCBsOiAnbGFuY2VyJywgdTogJ3VuaWNvcm4nLCBkOiAnZHJhZ29uJywgbzogJ2Nhbm5vbid9O1xuLy8gc2hvZ2lcbmNvbnN0IHJvbGVzU2hvZ2k6IHsgW2xldHRlcjogc3RyaW5nXTogY2cuUm9sZSB9ID0ge1xuICAgIHA6ICdwYXduJywgcjogJ3Jvb2snLCBuOiAna25pZ2h0JywgYjogJ2Jpc2hvcCcsIGs6ICdraW5nJywgZzogJ2dvbGQnLCBzOiAnc2lsdmVyJywgbDogJ2xhbmNlJyB9O1xuLy8gZG9idXRzdVxuY29uc3Qgcm9sZXNEb2J1dHN1OiB7IFtsZXR0ZXI6IHN0cmluZ106IGNnLlJvbGUgfSA9IHtcbiAgICBjOiAnY2hhbmNlbGxvcicsIGU6ICdlbGVwaGFudCcsIGw6ICdraW5nJywgZzogJ2dvbGQnLCBoOiAnaGF3aycgfTtcbi8vIHhpYW5ncWlcbmNvbnN0IHJvbGVzWGlhbmdxaTogeyBbbGV0dGVyOiBzdHJpbmddOiBjZy5Sb2xlIH0gPSB7XG4gICAgcDogJ3Bhd24nLCByOiAncm9vaycsIG46ICdrbmlnaHQnLCBiOiAnYmlzaG9wJywgazogJ2tpbmcnLCBjOiAnY2Fubm9uJywgYTogJ2Fkdmlzb3InLCBtOiAnYmFubmVyJyB9O1xuXG5cbmNvbnN0IGxldHRlcnNWYXJpYW50cyA9IHtcbiAgICBwYXduOiAncCcsIHJvb2s6ICdyJywga25pZ2h0OiAnbicsIGJpc2hvcDogJ2InLCBxdWVlbjogJ3EnLCBraW5nOiAnaycsIG1ldDogJ20nLCBmZXJ6OiAnZicsIHNpbHZlcjogJ3MnLCBjaGFuY2VsbG9yOiAnYycsIGFyY2hiaXNob3A6ICdhJywgaGF3azogJ2gnLCBlbGVwaGFudDogJ2UnLFxuICAgIHBwYXduOiAnK3AnLCBwa25pZ2h0OiAnK24nLCBwYmlzaG9wOiAnK2InLCBwcm9vazogJytyJywgcGZlcno6ICcrZicsIHl1cnQ6ICd5JywgbGFuY2VyOiAnbCcsXG4gICAgdW5pY29ybjogJ3UnLCBkcmFnb246ICdkJywgY2Fubm9uOiAnbyd9O1xuLy8gc2hvZ2lcbmNvbnN0IGxldHRlcnNTaG9naSA9IHtcbiAgICBwYXduOiAncCcsIHJvb2s6ICdyJywga25pZ2h0OiAnbicsIGJpc2hvcDogJ2InLCBraW5nOiAnaycsIGdvbGQ6ICdnJywgc2lsdmVyOiAncycsIGxhbmNlOiAnbCcsXG4gICAgcHBhd246ICcrcCcsIHBrbmlnaHQ6ICcrbicsIHBiaXNob3A6ICcrYicsIHByb29rOiAnK3InLCBwc2lsdmVyOiAnK3MnLCBwbGFuY2U6ICcrbCcgfTtcbi8vIGRvYnV0c3VcbmNvbnN0IGxldHRlcnNEb2J1dHN1ID0ge1xuICAgIGNoYW5jZWxsb3I6ICdjJywgZWxlcGhhbnQ6ICdlJywga2luZzogJ2wnLCBnb2xkOiAnZycsIGhhd2s6ICdoJyxcbiAgICBwY2hhbmNlbGxvcjogJytjJ307XG4vLyB4aWFuZ3FpXG5jb25zdCBsZXR0ZXJzWGlhbmdxaSA9IHtcbiAgICBwYXduOiAncCcsIHJvb2s6ICdyJywga25pZ2h0OiAnbicsIGJpc2hvcDogJ2InLCBraW5nOiAnaycsIGNhbm5vbjogJ2MnLCBhZHZpc29yOiAnYScsIGJhbm5lcjogJ20nfTtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWQoZmVuOiBjZy5GRU4sIGdlb206IGNnLkdlb21ldHJ5KTogY2cuUGllY2VzIHtcbiAgaWYgKGZlbiA9PT0gJ3N0YXJ0JykgZmVuID0gaW5pdGlhbDtcbiAgaWYgKGZlbi5pbmRleE9mKCdbJykgIT09IC0xKSBmZW4gPSBmZW4uc2xpY2UoMCwgZmVuLmluZGV4T2YoJ1snKSk7XG4gIGNvbnN0IHBpZWNlczogY2cuUGllY2VzID0ge307XG4gIGxldCByb3c6IG51bWJlciA9IGZlbi5zcGxpdChcIi9cIikubGVuZ3RoO1xuICBsZXQgY29sOiBudW1iZXIgPSAwO1xuICBsZXQgcHJvbW90ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICBsZXQgcm9sZXMgPSByb2xlc1ZhcmlhbnRzO1xuICBzd2l0Y2ggKGdlb20pIHtcbiAgICBjYXNlIGNnLkdlb21ldHJ5LmRpbTl4MTA6XG4gICAgY2FzZSBjZy5HZW9tZXRyeS5kaW03eDc6XG4gICAgICAgIHJvbGVzID0gcm9sZXNYaWFuZ3FpO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIGNnLkdlb21ldHJ5LmRpbTl4OTpcbiAgICBjYXNlIGNnLkdlb21ldHJ5LmRpbTV4NjpcbiAgICBjYXNlIGNnLkdlb21ldHJ5LmRpbTV4NTpcbiAgICAgICAgcm9sZXMgPSByb2xlc1Nob2dpO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIGNnLkdlb21ldHJ5LmRpbTN4NDpcbiAgICAgICAgcm9sZXMgPSByb2xlc0RvYnV0c3U7XG4gICAgICAgIGJyZWFrO1xuICB9XG5cbiAgZm9yIChjb25zdCBjIG9mIGZlbikge1xuICAgIHN3aXRjaCAoYykge1xuICAgICAgY2FzZSAnICc6IHJldHVybiBwaWVjZXM7XG4gICAgICBjYXNlICcvJzpcbiAgICAgICAgLS1yb3c7XG4gICAgICAgIGlmIChyb3cgPT09IDApIHJldHVybiBwaWVjZXM7XG4gICAgICAgIGNvbCA9IDA7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnKyc6XG4gICAgICAgIHByb21vdGVkID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICd+JzpcbiAgICAgICAgY29uc3QgcGllY2UgPSBwaWVjZXNbcG9zMmtleShbY29sLCByb3ddLCBnZW9tKV07XG4gICAgICAgIGlmIChwaWVjZSkge1xuICAgICAgICAgICAgcGllY2UucHJvbW90ZWQgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKHBpZWNlLnJvbGU9PSdtZXQnKSBwaWVjZS5yb2xlID0gJ2ZlcnonO1xuICAgICAgICB9O1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGNvbnN0IG5iID0gYy5jaGFyQ29kZUF0KDApO1xuICAgICAgICBpZiAobmIgPCA1OCkgY29sICs9IChjID09PSAnMCcpID8gOSA6IG5iIC0gNDg7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICsrY29sO1xuICAgICAgICAgIGNvbnN0IHJvbGUgPSBjLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgbGV0IHBpZWNlID0ge1xuICAgICAgICAgICAgcm9sZTogcm9sZXNbcm9sZV0sXG4gICAgICAgICAgICBjb2xvcjogKGMgPT09IHJvbGUgPyAnYmxhY2snIDogJ3doaXRlJykgYXMgY2cuQ29sb3JcbiAgICAgICAgICB9IGFzIGNnLlBpZWNlO1xuICAgICAgICAgIGlmIChwcm9tb3RlZCkge1xuICAgICAgICAgICAgcGllY2Uucm9sZSA9ICdwJyArIHBpZWNlLnJvbGUgYXMgY2cuUm9sZTtcbiAgICAgICAgICAgIHBpZWNlLnByb21vdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHByb21vdGVkID0gZmFsc2U7XG4gICAgICAgICAgfTtcbiAgICAgICAgICBwaWVjZXNbcG9zMmtleShbY29sLCByb3ddLCBnZW9tKV0gPSBwaWVjZTtcbiAgICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gcGllY2VzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGUocGllY2VzOiBjZy5QaWVjZXMsIGdlb206IGNnLkdlb21ldHJ5KTogY2cuRkVOIHtcbiAgdmFyIGxldHRlcnM6IGFueSA9IHt9O1xuICBzd2l0Y2ggKGdlb20pIHtcbiAgY2FzZSBjZy5HZW9tZXRyeS5kaW03eDc6XG4gIGNhc2UgY2cuR2VvbWV0cnkuZGltOXgxMDpcbiAgICBsZXR0ZXJzID0gbGV0dGVyc1hpYW5ncWk7XG4gICAgYnJlYWs7XG4gIGNhc2UgY2cuR2VvbWV0cnkuZGltM3g0OlxuICAgIGxldHRlcnMgPSBsZXR0ZXJzRG9idXRzdTtcbiAgICBicmVhaztcbiAgY2FzZSBjZy5HZW9tZXRyeS5kaW01eDU6XG4gIGNhc2UgY2cuR2VvbWV0cnkuZGltNXg2OlxuICBjYXNlIGNnLkdlb21ldHJ5LmRpbTl4OTpcbiAgICBsZXR0ZXJzID0gbGV0dGVyc1Nob2dpO1xuICAgIGJyZWFrO1xuICBkZWZhdWx0OlxuICAgIGxldHRlcnMgPSBsZXR0ZXJzVmFyaWFudHM7XG4gICAgYnJlYWtcbiAgfTtcbiAgY29uc3QgYmQgPSBjZy5kaW1lbnNpb25zW2dlb21dO1xuICByZXR1cm4gaW52TlJhbmtzLnNsaWNlKC1iZC5oZWlnaHQpLm1hcCh5ID0+IE5SYW5rcy5zbGljZSgwLCBiZC53aWR0aCkubWFwKHggPT4ge1xuICAgICAgY29uc3QgcGllY2UgPSBwaWVjZXNbcG9zMmtleShbeCwgeV0sIGdlb20pXTtcbiAgICAgIGlmIChwaWVjZSkge1xuICAgICAgICBjb25zdCBsZXR0ZXI6IHN0cmluZyA9IGxldHRlcnNbcGllY2Uucm9sZV0gKyAoKHBpZWNlLnByb21vdGVkICYmIChsZXR0ZXJzW3BpZWNlLnJvbGVdLmNoYXJBdCgwKSAhPT0gJysnKSkgPyAnficgOiAnJyk7XG4gICAgICAgIHJldHVybiAocGllY2UuY29sb3IgPT09ICd3aGl0ZScpID8gbGV0dGVyLnRvVXBwZXJDYXNlKCkgOiBsZXR0ZXI7XG4gICAgICB9IGVsc2UgcmV0dXJuICcxJztcbiAgICB9KS5qb2luKCcnKVxuICApLmpvaW4oJy8nKS5yZXBsYWNlKC8xezIsfS9nLCBzID0+IHMubGVuZ3RoLnRvU3RyaW5nKCkpO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9jaGVzc2dyb3VuZFwiKS5DaGVzc2dyb3VuZDtcbiIsImltcG9ydCAqIGFzIHV0aWwgZnJvbSAnLi91dGlsJ1xuaW1wb3J0ICogYXMgY2cgZnJvbSAnLi90eXBlcydcblxudHlwZSBNb2JpbGl0eSA9ICh4MTpudW1iZXIsIHkxOm51bWJlciwgeDI6bnVtYmVyLCB5MjpudW1iZXIpID0+IGJvb2xlYW47XG5cbmNvbnN0IGJQYWxhY2UgPSBbXG4gICAgWzQsIDEwXSwgWzUsIDEwXSwgWzYsIDEwXSxcbiAgICBbNCwgOV0sIFs1LCA5XSwgWzYsIDldLFxuICAgIFs0LCA4XSwgWzUsIDhdLCBbNiwgOF0sXG5dO1xuY29uc3Qgd1BhbGFjZSA9IFtcbiAgICBbNCwgM10sIFs1LCAzXSwgWzYsIDNdLFxuICAgIFs0LCAyXSwgWzUsIDJdLCBbNiwgMl0sXG4gICAgWzQsIDFdLCBbNSwgMV0sIFs2LCAxXSxcbl07XG5cbmNvbnN0IGJQYWxhY2U3ID0gW1xuICAgIFszLCA3XSwgWzQsIDddLCBbNSwgN10sXG4gICAgWzMsIDZdLCBbNCwgNl0sIFs1LCA2XSxcbiAgICBbMywgNV0sIFs0LCA1XSwgWzUsIDVdLFxuXTtcbmNvbnN0IHdQYWxhY2U3ID0gW1xuICAgIFszLCAzXSwgWzQsIDNdLCBbNSwgM10sXG4gICAgWzMsIDJdLCBbNCwgMl0sIFs1LCAyXSxcbiAgICBbMywgMV0sIFs0LCAxXSwgWzUsIDFdLFxuXTtcblxuZnVuY3Rpb24gZGlmZihhOiBudW1iZXIsIGI6bnVtYmVyKTpudW1iZXIge1xuICByZXR1cm4gTWF0aC5hYnMoYSAtIGIpO1xufVxuXG5mdW5jdGlvbiBwYXduKGNvbG9yOiBjZy5Db2xvcik6IE1vYmlsaXR5IHtcbiAgcmV0dXJuICh4MSwgeTEsIHgyLCB5MikgPT4gZGlmZih4MSwgeDIpIDwgMiAmJiAoXG4gICAgY29sb3IgPT09ICd3aGl0ZScgPyAoXG4gICAgICAvLyBhbGxvdyAyIHNxdWFyZXMgZnJvbSAxIGFuZCA4LCBmb3IgaG9yZGVcbiAgICAgIHkyID09PSB5MSArIDEgfHwgKHkxIDw9IDIgJiYgeTIgPT09ICh5MSArIDIpICYmIHgxID09PSB4MilcbiAgICApIDogKFxuICAgICAgeTIgPT09IHkxIC0gMSB8fCAoeTEgPj0gNyAmJiB5MiA9PT0gKHkxIC0gMikgJiYgeDEgPT09IHgyKVxuICAgIClcbiAgKTtcbn1cblxuY29uc3Qga25pZ2h0OiBNb2JpbGl0eSA9ICh4MSwgeTEsIHgyLCB5MikgPT4ge1xuICBjb25zdCB4ZCA9IGRpZmYoeDEsIHgyKTtcbiAgY29uc3QgeWQgPSBkaWZmKHkxLCB5Mik7XG4gIHJldHVybiAoeGQgPT09IDEgJiYgeWQgPT09IDIpIHx8ICh4ZCA9PT0gMiAmJiB5ZCA9PT0gMSk7XG59XG5cbmNvbnN0IHdhemlyOiBNb2JpbGl0eSA9ICh4MSwgeTEsIHgyLCB5MikgPT4ge1xuICBjb25zdCB4ZCA9IGRpZmYoeDEsIHgyKTtcbiAgY29uc3QgeWQgPSBkaWZmKHkxLCB5Mik7XG4gIHJldHVybiAoeGQgPT09IDEgJiYgeWQgPT09IDApIHx8ICh4ZCA9PT0gMCAmJiB5ZCA9PT0gMSk7XG59XG5cbmNvbnN0IGJpc2hvcDogTW9iaWxpdHkgPSAoeDEsIHkxLCB4MiwgeTIpID0+IHtcbiAgcmV0dXJuIGRpZmYoeDEsIHgyKSA9PT0gZGlmZih5MSwgeTIpO1xufVxuXG5jb25zdCByb29rOiBNb2JpbGl0eSA9ICh4MSwgeTEsIHgyLCB5MikgPT4ge1xuICByZXR1cm4geDEgPT09IHgyIHx8IHkxID09PSB5Mjtcbn1cblxuY29uc3QgcXVlZW46IE1vYmlsaXR5ID0gKHgxLCB5MSwgeDIsIHkyKSA9PiB7XG4gIHJldHVybiBiaXNob3AoeDEsIHkxLCB4MiwgeTIpIHx8IHJvb2soeDEsIHkxLCB4MiwgeTIpO1xufVxuXG5jb25zdCBrbmlyb286IE1vYmlsaXR5ID0gKHgxLCB5MSwgeDIsIHkyKSA9PiB7XG4gIHJldHVybiBrbmlnaHQoeDEsIHkxLCB4MiwgeTIpIHx8IHJvb2soeDEsIHkxLCB4MiwgeTIpO1xufVxuXG5jb25zdCBrbmliaXM6IE1vYmlsaXR5ID0gKHgxLCB5MSwgeDIsIHkyKSA9PiB7XG4gIHJldHVybiBrbmlnaHQoeDEsIHkxLCB4MiwgeTIpIHx8IGJpc2hvcCh4MSwgeTEsIHgyLCB5Mik7XG59XG5cbmZ1bmN0aW9uIGtpbmcoY29sb3I6IGNnLkNvbG9yLCByb29rRmlsZXM6IG51bWJlcltdLCBjYW5DYXN0bGU6IGJvb2xlYW4pOiBNb2JpbGl0eSB7XG4gIHJldHVybiAoeDEsIHkxLCB4MiwgeTIpICA9PiAoXG4gICAgZGlmZih4MSwgeDIpIDwgMiAmJiBkaWZmKHkxLCB5MikgPCAyXG4gICkgfHwgKFxuICAgIGNhbkNhc3RsZSAmJiB5MSA9PT0geTIgJiYgeTEgPT09IChjb2xvciA9PT0gJ3doaXRlJyA/IDEgOiA4KSAmJiAoXG4gICAgICAoeDEgPT09IDUgJiYgKCh1dGlsLmNvbnRhaW5zWChyb29rRmlsZXMsIDEpICYmIHgyID09PSAzKSB8fCAodXRpbC5jb250YWluc1gocm9va0ZpbGVzLCA4KSAmJiB4MiA9PT0gNykpKSB8fFxuICAgICAgdXRpbC5jb250YWluc1gocm9va0ZpbGVzLCB4MilcbiAgICApXG4gICk7XG59XG5cbi8vIG1ha3J1ay9zaXR0dXlpbiBxdWVlblxuY29uc3QgbWV0OiBNb2JpbGl0eSA9ICh4MSwgeTEsIHgyLCB5MikgPT4ge1xuICByZXR1cm4gZGlmZih4MSwgeDIpID09PSBkaWZmKHkxLCB5MikgJiYgZGlmZih4MSwgeDIpID09PSAxO1xufVxuXG4vLyBjYXBhYmxhbmNhIGFyY2hiaXNob3AsIHNlaXJhd2FuIGhhd2tcbmNvbnN0IGFyY2hiaXNob3A6IE1vYmlsaXR5ID0gKHgxLCB5MSwgeDIsIHkyKSA9PiB7XG4gIHJldHVybiBiaXNob3AoeDEsIHkxLCB4MiwgeTIpIHx8IGtuaWdodCh4MSwgeTEsIHgyLCB5Mik7XG59XG5cbi8vIGNhcGFibGFuY2EgY2hhbmNlbGxvciwgc2VpcmF3YW4gZWxlcGhhbnRcbmNvbnN0IGNoYW5jZWxsb3I6IE1vYmlsaXR5ID0gKHgxLCB5MSwgeDIsIHkyKSA9PiB7XG4gIHJldHVybiByb29rKHgxLCB5MSwgeDIsIHkyKSB8fCBrbmlnaHQoeDEsIHkxLCB4MiwgeTIpO1xufVxuXG4vLyBzaG9ndW4gZ2VuZXJhbFxuY29uc3QgY2VudGF1cjogTW9iaWxpdHkgPSAoeDEsIHkxLCB4MiwgeTIpID0+IHtcbiAgcmV0dXJuIHNraW5nKHgxLCB5MSwgeDIsIHkyKSB8fCBrbmlnaHQoeDEsIHkxLCB4MiwgeTIpO1xufVxuXG4vLyBzaG9naSBsYW5jZVxuZnVuY3Rpb24gbGFuY2UoY29sb3I6IGNnLkNvbG9yKTogTW9iaWxpdHkge1xuICByZXR1cm4gKHgxLCB5MSwgeDIsIHkyKSA9PiAoXG4gICAgeDIgPT09IHgxICYmIChjb2xvciA9PT0gJ3doaXRlJyA/IHkyID4geTEgOiB5MiA8IHkxKVxuICApO1xufVxuXG4vLyBzaG9naSBzaWx2ZXIsIG1ha3J1ay9zaXR0dXlpbiBiaXNob3BcbmZ1bmN0aW9uIHNpbHZlcihjb2xvcjogY2cuQ29sb3IpOiBNb2JpbGl0eSB7XG4gIHJldHVybiAoeDEsIHkxLCB4MiwgeTIpICA9PiAoXG4gICAgbWV0KHgxLCB5MSwgeDIsIHkyKSB8fCAoeDEgPT09IHgyICYmIChjb2xvciA9PT0gJ3doaXRlJyA/IHkyID09PSB5MSArIDEgOiB5MiA9PT0geTEgLSAxKSlcbiAgKTtcbn1cblxuLy8gc2hvZ2kgZ29sZCwgcHJvbW90ZWQgcGF3bi9rbmlnaHQvbGFuY2Uvc2lsdmVyXG5mdW5jdGlvbiBnb2xkKGNvbG9yOiBjZy5Db2xvcik6IE1vYmlsaXR5IHtcbiAgcmV0dXJuICh4MSwgeTEsIHgyLCB5MikgID0+IChcbiAgICBkaWZmKHgxLCB4MikgPCAyICYmIGRpZmYoeTEsIHkyKSA8IDIgJiYgKFxuICAgICAgY29sb3IgPT09ICd3aGl0ZScgP1xuICAgICAgICAhKCh4MiA9PT0geDEgLSAxICYmIHkyID09PSB5MSAtIDEpIHx8ICh4MiA9PT0geDEgKyAxICYmIHkyID09PSB5MSAtIDEpKSA6XG4gICAgICAgICEoKHgyID09PSB4MSArIDEgJiYgeTIgPT09IHkxICsgMSkgfHwgKHgyID09PSB4MSAtIDEgJiYgeTIgPT09IHkxICsgMSkpXG4gICAgKVxuICApO1xufVxuXG4vLyBzaG9naSBwYXduXG5mdW5jdGlvbiBzcGF3bihjb2xvcjogY2cuQ29sb3IpOiBNb2JpbGl0eSB7XG4gIHJldHVybiAoeDEsIHkxLCB4MiwgeTIpID0+ICh4MiA9PT0geDEgJiYgKGNvbG9yID09PSAnd2hpdGUnID8geTIgPT09IHkxICsgMSA6IHkyID09PSB5MSAtIDEpKTtcbn1cblxuLy8gc2hvZ2kga25pZ2h0XG5mdW5jdGlvbiBza25pZ2h0KGNvbG9yOiBjZy5Db2xvcik6IE1vYmlsaXR5IHtcbiAgcmV0dXJuICh4MSwgeTEsIHgyLCB5MikgPT4gY29sb3IgPT09ICd3aGl0ZScgP1xuICAgICh5MiA9PT0geTEgKyAyICYmIHgyID09PSB4MSAtIDEgfHwgeTIgPT09IHkxICsgMiAmJiB4MiA9PT0geDEgKyAxKSA6XG4gICAgKHkyID09PSB5MSAtIDIgJiYgeDIgPT09IHgxIC0gMSB8fCB5MiA9PT0geTEgLSAyICYmIHgyID09PSB4MSArIDEpO1xufVxuXG4vLyBzaG9naSBwcm9tb3RlZCByb29rXG5jb25zdCBwcm9vazogTW9iaWxpdHkgPSAoeDEsIHkxLCB4MiwgeTIpID0+IHtcbiAgcmV0dXJuIHJvb2soeDEsIHkxLCB4MiwgeTIpIHx8IChkaWZmKHgxLCB4MikgPCAyICYmIGRpZmYoeTEsIHkyKSA8IDIpO1xufVxuXG4vLyBzaG9naSBwcm9tb3RlZCBiaXNob3BcbmNvbnN0IHBiaXNob3A6IE1vYmlsaXR5ID0gKHgxLCB5MSwgeDIsIHkyKSA9PiB7XG4gIHJldHVybiBiaXNob3AoeDEsIHkxLCB4MiwgeTIpIHx8IChkaWZmKHgxLCB4MikgPCAyICYmIGRpZmYoeTEsIHkyKSA8IDIpO1xufVxuXG4vLyBzaG9naSBraW5nXG5jb25zdCBza2luZzogTW9iaWxpdHkgPSAoeDEsIHkxLCB4MiwgeTIpID0+IHtcbiAgcmV0dXJuIGRpZmYoeDEsIHgyKSA8IDIgJiYgZGlmZih5MSwgeTIpIDwgMjtcbn1cblxuLy8geGlhbmdxaSBwYXduXG5mdW5jdGlvbiB4cGF3bihjb2xvcjogY2cuQ29sb3IpOiBNb2JpbGl0eSB7XG4gIHJldHVybiAoeDEsIHkxLCB4MiwgeTIpID0+IChcbiAgICAoeDIgPT09IHgxICYmIChjb2xvciA9PT0gJ3doaXRlJyA/IHkyID09PSB5MSArIDEgOiB5MiA9PT0geTEgLSAxKSkgfHxcbiAgICAoeTIgPT09IHkxICYmICh4MiA9PT0geDEgKyAxIHx8IHgyID09PSB4MSAtIDEpICYmIChjb2xvciA9PT0gJ3doaXRlJyA/IHkxID4gNSA6IHkxIDwgNikpXG4gICAgKTtcbn1cblxuLy8geGlhbmdxaSBlbGVwaGFudCAoYmlzaG9wKVxuZnVuY3Rpb24geGJpc2hvcChjb2xvcjogY2cuQ29sb3IpOiBNb2JpbGl0eSB7XG4gIHJldHVybiAoeDEsIHkxLCB4MiwgeTIpID0+IChcbiAgICBkaWZmKHgxLCB4MikgPT09IGRpZmYoeTEsIHkyKSAmJiBkaWZmKHgxLCB4MikgPT09IDIgJiYgKGNvbG9yID09PSAnd2hpdGUnID8geTIgPCA2IDogeTIgPiA1KVxuICAgICk7XG59XG5cbi8vIHhpYW5ncWkgYWR2aXNvclxuZnVuY3Rpb24geGFkdmlzb3IoY29sb3I6IGNnLkNvbG9yLCBnZW9tOiBjZy5HZW9tZXRyeSk6IE1vYmlsaXR5IHtcbiAgICBjb25zdCBwYWxhY2UgPSAoY29sb3IgPT0gJ3doaXRlJykgPyAoKGdlb20gPT09IGNnLkdlb21ldHJ5LmRpbTd4NykgPyB3UGFsYWNlNyA6IHdQYWxhY2UpIDogKChnZW9tID09PSBjZy5HZW9tZXRyeS5kaW03eDcpID8gYlBhbGFjZTcgOmJQYWxhY2UpO1xuICAgIHJldHVybiAoeDEsIHkxLCB4MiwgeTIpID0+IChcbiAgICAgICAgZGlmZih4MSwgeDIpID09PSBkaWZmKHkxLCB5MikgJiYgZGlmZih4MSwgeDIpID09PSAxICYmIHBhbGFjZS5zb21lKHBvaW50ID0+IChwb2ludFswXSA9PT0geDIgJiYgcG9pbnRbMV0gPT09IHkyKSlcbiAgICApO1xufVxuXG4vLyB4aWFuZ3FpIGdlbmVyYWwoa2luZylcbmZ1bmN0aW9uIHhraW5nKGNvbG9yOiBjZy5Db2xvciwgZ2VvbTogY2cuR2VvbWV0cnkpOiBNb2JpbGl0eSB7XG4gICAgY29uc3QgcGFsYWNlID0gKGNvbG9yID09ICd3aGl0ZScpID8gKChnZW9tID09PSBjZy5HZW9tZXRyeS5kaW03eDcpID8gd1BhbGFjZTcgOiB3UGFsYWNlKSA6ICgoZ2VvbSA9PT0gY2cuR2VvbWV0cnkuZGltN3g3KSA/IGJQYWxhY2U3IDpiUGFsYWNlKTtcbiAgICByZXR1cm4gKHgxLCB5MSwgeDIsIHkyKSA9PiAoXG4gICAgICAgICgoeDEgPT09IHgyICYmIGRpZmYoeTEsIHkyKSA9PT0gMSkgfHwgKHkxID09PSB5MiAmJiBkaWZmKHgxLCB4MikgPT09IDEpKSAmJiBwYWxhY2Uuc29tZShwb2ludCA9PiAocG9pbnRbMF0gPT09IHgyICYmIHBvaW50WzFdID09PSB5MikpXG4gICAgKTtcbn1cblxuLy8gc2hha28gZWxlcGhhbnRcbmNvbnN0IHNoYWtvRWxlcGhhbnQ6IE1vYmlsaXR5ID0gKHgxLCB5MSwgeDIsIHkyKSA9PiB7XG4gIHJldHVybiBkaWZmKHgxLCB4MikgPT09IGRpZmYoeTEsIHkyKSAmJiAoZGlmZih4MSwgeDIpID09PSAxIHx8IGRpZmYoeDEsIHgyKSA9PT0gMik7XG59XG5cbi8vIGphbmdnaSBlbGVwaGFudCAoYmlzaG9wKVxuY29uc3QgamJpc2hvcDogTW9iaWxpdHkgPSAoeDEsIHkxLCB4MiwgeTIpID0+IHtcbiAgY29uc3QgeGQgPSBkaWZmKHgxLCB4Mik7XG4gIGNvbnN0IHlkID0gZGlmZih5MSwgeTIpO1xuICByZXR1cm4gKHhkID09PSAyICYmIHlkID09PSAzKSB8fCAoeGQgPT09IDMgJiYgeWQgPT09IDIpO1xufVxuXG4vLyBqYW5nZ2kgcGF3blxuZnVuY3Rpb24ganBhd24oY29sb3I6IGNnLkNvbG9yKTogTW9iaWxpdHkge1xuICByZXR1cm4gKHgxLCB5MSwgeDIsIHkyKSA9PiAoXG4gICAgKHgyID09PSB4MSAmJiAoY29sb3IgPT09ICd3aGl0ZScgPyB5MiA9PT0geTEgKyAxIDogeTIgPT09IHkxIC0gMSkpIHx8XG4gICAgKHkyID09PSB5MSAmJiAoeDIgPT09IHgxICsgMSB8fCB4MiA9PT0geDEgLSAxKSlcbiAgICApO1xufVxuXG4vLyBqYW5nZ2kga2luZ1xuZnVuY3Rpb24gamtpbmcoY29sb3I6IGNnLkNvbG9yKTogTW9iaWxpdHkge1xuICAgIGNvbnN0IHBhbGFjZSA9IChjb2xvciA9PSAnd2hpdGUnKSA/ICB3UGFsYWNlIDogYlBhbGFjZTtcbiAgICByZXR1cm4gKHgxLCB5MSwgeDIsIHkyKSA9PiAoXG4gICAgICAgIGRpZmYoeDEsIHgyKSA8IDIgJiYgZGlmZih5MSwgeTIpIDwgMiAmJiBwYWxhY2Uuc29tZShwb2ludCA9PiAocG9pbnRbMF0gPT09IHgyICYmIHBvaW50WzFdID09PSB5MikpXG4gICAgKTtcbn1cblxuLy8gbXVza2V0ZWVyIGxlb3BhcmRcbmNvbnN0IGxlb3BhcmQ6IE1vYmlsaXR5ID0gKHgxLCB5MSwgeDIsIHkyKSA9PiB7XG4gIGNvbnN0IHhkID0gZGlmZih4MSwgeDIpOyBjb25zdCB5ZCA9IGRpZmYoeTEsIHkyKTtcbiAgcmV0dXJuIChcbiAgICAoeGQgPT09IDEgfHwgeGQgPT09IDIpXG4gICAgJiYgKHlkID09PSAxIHx8IHlkID09PSAyKVxuICAgICk7XG59XG4vLyBtdXNrZXRlZXIgaGF3a1xuY29uc3QgbWhhd2s6IE1vYmlsaXR5ID0gKHgxLCB5MSwgeDIsIHkyKSA9PiB7XG4gIGNvbnN0IHhkID0gZGlmZih4MSwgeDIpOyBjb25zdCB5ZCA9IGRpZmYoeTEsIHkyKTtcbiAgcmV0dXJuIChcbiAgICAoeGQgPT09IDAgJiYgKHlkID09PSAyIHx8IHlkID09PSAzKSlcbiAgICB8fCAoeWQgPT09IDAgJiYgKHhkID09PSAyIHx8IHhkID09PSAzKSlcbiAgICB8fCAoeGQgPT09IHlkICYmICh4ZCA9PT0gMiB8fCB4ZCA9PT0gMykpXG4gICk7XG59XG4vLyBtdXNrZXRlZXIgZWxlcGhhbnRcbmNvbnN0IG1lbGVwaGFudDogTW9iaWxpdHkgPSAoeDEsIHkxLCB4MiwgeTIpID0+IHtcbiAgY29uc3QgeGQgPSBkaWZmKHgxLCB4Mik7IGNvbnN0IHlkID0gZGlmZih5MSwgeTIpO1xuICByZXR1cm4gKFxuICAgIHhkID09PSAxIHx8IHlkID09PSAxXG4gICAgfHwgKHhkID09PSAyICYmICh5ZCA9PT0gMCB8fCB5ZCA9PT0gMikpXG4gICAgfHwgKHhkID09PSAwICYmIHlkID09PSAyKVxuICApO1xufVxuLy8gbXVza2V0ZWVyIGNhbm5vblxuY29uc3QgbWNhbm5vbjogTW9iaWxpdHkgPSAoeDEsIHkxLCB4MiwgeTIpID0+IHtcbiAgY29uc3QgeGQgPSBkaWZmKHgxLCB4Mik7IGNvbnN0IHlkID0gZGlmZih5MSwgeTIpO1xuICByZXR1cm4gKFxuICAgICh4ZCA8IDMpXG4gICAgJiYgKCh5ZCA8IDIpIHx8ICh5ZCA9PT0gMiAmJiB4ZCA9PT0gMCkpXG4gICk7XG59XG4vLyBtdXNrZXRlZXIgdW5pY29yblxuY29uc3QgdW5pY29ybjogTW9iaWxpdHkgPSAoeDEsIHkxLCB4MiwgeTIpID0+IHtcbiAgY29uc3QgeGQgPSBkaWZmKHgxLCB4Mik7IGNvbnN0IHlkID0gZGlmZih5MSwgeTIpO1xuICByZXR1cm4ga25pZ2h0KHgxLCB5MSwgeDIsIHkyKSB8fCAoeGQgPT09IDEgJiYgeWQgPT09IDMpIHx8ICh4ZCA9PT0gMyAmJiB5ZCA9PT0gMSk7XG59XG4vLyBtdXNrZXRlZXIgZHJhZ29uXG5jb25zdCBkcmFnb246IE1vYmlsaXR5ID0gKHgxLCB5MSwgeDIsIHkyKSA9PiB7XG4gIHJldHVybiBrbmlnaHQoeDEsIHkxLCB4MiwgeTIpIHx8IHF1ZWVuKHgxLCB5MSwgeDIsIHkyKTtcbn1cbi8vIG11c2tldGVlciBmb3J0cmVzc1xuY29uc3QgZm9ydHJlc3M6IE1vYmlsaXR5ID0gKHgxLCB5MSwgeDIsIHkyKSA9PiB7XG4gIGNvbnN0IHhkID0gZGlmZih4MSwgeDIpOyBjb25zdCB5ZCA9IGRpZmYoeTEsIHkyKTtcbiAgcmV0dXJuIChcbiAgICAoeGQgPT09IHlkICYmIHhkIDwgNClcbiAgICB8fCAoeWQgPT09IDAgJiYgeGQgPT09IDIpXG4gICAgfHwgKHlkID09PSAyICYmIHhkIDwgMikgXG4gICk7XG59XG4vLyBtdXNrZXRlZXIgc3BpZGVyXG5jb25zdCBzcGlkZXI6IE1vYmlsaXR5ID0gKHgxLCB5MSwgeDIsIHkyKSA9PiB7XG4gIGNvbnN0IHhkID0gZGlmZih4MSwgeDIpOyBjb25zdCB5ZCA9IGRpZmYoeTEsIHkyKTtcbiAgcmV0dXJuIChcbiAgICB4ZCA8IDMgJiYgeWQgPCAzXG4gICAgJiYgISh4ZCA9PT0gMSAmJiB5ZCA9PT0gMClcbiAgICAmJiAhKHhkID09PSAwICYmIHlkID09PSAxKVxuICApO1xufVxuXG5mdW5jdGlvbiByb29rRmlsZXNPZihwaWVjZXM6IGNnLlBpZWNlcywgY29sb3I6IGNnLkNvbG9yLCBmaXJzdFJhbmtJczA6IGJvb2xlYW4pIHtcbiAgY29uc3QgYmFja3JhbmsgPSBjb2xvciA9PSAnd2hpdGUnID8gJzEnIDogJzgnO1xuICByZXR1cm4gT2JqZWN0LmtleXMocGllY2VzKS5maWx0ZXIoa2V5ID0+IHtcbiAgICBjb25zdCBwaWVjZSA9IHBpZWNlc1trZXldO1xuICAgIHJldHVybiBrZXlbMV0gPT09IGJhY2tyYW5rICYmIHBpZWNlICYmIHBpZWNlLmNvbG9yID09PSBjb2xvciAmJiBwaWVjZS5yb2xlID09PSAncm9vayc7XG4gIH0pLm1hcCgoa2V5OiBzdHJpbmcgKSA9PiB1dGlsLmtleTJwb3Moa2V5IGFzIGNnLktleSwgZmlyc3RSYW5rSXMwKVswXSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHByZW1vdmUocGllY2VzOiBjZy5QaWVjZXMsIGtleTogY2cuS2V5LCBjYW5DYXN0bGU6IGJvb2xlYW4sIGdlb206IGNnLkdlb21ldHJ5LCB2YXJpYW50OiBjZy5WYXJpYW50KTogY2cuS2V5W10ge1xuICBjb25zdCBmaXJzdFJhbmtJczAgPSBjZy5kaW1lbnNpb25zW2dlb21dLmhlaWdodCA9PT0gMTA7XG4gIGNvbnN0IHBpZWNlID0gcGllY2VzW2tleV0hLFxuICBwb3MgPSB1dGlsLmtleTJwb3Moa2V5LCBmaXJzdFJhbmtJczApO1xuICBsZXQgbW9iaWxpdHk6IE1vYmlsaXR5O1xuXG4gIHN3aXRjaCAoZ2VvbSkge1xuICBjYXNlIGNnLkdlb21ldHJ5LmRpbTd4NzpcbiAgY2FzZSBjZy5HZW9tZXRyeS5kaW05eDEwOlxuICAgIHN3aXRjaCAocGllY2Uucm9sZSkge1xuICAgIGNhc2UgJ3Bhd24nOlxuICAgICAgLy8gVE9ETzogaW5zaWRlIHRoZSBKYW5nZ2kgcGFsYWNlIHBhd24gY2FuIG1vdmUgZm9yd2FyZCBvbiBkaWFnb25hbHMgYWxzb1xuICAgICAgaWYgKHZhcmlhbnQgPT09ICdqYW5nZ2knIHx8IGdlb20gPT09IGNnLkdlb21ldHJ5LmRpbTd4Nykge1xuICAgICAgICBtb2JpbGl0eSA9IGpwYXduKHBpZWNlLmNvbG9yKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1vYmlsaXR5ID0geHBhd24ocGllY2UuY29sb3IpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnYmFubmVyJzpcbiAgICAgIG1vYmlsaXR5ID0ga25pcm9vO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2Fubm9uJzpcbiAgICBjYXNlICdyb29rJzpcbiAgICAgIC8vIFRPRE86IGluc2lkZSB0aGUgSmFuZ2dpIHBhbGFjZSB0aGV5IGNhbiBtb3ZlIG9uIGRpYWdvbmFscyBhbHNvXG4gICAgICBtb2JpbGl0eSA9IHJvb2s7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdrbmlnaHQnOlxuICAgICAgbW9iaWxpdHkgPSBrbmlnaHQ7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdiaXNob3AnOlxuICAgICAgaWYgKHZhcmlhbnQgPT09ICdqYW5nZ2knKSB7XG4gICAgICAgIG1vYmlsaXR5ID0gamJpc2hvcDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1vYmlsaXR5ID0geGJpc2hvcChwaWVjZS5jb2xvcik7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdhZHZpc29yJzpcbiAgICAgIGlmICh2YXJpYW50ID09PSAnamFuZ2dpJykge1xuICAgICAgICBtb2JpbGl0eSA9IGpraW5nKHBpZWNlLmNvbG9yKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1vYmlsaXR5ID0geGFkdmlzb3IocGllY2UuY29sb3IsIGdlb20pO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAna2luZyc6XG4gICAgICBpZiAodmFyaWFudCA9PT0gJ2phbmdnaScpIHtcbiAgICAgICAgbW9iaWxpdHkgPSBqa2luZyhwaWVjZS5jb2xvcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtb2JpbGl0eSA9IHhraW5nKHBpZWNlLmNvbG9yLCBnZW9tKTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH07XG4gICAgYnJlYWs7XG4gIGNhc2UgY2cuR2VvbWV0cnkuZGltNXg1OlxuICBjYXNlIGNnLkdlb21ldHJ5LmRpbTl4OTpcbiAgICBzd2l0Y2ggKHBpZWNlLnJvbGUpIHtcbiAgICBjYXNlICdwYXduJzpcbiAgICAgIG1vYmlsaXR5ID0gc3Bhd24ocGllY2UuY29sb3IpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAna25pZ2h0JzpcbiAgICAgIG1vYmlsaXR5ID0gc2tuaWdodChwaWVjZS5jb2xvcik7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdiaXNob3AnOlxuICAgICAgbW9iaWxpdHkgPSBiaXNob3A7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyb29rJzpcbiAgICAgIG1vYmlsaXR5ID0gcm9vaztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2tpbmcnOlxuICAgICAgbW9iaWxpdHkgPSBza2luZztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3NpbHZlcic6XG4gICAgICBtb2JpbGl0eSA9IHNpbHZlcihwaWVjZS5jb2xvcik7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdwcGF3bic6XG4gICAgY2FzZSAncGxhbmNlJzpcbiAgICBjYXNlICdwa25pZ2h0JzpcbiAgICBjYXNlICdwc2lsdmVyJzpcbiAgICBjYXNlICdnb2xkJzpcbiAgICAgIG1vYmlsaXR5ID0gZ29sZChwaWVjZS5jb2xvcik7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdsYW5jZSc6XG4gICAgICBtb2JpbGl0eSA9IGxhbmNlKHBpZWNlLmNvbG9yKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3Byb29rJzpcbiAgICAgIG1vYmlsaXR5ID0gcHJvb2s7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdwYmlzaG9wJzpcbiAgICAgIG1vYmlsaXR5ID0gcGJpc2hvcDtcbiAgICAgIGJyZWFrO1xuICAgIH07XG4gICAgYnJlYWs7XG4gIGNhc2UgY2cuR2VvbWV0cnkuZGltM3g0OlxuICAgIHN3aXRjaCAocGllY2Uucm9sZSkge1xuICAgIC8vIGNoaWNrXG4gICAgY2FzZSAnY2hhbmNlbGxvcic6XG4gICAgICBtb2JpbGl0eSA9IHNwYXduKHBpZWNlLmNvbG9yKTtcbiAgICAgIGJyZWFrO1xuICAgIC8vIGVsZXBoYW50XG4gICAgY2FzZSAnZWxlcGhhbnQnOlxuICAgICAgbW9iaWxpdHkgPSBtZXQ7XG4gICAgICBicmVhaztcbiAgICAvLyBnaXJhZmZlXG4gICAgY2FzZSAnZ29sZCc6XG4gICAgICBtb2JpbGl0eSA9IHdhemlyO1xuICAgICAgYnJlYWs7XG4gICAgLy8gbGlvbiAoPWtpbmcpXG4gICAgY2FzZSAna2luZyc6XG4gICAgICBtb2JpbGl0eSA9IHNraW5nO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncGNoYW5jZWxsb3InOlxuICAgICAgbW9iaWxpdHkgPSBnb2xkKHBpZWNlLmNvbG9yKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBicmVhaztcbiAgZGVmYXVsdDpcbiAgICBzd2l0Y2ggKHBpZWNlLnJvbGUpIHtcbiAgICBjYXNlICdwYXduJzpcbiAgICAgIG1vYmlsaXR5ID0gcGF3bihwaWVjZS5jb2xvcik7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdrbmlnaHQnOlxuICAgICAgbW9iaWxpdHkgPSBrbmlnaHQ7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdwa25pZ2h0JzpcbiAgICAgIC8vIFNob2d1blxuICAgICAgbW9iaWxpdHkgPSBjZW50YXVyO1xuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaXNob3AnOlxuICAgICAgbW9iaWxpdHkgPSBiaXNob3A7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyb29rJzpcbiAgICAgIG1vYmlsaXR5ID0gcm9vaztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3BmZXJ6JzpcbiAgICAgIC8vIFNob2d1blxuICAgIGNhc2UgJ3F1ZWVuJzpcbiAgICAgIG1vYmlsaXR5ID0gcXVlZW47XG4gICAgICBicmVhaztcbiAgICBjYXNlICdwcGF3bic6XG4gICAgICAvLyBTaG9ndW5cbiAgICAgIG1vYmlsaXR5ID0gc2tpbmc7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdraW5nJzpcbiAgICAgIGlmICh2YXJpYW50ID09PSAnc3lub2NoZXNzJyAmJiBwaWVjZS5jb2xvciA9PT0gJ2JsYWNrJykge1xuICAgICAgICBtb2JpbGl0eSA9IHNraW5nO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbW9iaWxpdHkgPSBraW5nKHBpZWNlLmNvbG9yLCByb29rRmlsZXNPZihwaWVjZXMsIHBpZWNlLmNvbG9yLCBmaXJzdFJhbmtJczApLCBjYW5DYXN0bGUpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnaGF3ayc6XG4gICAgICBpZiAodmFyaWFudCA9PT0gJ29yZGEnKSB7XG4gICAgICAgIG1vYmlsaXR5ID0gY2VudGF1cjtcbiAgICAgIH0gZWxzZSBpZih2YXJpYW50ID09PSAnbXVza2V0ZWVyJyl7XG4gICAgICAgIG1vYmlsaXR5ID0gbWhhd2s7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtb2JpbGl0eSA9IGFyY2hiaXNob3A7IC8vIHNlaXJhd2FuXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdwYmlzaG9wJzpcbiAgICAgIC8vIFNob2d1blxuICAgIGNhc2UgJ2FyY2hiaXNob3AnOlxuICAgICAgc3dpdGNoICh2YXJpYW50KSB7XG4gICAgICBjYXNlICdvcmRhJzpcbiAgICAgICAgbW9iaWxpdHkgPSBrbmliaXM7XG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdzeW5vY2hlc3MnOlxuICAgICAgICBtb2JpbGl0eSA9IHNraW5nO1xuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbW9iaWxpdHkgPSBhcmNoYmlzaG9wO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnbGFuY2VyJzpcbiAgICAgIGlmKHZhcmlhbnQgPT09ICdtdXNrZXRlZXInKXtcbiAgICAgICAgbW9iaWxpdHkgPSBsZW9wYXJkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgIC8vIE9yZGFcbiAgICAgIG1vYmlsaXR5ID0ga25pcm9vO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnZWxlcGhhbnQnOlxuICAgICAgaWYgKHZhcmlhbnQgPT09ICdzaGFrbycgfHwgdmFyaWFudCA9PT0gJ3N5bm9jaGVzcycpIHtcbiAgICAgICAgbW9iaWxpdHkgPSBzaGFrb0VsZXBoYW50O1xuICAgICAgfSBlbHNlIGlmKHZhcmlhbnQgPT09ICdtdXNrZXRlZXInKSB7XG4gICAgICAgIG1vYmlsaXR5ID0gbWVsZXBoYW50O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbW9iaWxpdHkgPSBjaGFuY2VsbG9yO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncHJvb2snOlxuICAgICAgLy8gU2hvZ3VuXG4gICAgY2FzZSAnY2hhbmNlbGxvcic6XG4gICAgICBpZiAodmFyaWFudCA9PT0gJ3NoYWtvJyB8fCB2YXJpYW50ID09PSAnc3lub2NoZXNzJykge1xuICAgICAgICAvLyBjYW5ub25cbiAgICAgICAgbW9iaWxpdHkgPSByb29rO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbW9iaWxpdHkgPSBjaGFuY2VsbG9yO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnbWV0JzpcbiAgICBjYXNlICdmZXJ6JzpcbiAgICAgIGlmKHZhcmlhbnQgPT09ICdtdXNrZXRlZXInKXtcbiAgICAgICAgbW9iaWxpdHkgPSBmb3J0cmVzcztcbiAgICAgIH1cbiAgICAgIGVsc2UgbW9iaWxpdHkgPSBtZXQ7XG4gICAgICBicmVhaztcbiAgICBjYXNlICd5dXJ0JzpcbiAgICAvLyBPcmRhXG4gICAgY2FzZSAnc2lsdmVyJzpcbiAgICAgIGlmICh2YXJpYW50ID09PSAnc3lub2NoZXNzJykge1xuICAgICAgICBtb2JpbGl0eSA9IGpwYXduKHBpZWNlLmNvbG9yKTtcbiAgICAgIH0gZWxzZSBpZih2YXJpYW50ID09PSAnbXVza2V0ZWVyJykge1xuICAgICAgICBtb2JpbGl0eSA9IHNwaWRlcjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1vYmlsaXR5ID0gc2lsdmVyKHBpZWNlLmNvbG9yKTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Nhbm5vbic6XG4gICAgICBtb2JpbGl0eSA9IG1jYW5ub247XG4gICAgICBicmVhaztcbiAgICBjYXNlICd1bmljb3JuJzpcbiAgICAgIG1vYmlsaXR5ID0gdW5pY29ybjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2RyYWdvbic6XG4gICAgICBtb2JpbGl0eSA9IGRyYWdvbjtcbiAgICAgIGJyZWFrO1xuICAgIH07XG4gICAgYnJlYWs7XG4gIH07XG4gIGNvbnN0IGFsbGtleXMgPSB1dGlsLmFsbEtleXNbZ2VvbV07XG5cbiAgY29uc3QgcG9zMmtleUdlb20gPSAoZ2VvbTogY2cuR2VvbWV0cnkpID0+ICggKHBvczogY2cuUG9zKSA9PiB1dGlsLnBvczJrZXkocG9zLCBnZW9tKSApO1xuICBjb25zdCBwb3Mya2V5ID0gcG9zMmtleUdlb20oZ2VvbSk7XG5cbiAgY29uc3Qga2V5MnBvc1JhbmswID0gKGZpcnN0cmFuazA6IGJvb2xlYW4pID0+ICggKGtleTogY2cuS2V5KSA9PiB1dGlsLmtleTJwb3Moa2V5LCBmaXJzdHJhbmswKSApO1xuICBjb25zdCBrZXkycG9zID0ga2V5MnBvc1JhbmswKGZpcnN0UmFua0lzMCk7XG5cbiAgcmV0dXJuIGFsbGtleXMubWFwKGtleTJwb3MpLmZpbHRlcihwb3MyID0+IHtcbiAgICByZXR1cm4gKHBvc1swXSAhPT0gcG9zMlswXSB8fCBwb3NbMV0gIT09IHBvczJbMV0pICYmIG1vYmlsaXR5KHBvc1swXSwgcG9zWzFdLCBwb3MyWzBdLCBwb3MyWzFdKTtcbiAgfSkubWFwKHBvczJrZXkpO1xufTtcbiIsImltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSdcbmltcG9ydCB7IGtleTJwb3MsIGNyZWF0ZUVsIH0gZnJvbSAnLi91dGlsJ1xuaW1wb3J0IHsgd2hpdGVQb3YgfSBmcm9tICcuL2JvYXJkJ1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWwnXG5pbXBvcnQgeyBBbmltQ3VycmVudCwgQW5pbVZlY3RvcnMsIEFuaW1WZWN0b3IsIEFuaW1GYWRpbmdzIH0gZnJvbSAnLi9hbmltJ1xuaW1wb3J0IHsgRHJhZ0N1cnJlbnQgfSBmcm9tICcuL2RyYWcnXG5pbXBvcnQgKiBhcyBjZyBmcm9tICcuL3R5cGVzJ1xuXG4vLyBgJGNvbG9yICRyb2xlYFxudHlwZSBQaWVjZU5hbWUgPSBzdHJpbmc7XG5cbmludGVyZmFjZSBTYW1lUGllY2VzIHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9XG5pbnRlcmZhY2UgU2FtZVNxdWFyZXMgeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH1cbmludGVyZmFjZSBNb3ZlZFBpZWNlcyB7IFtwaWVjZU5hbWU6IHN0cmluZ106IGNnLlBpZWNlTm9kZVtdIH1cbmludGVyZmFjZSBNb3ZlZFNxdWFyZXMgeyBbY2xhc3NOYW1lOiBzdHJpbmddOiBjZy5TcXVhcmVOb2RlW10gfVxuaW50ZXJmYWNlIFNxdWFyZUNsYXNzZXMgeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfVxuXG4vLyBwb3J0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vdmVsb2NlL2xpY2hvYmlsZS9ibG9iL21hc3Rlci9zcmMvanMvY2hlc3Nncm91bmQvdmlldy5qc1xuLy8gaW4gY2FzZSBvZiBidWdzLCBibGFtZSBAdmVsb2NlXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZW5kZXIoczogU3RhdGUpOiB2b2lkIHtcbiAgY29uc3QgZmlyc3RSYW5rSXMwID0gcy5kaW1lbnNpb25zLmhlaWdodCA9PT0gMTA7XG4gIGNvbnN0IGFzV2hpdGU6IGJvb2xlYW4gPSB3aGl0ZVBvdihzKSxcbiAgcG9zVG9UcmFuc2xhdGUgPSBzLmRvbS5yZWxhdGl2ZSA/IHV0aWwucG9zVG9UcmFuc2xhdGVSZWwgOiB1dGlsLnBvc1RvVHJhbnNsYXRlQWJzKHMuZG9tLmJvdW5kcygpLCBzLmRpbWVuc2lvbnMpLFxuICB0cmFuc2xhdGUgPSBzLmRvbS5yZWxhdGl2ZSA/IHV0aWwudHJhbnNsYXRlUmVsIDogdXRpbC50cmFuc2xhdGVBYnMsXG4gIGJvYXJkRWw6IEhUTUxFbGVtZW50ID0gcy5kb20uZWxlbWVudHMuYm9hcmQsXG4gIHBpZWNlczogY2cuUGllY2VzID0gcy5waWVjZXMsXG4gIGN1ckFuaW06IEFuaW1DdXJyZW50IHwgdW5kZWZpbmVkID0gcy5hbmltYXRpb24uY3VycmVudCxcbiAgYW5pbXM6IEFuaW1WZWN0b3JzID0gY3VyQW5pbSA/IGN1ckFuaW0ucGxhbi5hbmltcyA6IHt9LFxuICBmYWRpbmdzOiBBbmltRmFkaW5ncyA9IGN1ckFuaW0gPyBjdXJBbmltLnBsYW4uZmFkaW5ncyA6IHt9LFxuICBjdXJEcmFnOiBEcmFnQ3VycmVudCB8IHVuZGVmaW5lZCA9IHMuZHJhZ2dhYmxlLmN1cnJlbnQsXG4gIHNxdWFyZXM6IFNxdWFyZUNsYXNzZXMgPSBjb21wdXRlU3F1YXJlQ2xhc3NlcyhzKSxcbiAgc2FtZVBpZWNlczogU2FtZVBpZWNlcyA9IHt9LFxuICBzYW1lU3F1YXJlczogU2FtZVNxdWFyZXMgPSB7fSxcbiAgbW92ZWRQaWVjZXM6IE1vdmVkUGllY2VzID0ge30sXG4gIG1vdmVkU3F1YXJlczogTW92ZWRTcXVhcmVzID0ge30sXG4gIHBpZWNlc0tleXM6IGNnLktleVtdID0gT2JqZWN0LmtleXMocGllY2VzKSBhcyBjZy5LZXlbXTtcbiAgbGV0IGs6IGNnLktleSxcbiAgcDogY2cuUGllY2UgfCB1bmRlZmluZWQsXG4gIGVsOiBjZy5QaWVjZU5vZGUgfCBjZy5TcXVhcmVOb2RlLFxuICBwaWVjZUF0S2V5OiBjZy5QaWVjZSB8IHVuZGVmaW5lZCxcbiAgZWxQaWVjZU5hbWU6IFBpZWNlTmFtZSxcbiAgYW5pbTogQW5pbVZlY3RvciB8IHVuZGVmaW5lZCxcbiAgZmFkaW5nOiBjZy5QaWVjZSB8IHVuZGVmaW5lZCxcbiAgcE12ZHNldDogY2cuUGllY2VOb2RlW10sXG4gIHBNdmQ6IGNnLlBpZWNlTm9kZSB8IHVuZGVmaW5lZCxcbiAgc012ZHNldDogY2cuU3F1YXJlTm9kZVtdLFxuICBzTXZkOiBjZy5TcXVhcmVOb2RlIHwgdW5kZWZpbmVkO1xuXG4gIC8vIHdhbGsgb3ZlciBhbGwgYm9hcmQgZG9tIGVsZW1lbnRzLCBhcHBseSBhbmltYXRpb25zIGFuZCBmbGFnIG1vdmVkIHBpZWNlc1xuICBlbCA9IGJvYXJkRWwuZmlyc3RDaGlsZCBhcyBjZy5QaWVjZU5vZGUgfCBjZy5TcXVhcmVOb2RlO1xuICB3aGlsZSAoZWwpIHtcbiAgICBrID0gZWwuY2dLZXk7XG4gICAgaWYgKGlzUGllY2VOb2RlKGVsKSkge1xuICAgICAgcGllY2VBdEtleSA9IHBpZWNlc1trXTtcbiAgICAgIGFuaW0gPSBhbmltc1trXTtcbiAgICAgIGZhZGluZyA9IGZhZGluZ3Nba107XG4gICAgICBlbFBpZWNlTmFtZSA9IGVsLmNnUGllY2U7XG4gICAgICAvLyBpZiBwaWVjZSBub3QgYmVpbmcgZHJhZ2dlZCBhbnltb3JlLCByZW1vdmUgZHJhZ2dpbmcgc3R5bGVcbiAgICAgIGlmIChlbC5jZ0RyYWdnaW5nICYmICghY3VyRHJhZyB8fCBjdXJEcmFnLm9yaWcgIT09IGspKSB7XG4gICAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoJ2RyYWdnaW5nJyk7XG4gICAgICAgIHRyYW5zbGF0ZShlbCwgcG9zVG9UcmFuc2xhdGUoa2V5MnBvcyhrLCBmaXJzdFJhbmtJczApLCBhc1doaXRlLCBzLmRpbWVuc2lvbnMpKTtcbiAgICAgICAgZWwuY2dEcmFnZ2luZyA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgLy8gcmVtb3ZlIGZhZGluZyBjbGFzcyBpZiBpdCBzdGlsbCByZW1haW5zXG4gICAgICBpZiAoIWZhZGluZyAmJiBlbC5jZ0ZhZGluZykge1xuICAgICAgICBlbC5jZ0ZhZGluZyA9IGZhbHNlO1xuICAgICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKCdmYWRpbmcnKTtcbiAgICAgIH1cbiAgICAgIC8vIHRoZXJlIGlzIG5vdyBhIHBpZWNlIGF0IHRoaXMgZG9tIGtleVxuICAgICAgaWYgKHBpZWNlQXRLZXkpIHtcbiAgICAgICAgLy8gY29udGludWUgYW5pbWF0aW9uIGlmIGFscmVhZHkgYW5pbWF0aW5nIGFuZCBzYW1lIHBpZWNlXG4gICAgICAgIC8vIChvdGhlcndpc2UgaXQgY291bGQgYW5pbWF0ZSBhIGNhcHR1cmVkIHBpZWNlKVxuICAgICAgICBpZiAoYW5pbSAmJiBlbC5jZ0FuaW1hdGluZyAmJiBlbFBpZWNlTmFtZSA9PT0gcGllY2VOYW1lT2YocGllY2VBdEtleSkpIHtcbiAgICAgICAgICBjb25zdCBwb3MgPSBrZXkycG9zKGssIGZpcnN0UmFua0lzMCk7XG4gICAgICAgICAgcG9zWzBdICs9IGFuaW1bMl07XG4gICAgICAgICAgcG9zWzFdICs9IGFuaW1bM107XG4gICAgICAgICAgZWwuY2xhc3NMaXN0LmFkZCgnYW5pbScpO1xuICAgICAgICAgIHRyYW5zbGF0ZShlbCwgcG9zVG9UcmFuc2xhdGUocG9zLCBhc1doaXRlLCBzLmRpbWVuc2lvbnMpKTtcbiAgICAgICAgfSBlbHNlIGlmIChlbC5jZ0FuaW1hdGluZykge1xuICAgICAgICAgIGVsLmNnQW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnYW5pbScpO1xuICAgICAgICAgIHRyYW5zbGF0ZShlbCwgcG9zVG9UcmFuc2xhdGUoa2V5MnBvcyhrLCBmaXJzdFJhbmtJczApLCBhc1doaXRlLCBzLmRpbWVuc2lvbnMpKTtcbiAgICAgICAgICBpZiAocy5hZGRQaWVjZVpJbmRleCkgZWwuc3R5bGUuekluZGV4ID0gcG9zWkluZGV4KGtleTJwb3MoaywgZmlyc3RSYW5rSXMwKSwgYXNXaGl0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2FtZSBwaWVjZTogZmxhZyBhcyBzYW1lXG4gICAgICAgIGlmIChlbFBpZWNlTmFtZSA9PT0gcGllY2VOYW1lT2YocGllY2VBdEtleSkgJiYgKCFmYWRpbmcgfHwgIWVsLmNnRmFkaW5nKSkge1xuICAgICAgICAgIHNhbWVQaWVjZXNba10gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIGRpZmZlcmVudCBwaWVjZTogZmxhZyBhcyBtb3ZlZCB1bmxlc3MgaXQgaXMgYSBmYWRpbmcgcGllY2VcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYgKGZhZGluZyAmJiBlbFBpZWNlTmFtZSA9PT0gcGllY2VOYW1lT2YoZmFkaW5nKSkge1xuICAgICAgICAgICAgZWwuY2xhc3NMaXN0LmFkZCgnZmFkaW5nJyk7XG4gICAgICAgICAgICBlbC5jZ0ZhZGluZyA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChtb3ZlZFBpZWNlc1tlbFBpZWNlTmFtZV0pIG1vdmVkUGllY2VzW2VsUGllY2VOYW1lXS5wdXNoKGVsKTtcbiAgICAgICAgICAgIGVsc2UgbW92ZWRQaWVjZXNbZWxQaWVjZU5hbWVdID0gW2VsXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIG5vIHBpZWNlOiBmbGFnIGFzIG1vdmVkXG4gICAgICBlbHNlIHtcbiAgICAgICAgaWYgKG1vdmVkUGllY2VzW2VsUGllY2VOYW1lXSkgbW92ZWRQaWVjZXNbZWxQaWVjZU5hbWVdLnB1c2goZWwpO1xuICAgICAgICBlbHNlIG1vdmVkUGllY2VzW2VsUGllY2VOYW1lXSA9IFtlbF07XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKGlzU3F1YXJlTm9kZShlbCkpIHtcbiAgICAgIGNvbnN0IGNuID0gZWwuY2xhc3NOYW1lO1xuICAgICAgaWYgKHNxdWFyZXNba10gPT09IGNuKSBzYW1lU3F1YXJlc1trXSA9IHRydWU7XG4gICAgICBlbHNlIGlmIChtb3ZlZFNxdWFyZXNbY25dKSBtb3ZlZFNxdWFyZXNbY25dLnB1c2goZWwpO1xuICAgICAgZWxzZSBtb3ZlZFNxdWFyZXNbY25dID0gW2VsXTtcbiAgICB9XG4gICAgZWwgPSBlbC5uZXh0U2libGluZyBhcyBjZy5QaWVjZU5vZGUgfCBjZy5TcXVhcmVOb2RlO1xuICB9XG5cbiAgLy8gd2FsayBvdmVyIGFsbCBzcXVhcmVzIGluIGN1cnJlbnQgc2V0LCBhcHBseSBkb20gY2hhbmdlcyB0byBtb3ZlZCBzcXVhcmVzXG4gIC8vIG9yIGFwcGVuZCBuZXcgc3F1YXJlc1xuICBmb3IgKGNvbnN0IHNrIGluIHNxdWFyZXMpIHtcbiAgICBpZiAoIXNhbWVTcXVhcmVzW3NrXSkge1xuICAgICAgc012ZHNldCA9IG1vdmVkU3F1YXJlc1tzcXVhcmVzW3NrXV07XG4gICAgICBzTXZkID0gc012ZHNldCAmJiBzTXZkc2V0LnBvcCgpO1xuICAgICAgY29uc3QgdHJhbnNsYXRpb24gPSBwb3NUb1RyYW5zbGF0ZShrZXkycG9zKHNrIGFzIGNnLktleSwgZmlyc3RSYW5rSXMwKSwgYXNXaGl0ZSwgcy5kaW1lbnNpb25zKTtcbiAgICAgIGlmIChzTXZkKSB7XG4gICAgICAgIHNNdmQuY2dLZXkgPSBzayBhcyBjZy5LZXk7XG4gICAgICAgIHRyYW5zbGF0ZShzTXZkLCB0cmFuc2xhdGlvbik7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgY29uc3Qgc3F1YXJlTm9kZSA9IGNyZWF0ZUVsKCdzcXVhcmUnLCBzcXVhcmVzW3NrXSkgYXMgY2cuU3F1YXJlTm9kZTtcbiAgICAgICAgc3F1YXJlTm9kZS5jZ0tleSA9IHNrIGFzIGNnLktleTtcbiAgICAgICAgdHJhbnNsYXRlKHNxdWFyZU5vZGUsIHRyYW5zbGF0aW9uKTtcbiAgICAgICAgYm9hcmRFbC5pbnNlcnRCZWZvcmUoc3F1YXJlTm9kZSwgYm9hcmRFbC5maXJzdENoaWxkKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyB3YWxrIG92ZXIgYWxsIHBpZWNlcyBpbiBjdXJyZW50IHNldCwgYXBwbHkgZG9tIGNoYW5nZXMgdG8gbW92ZWQgcGllY2VzXG4gIC8vIG9yIGFwcGVuZCBuZXcgcGllY2VzXG4gIGZvciAoY29uc3QgaiBpbiBwaWVjZXNLZXlzKSB7XG4gICAgayA9IHBpZWNlc0tleXNbal07XG4gICAgcCA9IHBpZWNlc1trXSE7XG4gICAgYW5pbSA9IGFuaW1zW2tdO1xuICAgIGlmICghc2FtZVBpZWNlc1trXSkge1xuICAgICAgcE12ZHNldCA9IG1vdmVkUGllY2VzW3BpZWNlTmFtZU9mKHApXTtcbiAgICAgIHBNdmQgPSBwTXZkc2V0ICYmIHBNdmRzZXQucG9wKCk7XG4gICAgICAvLyBhIHNhbWUgcGllY2Ugd2FzIG1vdmVkXG4gICAgICBpZiAocE12ZCkge1xuICAgICAgICAvLyBhcHBseSBkb20gY2hhbmdlc1xuICAgICAgICBwTXZkLmNnS2V5ID0gaztcbiAgICAgICAgaWYgKHBNdmQuY2dGYWRpbmcpIHtcbiAgICAgICAgICBwTXZkLmNsYXNzTGlzdC5yZW1vdmUoJ2ZhZGluZycpO1xuICAgICAgICAgIHBNdmQuY2dGYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwb3MgPSBrZXkycG9zKGssIGZpcnN0UmFua0lzMCk7XG4gICAgICAgIGlmIChzLmFkZFBpZWNlWkluZGV4KSBwTXZkLnN0eWxlLnpJbmRleCA9IHBvc1pJbmRleChwb3MsIGFzV2hpdGUpO1xuICAgICAgICBpZiAoYW5pbSkge1xuICAgICAgICAgIHBNdmQuY2dBbmltYXRpbmcgPSB0cnVlO1xuICAgICAgICAgIHBNdmQuY2xhc3NMaXN0LmFkZCgnYW5pbScpO1xuICAgICAgICAgIHBvc1swXSArPSBhbmltWzJdO1xuICAgICAgICAgIHBvc1sxXSArPSBhbmltWzNdO1xuICAgICAgICB9XG4gICAgICAgIHRyYW5zbGF0ZShwTXZkLCBwb3NUb1RyYW5zbGF0ZShwb3MsIGFzV2hpdGUsIHMuZGltZW5zaW9ucykpO1xuICAgICAgfVxuICAgICAgLy8gbm8gcGllY2UgaW4gbW92ZWQgb2JqOiBpbnNlcnQgdGhlIG5ldyBwaWVjZVxuICAgICAgLy8gYXNzdW1lcyB0aGUgbmV3IHBpZWNlIGlzIG5vdCBiZWluZyBkcmFnZ2VkXG4gICAgICBlbHNlIHtcblxuICAgICAgICBjb25zdCBwaWVjZU5hbWUgPSBwaWVjZU5hbWVPZihwKSxcbiAgICAgICAgcGllY2VOb2RlID0gY3JlYXRlRWwoJ3BpZWNlJywgcGllY2VOYW1lKSBhcyBjZy5QaWVjZU5vZGUsXG4gICAgICAgIHBvcyA9IGtleTJwb3MoaywgZmlyc3RSYW5rSXMwKTtcblxuICAgICAgICBwaWVjZU5vZGUuY2dQaWVjZSA9IHBpZWNlTmFtZTtcbiAgICAgICAgcGllY2VOb2RlLmNnS2V5ID0gaztcbiAgICAgICAgaWYgKGFuaW0pIHtcbiAgICAgICAgICBwaWVjZU5vZGUuY2dBbmltYXRpbmcgPSB0cnVlO1xuICAgICAgICAgIHBvc1swXSArPSBhbmltWzJdO1xuICAgICAgICAgIHBvc1sxXSArPSBhbmltWzNdO1xuICAgICAgICB9XG4gICAgICAgIHRyYW5zbGF0ZShwaWVjZU5vZGUsIHBvc1RvVHJhbnNsYXRlKHBvcywgYXNXaGl0ZSwgcy5kaW1lbnNpb25zKSk7XG5cbiAgICAgICAgaWYgKHMuYWRkUGllY2VaSW5kZXgpIHBpZWNlTm9kZS5zdHlsZS56SW5kZXggPSBwb3NaSW5kZXgocG9zLCBhc1doaXRlKTtcblxuICAgICAgICBib2FyZEVsLmFwcGVuZENoaWxkKHBpZWNlTm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gcmVtb3ZlIGFueSBlbGVtZW50IHRoYXQgcmVtYWlucyBpbiB0aGUgbW92ZWQgc2V0c1xuICBmb3IgKGNvbnN0IGkgaW4gbW92ZWRQaWVjZXMpIHJlbW92ZU5vZGVzKHMsIG1vdmVkUGllY2VzW2ldKTtcbiAgZm9yIChjb25zdCBpIGluIG1vdmVkU3F1YXJlcykgcmVtb3ZlTm9kZXMocywgbW92ZWRTcXVhcmVzW2ldKTtcbn1cblxuZnVuY3Rpb24gaXNQaWVjZU5vZGUoZWw6IGNnLlBpZWNlTm9kZSB8IGNnLlNxdWFyZU5vZGUpOiBlbCBpcyBjZy5QaWVjZU5vZGUge1xuICByZXR1cm4gZWwudGFnTmFtZSA9PT0gJ1BJRUNFJztcbn1cbmZ1bmN0aW9uIGlzU3F1YXJlTm9kZShlbDogY2cuUGllY2VOb2RlIHwgY2cuU3F1YXJlTm9kZSk6IGVsIGlzIGNnLlNxdWFyZU5vZGUge1xuICByZXR1cm4gZWwudGFnTmFtZSA9PT0gJ1NRVUFSRSc7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZU5vZGVzKHM6IFN0YXRlLCBub2RlczogSFRNTEVsZW1lbnRbXSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IGkgaW4gbm9kZXMpIHMuZG9tLmVsZW1lbnRzLmJvYXJkLnJlbW92ZUNoaWxkKG5vZGVzW2ldKTtcbn1cblxuZnVuY3Rpb24gcG9zWkluZGV4KHBvczogY2cuUG9zLCBhc1doaXRlOiBib29sZWFuKTogc3RyaW5nIHtcbiAgbGV0IHogPSAyICsgKHBvc1sxXSAtIDEpICogOCArICg4IC0gcG9zWzBdKTtcbiAgaWYgKGFzV2hpdGUpIHogPSA2NyAtIHo7XG4gIHJldHVybiB6ICsgJyc7XG59XG5cbmZ1bmN0aW9uIHBpZWNlTmFtZU9mKHBpZWNlOiBjZy5QaWVjZSk6IHN0cmluZyB7XG4gIHJldHVybiBgJHtwaWVjZS5jb2xvcn0gJHtwaWVjZS5yb2xlfWA7XG59XG5cbmZ1bmN0aW9uIGNvbXB1dGVTcXVhcmVDbGFzc2VzKHM6IFN0YXRlKTogU3F1YXJlQ2xhc3NlcyB7XG4gIGNvbnN0IHNxdWFyZXM6IFNxdWFyZUNsYXNzZXMgPSB7fTtcbiAgbGV0IGk6IGFueSwgazogY2cuS2V5O1xuICBpZiAocy5sYXN0TW92ZSAmJiBzLmhpZ2hsaWdodC5sYXN0TW92ZSkgZm9yIChpIGluIHMubGFzdE1vdmUpIHtcbiAgICBpZiAocy5sYXN0TW92ZVtpXSAhPSAnejAnKSB7XG4gICAgICBhZGRTcXVhcmUoc3F1YXJlcywgcy5sYXN0TW92ZVtpXSwgJ2xhc3QtbW92ZScpO1xuICAgIH1cbiAgfVxuICBpZiAocy5jaGVjayAmJiBzLmhpZ2hsaWdodC5jaGVjaykgYWRkU3F1YXJlKHNxdWFyZXMsIHMuY2hlY2ssICdjaGVjaycpO1xuICBpZiAocy5zZWxlY3RlZCkge1xuICAgIGlmIChzLnNlbGVjdGVkICE9ICd6MCcpIHtcbiAgICAgIGFkZFNxdWFyZShzcXVhcmVzLCBzLnNlbGVjdGVkLCAnc2VsZWN0ZWQnKTtcbiAgICB9XG4gICAgaWYgKHMubW92YWJsZS5zaG93RGVzdHMpIHtcbiAgICAgIGNvbnN0IGRlc3RzID0gcy5tb3ZhYmxlLmRlc3RzICYmIHMubW92YWJsZS5kZXN0c1tzLnNlbGVjdGVkXTtcbiAgICAgIGlmIChkZXN0cykgZm9yIChpIGluIGRlc3RzKSB7XG4gICAgICAgIGsgPSBkZXN0c1tpXTtcbiAgICAgICAgYWRkU3F1YXJlKHNxdWFyZXMsIGssICdtb3ZlLWRlc3QnICsgKHMucGllY2VzW2tdID8gJyBvYycgOiAnJykpO1xuICAgICAgfVxuICAgICAgY29uc3QgcERlc3RzID0gcy5wcmVtb3ZhYmxlLmRlc3RzO1xuICAgICAgaWYgKHBEZXN0cykgZm9yIChpIGluIHBEZXN0cykge1xuICAgICAgICBrID0gcERlc3RzW2ldO1xuICAgICAgICBhZGRTcXVhcmUoc3F1YXJlcywgaywgJ3ByZW1vdmUtZGVzdCcgKyAocy5waWVjZXNba10gPyAnIG9jJyA6ICcnKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGNvbnN0IHByZW1vdmUgPSBzLnByZW1vdmFibGUuY3VycmVudDtcbiAgaWYgKHByZW1vdmUpIGZvciAoaSBpbiBwcmVtb3ZlKSBhZGRTcXVhcmUoc3F1YXJlcywgcHJlbW92ZVtpXSwgJ2N1cnJlbnQtcHJlbW92ZScpO1xuICBlbHNlIGlmIChzLnByZWRyb3BwYWJsZS5jdXJyZW50KSBhZGRTcXVhcmUoc3F1YXJlcywgcy5wcmVkcm9wcGFibGUuY3VycmVudC5rZXksICdjdXJyZW50LXByZW1vdmUnKTtcblxuICBjb25zdCBvID0gcy5leHBsb2Rpbmc7XG4gIGlmIChvKSBmb3IgKGkgaW4gby5rZXlzKSBhZGRTcXVhcmUoc3F1YXJlcywgby5rZXlzW2ldLCAnZXhwbG9kaW5nJyArIG8uc3RhZ2UpO1xuXG4gIHJldHVybiBzcXVhcmVzO1xufVxuXG5mdW5jdGlvbiBhZGRTcXVhcmUoc3F1YXJlczogU3F1YXJlQ2xhc3Nlcywga2V5OiBjZy5LZXksIGtsYXNzOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKHNxdWFyZXNba2V5XSkgc3F1YXJlc1trZXldICs9ICcgJyArIGtsYXNzO1xuICBlbHNlIHNxdWFyZXNba2V5XSA9IGtsYXNzO1xufVxuIiwiaW1wb3J0ICogYXMgZmVuIGZyb20gJy4vZmVuJ1xuaW1wb3J0IHsgQW5pbUN1cnJlbnQgfSBmcm9tICcuL2FuaW0nXG5pbXBvcnQgeyBEcmFnQ3VycmVudCB9IGZyb20gJy4vZHJhZydcbmltcG9ydCB7IERyYXdhYmxlIH0gZnJvbSAnLi9kcmF3J1xuaW1wb3J0IHsgdGltZXIgfSBmcm9tICcuL3V0aWwnXG5pbXBvcnQgKiBhcyBjZyBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IGludGVyZmFjZSBTdGF0ZSB7XG4gIHBpZWNlczogY2cuUGllY2VzO1xuICBvcmllbnRhdGlvbjogY2cuQ29sb3I7IC8vIGJvYXJkIG9yaWVudGF0aW9uLiB3aGl0ZSB8IGJsYWNrXG4gIHR1cm5Db2xvcjogY2cuQ29sb3I7IC8vIHR1cm4gdG8gcGxheS4gd2hpdGUgfCBibGFja1xuICBjaGVjaz86IGNnLktleTsgLy8gc3F1YXJlIGN1cnJlbnRseSBpbiBjaGVjayBcImEyXCJcbiAgbGFzdE1vdmU/OiBjZy5LZXlbXTsgLy8gc3F1YXJlcyBwYXJ0IG9mIHRoZSBsYXN0IG1vdmUgW1wiYzNcIjsgXCJjNFwiXVxuICBzZWxlY3RlZD86IGNnLktleTsgLy8gc3F1YXJlIGN1cnJlbnRseSBzZWxlY3RlZCBcImExXCJcbiAgY29vcmRpbmF0ZXM6IGJvb2xlYW47IC8vIGluY2x1ZGUgY29vcmRzIGF0dHJpYnV0ZXNcbiAgYXV0b0Nhc3RsZTogYm9vbGVhbjsgLy8gaW1tZWRpYXRlbHkgY29tcGxldGUgdGhlIGNhc3RsZSBieSBtb3ZpbmcgdGhlIHJvb2sgYWZ0ZXIga2luZyBtb3ZlXG4gIHZpZXdPbmx5OiBib29sZWFuOyAvLyBkb24ndCBiaW5kIGV2ZW50czogdGhlIHVzZXIgd2lsbCBuZXZlciBiZSBhYmxlIHRvIG1vdmUgcGllY2VzIGFyb3VuZFxuICBkaXNhYmxlQ29udGV4dE1lbnU6IGJvb2xlYW47IC8vIGJlY2F1c2Ugd2hvIG5lZWRzIGEgY29udGV4dCBtZW51IG9uIGEgY2hlc3Nib2FyZFxuICByZXNpemFibGU6IGJvb2xlYW47IC8vIGxpc3RlbnMgdG8gY2hlc3Nncm91bmQucmVzaXplIG9uIGRvY3VtZW50LmJvZHkgdG8gY2xlYXIgYm91bmRzIGNhY2hlXG4gIGFkZFBpZWNlWkluZGV4OiBib29sZWFuOyAvLyBhZGRzIHotaW5kZXggdmFsdWVzIHRvIHBpZWNlcyAoZm9yIDNEKVxuICBwaWVjZUtleTogYm9vbGVhbjsgLy8gYWRkIGEgZGF0YS1rZXkgYXR0cmlidXRlIHRvIHBpZWNlIGVsZW1lbnRzXG4gIGhpZ2hsaWdodDoge1xuICAgIGxhc3RNb3ZlOiBib29sZWFuOyAvLyBhZGQgbGFzdC1tb3ZlIGNsYXNzIHRvIHNxdWFyZXNcbiAgICBjaGVjazogYm9vbGVhbjsgLy8gYWRkIGNoZWNrIGNsYXNzIHRvIHNxdWFyZXNcbiAgfTtcbiAgYW5pbWF0aW9uOiB7XG4gICAgZW5hYmxlZDogYm9vbGVhbjtcbiAgICBkdXJhdGlvbjogbnVtYmVyO1xuICAgIGN1cnJlbnQ/OiBBbmltQ3VycmVudDtcbiAgfTtcbiAgbW92YWJsZToge1xuICAgIGZyZWU6IGJvb2xlYW47IC8vIGFsbCBtb3ZlcyBhcmUgdmFsaWQgLSBib2FyZCBlZGl0b3JcbiAgICBjb2xvcj86IGNnLkNvbG9yIHwgJ2JvdGgnOyAvLyBjb2xvciB0aGF0IGNhbiBtb3ZlLiB3aGl0ZSB8IGJsYWNrIHwgYm90aFxuICAgIGRlc3RzPzogY2cuRGVzdHM7IC8vIHZhbGlkIG1vdmVzLiB7XCJhMlwiIFtcImEzXCIgXCJhNFwiXSBcImIxXCIgW1wiYTNcIiBcImMzXCJdfVxuICAgIHNob3dEZXN0czogYm9vbGVhbjsgLy8gd2hldGhlciB0byBhZGQgdGhlIG1vdmUtZGVzdCBjbGFzcyBvbiBzcXVhcmVzXG4gICAgZXZlbnRzOiB7XG4gICAgICBhZnRlcj86IChvcmlnOiBjZy5LZXksIGRlc3Q6IGNnLktleSwgbWV0YWRhdGE6IGNnLk1vdmVNZXRhZGF0YSkgPT4gdm9pZDsgLy8gY2FsbGVkIGFmdGVyIHRoZSBtb3ZlIGhhcyBiZWVuIHBsYXllZFxuICAgICAgYWZ0ZXJOZXdQaWVjZT86IChyb2xlOiBjZy5Sb2xlLCBrZXk6IGNnLktleSwgbWV0YWRhdGE6IGNnLk1vdmVNZXRhZGF0YSkgPT4gdm9pZDsgLy8gY2FsbGVkIGFmdGVyIGEgbmV3IHBpZWNlIGlzIGRyb3BwZWQgb24gdGhlIGJvYXJkXG4gICAgfTtcbiAgICByb29rQ2FzdGxlOiBib29sZWFuIC8vIGNhc3RsZSBieSBtb3ZpbmcgdGhlIGtpbmcgdG8gdGhlIHJvb2tcbiAgfTtcbiAgcHJlbW92YWJsZToge1xuICAgIGVuYWJsZWQ6IGJvb2xlYW47IC8vIGFsbG93IHByZW1vdmVzIGZvciBjb2xvciB0aGF0IGNhbiBub3QgbW92ZVxuICAgIHNob3dEZXN0czogYm9vbGVhbjsgLy8gd2hldGhlciB0byBhZGQgdGhlIHByZW1vdmUtZGVzdCBjbGFzcyBvbiBzcXVhcmVzXG4gICAgY2FzdGxlOiBib29sZWFuOyAvLyB3aGV0aGVyIHRvIGFsbG93IGtpbmcgY2FzdGxlIHByZW1vdmVzXG4gICAgZGVzdHM/OiBjZy5LZXlbXTsgLy8gcHJlbW92ZSBkZXN0aW5hdGlvbnMgZm9yIHRoZSBjdXJyZW50IHNlbGVjdGlvblxuICAgIGN1cnJlbnQ/OiBjZy5LZXlQYWlyOyAvLyBrZXlzIG9mIHRoZSBjdXJyZW50IHNhdmVkIHByZW1vdmUgW1wiZTJcIiBcImU0XCJdXG4gICAgZXZlbnRzOiB7XG4gICAgICBzZXQ/OiAob3JpZzogY2cuS2V5LCBkZXN0OiBjZy5LZXksIG1ldGFkYXRhPzogY2cuU2V0UHJlbW92ZU1ldGFkYXRhKSA9PiB2b2lkOyAvLyBjYWxsZWQgYWZ0ZXIgdGhlIHByZW1vdmUgaGFzIGJlZW4gc2V0XG4gICAgICB1bnNldD86ICgpID0+IHZvaWQ7ICAvLyBjYWxsZWQgYWZ0ZXIgdGhlIHByZW1vdmUgaGFzIGJlZW4gdW5zZXRcbiAgICB9XG4gIH07XG4gIHByZWRyb3BwYWJsZToge1xuICAgIGVuYWJsZWQ6IGJvb2xlYW47IC8vIGFsbG93IHByZWRyb3BzIGZvciBjb2xvciB0aGF0IGNhbiBub3QgbW92ZVxuICAgIGN1cnJlbnQ/OiB7IC8vIGN1cnJlbnQgc2F2ZWQgcHJlZHJvcCB7cm9sZTogJ2tuaWdodCc7IGtleTogJ2U0J31cbiAgICAgIHJvbGU6IGNnLlJvbGU7XG4gICAgICBrZXk6IGNnLktleVxuICAgIH07XG4gICAgZXZlbnRzOiB7XG4gICAgICBzZXQ/OiAocm9sZTogY2cuUm9sZSwga2V5OiBjZy5LZXkpID0+IHZvaWQ7IC8vIGNhbGxlZCBhZnRlciB0aGUgcHJlZHJvcCBoYXMgYmVlbiBzZXRcbiAgICAgIHVuc2V0PzogKCkgPT4gdm9pZDsgLy8gY2FsbGVkIGFmdGVyIHRoZSBwcmVkcm9wIGhhcyBiZWVuIHVuc2V0XG4gICAgfVxuICB9O1xuICBkcmFnZ2FibGU6IHtcbiAgICBlbmFibGVkOiBib29sZWFuOyAvLyBhbGxvdyBtb3ZlcyAmIHByZW1vdmVzIHRvIHVzZSBkcmFnJ24gZHJvcFxuICAgIGRpc3RhbmNlOiBudW1iZXI7IC8vIG1pbmltdW0gZGlzdGFuY2UgdG8gaW5pdGlhdGUgYSBkcmFnOyBpbiBwaXhlbHNcbiAgICBhdXRvRGlzdGFuY2U6IGJvb2xlYW47IC8vIGxldHMgY2hlc3Nncm91bmQgc2V0IGRpc3RhbmNlIHRvIHplcm8gd2hlbiB1c2VyIGRyYWdzIHBpZWNlc1xuICAgIGNlbnRlclBpZWNlOiBib29sZWFuOyAvLyBjZW50ZXIgdGhlIHBpZWNlIG9uIGN1cnNvciBhdCBkcmFnIHN0YXJ0XG4gICAgc2hvd0dob3N0OiBib29sZWFuOyAvLyBzaG93IGdob3N0IG9mIHBpZWNlIGJlaW5nIGRyYWdnZWRcbiAgICBkZWxldGVPbkRyb3BPZmY6IGJvb2xlYW47IC8vIGRlbGV0ZSBhIHBpZWNlIHdoZW4gaXQgaXMgZHJvcHBlZCBvZmYgdGhlIGJvYXJkXG4gICAgY3VycmVudD86IERyYWdDdXJyZW50O1xuICB9O1xuICBkcm9wbW9kZToge1xuICAgIGFjdGl2ZTogYm9vbGVhbjtcbiAgICBwaWVjZT86IGNnLlBpZWNlO1xuICB9XG4gIHNlbGVjdGFibGU6IHtcbiAgICAvLyBkaXNhYmxlIHRvIGVuZm9yY2UgZHJhZ2dpbmcgb3ZlciBjbGljay1jbGljayBtb3ZlXG4gICAgZW5hYmxlZDogYm9vbGVhblxuICB9O1xuICBzdGF0czoge1xuICAgIC8vIHdhcyBsYXN0IHBpZWNlIGRyYWdnZWQgb3IgY2xpY2tlZD9cbiAgICAvLyBuZWVkcyBkZWZhdWx0IHRvIGZhbHNlIGZvciB0b3VjaFxuICAgIGRyYWdnZWQ6IGJvb2xlYW4sXG4gICAgY3RybEtleT86IGJvb2xlYW5cbiAgfTtcbiAgZXZlbnRzOiB7XG4gICAgY2hhbmdlPzogKCkgPT4gdm9pZDsgLy8gY2FsbGVkIGFmdGVyIHRoZSBzaXR1YXRpb24gY2hhbmdlcyBvbiB0aGUgYm9hcmRcbiAgICAvLyBjYWxsZWQgYWZ0ZXIgYSBwaWVjZSBoYXMgYmVlbiBtb3ZlZC5cbiAgICAvLyBjYXB0dXJlZFBpZWNlIGlzIHVuZGVmaW5lZCBvciBsaWtlIHtjb2xvcjogJ3doaXRlJzsgJ3JvbGUnOiAncXVlZW4nfVxuICAgIG1vdmU/OiAob3JpZzogY2cuS2V5LCBkZXN0OiBjZy5LZXksIGNhcHR1cmVkUGllY2U/OiBjZy5QaWVjZSkgPT4gdm9pZDtcbiAgICBkcm9wTmV3UGllY2U/OiAocGllY2U6IGNnLlBpZWNlLCBrZXk6IGNnLktleSkgPT4gdm9pZDtcbiAgICBzZWxlY3Q/OiAoa2V5OiBjZy5LZXkpID0+IHZvaWQgLy8gY2FsbGVkIHdoZW4gYSBzcXVhcmUgaXMgc2VsZWN0ZWRcbiAgICBpbnNlcnQ/OiAoZWxlbWVudHM6IGNnLkVsZW1lbnRzKSA9PiB2b2lkOyAvLyB3aGVuIHRoZSBib2FyZCBET00gaGFzIGJlZW4gKHJlKWluc2VydGVkXG4gIH07XG4gIGRyYXdhYmxlOiBEcmF3YWJsZSxcbiAgZXhwbG9kaW5nPzogY2cuRXhwbG9kaW5nO1xuICBkb206IGNnLkRvbSxcbiAgaG9sZDogY2cuVGltZXIsXG4gIGRpbWVuc2lvbnM6IGNnLkJvYXJkRGltZW5zaW9ucywgLy8gbnVtYmVyIG9mIGxpbmVzIGFuZCByYW5rcyBvZiB0aGUgYm9hcmQge3dpZHRoOiAxMCwgaGVpZ2h0OiA4fVxuICBnZW9tZXRyeTogY2cuR2VvbWV0cnksIC8vIGRpbTh4OCB8IGRpbTl4OSB8IGRpbTEweDggfCBkaW05eDEwXG4gIHZhcmlhbnQ6IGNnLlZhcmlhbnQsXG4gIG5vdGF0aW9uOiBjZy5Ob3RhdGlvbixcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRzKCk6IFBhcnRpYWw8U3RhdGU+IHtcbiAgcmV0dXJuIHtcbiAgICBwaWVjZXM6IGZlbi5yZWFkKGZlbi5pbml0aWFsLCBjZy5HZW9tZXRyeS5kaW04eDgpLFxuICAgIG9yaWVudGF0aW9uOiAnd2hpdGUnLFxuICAgIHR1cm5Db2xvcjogJ3doaXRlJyxcbiAgICBjb29yZGluYXRlczogdHJ1ZSxcbiAgICBhdXRvQ2FzdGxlOiB0cnVlLFxuICAgIHZpZXdPbmx5OiBmYWxzZSxcbiAgICBkaXNhYmxlQ29udGV4dE1lbnU6IGZhbHNlLFxuICAgIHJlc2l6YWJsZTogdHJ1ZSxcbiAgICBhZGRQaWVjZVpJbmRleDogZmFsc2UsXG4gICAgcGllY2VLZXk6IGZhbHNlLFxuICAgIGhpZ2hsaWdodDoge1xuICAgICAgbGFzdE1vdmU6IHRydWUsXG4gICAgICBjaGVjazogdHJ1ZVxuICAgIH0sXG4gICAgYW5pbWF0aW9uOiB7XG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgZHVyYXRpb246IDIwMFxuICAgIH0sXG4gICAgbW92YWJsZToge1xuICAgICAgZnJlZTogdHJ1ZSxcbiAgICAgIGNvbG9yOiAnYm90aCcsXG4gICAgICBzaG93RGVzdHM6IHRydWUsXG4gICAgICBldmVudHM6IHt9LFxuICAgICAgcm9va0Nhc3RsZTogdHJ1ZVxuICAgIH0sXG4gICAgcHJlbW92YWJsZToge1xuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgIHNob3dEZXN0czogdHJ1ZSxcbiAgICAgIGNhc3RsZTogdHJ1ZSxcbiAgICAgIGV2ZW50czoge31cbiAgICB9LFxuICAgIHByZWRyb3BwYWJsZToge1xuICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICBldmVudHM6IHt9XG4gICAgfSxcbiAgICBkcmFnZ2FibGU6IHtcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICBkaXN0YW5jZTogMyxcbiAgICAgIGF1dG9EaXN0YW5jZTogdHJ1ZSxcbiAgICAgIGNlbnRlclBpZWNlOiB0cnVlLFxuICAgICAgc2hvd0dob3N0OiB0cnVlLFxuICAgICAgZGVsZXRlT25Ecm9wT2ZmOiBmYWxzZVxuICAgIH0sXG4gICAgZHJvcG1vZGU6IHtcbiAgICAgIGFjdGl2ZTogZmFsc2VcbiAgICB9LFxuICAgIHNlbGVjdGFibGU6IHtcbiAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICB9LFxuICAgIHN0YXRzOiB7XG4gICAgICAvLyBvbiB0b3VjaHNjcmVlbiwgZGVmYXVsdCB0byBcInRhcC10YXBcIiBtb3Zlc1xuICAgICAgLy8gaW5zdGVhZCBvZiBkcmFnXG4gICAgICBkcmFnZ2VkOiAhKCdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdylcbiAgICB9LFxuICAgIGV2ZW50czoge30sXG4gICAgZHJhd2FibGU6IHtcbiAgICAgIGVuYWJsZWQ6IHRydWUsIC8vIGNhbiBkcmF3XG4gICAgICB2aXNpYmxlOiB0cnVlLCAvLyBjYW4gdmlld1xuICAgICAgZXJhc2VPbkNsaWNrOiB0cnVlLFxuICAgICAgc2hhcGVzOiBbXSxcbiAgICAgIGF1dG9TaGFwZXM6IFtdLFxuICAgICAgYnJ1c2hlczoge1xuICAgICAgICBncmVlbjogeyBrZXk6ICdnJywgY29sb3I6ICcjMTU3ODFCJywgb3BhY2l0eTogMSwgbGluZVdpZHRoOiAxMCB9LFxuICAgICAgICByZWQ6IHsga2V5OiAncicsIGNvbG9yOiAnIzg4MjAyMCcsIG9wYWNpdHk6IDEsIGxpbmVXaWR0aDogMTAgfSxcbiAgICAgICAgYmx1ZTogeyBrZXk6ICdiJywgY29sb3I6ICcjMDAzMDg4Jywgb3BhY2l0eTogMSwgbGluZVdpZHRoOiAxMCB9LFxuICAgICAgICB5ZWxsb3c6IHsga2V5OiAneScsIGNvbG9yOiAnI2U2OGYwMCcsIG9wYWNpdHk6IDEsIGxpbmVXaWR0aDogMTAgfSxcbiAgICAgICAgcGFsZUJsdWU6IHsga2V5OiAncGInLCBjb2xvcjogJyMwMDMwODgnLCBvcGFjaXR5OiAwLjQsIGxpbmVXaWR0aDogMTUgfSxcbiAgICAgICAgcGFsZUdyZWVuOiB7IGtleTogJ3BnJywgY29sb3I6ICcjMTU3ODFCJywgb3BhY2l0eTogMC40LCBsaW5lV2lkdGg6IDE1IH0sXG4gICAgICAgIHBhbGVSZWQ6IHsga2V5OiAncHInLCBjb2xvcjogJyM4ODIwMjAnLCBvcGFjaXR5OiAwLjQsIGxpbmVXaWR0aDogMTUgfSxcbiAgICAgICAgcGFsZUdyZXk6IHsga2V5OiAncGdyJywgY29sb3I6ICcjNGE0YTRhJywgb3BhY2l0eTogMC4zNSwgbGluZVdpZHRoOiAxNSB9XG4gICAgICB9LFxuICAgICAgcGllY2VzOiB7XG4gICAgICAgIGJhc2VVcmw6ICdodHRwczovL2xpY2hlc3MxLm9yZy9hc3NldHMvcGllY2UvY2J1cm5ldHQvJ1xuICAgICAgfSxcbiAgICAgIHByZXZTdmdIYXNoOiAnJ1xuICAgIH0sXG4gICAgaG9sZDogdGltZXIoKSxcbiAgICBkaW1lbnNpb25zOiB7d2lkdGg6IDgsIGhlaWdodDogOH0sXG4gICAgZ2VvbWV0cnk6IGNnLkdlb21ldHJ5LmRpbTh4OCxcbiAgICB2YXJpYW50OiAnY2hlc3MnLFxuICAgIG5vdGF0aW9uOiBjZy5Ob3RhdGlvbi5ERUZBVUxULFxuICB9O1xufVxuIiwiaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJ1xuaW1wb3J0IHsga2V5MnBvcyB9IGZyb20gJy4vdXRpbCdcbmltcG9ydCB7IERyYXdhYmxlLCBEcmF3U2hhcGUsIERyYXdTaGFwZVBpZWNlLCBEcmF3QnJ1c2gsIERyYXdCcnVzaGVzLCBEcmF3TW9kaWZpZXJzIH0gZnJvbSAnLi9kcmF3J1xuaW1wb3J0ICogYXMgY2cgZnJvbSAnLi90eXBlcydcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQodGFnTmFtZTogc3RyaW5nKTogU1ZHRWxlbWVudCB7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgdGFnTmFtZSk7XG59XG5cbmludGVyZmFjZSBTaGFwZSB7XG4gIHNoYXBlOiBEcmF3U2hhcGU7XG4gIGN1cnJlbnQ6IGJvb2xlYW47XG4gIGhhc2g6IEhhc2g7XG59XG5cbmludGVyZmFjZSBDdXN0b21CcnVzaGVzIHtcbiAgW2hhc2g6IHN0cmluZ106IERyYXdCcnVzaFxufVxuXG5pbnRlcmZhY2UgQXJyb3dEZXN0cyB7XG4gIFtrZXk6IHN0cmluZ106IG51bWJlcjsgLy8gaG93IG1hbnkgYXJyb3dzIGxhbmQgb24gYSBzcXVhcmVcbn1cblxudHlwZSBIYXNoID0gc3RyaW5nO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyU3ZnKHN0YXRlOiBTdGF0ZSwgcm9vdDogU1ZHRWxlbWVudCk6IHZvaWQge1xuXG4gIGNvbnN0IGQgPSBzdGF0ZS5kcmF3YWJsZSxcbiAgY3VyRCA9IGQuY3VycmVudCxcbiAgY3VyID0gY3VyRCAmJiBjdXJELm1vdXNlU3EgPyBjdXJEIGFzIERyYXdTaGFwZSA6IHVuZGVmaW5lZCxcbiAgYXJyb3dEZXN0czogQXJyb3dEZXN0cyA9IHt9O1xuXG4gIGQuc2hhcGVzLmNvbmNhdChkLmF1dG9TaGFwZXMpLmNvbmNhdChjdXIgPyBbY3VyXSA6IFtdKS5mb3JFYWNoKHMgPT4ge1xuICAgIGlmIChzLmRlc3QpIGFycm93RGVzdHNbcy5kZXN0XSA9IChhcnJvd0Rlc3RzW3MuZGVzdF0gfHwgMCkgKyAxO1xuICB9KTtcblxuICBjb25zdCBzaGFwZXM6IFNoYXBlW10gPSBkLnNoYXBlcy5jb25jYXQoZC5hdXRvU2hhcGVzKS5tYXAoKHM6IERyYXdTaGFwZSkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICBzaGFwZTogcyxcbiAgICAgIGN1cnJlbnQ6IGZhbHNlLFxuICAgICAgaGFzaDogc2hhcGVIYXNoKHMsIGFycm93RGVzdHMsIGZhbHNlKVxuICAgIH07XG4gIH0pO1xuICBpZiAoY3VyKSBzaGFwZXMucHVzaCh7XG4gICAgc2hhcGU6IGN1cixcbiAgICBjdXJyZW50OiB0cnVlLFxuICAgIGhhc2g6IHNoYXBlSGFzaChjdXIsIGFycm93RGVzdHMsIHRydWUpXG4gIH0pO1xuXG4gIGNvbnN0IGZ1bGxIYXNoID0gc2hhcGVzLm1hcChzYyA9PiBzYy5oYXNoKS5qb2luKCcnKTtcbiAgaWYgKGZ1bGxIYXNoID09PSBzdGF0ZS5kcmF3YWJsZS5wcmV2U3ZnSGFzaCkgcmV0dXJuO1xuICBzdGF0ZS5kcmF3YWJsZS5wcmV2U3ZnSGFzaCA9IGZ1bGxIYXNoO1xuXG4gIGNvbnN0IGRlZnNFbCA9IHJvb3QuZmlyc3RDaGlsZCBhcyBTVkdFbGVtZW50O1xuXG4gIHN5bmNEZWZzKGQsIHNoYXBlcywgZGVmc0VsKTtcbiAgc3luY1NoYXBlcyhzdGF0ZSwgc2hhcGVzLCBkLmJydXNoZXMsIGFycm93RGVzdHMsIHJvb3QsIGRlZnNFbCk7XG59XG5cbi8vIGFwcGVuZCBvbmx5LiBEb24ndCB0cnkgdG8gdXBkYXRlL3JlbW92ZS5cbmZ1bmN0aW9uIHN5bmNEZWZzKGQ6IERyYXdhYmxlLCBzaGFwZXM6IFNoYXBlW10sIGRlZnNFbDogU1ZHRWxlbWVudCkge1xuICBjb25zdCBicnVzaGVzOiBDdXN0b21CcnVzaGVzID0ge307XG4gIGxldCBicnVzaDogRHJhd0JydXNoO1xuICBzaGFwZXMuZm9yRWFjaChzID0+IHtcbiAgICBpZiAocy5zaGFwZS5kZXN0KSB7XG4gICAgICBicnVzaCA9IGQuYnJ1c2hlc1tzLnNoYXBlLmJydXNoXTtcbiAgICAgIGlmIChzLnNoYXBlLm1vZGlmaWVycykgYnJ1c2ggPSBtYWtlQ3VzdG9tQnJ1c2goYnJ1c2gsIHMuc2hhcGUubW9kaWZpZXJzKTtcbiAgICAgIGJydXNoZXNbYnJ1c2gua2V5XSA9IGJydXNoO1xuICAgIH1cbiAgfSk7XG4gIGNvbnN0IGtleXNJbkRvbToge1trZXk6IHN0cmluZ106IGJvb2xlYW59ID0ge307XG4gIGxldCBlbDogU1ZHRWxlbWVudCA9IGRlZnNFbC5maXJzdENoaWxkIGFzIFNWR0VsZW1lbnQ7XG4gIHdoaWxlKGVsKSB7XG4gICAga2V5c0luRG9tW2VsLmdldEF0dHJpYnV0ZSgnY2dLZXknKSBhcyBzdHJpbmddID0gdHJ1ZTtcbiAgICBlbCA9IGVsLm5leHRTaWJsaW5nIGFzIFNWR0VsZW1lbnQ7XG4gIH1cbiAgZm9yIChsZXQga2V5IGluIGJydXNoZXMpIHtcbiAgICBpZiAoIWtleXNJbkRvbVtrZXldKSBkZWZzRWwuYXBwZW5kQ2hpbGQocmVuZGVyTWFya2VyKGJydXNoZXNba2V5XSkpO1xuICB9XG59XG5cbi8vIGFwcGVuZCBhbmQgcmVtb3ZlIG9ubHkuIE5vIHVwZGF0ZXMuXG5mdW5jdGlvbiBzeW5jU2hhcGVzKHN0YXRlOiBTdGF0ZSwgc2hhcGVzOiBTaGFwZVtdLCBicnVzaGVzOiBEcmF3QnJ1c2hlcywgYXJyb3dEZXN0czogQXJyb3dEZXN0cywgcm9vdDogU1ZHRWxlbWVudCwgZGVmc0VsOiBTVkdFbGVtZW50KTogdm9pZCB7XG4gIGNvbnN0IGJvdW5kcyA9IHN0YXRlLmRvbS5ib3VuZHMoKSxcbiAgaGFzaGVzSW5Eb206IHtbaGFzaDogc3RyaW5nXTogYm9vbGVhbn0gPSB7fSxcbiAgdG9SZW1vdmU6IFNWR0VsZW1lbnRbXSA9IFtdO1xuICBzaGFwZXMuZm9yRWFjaChzYyA9PiB7IGhhc2hlc0luRG9tW3NjLmhhc2hdID0gZmFsc2U7IH0pO1xuICBsZXQgZWw6IFNWR0VsZW1lbnQgPSBkZWZzRWwubmV4dFNpYmxpbmcgYXMgU1ZHRWxlbWVudCwgZWxIYXNoOiBIYXNoO1xuICB3aGlsZShlbCkge1xuICAgIGVsSGFzaCA9IGVsLmdldEF0dHJpYnV0ZSgnY2dIYXNoJykgYXMgSGFzaDtcbiAgICAvLyBmb3VuZCBhIHNoYXBlIGVsZW1lbnQgdGhhdCdzIGhlcmUgdG8gc3RheVxuICAgIGlmIChoYXNoZXNJbkRvbS5oYXNPd25Qcm9wZXJ0eShlbEhhc2gpKSBoYXNoZXNJbkRvbVtlbEhhc2hdID0gdHJ1ZTtcbiAgICAvLyBvciByZW1vdmUgaXRcbiAgICBlbHNlIHRvUmVtb3ZlLnB1c2goZWwpO1xuICAgIGVsID0gZWwubmV4dFNpYmxpbmcgYXMgU1ZHRWxlbWVudDtcbiAgfVxuICAvLyByZW1vdmUgb2xkIHNoYXBlc1xuICB0b1JlbW92ZS5mb3JFYWNoKGVsID0+IHJvb3QucmVtb3ZlQ2hpbGQoZWwpKTtcbiAgLy8gaW5zZXJ0IHNoYXBlcyB0aGF0IGFyZSBub3QgeWV0IGluIGRvbVxuICBzaGFwZXMuZm9yRWFjaChzYyA9PiB7XG4gICAgaWYgKCFoYXNoZXNJbkRvbVtzYy5oYXNoXSkgcm9vdC5hcHBlbmRDaGlsZChyZW5kZXJTaGFwZShzdGF0ZSwgc2MsIGJydXNoZXMsIGFycm93RGVzdHMsIGJvdW5kcykpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gc2hhcGVIYXNoKHtvcmlnLCBkZXN0LCBicnVzaCwgcGllY2UsIG1vZGlmaWVyc306IERyYXdTaGFwZSwgYXJyb3dEZXN0czogQXJyb3dEZXN0cywgY3VycmVudDogYm9vbGVhbik6IEhhc2gge1xuICByZXR1cm4gW2N1cnJlbnQsIG9yaWcsIGRlc3QsIGJydXNoLCBkZXN0ICYmIGFycm93RGVzdHNbZGVzdF0gPiAxLFxuICAgIHBpZWNlICYmIHBpZWNlSGFzaChwaWVjZSksXG4gICAgbW9kaWZpZXJzICYmIG1vZGlmaWVyc0hhc2gobW9kaWZpZXJzKVxuICBdLmZpbHRlcih4ID0+IHgpLmpvaW4oJycpO1xufVxuXG5mdW5jdGlvbiBwaWVjZUhhc2gocGllY2U6IERyYXdTaGFwZVBpZWNlKTogSGFzaCB7XG4gIHJldHVybiBbcGllY2UuY29sb3IsIHBpZWNlLnJvbGUsIHBpZWNlLnNjYWxlXS5maWx0ZXIoeCA9PiB4KS5qb2luKCcnKTtcbn1cblxuZnVuY3Rpb24gbW9kaWZpZXJzSGFzaChtOiBEcmF3TW9kaWZpZXJzKTogSGFzaCB7XG4gIHJldHVybiAnJyArIChtLmxpbmVXaWR0aCB8fCAnJyk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlclNoYXBlKHN0YXRlOiBTdGF0ZSwge3NoYXBlLCBjdXJyZW50LCBoYXNofTogU2hhcGUsIGJydXNoZXM6IERyYXdCcnVzaGVzLCBhcnJvd0Rlc3RzOiBBcnJvd0Rlc3RzLCBib3VuZHM6IENsaWVudFJlY3QpOiBTVkdFbGVtZW50IHtcbiAgY29uc3QgZmlyc3RSYW5rSXMwID0gc3RhdGUuZGltZW5zaW9ucy5oZWlnaHQgPT09IDEwO1xuICBsZXQgZWw6IFNWR0VsZW1lbnQ7XG4gIGlmIChzaGFwZS5waWVjZSkgZWwgPSByZW5kZXJQaWVjZShcbiAgICBzdGF0ZS5kcmF3YWJsZS5waWVjZXMuYmFzZVVybCxcbiAgICBvcmllbnQoa2V5MnBvcyhzaGFwZS5vcmlnLCBmaXJzdFJhbmtJczApLCBzdGF0ZS5vcmllbnRhdGlvbiwgc3RhdGUuZGltZW5zaW9ucyksXG4gICAgc2hhcGUucGllY2UsXG4gICAgYm91bmRzLFxuICAgIHN0YXRlLmRpbWVuc2lvbnMpO1xuICBlbHNlIHtcbiAgICBjb25zdCBvcmlnID0gb3JpZW50KGtleTJwb3Moc2hhcGUub3JpZywgZmlyc3RSYW5rSXMwKSwgc3RhdGUub3JpZW50YXRpb24sIHN0YXRlLmRpbWVuc2lvbnMpO1xuICAgIGlmIChzaGFwZS5vcmlnICYmIHNoYXBlLmRlc3QpIHtcbiAgICAgIGxldCBicnVzaDogRHJhd0JydXNoID0gYnJ1c2hlc1tzaGFwZS5icnVzaF07XG4gICAgICBpZiAoc2hhcGUubW9kaWZpZXJzKSBicnVzaCA9IG1ha2VDdXN0b21CcnVzaChicnVzaCwgc2hhcGUubW9kaWZpZXJzKTtcbiAgICAgIGVsID0gcmVuZGVyQXJyb3coXG4gICAgICAgIGJydXNoLFxuICAgICAgICBvcmlnLFxuICAgICAgICBvcmllbnQoa2V5MnBvcyhzaGFwZS5kZXN0LCBmaXJzdFJhbmtJczApLCBzdGF0ZS5vcmllbnRhdGlvbiwgc3RhdGUuZGltZW5zaW9ucyksXG4gICAgICAgIGN1cnJlbnQsXG4gICAgICAgIGFycm93RGVzdHNbc2hhcGUuZGVzdF0gPiAxLFxuICAgICAgICBib3VuZHMsXG4gICAgICAgIHN0YXRlLmRpbWVuc2lvbnMpO1xuICAgIH1cbiAgICBlbHNlIGVsID0gcmVuZGVyQ2lyY2xlKGJydXNoZXNbc2hhcGUuYnJ1c2hdLCBvcmlnLCBjdXJyZW50LCBib3VuZHMsIHN0YXRlLmRpbWVuc2lvbnMpO1xuICB9XG4gIGVsLnNldEF0dHJpYnV0ZSgnY2dIYXNoJywgaGFzaCk7XG4gIHJldHVybiBlbDtcbn1cblxuZnVuY3Rpb24gcmVuZGVyQ2lyY2xlKGJydXNoOiBEcmF3QnJ1c2gsIHBvczogY2cuUG9zLCBjdXJyZW50OiBib29sZWFuLCBib3VuZHM6IENsaWVudFJlY3QsIGJkOiBjZy5Cb2FyZERpbWVuc2lvbnMpOiBTVkdFbGVtZW50IHtcbiAgY29uc3QgbyA9IHBvczJweChwb3MsIGJvdW5kcywgYmQpLFxuICB3aWR0aHMgPSBjaXJjbGVXaWR0aChib3VuZHMsIGJkKSxcbiAgcmFkaXVzID0gKGJvdW5kcy53aWR0aCAvIGJkLndpZHRoKSAvIDI7XG4gIHJldHVybiBzZXRBdHRyaWJ1dGVzKGNyZWF0ZUVsZW1lbnQoJ2NpcmNsZScpLCB7XG4gICAgc3Ryb2tlOiBicnVzaC5jb2xvcixcbiAgICAnc3Ryb2tlLXdpZHRoJzogd2lkdGhzW2N1cnJlbnQgPyAwIDogMV0sXG4gICAgZmlsbDogJ25vbmUnLFxuICAgIG9wYWNpdHk6IG9wYWNpdHkoYnJ1c2gsIGN1cnJlbnQpLFxuICAgIGN4OiBvWzBdLFxuICAgIGN5OiBvWzFdLFxuICAgIHI6IHJhZGl1cyAtIHdpZHRoc1sxXSAvIDJcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlckFycm93KGJydXNoOiBEcmF3QnJ1c2gsIG9yaWc6IGNnLlBvcywgZGVzdDogY2cuUG9zLCBjdXJyZW50OiBib29sZWFuLCBzaG9ydGVuOiBib29sZWFuLCBib3VuZHM6IENsaWVudFJlY3QsIGJkOiBjZy5Cb2FyZERpbWVuc2lvbnMpOiBTVkdFbGVtZW50IHtcbiAgY29uc3QgbSA9IGFycm93TWFyZ2luKGJvdW5kcywgc2hvcnRlbiAmJiAhY3VycmVudCwgYmQpLFxuICBhID0gcG9zMnB4KG9yaWcsIGJvdW5kcywgYmQpLFxuICBiID0gcG9zMnB4KGRlc3QsIGJvdW5kcywgYmQpLFxuICBkeCA9IGJbMF0gLSBhWzBdLFxuICBkeSA9IGJbMV0gLSBhWzFdLFxuICBhbmdsZSA9IE1hdGguYXRhbjIoZHksIGR4KSxcbiAgeG8gPSBNYXRoLmNvcyhhbmdsZSkgKiBtLFxuICB5byA9IE1hdGguc2luKGFuZ2xlKSAqIG07XG4gIHJldHVybiBzZXRBdHRyaWJ1dGVzKGNyZWF0ZUVsZW1lbnQoJ2xpbmUnKSwge1xuICAgIHN0cm9rZTogYnJ1c2guY29sb3IsXG4gICAgJ3N0cm9rZS13aWR0aCc6IGxpbmVXaWR0aChicnVzaCwgY3VycmVudCwgYm91bmRzLCBiZCksXG4gICAgJ3N0cm9rZS1saW5lY2FwJzogJ3JvdW5kJyxcbiAgICAnbWFya2VyLWVuZCc6ICd1cmwoI2Fycm93aGVhZC0nICsgYnJ1c2gua2V5ICsgJyknLFxuICAgIG9wYWNpdHk6IG9wYWNpdHkoYnJ1c2gsIGN1cnJlbnQpLFxuICAgIHgxOiBhWzBdLFxuICAgIHkxOiBhWzFdLFxuICAgIHgyOiBiWzBdIC0geG8sXG4gICAgeTI6IGJbMV0gLSB5b1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyUGllY2UoYmFzZVVybDogc3RyaW5nLCBwb3M6IGNnLlBvcywgcGllY2U6IERyYXdTaGFwZVBpZWNlLCBib3VuZHM6IENsaWVudFJlY3QsIGJkOiBjZy5Cb2FyZERpbWVuc2lvbnMpOiBTVkdFbGVtZW50IHtcbiAgY29uc3QgbyA9IHBvczJweChwb3MsIGJvdW5kcywgYmQpLFxuICB3aWR0aCA9IGJvdW5kcy53aWR0aCAvIGJkLndpZHRoICogKHBpZWNlLnNjYWxlIHx8IDEpLFxuICBoZWlnaHQgPSBib3VuZHMuaGVpZ2h0IC8gYmQuaGVpZ2h0ICogKHBpZWNlLnNjYWxlIHx8IDEpLFxuICBuYW1lID0gcGllY2UuY29sb3JbMF0gKyAocGllY2Uucm9sZSA9PT0gJ2tuaWdodCcgPyAnbicgOiBwaWVjZS5yb2xlWzBdKS50b1VwcGVyQ2FzZSgpO1xuICByZXR1cm4gc2V0QXR0cmlidXRlcyhjcmVhdGVFbGVtZW50KCdpbWFnZScpLCB7XG4gICAgY2xhc3NOYW1lOiBgJHtwaWVjZS5yb2xlfSAke3BpZWNlLmNvbG9yfWAsXG4gICAgeDogb1swXSAtIHdpZHRoIC8gMixcbiAgICB5OiBvWzFdIC0gaGVpZ2h0IC8gMixcbiAgICB3aWR0aDogd2lkdGgsXG4gICAgaGVpZ2h0OiBoZWlnaHQsXG4gICAgaHJlZjogYmFzZVVybCArIG5hbWUgKyAnLnN2ZydcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlck1hcmtlcihicnVzaDogRHJhd0JydXNoKTogU1ZHRWxlbWVudCB7XG4gIGNvbnN0IG1hcmtlciA9IHNldEF0dHJpYnV0ZXMoY3JlYXRlRWxlbWVudCgnbWFya2VyJyksIHtcbiAgICBpZDogJ2Fycm93aGVhZC0nICsgYnJ1c2gua2V5LFxuICAgIG9yaWVudDogJ2F1dG8nLFxuICAgIG1hcmtlcldpZHRoOiA0LFxuICAgIG1hcmtlckhlaWdodDogOCxcbiAgICByZWZYOiAyLjA1LFxuICAgIHJlZlk6IDIuMDFcbiAgfSk7XG4gIG1hcmtlci5hcHBlbmRDaGlsZChzZXRBdHRyaWJ1dGVzKGNyZWF0ZUVsZW1lbnQoJ3BhdGgnKSwge1xuICAgIGQ6ICdNMCwwIFY0IEwzLDIgWicsXG4gICAgZmlsbDogYnJ1c2guY29sb3JcbiAgfSkpO1xuICBtYXJrZXIuc2V0QXR0cmlidXRlKCdjZ0tleScsIGJydXNoLmtleSk7XG4gIHJldHVybiBtYXJrZXI7XG59XG5cbmZ1bmN0aW9uIHNldEF0dHJpYnV0ZXMoZWw6IFNWR0VsZW1lbnQsIGF0dHJzOiB7IFtrZXk6IHN0cmluZ106IGFueSB9KTogU1ZHRWxlbWVudCB7XG4gIGZvciAobGV0IGtleSBpbiBhdHRycykgZWwuc2V0QXR0cmlidXRlKGtleSwgYXR0cnNba2V5XSk7XG4gIHJldHVybiBlbDtcbn1cblxuZnVuY3Rpb24gb3JpZW50KHBvczogY2cuUG9zLCBjb2xvcjogY2cuQ29sb3IsIGJkOiBjZy5Cb2FyZERpbWVuc2lvbnMpOiBjZy5Qb3Mge1xuICByZXR1cm4gY29sb3IgPT09ICd3aGl0ZScgPyBwb3MgOiBbYmQud2lkdGggKyAxIC0gcG9zWzBdLCBiZC5oZWlnaHQgKyAxIC0gcG9zWzFdXTtcbn1cblxuZnVuY3Rpb24gbWFrZUN1c3RvbUJydXNoKGJhc2U6IERyYXdCcnVzaCwgbW9kaWZpZXJzOiBEcmF3TW9kaWZpZXJzKTogRHJhd0JydXNoIHtcbiAgY29uc3QgYnJ1c2g6IFBhcnRpYWw8RHJhd0JydXNoPiA9IHtcbiAgICBjb2xvcjogYmFzZS5jb2xvcixcbiAgICBvcGFjaXR5OiBNYXRoLnJvdW5kKGJhc2Uub3BhY2l0eSAqIDEwKSAvIDEwLFxuICAgIGxpbmVXaWR0aDogTWF0aC5yb3VuZChtb2RpZmllcnMubGluZVdpZHRoIHx8IGJhc2UubGluZVdpZHRoKVxuICB9O1xuICBicnVzaC5rZXkgPSBbYmFzZS5rZXksIG1vZGlmaWVycy5saW5lV2lkdGhdLmZpbHRlcih4ID0+IHgpLmpvaW4oJycpO1xuICByZXR1cm4gYnJ1c2ggYXMgRHJhd0JydXNoO1xufVxuXG5mdW5jdGlvbiBjaXJjbGVXaWR0aChib3VuZHM6IENsaWVudFJlY3QsIGJkOiBjZy5Cb2FyZERpbWVuc2lvbnMpOiBbbnVtYmVyLCBudW1iZXJdIHtcbiAgY29uc3QgYmFzZSA9IGJvdW5kcy53aWR0aCAvIChiZC53aWR0aCAqIDY0KTtcbiAgcmV0dXJuIFszICogYmFzZSwgNCAqIGJhc2VdO1xufVxuXG5mdW5jdGlvbiBsaW5lV2lkdGgoYnJ1c2g6IERyYXdCcnVzaCwgY3VycmVudDogYm9vbGVhbiwgYm91bmRzOiBDbGllbnRSZWN0LCBiZDogY2cuQm9hcmREaW1lbnNpb25zKTogbnVtYmVyIHtcbiAgcmV0dXJuIChicnVzaC5saW5lV2lkdGggfHwgMTApICogKGN1cnJlbnQgPyAwLjg1IDogMSkgLyAoYmQud2lkdGggKiA2NCkgKiBib3VuZHMud2lkdGg7XG59XG5cbmZ1bmN0aW9uIG9wYWNpdHkoYnJ1c2g6IERyYXdCcnVzaCwgY3VycmVudDogYm9vbGVhbik6IG51bWJlciB7XG4gIHJldHVybiAoYnJ1c2gub3BhY2l0eSB8fCAxKSAqIChjdXJyZW50ID8gMC45IDogMSk7XG59XG5cbmZ1bmN0aW9uIGFycm93TWFyZ2luKGJvdW5kczogQ2xpZW50UmVjdCwgc2hvcnRlbjogYm9vbGVhbiwgYmQ6IGNnLkJvYXJkRGltZW5zaW9ucyk6IG51bWJlciB7XG4gIHJldHVybiAoc2hvcnRlbiA/IDIwIDogMTApIC8gKGJkLndpZHRoICogNjQpICogYm91bmRzLndpZHRoO1xufVxuXG5mdW5jdGlvbiBwb3MycHgocG9zOiBjZy5Qb3MsIGJvdW5kczogQ2xpZW50UmVjdCwgYmQ6IGNnLkJvYXJkRGltZW5zaW9ucyk6IGNnLk51bWJlclBhaXIge1xuICByZXR1cm4gWyhwb3NbMF0gLSAwLjUpICogYm91bmRzLndpZHRoIC8gYmQud2lkdGgsIChiZC5oZWlnaHQgKyAwLjUgLSBwb3NbMV0pICogYm91bmRzLmhlaWdodCAvIGJkLmhlaWdodF07XG59XG4iLCJleHBvcnQgdHlwZSBWYXJpYW50ID0gJ2NoZXNzJyB8ICdtYWtydWsnIHwgJ2NhbWJvZGlhbicgfCAnc2l0dHV5aW4nIHwgJ3Nob2dpJyB8ICdtaW5pc2hvZ2knIHwgJ2t5b3Rvc2hvZ2knIHwgJ2RvYnV0c3UnIHwgJ2dvcm9nb3JvJyB8ICd4aWFuZ3FpJyB8ICdtaW5peGlhbmdxaScgfCAnY2FwYWJsYW5jYScgfCAnc2VpcmF3YW4nIHwgJ2NhcGFob3VzZScgfCAnc2hvdXNlJyB8ICdncmFuZCcgfCAnZ3JhbmRob3VzZScgfCAnZ290aGljJyB8ICdnb3RoaG91c2UnIHwgJ3NoYWtvJyB8ICdzaG9ndW4nIHwgJ2phbmdnaScgfCAnbWFrcG9uZycgfCAnb3JkYScgfCAnc3lub2NoZXNzJyB8ICdtYW5jaHUnIHwgJ211c2tldGVlcicgfCB1bmRlZmluZWQ7XG5leHBvcnQgdHlwZSBDb2xvciA9ICd3aGl0ZScgfCAnYmxhY2snO1xuZXhwb3J0IHR5cGUgUm9sZSA9ICdraW5nJyB8ICdxdWVlbicgfCAncm9vaycgfCAnYmlzaG9wJyB8ICdrbmlnaHQnIHwgJ3Bhd24nIHwgJ2NoYW5jZWxsb3InIHwgJ3BjaGFuY2VsbG9yJyB8ICdhcmNoYmlzaG9wJyB8ICdmZXJ6JyB8ICdtZXQnIHwgJ2dvbGQnIHwgJ3NpbHZlcicgfCAnbGFuY2UnfCAncHBhd24nIHwgJ3BrbmlnaHQnIHwgJ3BiaXNob3AnIHwgJ3Byb29rJyB8ICdwc2lsdmVyJyB8ICdwbGFuY2UnIHwgJ2Fkdmlzb3InIHwgJ2Nhbm5vbicgfCAnaGF3aycgfCAnZWxlcGhhbnQnIHwgJ3BmZXJ6JyB8ICd5dXJ0JyB8ICdsYW5jZXInIHwgJ2Jhbm5lcicgfCAndW5pY29ybicgfCAnZHJhZ29uJztcbmV4cG9ydCB0eXBlIEtleSA9ICAnejAnIHwgJ2EwJyB8ICdiMCcgfCAnYzAnIHwgJ2QwJyB8ICdlMCcgfCAnZjAnIHwgJ2cwJyB8ICdoMCcgfCAnaTAnIHwgJ2owJyB8ICdhMScgfCAnYjEnIHwgJ2MxJyB8ICdkMScgfCAnZTEnIHwgJ2YxJyB8ICdnMScgfCAnaDEnIHwgJ2kxJyB8ICdqMScgfCAnYTInIHwgJ2IyJyB8ICdjMicgfCAnZDInIHwgJ2UyJyB8ICdmMicgfCAnZzInIHwgJ2gyJyB8ICdpMicgfCAnajInIHwgJ2EzJyB8ICdiMycgfCAnYzMnIHwgJ2QzJyB8ICdlMycgfCAnZjMnIHwgJ2czJyB8ICdoMycgfCAnaTMnIHwgJ2ozJyB8ICdhNCcgfCAnYjQnIHwgJ2M0JyB8ICdkNCcgfCAnZTQnIHwgJ2Y0JyB8ICdnNCcgfCAnaDQnIHwgJ2k0JyB8ICdqNCcgfCAnYTUnIHwgJ2I1JyB8ICdjNScgfCAnZDUnIHwgJ2U1JyB8ICdmNScgfCAnZzUnIHwgJ2g1JyB8ICdpNScgfCAnajUnIHwgJ2E2JyB8ICdiNicgfCAnYzYnIHwgJ2Q2JyB8ICdlNicgfCAnZjYnIHwgJ2c2JyB8ICdoNicgfCAnaTYnIHwgJ2o2JyB8ICdhNycgfCAnYjcnIHwgJ2M3JyB8ICdkNycgfCAnZTcnIHwgJ2Y3JyB8ICdnNycgfCAnaDcnIHwgJ2k3JyB8ICdqNycgfCAnYTgnIHwgJ2I4JyB8ICdjOCcgfCAnZDgnIHwgJ2U4JyB8ICdmOCcgfCAnZzgnIHwgJ2g4JyB8ICdpOCcgfCAnajgnIHwgJ2E5JyB8ICdiOScgfCAnYzknIHwgJ2Q5JyB8ICdlOScgfCAnZjknIHwgJ2c5JyB8ICdoOScgfCAnaTknIHwgJ2o5JztcbmV4cG9ydCB0eXBlIEZpbGUgPSAnYScgfCAnYicgfCAnYycgfCAnZCcgfCAnZScgfCAnZicgfCAnZycgfCAnaCcgfCAnaScgfCAnaic7XG5leHBvcnQgdHlwZSBSYW5rID0gJzAnIHwgJzEnIHwgJzInIHwgJzMnIHwgJzQnIHwgJzUnIHwgJzYnIHwgJzcnIHwgJzgnIHwgJzknIHwgJzEwJztcbmV4cG9ydCB0eXBlIEZFTiA9IHN0cmluZztcbmV4cG9ydCB0eXBlIFBvcyA9IFtudW1iZXIsIG51bWJlcl07XG5leHBvcnQgaW50ZXJmYWNlIFBpZWNlIHtcbiAgcm9sZTogUm9sZTtcbiAgY29sb3I6IENvbG9yO1xuICBwcm9tb3RlZD86IGJvb2xlYW47XG59XG5leHBvcnQgaW50ZXJmYWNlIERyb3Age1xuICByb2xlOiBSb2xlO1xuICBrZXk6IEtleTtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgUGllY2VzIHtcbiAgW2tleTogc3RyaW5nXTogUGllY2UgfCB1bmRlZmluZWQ7XG59XG5leHBvcnQgaW50ZXJmYWNlIFBpZWNlc0RpZmYge1xuICBba2V5OiBzdHJpbmddOiBQaWVjZSB8IHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IHR5cGUgS2V5UGFpciA9IFtLZXksIEtleV07XG5cbmV4cG9ydCB0eXBlIE51bWJlclBhaXIgPSBbbnVtYmVyLCBudW1iZXJdO1xuXG5leHBvcnQgdHlwZSBOdW1iZXJRdWFkID0gW251bWJlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlcl07XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGVzdHMge1xuICBba2V5OiBzdHJpbmddOiBLZXlbXVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEVsZW1lbnRzIHtcbiAgYm9hcmQ6IEhUTUxFbGVtZW50O1xuICBjb250YWluZXI6IEhUTUxFbGVtZW50O1xuICBnaG9zdD86IEhUTUxFbGVtZW50O1xuICBzdmc/OiBTVkdFbGVtZW50O1xufVxuZXhwb3J0IGludGVyZmFjZSBEb20ge1xuICBlbGVtZW50czogRWxlbWVudHMsXG4gIGJvdW5kczogTWVtbzxDbGllbnRSZWN0PjtcbiAgcmVkcmF3OiAoKSA9PiB2b2lkO1xuICByZWRyYXdOb3c6IChza2lwU3ZnPzogYm9vbGVhbikgPT4gdm9pZDtcbiAgdW5iaW5kPzogVW5iaW5kO1xuICBkZXN0cm95ZWQ/OiBib29sZWFuO1xuICByZWxhdGl2ZT86IGJvb2xlYW47IC8vIGRvbid0IGNvbXB1dGUgYm91bmRzLCB1c2UgcmVsYXRpdmUgJSB0byBwbGFjZSBwaWVjZXNcbn1cbmV4cG9ydCBpbnRlcmZhY2UgRXhwbG9kaW5nIHtcbiAgc3RhZ2U6IG51bWJlcjtcbiAga2V5czogS2V5W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTW92ZU1ldGFkYXRhIHtcbiAgcHJlbW92ZTogYm9vbGVhbjtcbiAgY3RybEtleT86IGJvb2xlYW47XG4gIGhvbGRUaW1lPzogbnVtYmVyO1xuICBjYXB0dXJlZD86IFBpZWNlO1xuICBwcmVkcm9wPzogYm9vbGVhbjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgU2V0UHJlbW92ZU1ldGFkYXRhIHtcbiAgY3RybEtleT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCB0eXBlIFdpbmRvd0V2ZW50ID0gJ29uc2Nyb2xsJyB8ICdvbnJlc2l6ZSc7XG5cbmV4cG9ydCB0eXBlIE1vdWNoRXZlbnQgPSBNb3VzZUV2ZW50ICYgVG91Y2hFdmVudDtcblxuZXhwb3J0IGludGVyZmFjZSBLZXllZE5vZGUgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGNnS2V5OiBLZXk7XG59XG5leHBvcnQgaW50ZXJmYWNlIFBpZWNlTm9kZSBleHRlbmRzIEtleWVkTm9kZSB7XG4gIGNnUGllY2U6IHN0cmluZztcbiAgY2dBbmltYXRpbmc/OiBib29sZWFuO1xuICBjZ0ZhZGluZz86IGJvb2xlYW47XG4gIGNnRHJhZ2dpbmc/OiBib29sZWFuO1xufVxuZXhwb3J0IGludGVyZmFjZSBTcXVhcmVOb2RlIGV4dGVuZHMgS2V5ZWROb2RlIHsgfVxuXG5leHBvcnQgaW50ZXJmYWNlIE1lbW88QT4geyAoKTogQTsgY2xlYXI6ICgpID0+IHZvaWQ7IH1cblxuZXhwb3J0IGludGVyZmFjZSBUaW1lciB7XG4gIHN0YXJ0OiAoKSA9PiB2b2lkO1xuICBjYW5jZWw6ICgpID0+IHZvaWQ7XG4gIHN0b3A6ICgpID0+IG51bWJlcjtcbn1cblxuZXhwb3J0IHR5cGUgUmVkcmF3ID0gKCkgPT4gdm9pZDtcbmV4cG9ydCB0eXBlIFVuYmluZCA9ICgpID0+IHZvaWQ7XG5leHBvcnQgdHlwZSBNaWxsaXNlY29uZHMgPSBudW1iZXI7XG5leHBvcnQgdHlwZSBLSHogPSBudW1iZXI7XG5cbmV4cG9ydCBjb25zdCBmaWxlczogRmlsZVtdID0gWydhJywgJ2InLCAnYycsICdkJywgJ2UnLCAnZicsICdnJywgJ2gnLCAnaScsICdqJ107XG5leHBvcnQgY29uc3QgcmFua3M6IFJhbmtbXSA9IFsnMCcsICcxJywgJzInLCAnMycsICc0JywgJzUnLCAnNicsICc3JywgJzgnLCAnOScsICcxMCddO1xuXG5leHBvcnQgaW50ZXJmYWNlIEJvYXJkRGltZW5zaW9ucyB7XG4gIHdpZHRoOiBudW1iZXI7XG4gIGhlaWdodDogbnVtYmVyO1xufVxuXG5leHBvcnQgY29uc3QgZW51bSBHZW9tZXRyeSB7ZGltOHg4LCBkaW05eDksIGRpbTEweDgsIGRpbTl4MTAsIGRpbTEweDEwLCBkaW01eDUsIGRpbTd4NywgZGltM3g0LCBkaW01eDZ9O1xuZXhwb3J0IGNvbnN0IGVudW0gTm90YXRpb24ge0RFRkFVTFQsIFNBTiwgTEFOLCBTSE9HSV9IT1NLSU5HLCBTSE9HSV9IT0RHRVMsIFNIT0dJX0hPREdFU19OVU1CRVIsIEpBTkdHSSwgWElBTkdRSV9XWEZ9O1xuXG5leHBvcnQgY29uc3QgZGltZW5zaW9uczogQm9hcmREaW1lbnNpb25zW10gPSBbe3dpZHRoOiA4LCBoZWlnaHQ6IDh9LCB7d2lkdGg6IDksIGhlaWdodDogOX0sIHt3aWR0aDogMTAsIGhlaWdodDogOH0sIHt3aWR0aDogOSwgaGVpZ2h0OiAxMH0sIHt3aWR0aDogMTAsIGhlaWdodDogMTB9LCB7d2lkdGg6IDUsIGhlaWdodDogNX0sIHt3aWR0aDogNywgaGVpZ2h0OiA3fSwge3dpZHRoOiAzLCBoZWlnaHQ6IDR9LCB7d2lkdGg6IDUsIGhlaWdodDogNn1dO1xuXG5leHBvcnQgY29uc3Qgc2hvZ2lWYXJpYW50czogVmFyaWFudFtdID0gWydzaG9naScsICdtaW5pc2hvZ2knLCAna3lvdG9zaG9naScsJ2RvYnV0c3UnLCAnZ29yb2dvcm8nXTtcbiIsImltcG9ydCAqIGFzIGNnIGZyb20gJy4vdHlwZXMnO1xuXG5leHBvcnQgY29uc3QgY29sb3JzOiBjZy5Db2xvcltdID0gWyd3aGl0ZScsICdibGFjayddO1xuXG5leHBvcnQgY29uc3QgTlJhbmtzOiBudW1iZXJbXSA9IFsxLCAyLCAzLCA0LCA1LCA2LCA3LCA4LCA5LCAxMF07XG5leHBvcnQgY29uc3QgaW52TlJhbmtzOiBudW1iZXJbXSA9IFsxMCwgOSwgOCwgNywgNiwgNSwgNCwgMywgMiwgMV07XG5cbmNvbnN0IGZpbGVzMyA9IGNnLmZpbGVzLnNsaWNlKDAsIDMpO1xuY29uc3QgZmlsZXM1ID0gY2cuZmlsZXMuc2xpY2UoMCwgNSk7XG5jb25zdCBmaWxlczcgPSBjZy5maWxlcy5zbGljZSgwLCA3KTtcbmNvbnN0IGZpbGVzOCA9IGNnLmZpbGVzLnNsaWNlKDAsIDgpO1xuY29uc3QgZmlsZXM5ID0gY2cuZmlsZXMuc2xpY2UoMCwgOSk7XG5jb25zdCBmaWxlczEwID0gY2cuZmlsZXMuc2xpY2UoMCwgMTApO1xuXG5jb25zdCByYW5rczQgPSBjZy5yYW5rcy5zbGljZSgxLCA1KTtcbmNvbnN0IHJhbmtzNSA9IGNnLnJhbmtzLnNsaWNlKDEsIDYpO1xuY29uc3QgcmFua3M2ID0gY2cucmFua3Muc2xpY2UoMSwgNyk7XG5jb25zdCByYW5rczcgPSBjZy5yYW5rcy5zbGljZSgxLCA4KTtcbmNvbnN0IHJhbmtzOCA9IGNnLnJhbmtzLnNsaWNlKDEsIDkpO1xuY29uc3QgcmFua3M5ID0gY2cucmFua3Muc2xpY2UoMSwgMTApO1xuLy8gd2UgaGF2ZSB0byBjb3VudCByYW5rcyBzdGFydGluZyBmcm9tIDAgYXMgaW4gVUNDSVxuY29uc3QgcmFua3MxMCA9IGNnLnJhbmtzLnNsaWNlKDAsIDEwKTtcblxuY29uc3QgYWxsS2V5czN4NDogY2cuS2V5W10gPSBBcnJheS5wcm90b3R5cGUuY29uY2F0KC4uLmZpbGVzMy5tYXAoYyA9PiByYW5rczQubWFwKHIgPT4gYytyKSkpO1xuY29uc3QgYWxsS2V5czV4NTogY2cuS2V5W10gPSBBcnJheS5wcm90b3R5cGUuY29uY2F0KC4uLmZpbGVzNS5tYXAoYyA9PiByYW5rczUubWFwKHIgPT4gYytyKSkpO1xuY29uc3QgYWxsS2V5czV4NjogY2cuS2V5W10gPSBBcnJheS5wcm90b3R5cGUuY29uY2F0KC4uLmZpbGVzNS5tYXAoYyA9PiByYW5rczYubWFwKHIgPT4gYytyKSkpO1xuY29uc3QgYWxsS2V5czd4NzogY2cuS2V5W10gPSBBcnJheS5wcm90b3R5cGUuY29uY2F0KC4uLmZpbGVzNy5tYXAoYyA9PiByYW5rczcubWFwKHIgPT4gYytyKSkpO1xuY29uc3QgYWxsS2V5czh4ODogY2cuS2V5W10gPSBBcnJheS5wcm90b3R5cGUuY29uY2F0KC4uLmZpbGVzOC5tYXAoYyA9PiByYW5rczgubWFwKHIgPT4gYytyKSkpO1xuY29uc3QgYWxsS2V5czl4OTogY2cuS2V5W10gPSBBcnJheS5wcm90b3R5cGUuY29uY2F0KC4uLmZpbGVzOS5tYXAoYyA9PiByYW5rczkubWFwKHIgPT4gYytyKSkpO1xuY29uc3QgYWxsS2V5czEweDg6IGNnLktleVtdID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdCguLi5maWxlczEwLm1hcChjID0+IHJhbmtzOC5tYXAociA9PiBjK3IpKSk7XG5jb25zdCBhbGxLZXlzOXgxMDogY2cuS2V5W10gPSBBcnJheS5wcm90b3R5cGUuY29uY2F0KC4uLmZpbGVzOS5tYXAoYyA9PiByYW5rczEwLm1hcChyID0+IGMrcikpKTtcbmNvbnN0IGFsbEtleXMxMHgxMDogY2cuS2V5W10gPSBBcnJheS5wcm90b3R5cGUuY29uY2F0KC4uLmZpbGVzMTAubWFwKGMgPT4gcmFua3MxMC5tYXAociA9PiBjK3IpKSk7XG5cbmV4cG9ydCBjb25zdCBhbGxLZXlzID0gW2FsbEtleXM4eDgsIGFsbEtleXM5eDksIGFsbEtleXMxMHg4LCBhbGxLZXlzOXgxMCwgYWxsS2V5czEweDEwLCBhbGxLZXlzNXg1LCBhbGxLZXlzN3g3LCBhbGxLZXlzM3g0LCBhbGxLZXlzNXg2XTtcblxuZXhwb3J0IGZ1bmN0aW9uIHBvczJrZXkocG9zOiBjZy5Qb3MsIGdlb206IGNnLkdlb21ldHJ5KSB7XG4gICAgY29uc3QgYmQgPSBjZy5kaW1lbnNpb25zW2dlb21dO1xuICAgIHJldHVybiBhbGxLZXlzW2dlb21dW2JkLmhlaWdodCAqIHBvc1swXSArIHBvc1sxXSAtIGJkLmhlaWdodCAtIDFdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24ga2V5MnBvcyhrOiBjZy5LZXksIGZpcnN0UmFua0lzMDogYm9vbGVhbikge1xuICBjb25zdCBzaGlmdCA9IGZpcnN0UmFua0lzMCA/IDEgOiAwO1xuICByZXR1cm4gW2suY2hhckNvZGVBdCgwKSAtIDk2LCBrLmNoYXJDb2RlQXQoMSkgLSA0OCArIHNoaWZ0XSBhcyBjZy5Qb3M7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtZW1vPEE+KGY6ICgpID0+IEEpOiBjZy5NZW1vPEE+IHtcbiAgbGV0IHY6IEEgfCB1bmRlZmluZWQ7XG4gIGNvbnN0IHJldDogYW55ID0gKCkgPT4ge1xuICAgIGlmICh2ID09PSB1bmRlZmluZWQpIHYgPSBmKCk7XG4gICAgcmV0dXJuIHY7XG4gIH07XG4gIHJldC5jbGVhciA9ICgpID0+IHsgdiA9IHVuZGVmaW5lZCB9O1xuICByZXR1cm4gcmV0O1xufVxuXG5leHBvcnQgY29uc3QgdGltZXI6ICgpID0+IGNnLlRpbWVyID0gKCkgPT4ge1xuICBsZXQgc3RhcnRBdDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICByZXR1cm4ge1xuICAgIHN0YXJ0KCkgeyBzdGFydEF0ID0gcGVyZm9ybWFuY2Uubm93KCkgfSxcbiAgICBjYW5jZWwoKSB7IHN0YXJ0QXQgPSB1bmRlZmluZWQgfSxcbiAgICBzdG9wKCkge1xuICAgICAgaWYgKCFzdGFydEF0KSByZXR1cm4gMDtcbiAgICAgIGNvbnN0IHRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKSAtIHN0YXJ0QXQ7XG4gICAgICBzdGFydEF0ID0gdW5kZWZpbmVkO1xuICAgICAgcmV0dXJuIHRpbWU7XG4gICAgfVxuICB9O1xufVxuXG5leHBvcnQgY29uc3Qgb3Bwb3NpdGUgPSAoYzogY2cuQ29sb3IpID0+IGMgPT09ICd3aGl0ZScgPyAnYmxhY2snIDogJ3doaXRlJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbnRhaW5zWDxYPih4czogWFtdIHwgdW5kZWZpbmVkLCB4OiBYKTogYm9vbGVhbiB7XG4gIHJldHVybiB4cyAhPT0gdW5kZWZpbmVkICYmIHhzLmluZGV4T2YoeCkgIT09IC0xO1xufVxuXG5leHBvcnQgY29uc3QgZGlzdGFuY2VTcTogKHBvczE6IGNnLlBvcywgcG9zMjogY2cuUG9zKSA9PiBudW1iZXIgPSAocG9zMSwgcG9zMikgPT4ge1xuICByZXR1cm4gTWF0aC5wb3cocG9zMVswXSAtIHBvczJbMF0sIDIpICsgTWF0aC5wb3cocG9zMVsxXSAtIHBvczJbMV0sIDIpO1xufVxuXG5leHBvcnQgY29uc3Qgc2FtZVBpZWNlOiAocDE6IGNnLlBpZWNlLCBwMjogY2cuUGllY2UpID0+IGJvb2xlYW4gPSAocDEsIHAyKSA9PlxuICBwMS5yb2xlID09PSBwMi5yb2xlICYmIHAxLmNvbG9yID09PSBwMi5jb2xvcjtcblxuY29uc3QgcG9zVG9UcmFuc2xhdGVCYXNlOiAocG9zOiBjZy5Qb3MsIGFzV2hpdGU6IGJvb2xlYW4sIHhGYWN0b3I6IG51bWJlciwgeUZhY3RvcjogbnVtYmVyLCBidDogY2cuQm9hcmREaW1lbnNpb25zKSA9PiBjZy5OdW1iZXJQYWlyID1cbihwb3MsIGFzV2hpdGUsIHhGYWN0b3IsIHlGYWN0b3IsIGJ0KSA9PiBbXG4gIChhc1doaXRlID8gcG9zWzBdIC0gMSA6IGJ0LndpZHRoIC0gcG9zWzBdKSAqIHhGYWN0b3IsXG4gIChhc1doaXRlID8gYnQuaGVpZ2h0IC0gcG9zWzFdIDogcG9zWzFdIC0gMSkgKiB5RmFjdG9yXG5dO1xuXG5leHBvcnQgY29uc3QgcG9zVG9UcmFuc2xhdGVBYnMgPSAoYm91bmRzOiBDbGllbnRSZWN0LCBidDogY2cuQm9hcmREaW1lbnNpb25zKSA9PiB7XG4gIGNvbnN0IHhGYWN0b3IgPSBib3VuZHMud2lkdGggLyBidC53aWR0aCxcbiAgeUZhY3RvciA9IGJvdW5kcy5oZWlnaHQgLyBidC5oZWlnaHQ7XG4gIHJldHVybiAocG9zOiBjZy5Qb3MsIGFzV2hpdGU6IGJvb2xlYW4pID0+IHBvc1RvVHJhbnNsYXRlQmFzZShwb3MsIGFzV2hpdGUsIHhGYWN0b3IsIHlGYWN0b3IsIGJ0KTtcbn07XG5cbmV4cG9ydCBjb25zdCBwb3NUb1RyYW5zbGF0ZVJlbDogKHBvczogY2cuUG9zLCBhc1doaXRlOiBib29sZWFuLCBidDogY2cuQm9hcmREaW1lbnNpb25zKSA9PiBjZy5OdW1iZXJQYWlyID1cbiAgKHBvcywgYXNXaGl0ZSwgYnQpID0+IHBvc1RvVHJhbnNsYXRlQmFzZShwb3MsIGFzV2hpdGUsIDEwMCAvIGJ0LndpZHRoLCAxMDAgLyBidC5oZWlnaHQsIGJ0KTtcblxuZXhwb3J0IGNvbnN0IHRyYW5zbGF0ZUFicyA9IChlbDogSFRNTEVsZW1lbnQsIHBvczogY2cuTnVtYmVyUGFpcikgPT4ge1xuICBlbC5zdHlsZS50cmFuc2Zvcm0gPSBgdHJhbnNsYXRlKCR7cG9zWzBdfXB4LCR7cG9zWzFdfXB4KWA7XG59XG5cbmV4cG9ydCBjb25zdCB0cmFuc2xhdGVSZWwgPSAoZWw6IEhUTUxFbGVtZW50LCBwZXJjZW50czogY2cuTnVtYmVyUGFpcikgPT4ge1xuICBlbC5zdHlsZS50cmFuc2Zvcm0gPSBgdHJhbnNsYXRlKCR7cGVyY2VudHNbMF19JSwke3BlcmNlbnRzWzFdfSUpYDtcbn1cblxuZXhwb3J0IGNvbnN0IHNldFZpc2libGUgPSAoZWw6IEhUTUxFbGVtZW50LCB2OiBib29sZWFuKSA9PiB7XG4gIGVsLnN0eWxlLnZpc2liaWxpdHkgPSB2ID8gJ3Zpc2libGUnIDogJ2hpZGRlbic7XG59XG5cbi8vIHRvdWNoZW5kIGhhcyBubyBwb3NpdGlvbiFcbmV4cG9ydCBjb25zdCBldmVudFBvc2l0aW9uOiAoZTogY2cuTW91Y2hFdmVudCkgPT4gY2cuTnVtYmVyUGFpciB8IHVuZGVmaW5lZCA9IGUgPT4ge1xuICBpZiAoZS5jbGllbnRYIHx8IGUuY2xpZW50WCA9PT0gMCkgcmV0dXJuIFtlLmNsaWVudFgsIGUuY2xpZW50WV07XG4gIGlmIChlLnRvdWNoZXMgJiYgZS50YXJnZXRUb3VjaGVzWzBdKSByZXR1cm4gW2UudGFyZ2V0VG91Y2hlc1swXS5jbGllbnRYLCBlLnRhcmdldFRvdWNoZXNbMF0uY2xpZW50WV07XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBjb25zdCBpc1JpZ2h0QnV0dG9uID0gKGU6IE1vdXNlRXZlbnQpID0+IGUuYnV0dG9ucyA9PT0gMiB8fCBlLmJ1dHRvbiA9PT0gMjtcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZUVsID0gKHRhZ05hbWU6IHN0cmluZywgY2xhc3NOYW1lPzogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbiAgaWYgKGNsYXNzTmFtZSkgZWwuY2xhc3NOYW1lID0gY2xhc3NOYW1lO1xuICByZXR1cm4gZWw7XG59XG4iLCJpbXBvcnQgeyBTdGF0ZSB9IGZyb20gJy4vc3RhdGUnXG5pbXBvcnQgeyBjb2xvcnMsIHNldFZpc2libGUsIGNyZWF0ZUVsIH0gZnJvbSAnLi91dGlsJ1xuaW1wb3J0IHsgZmlsZXMsIHJhbmtzLCBzaG9naVZhcmlhbnRzLCBFbGVtZW50cywgTm90YXRpb24gfSBmcm9tICcuL3R5cGVzJ1xuaW1wb3J0IHsgY3JlYXRlRWxlbWVudCBhcyBjcmVhdGVTVkcgfSBmcm9tICcuL3N2ZydcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gd3JhcChlbGVtZW50OiBIVE1MRWxlbWVudCwgczogU3RhdGUsIHJlbGF0aXZlOiBib29sZWFuKTogRWxlbWVudHMge1xuXG4gIC8vIC5jZy13cmFwIChlbGVtZW50IHBhc3NlZCB0byBDaGVzc2dyb3VuZClcbiAgLy8gICBjZy1oZWxwZXIgKDEyLjUlKVxuICAvLyAgICAgY2ctY29udGFpbmVyICg4MDAlKVxuICAvLyAgICAgICBjZy1ib2FyZFxuICAvLyAgICAgICBzdmdcbiAgLy8gICAgICAgY29vcmRzLnJhbmtzXG4gIC8vICAgICAgIGNvb3Jkcy5maWxlc1xuICAvLyAgICAgICBwaWVjZS5naG9zdFxuXG4gIGVsZW1lbnQuaW5uZXJIVE1MID0gJyc7XG5cbiAgLy8gZW5zdXJlIHRoZSBjZy13cmFwIGNsYXNzIGlzIHNldFxuICAvLyBzbyBib3VuZHMgY2FsY3VsYXRpb24gY2FuIHVzZSB0aGUgQ1NTIHdpZHRoL2hlaWdodCB2YWx1ZXNcbiAgLy8gYWRkIHRoYXQgY2xhc3MgeW91cnNlbGYgdG8gdGhlIGVsZW1lbnQgYmVmb3JlIGNhbGxpbmcgY2hlc3Nncm91bmRcbiAgLy8gZm9yIGEgc2xpZ2h0IHBlcmZvcm1hbmNlIGltcHJvdmVtZW50ISAoYXZvaWRzIHJlY29tcHV0aW5nIHN0eWxlKVxuICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2NnLXdyYXAnKTtcblxuICBjb2xvcnMuZm9yRWFjaChjID0+IGVsZW1lbnQuY2xhc3NMaXN0LnRvZ2dsZSgnb3JpZW50YXRpb24tJyArIGMsIHMub3JpZW50YXRpb24gPT09IGMpKTtcbiAgZWxlbWVudC5jbGFzc0xpc3QudG9nZ2xlKCdtYW5pcHVsYWJsZScsICFzLnZpZXdPbmx5KTtcblxuICBjb25zdCBoZWxwZXIgPSBjcmVhdGVFbCgnY2ctaGVscGVyJyk7XG4gIGVsZW1lbnQuYXBwZW5kQ2hpbGQoaGVscGVyKTtcbiAgY29uc3QgY29udGFpbmVyID0gY3JlYXRlRWwoJ2NnLWNvbnRhaW5lcicpO1xuICBoZWxwZXIuYXBwZW5kQ2hpbGQoY29udGFpbmVyKTtcblxuICBjb25zdCBleHRlbnNpb24gPSBjcmVhdGVFbCgnZXh0ZW5zaW9uJyk7XG4gIGNvbnRhaW5lci5hcHBlbmRDaGlsZChleHRlbnNpb24pO1xuICBjb25zdCBib2FyZCA9IGNyZWF0ZUVsKCdjZy1ib2FyZCcpO1xuICBjb250YWluZXIuYXBwZW5kQ2hpbGQoYm9hcmQpO1xuXG4gIGxldCBzdmc6IFNWR0VsZW1lbnQgfCB1bmRlZmluZWQ7XG4gIGlmIChzLmRyYXdhYmxlLnZpc2libGUgJiYgIXJlbGF0aXZlKSB7XG4gICAgc3ZnID0gY3JlYXRlU1ZHKCdzdmcnKTtcbiAgICBzdmcuYXBwZW5kQ2hpbGQoY3JlYXRlU1ZHKCdkZWZzJykpO1xuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChzdmcpO1xuICB9XG5cbiAgaWYgKHMuY29vcmRpbmF0ZXMpIHtcbiAgICBjb25zdCBvcmllbnRDbGFzcyA9IHMub3JpZW50YXRpb24gPT09ICdibGFjaycgPyAnIGJsYWNrJyA6ICcnO1xuICAgIGNvbnN0IHNob2dpID0gKHNob2dpVmFyaWFudHMuaW5jbHVkZXMocy52YXJpYW50KSk7XG4gICAgaWYgKHNob2dpKSB7XG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChyZW5kZXJDb29yZHMocmFua3Muc2xpY2UoMSwgcy5kaW1lbnNpb25zLmhlaWdodCArIDEpLnJldmVyc2UoKSwgJ2ZpbGVzJyArIG9yaWVudENsYXNzKSk7XG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChyZW5kZXJDb29yZHMocmFua3Muc2xpY2UoMSwgcy5kaW1lbnNpb25zLndpZHRoICsgMSkucmV2ZXJzZSgpLCAncmFua3MnICsgb3JpZW50Q2xhc3MpKTtcbiAgICB9IGVsc2UgaWYgKHMubm90YXRpb24gPT09IE5vdGF0aW9uLkpBTkdHSSkge1xuICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQocmVuZGVyQ29vcmRzKChbJzAnXSkuY29uY2F0KHJhbmtzLnNsaWNlKDEsIDEwKS5yZXZlcnNlKCkpLCAncmFua3MnICsgb3JpZW50Q2xhc3MpKTtcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHJlbmRlckNvb3JkcyhyYW5rcy5zbGljZSgxLCAxMCksICdmaWxlcycgKyBvcmllbnRDbGFzcykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChyZW5kZXJDb29yZHMocmFua3Muc2xpY2UoMSwgcy5kaW1lbnNpb25zLmhlaWdodCArIDEpLCAncmFua3MnICsgb3JpZW50Q2xhc3MpKTtcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHJlbmRlckNvb3JkcyhmaWxlcy5zbGljZSgwLCBzLmRpbWVuc2lvbnMud2lkdGgpLCAnZmlsZXMnICsgb3JpZW50Q2xhc3MpKTtcbiAgICB9XG4gIH1cblxuICBsZXQgZ2hvc3Q6IEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkO1xuICBpZiAocy5kcmFnZ2FibGUuc2hvd0dob3N0ICYmICFyZWxhdGl2ZSkge1xuICAgIGdob3N0ID0gY3JlYXRlRWwoJ3BpZWNlJywgJ2dob3N0Jyk7XG4gICAgc2V0VmlzaWJsZShnaG9zdCwgZmFsc2UpO1xuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChnaG9zdCk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGJvYXJkLFxuICAgIGNvbnRhaW5lcixcbiAgICBnaG9zdCxcbiAgICBzdmdcbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyQ29vcmRzKGVsZW1zOiBhbnlbXSwgY2xhc3NOYW1lOiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XG4gIGNvbnN0IGVsID0gY3JlYXRlRWwoJ2Nvb3JkcycsIGNsYXNzTmFtZSk7XG4gIGxldCBmOiBIVE1MRWxlbWVudDtcbiAgZm9yIChsZXQgaSBpbiBlbGVtcykge1xuICAgIGYgPSBjcmVhdGVFbCgnY29vcmQnKTtcbiAgICBmLnRleHRDb250ZW50ID0gZWxlbXNbaV07XG4gICAgZWwuYXBwZW5kQ2hpbGQoZik7XG4gIH1cbiAgcmV0dXJuIGVsO1xufVxuIl19
