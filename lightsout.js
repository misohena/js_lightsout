// lightsout.js
// Copyright (c) 2014 AKIYAMA Kouhei
// This software is released under the MIT License.

(function(global){
    if(!global.misohena){ global.misohena = {}; }
    if(!global.misohena.js_lightsout){ global.misohena.js_lightsout = {}; }
    var mypkg = global.misohena.js_lightsout;

    //
    // Model
    //

    mypkg.Board = Board;
    function Board(w, h, cells, hist){
        var history = hist !== undefined ? hist : new MoveHistory(w, h);

        this.getWidth = function(){return w;};
        this.getHeight = function(){return h;};
        this.getCell = function(x, y){return cells[x+y*w];};
        this.setCell = function(x, y, state){ return cells[x+y*w] = state;};
        this.getNCell = function(i){return cells[i];};
        this.setNCell = function(i, state){ return cells[i] = state;};
        this.fill = function(state){
            for(var i = 0; i < cells.length; ++i){cells[i] = state;}
        };
        this.flipOn = function(x, y, suppressRecordHistory){
            if(!(x >= 0 && y >= 0 && x < w && y < h)){
                return;
            }
            var index = x + y * w;
            cells[index] = !cells[index];
            if(x > 0) {
                cells[index-1] = !cells[index-1];
            }
            if(y > 0) {
                cells[index-w] = !cells[index-w];
            }
            if(x+1 < w) {
                cells[index+1] = !cells[index+1];
            }
            if(y+1 < h) {
                cells[index+w] = !cells[index+w];
            }
            if(history && !suppressRecordHistory){
                history.addMove(x, y);
            }
        };
        this.isSolved = function(){
            for(var i = 0; i < cells.length; ++i){
                if(cells[i]){
                    return false;
                }
            }
            return true;
        };
        this.randomize = function(){
            this.fill(false);
            do{
                for(var y = 0; y < h; ++y){
                    for(var x = 0; x < w; ++x){
                        if(Math.random() < 0.5){
                            this.flipOn(x, y, true);
                        }
                    }
                }
            }
            while(this.isSolved());
            return this;
        };
        this.setMoveHistory = function(h){
            return history = h;
        };
        this.getMoveHistory = function(){
            return history;
        };
        this.clone = function(){
            return new Board(w, h, cells.slice(0), history ? history.clone() : null);
        };
        this.setBoard = function(b){
            w = b.getWidth();
            h = b.getHeight();
            cells = new Array(w*h);
            for(var i = 0; i < cells.length; ++i){
                cells[i] = b.getNCell(i);
            }
            var bh = b.getMoveHistory();
            if(bh){
                history = bh.clone();
            }
            else{
                history = null;
            }
            return this;
        };
        if(!cells){
            cells = new Array(w*h);
            this.fill(false);
        }
    }

    mypkg.parseBoard = parseBoard;
    function parseBoard(text)
    {
        var MAX_SIZE = 100;
        var rows = text.split(/\s+/);
        if(!(rows.length > 0 && rows.length <= MAX_SIZE)){
            return null;
        }
        var w = rows[0].length;
        if(!(w > 0 && w <= MAX_SIZE)){
            return null;
        }
        var cells = [];
        var y;
        for(y = 0; y < rows.length; ++y){
            if(rows[y].length != w){
                break;
            }
            for(var x = 0; x < rows[y].length; ++x){
                cells.push(rows[y].charAt(x) == '#');
            }
        }
        if(y == 0){
            return null;
        }
        var h = y;

        return new Board(w, h, cells);
    }

    //
    // Move History
    //
    function MoveHistory(w, h, movesArg)
    {
        var cells = new Array(w*h);
        var moves = movesArg || [];
        this.addMove = addMove;
        function addMove(x, y){
            moves.push({x:x, y:y});
            flipCell(x, y);
        };
        this.getWidth = function (){ return w;};
        this.getHeight = function (){ return h;};
        this.getMove = function(i){ return moves[i];};
        this.getMoveCount = function(){ return moves.length;};

        function initCells(){
            for(var i = 0; i < cells.length; ++i){ cells[i] = false;}
        }
        function flipCell(x, y){
            var index = x+y*w;
            cells[index] = !cells[index];
        }
        initCells();
        function getCellFliped(x, y){
            return cells[x+y*w];
        }
        this.getAnswerText = getAnswerText;
        function getAnswerText(){
            return convertBoolArrayToBase64(cells);
        }
        this.clone = clone;
        function clone(){
            return new MoveHistory(w, h, moves.slice(0));
        }
        this.setMoveHistory = setMoveHistory;
        function setMoveHistory(hist){
            w = hist.getWidth();
            h = hist.getHeight();
            cells = new Array(w*h);
            moves = [];
            for(var i = 0; i < hist.getMoveCount(); ++i){
                var m = hist.getMove(i);
                addMove(m.x, m.y);
            }
        }
    }
    var BASE64URL_TBL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    function toBase64Char(num)
    {
        return BASE64URL_TBL.charAt(num);
    }
    function convertBoolArrayToBase64(arr)
    {
        var text = "";
        var bits = 0;
        function flush(){
            text += toBase64Char(bits);
            bits = 0;
        }
        for(var i = 0, bi = 0; i < arr.length; ++i){
            if(arr[i]){
                bits |= (1<<bi);
            }
            if(++bi >= 6){
                bi = 0;
                flush();
            }
        }
        if(bi > 0){
            flush();
        }
        return text;
    }
    function convertIntToBase64(num, bits)
    {
        var arr = [];
        for(var i = 0; i < bits; ++i){
            arr.push( (num & 1) != 0 );
            num >>= 1;
        }
        return convertBoolArrayToBase64(arr);
    }

    //
    // Solver
    //
    mypkg.enumAllSolutionsText = enumAllSolutionsText;
    function enumAllSolutionsText(board)
    {
        var w = board.getWidth();
        var h = board.getHeight();
        var cellCount = w * h;
        if(cellCount > 28){
            return null;
        }
        var solutions = [];
        for(var s = 0; s < (1<<cellCount); ++s){
            var b = board.clone();
            var mask = 1;
            for(var y = 0; y < h; ++y){
                for(var x = 0; x < w; ++x, mask <<= 1){
                    if(s & mask){
                        b.flipOn(x, y, true);
                    }
                }
            }
            if(b.isSolved()){
                solutions.push(convertIntToBase64(s, cellCount));
            }
        }
        return solutions;
    }


    //
    // HTMLTableElement View
    //

    function createTable(board, cellW, cellH)
    {
        if(cellW === undefined){ cellW = "48px";}
        if(cellH === undefined){ cellH = "48px";}

        var w = board.getWidth();
        var h = board.getHeight();
        var table = document.createElement("table");
        table.style.borderCollapse = "collapse";
        table.style.border = "1px solid black";
        for(var y = 0; y < h; ++y){
            var tr = document.createElement("tr");
            for(var x = 0; x < w; ++x){
                var td = document.createElement("td");
                tr.appendChild(td);
                td.style.width = cellW;
                td.style.height = cellH;
                td.style.border = "1px solid black";
            }
            table.appendChild(tr);
        }
        return table;
    }
    function forEachCell(table, board, fun)
    {
        var w = board.getWidth();
        var h = board.getHeight();
        var ci = 0;
        for(var y = 0; y < h; ++y){
            var row = table.rows[y];
            for(var x = 0; x < w; ++x){
                fun(row.cells[x], ci, x, y);
                ++ci;
            }
        }
    }
    function updateTable(table, board)
    {
        var bgOn = "black";
        var bgOff = "transparent";
        forEachCell(table, board, function(cell, ci, x, y){
            cell.style.background =
                board.getCell(x, y) ? bgOn : bgOff;
        });
    }
    function listenTableInput(table, board, onClickCell)
    {
        var listeners = [];
        function createCellListener(x, y)
        {
            return function(ev){ onClickCell(x, y); };
        }
        function addListeners(){
            forEachCell(table, board, function(cell, ci, x, y){
                var cl = createCellListener(x, y);
                listeners.push(cl);
                cell.addEventListener("click", cl, false);
            });
        }
        function removeListeners(){
            forEachCell(table, board, function(cell, ci, x, y){
                cell.removeEventListener("click", listeners[ci], false);
            });
        }

        addListeners();

        return {
            close: function(){
                removeListeners();
            }
        };
    }

    mypkg.createTableView = createTableView;
    function createTableView(board, cellW, cellH)
    {
        var table = this.table = createTable(board, cellW, cellH);
        var listeners = listenTableInput(table, board, onClickCell);
        var inputEnabled = true;

        update();

        function onClickCell(x, y){
            if(inputEnabled){
                board.flipOn(x, y);
                update();

                fireBoardMovedEvent();

                if(board.isSolved()){
                    setInputEnabled(false);
                    fireSolvedEvent();
                }
            }
        }
        function fireBoardMovedEvent(){
            var ev = document.createEvent("HTMLEvents");
            ev.initEvent("boardmoved", true, false);
            table.dispatchEvent(ev);
        }
        function fireSolvedEvent(){
            var ev = document.createEvent("HTMLEvents");
            ev.initEvent("solved", true, false);
            table.dispatchEvent(ev);
        }
        table.update = update;
        function update(){
            updateTable(table, board);
        }
        table.getBoard = getBoard;
        function getBoard(){
            return board;
        }
        table.setInputEnabled = setInputEnabled;
        function setInputEnabled(b){
            inputEnabled = b;
        }

        return table;
    }



    //
    // Loading Mark
    //

    mypkg.createLoadingMark = createLoadingMark;
    function createLoadingMark()
    {
        var mark = document.createElement("div");
        mark.style.position = "absolute";
        mark.style.left = "50%";
        mark.style.top = "50%";
        mark.style.background = "#ff0000";
        var dots = [];
        for(var i = 0; i < 8; ++i){
            var dot = document.createElement("div");

            dot.style.width = 10+"px";
            dot.style.height = 10+"px";
            dot.style.position = "absolute";
            dot.style.left = (-5+([0,1,1,1,0,-1,-1,-1][i])*16)+"px";
            dot.style.top = (-5+([-1,-1,0,1,1,1,0,-1][i])*16)+"px";
            dot.style.background = "#ffffff";
            dot.style.opacity = 0;
            mark.appendChild(dot);
            dots.push(dot);
        }
        var TIMER_INTERVAL = 25;
        var CYCLE = 500;

        var t = 0;
        var intervalId = setInterval(function(){
            t += TIMER_INTERVAL;
            for(var i = 0; i < 8; ++i){
                var tt = t - CYCLE*i/8;
                if(tt >= 0){
                    dots[i].style.opacity = Math.max(0, 1.0 - (tt % CYCLE) / CYCLE);
                }
            }}, TIMER_INTERVAL);
        mark.stop = function(){
            if(intervalId !== undefined){
                clearInterval(intervalId);
                delete intervalId;
            }
            if(mark.parentNode){
                mark.parentNode.removeChild(mark);
            }
        };
        return mark;
    }

    //
    // HTML Utility
    //

    mypkg.getLastScriptNode = getLastScriptNode;
    function getLastScriptNode()
    {
        var n = document;
        while(n && n.nodeName.toLowerCase() != "script") { n = n.lastChild;}
        return n;
    }


    mypkg.showImage = showImage;
    function showImage(fromTable, imgUrl, linkUrl)
    {
        var tableWrapperOuter = document.createElement("div");
        tableWrapperOuter.style.padding = "0";
        tableWrapperOuter.style.margin = "0";
        tableWrapperOuter.style.position = "relative";
        fromTable.parentNode.insertBefore(tableWrapperOuter, fromTable);
        fromTable.parentNode.removeChild(fromTable);

        var tableWrapperInner = document.createElement("div");
        tableWrapperInner.style.padding = "0";
        tableWrapperInner.style.margin = "0";
        tableWrapperInner.style.display = "inline-block";
        tableWrapperInner.style.position = "relative";
        tableWrapperOuter.appendChild(tableWrapperInner);
        tableWrapperInner.appendChild(fromTable);

        var loadingMark = createLoadingMark();
        tableWrapperInner.appendChild(loadingMark);

        var imgLoader = new Image();
        imgLoader.onload = onLoaded;
        imgLoader.src = imgUrl;

        function onLoaded()
        {
            loadingMark.stop();

            var overlay = document.createElement("div");
            overlay.style.position = "fixed";
            overlay.style.left = "0%";
            overlay.style.top = "0%";
            overlay.style.width = "100%";
            overlay.style.height = "100%";
            overlay.style.background = "rgba(0,0,0,0)";
            overlay.style.zIndex = "99999";
            document.body.appendChild(overlay);

            var img = document.createElement("div");
            img.style.display = "inline-block";
            img.style.position = "relative";
            img.style.backgroundImage = "url('" + imgUrl + "')";
            img.style.backgroundPosition = "center center";
            img.style.backgroundRepeat = "no-repeat";
            img.style.backgroundSize = "contain";
            img.style.cursor = "pointer";
            img.addEventListener("click", function(e){
                location.href = linkUrl || imgUrl;
            }, false);
            overlay.appendChild(img);

            var fromRect = fromTable.getBoundingClientRect();
            var fromX = fromRect.left + fromRect.width/2;
            var fromY = fromRect.top + fromRect.height/2;

            var startTime = Date.now();
            function step(){
                var alpha = Math.min((Date.now() - startTime) / 500, 1.0);

                overlay.style.background = "rgba(0,0,0," + (alpha*0.75).toFixed(3) + ")";
                img.style.opacity = (Math.min(1.0, alpha*4)).toFixed(3);

                function intpl(from, to){
                    return (to - from) * alpha + from;
                }
                img.style.left = intpl(fromX, 0) + "px";
                img.style.top = intpl(fromY, 0) + "px";
                img.style.width = intpl(0, 100) + "%";
                img.style.height = intpl(0, 100) + "%";
                if(alpha >= 1.0){
                }
                else{
                    setTimeout(step, 10);
                }
            }
            step();
        }
    }

})(this);
