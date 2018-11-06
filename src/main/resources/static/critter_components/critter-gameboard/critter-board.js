import {html, PolymerElement} from '/lib/@polymer/polymer/polymer-element.js';
import { afterNextRender } from '/lib/@polymer/polymer/lib/utils/render-status.js';
import {Level} from '../critter-level-mixin/critter-level-mixin.js';
import './critter-board-field.js';
import './critter-board-hover-field.js';

/*
# critter-gameboard

Renders the gameboard and its textures.

## Example
```html
<critter-gameboard level="[Array with texture code]"></critter-gameboard>
```

@demo
*/

class CritterGameboard extends Level(PolymerElement) {
    static get template() {
        return html`
        <style>
            :host {
                display: block;
                --board-width: 40px;
                --board-height: 40px;
                --show-grid: hidden;
                width: calc(var(--board-width) + 25px);
            }

            #verticalGrid {
                margin-right: 5px;
                width: 16px;
                min-height: 40px;
                visibility: var(--show-grid);
            }

            #horizontalGrid {
                margin-left: 21px;
                margin-top: 5px;
                height: 21px;
                visibility: var(--show-grid);
            }

            #horizontalGrid div,
            #verticalGrid div {
                margin: auto;
            }

            #horizontalGrid div {
                float: left;
                width: 40px;
                text-align: center;
            }

            #verticalGrid div span {
                vertical-align: middle;
                display: table-cell;
            }

            #verticalGrid div {
                height: 40px;
                display: table;
            }

            #board {
                display: inline-block;
                position: relative;
                top: calc(var(--board-height) * -1 - 12px);
                left: 21px;
                width: var(--board-width);
                height: 0;
            }

            #overlay {
                display: inline-block;
                position: relative;
                float: left;
                bottom: calc(var(--board-height) + 15px);
                right: -21px;
                height: 0;
                width: var(--board-width);
            }
        </style>
        <div id="verticalGrid"></div>
        <div id="board"></div>
        <div id="overlay"></div>
        <div id="horizontalGrid" ></div>
`;
    }

    static get importMeta() { return import.meta; }

    static get is() {
        return 'critter-gameboard';
    }

    static get properties() {

        return {

            showGrid: {
                type: Boolean,
                default: true,
                observer: '_showGrid'
            },

            selectedElement: {
                type: String
            }
        };
    }

    connectedCallback() {
        super.connectedCallback();

        afterNextRender(this, function () {
            let rootNode = window.Core.GameRoot;
            this.addEventListener("_levelChanged", this.renderBoard);
            if (rootNode) {
                rootNode.addEventListener("_critterKilled", (event) => this._playExplosion(event));
                rootNode.addEventListener("_levelSizeChanged", this.renderGrid.bind(this));
                rootNode.addEventListener("_levelDataChanged", this.renderBoard.bind(this));
            }
            this._globalData = window.Core.CritterLevelData;
            this.renderGrid();
        });
    }


    /** creates and renders the gameboard **/
    renderBoard() {
        if (!this._globalData || !this._globalData.level || this._globalData.level.length !== this._globalData.height) {
            return;
        }

        this.updateStyles({
            '--board-width': (this._globalData.width * 40) + "px",
            '--board-height': (this._globalData.width * 40) + "px"
        });

        let gameboard = this.$.board;
        let gameboardOverlay = this.$.overlay;

        gameboard.innerHTML = "";
        gameboardOverlay.innerHTML = "";
        for (let i = 0; i < this._globalData.width; ++i) {
            for (let j = 0; j < this._globalData.height; ++j) {
                this._addHoverField(i, j, gameboardOverlay);
                this._addField(i, j, gameboard);
            }
        }
        this.placeElements();
    }

    /** adds the elements (mines, towers, modders) to the gameboard **/
    placeElements() {
        this.placeMines();
    }

    /** adds the mines to the gameboard **/
    placeMines() {
        this._globalData.mines.forEach((mine) => {
            let mineField = this.shadowRoot.querySelector('#field-' + mine.x + "-" + mine.y);
            mineField.class += " mine";
        });
    }


    rerenderField(element) {
        for (let i = -1; i <= 1; ++i) {
            if (0 <= element.x + i && this._globalData.width > element.x + i) {
                for (let j = -1; j <= 1; ++j) {
                    if (0 <= element.y + j && this._globalData.height > element.y + j) {
                        let field = this.shadowRoot.querySelector('#field-' + (element.x + i) + "-" + (element.y + j));
                        field.class = this._computeClass((element.y + j), (element.x + i));
                    }
                }
            }
        }
    }

