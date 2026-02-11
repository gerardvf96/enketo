/**
 * Table of Contents (toc) module.
 *
 * @module toc
 */

import { getAncestors, getSiblingElement } from './dom-utils';

export default {
    /**
     * @type {Array}
     * @default
     */
    tocItems: [],
    /**
     * @type {number}
     * @default
     */
    _maxTocLevel: [],
    /**
     * Generate ToC Items
     */
    generateTocItems() {
        this.tocItems = [];
        const tocElements = [
            ...this.form.view.$[0].querySelectorAll(
                '.or-group, .or-repeat'
            ),
        ]
            .filter(
                (tocEl) =>
                    !tocEl.closest('.disabled') &&
                    // Only include groups that have content, or all repeats
                    (tocEl.matches('.or-repeat') ||
                        (tocEl.matches('.or-group') &&
                            tocEl.querySelector('.question:not(.disabled)')))
            );
        tocElements.forEach((element, index) => {
            const isRepeat = element.classList.contains('or-repeat');
            const groupParents = getAncestors(element, '.or-group');
            
            // For repeats, include their parent repeat as well in nesting calculation
            const repeatParents = isRepeat ? getAncestors(element, '.or-repeat') : [];
            const nestingLevel = groupParents.length + repeatParents.length;
            
            this.tocItems.push({
                element,
                level: nestingLevel,
                parent:
                    groupParents.length > 0
                        ? groupParents[groupParents.length - 1]
                        : (repeatParents.length > 0 ? repeatParents[repeatParents.length - 1] : null),
                tocId: index,
                tocParentId: null,
                isRepeat,
            });
        });

        this._maxTocLevel = Math.max(...this.tocItems.map((el) => el.level));
        const newTocParents = this.tocItems.filter(
            (item) =>
                item.level < this._maxTocLevel &&
                (item.element.classList.contains('or-group') || 
                 item.element.classList.contains('or-repeat'))
        );

        this.tocItems.forEach((item) => {
            const parentItem = newTocParents.find(
                (parent) => item.parent === parent.element
            );
            if (parentItem) {
                item.tocParentId = parentItem.tocId;
            }
        });
    },
    /**
     * Generate ToC Html Fragment
     *
     * @return {DocumentFragment} HTML list element containing Table of Contents
     */
    getHtmlFragment() {
        this.generateTocItems();

        const toc = document.createDocumentFragment();

        let currentTocLevel = 0;
        do {
            const currentTocLevelItems = this.tocItems.filter(
                (item) => item.level === currentTocLevel
            );

            if (currentTocLevel === 0) {
                this._buildTocHtmlList(currentTocLevelItems, toc);
            } else {
                const currentLevelParentIds = [
                    ...new Set(
                        currentTocLevelItems.map((item) => item.tocParentId)
                    ),
                ];

                currentLevelParentIds.forEach((parentId) => {
                    const tocList = document.createElement('ul');
                    const currentLTocevelItemsWithSameIds =
                        currentTocLevelItems.filter(
                            (item) => item.tocParentId === parentId
                        );

                    this._buildTocHtmlList(
                        currentLTocevelItemsWithSameIds,
                        tocList
                    );

                    const tocParent = toc.querySelectorAll(
                        `[tocId="${parentId}"]`
                    )[0];
                    tocParent.appendChild(tocList);
                });
            }

            currentTocLevel++;
        } while (currentTocLevel <= this._maxTocLevel);

        return toc;
    },
    /**
     * Get Title of Current ToC Element
     *
     * @param {Element} el - HTML element that serves as page
     */
    _getTitle(el) {
        let tocItemText;
        
        // Handle repeat instances - show group label + repeat number
        if (el.classList.contains('or-repeat')) {
            const repeatNumber = el.querySelector('.repeat-number');
            const parentGroup = el.closest('.or-group, .or-group-data');
            
            if (parentGroup) {
                const labelEl = parentGroup.querySelector(':scope > h4 .question-label.active');
                const groupTitle = labelEl ? labelEl.textContent.trim() : null;
                
                if (groupTitle) {
                    const number = repeatNumber ? repeatNumber.textContent.trim() : '';
                    tocItemText = `${groupTitle} ${number}`;
                }
            }
            
            // Fallback: just use repeat number
            if (!tocItemText && repeatNumber) {
                tocItemText = `Entrada ${repeatNumber.textContent.trim()}`;
            }
        } else {
            // Handle groups
            const labelEl = el.querySelector('.question-label.active');
            if (labelEl) {
                tocItemText = labelEl.textContent;
            } else {
                const hintEl = el.querySelector('.or-hint.active');
                if (hintEl) {
                    tocItemText = hintEl.textContent;
                }
            }
        }

        // Truncate long titles (increased limit for wider TOC)
        tocItemText =
            tocItemText && tocItemText.length > 100
                ? `${tocItemText.substring(0, 100)}...`
                : tocItemText;

        return tocItemText;
    },
    /**
     * Builds List of ToC Items
     *
     * @param {Array<object>} items - ToC list of items
     * @param {Element} appendTo - HTML Element to append ToC list to
     */
    _buildTocHtmlList(items, appendTo) {
        if (items.length > 0) {
            items.forEach((item) => {
                const tocListItem = document.createElement('li');
                
                // Groups are collapsible details elements
                if (item.element.classList.contains('or-group')) {
                    const groupTocTitle = document.createElement('summary');
                    groupTocTitle.textContent =
                        this._getTitle(item.element) || `[${item.tocId + 1}]`;

                    const groupToc = document.createElement('details');
                    groupToc.setAttribute('tocId', item.tocId);
                    if (item.tocParentId !== null) {
                        groupToc.setAttribute('tocParentId', item.tocParentId);
                    }
                    groupToc.append(groupTocTitle);

                    tocListItem.append(groupToc);
                } else {
                    // Repeats and other items are regular links
                    const a = document.createElement('a');
                    a.textContent =
                        this._getTitle(item.element) || `[${item.tocId + 1}]`;

                    tocListItem.setAttribute('tocId', item.tocId);
                    tocListItem.setAttribute('role', 'pageLink');
                    if (item.tocParentId !== null) {
                        tocListItem.setAttribute(
                            'tocParentId',
                            item.tocParentId
                        );
                    }
                    tocListItem.append(a);
                }
                appendTo.append(tocListItem);
            });
        }
    },
};
