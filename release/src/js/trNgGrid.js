/// <reference path="../external/typings/angularjs/angular.d.ts"/>
"use strict";
var TrNgGrid;
(function (TrNgGrid) {
    (function (SelectionMode) {
        SelectionMode[SelectionMode["None"] = 0] = "None";
        SelectionMode[SelectionMode["SingleRow"] = 1] = "SingleRow";
        SelectionMode[SelectionMode["MultiRow"] = 2] = "MultiRow";
        SelectionMode[SelectionMode["MultiRowWithKeyModifiers"] = 3] = "MultiRowWithKeyModifiers";
    })(TrNgGrid.SelectionMode || (TrNgGrid.SelectionMode = {}));
    var SelectionMode = TrNgGrid.SelectionMode;

    // it's important to assign all the default column options, so we can match them with the column attributes in the markup
    TrNgGrid.defaultColumnOptions = {
        cellWidth: null,
        cellHeight: null,
        displayAlign: null,
        displayFormat: null,
        displayName: null,
        filter: null,
        enableFiltering: null,
        enableSorting: null
    };

    TrNgGrid.translations = {};

    TrNgGrid.debugMode = false;

    var templatesConfigured = false;
    var tableDirective = "trNgGrid";
    TrNgGrid.dataPagingFilter = tableDirective + "DataPagingFilter";
    TrNgGrid.translateFilter = tableDirective + "TranslateFilter";
    TrNgGrid.translationDateFormat = tableDirective + "DateFormat";
    TrNgGrid.dataFormattingFilter = tableDirective + "DataFormatFilter";

    //var headerDirective="trNgGridHeader";
    //var headerDirectiveAttribute = "tr-ng-grid-header";
    var headerDirective = "trNgGridHeader";
    var headerDirectiveAttribute = "tr-ng-grid-header";

    var footerDirective = "trNgGridFooter";
    var footerDirectiveAttribute = "tr-ng-grid-footer";

    var bodyDirective = "trNgGridBody";
    var bodyDirectiveAttribute = "tr-ng-grid-body";

    var fieldNameAttribute = "field-name";
    var isCustomizedAttribute = "is-customized";

    var cellFooterDirective = "trNgGridFooterCell";
    var cellFooterDirectiveAttribute = "tr-ng-grid-footer-cell";
    var cellFooterTemplateDirective = "trNgGridFooterCellTemplate";
    var cellFooterTemplateDirectiveAttribute = "tr-ng-grid-footer-cell-template";
    TrNgGrid.cellFooterTemplateId = cellFooterTemplateDirective + ".html";

    var globalFilterDirective = "trNgGridGlobalFilter";
    TrNgGrid.globalFilterDirectiveAttribute = "tr-ng-grid-global-filter";
    TrNgGrid.footerGlobalFilterTemplateId = globalFilterDirective + ".html";

    var pagerDirective = "trNgGridPager";
    TrNgGrid.pagerDirectiveAttribute = "tr-ng-grid-pager";
    TrNgGrid.footerPagerTemplateId = pagerDirective + ".html";

    var cellHeaderDirective = "trNgGridHeaderCell";
    var cellHeaderDirectiveAttribute = "tr-ng-grid-header-cell";
    var cellHeaderTemplateDirective = "trNgGridHeaderCellTemplate";
    var cellHeaderTemplateDirectiveAttribute = "tr-ng-grid-header-cell-template";
    TrNgGrid.cellHeaderTemplateId = cellHeaderTemplateDirective + ".html";

    var cellBodyDirective = "trNgGridBodyCell";
    var cellBodyDirectiveAttribute = "tr-ng-grid-body-cell";
    var cellBodyTemplateDirective = "trNgGridBodyCellTemplate";
    var cellBodyTemplateDirectiveAttribute = "tr-ng-grid-body-cell-template";
    TrNgGrid.cellBodyTemplateId = cellBodyTemplateDirective + ".html";

    var columnSortDirective = "trNgGridColumnSort";
    TrNgGrid.columnSortDirectiveAttribute = "tr-ng-grid-column-sort";
    TrNgGrid.columnSortTemplateId = columnSortDirective + ".html";

    var columnFilterDirective = "trNgGridColumnFilter";
    TrNgGrid.columnFilterDirectiveAttribute = "tr-ng-grid-column-filter";
    TrNgGrid.columnFilterTemplateId = columnFilterDirective + ".html";

    

    var findChildByTagName = function (parent, childTag) {
        childTag = childTag.toUpperCase();
        var children = parent.children();
        for (var childIndex = 0; childIndex < children.length; childIndex++) {
            var childElement = children[childIndex];
            if (childElement.tagName == childTag) {
                return angular.element(childElement);
            }
        }

        return null;
    };

    var findChildrenByTagName = function (parent, childTag) {
        childTag = childTag.toUpperCase();
        var retChildren = [];
        var children = parent.children();
        for (var childIndex = 0; childIndex < children.length; childIndex++) {
            var childElement = children[childIndex];
            if (childElement.tagName == childTag) {
                retChildren.push(angular.element(childElement));
            }
        }

        return retChildren;
    };

    /**
    * Combines two sets of cell infos. The first set will take precedence in the checks but the combined items will contain items from the second set if they match.
    */
    var combineGridCellInfos = function (firstSet, secondSet, addExtraFieldItemsSecondSet, addExtraNonFieldItemsSecondSet) {
        var combinedSet = [];
        var secondTempSet = secondSet.slice(0);
        angular.forEach(firstSet, function (firstSetColumn) {
            // find a correspondence in the second set
            var foundSecondSetColumn = null;
            for (var secondSetColumnIndex = 0; !foundSecondSetColumn && secondSetColumnIndex < secondTempSet.length; secondSetColumnIndex++) {
                foundSecondSetColumn = secondTempSet[secondSetColumnIndex];
                if (foundSecondSetColumn.fieldName === firstSetColumn.fieldName) {
                    secondTempSet.splice(secondSetColumnIndex, 1);
                } else {
                    foundSecondSetColumn = null;
                }
            }

            if (foundSecondSetColumn) {
                combinedSet.push(foundSecondSetColumn);
            } else {
                combinedSet.push(firstSetColumn);
            }
        });

        // add the remaining items from the second set in the combined set
        if (addExtraFieldItemsSecondSet || addExtraNonFieldItemsSecondSet) {
            angular.forEach(secondTempSet, function (secondSetColumn) {
                if ((addExtraFieldItemsSecondSet && secondSetColumn.fieldName) || (addExtraNonFieldItemsSecondSet && !secondSetColumn.fieldName)) {
                    combinedSet.push(secondSetColumn);
                }
            });
        }

        return combinedSet;
    };

    ////var wrapTemplatedCell = (templateElement: JQuery, tAttrs: Object, isCustomized: boolean, cellTemplateDirective:string) => {
    ////    if (isCustomized) {
    ////        var childrenElements = templateElement.children();
    ////        var firstChildElement = angular.element(childrenElements[0]);
    ////        if (childrenElements.length !== 1 || !firstChildElement.attr(cellTemplateDirective)) {
    ////            // wrap the children of the custom template cell
    ////            templateElement.empty();
    ////            var templateWrapElement = angular.element("<div></div>").attr(cellTemplateDirective, "");
    ////            templateElement.append(templateWrapElement);
    ////            angular.forEach(childrenElements, (childElement: JQuery) => {
    ////                templateWrapElement.append(angular.element(childElement));
    ////            });
    ////        }
    ////    }
    ////    else {
    ////        templateElement.empty();
    ////        templateElement.append(angular.element("<div></div>").attr(cellTemplateDirective, ""));
    ////    }
    ////}
    ////class TemplatedCell implements IGridColumn {
    ////    public fieldName: string;
    ////    public isStandardColumn: boolean;
    ////    constructor(public cellElement: JQuery) {
    ////        this.fieldName = cellElement.attr(fieldNameAttribute);
    ////        var customContent = cellElement.children();
    ////        this.isStandardColumn = customContent.length === 0;
    ////    }
    ////}
    ////class TemplatedSection {
    ////    public cells: Array<TemplatedCell>;
    ////    constructor(
    ////        private sectionTagName: string,
    ////        private sectionDirectiveAttribute: string,
    ////        private rowDirectiveAttribute: string,
    ////        private cellTagName:string,
    ////        private cellDirectiveAttribute:string){
    ////        this.cellTagName = this.cellTagName.toUpperCase();
    ////        this.cells = null;
    ////    }
    ////    public configureSection(gridElement: JQuery, columnDefs: Array<IGridColumnOptions>):JQuery {
    ////        var sectionElement = this.getSectionElement(gridElement, true);
    ////        sectionElement.empty();
    ////        sectionElement.removeAttr("ng-non-bindable");
    ////        // add the elements in order
    ////        var rowElementDefinitions = combineGridCellInfos(columnDefs, this.cells, false, false);
    ////        // grab the templated row
    ////        var templatedRowElement = this.getTemplatedRowElement(sectionElement, true);
    ////        angular.forEach(rowElementDefinitions, (gridCell: IGridColumn, index: number) => {
    ////            var gridCellElement: JQuery;
    ////            var templatedCell = <TemplatedCell>gridCell;
    ////            // it might not be a templated cell, beware
    ////            if (templatedCell.parent === this && templatedCell.cellElement) {
    ////                gridCellElement = templatedCell.cellElement.clone(true);
    ////            }
    ////            else {
    ////                gridCellElement = angular.element("<table><" + this.cellTagName + "></"+this.cellTagName+"></table>").find(this.cellTagName);
    ////            }
    ////            // set it up
    ////            if (this.cellDirectiveAttribute) {
    ////                gridCellElement.attr(this.cellDirectiveAttribute, index);
    ////            }
    ////            if (!gridCell.isStandardColumn) {
    ////                gridCellElement.attr(isCustomizedAttribute, "true");
    ////            }
    ////            if (gridCell.fieldName) {
    ////                gridCellElement.attr(fieldNameAttribute, gridCell.fieldName);
    ////            }
    ////            gridCellElement.attr("ng-style", "{\'width\':columnOptions.cellWidth,\'height\':columnOptions.cellHeight}");
    ////            // finally add it to the parent
    ////            templatedRowElement.append(gridCellElement);
    ////        });
    ////        return sectionElement;
    ////    }
    ////    public extractPartialColumnDefinitions(): Array<IGridColumn> {
    ////        return this.cells;
    ////    }
    ////    public discoverCells(gridElement: JQuery) {
    ////        this.cells = [];
    ////        var templatedRow = this.getTemplatedRowElement(this.getSectionElement(gridElement, false), false);
    ////        if (templatedRow) {
    ////            angular.forEach(templatedRow.children(), (childElement: JQuery, childIndex: number) => {
    ////                childElement = angular.element(childElement);
    ////                if (childElement[0].tagName === this.cellTagName.toUpperCase()) {
    ////                    var templateElement = childElement.clone(true);
    ////                    this.cells.push(new TemplatedCell(this, templateElement));
    ////                }
    ////            });
    ////        }
    ////    }
    ////    public getSectionElement(gridElement?: JQuery, ensurePresent?: boolean): JQuery {
    ////        var sectionElement: JQuery = null;
    ////        if (gridElement) {
    ////            sectionElement = findChildByTagName(gridElement, this.sectionTagName);
    ////        }
    ////        if (!sectionElement && ensurePresent) {
    ////            // angular strikes again: https://groups.google.com/forum/#!topic/angular/7poFynsguNw
    ////            sectionElement = angular.element("<table><" + this.sectionTagName + "></" + this.sectionTagName + "></table>").find(this.sectionTagName);
    ////            if (gridElement) {
    ////                gridElement.append(sectionElement);
    ////            }
    ////        }
    ////        if (ensurePresent && this.sectionDirectiveAttribute) {
    ////            sectionElement.attr(this.sectionDirectiveAttribute, "");
    ////        }
    ////        return sectionElement;
    ////    }
    ////    public getTemplatedRowElement(sectionElement?:JQuery, ensurePresent?: boolean): JQuery {
    ////        var rowElement: JQuery = null;
    ////        if (sectionElement) {
    ////            rowElement = findChildByTagName(sectionElement, "tr");
    ////        }
    ////        if (!rowElement && ensurePresent) {
    ////            rowElement = angular.element("<table><tr></tr></table>").find("tr");
    ////            if (sectionElement) {
    ////                sectionElement.append(rowElement);
    ////            }
    ////        }
    ////        if (ensurePresent && this.rowDirectiveAttribute) {
    ////            rowElement.attr(this.rowDirectiveAttribute, "");
    ////        }
    ////        return rowElement;
    ////    }
    ////}
    var GridController = (function () {
        function GridController($compile, $parse, $timeout, $templateCache) {
            this.$compile = $compile;
            this.$parse = $parse;
            this.$timeout = $timeout;
            if (!templatesConfigured) {
                configureTemplates($templateCache);
                templatesConfigured = true;
            }
        }
        GridController.prototype.setupScope = function ($isolatedScope, gridScope, $attrs) {
            var _this = this;
            // initialise the options
            this.gridOptions = {
                immediateDataRetrieval: true,
                items: [],
                fields: null,
                locale: "en",
                selectedItems: [],
                filterBy: null,
                filterByFields: {},
                orderBy: null,
                orderByReverse: false,
                pageItems: null,
                currentPage: 0,
                totalItems: null,
                enableFiltering: true,
                enableSorting: true,
                selectionMode: SelectionMode[2 /* MultiRow */],
                onDataRequiredDelay: 1000
            };
            this.gridOptions.onDataRequired = $attrs["onDataRequired"] ? $isolatedScope["onDataRequired"] : null;
            this.gridOptions.gridColumnDefs = [];

            //internalScope[scopeOptionsIdentifier] = this.gridOptions;
            //link the outer scope with the internal one
            gridScope.gridOptions = this.gridOptions;
            gridScope.TrNgGrid = TrNgGrid;
            this.linkScope(gridScope, $isolatedScope, "gridOptions", $attrs);

            // set up watchers for auto field definitions extraction
            this.columnDefsFieldsWatcherDeregistrationFct = gridScope.$watch("gridOptions.items.length", function (newItemsLength) {
                if (newItemsLength) {
                    for (var propName in _this.gridOptions.items[0]) {
                        // exclude the library properties
                        if (!propName.match(/^[_\$]/g)) {
                            _this.setupColumn(propName, false, false);
                        }
                    }
                }
            });

            //set up watchers for some of the special attributes we support
            if (this.gridOptions.onDataRequired) {
                var retrieveDataCallback = function () {
                    _this.dataRequestPromise = null;
                    _this.gridOptions.immediateDataRetrieval = false;
                    _this.gridOptions.onDataRequired(_this.gridOptions);
                };

                gridScope.$watchCollection("[gridOptions.filterBy, " + "gridOptions.filterByFields, " + "gridOptions.orderBy, " + "gridOptions.orderByReverse, " + "gridOptions.currentPage]", function () {
                    if (_this.dataRequestPromise) {
                        _this.$timeout.cancel(_this.dataRequestPromise);
                        _this.dataRequestPromise = null;
                    }

                    if (_this.gridOptions.immediateDataRetrieval) {
                        retrieveDataCallback();
                    } else {
                        _this.dataRequestPromise = _this.$timeout(function () {
                            retrieveDataCallback();
                        }, _this.gridOptions.onDataRequiredDelay, true);
                    }
                });

                gridScope.$watch("gridOptions.immediateDataRetrieval", function (newValue) {
                    if (newValue && _this.dataRequestPromise) {
                        _this.$timeout.cancel(_this.dataRequestPromise);
                        retrieveDataCallback();
                    }
                });
            }

            // the new settings
            gridScope.$watch("gridOptions.selectionMode", function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    switch (newValue) {
                        case SelectionMode[0 /* None */]:
                            _this.gridOptions.selectedItems.splice(0);
                            break;
                        case SelectionMode[1 /* SingleRow */]:
                            if (_this.gridOptions.selectedItems.length > 1) {
                                _this.gridOptions.selectedItems.splice(1);
                            }
                            break;
                    }
                }
            });

            return gridScope;
        };

        GridController.prototype.speedUpAsyncDataRetrieval = function ($event) {
            if (!$event || $event.keyCode == 13) {
                this.gridOptions.immediateDataRetrieval = true;
            }
        };

        ////setColumnOptions(columnIndex: number, columnOptions: IGridColumnOptions): void {
        ////    var originalOptions = this.gridOptions.gridColumnDefs[columnIndex];
        ////    if (!originalOptions) {
        ////        throw "Invalid grid column options found for column index " + columnIndex + ". Please report this error."
        ////    }
        ////    // copy a couple of options onto the incoming set of options
        ////    columnOptions = angular.extend(columnOptions, originalOptions);
        ////    // replace the original options
        ////    this.gridOptions.gridColumnDefs[columnIndex] = columnOptions;
        ////}
        GridController.prototype.toggleSorting = function (propertyName) {
            if (this.gridOptions.orderBy != propertyName) {
                // the column has changed
                this.gridOptions.orderBy = propertyName;
            } else {
                // the sort direction has changed
                this.gridOptions.orderByReverse = !this.gridOptions.orderByReverse;
            }

            this.speedUpAsyncDataRetrieval();
        };

        GridController.prototype.getFormattedFieldName = function (fieldName) {
            return fieldName.replace(/[\.\[\]]/g, "_");
        };

        GridController.prototype.setFilter = function (fieldName, filter) {
            if (!filter) {
                delete (this.gridOptions.filterByFields[fieldName]);
            } else {
                this.gridOptions.filterByFields[fieldName] = filter;
            }

            // in order for someone to successfully listen to changes made to this object, we need to replace it
            this.gridOptions.filterByFields = angular.extend({}, this.gridOptions.filterByFields);
        };

        GridController.prototype.setupColumn = function (gridColumn, gridOptions) {
            if (!this.gridOptions.gridColumnDefs) {
                this.gridOptions.gridColumnDefs = [];
            }

            // deregister any watcher set on the object items for the purpose of finding fields
            if (this.columnDefsFieldsWatcherDeregistrationFct) {
                this.columnDefsFieldsWatcherDeregistrationFct();
                this.columnDefsFieldsWatcherDeregistrationFct = null;
            }

            // find the column definition first
            var columnDefOptions;
            var columnDefIndex;
            for (columnDefIndex = 0; columnDefIndex < this.gridOptions.gridColumnDefs.length && this.gridOptions.gridColumnDefs[columnDefIndex].fieldName !== fieldName; columnDefIndex++)
                ;
            if (columnDefIndex >= this.gridOptions.gridColumnDefs.length) {
                // it's new, add it
                columnDefOptions = {
                    isAllowed: true,
                    fieldName: fieldName,
                    isCustomized: isCustomized,
                    isTemplated: isTemplated,
                    displayFieldName: fieldName ? this.getFormattedFieldName(fieldName) : null
                };
                this.gridOptions.gridColumnDefs.push(columnDefOptions);
            }

            if (isolatedFieldScope) {
                angular.extend(columnDefOptions, isolatedFieldScope);
            }
        };

        GridController.prototype.findColumnOptionsByFieldName = function (fieldName) {
            if (!this.gridOptions.gridColumnDefs) {
                // not yet known
                return null;
            }

            var columnDefIndex;
            for (columnDefIndex = 0; columnDefIndex < this.gridOptions.gridColumnDefs.length && this.gridOptions.gridColumnDefs[columnDefIndex].fieldName !== fieldName; columnDefIndex++)
                ;
            if (columnDefIndex < this.gridOptions.gridColumnDefs.length) {
                return this.gridOptions.gridColumnDefs[columnDefIndex];
            }

            return null;
        };

        GridController.prototype.toggleItemSelection = function (filteredItems, item, $event) {
            if (this.gridOptions.selectionMode === SelectionMode[0 /* None */])
                return;

            switch (this.gridOptions.selectionMode) {
                case SelectionMode[3 /* MultiRowWithKeyModifiers */]:
                    if (!$event.ctrlKey && !$event.shiftKey && !$event.metaKey) {
                        // if neither key modifiers are pressed, clear the selection and start fresh
                        var itemIndex = this.gridOptions.selectedItems.indexOf(item);
                        this.gridOptions.selectedItems.splice(0);
                        if (itemIndex < 0) {
                            this.gridOptions.selectedItems.push(item);
                        }
                    } else {
                        if ($event.ctrlKey || $event.metaKey) {
                            // the ctrl key deselects or selects the item
                            var itemIndex = this.gridOptions.selectedItems.indexOf(item);
                            if (itemIndex >= 0) {
                                this.gridOptions.selectedItems.splice(itemIndex, 1);
                            } else {
                                this.gridOptions.selectedItems.push(item);
                            }
                        } else if ($event.shiftKey) {
                            // clear undesired selections, if the styles are not applied
                            if (document.selection && document.selection.empty) {
                                document.selection.empty();
                            } else if (window.getSelection) {
                                var sel = window.getSelection();
                                sel.removeAllRanges();
                            }

                            // the shift key will always select items from the last selected item
                            var firstItemIndex;
                            var lastSelectedItem = this.gridOptions.selectedItems[this.gridOptions.selectedItems.length - 1];
                            for (firstItemIndex = 0; firstItemIndex < filteredItems.length && filteredItems[firstItemIndex].$$_gridItem !== lastSelectedItem; firstItemIndex++)
                                ;
                            if (firstItemIndex >= filteredItems.length) {
                                firstItemIndex = 0;
                            }

                            var lastItemIndex;
                            for (lastItemIndex = 0; lastItemIndex < filteredItems.length && filteredItems[lastItemIndex].$$_gridItem !== item; lastItemIndex++)
                                ;
                            if (lastItemIndex >= filteredItems.length) {
                                throw "Invalid selection on a key modifier selection mode";
                            }
                            if (lastItemIndex < firstItemIndex) {
                                var tempIndex = firstItemIndex;
                                firstItemIndex = lastItemIndex;
                                lastItemIndex = tempIndex;
                            }

                            for (var currentItemIndex = firstItemIndex; currentItemIndex <= lastItemIndex; currentItemIndex++) {
                                var currentItem = filteredItems[currentItemIndex].$$_gridItem;
                                if (this.gridOptions.selectedItems.indexOf(currentItem) < 0) {
                                    this.gridOptions.selectedItems.push(currentItem);
                                }
                            }
                        }
                    }
                    break;
                case SelectionMode[1 /* SingleRow */]:
                    var itemIndex = this.gridOptions.selectedItems.indexOf(item);
                    this.gridOptions.selectedItems.splice(0);
                    if (itemIndex < 0) {
                        this.gridOptions.selectedItems.push(item);
                    }
                    break;
                case SelectionMode[2 /* MultiRow */]:
                    var itemIndex = this.gridOptions.selectedItems.indexOf(item);
                    if (itemIndex >= 0) {
                        this.gridOptions.selectedItems.splice(itemIndex, 1);
                    } else {
                        this.gridOptions.selectedItems.push(item);
                    }
                    break;
            }
        };

        ////discoverTemplates(gridElement: JQuery) {
        ////    this.templatedHeader = new TemplatedSection("thead", null, null, "th", cellHeaderDirectiveAttribute);
        ////    this.templatedBody = new TemplatedSection("tbody", bodyDirectiveAttribute, null, "td", cellBodyDirectiveAttribute);
        ////    this.templatedFooter = new TemplatedSection("tfoot", null, null, "td", cellFooterDirectiveAttribute);
        ////    this.templatedHeader.discoverCells(gridElement);
        ////    this.templatedFooter.discoverCells(gridElement);
        ////    this.templatedBody.discoverCells(gridElement);
        ////}
        ////configureTableStructure(parentScope: ng.IScope, gridElement: ng.IAugmentedJQuery, oldScope?:ng.IScope) {
        ////    var scope = parentScope.$new();
        ////    gridElement.empty();
        ////    // make sure we're no longer watching for column defs
        ////    if (this.columnDefsItemsWatcherDeregistration) {
        ////        this.columnDefsItemsWatcherDeregistration();
        ////        this.columnDefsItemsWatcherDeregistration = null;
        ////    }
        ////    if (this.columnDefsFieldsWatcherDeregistration) {
        ////        this.columnDefsFieldsWatcherDeregistration();
        ////        this.columnDefsFieldsWatcherDeregistration = null;
        ////    }
        ////    // watch for a change in field values
        ////    // don't be tempted to use watchcollection, it always returns same values which can't be compared
        ////    // https://github.com/angular/angular.js/issues/2621
        ////    // which causes us the recompile even if we don't have to
        ////    this.columnDefsFieldsWatcherDeregistration = scope.$watch("gridOptions.fields", (newValue: Array<any>, oldValue: Array<any>) => {
        ////        if (!angular.equals(newValue, oldValue)) {
        ////            this.configureTableStructure(parentScope, gridElement, scope);
        ////        }
        ////    }, true);
        ////    // prepare a partial list of column definitions
        ////    var templatedHeaderPartialGridColumnDefs = this.templatedHeader.extractPartialColumnDefinitions();
        ////    var templatedBodyPartialGridColumnDefs = this.templatedBody.extractPartialColumnDefinitions();
        ////    var templatedFooterPartialGridColumnDefs = this.templatedFooter.extractPartialColumnDefinitions();
        ////    var finalPartialGridColumnDefs: Array<IGridColumnOptions> = [];
        ////    var fieldsEnforced = this.gridOptions.fields;
        ////    if (fieldsEnforced) {
        ////        // the fields bound to the options will take precedence
        ////        angular.forEach(this.gridOptions.fields, (fieldName: string) => {
        ////            if (fieldName) {
        ////                finalPartialGridColumnDefs.push({
        ////                    isStandardColumn: true,
        ////                    fieldName: fieldName
        ////                });
        ////            }
        ////        });
        ////        finalPartialGridColumnDefs = combineGridCellInfos(finalPartialGridColumnDefs, templatedHeaderPartialGridColumnDefs, false, true);
        ////        finalPartialGridColumnDefs = combineGridCellInfos(finalPartialGridColumnDefs, templatedBodyPartialGridColumnDefs, false, true);
        ////    }
        ////    else {
        ////        // check for the header markup
        ////        if (templatedHeaderPartialGridColumnDefs.length > 0) {
        ////            // header and body will be used for fishing out the field names
        ////            finalPartialGridColumnDefs = combineGridCellInfos(templatedHeaderPartialGridColumnDefs, templatedBodyPartialGridColumnDefs, true, true);
        ////        }
        ////        else {
        ////            // the object itself will provide the field names
        ////            if (!this.gridOptions.items || this.gridOptions.items.length == 0) {
        ////                // register our interest for when we do have something to look at
        ////                this.columnDefsItemsWatcherDeregistration = scope.$watch("gridOptions.items.length", (newValue: number, oldValue: number) => {
        ////                    if (newValue) {
        ////                        this.configureTableStructure(parentScope, gridElement, scope);
        ////                    }
        ////                });
        ////                return;
        ////            }
        ////            // extract the field names
        ////            for (var propName in this.gridOptions.items[0]) {
        ////                // exclude the library properties
        ////                if (!propName.match(/^[_\$]/g)) {
        ////                    finalPartialGridColumnDefs.push({
        ////                        isStandardColumn: true,
        ////                        fieldName: propName
        ////                    });
        ////                }
        ////            }
        ////            // combine with the body template
        ////            finalPartialGridColumnDefs = combineGridCellInfos(finalPartialGridColumnDefs, templatedBodyPartialGridColumnDefs, true, true);
        ////        }
        ////    }
        ////    // it's time to make final tweaks to the instances and recompile
        ////    if (templatedFooterPartialGridColumnDefs.length == 0) {
        ////        templatedFooterPartialGridColumnDefs.push({ isStandardColumn: true });
        ////    }
        ////    // compute the formatted field names
        ////    angular.forEach(finalPartialGridColumnDefs, (columnDefs: IGridColumnOptions) => {
        ////        if (columnDefs.fieldName) {
        ////            columnDefs.displayFieldName = this.getFormattedFieldName(columnDefs.fieldName);
        ////        }
        ////    });
        ////    this.gridOptions.gridColumnDefs = finalPartialGridColumnDefs;
        ////    var headerElement = this.templatedHeader.configureSection(gridElement, finalPartialGridColumnDefs);
        ////    var footerElement = this.templatedFooter.configureSection(gridElement, templatedFooterPartialGridColumnDefs);
        ////    var bodyElement = this.templatedBody.configureSection(gridElement, finalPartialGridColumnDefs);
        ////    var templatedBodyRowElement = this.templatedBody.getTemplatedRowElement(bodyElement);
        ////    var templatedHeaderRowElement = this.templatedHeader.getTemplatedRowElement(headerElement);
        ////    bodyElement.attr(bodyDirectiveAttribute, "");
        ////    templatedBodyRowElement.attr("ng-click", "toggleItemSelection(gridItem, $event)");
        ////    // when server-side get is active (scope.gridOptions.onDataRequired), the filtering through the standard filters should be disabled
        ////    /*if (this.gridOptions.onDataRequired) {
        ////        templatedBodyRowElement.attr("ng-repeat", "gridItem in gridOptions.items");
        ////    }
        ////    else {
        ////        templatedBodyRowElement.attr("ng-repeat", "gridItem in gridOptions.items | filter:gridOptions.filterBy | filter:gridOptions.filterByFields | orderBy:gridOptions.orderBy:gridOptions.orderByReverse | " + dataPagingFilter + ":gridOptions");
        ////    }*/
        ////    templatedBodyRowElement.attr("ng-repeat", "gridDisplayItem in filteredItems");
        ////    templatedBodyRowElement.attr("ng-init", "gridItem=gridDisplayItem.$$_gridItem");
        ////    templatedBodyRowElement.attr("ng-class", "{'" + TrNgGrid.rowSelectedCssClass + "':gridOptions.selectedItems.indexOf(gridItem)>=0}");
        ////    headerElement.replaceWith(this.$compile(headerElement)(scope));
        ////    footerElement.replaceWith(this.$compile(footerElement)(scope));
        ////    bodyElement.replaceWith(this.$compile(bodyElement)(scope));
        ////    if (oldScope) {
        ////        // an Angular bug is preventing us to destroy a scope inside the digest cycle
        ////        this.$timeout(()=> oldScope.$destroy());
        ////    }
        ////}
        GridController.prototype.computeFormattedItems = function (scope) {
            var input = scope.gridOptions.items || [];
            TrNgGrid.debugMode && log("formatting items of length " + input.length);
            var formattedItems = scope.formattedItems = (scope.formattedItems || []);
            if (scope.gridOptions.onDataRequired) {
                scope.filteredItems = formattedItems;
            } else {
                scope.requiresReFilteringTrigger = !scope.requiresReFilteringTrigger;
            }
            var gridColumnDefs = this.gridOptions.gridColumnDefs;
            for (var inputIndex = 0; inputIndex < input.length; inputIndex++) {
                var inputItem = input[inputIndex];
                var outputItem;

                while (formattedItems.length > input.length && (outputItem = formattedItems[inputIndex]).$$_gridItem !== inputItem) {
                    formattedItems.splice(inputIndex, 1);
                }

                if (inputIndex < formattedItems.length) {
                    outputItem = formattedItems[inputIndex];
                    if (outputItem.$$_gridItem !== inputItem) {
                        outputItem = { $$_gridItem: inputItem };
                        formattedItems[inputIndex] = outputItem;
                    }
                } else {
                    outputItem = { $$_gridItem: inputItem };
                    formattedItems.push(outputItem);
                }
                for (var gridColumnDefIndex = 0; gridColumnDefIndex < gridColumnDefs.length; gridColumnDefIndex++) {
                    try  {
                        var gridColumnDef = gridColumnDefs[gridColumnDefIndex];
                        var fieldName = gridColumnDef.fieldName;
                        if (fieldName) {
                            var displayFormat = gridColumnDef.displayFormat;
                            if (displayFormat) {
                                if (displayFormat[0] != "." && displayFormat[0] != "|") {
                                    // angular filter
                                    displayFormat = " | " + displayFormat;
                                }

                                // apply the format
                                outputItem[gridColumnDef.displayFieldName] = scope.$eval("gridOptions.items[" + inputIndex + "]." + fieldName + displayFormat);
                            } else {
                                outputItem[gridColumnDef.displayFieldName] = eval("inputItem." + fieldName);
                            }
                        }
                    } catch (ex) {
                        TrNgGrid.debugMode && log("Field evaluation failed for <" + fieldName + "> with error " + ex);
                    }
                }
            }

            // remove any extra elements from the formatted list
            if (formattedItems.length > input.length) {
                formattedItems.splice(input.length, formattedItems.length - input.length);
            }
        };

        GridController.prototype.computeFilteredItems = function (scope) {
            scope.filterByDisplayFields = {};
            if (scope.gridOptions.filterByFields) {
                for (var fieldName in scope.gridOptions.filterByFields) {
                    scope.filterByDisplayFields[this.getFormattedFieldName(fieldName)] = scope.gridOptions.filterByFields[fieldName];
                }
            }
            TrNgGrid.debugMode && log("filtering items of length " + (scope.formattedItems ? scope.formattedItems.length : 0));
            scope.filteredItems = scope.$eval("formattedItems | filter:gridOptions.filterBy | filter:filterByDisplayFields | orderBy:'$$_gridItem.'+gridOptions.orderBy:gridOptions.orderByReverse | " + TrNgGrid.dataPagingFilter + ":gridOptions");
        };

        GridController.prototype.setupDisplayItemsArray = function (scope) {
            var _this = this;
            var watchExpression = "[gridOptions.items,gridOptions.gridColumnDefs.length";
            angular.forEach(this.gridOptions.gridColumnDefs, function (gridColumnDef) {
                if (gridColumnDef.displayFormat && gridColumnDef.displayFormat[0] != '.') {
                    // watch the parameters
                    var displayfilters = gridColumnDef.displayFormat.split('|');
                    angular.forEach(displayfilters, function (displayFilter) {
                        var displayFilterParams = displayFilter.split(':');
                        if (displayFilterParams.length > 1) {
                            angular.forEach(displayFilterParams.slice(1), function (displayFilterParam) {
                                displayFilterParam = displayFilterParam.trim();
                                if (displayFilterParam) {
                                    watchExpression += "," + displayFilterParam;
                                }
                            });
                        }
                    });
                }
            });

            watchExpression += "]";
            TrNgGrid.debugMode && log("re-formatting is set to watch for changes in " + watchExpression);
            scope.$watch(watchExpression, function () {
                return _this.computeFormattedItems(scope);
            }, true);

            if (!scope.gridOptions.onDataRequired) {
                watchExpression = "[" + "requiresReFilteringTrigger, gridOptions.filterBy, gridOptions.filterByFields, gridOptions.orderBy, gridOptions.orderByReverse, gridOptions.currentPage" + "]";
                scope.$watch(watchExpression, function (newValue, oldValue) {
                    _this.computeFilteredItems(scope);
                }, true);
            }
        };

        GridController.prototype.linkAttrs = function (tAttrs, localStorage) {
            var propSetter = function (propName, propValue) {
                if (typeof (propValue) === "undefined")
                    return;

                switch (propValue) {
                    case "true":
                        propValue = true;
                        break;
                    case "false":
                        propValue = false;
                        break;
                }
                localStorage[propName] = propValue;
            };

            for (var propName in localStorage) {
                propSetter(propName, tAttrs[propName]);

                // watch for changes
                (function (propName) {
                    tAttrs.$observe(propName, function (value) {
                        return propSetter(propName, value);
                    });
                })(propName);
            }
        };

        GridController.prototype.linkScope = function (internalScope, externalScope, scopeTargetIdentifier, attrs) {
            // this method shouldn't even be here
            // but it is because we want to allow people to either set attributes with either a constant or a watchable variable
            // watch for a resolution to issue #5951 on angular
            // https://github.com/angular/angular.js/issues/5951
            var target = internalScope[scopeTargetIdentifier];

            for (var propName in target) {
                var attributeExists = typeof (attrs[propName]) != "undefined" && attrs[propName] != null;

                if (attributeExists) {
                    var isArray = false;

                    // initialise from the scope first
                    if (typeof (externalScope[propName]) != "undefined" && externalScope[propName] != null) {
                        target[propName] = externalScope[propName];
                        isArray = target[propName] instanceof Array;
                    }

                    //allow arrays to be changed: if(!isArray){
                    var compiledAttrGetter = null;
                    try  {
                        compiledAttrGetter = this.$parse(attrs[propName]);
                    } catch (ex) {
                        // angular fails to parse literal bindings '@', thanks angular team
                    }
                    (function (propName, compiledAttrGetter) {
                        if (!compiledAttrGetter || !compiledAttrGetter.constant) {
                            // watch for a change in value and set it on our internal scope
                            externalScope.$watch(propName, function (newValue, oldValue) {
                                // debugMode && this.log("Property '" + propName + "' changed on the external scope from " + oldValue + " to " + newValue + ". Mirroring the parameter's value on the grid's internal scope.");
                                target[propName] = newValue;
                            });
                        }

                        var compiledAttrSetter = (compiledAttrGetter && compiledAttrGetter.assign) ? compiledAttrGetter.assign : null;
                        if (compiledAttrSetter) {
                            // a setter exists for the property, which means it's safe to mirror the internal prop on the external scope
                            internalScope.$watch(scopeTargetIdentifier + "." + propName, function (newValue, oldValue) {
                                try  {
                                    // debugMode && this.log("Property '" + propName + "' changed on the internal scope from " + oldValue + " to " + newValue + ". Mirroring the parameter's value on the external scope.");
                                    externalScope[propName] = newValue;
                                    // Update: Don't do this, as you'll never hit the real scope the property was defined on
                                    // compiledAttrSetter(externalScope, newValue);
                                } catch (ex) {
                                    if (TrNgGrid.debugMode) {
                                        log("Mirroring the property on the external scope failed with " + ex);
                                        throw ex;
                                    }
                                }
                            });
                        }
                    })(propName, compiledAttrGetter);
                }
            }
        };
        return GridController;
    })();

    var log = function (message) {
        console.log(tableDirective + "(" + new Date().getTime() + "): " + message);
    };

    var fixTableStructure = function (gridElement, allowDataBindings) {
        gridElement.addClass(TrNgGrid.tableCssClass);

        // make sure the header is present
        var tableHeaderElement = findChildByTagName(gridElement, "thead");
        if (!tableHeaderElement) {
            tableHeaderElement = findChildByTagName(angular.element("<table><thead></thead></table"), "thead");
            gridElement.prepend(tableHeaderElement);
        }
        tableHeaderElement.attr(headerDirectiveAttribute, "");

        // the footer follows immediately after the header
        var tableFooterElement = findChildByTagName(gridElement, "tfoot");
        if (!tableFooterElement) {
            tableFooterElement = findChildByTagName(angular.element("<table><tfoot></tfoot></table"), "tfoot");
            tableHeaderElement.after(tableFooterElement);
        }
        tableFooterElement.attr(footerDirectiveAttribute, "");

        // the body is the last
        var tableBodyElement = findChildByTagName(gridElement, "tbody");
        if (!tableBodyElement) {
            tableBodyElement = findChildByTagName(angular.element("<table><tbody></tbody></table"), "tbody");
            tableFooterElement.after(tableBodyElement);
        }
        tableBodyElement.attr(bodyDirectiveAttribute, "");

        // any other elements are not allowed
        angular.forEach(gridElement.children, function (element) {
            if (element !== tableHeaderElement[0] || element !== tableBodyElement[0] || element !== tableFooterElement[0]) {
                angular.element(element).remove();
                TrNgGrid.debugMode && log("Invalid extra element found inside the grid template structure: " + element.tagName);
            }
        });

        // block or allow data bindings
        if (allowDataBindings) {
            tableHeaderElement.removeAttr("data-ng-non-bindable");
            tableFooterElement.removeAttr("data-ng-non-bindable");
            tableBodyElement.removeAttr("data-ng-non-bindable");
        } else {
            tableHeaderElement.attr("data-ng-non-bindable", "");
            tableFooterElement.attr("data-ng-non-bindable", "");
            tableBodyElement.attr("data-ng-non-bindable", "");
        }
    };

    angular.module("trNgGrid", []).directive(tableDirective, [
        "$compile",
        function ($compile) {
            return {
                restrict: 'A',
                scope: {
                    items: '=',
                    selectedItems: '=?',
                    filterBy: '=?',
                    filterByFields: '=?',
                    orderBy: '=?',
                    orderByReverse: '=?',
                    pageItems: '=?',
                    currentPage: '=?',
                    totalItems: '=?',
                    enableFiltering: '=?',
                    enableSorting: '=?',
                    selectionMode: '@',
                    locale: '@',
                    onDataRequired: '&',
                    onDataRequiredDelay: '=?',
                    fields: '=?'
                },
                template: function (templateElement, tAttrs) {
                    //templateElement.addClass(tableCssClass);
                    ////// at this stage, no elements can be bound
                    ////angular.forEach(templateElement.children(), (childElement: JQuery) => {
                    ////    childElement = angular.element(childElement);
                    ////    childElement.attr("ng-non-bindable", "");
                    ////});
                },
                controller: ["$compile", "$parse", "$timeout", "$templateCache", GridController],
                compile: function (templateElement, tAttrs) {
                    // fix a couple of attributes in order to remain in control
                    // block data bindings as well at this stage
                    fixTableStructure(angular.element(templateElement), false);

                    return function (isolatedScope, instanceElement, tAttrs, controller, transcludeFn) {
                        // we want to grab the settings, but we don't want to live in an isolated scope from this point onwards
                        // the original table template may contain a combination of both grid settings, outer bindings and templates which are linked to inner functionality
                        // a transcluded scope wouldn't work either, since that will put us straight outside
                        // hence we need to escape from the isolated scope or transclusions, and create a child scope of our own
                        // create our own child scope
                        var gridScope = isolatedScope.$parent.$new();

                        // grab all the settings and dual link them
                        controller.setupScope(isolatedScope, gridScope, tAttrs);
                        gridScope.speedUpAsyncDataRetrieval = function ($event) {
                            return controller.speedUpAsyncDataRetrieval($event);
                        };

                        //controller.configureTableStructure(gridScope, instanceElement);
                        controller.setupDisplayItemsArray(gridScope);

                        // fix the grid again but this time allow the data bindings
                        fixTableStructure(instanceElement, true);

                        // recompile the table elements (THEAD, TFOOT, TBODY)
                        angular.forEach(instanceElement.children(), function (gridElement) {
                            var angularGridElement = angular.element(gridElement);
                            var angularCompiledGridElement = $compile(angular.element(gridElement))(gridScope);
                            angularGridElement.replaceWith(angularCompiledGridElement);
                        });
                    };
                }
            };
        }]).directive(headerDirective, [
        function () {
            return {
                restrict: 'A',
                require: '^' + tableDirective,
                template: '<thead>' + '  <tr>' + '    <th ng-repeat="columnOptions in gridOptions.gridColumnDefs" ' + cellHeaderDirectiveAttribute + ' = "">' + '      <div ' + cellHeaderTemplateDirectiveAttribute + ' = ""></div>' + '    </th>' + '  </tr> ' + '</thead> '
            };
        }
    ]).directive(cellHeaderDirective, [
        "$compile",
        function ($compile) {
            return {
                restrict: 'A',
                scope: {
                    displayName: '&',
                    displayAlign: '&',
                    displayFormat: '&',
                    enableSorting: '&',
                    enableFiltering: '&',
                    cellWidth: '&',
                    cellHeight: '&',
                    filter: '&'
                },
                require: '^' + tableDirective,
                transclude: true,
                link: function (isolatedScope, instanceElement, tAttrs, controller, transcludeFn) {
                    transcludeFn(isolatedScope.$parent, function (clonedElement, gridColumnScope) {
                        instanceElement.append(clonedElement);
                    });
                }
            };
        }
    ]).directive(cellHeaderTemplateDirective, [
        function () {
            var setupColumnTitle = function (scope) {
                if (scope.columnOptions.displayName) {
                    scope.columnTitle = scope.columnOptions.displayName;
                } else {
                    if (!scope.columnOptions.fieldName) {
                        scope.columnTitle = "[Invalid Field Name]";
                    } else {
                        // exclude nested notations
                        var splitFieldName = scope.columnOptions.fieldName.match(/^[^\.\[\]]*/);

                        // split by camel-casing
                        splitFieldName = splitFieldName[0].split(/(?=[A-Z])/);
                        if (splitFieldName.length && splitFieldName[0].length) {
                            splitFieldName[0] = splitFieldName[0][0].toLocaleUpperCase() + splitFieldName[0].substr(1);
                        }
                        scope.columnTitle = splitFieldName.join(" ");
                    }
                }
            };

            return {
                restrict: 'A',
                require: '^' + tableDirective,
                templateUrl: TrNgGrid.cellHeaderTemplateId,
                replace: true,
                scope: true,
                //replace: true,
                link: function (gridColumnScope, instanceElement, tAttrs, controller, transcludeFn) {
                    gridColumnScope.toggleSorting = function (propertyName) {
                        controller.toggleSorting(propertyName);
                    };

                    // set up the column title
                    setupColumnTitle(gridColumnScope);

                    // watch for changes in the column filter
                    gridColumnScope.$watch("columnOptions.filter", function (newValue, oldValue) {
                        if (newValue !== oldValue) {
                            controller.setFilter(gridColumnScope.columnOptions.fieldName, newValue);
                        }
                    });
                }
            };
        }
    ]).directive(columnSortDirective, [
        function () {
            return {
                restrict: 'A',
                require: '^' + tableDirective,
                replace: true,
                templateUrl: TrNgGrid.columnSortTemplateId
            };
        }
    ]).directive(columnFilterDirective, [
        function () {
            return {
                restrict: 'A',
                require: '^' + tableDirective,
                replace: true,
                templateUrl: TrNgGrid.columnFilterTemplateId
            };
        }
    ]).directive(bodyDirective, [
        function () {
            return {
                restrict: 'A',
                require: '^' + tableDirective,
                template: '<tbody>' + '  <tr ng-repeat="gridDisplayItem in filteredItems" ng-init="gridItem=gridDisplayItem.$$_gridItem" ng-click="toggleItemSelection(gridItem, $event)" ng-class="{\'' + TrNgGrid.rowSelectedCssClass + '\':gridOptions.selectedItems.indexOf(gridItem)>=0}">' + '    <td ng-repeat="columnOptions in gridOptions.gridColumnDefs" ' + cellBodyDirectiveAttribute + ' = "">' + '      <div ' + cellBodyTemplateDirectiveAttribute + ' = ""></div>' + '    </td>' + '  </tr> ' + '</thead> ',
                link: function (gridBodyScope, instanceElement, tAttrs, controller, transcludeFn) {
                    gridBodyScope.toggleItemSelection = function (item, $event) {
                        controller.toggleItemSelection(gridBodyScope.filteredItems, item, $event);
                    };
                }
            };
        }
    ]).directive(cellBodyTemplateDirective, [
        function () {
            return {
                restrict: 'A',
                require: '^' + tableDirective,
                templateUrl: TrNgGrid.cellBodyTemplateId,
                replace: true,
                scope: true,
                link: function (gridBodyCellScope, instanceElement, tAttrs, controller, transcludeFn) {
                }
            };
        }
    ]).directive(footerDirective, [
        function () {
            return {
                restrict: 'A',
                require: '^' + tableDirective,
                template: '<tfoot>' + '  <tr>' + '    <td ' + cellFooterDirectiveAttribute + ' = "" ng-attr-colspan="{{gridOptions.gridColumnDefs.length}}">' + '    </td>' + '  </tr> ' + '</tfoot> ',
                scope: true,
                link: function (gridFooterScope, instanceElement, tAttrs, controller, transcludeFn) {
                }
            };
        }
    ]).directive(cellFooterDirective, [
        function () {
            return {
                restrict: 'A',
                require: '^' + tableDirective,
                template: '<div ' + cellFooterTemplateDirectiveAttribute + ' = ""></div>'
            };
        }
    ]).directive(cellFooterTemplateDirective, [
        function () {
            return {
                restrict: 'A',
                require: '^' + tableDirective,
                templateUrl: TrNgGrid.cellFooterTemplateId,
                transclude: true,
                replace: true
            };
        }
    ]).directive(globalFilterDirective, [
        function () {
            return {
                restrict: 'A',
                scope: false,
                templateUrl: TrNgGrid.footerGlobalFilterTemplateId
            };
        }
    ]).directive(pagerDirective, [
        function () {
            var setupScope = function (scope, controller) {
                // do not set scope.gridOptions.totalItems, it might be set from the outside
                scope.totalItemsCount = (typeof (scope.gridOptions.totalItems) != "undefined" && scope.gridOptions.totalItems != null) ? scope.gridOptions.totalItems : (scope.gridOptions.items ? scope.gridOptions.items.length : 0);

                scope.isPaged = (!!scope.gridOptions.pageItems) && (scope.gridOptions.pageItems < scope.totalItemsCount);
                scope.extendedControlsActive = false;

                scope.startItemIndex = scope.isPaged ? (scope.gridOptions.pageItems * scope.gridOptions.currentPage) : 0;
                scope.endItemIndex = scope.isPaged ? (scope.startItemIndex + scope.gridOptions.pageItems - 1) : scope.totalItemsCount - 1;
                if (scope.endItemIndex >= scope.totalItemsCount) {
                    scope.endItemIndex = scope.totalItemsCount - 1;
                }
                if (scope.endItemIndex < scope.startItemIndex) {
                    scope.endItemIndex = scope.startItemIndex;
                }
                scope.lastPageIndex = (!scope.totalItemsCount || !scope.isPaged) ? 0 : (Math.floor(scope.totalItemsCount / scope.gridOptions.pageItems) + ((scope.totalItemsCount % scope.gridOptions.pageItems) ? 0 : -1));

                scope.pageCanGoBack = scope.isPaged && scope.gridOptions.currentPage > 0;
                scope.pageCanGoForward = scope.isPaged && scope.gridOptions.currentPage < scope.lastPageIndex;

                scope.pageIndexes = scope.pageIndexes || [];
                scope.pageIndexes.splice(0);
                if (scope.isPaged) {
                    if (scope.lastPageIndex + 1 > TrNgGrid.defaultPagerMinifiedPageCountThreshold) {
                        scope.extendedControlsActive = true;

                        var pageIndexHalfRange = Math.floor(TrNgGrid.defaultPagerMinifiedPageCountThreshold / 2);
                        var lowPageIndex = scope.gridOptions.currentPage - pageIndexHalfRange;
                        var highPageIndex = scope.gridOptions.currentPage + pageIndexHalfRange;

                        // compute the high and low
                        if (lowPageIndex < 0) {
                            highPageIndex += -lowPageIndex;
                            lowPageIndex = 0;
                        } else if (highPageIndex > scope.lastPageIndex) {
                            lowPageIndex -= highPageIndex - scope.lastPageIndex;
                            highPageIndex = scope.lastPageIndex;
                        }

                        // add the extra controls where needed
                        if (lowPageIndex > 0) {
                            scope.pageIndexes.push(null);
                            lowPageIndex++;
                        }
                        var highPageEllipsed = false;
                        if (highPageIndex < scope.lastPageIndex) {
                            highPageEllipsed = true;
                            highPageIndex--;
                        }

                        for (var pageIndex = lowPageIndex; pageIndex <= highPageIndex; pageIndex++) {
                            scope.pageIndexes.push(pageIndex);
                        }

                        if (highPageEllipsed) {
                            scope.pageIndexes.push(null);
                        }
                    } else {
                        scope.extendedControlsActive = false;

                        for (var pageIndex = 0; pageIndex <= scope.lastPageIndex; pageIndex++) {
                            scope.pageIndexes.push(pageIndex);
                        }
                    }
                }
                scope.pageSelectionActive = scope.pageIndexes.length > 1;

                scope.navigateToPage = function (pageIndex) {
                    scope.gridOptions.currentPage = pageIndex;
                    scope.speedUpAsyncDataRetrieval();
                    /*$event.preventDefault();
                    $event.stopPropagation();*/
                };

                scope.switchPageSelection = function ($event, pageSelectionActive) {
                    scope.pageSelectionActive = pageSelectionActive;
                    if ($event) {
                        $event.preventDefault();
                        $event.stopPropagation();
                    }
                };
            };

            //ng - model = "gridOptions.currentPage"
            return {
                restrict: 'A',
                scope: true,
                require: '^' + tableDirective,
                templateUrl: TrNgGrid.footerPagerTemplateId,
                replace: true,
                compile: function (templateElement, tAttrs) {
                    return {
                        pre: function (scope, compiledInstanceElement, tAttrs, controller) {
                            setupScope(scope, controller);
                        },
                        post: function (scope, instanceElement, tAttrs, controller) {
                            scope.$watchCollection("[gridOptions.currentPage, gridOptions.items.length, gridOptions.totalItems, gridOptions.pageItems]", function (newValues, oldValues) {
                                setupScope(scope, controller);
                            });
                        }
                    };
                }
            };
        }
    ]).filter(TrNgGrid.dataPagingFilter, function () {
        // when server-side logic is enabled, this directive should not be used!
        return function (input, gridOptions) {
            //currentPage?:number, pageItems?:number
            if (input)
                gridOptions.totalItems = input.length;

            if (!gridOptions.pageItems || !input || input.length == 0)
                return input;

            if (!gridOptions.currentPage) {
                gridOptions.currentPage = 0;
            }

            var startIndex = gridOptions.currentPage * gridOptions.pageItems;
            if (startIndex >= input.length) {
                gridOptions.currentPage = 0;
                startIndex = 0;
            }
            var endIndex = gridOptions.currentPage * gridOptions.pageItems + gridOptions.pageItems;

            return input.slice(startIndex, endIndex);
        };
    }).filter(TrNgGrid.translateFilter, [
        "$filter", function ($filter) {
            return function (input, languageId) {
                var translatedText;

                // dates require special attention
                if (input instanceof Date) {
                    // we're dealing with a date object, see if we have a localized format for it
                    var dateFormat = $filter(TrNgGrid.translateFilter)(TrNgGrid.translationDateFormat, languageId);
                    if (dateFormat && dateFormat !== TrNgGrid.translationDateFormat) {
                        // call the date filter
                        translatedText = $filter("date")(input, dateFormat);
                        return translatedText;
                    }
                    return input;
                }

                if (!translatedText) {
                    var languageIdParts = languageId.split(/[-_]/);
                    for (var languageIdPartIndex = languageIdParts.length; (languageIdPartIndex > 0) && (!translatedText); languageIdPartIndex--) {
                        var subLanguageId = languageIdParts.slice(0, languageIdPartIndex).join("-");
                        var langTranslations = TrNgGrid.translations[subLanguageId];
                        if (langTranslations) {
                            translatedText = langTranslations[input];
                        }
                    }
                }

                if (!translatedText) {
                    try  {
                        var externalTranslationFilter = $filter("translate");
                        if (externalTranslationFilter) {
                            translatedText = externalTranslationFilter(input);
                        }
                    } catch (ex) {
                    }
                }

                if (!translatedText) {
                    translatedText = input;
                }

                return translatedText;
            };
        }]).run(function () {
        TrNgGrid.tableCssClass = "tr-ng-grid table table-bordered table-hover"; // at the time of coding, table-striped is not working properly with selection
        TrNgGrid.cellCssClass = "tr-ng-cell";
        TrNgGrid.headerCellCssClass = "tr-ng-column-header " + TrNgGrid.cellCssClass;
        TrNgGrid.bodyCellCssClass = TrNgGrid.cellCssClass;
        TrNgGrid.columnTitleCssClass = "tr-ng-title";
        TrNgGrid.columnSortCssClass = "tr-ng-sort";
        TrNgGrid.columnFilterCssClass = "tr-ng-column-filter";
        TrNgGrid.columnFilterInputWrapperCssClass = "";
        TrNgGrid.columnSortActiveCssClass = "tr-ng-sort-active text-info";
        TrNgGrid.columnSortInactiveCssClass = "tr-ng-sort-inactive text-muted glyphicon glyphicon-chevron-down";
        TrNgGrid.columnSortReverseOrderCssClass = "tr-ng-sort-order-reverse glyphicon glyphicon-chevron-down";
        TrNgGrid.columnSortNormalOrderCssClass = "tr-ng-sort-order-normal glyphicon glyphicon-chevron-up";
        TrNgGrid.rowSelectedCssClass = "active";
        TrNgGrid.footerCssClass = "tr-ng-grid-footer form-inline";
    }).run(function () {
        TrNgGrid.defaultColumnOptions.displayAlign = 'left';
        TrNgGrid.defaultPagerMinifiedPageCountThreshold = 3;
    });

    function configureTemplates($templateCache) {
        // set up default templates
        if (!$templateCache.get(TrNgGrid.cellHeaderTemplateId)) {
            $templateCache.put(TrNgGrid.cellHeaderTemplateId, '<div class="' + TrNgGrid.headerCellCssClass + '" ng-switch="columnOptions.isCustomized">' + '  <div ng-switch-when="true">' + '    <div ng-transclude=""></div>' + '  </div>' + '  <div ng-switch-default>' + '    <div class="' + TrNgGrid.columnTitleCssClass + '">' + '      {{columnTitle |' + TrNgGrid.translateFilter + ':gridOptions.locale}}' + '       <div ' + TrNgGrid.columnSortDirectiveAttribute + '=""></div>' + '    </div>' + '    <div ' + TrNgGrid.columnFilterDirectiveAttribute + '=""></div>' + '  </div>' + '</div>');
        }
        if (!$templateCache.get(TrNgGrid.cellBodyTemplateId)) {
            $templateCache.put(TrNgGrid.cellBodyTemplateId, '<div ng-attr-class="' + TrNgGrid.bodyCellCssClass + ' text-{{columnOptions.displayAlign}}" ng-switch="columnOptions.isCustomized">' + '  <div ng-switch-when="true">' + '    <div ng-transclude=""></div>' + '  </div>' + '  <div ng-switch-default>{{gridDisplayItem[columnOptions.displayFieldName]}}</div>' + '</div>');
        }
        if (!$templateCache.get(TrNgGrid.columnFilterTemplateId)) {
            $templateCache.put(TrNgGrid.columnFilterTemplateId, '<div ng-show="(gridOptions.enableFiltering&&columnOptions.enableFiltering!==false)||columnOptions.enableFiltering" class="' + TrNgGrid.columnFilterCssClass + '">' + ' <div class="' + TrNgGrid.columnFilterInputWrapperCssClass + '">' + '   <input class="form-control input-sm" type="text" ng-model="columnOptions.filter" ng-keypress="speedUpAsyncDataRetrieval($event)"></input>' + ' </div>' + '</div>');
        }
        if (!$templateCache.get(TrNgGrid.columnSortTemplateId)) {
            $templateCache.put(TrNgGrid.columnSortTemplateId, '<div ng-attr-title="{{\'Sort\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}"' + ' ng-show="(gridOptions.enableSorting&&columnOptions.enableSorting!==false)||columnOptions.enableSorting"' + ' ng-click="toggleSorting(columnOptions.fieldName)"' + ' class="' + TrNgGrid.columnSortCssClass + '" > ' + '  <div ng-class="{\'' + TrNgGrid.columnSortActiveCssClass + '\':gridOptions.orderBy==columnOptions.fieldName,\'' + TrNgGrid.columnSortInactiveCssClass + '\':gridOptions.orderBy!=columnOptions.fieldName,\'' + TrNgGrid.columnSortNormalOrderCssClass + '\':gridOptions.orderBy==columnOptions.fieldName&&!gridOptions.orderByReverse,\'' + TrNgGrid.columnSortReverseOrderCssClass + '\':gridOptions.orderBy==columnOptions.fieldName&&gridOptions.orderByReverse}" >' + '  </div>' + '</div>');
        }
        if (!$templateCache.put(TrNgGrid.cellFooterTemplateId)) {
            $templateCache.put(TrNgGrid.cellFooterTemplateId, '<div class="' + TrNgGrid.footerCssClass + '" ng-switch="isCustomized">' + '  <div ng-switch-when="true">' + '    <div ng-transclude=""></div>' + '  </div>' + '  <div ng-switch-default>' + '    <span ' + TrNgGrid.globalFilterDirectiveAttribute + '=""></span>' + '    <span ' + TrNgGrid.pagerDirectiveAttribute + '=""></span>' + '  </div>' + '</div>');
        }
        if (!$templateCache.get(TrNgGrid.footerGlobalFilterTemplateId)) {
            $templateCache.put(TrNgGrid.footerGlobalFilterTemplateId, '<span ng-show="gridOptions.enableFiltering" class="pull-left form-group">' + '  <input class="form-control" type="text" ng-model="gridOptions.filterBy" ng-keypress="speedUpAsyncDataRetrieval($event)" ng-attr-placeholder="{{\'Search\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}"></input>' + '</span>');
        }
        if (!$templateCache.get(TrNgGrid.footerPagerTemplateId)) {
            $templateCache.put(TrNgGrid.footerPagerTemplateId, '<span class="pull-right form-group">' + ' <ul class="pagination">' + '   <li ng-class="{disabled:!pageCanGoBack}" ng-if="extendedControlsActive">' + '     <a href="" ng-click="pageCanGoBack&&navigateToPage(0)" ng-attr-title="{{\'First Page\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}">' + '         <span>&laquo;</span>' + '     </a>' + '   </li>' + '   <li ng-class="{disabled:!pageCanGoBack}" ng-if="extendedControlsActive">' + '     <a href="" ng-click="pageCanGoBack&&navigateToPage(gridOptions.currentPage - 1)" ng-attr-title="{{\'Previous Page\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}">' + '         <span>&lsaquo;</span>' + '     </a>' + '   </li>' + '   <li ng-if="pageSelectionActive" ng-repeat="pageIndex in pageIndexes track by $index" ng-class="{disabled:pageIndex===null, active:pageIndex===gridOptions.currentPage}">' + '      <span ng-if="pageIndex===null">...</span>' + '      <a href="" ng-click="navigateToPage(pageIndex)" ng-if="pageIndex!==null" ng-attr-title="{{\'Page\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}">{{pageIndex+1}}</a>' + '   </li>' + '   <li ng-class="{disabled:!pageCanGoForward}" ng-if="extendedControlsActive">' + '     <a href="" ng-click="pageCanGoForward&&navigateToPage(gridOptions.currentPage + 1)" ng-attr-title="{{\'Next Page\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}">' + '         <span>&rsaquo;</span>' + '     </a>' + '   </li>' + '   <li ng-class="{disabled:!pageCanGoForward}" ng-if="extendedControlsActive">' + '     <a href="" ng-click="pageCanGoForward&&navigateToPage(lastPageIndex)" ng-attr-title="{{\'Last Page\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}">' + '         <span>&raquo;</span>' + '     </a>' + '   </li>' + '   <li class="disabled" style="white-space: nowrap;">' + '     <span ng-hide="totalItemsCount">{{\'No items to display\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}</span>' + '     <span ng-show="totalItemsCount" ng-attr-title="{{\'Select Page\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}">' + '       {{startItemIndex+1}} - {{endItemIndex+1}} {{\'displayed\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}' + '       <span>, {{totalItemsCount}} {{\'in total\'|' + TrNgGrid.translateFilter + ':gridOptions.locale}}</span>' + '     </span > ' + '   </li>' + ' </ul>' + '</span>');
        }
    }
})(TrNgGrid || (TrNgGrid = {}));
//# sourceMappingURL=trNgGrid.js.map