    /** adds the given element to the gameboard and the List **/
    addElement(element) {
        if (!window.Core.generator) {
            return
        } else {
            switch (this.selectedElement) {
                case "water" :
                case "ice" :
                case "dirt" :
                case "grass" :
                case "wood" :
                    this._globalData.level[element.y][element.x] = this.selectedElement;
                    this.rerenderField(element);
                    break;
                case "tower" :
                    this._globalData.tower = element;
                    break;
                case "spawn" :
                    this._globalData.spawn = element;
                    break;
                default:
                    console.error("Could not handle selectedElement " + this.selectedElement);
                    break;
            }
        }
    }

    /** adds a hoverField to the gameboardOverlay **/
    _addHoverField(i, j, gameboardOverlay) {
        let hoverField = document.createElement("critter-gameboard-hover-field");
        hoverField.x = j;
        hoverField.y = i;
        hoverField.id = "hover-field-" + j + "-" + i;
        //add EventListeners
        hoverField.addEventListener("hoverOver", (event) => {
            let detail = event.detail;
            this.dispatchEvent(new CustomEvent('hoverOver', {
                detail: {x: detail.x, y: detail.y},
                bubbles: true,
                composed: true
            }));
        });

        hoverField.addEventListener("fieldClicked", (event) => this.addElement(event.detail));

        gameboardOverlay.append(hoverField);
    }

    /** adds a Field to the gameboard **/
    _addField(i, j, gameboard) {
        let field = document.createElement("critter-gameboard-field");
        field.x = j;
        field.y = i;
        field.id = "field-" + j + "-" + i;
        field.class = this._computeClass(i, j);
        gameboard.append(field);
    }

    _computeClass(i, j) {
        let className;
        switch (this._globalData.level[i][j]) {
            case "grass":
                className = "grass" + this._randomNumber(0, 3) + " ";
                break;
            case "dirt":
                className = " dirt ";

                let tempName = this._computeClassNames(i, j, "dirt");
                if (tempName !== "") {
                    className += tempName;
                } else {
                    className += "dirt" + this._randomNumber(0, 2) + " ";
                }
                break;
            case "water":
                className = " water ";

                let tempName2 = this._computeClassNames(i, j, "water");
                if (tempName2 !== "") {
                    className += tempName2;
                } else {
                    className += "water" + this._randomNumber(0, 3) + " ";
                }
                break;
            case "ice":
                className = " ice ";

                let tempName3 = this._computeClassNames(i, j, "ice");
                if (tempName3 !== "") {
                    className += tempName3;
                } else {
                    className += "ice" + this._randomNumber(0, 3) + " ";
                }
                break;
            case "wood":
                className = "wood";
                if (j > 0 && this._globalData.level[i][j - 1] !== "wood") {
                    className += " wood-left";
                }
                if (j < this._globalData.width - 1 && this._globalData.level[i][j + 1] !== "wood") {
                    className += " wood-right";
                }
                if (i > 0 && this._globalData.level[i - 1][j] !== "wood") {
                    className += " wood-up";
                }
                if (i < this._globalData.height - 1 && this._globalData.level[i + 1][j] !== "wood") {
                    className += " wood-down";
                }
                if (j > 0 && i < this._globalData.height - 1 && this._globalData.level[i + 1][j - 1] !== "wood" && this._globalData.level[i + 1][j] === "wood" && this._globalData.level[i][j - 1] === "wood") {
                    className += " wood-left-down";
                }
                if (j < this._globalData.width - 1 && i < this._globalData.height - 1 && this._globalData.level[i + 1][j + 1] !== "wood" && this._globalData.level[i + 1][j] === "wood" && this._globalData.level[i][j + 1] === "wood") {
                    className += " wood-right-down";
                }
                if (j > 0 && i > 0 && this._globalData.level[i - 1][j - 1] !== "wood" && this._globalData.level[i - 1][j] === "wood" && this._globalData.level[i][j - 1] === "wood") {
                    className += " wood-left-up";
                }
                if (j < this._globalData.width - 1 && i > 0 && this._globalData.level[i - 1][j + 1] !== "wood" && this._globalData.level[i - 1][j] === "wood" && this._globalData.level[i][j + 1] === "wood") {
                    className += " wood-right-up";
                }
                break;
            default:
                className = "grass"
        }

        if (this._globalData.tower && this._globalData.tower.x === j && i === this._globalData.tower.y) {
            className += " towerField";
        } else if (this._globalData.spawn && j === this._globalData.spawn.x && i === this._globalData.spawn.y) {
            className += " spawnField";
        }
        return className;
    }

