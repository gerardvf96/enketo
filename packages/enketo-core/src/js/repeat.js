/**
 * Repeat module.
 *
 * Two important concepts are used:
 * 1. The first XLST-added repeat view is cloned to serve as a template of that repeat.
 * 2. Each repeat series has a sibling .or-repeat-info element that stores info that is relevant to that series. (More details below)
 *
 * Note that with nested repeats you may have many more series of repeats than templates, because a nested repeat
 * may have multiple series.
 *
 * @module repeat
 */

/**
 * "Repeat info" elements are used to convey and/or contain several sorts of
 * metadata, optimization-focused state, and interactive behavior. The following
 * should be regarded as non-exhaustive, but the intent is to update it as any
 * further usage becomes known.
 *
 * Metadata:
 *
 * - The "repeat info" element itself serves as a footer for a series of zero or
 *   more repeat instances in the view, i.e. a marker designating where a given
 *   series of repeat instances *does or may* precede.
 *
 *   ```html
 *   <section class="or-repeat" name="/root/repeat-name">...</section>
 *   <div class="or-repeat" data-name="/root/repeat-name">...</div>
 *   ```
 *
 *   This element is produced by Enketo Transformer.
 *
 * - Its `data-name` attribute is the nodeset referenced by its associated
 *   repeat instances (if any).
 *
 *   This attribute is produced by Enketo Transformer.
 *
 * - Its `data-repeat-count` attribute is the repeat's `jr:count` expression, if
 *   defined in the corresponding XForm.
 *
 *    ```html
 *    <div class="or-repeat" data-repeat-count="/data/repeat-count" ...>
 *    ```
 *
 *   This attribute is produced by Enketo Transformer.
 *
 * - Its `data-repeat-fixed` attribute, if defined in the corresponding XForm
 *   with `jr:noAddRemove="true()"`.
 *
 *    ```html
 *    <div class="or-repeat" data-repeat-fixed ...>
 *    ```
 *
 *   This attribute is produced by Enketo Transformer.
 *
 * Optimization-focused state:
 *
 * - "Shared", "static" itemsets—when rendered as `datalist`s—along with their
 *   associated translation definitions, and the current state of their
 *   translated label elements. A minimal (seriously!) example:
 *
 *    ```html
 *    <div class="repeat-shared-datalist-itemset-elements" style="display: none;">
 *      <datalist id="datarepitem0" data-name="/data/rep/item-0" class="repeat-shared-datalist-itemset">
 *        <option class="itemset-template" value="" data-items-path="instance('items-0')/item">...</option>
 *        <option value="items-0-0" data-value="items 0 0"></option>
 *      </datalist>
 *
 *      <span class="or-option-translations" style="display:none;" data-name="/data/rep/item-0"> </span>
 *
 *      <span class="itemset-labels" data-value-ref="name" data-label-type="itext" data-label-ref="itextId" data-name="/data/rep/item-0">
 *        <span lang="en" class="option-label active" data-itext-id="items-0-0">items-0-0</span>
 *      </span>
 *    </div>
 *    ```
 *
 *    The child elements are first produced by Enketo Transformer. They are then
 *    identified (itemset.js), augmented and reparented (repeat.js) by Enketo
 *    Core to the outer element created during form initialization.
 *
 * Interactive behavior:
 *
 * - The button used to add new repeat user-controlled instances (i.e. when
 *   instances are not controlled by `jr:count` or `jr:noAddRemove`):
 *
 *    ```html
 *    <button type="button" class="btn btn-default add-repeat-btn">...</button>
 *    ```
 *
 *    This element is created and appended in Enketo Core, with requisite event
 *    handler(s) for user interaction when adding repeat instances.
 *
 *    Each user-controlled repeat instance's corresponding removal button is
 *    contained by its respective repeat instance, under a `.repeat-buttons`
 *    element (also added by Enketo Core; no other buttons are added besides the
 *    removal button).
 * @typedef {HTMLDivElement} EnketoRepeatInfo
 * @property {`${string}or-repeat-info${string}`} className - This isn't the
 * best! It just ensures `EnketoRepeatInfo` is a distinct type (according to
 * TypeScript and its language server), rather than an indistinguishable alias
 * to `HTMLDivElement`.
 */