    _computeClassNames(i, j, name) {
        let array = [];
        let className = "";

        /*  Encode as follows 1 === texture of the field is name)
            000 = 0
            001 = 1
            010 = 2
            100 = 3
            011 = 4
            110 = 5
            101 = 6
            111 = 7
            */
        for (let x = i - 1; x <= i + 1; ++x) {
            let row = this._globalData.level[x];
            if (!row) {
                array.push(0);
            } else if (row[j - 1] === name) {
                if (row[j] === name) {
                    if (row[j + 1] === name) {
                        array.push(7);
                    } else {
                        array.push(5);
                    }
                } else {
                    if (row[j + 1] === name) {
                        array.push(6);
                    } else {
                        array.push(3);
                    }
                }
            } else {
                if (row[j] === name) {
                    if (row[j + 1] === name) {
                        array.push(4);
                    } else {
                        array.push(2);
                    }
                } else {
                    if (row[j + 1] === name) {
                        array.push(1);
                    } else {
                        array.push(0);
                    }
                }
            }
        }

        switch (array[0]) {
            case 0 :
                switch (array[1]) {
                    case 2 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6:
                                className += name + "-only" + " background-grass";
                                break;
                            case 2 :
                            case 4 :
                            case 5 :
                            case 7 :
                                className += name + "-vertical-up" + " background-grass";
                                break;
                        }
                        break;
                    case 4 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-horizontal-left" + " background-grass";
                                break;
                            case 2 :
                            case 5 :
                                className += name + "-bow-down-right" + " background-grass";
                                break;
                            case 4 :
                            case 7 :
                                className += name + "-left " + name + "-up" + " background-grass";
                                break;
                        }
                        break;
                    case 5 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-horizontal-right" + " background-grass";
                                break;
                            case 2 :
                            case 4 :
                                className += name + "-bow-down-left" + " background-grass";
                                break;
                            case 5 :
                            case 7 :
                                className += name + "-right " + name + "-up" + " background-grass";
                                break;
                        }
                        break;
                    case 7 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6:
                                className += name + "-horizontal" + " background-grass";
                                break;
                            case 2 :
                                className += name + "-horizontal-down" + " background-grass";
                                break;
                            case 4 :
                                className += name + "-horizontal-down-right" + " background-grass";
                                break;
                            case 5 :
                                className += name + "-horizontal-down-left" + " background-grass";
                                break;
                            case 7 :
                                className += name + "-up" + " background-grass";
                                break;
                        }
                        break;
                }
                break;
            case 1 :
                switch (array[1]) {
                    case 2 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6:
                                className += name + "-only" + " background-grass";
                                break;
                            case 2 :
                            case 4 :
                            case 5 :
                            case 7 :
                                className += name + "-vertical-up" + " background-grass";
                                break;
                        }
                        break;
                    case 4 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-horizontal-left" + " background-grass";
                                break;
                            case 2 :
                            case 5 :
                                className += name + "-bow-down-right" + " background-grass";
                                break;
                            case 4 :
                            case 7 :
                                className += name + "-up " + name + "-left" + " background-grass";
                                break;
                        }
                        break;
                    case 5 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-horizontal-right" + " background-grass";
                                break;
                            case 2 :
                            case 4 :
                                className += name + "-bow-down-right" + " background-grass";
                                break;
                            case 5 :
                            case 7 :
                                className += name + "-up " + name + "-right" + " background-grass";
                                break;
                        }
                        break;
                    case 7 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6:
                                className += name + "-horizontal" + " background-grass";
                                break;
                            case 2 :
                                className += name + "-horizontal-down" + " background-grass";
                                break;
                            case 4 :
                                className += name + "-horizontal-down-right" + " background-grass";
                                break;
                            case 5 :
                                className += name + "-horizontal-down-left" + " background-grass";
                                break;
                            case 7 :
                                className += name + "-up" + " background-grass";
                                break;
                        }
                        break;
                }
                break;
            case 2 :
                switch (array[1]) {
                    case 2 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-vertical-down" + " background-grass";
                                break;
                            case 2 :
                            case 4 :
                            case 5 :
                            case 7 :
                                className += name + "-vertical" + " background-grass";
                                break;
                        }
                        break;
                    case 4 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-bow-up-right" + " background-grass";
                                break;
                            case 2 :
                            case 5 :
                                className += name + "-vertical-right" + " background-grass";
                                break;
                            case 4 :
                            case 7 :
                                className += name + "-vertical-right-down" + " background-grass";
                                break;
                        }
                        break;
                    case 5 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-bow-up-left" + " background-grass";
                                break;
                            case 2 :
                            case 4 :
                                className += name + "-vertical-left" + " background-grass";
                                break;
                            case 5 :
                            case 7 :
                                className += name + "-vertical-left-down" + " background-grass";
                                break;
                        }
                        break;
                    case 7 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-horizontal-up" + " background-grass";
                                break;
                            case 2 :
                                className += name + "-cross" + " background-grass";
                                break;
                            case 4 :
                                className += name + "-full-down-right" + " background-grass";
                                break;
                            case 5 :
                                className += name + "-full-down-left" + " background-grass";
                                break;
                            case 7 :
                                className += name + "-t-up" + " background-grass";
                                break;
                        }
                        break;
                }
                break;
            case 3 :
                switch (array[1]) {
                    case 2 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6:
                                className += name + "-only" + " background-grass";
                                break;
                            case 2 :
                            case 4 :
                            case 5 :
                            case 7 :
                                className += name + "-vertical-up" + " background-grass";
                                break;
                        }
                        break;
                    case 4 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-horizontal-left" + " background-grass";
                                break;
                            case 2 :
                            case 5 :
                                className += name + "-bow-down-right" + " background-grass";
                                break;
                            case 4 :
                            case 7 :
                                className += name + "-up " + name + "-left" + " background-grass";
                                break;
                        }
                        break;
                    case 5 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-horizontal-right" + " background-grass";
                                break;
                            case 2 :
                            case 4 :
                                className += name + "-bow-down-left" + " background-grass";
                                break;
                            case 5 :
                            case 7 :
                                className += name + "-up " + name + "-right" + " background-grass";
                                break;
                        }
                        break;
                    case 7 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6:
                                className += name + "-horizontal" + " background-grass";
                                break;
                            case 2 :
                                className += name + "-horizontal-down" + " background-grass";
                                break;
                            case 4 :
                                className += name + "-horizontal-right" + " background-grass";
                                break;
                            case 5 :
                                className += name + "-horizontal-down-left" + " background-grass";
                                break;
                            case 7 :
                                className += name + "-up" + " background-grass";
                                break;
                        }
                        break;
                }
                break;
            case 4 :
                switch (array[1]) {
                    case 2 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-vertical-down" + " background-grass";
                                break;
                            case 2 :
                            case 4 :
                            case 5 :
                            case 7 :
                                className += name + "-vertical" + " background-grass";
                                break;
                        }
                        break;
                    case 4 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-down " + name + "-left" + " background-grass";
                                break;
                            case 2 :
                            case 5 :
                                className += name + "-vertical-right-up" + " background-grass";
                                break;
                            case 4 :
                            case 7 :
                                className += name + "-left" + " background-grass";
                                break;
                        }
                        break;
                    case 5 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-bow-up-left" + " background-grass";
                                break;
                            case 2 :
                            case 4 :
                                className += name + "-vertical-left" + " background-grass";
                                break;
                            case 5 :
                            case 7 :
                                className += name + "-vertical-left-down" + " background-grass";
                                break;
                        }
                        break;
                    case 7 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-horizontal-up-right" + " background-grass";
                                break;
                            case 2 :
                                className += name + "-full-up-right" + " background-grass";
                                break;
                            case 4 :
                                className += name + "-t-left" + " background-grass";
                                break;
                            case 5 :
                                className += name + "-diagonal-up-right" + " background-grass";
                                break;
                            case 7 :
                                className += name + "-left-up" + " background-grass";
                                break;
                        }
                        break;
                }
                break;
            case 5 :
                switch (array[1]) {
                    //done
                    case 2 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-vertical-down" + " background-grass";
                                break;
                            case 2 :
                            case 4 :
                            case 5 :
                            case 7 :
                                className += name + "-vertical" + " background-grass";
                                break;
                        }
                        break;
                    case 4 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-bow-up-right" + " background-grass";
                                break;
                            case 2 :
                            case 5 :
                                className += name + "-vertical-right" + " background-grass";
                                break;
                            case 4 :
                            case 7 :
                                className += name + "-vertical-right-down" + " background-grass";
                                break;
                        }
                        break;
                    case 5 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                                className += name + "-down " + name + "-right" + " background-grass";
                                break;
                            case 2 :
                            case 4 :
                            case 6 :
                                className += name + "-vertical-left-up" + " background-grass";
                                break;
                            case 5 :
                            case 7 :
                                className += name + "-right" + " background-grass";
                                break;
                        }
                        break;
                    case 7 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-horizontal-up-left" + " background-grass";
                                break;
                            case 2 :
                                className += name + "-full-up-left" + " background-grass";
                                break;
                            case 4 :
                                className += name + "-diagonal-down-right" + " background-grass";
                                break;
                            case 5 :
                                className += name + "-t-right" + " background-grass";
                                break;
                            case 7 :
                                className += name + "-right-up" + " background-grass";
                                break;
                        }
                        break;
                }
                break;
            case 6 :
                switch (array[1]) {
                    case 2 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6:
                                className += name + "-only" + " background-grass";
                                break;
                            case 2 :
                            case 4 :
                            case 5 :
                            case 7 :
                                className += name + "-vertical-up" + " background-grass";
                                break;
                        }
                        break;
                    case 4 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-horizontal-left" + " background-grass";
                                break;
                            case 2 :
                            case 5 :
                                className += name + "-bow-down-right" + " background-grass";
                                break;
                            case 4 :
                            case 7 :
                                className += name + "-up " + name + "-left" + " background-grass";
                                break;
                        }
                        break;
                    case 5 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-horizontal-right" + " background-grass";
                                break;
                            case 2 :
                            case 4 :
                                className += name + "-bow-down-left" + " background-grass";
                                break;
                            case 5 :
                            case 7 :
                                className += name + "-right " + name + "-up" + " background-grass";
                                break;
                        }
                        break;
                    case 7 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6:
                                className += name + "-horizontal" + " background-grass";
                                break;
                            case 2 :
                                className += name + "-horizontal-down" + " background-grass";
                                break;
                            case 4 :
                                className += name + "-horizontal-down-right" + " background-grass";
                                break;
                            case 5 :
                                className += name + "-horizontal-down-left" + " background-grass";
                                break;
                            case 7 :
                                className += name + "-up" + " background-grass";
                                break;
                        }
                        break;
                }
                break;
            case 7 :
                switch (array[1]) {

                    case 2 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-vertical-down" + " background-grass";
                                break;
                            case 2 :
                            case 4 :
                            case 5 :
                            case 7 :
                                className += name + "-vertical" + " background-grass";
                                break;
                        }
                        break;
                    case 4 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-down " + name + "-left" + " background-grass";
                                break;
                            case 2 :
                            case 5 :
                                className += name + "-vertical-right-up" + " background-grass";
                                break;
                            case 4 :
                            case 7 :
                                className += name + "-left" + " background-grass";
                                break;
                        }
                        break;
                    case 5 :
                        switch (array[2]) {
                            case 0 :
                            case 1 :
                            case 3 :
                            case 6 :
                                className += name + "-down " + name + "-right" + " background-grass";
                                break;
                            case 2 :
                            case 4 :
                                className += name + "-vertical-left-up" + " background-grass";
                                break;
                            case 5 :
                            case 7 :
                                className += name + "-right" + " background-grass";
                                break;
                        }
                        break;
                    case 7 :
                        switch (array[2]) {
                            case 0 :
                            case 6 :
                            case 1 :
                            case 3 :
                                className += name + "-down" + " background-grass";
                                break;
                            case 2 :
                                className += name + "-t-down" + " background-grass";
                                break;

                            case 4 :
                                className += name + "-left-down" + " background-grass";
                                break;
                            case 5 :
                                className += name + "-right-down" + " background-grass";
                                break;
                        }
                        break;
                }
                break;
        }
        return className
    }

    /** creates an renders the grid **/
    renderGrid() {
        if (this.showGrid && this._globalData) {
            let horizontalGrid = this.$.horizontalGrid;
            horizontalGrid.innerHTML = "";
            for (let i = 0; i < this._globalData.width; ++i) {
                let element = document.createElement("div");
                element.innerHTML = i + 1;
                horizontalGrid.append(element);

            }

            let verticalGrid = this.$.verticalGrid;
            verticalGrid.innerHTML = "";
            for (let j = 0; j < this._globalData.height; ++j) {
                let element = document.createElement("div");
                element.innerHTML = "<span>" + (this._globalData.height - j) + "</span>";
                verticalGrid.append(element);
            }
        }
    }

    /** change the styling of the grid (visible or not) **/
    _showGrid() {
        this.updateStyles({
            '--show-grid': (this.showGrid ? 'visible' : 'hidden')
        });
        if (this.showGrid) {
            this.renderGrid()
        }
    }

    _playExplosion(event) {
        let audio = document.createElement("audio");
        audio.src = this.importPath + "/sounds/bomb.flac";
        audio.play();
        let detail = event.detail;
        let field = this.shadowRoot.querySelector('#field-' + detail.x + "-" + detail.y);
        field.playExplosion();
    }
}

window.customElements.define(CritterGameboard.is, CritterGameboard);