import $ from 'jquery';
import { t } from 'enketo/translator';
import dialog from 'enketo/dialog';
import config from 'enketo/config';
import events from './event';
import {
    getSiblingElements,
    getSiblingElement,
    getChildren,
    getSiblingElementsAndSelf,
} from './dom-utils';
import { isStaticItemsetFromSecondaryInstance } from './itemset';
import { invalidateRepeatCaches } from './dom';

/**
 * @typedef {import('./form').Form} Form
 */

const disableFirstRepeatRemoval = config.repeatOrdinals === true;

export default {
    /**
     * @type {Form}
     */
    // @ts-expect-error - this will be populated during form init, but assigning
    // its type here improves intellisense.
    form: null,

    /**
     * Initializes all Repeat Groups in form (only called once).
     */
    init() {
        const that = this;
        let $repeatInfos;

        this.staticLists = [];

        if (!this.form) {
            throw new Error(
                'Repeat module not correctly instantiated with form property.'
            );
        }

        if (!this.form.features.repeat) {
            this.getIndex = () => 0;
            this.form.input.getIndex = () => 0;

            return;
        }

        if (!this.form.features.repeatCount) {
            this.countUpdate = () => {
                // Form noop
            };
            this.updateRepeatInstancesFromCount = () => {
                // Form noop
            };
        }

        $repeatInfos = this.form.view.$.find('.or-repeat-info');
        this.templates = {};
        this.templateStrings = {};
        this.optionWrapperContainers = new Set();
        // Add repeat numbering elements
        $repeatInfos
            .siblings('.or-repeat')
            .prepend('<span class="repeat-number"></span>')
            // add empty class for calculation-only repeats
            .addBack()
            .filter(function () {
                // remove whitespace
                if (this.firstChild && this.firstChild.nodeType === 3) {
                    this.firstChild.textContent = '';
                }

                return !this.querySelector('.question');
            })
            .addClass('empty');
        // Add repeat buttons
        $repeatInfos
            .filter('*:not([data-repeat-fixed]):not([data-repeat-count])')
            .each(function() {
                // Find the parent group that contains this repeat series
                const parentGroup = this.closest('.or-group, .or-group-data');
                let groupLabel = '';
                
                if (parentGroup) {
                    const h4 = parentGroup.querySelector(':scope > h4');
                    if (h4) {
                        const labelSpan = h4.querySelector('.question-label');
                        groupLabel = labelSpan ? labelSpan.textContent.trim() : h4.textContent.trim();
                    }
                }
                
                // Fallback to technical name if no label found
                if (!groupLabel) {
                    groupLabel = this.dataset.name.split('/').pop();
                }
                
                const buttonText = `Afegir nova entrada a [${groupLabel}]`;
                $(this).append(
                    `<button type="button" class="btn btn-default add-repeat-btn">${buttonText}</button>`
                );
            })
        $repeatInfos
            .siblings('.or-repeat')
            .append(
                `<div class="repeat-buttons"><button type="button" class="btn btn-default duplicate"><i class="icon icon-copy"> </i></button><button type="button" ${
                    disableFirstRepeatRemoval ? ' disabled ' : ' '
                }class="btn btn-default remove"><i class="icon icon-minus"> </i></button></div>`
            );
        /**
         * The model also requires storing repeat templates for repeats that do not have a jr:template.
         * Since the model has no knowledge of which node is a repeat, we direct this here.
         */
        this.form.model.extractFakeTemplates(
            $repeatInfos
                .map(function () {
                    return this.dataset.name;
                })
                .get()
        );

        /**
         * Clone all repeats to serve as templates
         * in reverse document order to properly deal with nested repeat templates
         *
         * Widgets not yet initialized. Values not yet set.
         */
        $repeatInfos
            .siblings('.or-repeat')
            .reverse()
            .each(function () {
                const templateEl = this.cloneNode(true);
                that.form.langs.setFormUi(
                    that.form.currentLanguage,
                    templateEl
                );
                const xPath = templateEl.getAttribute('name');

                if (templateEl.querySelector('.option-wrapper') != null) {
                    that.optionWrapperContainers.add(xPath);
                }

                this.remove();
                $(templateEl)
                    .removeClass('contains-current current')
                    .find('.current')
                    .removeClass('current');
                // Clear all values (this is required for setvalue/odk-instance-first-load populated values)
                // The default values will be added anyway in the repeats.add function.
                that.form.input.clear(templateEl);
                that.templates[xPath] = templateEl;
                that.templateStrings[xPath] = templateEl.outerHTML;
            });

        $repeatInfos
            .reverse()
            .each(function () {
                // don't do nested repeats here, they will be dealt with recursively
                if (!$(this).closest('.or-repeat').length) {
                    that.updateDefaultFirstRepeatInstance(this);
                }
            })
            // If there is no repeat-count attribute, check how many repeat instances
            // are in the model, and update view if necessary.
            .get()
            .forEach(that.updateViewInstancesFromModel.bind(this));

        // delegated handlers (strictly speaking not required, but checked for doubling of events -> OK)
        this.form.view.$.on(
            'click',
            'button.add-repeat-btn:enabled',
            function () {
                // Create a clone
                that.add($(this).closest('.or-repeat-info')[0]);

                // Prevent default
                return false;
            }
        );
        this.form.view.$.on('click', 'button.remove:enabled', function () {
            that.confirmDelete(this.closest('.or-repeat'));

            // prevent default
            return false;
        });

        // Duplicate repeat instance handler
        this.form.view.$.on('click', 'button.duplicate:enabled', function () {
            that.duplicate(this.closest('.or-repeat'));

            // prevent default
            return false;
        });

        // Toggle collapse on repeat instance when clicking the repeat number
        this.form.view.$.on('click', '.repeat-number', function () {
            const repeatEl = this.closest('.or-repeat');
            if (repeatEl) {
                repeatEl.classList.toggle('repeat-collapsed');
            }
            
            // prevent default
            return false;
        });

        this.countUpdate();

        return true;
    },
    // Make this function overwritable
    confirmDelete(repeatEl) {
        const that = this;
        dialog
            .confirm({
                heading: t('confirm.repeatremove.heading'),
                msg: t('confirm.repeatremove.msg'),
            })
            .then((confirmed) => {
                if (confirmed) {
                    // remove clone
                    that.remove($(repeatEl));
                }
            })
            .catch(console.error);
    },

    /**
     * Obtains the 0-based absolute index of the provided repeat or repeat-info element
     * The goal of this function is to make non-nested repeat index determination as fast as possible.
     *
     * In nested cases, the "absolute index" for a repeat instance refers to the index across all repeat
     * instances with that name regardless of nesting (the repeat structure is conceptually flattened).
     * There is one repeat-info element for each sequences of repeats of the given name. The "absolute index"
     * of a repeat-info in nested cases refers to the index across all sequences of repeat instances with that name.
     *
     * The repeat-info concept was added in the context of supporting zero instances of a repeat. It would be good
     * to expand on its documentation.
     *
     * @param {HTMLElement} el
     */
    getIndex(el) {
        if (!el) {
            return 0;
        }

        const isInfoElement = el.classList.contains('or-repeat-info');
        const repeatPath = isInfoElement
            ? el.dataset.name
            : el.getAttribute('name');
        const collection = isInfoElement
            ? this.form.collections.repeatInfos
            : this.form.collections.repeats;
        const index = Math.max(0, collection.refIndexOf(el, repeatPath));

        return index;
    },
    /**
     * [updateViewInstancesFromModel description]
     *
     * @param {Element} repeatInfo - repeatInfo element
     * @return {number} length of repeat series in model
     */
    updateViewInstancesFromModel(repeatInfo) {
        const repeatPath = repeatInfo.dataset.name;
        // All we need is to find out in which series we are.
        const repeatSeriesIndex = this.getIndex(repeatInfo);
        const repInModelSeries = this.form.model.getRepeatSeries(
            repeatPath,
            repeatSeriesIndex
        );
        const repInViewSeries = getSiblingElements(repeatInfo, '.or-repeat');
        // First rep is already included (by XSLT transformation)
        if (repInModelSeries.length > repInViewSeries.length) {
            this.add(
                repeatInfo,
                repInModelSeries.length - repInViewSeries.length,
                'model'
            );
            // Now check the repeat counts of all the descendants of this repeat and its new siblings
            // Note: not tested with triple-nested repeats, but probably taking the better safe-than-sorry approach,
            // so should be okay except for performance.
            getSiblingElements(repeatInfo, '.or-repeat')
                .reduce(
                    (acc, current) =>
                        acc.concat([
                            ...current.querySelectorAll(
                                '.or-repeat-info:not([data-repeat-count])'
                            ),
                        ]),
                    []
                )
                .forEach(this.updateViewInstancesFromModel.bind(this));
        }

        return repInModelSeries.length;
    },
    /**
     * [updateDefaultFirstRepeatInstance description]
     *
     * @param {Element} repeatInfo - repeatInfo element
     */
    updateDefaultFirstRepeatInstance(repeatInfo) {
        const repeatPath = repeatInfo.dataset.name;
        console.log('[updateDefaultFirstRepeatInstance]', repeatPath, 'instanceStr:', this.form.model.data.instanceStr, 'template minimal:', this.templates[repeatPath]?.classList.contains('or-appearance-minimal'));
        if (
            !this.form.model.data.instanceStr &&
            !this.templates[repeatPath].classList.contains(
                'or-appearance-minimal'
            )
        ) {
            const repeatSeriesIndex = this.getIndex(repeatInfo);
            const repeatSeriesInModel = this.form.model.getRepeatSeries(
                repeatPath,
                repeatSeriesIndex
            );
            console.log('[updateDefaultFirstRepeatInstance]', repeatPath, 'series index:', repeatSeriesIndex, 'model length:', repeatSeriesInModel.length);
            if (repeatSeriesInModel.length === 0) {
                console.log('[updateDefaultFirstRepeatInstance] Adding instance for', repeatPath);
                this.add(repeatInfo, 1, 'magic');
            }

            getSiblingElements(repeatInfo, '.or-repeat')
                .reduce(
                    (acc, current) =>
                        acc.concat([
                            ...current.querySelectorAll(
                                '.or-repeat-info:not([data-repeat-count])'
                            ),
                        ]),
                    []
                )
                .forEach(this.updateDefaultFirstRepeatInstance.bind(this));
        }
    },
    /**
     * [updateRepeatInstancesFromCount description]
     *
     * @param {Element} repeatInfo - repeatInfo element
     */
    updateRepeatInstancesFromCount(repeatInfo) {
        const repCountPath = repeatInfo.dataset.repeatCount || '';

        if (!repCountPath) {
            return;
        }

        /*
         * We cannot pass an .or-repeat context to model.evaluate() if the number or repeats in a series is zero.
         * However, but we do still need a context for nested repeats where the count of the nested repeat
         * is determined in a node inside the parent repeat. To do so we use the repeat comment in model as context.
         */
        const repPath = repeatInfo.dataset.name;
        let numRepsInCount = this.form.model.evaluate(
            repCountPath,
            'number',
            this.form.model.getRepeatCommentSelector(repPath),
            this.getIndex(repeatInfo),
            true
        );
        numRepsInCount = isNaN(numRepsInCount) ? 0 : numRepsInCount;
        const numRepsInView = getSiblingElements(
            repeatInfo,
            `.or-repeat[name="${repPath}"]`
        ).length;
        let toCreate = numRepsInCount - numRepsInView;

        if (toCreate > 0) {
            this.add(repeatInfo, toCreate, 'count');
        } else if (toCreate < 0) {
            toCreate =
                Math.abs(toCreate) >= numRepsInView
                    ? -numRepsInView + (disableFirstRepeatRemoval ? 1 : 0)
                    : toCreate;
            for (; toCreate < 0; toCreate++) {
                const $last = $(repeatInfo.previousElementSibling);
                this.remove($last);
            }
        }
        // Now check the repeat counts of all the descendants of this repeat and its new siblings, level-by-level.
        // TODO: this does not find .or-repeat > .or-repeat (= unusual syntax)
        getSiblingElementsAndSelf(repeatInfo, '.or-repeat')
            .reduce(
                (acc, current) =>
                    acc.concat(
                        getChildren(current, '.or-group, .or-group-data')
                    ),
                []
            )
            .reduce(
                (acc, current) =>
                    acc.concat(
                        getChildren(
                            current,
                            '.or-repeat-info[data-repeat-count]'
                        )
                    ),
                []
            )
            .forEach(this.updateRepeatInstancesFromCount.bind(this));
    },
    /**
     * Checks whether repeat count value has been updated and updates repeat instances
     * accordingly.
     *
     * @param {UpdatedDataNodes} updated - The object containing info on updated data nodes.
     */
    countUpdate(updated = {}) {
        if (this.form.features.repeatCount) {
            const repeatInfos = this.form
                .getRelatedNodes(
                    'data-repeat-count',
                    '.or-repeat-info',
                    updated
                )
                .get();

            repeatInfos.forEach(this.updateRepeatInstancesFromCount.bind(this));
        }
    },
    /**
     * Clone a repeat group/node.
     *
     * @param {Element} repeatInfo - A repeatInfo element.
     * @param {number=} toCreate - Number of clones to create.
     * @param {string=} trigger - The trigger ('magic', 'user', 'count', 'model')
     * @return {boolean} Cloning success/failure outcome.
     */
    add(repeatInfo, toCreate = 1, trigger = 'user') {
        if (!repeatInfo) {
            console.error('Nothing to clone');

            return false;
        }

        const repeatPath = repeatInfo.dataset.name;
        const repeats = getSiblingElements(repeatInfo, '.or-repeat');

        /** @type {number} */
        let repeatIndex;

        const previousRepeat = repeats[repeats.length - 1];

        if (previousRepeat != null) {
            repeatIndex = this.getIndex(previousRepeat) + 1;
        }

        // Determine the index of the repeat series.
        const repeatSeriesIndex = this.getIndex(repeatInfo);
        let modelRepeatSeriesLength = this.form.model.getRepeatSeries(
            repeatPath,
            repeatSeriesIndex
        ).length;

        // Determine the index of the repeat inside its series
        const prevSibling = repeatInfo.previousElementSibling;
        let repeatIndexInSeries =
            prevSibling && prevSibling.classList.contains('or-repeat')
                ? Number(
                      prevSibling.querySelector('.repeat-number').textContent
                  )
                : 0;

        const templateString = this.templateStrings[repeatPath];
        const range = document.createRange();
        const templates = Array(toCreate)
            .fill(null)
            .map(() => templateString)
            .join('');
        const clones = Array.from(
            range.createContextualFragment(templates).children
        );

        // Add required number of repeats
        for (const [i, clone] of clones.entries()) {
            // Fix names of radio button groups
            if (this.optionWrapperContainers.has(repeatPath)) {
                clone
                    .querySelectorAll('.option-wrapper')
                    .forEach(this.fixRadioName);
            }

            if (this.form.features.itemset) {
                this.processDatalists(
                    clone.querySelectorAll('datalist'),
                    repeatInfo
                );
            }

            // Insert the clone
            repeatInfo.before(clone);

            // Update the repeat number
            clone.querySelector('.repeat-number').textContent =
                repeatIndexInSeries + 1;

            // Update the variable containing the view repeats in the current series.
            repeats.push(clone);

            invalidateRepeatCaches(repeatPath);

            // Create a repeat in the model if it doesn't already exist
            if (repeats.length > modelRepeatSeriesLength) {
                this.form.model.addRepeat(repeatPath, repeatSeriesIndex);
                modelRepeatSeriesLength++;
            }

            // This is the index of the new repeat in relation to all other repeats of the same name,
            // even if they are in different series.
            repeatIndex = repeatIndex ?? this.getIndex(clone);

            this.form.collections.repeats.setRefIndexCache(
                clone,
                repeatIndex,
                repeatPath
            );

            const updated = {
                repeatIndex,
                repeatInstance: clone,
                repeatInfo,
                repeatPath,
                trigger,
                cloned: true,
            };

            // The odk-new-repeat event (before the event that triggers re-calculations etc)
            if (trigger === 'user' || trigger === 'count') {
                clone.dispatchEvent(events.NewRepeat(updated));
            }
            // This will trigger setting default values, calculations, readonly, relevancy, language updates, and automatic page flips.
            clone.dispatchEvent(events.AddRepeat(updated));

            // Initialize widgets in clone after default values have been set
            if (this.form.widgetsInitialized) {
                this.form.widgets.init($(clone), this.form.options);

                if (trigger === 'user' && i === 0) {
                    this.form.goToTarget(clone);
                }
            }

            // now create the first instance of any nested repeats if necessary
            // For nested repeats in newly created parent instances, we need to bypass
            // the instanceStr check since we're actively building the form, not loading data
            const savedInstanceStr = this.form.model.data.instanceStr;
            const nestedRepeatInfos = clone.querySelectorAll('.or-repeat-info:not([data-repeat-count])');
            console.log('[repeat.add] Created clone, found nested repeat-infos:', nestedRepeatInfos.length, 'instanceStr:', savedInstanceStr);
            nestedRepeatInfos.forEach((nestedRepeatInfo) => {
                console.log('[repeat.add] Processing nested repeat:', nestedRepeatInfo.dataset.name);
                // Temporarily clear instanceStr to ensure nested repeats get their default instance
                this.form.model.data.instanceStr = null;
                this.updateDefaultFirstRepeatInstance(nestedRepeatInfo);
                this.form.model.data.instanceStr = savedInstanceStr;
            });

            repeatIndex++;
            repeatIndexInSeries++;
        }

        // enable or disable + and - buttons
        this.toggleButtons(repeatInfo);

        return true;
    },
    /**
     * Duplicate a repeat instance with all its values.
     * Creates a copy right after the source instance.
     *
     * @param {Element} repeatEl - The repeat element to duplicate.
     * @return {boolean} Duplication success/failure outcome.
     */
    duplicate(repeatEl) {
        if (!repeatEl) {
            console.error('Nothing to duplicate');
            return false;
        }

        const repeatPath = repeatEl.getAttribute('name');
        const repeatInfo = getSiblingElement(repeatEl, '.or-repeat-info');
        const repeats = getSiblingElements(repeatInfo, '.or-repeat[name="' + repeatPath + '"]');
        
        // Find the local index within this series
        const sourceIndexInSeries = repeats.indexOf(repeatEl);
        if (sourceIndexInSeries === -1) {
            console.error('Could not find repeat element in series');
            return false;
        }

        // Collect all input values from the source repeat
        // We store the relative path within the repeat, and the value
        const inputValues = [];
        const sourceInputs = repeatEl.querySelectorAll('input:not(.ignore), select:not(.ignore), textarea:not(.ignore)');
        sourceInputs.forEach((input) => {
            const name = input.getAttribute('name') || input.getAttribute('data-name');
            if (name) {
                try {
                    const value = this.form.input.getVal(input);
                    if (value !== '' && value !== undefined && value !== null && 
                        !(Array.isArray(value) && value.length === 0)) {
                        inputValues.push({ name, value });
                    }
                } catch (e) {
                    // Skip inputs that can't be read
                }
            }
        });

        // Create a new repeat instance at the end
        const success = this.add(repeatInfo, 1, 'user');
        if (!success) {
            return false;
        }

        // Get the newly created repeat (it's now the last one before repeatInfo)
        const newRepeat = repeatInfo.previousElementSibling;
        if (!newRepeat || !newRepeat.classList.contains('or-repeat')) {
            return false;
        }

        // Move the new repeat DOM element to right after the source
        repeatEl.after(newRepeat);

        // Move the model element to the correct position
        const repeatSeriesIndex = this.getIndex(repeatInfo);
        const modelRepeats = this.form.model.getRepeatSeries(repeatPath, repeatSeriesIndex);
        if (modelRepeats.length > 1 && sourceIndexInSeries < modelRepeats.length - 1) {
            // The new model element is at the end, we need to move it
            const newModelRepeat = modelRepeats[modelRepeats.length - 1];
            const sourceModelRepeat = modelRepeats[sourceIndexInSeries];
            if (newModelRepeat && sourceModelRepeat) {
                // Insert after source model element
                sourceModelRepeat.after(newModelRepeat);
            }
        }

        // Invalidate caches since we moved elements
        invalidateRepeatCaches(repeatPath);

        // Renumber all repeats
        this.numberRepeats(repeatInfo);

        // Now copy values from source to the duplicate
        inputValues.forEach(({ name, value }) => {
            // Find the input in the new repeat by name
            const newInput = newRepeat.querySelector(
                'input[name="' + name + '"]:not(.ignore), ' +
                'select[name="' + name + '"]:not(.ignore), ' +
                'textarea[name="' + name + '"]:not(.ignore), ' +
                'input[data-name="' + name + '"]:not(.ignore)'
            );
            if (newInput) {
                try {
                    // Set value directly on the control with event to sync model
                    const valueToSet = Array.isArray(value) ? value.join(' ') : value;
                    this.form.input.setVal(newInput, valueToSet, events.InputUpdate());
                } catch (e) {
                    // Skip inputs that can't be set
                }
            }
        });

        // Update buttons state
        this.toggleButtons(repeatInfo);

        return true;
    },
    remove($repeat) {
        const that = this;
        const $next = $repeat.next('.or-repeat, .or-repeat-info');
        const repeatPath = $repeat.attr('name');
        const repeatIndex = this.getIndex($repeat[0]);
        const repeatInfo = $repeat.siblings('.or-repeat-info')[0];

        $repeat.remove();

        invalidateRepeatCaches(repeatPath);

        that.numberRepeats(repeatInfo);
        that.toggleButtons(repeatInfo);

        const detail = this.form.initialized
            ? { removed: { repeatPath, repeatIndex } }
            : { initRepeatInfo: { repeatPath, repeatIndex } };
        // Trigger the removerepeat on the next repeat or repeat-info(always present)
        // so that removerepeat handlers know where the repeat was removed
        $next[0].dispatchEvent(events.RemoveRepeat(detail));
        // Now remove the data node
        that.form.model.node(repeatPath, repeatIndex).remove();
    },
    fixRadioName(element) {
        const random = Math.floor(Math.random() * 10000000 + 1);
        element.querySelectorAll('input[type="radio"]').forEach((el) => {
            el.setAttribute('name', random);
        });
    },
    fixDatalistId(element) {
        const newId = element.id + Math.floor(Math.random() * 10000000 + 1);
        element.parentNode
            .querySelector(`input[list="${element.id}"]`)
            .setAttribute('list', newId);
        element.id = newId;
    },
    processDatalists(datalists, repeatInfo) {
        datalists.forEach((datalist) => {
            const template = datalist.querySelector(
                '.itemset-template[data-items-path]'
            );
            const expr = template ? template.dataset.itemsPath : null;

            if (!isStaticItemsetFromSecondaryInstance(expr)) {
                this.fixDatalistId(datalist);
            } else {
                const { id } = datalist;
                const input = getSiblingElement(datalist, 'input[list]');

                if (input) {
                    // For very long static datalists, a huge performance improvement can be achieved, by using the
                    // same datalist for all repeat instances that use it.
                    if (this.staticLists.includes(id)) {
                        datalist.remove();
                    } else {
                        // Let all identical input[list] questions amongst all
                        // repeat instances use the same datalist by moving it
                        // under repeatInfo. It will survive removal of all
                        // repeat instances.

                        const parent = datalist.parentElement;
                        const { name } = input;

                        const dl = parent.querySelector('datalist');
                        const detachedList = parent.removeChild(dl);
                        detachedList.setAttribute('data-name', name);

                        const translations = parent.querySelector(
                            '.or-option-translations'
                        );
                        const detachedTranslations =
                            parent.removeChild(translations);
                        detachedTranslations.setAttribute('data-name', name);

                        const labels = parent.querySelector('.itemset-labels');
                        const detachedLabels = parent.removeChild(labels);
                        detachedLabels.setAttribute('data-name', name);

                        // Each of these supporting elements are nested in a
                        // containing element, so any subsequent DOM queries for
                        // their various sibling elements don't mistakenly match
                        // those from a previous itemset in the same repeat.
                        const sharedItemsetContainer =
                            document.createElement('div');

                        sharedItemsetContainer.style.display = 'none';
                        sharedItemsetContainer.append(
                            detachedList,
                            detachedTranslations,
                            detachedLabels
                        );
                        repeatInfo.append(sharedItemsetContainer);

                        // Add explicit class which can be used to determine
                        // this condition elsewhere. See its usage and
                        // commentary in `itemset.js`
                        datalist.classList.add(
                            'repeat-shared-datalist-itemset'
                        );
                        // This class currently serves no functional purpose
                        // (please do not use it for new functional purposes
                        // either). It's included specifically so that the
                        // resulting DOM structure has some indication of why
                        // it's the way it is, and some way to trace back to
                        // this code producing that structure.
                        sharedItemsetContainer.classList.add(
                            'repeat-shared-datalist-itemset-elements'
                        );

                        this.staticLists.push(id);
                        // input.classList.add( 'shared' );
                    }
                }
            }
        });
    },
    toggleButtons(repeatInfo) {
        $(repeatInfo)
            .siblings('.or-repeat')
            .children('.repeat-buttons')
            .find('button.remove')
            .prop('disabled', false)
            .first()
            .prop('disabled', disableFirstRepeatRemoval);
    },
    numberRepeats(repeatInfo) {
        $(repeatInfo)
            .siblings('.or-repeat')
            .each((idx, repeat) => {
                $(repeat)
                    .children('.repeat-number')
                    .text(idx + 1);
            });
    },
};
