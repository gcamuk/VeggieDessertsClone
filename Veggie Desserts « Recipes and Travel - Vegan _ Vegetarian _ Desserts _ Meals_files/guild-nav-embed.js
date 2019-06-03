(function () {
    'use strict';

    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    const directives = new WeakMap();
    /**
     * Brands a function as a directive so that lit-html will call the function
     * during template rendering, rather than passing as a value.
     *
     * @param f The directive factory function. Must be a function that returns a
     * function of the signature `(part: Part) => void`. The returned function will
     * be called with the part object
     *
     * @example
     *
     * ```
     * import {directive, html} from 'lit-html';
     *
     * const immutable = directive((v) => (part) => {
     *   if (part.value !== v) {
     *     part.setValue(v)
     *   }
     * });
     * ```
     */
    // tslint:disable-next-line:no-any
    const directive = (f) => ((...args) => {
        const d = f(...args);
        directives.set(d, true);
        return d;
    });
    const isDirective = (o) => {
        return typeof o === 'function' && directives.has(o);
    };

    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    /**
     * True if the custom elements polyfill is in use.
     */
    const isCEPolyfill = window.customElements !== undefined &&
        window.customElements.polyfillWrapFlushCallback !==
            undefined;
    /**
     * Reparents nodes, starting from `startNode` (inclusive) to `endNode`
     * (exclusive), into another container (could be the same container), before
     * `beforeNode`. If `beforeNode` is null, it appends the nodes to the
     * container.
     */
    const reparentNodes = (container, start, end = null, before = null) => {
        let node = start;
        while (node !== end) {
            const n = node.nextSibling;
            container.insertBefore(node, before);
            node = n;
        }
    };
    /**
     * Removes nodes, starting from `startNode` (inclusive) to `endNode`
     * (exclusive), from `container`.
     */
    const removeNodes = (container, startNode, endNode = null) => {
        let node = startNode;
        while (node !== endNode) {
            const n = node.nextSibling;
            container.removeChild(node);
            node = n;
        }
    };

    /**
     * @license
     * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    /**
     * A sentinel value that signals that a value was handled by a directive and
     * should not be written to the DOM.
     */
    const noChange = {};
    /**
     * A sentinel value that signals a NodePart to fully clear its content.
     */
    const nothing = {};

    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    /**
     * An expression marker with embedded unique key to avoid collision with
     * possible text in templates.
     */
    const marker = `{{lit-${String(Math.random()).slice(2)}}}`;
    /**
     * An expression marker used text-positions, multi-binding attributes, and
     * attributes with markup-like text values.
     */
    const nodeMarker = `<!--${marker}-->`;
    const markerRegex = new RegExp(`${marker}|${nodeMarker}`);
    /**
     * Suffix appended to all bound attribute names.
     */
    const boundAttributeSuffix = '$lit$';
    /**
     * An updateable Template that tracks the location of dynamic parts.
     */
    class Template {
        constructor(result, element) {
            this.parts = [];
            this.element = element;
            let index = -1;
            let partIndex = 0;
            const nodesToRemove = [];
            const _prepareTemplate = (template) => {
                const content = template.content;
                // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be
                // null
                const walker = document.createTreeWalker(content, 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */, null, false);
                // Keeps track of the last index associated with a part. We try to delete
                // unnecessary nodes, but we never want to associate two different parts
                // to the same index. They must have a constant node between.
                let lastPartIndex = 0;
                while (walker.nextNode()) {
                    index++;
                    const node = walker.currentNode;
                    if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
                        if (node.hasAttributes()) {
                            const attributes = node.attributes;
                            // Per
                            // https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap,
                            // attributes are not guaranteed to be returned in document order.
                            // In particular, Edge/IE can return them out of order, so we cannot
                            // assume a correspondance between part index and attribute index.
                            let count = 0;
                            for (let i = 0; i < attributes.length; i++) {
                                if (attributes[i].value.indexOf(marker) >= 0) {
                                    count++;
                                }
                            }
                            while (count-- > 0) {
                                // Get the template literal section leading up to the first
                                // expression in this attribute
                                const stringForPart = result.strings[partIndex];
                                // Find the attribute name
                                const name = lastAttributeNameRegex.exec(stringForPart)[2];
                                // Find the corresponding attribute
                                // All bound attributes have had a suffix added in
                                // TemplateResult#getHTML to opt out of special attribute
                                // handling. To look up the attribute value we also need to add
                                // the suffix.
                                const attributeLookupName = name.toLowerCase() + boundAttributeSuffix;
                                const attributeValue = node.getAttribute(attributeLookupName);
                                const strings = attributeValue.split(markerRegex);
                                this.parts.push({ type: 'attribute', index, name, strings });
                                node.removeAttribute(attributeLookupName);
                                partIndex += strings.length - 1;
                            }
                        }
                        if (node.tagName === 'TEMPLATE') {
                            _prepareTemplate(node);
                        }
                    }
                    else if (node.nodeType === 3 /* Node.TEXT_NODE */) {
                        const data = node.data;
                        if (data.indexOf(marker) >= 0) {
                            const parent = node.parentNode;
                            const strings = data.split(markerRegex);
                            const lastIndex = strings.length - 1;
                            // Generate a new text node for each literal section
                            // These nodes are also used as the markers for node parts
                            for (let i = 0; i < lastIndex; i++) {
                                parent.insertBefore((strings[i] === '') ? createMarker() :
                                    document.createTextNode(strings[i]), node);
                                this.parts.push({ type: 'node', index: ++index });
                            }
                            // If there's no text, we must insert a comment to mark our place.
                            // Else, we can trust it will stick around after cloning.
                            if (strings[lastIndex] === '') {
                                parent.insertBefore(createMarker(), node);
                                nodesToRemove.push(node);
                            }
                            else {
                                node.data = strings[lastIndex];
                            }
                            // We have a part for each match found
                            partIndex += lastIndex;
                        }
                    }
                    else if (node.nodeType === 8 /* Node.COMMENT_NODE */) {
                        if (node.data === marker) {
                            const parent = node.parentNode;
                            // Add a new marker node to be the startNode of the Part if any of
                            // the following are true:
                            //  * We don't have a previousSibling
                            //  * The previousSibling is already the start of a previous part
                            if (node.previousSibling === null || index === lastPartIndex) {
                                index++;
                                parent.insertBefore(createMarker(), node);
                            }
                            lastPartIndex = index;
                            this.parts.push({ type: 'node', index });
                            // If we don't have a nextSibling, keep this node so we have an end.
                            // Else, we can remove it to save future costs.
                            if (node.nextSibling === null) {
                                node.data = '';
                            }
                            else {
                                nodesToRemove.push(node);
                                index--;
                            }
                            partIndex++;
                        }
                        else {
                            let i = -1;
                            while ((i = node.data.indexOf(marker, i + 1)) !==
                                -1) {
                                // Comment node has a binding marker inside, make an inactive part
                                // The binding won't work, but subsequent bindings will
                                // TODO (justinfagnani): consider whether it's even worth it to
                                // make bindings in comments work
                                this.parts.push({ type: 'node', index: -1 });
                            }
                        }
                    }
                }
            };
            _prepareTemplate(element);
            // Remove text binding nodes after the walk to not disturb the TreeWalker
            for (const n of nodesToRemove) {
                n.parentNode.removeChild(n);
            }
        }
    }
    const isTemplatePartActive = (part) => part.index !== -1;
    // Allows `document.createComment('')` to be renamed for a
    // small manual size-savings.
    const createMarker = () => document.createComment('');
    /**
     * This regex extracts the attribute name preceding an attribute-position
     * expression. It does this by matching the syntax allowed for attributes
     * against the string literal directly preceding the expression, assuming that
     * the expression is in an attribute-value position.
     *
     * See attributes in the HTML spec:
     * https://www.w3.org/TR/html5/syntax.html#attributes-0
     *
     * "\0-\x1F\x7F-\x9F" are Unicode control characters
     *
     * " \x09\x0a\x0c\x0d" are HTML space characters:
     * https://www.w3.org/TR/html5/infrastructure.html#space-character
     *
     * So an attribute is:
     *  * The name: any character except a control character, space character, ('),
     *    ("), ">", "=", or "/"
     *  * Followed by zero or more space characters
     *  * Followed by "="
     *  * Followed by zero or more space characters
     *  * Followed by:
     *    * Any character except space, ('), ("), "<", ">", "=", (`), or
     *    * (") then any non-("), or
     *    * (') then any non-(')
     */
    const lastAttributeNameRegex = /([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F \x09\x0a\x0c\x0d"'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;

    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    /**
     * An instance of a `Template` that can be attached to the DOM and updated
     * with new values.
     */
    class TemplateInstance {
        constructor(template, processor, options) {
            this._parts = [];
            this.template = template;
            this.processor = processor;
            this.options = options;
        }
        update(values) {
            let i = 0;
            for (const part of this._parts) {
                if (part !== undefined) {
                    part.setValue(values[i]);
                }
                i++;
            }
            for (const part of this._parts) {
                if (part !== undefined) {
                    part.commit();
                }
            }
        }
        _clone() {
            // When using the Custom Elements polyfill, clone the node, rather than
            // importing it, to keep the fragment in the template's document. This
            // leaves the fragment inert so custom elements won't upgrade and
            // potentially modify their contents by creating a polyfilled ShadowRoot
            // while we traverse the tree.
            const fragment = isCEPolyfill ?
                this.template.element.content.cloneNode(true) :
                document.importNode(this.template.element.content, true);
            const parts = this.template.parts;
            let partIndex = 0;
            let nodeIndex = 0;
            const _prepareInstance = (fragment) => {
                // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be
                // null
                const walker = document.createTreeWalker(fragment, 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */, null, false);
                let node = walker.nextNode();
                // Loop through all the nodes and parts of a template
                while (partIndex < parts.length && node !== null) {
                    const part = parts[partIndex];
                    // Consecutive Parts may have the same node index, in the case of
                    // multiple bound attributes on an element. So each iteration we either
                    // increment the nodeIndex, if we aren't on a node with a part, or the
                    // partIndex if we are. By not incrementing the nodeIndex when we find a
                    // part, we allow for the next part to be associated with the current
                    // node if neccessasry.
                    if (!isTemplatePartActive(part)) {
                        this._parts.push(undefined);
                        partIndex++;
                    }
                    else if (nodeIndex === part.index) {
                        if (part.type === 'node') {
                            const part = this.processor.handleTextExpression(this.options);
                            part.insertAfterNode(node.previousSibling);
                            this._parts.push(part);
                        }
                        else {
                            this._parts.push(...this.processor.handleAttributeExpressions(node, part.name, part.strings, this.options));
                        }
                        partIndex++;
                    }
                    else {
                        nodeIndex++;
                        if (node.nodeName === 'TEMPLATE') {
                            _prepareInstance(node.content);
                        }
                        node = walker.nextNode();
                    }
                }
            };
            _prepareInstance(fragment);
            if (isCEPolyfill) {
                document.adoptNode(fragment);
                customElements.upgrade(fragment);
            }
            return fragment;
        }
    }

    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    /**
     * The return type of `html`, which holds a Template and the values from
     * interpolated expressions.
     */
    class TemplateResult {
        constructor(strings, values, type, processor) {
            this.strings = strings;
            this.values = values;
            this.type = type;
            this.processor = processor;
        }
        /**
         * Returns a string of HTML used to create a `<template>` element.
         */
        getHTML() {
            const endIndex = this.strings.length - 1;
            let html = '';
            for (let i = 0; i < endIndex; i++) {
                const s = this.strings[i];
                // This exec() call does two things:
                // 1) Appends a suffix to the bound attribute name to opt out of special
                // attribute value parsing that IE11 and Edge do, like for style and
                // many SVG attributes. The Template class also appends the same suffix
                // when looking up attributes to create Parts.
                // 2) Adds an unquoted-attribute-safe marker for the first expression in
                // an attribute. Subsequent attribute expressions will use node markers,
                // and this is safe since attributes with multiple expressions are
                // guaranteed to be quoted.
                const match = lastAttributeNameRegex.exec(s);
                if (match) {
                    // We're starting a new bound attribute.
                    // Add the safe attribute suffix, and use unquoted-attribute-safe
                    // marker.
                    html += s.substr(0, match.index) + match[1] + match[2] +
                        boundAttributeSuffix + match[3] + marker;
                }
                else {
                    // We're either in a bound node, or trailing bound attribute.
                    // Either way, nodeMarker is safe to use.
                    html += s + nodeMarker;
                }
            }
            return html + this.strings[endIndex];
        }
        getTemplateElement() {
            const template = document.createElement('template');
            template.innerHTML = this.getHTML();
            return template;
        }
    }

    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    const isPrimitive = (value) => {
        return (value === null ||
            !(typeof value === 'object' || typeof value === 'function'));
    };
    /**
     * Sets attribute values for AttributeParts, so that the value is only set once
     * even if there are multiple parts for an attribute.
     */
    class AttributeCommitter {
        constructor(element, name, strings) {
            this.dirty = true;
            this.element = element;
            this.name = name;
            this.strings = strings;
            this.parts = [];
            for (let i = 0; i < strings.length - 1; i++) {
                this.parts[i] = this._createPart();
            }
        }
        /**
         * Creates a single part. Override this to create a differnt type of part.
         */
        _createPart() {
            return new AttributePart(this);
        }
        _getValue() {
            const strings = this.strings;
            const l = strings.length - 1;
            let text = '';
            for (let i = 0; i < l; i++) {
                text += strings[i];
                const part = this.parts[i];
                if (part !== undefined) {
                    const v = part.value;
                    if (v != null &&
                        (Array.isArray(v) ||
                            // tslint:disable-next-line:no-any
                            typeof v !== 'string' && v[Symbol.iterator])) {
                        for (const t of v) {
                            text += typeof t === 'string' ? t : String(t);
                        }
                    }
                    else {
                        text += typeof v === 'string' ? v : String(v);
                    }
                }
            }
            text += strings[l];
            return text;
        }
        commit() {
            if (this.dirty) {
                this.dirty = false;
                this.element.setAttribute(this.name, this._getValue());
            }
        }
    }
    class AttributePart {
        constructor(comitter) {
            this.value = undefined;
            this.committer = comitter;
        }
        setValue(value) {
            if (value !== noChange && (!isPrimitive(value) || value !== this.value)) {
                this.value = value;
                // If the value is a not a directive, dirty the committer so that it'll
                // call setAttribute. If the value is a directive, it'll dirty the
                // committer if it calls setValue().
                if (!isDirective(value)) {
                    this.committer.dirty = true;
                }
            }
        }
        commit() {
            while (isDirective(this.value)) {
                const directive = this.value;
                this.value = noChange;
                directive(this);
            }
            if (this.value === noChange) {
                return;
            }
            this.committer.commit();
        }
    }
    class NodePart {
        constructor(options) {
            this.value = undefined;
            this._pendingValue = undefined;
            this.options = options;
        }
        /**
         * Inserts this part into a container.
         *
         * This part must be empty, as its contents are not automatically moved.
         */
        appendInto(container) {
            this.startNode = container.appendChild(createMarker());
            this.endNode = container.appendChild(createMarker());
        }
        /**
         * Inserts this part between `ref` and `ref`'s next sibling. Both `ref` and
         * its next sibling must be static, unchanging nodes such as those that appear
         * in a literal section of a template.
         *
         * This part must be empty, as its contents are not automatically moved.
         */
        insertAfterNode(ref) {
            this.startNode = ref;
            this.endNode = ref.nextSibling;
        }
        /**
         * Appends this part into a parent part.
         *
         * This part must be empty, as its contents are not automatically moved.
         */
        appendIntoPart(part) {
            part._insert(this.startNode = createMarker());
            part._insert(this.endNode = createMarker());
        }
        /**
         * Appends this part after `ref`
         *
         * This part must be empty, as its contents are not automatically moved.
         */
        insertAfterPart(ref) {
            ref._insert(this.startNode = createMarker());
            this.endNode = ref.endNode;
            ref.endNode = this.startNode;
        }
        setValue(value) {
            this._pendingValue = value;
        }
        commit() {
            while (isDirective(this._pendingValue)) {
                const directive = this._pendingValue;
                this._pendingValue = noChange;
                directive(this);
            }
            const value = this._pendingValue;
            if (value === noChange) {
                return;
            }
            if (isPrimitive(value)) {
                if (value !== this.value) {
                    this._commitText(value);
                }
            }
            else if (value instanceof TemplateResult) {
                this._commitTemplateResult(value);
            }
            else if (value instanceof Node) {
                this._commitNode(value);
            }
            else if (Array.isArray(value) ||
                // tslint:disable-next-line:no-any
                value[Symbol.iterator]) {
                this._commitIterable(value);
            }
            else if (value === nothing) {
                this.value = nothing;
                this.clear();
            }
            else {
                // Fallback, will render the string representation
                this._commitText(value);
            }
        }
        _insert(node) {
            this.endNode.parentNode.insertBefore(node, this.endNode);
        }
        _commitNode(value) {
            if (this.value === value) {
                return;
            }
            this.clear();
            this._insert(value);
            this.value = value;
        }
        _commitText(value) {
            const node = this.startNode.nextSibling;
            value = value == null ? '' : value;
            if (node === this.endNode.previousSibling &&
                node.nodeType === 3 /* Node.TEXT_NODE */) {
                // If we only have a single text node between the markers, we can just
                // set its value, rather than replacing it.
                // TODO(justinfagnani): Can we just check if this.value is primitive?
                node.data = value;
            }
            else {
                this._commitNode(document.createTextNode(typeof value === 'string' ? value : String(value)));
            }
            this.value = value;
        }
        _commitTemplateResult(value) {
            const template = this.options.templateFactory(value);
            if (this.value instanceof TemplateInstance &&
                this.value.template === template) {
                this.value.update(value.values);
            }
            else {
                // Make sure we propagate the template processor from the TemplateResult
                // so that we use its syntax extension, etc. The template factory comes
                // from the render function options so that it can control template
                // caching and preprocessing.
                const instance = new TemplateInstance(template, value.processor, this.options);
                const fragment = instance._clone();
                instance.update(value.values);
                this._commitNode(fragment);
                this.value = instance;
            }
        }
        _commitIterable(value) {
            // For an Iterable, we create a new InstancePart per item, then set its
            // value to the item. This is a little bit of overhead for every item in
            // an Iterable, but it lets us recurse easily and efficiently update Arrays
            // of TemplateResults that will be commonly returned from expressions like:
            // array.map((i) => html`${i}`), by reusing existing TemplateInstances.
            // If _value is an array, then the previous render was of an
            // iterable and _value will contain the NodeParts from the previous
            // render. If _value is not an array, clear this part and make a new
            // array for NodeParts.
            if (!Array.isArray(this.value)) {
                this.value = [];
                this.clear();
            }
            // Lets us keep track of how many items we stamped so we can clear leftover
            // items from a previous render
            const itemParts = this.value;
            let partIndex = 0;
            let itemPart;
            for (const item of value) {
                // Try to reuse an existing part
                itemPart = itemParts[partIndex];
                // If no existing part, create a new one
                if (itemPart === undefined) {
                    itemPart = new NodePart(this.options);
                    itemParts.push(itemPart);
                    if (partIndex === 0) {
                        itemPart.appendIntoPart(this);
                    }
                    else {
                        itemPart.insertAfterPart(itemParts[partIndex - 1]);
                    }
                }
                itemPart.setValue(item);
                itemPart.commit();
                partIndex++;
            }
            if (partIndex < itemParts.length) {
                // Truncate the parts array so _value reflects the current state
                itemParts.length = partIndex;
                this.clear(itemPart && itemPart.endNode);
            }
        }
        clear(startNode = this.startNode) {
            removeNodes(this.startNode.parentNode, startNode.nextSibling, this.endNode);
        }
    }
    /**
     * Implements a boolean attribute, roughly as defined in the HTML
     * specification.
     *
     * If the value is truthy, then the attribute is present with a value of
     * ''. If the value is falsey, the attribute is removed.
     */
    class BooleanAttributePart {
        constructor(element, name, strings) {
            this.value = undefined;
            this._pendingValue = undefined;
            if (strings.length !== 2 || strings[0] !== '' || strings[1] !== '') {
                throw new Error('Boolean attributes can only contain a single expression');
            }
            this.element = element;
            this.name = name;
            this.strings = strings;
        }
        setValue(value) {
            this._pendingValue = value;
        }
        commit() {
            while (isDirective(this._pendingValue)) {
                const directive = this._pendingValue;
                this._pendingValue = noChange;
                directive(this);
            }
            if (this._pendingValue === noChange) {
                return;
            }
            const value = !!this._pendingValue;
            if (this.value !== value) {
                if (value) {
                    this.element.setAttribute(this.name, '');
                }
                else {
                    this.element.removeAttribute(this.name);
                }
            }
            this.value = value;
            this._pendingValue = noChange;
        }
    }
    /**
     * Sets attribute values for PropertyParts, so that the value is only set once
     * even if there are multiple parts for a property.
     *
     * If an expression controls the whole property value, then the value is simply
     * assigned to the property under control. If there are string literals or
     * multiple expressions, then the strings are expressions are interpolated into
     * a string first.
     */
    class PropertyCommitter extends AttributeCommitter {
        constructor(element, name, strings) {
            super(element, name, strings);
            this.single =
                (strings.length === 2 && strings[0] === '' && strings[1] === '');
        }
        _createPart() {
            return new PropertyPart(this);
        }
        _getValue() {
            if (this.single) {
                return this.parts[0].value;
            }
            return super._getValue();
        }
        commit() {
            if (this.dirty) {
                this.dirty = false;
                // tslint:disable-next-line:no-any
                this.element[this.name] = this._getValue();
            }
        }
    }
    class PropertyPart extends AttributePart {
    }
    // Detect event listener options support. If the `capture` property is read
    // from the options object, then options are supported. If not, then the thrid
    // argument to add/removeEventListener is interpreted as the boolean capture
    // value so we should only pass the `capture` property.
    let eventOptionsSupported = false;
    try {
        const options = {
            get capture() {
                eventOptionsSupported = true;
                return false;
            }
        };
        // tslint:disable-next-line:no-any
        window.addEventListener('test', options, options);
        // tslint:disable-next-line:no-any
        window.removeEventListener('test', options, options);
    }
    catch (_e) {
    }
    class EventPart {
        constructor(element, eventName, eventContext) {
            this.value = undefined;
            this._pendingValue = undefined;
            this.element = element;
            this.eventName = eventName;
            this.eventContext = eventContext;
            this._boundHandleEvent = (e) => this.handleEvent(e);
        }
        setValue(value) {
            this._pendingValue = value;
        }
        commit() {
            while (isDirective(this._pendingValue)) {
                const directive = this._pendingValue;
                this._pendingValue = noChange;
                directive(this);
            }
            if (this._pendingValue === noChange) {
                return;
            }
            const newListener = this._pendingValue;
            const oldListener = this.value;
            const shouldRemoveListener = newListener == null ||
                oldListener != null &&
                    (newListener.capture !== oldListener.capture ||
                        newListener.once !== oldListener.once ||
                        newListener.passive !== oldListener.passive);
            const shouldAddListener = newListener != null && (oldListener == null || shouldRemoveListener);
            if (shouldRemoveListener) {
                this.element.removeEventListener(this.eventName, this._boundHandleEvent, this._options);
            }
            if (shouldAddListener) {
                this._options = getOptions(newListener);
                this.element.addEventListener(this.eventName, this._boundHandleEvent, this._options);
            }
            this.value = newListener;
            this._pendingValue = noChange;
        }
        handleEvent(event) {
            if (typeof this.value === 'function') {
                this.value.call(this.eventContext || this.element, event);
            }
            else {
                this.value.handleEvent(event);
            }
        }
    }
    // We copy options because of the inconsistent behavior of browsers when reading
    // the third argument of add/removeEventListener. IE11 doesn't support options
    // at all. Chrome 41 only reads `capture` if the argument is an object.
    const getOptions = (o) => o &&
        (eventOptionsSupported ?
            { capture: o.capture, passive: o.passive, once: o.once } :
            o.capture);

    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    /**
     * Creates Parts when a template is instantiated.
     */
    class DefaultTemplateProcessor {
        /**
         * Create parts for an attribute-position binding, given the event, attribute
         * name, and string literals.
         *
         * @param element The element containing the binding
         * @param name  The attribute name
         * @param strings The string literals. There are always at least two strings,
         *   event for fully-controlled bindings with a single expression.
         */
        handleAttributeExpressions(element, name, strings, options) {
            const prefix = name[0];
            if (prefix === '.') {
                const comitter = new PropertyCommitter(element, name.slice(1), strings);
                return comitter.parts;
            }
            if (prefix === '@') {
                return [new EventPart(element, name.slice(1), options.eventContext)];
            }
            if (prefix === '?') {
                return [new BooleanAttributePart(element, name.slice(1), strings)];
            }
            const comitter = new AttributeCommitter(element, name, strings);
            return comitter.parts;
        }
        /**
         * Create parts for a text-position binding.
         * @param templateFactory
         */
        handleTextExpression(options) {
            return new NodePart(options);
        }
    }
    const defaultTemplateProcessor = new DefaultTemplateProcessor();

    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    /**
     * The default TemplateFactory which caches Templates keyed on
     * result.type and result.strings.
     */
    function templateFactory(result) {
        let templateCache = templateCaches.get(result.type);
        if (templateCache === undefined) {
            templateCache = {
                stringsArray: new WeakMap(),
                keyString: new Map()
            };
            templateCaches.set(result.type, templateCache);
        }
        let template = templateCache.stringsArray.get(result.strings);
        if (template !== undefined) {
            return template;
        }
        // If the TemplateStringsArray is new, generate a key from the strings
        // This key is shared between all templates with identical content
        const key = result.strings.join(marker);
        // Check if we already have a Template for this key
        template = templateCache.keyString.get(key);
        if (template === undefined) {
            // If we have not seen this key before, create a new Template
            template = new Template(result, result.getTemplateElement());
            // Cache the Template for this key
            templateCache.keyString.set(key, template);
        }
        // Cache all future queries for this TemplateStringsArray
        templateCache.stringsArray.set(result.strings, template);
        return template;
    }
    const templateCaches = new Map();

    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    const parts = new WeakMap();
    /**
     * Renders a template to a container.
     *
     * To update a container with new values, reevaluate the template literal and
     * call `render` with the new result.
     *
     * @param result a TemplateResult created by evaluating a template tag like
     *     `html` or `svg`.
     * @param container A DOM parent to render to. The entire contents are either
     *     replaced, or efficiently updated if the same result type was previous
     *     rendered there.
     * @param options RenderOptions for the entire render tree rendered to this
     *     container. Render options must *not* change between renders to the same
     *     container, as those changes will not effect previously rendered DOM.
     */
    const render = (result, container, options) => {
        let part = parts.get(container);
        if (part === undefined) {
            removeNodes(container, container.firstChild);
            parts.set(container, part = new NodePart(Object.assign({ templateFactory }, options)));
            part.appendInto(container);
        }
        part.setValue(result);
        part.commit();
    };

    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    // IMPORTANT: do not change the property name or the assignment expression.
    // This line will be used in regexes to search for lit-html usage.
    // TODO(justinfagnani): inject version number at build time
    (window['litHtmlVersions'] || (window['litHtmlVersions'] = [])).push('1.0.0');
    /**
     * Interprets a template literal as an HTML template that can efficiently
     * render to and update a container.
     */
    const html = (strings, ...values) => new TemplateResult(strings, values, 'html', defaultTemplateProcessor);

    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    const walkerNodeFilter = 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */;
    /**
     * Removes the list of nodes from a Template safely. In addition to removing
     * nodes from the Template, the Template part indices are updated to match
     * the mutated Template DOM.
     *
     * As the template is walked the removal state is tracked and
     * part indices are adjusted as needed.
     *
     * div
     *   div#1 (remove) <-- start removing (removing node is div#1)
     *     div
     *       div#2 (remove)  <-- continue removing (removing node is still div#1)
     *         div
     * div <-- stop removing since previous sibling is the removing node (div#1,
     * removed 4 nodes)
     */
    function removeNodesFromTemplate(template, nodesToRemove) {
        const { element: { content }, parts } = template;
        const walker = document.createTreeWalker(content, walkerNodeFilter, null, false);
        let partIndex = nextActiveIndexInTemplateParts(parts);
        let part = parts[partIndex];
        let nodeIndex = -1;
        let removeCount = 0;
        const nodesToRemoveInTemplate = [];
        let currentRemovingNode = null;
        while (walker.nextNode()) {
            nodeIndex++;
            const node = walker.currentNode;
            // End removal if stepped past the removing node
            if (node.previousSibling === currentRemovingNode) {
                currentRemovingNode = null;
            }
            // A node to remove was found in the template
            if (nodesToRemove.has(node)) {
                nodesToRemoveInTemplate.push(node);
                // Track node we're removing
                if (currentRemovingNode === null) {
                    currentRemovingNode = node;
                }
            }
            // When removing, increment count by which to adjust subsequent part indices
            if (currentRemovingNode !== null) {
                removeCount++;
            }
            while (part !== undefined && part.index === nodeIndex) {
                // If part is in a removed node deactivate it by setting index to -1 or
                // adjust the index as needed.
                part.index = currentRemovingNode !== null ? -1 : part.index - removeCount;
                // go to the next active part.
                partIndex = nextActiveIndexInTemplateParts(parts, partIndex);
                part = parts[partIndex];
            }
        }
        nodesToRemoveInTemplate.forEach((n) => n.parentNode.removeChild(n));
    }
    const countNodes = (node) => {
        let count = (node.nodeType === 11 /* Node.DOCUMENT_FRAGMENT_NODE */) ? 0 : 1;
        const walker = document.createTreeWalker(node, walkerNodeFilter, null, false);
        while (walker.nextNode()) {
            count++;
        }
        return count;
    };
    const nextActiveIndexInTemplateParts = (parts, startIndex = -1) => {
        for (let i = startIndex + 1; i < parts.length; i++) {
            const part = parts[i];
            if (isTemplatePartActive(part)) {
                return i;
            }
        }
        return -1;
    };
    /**
     * Inserts the given node into the Template, optionally before the given
     * refNode. In addition to inserting the node into the Template, the Template
     * part indices are updated to match the mutated Template DOM.
     */
    function insertNodeIntoTemplate(template, node, refNode = null) {
        const { element: { content }, parts } = template;
        // If there's no refNode, then put node at end of template.
        // No part indices need to be shifted in this case.
        if (refNode === null || refNode === undefined) {
            content.appendChild(node);
            return;
        }
        const walker = document.createTreeWalker(content, walkerNodeFilter, null, false);
        let partIndex = nextActiveIndexInTemplateParts(parts);
        let insertCount = 0;
        let walkerIndex = -1;
        while (walker.nextNode()) {
            walkerIndex++;
            const walkerNode = walker.currentNode;
            if (walkerNode === refNode) {
                insertCount = countNodes(node);
                refNode.parentNode.insertBefore(node, refNode);
            }
            while (partIndex !== -1 && parts[partIndex].index === walkerIndex) {
                // If we've inserted the node, simply adjust all subsequent parts
                if (insertCount > 0) {
                    while (partIndex !== -1) {
                        parts[partIndex].index += insertCount;
                        partIndex = nextActiveIndexInTemplateParts(parts, partIndex);
                    }
                    return;
                }
                partIndex = nextActiveIndexInTemplateParts(parts, partIndex);
            }
        }
    }

    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    // Get a key to lookup in `templateCaches`.
    const getTemplateCacheKey = (type, scopeName) => `${type}--${scopeName}`;
    let compatibleShadyCSSVersion = true;
    if (typeof window.ShadyCSS === 'undefined') {
        compatibleShadyCSSVersion = false;
    }
    else if (typeof window.ShadyCSS.prepareTemplateDom === 'undefined') {
        console.warn(`Incompatible ShadyCSS version detected.` +
            `Please update to at least @webcomponents/webcomponentsjs@2.0.2 and` +
            `@webcomponents/shadycss@1.3.1.`);
        compatibleShadyCSSVersion = false;
    }
    /**
     * Template factory which scopes template DOM using ShadyCSS.
     * @param scopeName {string}
     */
    const shadyTemplateFactory = (scopeName) => (result) => {
        const cacheKey = getTemplateCacheKey(result.type, scopeName);
        let templateCache = templateCaches.get(cacheKey);
        if (templateCache === undefined) {
            templateCache = {
                stringsArray: new WeakMap(),
                keyString: new Map()
            };
            templateCaches.set(cacheKey, templateCache);
        }
        let template = templateCache.stringsArray.get(result.strings);
        if (template !== undefined) {
            return template;
        }
        const key = result.strings.join(marker);
        template = templateCache.keyString.get(key);
        if (template === undefined) {
            const element = result.getTemplateElement();
            if (compatibleShadyCSSVersion) {
                window.ShadyCSS.prepareTemplateDom(element, scopeName);
            }
            template = new Template(result, element);
            templateCache.keyString.set(key, template);
        }
        templateCache.stringsArray.set(result.strings, template);
        return template;
    };
    const TEMPLATE_TYPES = ['html', 'svg'];
    /**
     * Removes all style elements from Templates for the given scopeName.
     */
    const removeStylesFromLitTemplates = (scopeName) => {
        TEMPLATE_TYPES.forEach((type) => {
            const templates = templateCaches.get(getTemplateCacheKey(type, scopeName));
            if (templates !== undefined) {
                templates.keyString.forEach((template) => {
                    const { element: { content } } = template;
                    // IE 11 doesn't support the iterable param Set constructor
                    const styles = new Set();
                    Array.from(content.querySelectorAll('style')).forEach((s) => {
                        styles.add(s);
                    });
                    removeNodesFromTemplate(template, styles);
                });
            }
        });
    };
    const shadyRenderSet = new Set();
    /**
     * For the given scope name, ensures that ShadyCSS style scoping is performed.
     * This is done just once per scope name so the fragment and template cannot
     * be modified.
     * (1) extracts styles from the rendered fragment and hands them to ShadyCSS
     * to be scoped and appended to the document
     * (2) removes style elements from all lit-html Templates for this scope name.
     *
     * Note, <style> elements can only be placed into templates for the
     * initial rendering of the scope. If <style> elements are included in templates
     * dynamically rendered to the scope (after the first scope render), they will
     * not be scoped and the <style> will be left in the template and rendered
     * output.
     */
    const prepareTemplateStyles = (renderedDOM, template, scopeName) => {
        shadyRenderSet.add(scopeName);
        // Move styles out of rendered DOM and store.
        const styles = renderedDOM.querySelectorAll('style');
        // If there are no styles, skip unnecessary work
        if (styles.length === 0) {
            // Ensure prepareTemplateStyles is called to support adding
            // styles via `prepareAdoptedCssText` since that requires that
            // `prepareTemplateStyles` is called.
            window.ShadyCSS.prepareTemplateStyles(template.element, scopeName);
            return;
        }
        const condensedStyle = document.createElement('style');
        // Collect styles into a single style. This helps us make sure ShadyCSS
        // manipulations will not prevent us from being able to fix up template
        // part indices.
        // NOTE: collecting styles is inefficient for browsers but ShadyCSS
        // currently does this anyway. When it does not, this should be changed.
        for (let i = 0; i < styles.length; i++) {
            const style = styles[i];
            style.parentNode.removeChild(style);
            condensedStyle.textContent += style.textContent;
        }
        // Remove styles from nested templates in this scope.
        removeStylesFromLitTemplates(scopeName);
        // And then put the condensed style into the "root" template passed in as
        // `template`.
        insertNodeIntoTemplate(template, condensedStyle, template.element.content.firstChild);
        // Note, it's important that ShadyCSS gets the template that `lit-html`
        // will actually render so that it can update the style inside when
        // needed (e.g. @apply native Shadow DOM case).
        window.ShadyCSS.prepareTemplateStyles(template.element, scopeName);
        if (window.ShadyCSS.nativeShadow) {
            // When in native Shadow DOM, re-add styling to rendered content using
            // the style ShadyCSS produced.
            const style = template.element.content.querySelector('style');
            renderedDOM.insertBefore(style.cloneNode(true), renderedDOM.firstChild);
        }
        else {
            // When not in native Shadow DOM, at this point ShadyCSS will have
            // removed the style from the lit template and parts will be broken as a
            // result. To fix this, we put back the style node ShadyCSS removed
            // and then tell lit to remove that node from the template.
            // NOTE, ShadyCSS creates its own style so we can safely add/remove
            // `condensedStyle` here.
            template.element.content.insertBefore(condensedStyle, template.element.content.firstChild);
            const removes = new Set();
            removes.add(condensedStyle);
            removeNodesFromTemplate(template, removes);
        }
    };
    /**
     * Extension to the standard `render` method which supports rendering
     * to ShadowRoots when the ShadyDOM (https://github.com/webcomponents/shadydom)
     * and ShadyCSS (https://github.com/webcomponents/shadycss) polyfills are used
     * or when the webcomponentsjs
     * (https://github.com/webcomponents/webcomponentsjs) polyfill is used.
     *
     * Adds a `scopeName` option which is used to scope element DOM and stylesheets
     * when native ShadowDOM is unavailable. The `scopeName` will be added to
     * the class attribute of all rendered DOM. In addition, any style elements will
     * be automatically re-written with this `scopeName` selector and moved out
     * of the rendered DOM and into the document `<head>`.
     *
     * It is common to use this render method in conjunction with a custom element
     * which renders a shadowRoot. When this is done, typically the element's
     * `localName` should be used as the `scopeName`.
     *
     * In addition to DOM scoping, ShadyCSS also supports a basic shim for css
     * custom properties (needed only on older browsers like IE11) and a shim for
     * a deprecated feature called `@apply` that supports applying a set of css
     * custom properties to a given location.
     *
     * Usage considerations:
     *
     * * Part values in `<style>` elements are only applied the first time a given
     * `scopeName` renders. Subsequent changes to parts in style elements will have
     * no effect. Because of this, parts in style elements should only be used for
     * values that will never change, for example parts that set scope-wide theme
     * values or parts which render shared style elements.
     *
     * * Note, due to a limitation of the ShadyDOM polyfill, rendering in a
     * custom element's `constructor` is not supported. Instead rendering should
     * either done asynchronously, for example at microtask timing (for example
     * `Promise.resolve()`), or be deferred until the first time the element's
     * `connectedCallback` runs.
     *
     * Usage considerations when using shimmed custom properties or `@apply`:
     *
     * * Whenever any dynamic changes are made which affect
     * css custom properties, `ShadyCSS.styleElement(element)` must be called
     * to update the element. There are two cases when this is needed:
     * (1) the element is connected to a new parent, (2) a class is added to the
     * element that causes it to match different custom properties.
     * To address the first case when rendering a custom element, `styleElement`
     * should be called in the element's `connectedCallback`.
     *
     * * Shimmed custom properties may only be defined either for an entire
     * shadowRoot (for example, in a `:host` rule) or via a rule that directly
     * matches an element with a shadowRoot. In other words, instead of flowing from
     * parent to child as do native css custom properties, shimmed custom properties
     * flow only from shadowRoots to nested shadowRoots.
     *
     * * When using `@apply` mixing css shorthand property names with
     * non-shorthand names (for example `border` and `border-width`) is not
     * supported.
     */
    const render$1 = (result, container, options) => {
        const scopeName = options.scopeName;
        const hasRendered = parts.has(container);
        const needsScoping = container instanceof ShadowRoot &&
            compatibleShadyCSSVersion && result instanceof TemplateResult;
        // Handle first render to a scope specially...
        const firstScopeRender = needsScoping && !shadyRenderSet.has(scopeName);
        // On first scope render, render into a fragment; this cannot be a single
        // fragment that is reused since nested renders can occur synchronously.
        const renderContainer = firstScopeRender ? document.createDocumentFragment() : container;
        render(result, renderContainer, Object.assign({ templateFactory: shadyTemplateFactory(scopeName) }, options));
        // When performing first scope render,
        // (1) We've rendered into a fragment so that there's a chance to
        // `prepareTemplateStyles` before sub-elements hit the DOM
        // (which might cause them to render based on a common pattern of
        // rendering in a custom element's `connectedCallback`);
        // (2) Scope the template with ShadyCSS one time only for this scope.
        // (3) Render the fragment into the container and make sure the
        // container knows its `part` is the one we just rendered. This ensures
        // DOM will be re-used on subsequent renders.
        if (firstScopeRender) {
            const part = parts.get(renderContainer);
            parts.delete(renderContainer);
            if (part.value instanceof TemplateInstance) {
                prepareTemplateStyles(renderContainer, part.value.template, scopeName);
            }
            removeNodes(container, container.firstChild);
            container.appendChild(renderContainer);
            parts.set(container, part);
        }
        // After elements have hit the DOM, update styling if this is the
        // initial render to this container.
        // This is needed whenever dynamic changes are made so it would be
        // safest to do every render; however, this would regress performance
        // so we leave it up to the user to call `ShadyCSSS.styleElement`
        // for dynamic changes.
        if (!hasRendered && needsScoping) {
            window.ShadyCSS.styleElement(container.host);
        }
    };

    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    /**
     * When using Closure Compiler, JSCompiler_renameProperty(property, object) is
     * replaced at compile time by the munged name for object[property]. We cannot
     * alias this function, so we have to use a small shim that has the same
     * behavior when not compiling.
     */
    window.JSCompiler_renameProperty =
        (prop, _obj) => prop;
    const defaultConverter = {
        toAttribute(value, type) {
            switch (type) {
                case Boolean:
                    return value ? '' : null;
                case Object:
                case Array:
                    // if the value is `null` or `undefined` pass this through
                    // to allow removing/no change behavior.
                    return value == null ? value : JSON.stringify(value);
            }
            return value;
        },
        fromAttribute(value, type) {
            switch (type) {
                case Boolean:
                    return value !== null;
                case Number:
                    return value === null ? null : Number(value);
                case Object:
                case Array:
                    return JSON.parse(value);
            }
            return value;
        }
    };
    /**
     * Change function that returns true if `value` is different from `oldValue`.
     * This method is used as the default for a property's `hasChanged` function.
     */
    const notEqual = (value, old) => {
        // This ensures (old==NaN, value==NaN) always returns false
        return old !== value && (old === old || value === value);
    };
    const defaultPropertyDeclaration = {
        attribute: true,
        type: String,
        converter: defaultConverter,
        reflect: false,
        hasChanged: notEqual
    };
    const microtaskPromise = Promise.resolve(true);
    const STATE_HAS_UPDATED = 1;
    const STATE_UPDATE_REQUESTED = 1 << 2;
    const STATE_IS_REFLECTING_TO_ATTRIBUTE = 1 << 3;
    const STATE_IS_REFLECTING_TO_PROPERTY = 1 << 4;
    const STATE_HAS_CONNECTED = 1 << 5;
    /**
     * Base element class which manages element properties and attributes. When
     * properties change, the `update` method is asynchronously called. This method
     * should be supplied by subclassers to render updates as desired.
     */
    class UpdatingElement extends HTMLElement {
        constructor() {
            super();
            this._updateState = 0;
            this._instanceProperties = undefined;
            this._updatePromise = microtaskPromise;
            this._hasConnectedResolver = undefined;
            /**
             * Map with keys for any properties that have changed since the last
             * update cycle with previous values.
             */
            this._changedProperties = new Map();
            /**
             * Map with keys of properties that should be reflected when updated.
             */
            this._reflectingProperties = undefined;
            this.initialize();
        }
        /**
         * Returns a list of attributes corresponding to the registered properties.
         * @nocollapse
         */
        static get observedAttributes() {
            // note: piggy backing on this to ensure we're finalized.
            this.finalize();
            const attributes = [];
            // Use forEach so this works even if for/of loops are compiled to for loops
            // expecting arrays
            this._classProperties.forEach((v, p) => {
                const attr = this._attributeNameForProperty(p, v);
                if (attr !== undefined) {
                    this._attributeToPropertyMap.set(attr, p);
                    attributes.push(attr);
                }
            });
            return attributes;
        }
        /**
         * Ensures the private `_classProperties` property metadata is created.
         * In addition to `finalize` this is also called in `createProperty` to
         * ensure the `@property` decorator can add property metadata.
         */
        /** @nocollapse */
        static _ensureClassProperties() {
            // ensure private storage for property declarations.
            if (!this.hasOwnProperty(JSCompiler_renameProperty('_classProperties', this))) {
                this._classProperties = new Map();
                // NOTE: Workaround IE11 not supporting Map constructor argument.
                const superProperties = Object.getPrototypeOf(this)._classProperties;
                if (superProperties !== undefined) {
                    superProperties.forEach((v, k) => this._classProperties.set(k, v));
                }
            }
        }
        /**
         * Creates a property accessor on the element prototype if one does not exist.
         * The property setter calls the property's `hasChanged` property option
         * or uses a strict identity check to determine whether or not to request
         * an update.
         * @nocollapse
         */
        static createProperty(name, options = defaultPropertyDeclaration) {
            // Note, since this can be called by the `@property` decorator which
            // is called before `finalize`, we ensure storage exists for property
            // metadata.
            this._ensureClassProperties();
            this._classProperties.set(name, options);
            // Do not generate an accessor if the prototype already has one, since
            // it would be lost otherwise and that would never be the user's intention;
            // Instead, we expect users to call `requestUpdate` themselves from
            // user-defined accessors. Note that if the super has an accessor we will
            // still overwrite it
            if (options.noAccessor || this.prototype.hasOwnProperty(name)) {
                return;
            }
            const key = typeof name === 'symbol' ? Symbol() : `__${name}`;
            Object.defineProperty(this.prototype, name, {
                // tslint:disable-next-line:no-any no symbol in index
                get() {
                    return this[key];
                },
                set(value) {
                    // tslint:disable-next-line:no-any no symbol in index
                    const oldValue = this[name];
                    // tslint:disable-next-line:no-any no symbol in index
                    this[key] = value;
                    this._requestUpdate(name, oldValue);
                },
                configurable: true,
                enumerable: true
            });
        }
        /**
         * Creates property accessors for registered properties and ensures
         * any superclasses are also finalized.
         * @nocollapse
         */
        static finalize() {
            if (this.hasOwnProperty(JSCompiler_renameProperty('finalized', this)) &&
                this.finalized) {
                return;
            }
            // finalize any superclasses
            const superCtor = Object.getPrototypeOf(this);
            if (typeof superCtor.finalize === 'function') {
                superCtor.finalize();
            }
            this.finalized = true;
            this._ensureClassProperties();
            // initialize Map populated in observedAttributes
            this._attributeToPropertyMap = new Map();
            // make any properties
            // Note, only process "own" properties since this element will inherit
            // any properties defined on the superClass, and finalization ensures
            // the entire prototype chain is finalized.
            if (this.hasOwnProperty(JSCompiler_renameProperty('properties', this))) {
                const props = this.properties;
                // support symbols in properties (IE11 does not support this)
                const propKeys = [
                    ...Object.getOwnPropertyNames(props),
                    ...(typeof Object.getOwnPropertySymbols === 'function') ?
                        Object.getOwnPropertySymbols(props) :
                        []
                ];
                // This for/of is ok because propKeys is an array
                for (const p of propKeys) {
                    // note, use of `any` is due to TypeSript lack of support for symbol in
                    // index types
                    // tslint:disable-next-line:no-any no symbol in index
                    this.createProperty(p, props[p]);
                }
            }
        }
        /**
         * Returns the property name for the given attribute `name`.
         * @nocollapse
         */
        static _attributeNameForProperty(name, options) {
            const attribute = options.attribute;
            return attribute === false ?
                undefined :
                (typeof attribute === 'string' ?
                    attribute :
                    (typeof name === 'string' ? name.toLowerCase() : undefined));
        }
        /**
         * Returns true if a property should request an update.
         * Called when a property value is set and uses the `hasChanged`
         * option for the property if present or a strict identity check.
         * @nocollapse
         */
        static _valueHasChanged(value, old, hasChanged = notEqual) {
            return hasChanged(value, old);
        }
        /**
         * Returns the property value for the given attribute value.
         * Called via the `attributeChangedCallback` and uses the property's
         * `converter` or `converter.fromAttribute` property option.
         * @nocollapse
         */
        static _propertyValueFromAttribute(value, options) {
            const type = options.type;
            const converter = options.converter || defaultConverter;
            const fromAttribute = (typeof converter === 'function' ? converter : converter.fromAttribute);
            return fromAttribute ? fromAttribute(value, type) : value;
        }
        /**
         * Returns the attribute value for the given property value. If this
         * returns undefined, the property will *not* be reflected to an attribute.
         * If this returns null, the attribute will be removed, otherwise the
         * attribute will be set to the value.
         * This uses the property's `reflect` and `type.toAttribute` property options.
         * @nocollapse
         */
        static _propertyValueToAttribute(value, options) {
            if (options.reflect === undefined) {
                return;
            }
            const type = options.type;
            const converter = options.converter;
            const toAttribute = converter && converter.toAttribute ||
                defaultConverter.toAttribute;
            return toAttribute(value, type);
        }
        /**
         * Performs element initialization. By default captures any pre-set values for
         * registered properties.
         */
        initialize() {
            this._saveInstanceProperties();
            // ensures first update will be caught by an early access of `updateComplete`
            this._requestUpdate();
        }
        /**
         * Fixes any properties set on the instance before upgrade time.
         * Otherwise these would shadow the accessor and break these properties.
         * The properties are stored in a Map which is played back after the
         * constructor runs. Note, on very old versions of Safari (<=9) or Chrome
         * (<=41), properties created for native platform properties like (`id` or
         * `name`) may not have default values set in the element constructor. On
         * these browsers native properties appear on instances and therefore their
         * default value will overwrite any element default (e.g. if the element sets
         * this.id = 'id' in the constructor, the 'id' will become '' since this is
         * the native platform default).
         */
        _saveInstanceProperties() {
            // Use forEach so this works even if for/of loops are compiled to for loops
            // expecting arrays
            this.constructor
                ._classProperties.forEach((_v, p) => {
                if (this.hasOwnProperty(p)) {
                    const value = this[p];
                    delete this[p];
                    if (!this._instanceProperties) {
                        this._instanceProperties = new Map();
                    }
                    this._instanceProperties.set(p, value);
                }
            });
        }
        /**
         * Applies previously saved instance properties.
         */
        _applyInstanceProperties() {
            // Use forEach so this works even if for/of loops are compiled to for loops
            // expecting arrays
            // tslint:disable-next-line:no-any
            this._instanceProperties.forEach((v, p) => this[p] = v);
            this._instanceProperties = undefined;
        }
        connectedCallback() {
            this._updateState = this._updateState | STATE_HAS_CONNECTED;
            // Ensure first connection completes an update. Updates cannot complete before
            // connection and if one is pending connection the `_hasConnectionResolver`
            // will exist. If so, resolve it to complete the update, otherwise
            // requestUpdate.
            if (this._hasConnectedResolver) {
                this._hasConnectedResolver();
                this._hasConnectedResolver = undefined;
            }
        }
        /**
         * Allows for `super.disconnectedCallback()` in extensions while
         * reserving the possibility of making non-breaking feature additions
         * when disconnecting at some point in the future.
         */
        disconnectedCallback() {
        }
        /**
         * Synchronizes property values when attributes change.
         */
        attributeChangedCallback(name, old, value) {
            if (old !== value) {
                this._attributeToProperty(name, value);
            }
        }
        _propertyToAttribute(name, value, options = defaultPropertyDeclaration) {
            const ctor = this.constructor;
            const attr = ctor._attributeNameForProperty(name, options);
            if (attr !== undefined) {
                const attrValue = ctor._propertyValueToAttribute(value, options);
                // an undefined value does not change the attribute.
                if (attrValue === undefined) {
                    return;
                }
                // Track if the property is being reflected to avoid
                // setting the property again via `attributeChangedCallback`. Note:
                // 1. this takes advantage of the fact that the callback is synchronous.
                // 2. will behave incorrectly if multiple attributes are in the reaction
                // stack at time of calling. However, since we process attributes
                // in `update` this should not be possible (or an extreme corner case
                // that we'd like to discover).
                // mark state reflecting
                this._updateState = this._updateState | STATE_IS_REFLECTING_TO_ATTRIBUTE;
                if (attrValue == null) {
                    this.removeAttribute(attr);
                }
                else {
                    this.setAttribute(attr, attrValue);
                }
                // mark state not reflecting
                this._updateState = this._updateState & ~STATE_IS_REFLECTING_TO_ATTRIBUTE;
            }
        }
        _attributeToProperty(name, value) {
            // Use tracking info to avoid deserializing attribute value if it was
            // just set from a property setter.
            if (this._updateState & STATE_IS_REFLECTING_TO_ATTRIBUTE) {
                return;
            }
            const ctor = this.constructor;
            const propName = ctor._attributeToPropertyMap.get(name);
            if (propName !== undefined) {
                const options = ctor._classProperties.get(propName) || defaultPropertyDeclaration;
                // mark state reflecting
                this._updateState = this._updateState | STATE_IS_REFLECTING_TO_PROPERTY;
                this[propName] =
                    // tslint:disable-next-line:no-any
                    ctor._propertyValueFromAttribute(value, options);
                // mark state not reflecting
                this._updateState = this._updateState & ~STATE_IS_REFLECTING_TO_PROPERTY;
            }
        }
        /**
         * This private version of `requestUpdate` does not access or return the
         * `updateComplete` promise. This promise can be overridden and is therefore
         * not free to access.
         */
        _requestUpdate(name, oldValue) {
            let shouldRequestUpdate = true;
            // If we have a property key, perform property update steps.
            if (name !== undefined) {
                const ctor = this.constructor;
                const options = ctor._classProperties.get(name) || defaultPropertyDeclaration;
                if (ctor._valueHasChanged(this[name], oldValue, options.hasChanged)) {
                    if (!this._changedProperties.has(name)) {
                        this._changedProperties.set(name, oldValue);
                    }
                    // Add to reflecting properties set.
                    // Note, it's important that every change has a chance to add the
                    // property to `_reflectingProperties`. This ensures setting
                    // attribute + property reflects correctly.
                    if (options.reflect === true &&
                        !(this._updateState & STATE_IS_REFLECTING_TO_PROPERTY)) {
                        if (this._reflectingProperties === undefined) {
                            this._reflectingProperties = new Map();
                        }
                        this._reflectingProperties.set(name, options);
                    }
                }
                else {
                    // Abort the request if the property should not be considered changed.
                    shouldRequestUpdate = false;
                }
            }
            if (!this._hasRequestedUpdate && shouldRequestUpdate) {
                this._enqueueUpdate();
            }
        }
        /**
         * Requests an update which is processed asynchronously. This should
         * be called when an element should update based on some state not triggered
         * by setting a property. In this case, pass no arguments. It should also be
         * called when manually implementing a property setter. In this case, pass the
         * property `name` and `oldValue` to ensure that any configured property
         * options are honored. Returns the `updateComplete` Promise which is resolved
         * when the update completes.
         *
         * @param name {PropertyKey} (optional) name of requesting property
         * @param oldValue {any} (optional) old value of requesting property
         * @returns {Promise} A Promise that is resolved when the update completes.
         */
        requestUpdate(name, oldValue) {
            this._requestUpdate(name, oldValue);
            return this.updateComplete;
        }
        /**
         * Sets up the element to asynchronously update.
         */
        async _enqueueUpdate() {
            // Mark state updating...
            this._updateState = this._updateState | STATE_UPDATE_REQUESTED;
            let resolve;
            let reject;
            const previousUpdatePromise = this._updatePromise;
            this._updatePromise = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            });
            try {
                // Ensure any previous update has resolved before updating.
                // This `await` also ensures that property changes are batched.
                await previousUpdatePromise;
            }
            catch (e) {
                // Ignore any previous errors. We only care that the previous cycle is
                // done. Any error should have been handled in the previous update.
            }
            // Make sure the element has connected before updating.
            if (!this._hasConnected) {
                await new Promise((res) => this._hasConnectedResolver = res);
            }
            try {
                const result = this.performUpdate();
                // If `performUpdate` returns a Promise, we await it. This is done to
                // enable coordinating updates with a scheduler. Note, the result is
                // checked to avoid delaying an additional microtask unless we need to.
                if (result != null) {
                    await result;
                }
            }
            catch (e) {
                reject(e);
            }
            resolve(!this._hasRequestedUpdate);
        }
        get _hasConnected() {
            return (this._updateState & STATE_HAS_CONNECTED);
        }
        get _hasRequestedUpdate() {
            return (this._updateState & STATE_UPDATE_REQUESTED);
        }
        get hasUpdated() {
            return (this._updateState & STATE_HAS_UPDATED);
        }
        /**
         * Performs an element update. Note, if an exception is thrown during the
         * update, `firstUpdated` and `updated` will not be called.
         *
         * You can override this method to change the timing of updates. If this
         * method is overridden, `super.performUpdate()` must be called.
         *
         * For instance, to schedule updates to occur just before the next frame:
         *
         * ```
         * protected async performUpdate(): Promise<unknown> {
         *   await new Promise((resolve) => requestAnimationFrame(() => resolve()));
         *   super.performUpdate();
         * }
         * ```
         */
        performUpdate() {
            // Mixin instance properties once, if they exist.
            if (this._instanceProperties) {
                this._applyInstanceProperties();
            }
            let shouldUpdate = false;
            const changedProperties = this._changedProperties;
            try {
                shouldUpdate = this.shouldUpdate(changedProperties);
                if (shouldUpdate) {
                    this.update(changedProperties);
                }
            }
            catch (e) {
                // Prevent `firstUpdated` and `updated` from running when there's an
                // update exception.
                shouldUpdate = false;
                throw e;
            }
            finally {
                // Ensure element can accept additional updates after an exception.
                this._markUpdated();
            }
            if (shouldUpdate) {
                if (!(this._updateState & STATE_HAS_UPDATED)) {
                    this._updateState = this._updateState | STATE_HAS_UPDATED;
                    this.firstUpdated(changedProperties);
                }
                this.updated(changedProperties);
            }
        }
        _markUpdated() {
            this._changedProperties = new Map();
            this._updateState = this._updateState & ~STATE_UPDATE_REQUESTED;
        }
        /**
         * Returns a Promise that resolves when the element has completed updating.
         * The Promise value is a boolean that is `true` if the element completed the
         * update without triggering another update. The Promise result is `false` if
         * a property was set inside `updated()`. If the Promise is rejected, an
         * exception was thrown during the update. This getter can be implemented to
         * await additional state. For example, it is sometimes useful to await a
         * rendered element before fulfilling this Promise. To do this, first await
         * `super.updateComplete` then any subsequent state.
         *
         * @returns {Promise} The Promise returns a boolean that indicates if the
         * update resolved without triggering another update.
         */
        get updateComplete() {
            return this._updatePromise;
        }
        /**
         * Controls whether or not `update` should be called when the element requests
         * an update. By default, this method always returns `true`, but this can be
         * customized to control when to update.
         *
         * * @param _changedProperties Map of changed properties with old values
         */
        shouldUpdate(_changedProperties) {
            return true;
        }
        /**
         * Updates the element. This method reflects property values to attributes.
         * It can be overridden to render and keep updated element DOM.
         * Setting properties inside this method will *not* trigger
         * another update.
         *
         * * @param _changedProperties Map of changed properties with old values
         */
        update(_changedProperties) {
            if (this._reflectingProperties !== undefined &&
                this._reflectingProperties.size > 0) {
                // Use forEach so this works even if for/of loops are compiled to for
                // loops expecting arrays
                this._reflectingProperties.forEach((v, k) => this._propertyToAttribute(k, this[k], v));
                this._reflectingProperties = undefined;
            }
        }
        /**
         * Invoked whenever the element is updated. Implement to perform
         * post-updating tasks via DOM APIs, for example, focusing an element.
         *
         * Setting properties inside this method will trigger the element to update
         * again after this update cycle completes.
         *
         * * @param _changedProperties Map of changed properties with old values
         */
        updated(_changedProperties) {
        }
        /**
         * Invoked when the element is first updated. Implement to perform one time
         * work on the element after update.
         *
         * Setting properties inside this method will trigger the element to update
         * again after this update cycle completes.
         *
         * * @param _changedProperties Map of changed properties with old values
         */
        firstUpdated(_changedProperties) {
        }
    }
    /**
     * Marks class as having finished creating properties.
     */
    UpdatingElement.finalized = true;

    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    const legacyCustomElement = (tagName, clazz) => {
        window.customElements.define(tagName, clazz);
        // Cast as any because TS doesn't recognize the return type as being a
        // subtype of the decorated class when clazz is typed as
        // `Constructor<HTMLElement>` for some reason.
        // `Constructor<HTMLElement>` is helpful to make sure the decorator is
        // applied to elements however.
        // tslint:disable-next-line:no-any
        return clazz;
    };
    const standardCustomElement = (tagName, descriptor) => {
        const { kind, elements } = descriptor;
        return {
            kind,
            elements,
            // This callback is called once the class is otherwise fully defined
            finisher(clazz) {
                window.customElements.define(tagName, clazz);
            }
        };
    };
    /**
     * Class decorator factory that defines the decorated class as a custom element.
     *
     * @param tagName the name of the custom element to define
     */
    const customElement = (tagName) => (classOrDescriptor) => (typeof classOrDescriptor === 'function') ?
        legacyCustomElement(tagName, classOrDescriptor) :
        standardCustomElement(tagName, classOrDescriptor);
    const standardProperty = (options, element) => {
        // When decorating an accessor, pass it through and add property metadata.
        // Note, the `hasOwnProperty` check in `createProperty` ensures we don't
        // stomp over the user's accessor.
        if (element.kind === 'method' && element.descriptor &&
            !('value' in element.descriptor)) {
            return Object.assign({}, element, { finisher(clazz) {
                    clazz.createProperty(element.key, options);
                } });
        }
        else {
            // createProperty() takes care of defining the property, but we still
            // must return some kind of descriptor, so return a descriptor for an
            // unused prototype field. The finisher calls createProperty().
            return {
                kind: 'field',
                key: Symbol(),
                placement: 'own',
                descriptor: {},
                // When @babel/plugin-proposal-decorators implements initializers,
                // do this instead of the initializer below. See:
                // https://github.com/babel/babel/issues/9260 extras: [
                //   {
                //     kind: 'initializer',
                //     placement: 'own',
                //     initializer: descriptor.initializer,
                //   }
                // ],
                // tslint:disable-next-line:no-any decorator
                initializer() {
                    if (typeof element.initializer === 'function') {
                        this[element.key] = element.initializer.call(this);
                    }
                },
                finisher(clazz) {
                    clazz.createProperty(element.key, options);
                }
            };
        }
    };
    const legacyProperty = (options, proto, name) => {
        proto.constructor
            .createProperty(name, options);
    };
    /**
     * A property decorator which creates a LitElement property which reflects a
     * corresponding attribute value. A `PropertyDeclaration` may optionally be
     * supplied to configure property features.
     *
     * @ExportDecoratedItems
     */
    function property(options) {
        // tslint:disable-next-line:no-any decorator
        return (protoOrDescriptor, name) => (name !== undefined) ?
            legacyProperty(options, protoOrDescriptor, name) :
            standardProperty(options, protoOrDescriptor);
    }
    /**
     * A property decorator that converts a class property into a getter that
     * executes a querySelector on the element's renderRoot.
     *
     * @ExportDecoratedItems
     */
    function query(selector) {
        return (protoOrDescriptor, 
        // tslint:disable-next-line:no-any decorator
        name) => {
            const descriptor = {
                get() {
                    return this.renderRoot.querySelector(selector);
                },
                enumerable: true,
                configurable: true,
            };
            return (name !== undefined) ?
                legacyQuery(descriptor, protoOrDescriptor, name) :
                standardQuery(descriptor, protoOrDescriptor);
        };
    }
    const legacyQuery = (descriptor, proto, name) => {
        Object.defineProperty(proto, name, descriptor);
    };
    const standardQuery = (descriptor, element) => ({
        kind: 'method',
        placement: 'prototype',
        key: element.key,
        descriptor,
    });

    /**
    @license
    Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
    This code may only be used under the BSD style license found at
    http://polymer.github.io/LICENSE.txt The complete set of authors may be found at
    http://polymer.github.io/AUTHORS.txt The complete set of contributors may be
    found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by Google as
    part of the polymer project is also subject to an additional IP rights grant
    found at http://polymer.github.io/PATENTS.txt
    */
    const supportsAdoptingStyleSheets = ('adoptedStyleSheets' in Document.prototype) &&
        ('replace' in CSSStyleSheet.prototype);
    const constructionToken = Symbol();
    class CSSResult {
        constructor(cssText, safeToken) {
            if (safeToken !== constructionToken) {
                throw new Error('CSSResult is not constructable. Use `unsafeCSS` or `css` instead.');
            }
            this.cssText = cssText;
        }
        // Note, this is a getter so that it's lazy. In practice, this means
        // stylesheets are not created until the first element instance is made.
        get styleSheet() {
            if (this._styleSheet === undefined) {
                // Note, if `adoptedStyleSheets` is supported then we assume CSSStyleSheet
                // is constructable.
                if (supportsAdoptingStyleSheets) {
                    this._styleSheet = new CSSStyleSheet();
                    this._styleSheet.replaceSync(this.cssText);
                }
                else {
                    this._styleSheet = null;
                }
            }
            return this._styleSheet;
        }
        toString() {
            return this.cssText;
        }
    }
    const textFromCSSResult = (value) => {
        if (value instanceof CSSResult) {
            return value.cssText;
        }
        else {
            throw new Error(`Value passed to 'css' function must be a 'css' function result: ${value}. Use 'unsafeCSS' to pass non-literal values, but
            take care to ensure page security.`);
        }
    };
    /**
     * Template tag which which can be used with LitElement's `style` property to
     * set element styles. For security reasons, only literal string values may be
     * used. To incorporate non-literal values `unsafeCSS` may be used inside a
     * template string part.
     */
    const css = (strings, ...values) => {
        const cssText = values.reduce((acc, v, idx) => acc + textFromCSSResult(v) + strings[idx + 1], strings[0]);
        return new CSSResult(cssText, constructionToken);
    };

    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    // IMPORTANT: do not change the property name or the assignment expression.
    // This line will be used in regexes to search for LitElement usage.
    // TODO(justinfagnani): inject version number at build time
    (window['litElementVersions'] || (window['litElementVersions'] = []))
        .push('2.0.1');
    /**
     * Minimal implementation of Array.prototype.flat
     * @param arr the array to flatten
     * @param result the accumlated result
     */
    function arrayFlat(styles, result = []) {
        for (let i = 0, length = styles.length; i < length; i++) {
            const value = styles[i];
            if (Array.isArray(value)) {
                arrayFlat(value, result);
            }
            else {
                result.push(value);
            }
        }
        return result;
    }
    /** Deeply flattens styles array. Uses native flat if available. */
    const flattenStyles = (styles) => styles.flat ? styles.flat(Infinity) : arrayFlat(styles);
    class LitElement extends UpdatingElement {
        /** @nocollapse */
        static finalize() {
            super.finalize();
            // Prepare styling that is stamped at first render time. Styling
            // is built from user provided `styles` or is inherited from the superclass.
            this._styles =
                this.hasOwnProperty(JSCompiler_renameProperty('styles', this)) ?
                    this._getUniqueStyles() :
                    this._styles || [];
        }
        /** @nocollapse */
        static _getUniqueStyles() {
            // Take care not to call `this.styles` multiple times since this generates
            // new CSSResults each time.
            // TODO(sorvell): Since we do not cache CSSResults by input, any
            // shared styles will generate new stylesheet objects, which is wasteful.
            // This should be addressed when a browser ships constructable
            // stylesheets.
            const userStyles = this.styles;
            const styles = [];
            if (Array.isArray(userStyles)) {
                const flatStyles = flattenStyles(userStyles);
                // As a performance optimization to avoid duplicated styling that can
                // occur especially when composing via subclassing, de-duplicate styles
                // preserving the last item in the list. The last item is kept to
                // try to preserve cascade order with the assumption that it's most
                // important that last added styles override previous styles.
                const styleSet = flatStyles.reduceRight((set, s) => {
                    set.add(s);
                    // on IE set.add does not return the set.
                    return set;
                }, new Set());
                // Array.from does not work on Set in IE
                styleSet.forEach((v) => styles.unshift(v));
            }
            else if (userStyles) {
                styles.push(userStyles);
            }
            return styles;
        }
        /**
         * Performs element initialization. By default this calls `createRenderRoot`
         * to create the element `renderRoot` node and captures any pre-set values for
         * registered properties.
         */
        initialize() {
            super.initialize();
            this.renderRoot =
                this.createRenderRoot();
            // Note, if renderRoot is not a shadowRoot, styles would/could apply to the
            // element's getRootNode(). While this could be done, we're choosing not to
            // support this now since it would require different logic around de-duping.
            if (window.ShadowRoot && this.renderRoot instanceof window.ShadowRoot) {
                this.adoptStyles();
            }
        }
        /**
         * Returns the node into which the element should render and by default
         * creates and returns an open shadowRoot. Implement to customize where the
         * element's DOM is rendered. For example, to render into the element's
         * childNodes, return `this`.
         * @returns {Element|DocumentFragment} Returns a node into which to render.
         */
        createRenderRoot() {
            return this.attachShadow({ mode: 'open' });
        }
        /**
         * Applies styling to the element shadowRoot using the `static get styles`
         * property. Styling will apply using `shadowRoot.adoptedStyleSheets` where
         * available and will fallback otherwise. When Shadow DOM is polyfilled,
         * ShadyCSS scopes styles and adds them to the document. When Shadow DOM
         * is available but `adoptedStyleSheets` is not, styles are appended to the
         * end of the `shadowRoot` to [mimic spec
         * behavior](https://wicg.github.io/construct-stylesheets/#using-constructed-stylesheets).
         */
        adoptStyles() {
            const styles = this.constructor._styles;
            if (styles.length === 0) {
                return;
            }
            // There are three separate cases here based on Shadow DOM support.
            // (1) shadowRoot polyfilled: use ShadyCSS
            // (2) shadowRoot.adoptedStyleSheets available: use it.
            // (3) shadowRoot.adoptedStyleSheets polyfilled: append styles after
            // rendering
            if (window.ShadyCSS !== undefined && !window.ShadyCSS.nativeShadow) {
                window.ShadyCSS.ScopingShim.prepareAdoptedCssText(styles.map((s) => s.cssText), this.localName);
            }
            else if (supportsAdoptingStyleSheets) {
                this.renderRoot.adoptedStyleSheets =
                    styles.map((s) => s.styleSheet);
            }
            else {
                // This must be done after rendering so the actual style insertion is done
                // in `update`.
                this._needsShimAdoptedStyleSheets = true;
            }
        }
        connectedCallback() {
            super.connectedCallback();
            // Note, first update/render handles styleElement so we only call this if
            // connected after first update.
            if (this.hasUpdated && window.ShadyCSS !== undefined) {
                window.ShadyCSS.styleElement(this);
            }
        }
        /**
         * Updates the element. This method reflects property values to attributes
         * and calls `render` to render DOM via lit-html. Setting properties inside
         * this method will *not* trigger another update.
         * * @param _changedProperties Map of changed properties with old values
         */
        update(changedProperties) {
            super.update(changedProperties);
            const templateResult = this.render();
            if (templateResult instanceof TemplateResult) {
                this.constructor
                    .render(templateResult, this.renderRoot, { scopeName: this.localName, eventContext: this });
            }
            // When native Shadow DOM is used but adoptedStyles are not supported,
            // insert styling after rendering to ensure adoptedStyles have highest
            // priority.
            if (this._needsShimAdoptedStyleSheets) {
                this._needsShimAdoptedStyleSheets = false;
                this.constructor._styles.forEach((s) => {
                    const style = document.createElement('style');
                    style.textContent = s.cssText;
                    this.renderRoot.appendChild(style);
                });
            }
        }
        /**
         * Invoked on each update to perform rendering tasks. This method must return
         * a lit-html TemplateResult. Setting properties inside this method will *not*
         * trigger the element to update.
         */
        render() {
        }
    }
    /**
     * Ensure this class is marked as `finalized` as an optimization ensuring
     * it will not needlessly try to `finalize`.
     */
    LitElement.finalized = true;
    /**
     * Render method used to render the lit-html TemplateResult to the element's
     * DOM.
     * @param {TemplateResult} Template to render.
     * @param {Element|DocumentFragment} Node into which to render.
     * @param {String} Element name.
     * @nocollapse
     */
    LitElement.render = render$1;

    class GuildElement extends LitElement {
        constructor() {
            super(...arguments);
            this.connected = false;
        }
        /**
         * Get element with specified ID in the element's shadow root
         * @param id Id of element
         */
        $(id) {
            return this.shadowRoot.querySelector(`#${id}`);
        }
        /**
         * Find first element macthing the slector in the element's shadow root.
         * @param selector query selector string
         */
        $$(selector) {
            return this.shadowRoot.querySelector(selector);
        }
        /**
         * Find all elements matching the selector in the element's shadow root.
         * @param selector query selector string
         */
        $$All(selector) {
            return this.shadowRoot.querySelectorAll(selector);
        }
        /**
         * Fires a custom event with the specified name
         * @param name Name of the event
         * @param detail Optional event detail object
         * @param bubbles Optional - if the event bubbles. Default is TRUE.
         * @param composed Optional - if the event bubbles past the shadow root. Default is TRUE.
         */
        fireEvent(name, detail, bubbles = true, composed = true) {
            if (name) {
                const init = {
                    bubbles: (typeof bubbles === 'boolean') ? bubbles : true,
                    composed: (typeof composed === 'boolean') ? composed : true
                };
                if (detail) {
                    init.detail = detail;
                }
                const CE = (window.SlickCustomEvent || CustomEvent);
                this.dispatchEvent(new CE(name, init));
            }
        }
        firstUpdated() {
            this.connected = true;
            this.fireEvent('render', {}, false, false);
        }
        disconnectedCallback() {
            super.disconnectedCallback();
            this.connected = false;
        }
    }
    function element(name) {
        return customElement(name);
    }

    function createUrl(path, baseUrl = '', params) {
        const url = new URL(path, baseUrl);
        if (params) {
            let q = '?';
            let first = true;
            for (const name in params) {
                q = `${q}${first ? '' : '&'}${name}=${encodeURIComponent(params[name])}`;
                first = false;
            }
            url.search = q;
        }
        return url.toString();
    }
    async function get(url, includeCredentials) {
        const init = { credentials: includeCredentials ? 'include' : 'same-origin' };
        const response = await fetch(url, init);
        if (!response.ok) {
            const message = await response.text();
            throw { status: response.status, message, response };
        }
        return (await response.json());
    }
    async function post(url, data, includeCredentials) {
        const init = { method: 'POST', credentials: includeCredentials ? 'include' : 'same-origin', body: JSON.stringify(data) };
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        init.headers = headers;
        const request = new Request(url, init);
        const response = await fetch(request);
        if (!response.ok) {
            const message = await response.text();
            throw { status: response.status, message, response };
        }
        return (await response.json());
    }
    function beacon(url, data) {
        const payload = (data && (typeof data !== 'string')) ? JSON.stringify(data) : (data || '');
        if (window.navigator.sendBeacon) {
            return window.navigator.sendBeacon(url, payload);
        }
        return false;
    }

    const store = {
        get(key, json = false) {
            if (!key)
                return null;
            const stored = localStorage.getItem(key);
            if (stored && json) {
                return JSON.parse(stored);
            }
            return stored;
        },
        set(key, value) {
            if (key && value) {
                if (typeof value === 'string') {
                    localStorage.setItem(key, value);
                }
                else {
                    localStorage.setItem(key, JSON.stringify(value));
                }
            }
        },
        delete(key) {
            if (key)
                localStorage.removeItem(key);
        }
    };
    const sessionStore = {
        get(key, json = false) {
            if (!key)
                return null;
            const stored = sessionStorage.getItem(key);
            if (stored && json) {
                return JSON.parse(stored);
            }
            return stored;
        },
        set(key, value) {
            if (key && value) {
                if (typeof value === 'string') {
                    sessionStorage.setItem(key, value);
                }
                else {
                    sessionStorage.setItem(key, JSON.stringify(value));
                }
            }
        },
        delete(key) {
            if (key)
                sessionStorage.removeItem(key);
        }
    };

    const KEY_READER_ID = 'slick-reader-id';
    class CoreBase {
        constructor() {
            this.scriptUrl = '';
            this.includeCredentials = false;
            const restHost = document.getElementById('restHost');
            if (restHost) {
                this.dRestRoot = restHost.getAttribute('href') || '';
            }
            else {
                this.dRestRoot = window.slickRestHost || '';
            }
            const pHost = document.getElementById('restPHost');
            if (pHost) {
                this.pRestRoot = pHost.getAttribute('href') || '';
            }
            else {
                this.pRestRoot = window.slickRoot || this.dRestRoot;
            }
            // init reader id
            this.readerId = store.get(KEY_READER_ID);
            if (!this.readerId) {
                this.readerId = `${Date.now()}.${Math.random() * Number.MAX_SAFE_INTEGER}`;
                store.set(KEY_READER_ID, this.readerId);
            }
        }
        getBaseUrl(dynamic) {
            const root = dynamic ? this.dRestRoot : this.pRestRoot;
            let baseUrl = root;
            if (this.scriptUrl && (!baseUrl)) {
                baseUrl = (new URL('/', this.scriptUrl)).toString();
            }
            if (!baseUrl.startsWith('http')) {
                baseUrl = (new URL(root, window.location.href)).toString();
            }
            return baseUrl;
        }
        pUrl(path, params) {
            return createUrl(`/p/${path}`, this.getBaseUrl(false), params);
        }
        dUrl(path, params) {
            return createUrl(`/d/${path}`, this.getBaseUrl(true), params);
        }
    }

    class MessageBus {
        constructor() {
            this.listeners = new Map();
            this.counter = 0;
        }
        subscribe(name, handler) {
            if (!this.listeners.has(name)) {
                this.listeners.set(name, new Map());
            }
            this.listeners.get(name).set(++this.counter, handler);
            return this.counter;
        }
        unsubscrive(name, token) {
            if (this.listeners.has(name)) {
                return this.listeners.get(name).delete(token);
            }
            return false;
        }
        async dispatch(name, value) {
            const map = this.listeners.get(name);
            if (map) {
                map.forEach(async (handler) => {
                    try {
                        await handler(name, value);
                    }
                    catch (err) {
                        console.error(err);
                    }
                });
            }
        }
    }
    const bus = new MessageBus();

    function validateEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }
    function debounce(func, wait, immediate, context) {
        let timeout = 0;
        return () => {
            const args = arguments;
            const later = () => {
                timeout = 0;
                if (!immediate) {
                    func.apply(context, args);
                }
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = window.setTimeout(later, wait);
            if (callNow) {
                func.apply(context, args);
            }
        };
    }
    async function delay(interval) {
        return new Promise((resolve) => {
            setTimeout(resolve, interval);
        });
    }
    function SlickCustomEvent(name, detail) {
        const init = {
            bubbles: true,
            composed: true
        };
        if (detail) {
            init.detail = detail;
        }
        const CE = (window.SlickCustomEvent || CustomEvent);
        return new CE(name, init);
    }

    class PrebidMonitor {
        constructor(core) {
            this.reportedBids = new Set();
            this.prebid = null;
            this.core = core;
        }
        async run() {
            if (!this.prebid) {
                this.prebid = await this.waitForPrebid();
            }
            if (this.prebid && this.prebid.getAllWinningBids) {
                const ads = this.prebid.getAllWinningBids() || [];
                await this.reportAds(ads);
                this.prebid.onEvent('bidWon', (data) => {
                    if (data && data.adId) {
                        this.reportAds([data]);
                    }
                });
            }
        }
        async reportAds(ads) {
            const clonedAds = ads.map((ad) => this.cloneAd(ad)).filter((ad) => {
                return !this.reportedBids.has(ad.adId);
            });
            if (clonedAds.length) {
                clonedAds.forEach((ad) => {
                    if (ad.adId) {
                        this.reportedBids.add(ad.adId);
                    }
                });
                await this.core.reportPageAction('pbjs-bidwon', undefined, { bids: clonedAds });
            }
        }
        cloneAd(ad) {
            const clone = JSON.parse(JSON.stringify(ad));
            delete clone.ad;
            return clone;
        }
        async waitForPrebid() {
            if (window.pbjs) {
                return window.pbjs;
            }
            for (let i = 0; i < 10; i++) {
                await delay(1000);
                if (window.pbjs) {
                    return window.pbjs;
                }
            }
            return null;
        }
    }

    const PROTOCOL = 'SLICK_CLIENT_1';
    const SOCKET_PING_INTERVAL = 30000;
    const SOCKET_PING_TIMEOUT = 40000;
    const RETRY_INTERVAL = 5000;
    class SocketManager {
        constructor(session, activityHelper) {
            this.reconnectTimer = 0;
            this.reconnectCounter = 0;
            this.pendingMessages = [];
            this.pingTimer = 0;
            this.lastPong = 0;
            this.closeListener = this.onSocketClosed.bind(this); // listener for when socket closes
            this.messageListener = this.onSocketMessage.bind(this); // listener for messages
            this.messageIdCounter = 0; // counter to create new message ids
            this.requestMap = new Map(); // Map to store 'request' promisies which are resolved when error/response is received
            this.sessionRequest = session;
            this.activityHelper = activityHelper;
            this.uri = window.slickSocketUri;
            if (this.uri.indexOf('?') >= 0) {
                const split = this.uri.split('?');
                this.uri = [split[0], '?site=', session.site].join('');
            }
            else {
                this.uri = [this.uri, '?site=', session.site].join('');
            }
            document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this), false);
        }
        send(direction, type, payload = {}, messageId) {
            const msg = {
                at: Date.now(),
                messageId: messageId || this.nextId(),
                direction,
                payload
            };
            if (type) {
                msg.msgType = type;
            }
            if (this.socket) {
                this.sendMessage(msg);
            }
            else {
                this.pendingMessages.push(msg);
            }
        }
        async request(msgType, payload, timeout = 8000) {
            const msgId = this.nextId();
            return new Promise((resolve, reject) => {
                this.requestMap.set(msgId, [resolve, reject]);
                window.setTimeout(() => this.handleTimeout(msgId), timeout);
                this.send('request', msgType, payload, msgId);
            });
        }
        async ensureSession() {
            if (this.pendingEnsureSession) {
                return Promise.resolve(this.pendingEnsureSession);
            }
            if (this.isConnected() && this.sessionResponse) {
                return this.sessionResponse;
            }
            this.pendingEnsureSession = new Promise(async (resolve, reject) => {
                try {
                    await this.reconnectSocket();
                    console.log('Socket session established!', this.sessionResponse);
                    this.reconnectCounter = 0;
                    if (this.sessionResponse) {
                        this.pendingEnsureSession = undefined;
                        resolve(this.sessionResponse);
                    }
                    else {
                        throw new Error('Failed to establish session');
                    }
                }
                catch (err) {
                    this.pendingEnsureSession = undefined;
                    setTimeout(() => {
                        this.reconnect(true);
                    });
                    reject(err);
                }
            });
            return Promise.resolve(this.pendingEnsureSession);
        }
        // PRIVATE
        nextId() {
            return ++this.messageIdCounter;
        }
        sendMessage(message) {
            if (this.isConnected()) {
                this.socket.send(JSON.stringify(message));
                return true;
            }
            return false;
        }
        isConnected() {
            return !!(this.socket && this.socket.readyState === WebSocket.OPEN);
        }
        async reconnectSocket() {
            this.disconnect();
            await this.openSocket();
            this.detachSocketLiseteners();
            this.attachSocketListeners();
            // session
            if (!this.sessionResponse) {
                this.sessionResponse = await this.request('start-session', this.sessionRequest);
            }
            else {
                const payload = {
                    site: this.sessionRequest.site,
                    reader: this.sessionRequest.reader,
                    start: this.sessionRequest.start,
                    clientVersion: this.sessionRequest.clientVersion
                };
                const response = await this.request('restart-session', payload);
                if (this.sessionResponse.currentPage) {
                    this.sessionResponse.currentPage.totalFavorites = response.totalFavorites;
                    this.sessionResponse.currentPage.isFavorite = response.isFavorite;
                }
                this.sessionResponse.activeVisitors = response.activeVisitors;
            }
            setTimeout(() => {
                bus.dispatch('session-updated', this.sessionResponse);
            });
            // start pinging
            this.startPinging();
            // Process pending messages
            while (this.pendingMessages.length > 0) {
                const m = this.pendingMessages.splice(0, 1)[0];
                this.sendMessage(m);
            }
        }
        async openSocket() {
            if (!this.uri) {
                console.warn('window.slickSocketUri is missing - no connection established');
                return;
            }
            this.socket = new WebSocket(this.uri, PROTOCOL);
            return new Promise((resolve, reject) => {
                const onError = (event) => {
                    console.log('Failed to connect web socket', event);
                    if (this.socket) {
                        this.socket.removeEventListener('error', onError);
                        this.socket.removeEventListener('open', onOpen);
                    }
                    reject(new Error('Web socket failed to connect'));
                };
                const onOpen = () => {
                    if (this.socket) {
                        this.socket.removeEventListener('error', onError);
                        this.socket.removeEventListener('open', onOpen);
                    }
                    resolve();
                };
                if (this.socket) {
                    this.socket.addEventListener('error', onError);
                    this.socket.addEventListener('open', onOpen);
                }
            });
        }
        attachSocketListeners() {
            if (this.socket) {
                this.socket.addEventListener('close', this.closeListener);
                this.socket.addEventListener('message', this.messageListener);
            }
        }
        detachSocketLiseteners() {
            if (this.socket) {
                this.socket.removeEventListener('close', this.closeListener);
                this.socket.removeEventListener('message', this.messageListener);
            }
        }
        startPinging() {
            if (!this.pingTimer) {
                if (this.isConnected()) {
                    this.lastPong = Date.now();
                    this.nextPing();
                }
            }
        }
        stopPinging() {
            if (this.pingTimer) {
                window.clearTimeout(this.pingTimer);
                this.pingTimer = 0;
            }
        }
        nextPing() {
            this.pingTimer = window.setTimeout(() => {
                this.pingTimer = 0;
                if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                    if ((Date.now() - this.lastPong) > SOCKET_PING_TIMEOUT) {
                        console.log('Slick socket ping timeout');
                        this.reconnect(false);
                    }
                    else {
                        this.send('ping');
                        this.nextPing();
                    }
                }
            }, SOCKET_PING_INTERVAL);
        }
        disconnect() {
            this.stopPinging();
            if (this.socket) {
                try {
                    this.detachSocketLiseteners();
                    if (this.socket.readyState === WebSocket.OPEN) {
                        console.log('Dsiconnecting socket');
                        const payload = {
                            activity: this.activityHelper.getUnrepoertedActivity()
                        };
                        this.send('notify', 'closing', payload);
                        this.socket.close();
                    }
                }
                catch (err) {
                    console.warn(err);
                }
                this.socket = undefined;
            }
            bus.dispatch('socked-closed');
        }
        reconnect(delayed) {
            if (!delayed) {
                this.stopReconnectTimer();
                this.reconnectCounter = 0;
                this.doReconnect().then(() => this.startReconnectTimer()).catch(() => this.startReconnectTimer());
            }
            else {
                this.startReconnectTimer();
            }
        }
        async doReconnect() {
            this.reconnectCounter++;
            this.disconnect();
            this.pendingMessages = [];
            await this.ensureSession();
        }
        stopReconnectTimer() {
            if (this.reconnectTimer) {
                window.clearInterval(this.reconnectTimer);
                this.reconnectTimer = 0;
                console.log('slick - reconnect timer stopped');
            }
        }
        startReconnectTimer() {
            if (!this.reconnectTimer) {
                let counter = 0;
                let pendingPromise = null;
                this.reconnectTimer = window.setInterval(async () => {
                    if (this.isConnected()) {
                        this.stopReconnectTimer();
                        return;
                    }
                    if (pendingPromise) {
                        return;
                    }
                    counter++;
                    // throttle after three retry attempts
                    if (this.reconnectCounter > 2) {
                        if (counter < 5) {
                            console.log('slick - throttling reconnect');
                            return;
                        }
                        else {
                            counter = 0;
                        }
                    }
                    console.log('slick - reconnecting...');
                    try {
                        pendingPromise = this.doReconnect();
                        await Promise.resolve(pendingPromise);
                    }
                    catch (err) {
                    }
                    finally {
                        pendingPromise = null;
                    }
                    if (this.isConnected()) {
                        this.stopReconnectTimer();
                    }
                }, RETRY_INTERVAL);
                console.log('slick - reconnect timer started');
            }
        }
        onSocketClosed(event) {
            console.log('Slick socket closed', event);
            this.reconnect(false);
        }
        handleVisibilityChange() {
            if (document.hidden) {
                this.disconnect();
            }
            else {
                if (!this.isConnected()) {
                    this.reconnect(false);
                }
            }
        }
        onSocketMessage(event) {
            try {
                const message = JSON.parse(event.data);
                switch (message.direction) {
                    case 'request':
                        break;
                    case 'response':
                        this.handleResponse(message);
                        break;
                    case 'error':
                        this.handleError(message);
                        break;
                    case 'notify':
                        this.handleNotification(message);
                        break;
                    case 'pong':
                        this.lastPong = Date.now();
                        break;
                    case 'ping':
                        this.send('pong');
                        break;
                    default:
                        throw new Error(`Slick: Unexpected socket message direction: ${message.direction}`);
                }
            }
            catch (err) {
                console.error('Slick: error parsing socket message', err);
            }
        }
        handleResponse(message) {
            const mid = message.messageId;
            if (this.requestMap.has(mid)) {
                const p = this.requestMap.get(mid);
                this.requestMap.delete(mid);
                p[0](message.payload || {});
            }
        }
        handleError(message) {
            const mid = message.messageId;
            if (this.requestMap.has(mid)) {
                const p = this.requestMap.get(mid);
                this.requestMap.delete(mid);
                p[1](new Error(message.payload.description));
            }
            else {
                console.log('Slick: Error response - ', message);
            }
        }
        handleTimeout(mid) {
            if (this.requestMap.has(mid)) {
                const p = this.requestMap.get(mid);
                this.requestMap.delete(mid);
                p[1](new Error('Request timed out'));
            }
        }
        handleNotification(message) {
            bus.dispatch(`notification-${message.msgType}`, message);
            switch (message.msgType) {
                case 'reconnect':
                    this.reconnect(false);
                    break;
                case 'visitor-arrived':
                case 'visitor-departed':
                    break;
                default:
                    break;
            }
        }
    }

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var guildPostApi = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UPLOAD_FIELDS = {
        fileName: 'fileName',
        siteCode: 'siteCode'
    };
    });

    unwrapExports(guildPostApi);
    var guildPostApi_1 = guildPostApi.UPLOAD_FIELDS;

    var guildGetApi = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    // To add a new site (or retrieve it if it already exists), GET add-nav-site with URL.
    // No authentication is required.  Response will return quickly -- perhaps while
    // indexing is getting started.  Client can call get-nav-pages incrementally to show
    // indexing progress.
    exports.ADD_NAV_SITE_PARAMS = {
        url: 'url',
        sitemaps: 'sitemaps',
        verticals: 'verticals'
    };
    exports.GET_ENGAGEMENT_REPORT_PARAMS = {
        siteCode: 'site',
    };
    exports.START_SITE_INDEX_PARAMS = {
        siteCode: 'site',
        force: 'force',
        forceLinks: 'links',
        forceImages: 'images',
        forceLinkImages: 'linkImages',
    };
    exports.SITE_IMAGES_PARAMS = {
        siteCode: 'site',
        epoch: 'epoch'
    };
    exports.SITE_IMAGE_INFO_PARAMS = {
        siteCode: 'site',
        imageId: 'image',
        epoch: 'epoch'
    };
    exports.SITE_IMAGE_PARAMS = {
        siteCode: 'site',
        imageId: 'image',
        size: 'size'
    };
    // export const GET_SITE_STATS_PARAMS = {
    //   siteCode: 'site',
    // };
    // export interface GetSiteStatsResponse extends RestResponse {
    //   report: SiteStatsReport;
    // }
    // export interface SiteStatsReport {
    //   allTime: SiteStats;
    //   past30Days: SiteStats;
    //   previous30Days: SiteStats;
    //   past7Days: SiteStats;
    //   previous7Days: SiteStats;
    //   past24Hours: SiteStats;
    //   previous24Hours: SiteStats;
    // }
    // export interface SiteStats {
    //   unactivated: SiteStatsSegment;
    //   activated: SiteStatsSegment;
    // }
    // export interface SiteStatsSegment {
    //   mobile: SiteStatsDetails;
    //   desktop: SiteStatsDetails;
    // }
    // export interface SiteStatsDetails {
    //   pageViews: number;
    //   sessions: number;
    //   readers: number;
    //   totalActivity: number;
    //   sessionTime: number;
    //   pageViewsWithImpression: number;
    //   pageViewsWithAction: number;
    //   navClicks: number;
    //   readersWithNavClick: number;
    //   intraSiteClicks: number;
    // }
    // export const GET_PAGE_STATS_PARAMS = {
    //   siteCode: 'site',
    //   after: 'after'
    // };
    // export interface GetPageStatsResponse extends RestResponse {
    //   meanActivityInSeconds: number;
    //   medianActivityInSeconds: number;
    //   sessionActivityBuckets: ActivityBucket[];
    //   pageStats: PageStats[];
    // }
    // export interface ActivityBucket {
    //   min: number;
    //   max: number;
    //   count: number;
    //   totalActivity: number;
    // }
    // export interface PageStats {
    //   title: string | null;
    //   published: number | null;
    //   pageId: number | null;
    //   url: string;
    //   pageViews: number;
    //   avgPageActivityMinutes: number;
    //   totalPageActivityMinutes: number;
    //   landingViews: number;
    //   avgLandingPagesPerSession: number;
    //   avgLandingSessionActivityMinutes: number;
    //   totalLandingSessionActivityMinutes: number;
    //   landingClickthroughRate: number;
    // }
    // export interface TrafficStats {
    //   unactivated: TrafficStatsByActivation;
    //   activated: TrafficStatsByActivation;
    // }
    // export interface TrafficStatsByActivation {
    //   mobile: TrafficStatsByClientType;
    //   desktop: TrafficStatsByClientType;
    // }
    // export interface TrafficStatsByClientType {
    //   unengaged: TrafficStatsData;
    //   singlePage: TrafficStatsData;
    //   multiPage: TrafficStatsData;
    //   multiSession: TrafficStatsData;
    // }
    // export interface TrafficStatsData {
    //   pageviews: number;
    //   sessions: number;
    //   activity: number;
    //   pageviewsWithImpression: number;
    //   pageviewsWithAction: number;
    //   navClicks: number;
    //   linkClicks: number;
    //   intraSiteClicks: number;
    //   reloads: number;
    // }
    });

    unwrapExports(guildGetApi);
    var guildGetApi_1 = guildGetApi.ADD_NAV_SITE_PARAMS;
    var guildGetApi_2 = guildGetApi.GET_ENGAGEMENT_REPORT_PARAMS;
    var guildGetApi_3 = guildGetApi.START_SITE_INDEX_PARAMS;
    var guildGetApi_4 = guildGetApi.SITE_IMAGES_PARAMS;
    var guildGetApi_5 = guildGetApi.SITE_IMAGE_INFO_PARAMS;
    var guildGetApi_6 = guildGetApi.SITE_IMAGE_PARAMS;

    var slickInfoApi = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.EMBED_SCRIPT_PARAMS = {
        siteCode: 'site',
    };
    });

    unwrapExports(slickInfoApi);
    var slickInfoApi_1 = slickInfoApi.EMBED_SCRIPT_PARAMS;

    var embedApi = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.EMBED_SITE_INFO_PARAMS = {
        siteCode: 'site',
        epoch: 'epoch',
        authenticated: 'auth'
    };
    });

    unwrapExports(embedApi);
    var embedApi_1 = embedApi.EMBED_SITE_INFO_PARAMS;

    var pricing = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    var PRO_PRICING_MODELS = {
        'monthly': {
            monthsPerTerm: 1,
            tiers: [
                { maxUnits: 10, fixedAmount: 25.0, pricePerUnit: 0 },
                { maxUnits: 30, fixedAmount: 0, pricePerUnit: 2.25 },
                { maxUnits: 100, fixedAmount: 0, pricePerUnit: 2.21 },
                { maxUnits: 300, fixedAmount: 0, pricePerUnit: 2.00 },
                { maxUnits: 1000, fixedAmount: 0, pricePerUnit: 1.87 },
                { maxUnits: 3000, fixedAmount: 0, pricePerUnit: 1.75 },
                { maxUnits: 10000, fixedAmount: 0, pricePerUnit: 1.62 },
                { maxUnits: null, fixedAmount: 0, pricePerUnit: 1.50 },
            ]
        },
        'annual': {
            monthsPerTerm: 12,
            tiers: [
                { maxUnits: 10, fixedAmount: 240, pricePerUnit: 0 },
                { maxUnits: 30, fixedAmount: 0, pricePerUnit: 21.60 },
                { maxUnits: 100, fixedAmount: 0, pricePerUnit: 20.40 },
                { maxUnits: 300, fixedAmount: 0, pricePerUnit: 19.20 },
                { maxUnits: 1000, fixedAmount: 0, pricePerUnit: 18.00 },
                { maxUnits: 3000, fixedAmount: 0, pricePerUnit: 16.80 },
                { maxUnits: 10000, fixedAmount: 0, pricePerUnit: 15.60 },
                { maxUnits: null, fixedAmount: 0, pricePerUnit: 14.40 },
            ]
        },
    };
    var BASIC_PRICING_MODELS = {
        'monthly': {
            monthsPerTerm: 1,
            tiers: [
                { maxUnits: 10, fixedAmount: 10.0, pricePerUnit: 0 },
                { maxUnits: 30, fixedAmount: 0, pricePerUnit: 0.90 },
                { maxUnits: 100, fixedAmount: 0, pricePerUnit: 0.85 },
                { maxUnits: 300, fixedAmount: 0, pricePerUnit: 0.80 },
                { maxUnits: 1000, fixedAmount: 0, pricePerUnit: 0.75 },
                { maxUnits: 3000, fixedAmount: 0, pricePerUnit: 0.70 },
                { maxUnits: 10000, fixedAmount: 0, pricePerUnit: 0.65 },
                { maxUnits: null, fixedAmount: 0, pricePerUnit: 0.60 },
            ]
        },
        'annual': {
            monthsPerTerm: 12,
            tiers: [
                { maxUnits: 10, fixedAmount: 96.00, pricePerUnit: 0 },
                { maxUnits: 30, fixedAmount: 0, pricePerUnit: 8.64 },
                { maxUnits: 100, fixedAmount: 0, pricePerUnit: 8.16 },
                { maxUnits: 300, fixedAmount: 0, pricePerUnit: 7.68 },
                { maxUnits: 1000, fixedAmount: 0, pricePerUnit: 7.20 },
                { maxUnits: 3000, fixedAmount: 0, pricePerUnit: 6.72 },
                { maxUnits: 10000, fixedAmount: 0, pricePerUnit: 6.24 },
                { maxUnits: null, fixedAmount: 0, pricePerUnit: 5.76 },
            ]
        },
    };
    var PRICING_MODELS = {
        'basic': BASIC_PRICING_MODELS,
        'pro': PRO_PRICING_MODELS
    };
    var PriceCalculator = /** @class */ (function () {
        function PriceCalculator(product, pricingPlan) {
            this.munits = 0;
            this.mproduct = 'basic';
            this.mplan = 'monthly';
            this.mmodel = BASIC_PRICING_MODELS['monthly'];
            this.product = product;
            this.pricingPlan = pricingPlan;
        }
        Object.defineProperty(PriceCalculator.prototype, "units", {
            get: function () {
                return this.munits;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PriceCalculator.prototype, "model", {
            get: function () {
                return this.mmodel;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PriceCalculator.prototype, "pageviews", {
            set: function (value) {
                this.munits = Math.floor(value / 10000);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PriceCalculator.prototype, "product", {
            set: function (value) {
                this.mproduct = value;
                this.mmodel = PRICING_MODELS[this.mproduct][this.mplan];
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PriceCalculator.prototype, "pricingPlan", {
            set: function (value) {
                this.mplan = value;
                this.mmodel = PRICING_MODELS[this.mproduct][this.mplan];
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PriceCalculator.prototype, "price", {
            get: function () {
                var amount = 0;
                var tierStartUnits = 0;
                for (var _i = 0, _a = this.model.tiers; _i < _a.length; _i++) {
                    var tier = _a[_i];
                    amount += tier.fixedAmount;
                    if (!tier.maxUnits || this.units < tier.maxUnits) {
                        amount += tier.pricePerUnit * (this.units - tierStartUnits);
                        break;
                    }
                    else {
                        amount += tier.pricePerUnit * (tier.maxUnits - tierStartUnits);
                    }
                    tierStartUnits = tier.maxUnits || 0;
                }
                return amount;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PriceCalculator.prototype, "pricePerMonth", {
            get: function () {
                return this.price / this.model.monthsPerTerm;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PriceCalculator.prototype, "effectiveMonthlyPricePerThousandPageviews", {
            get: function () {
                var kpv = this.munits * 10;
                return kpv ? this.pricePerMonth / kpv : 0;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PriceCalculator.prototype, "effectiveDiscountInPercent", {
            get: function () {
                var zeroDiscountPricePerThousand = this.mproduct === 'basic' ? 0.10 : 0.25;
                return 100 * (zeroDiscountPricePerThousand - this.effectiveMonthlyPricePerThousandPageviews) / zeroDiscountPricePerThousand;
            },
            enumerable: true,
            configurable: true
        });
        return PriceCalculator;
    }());
    exports.PriceCalculator = PriceCalculator;
    });

    unwrapExports(pricing);
    var pricing_1 = pricing.PriceCalculator;

    var guildApis = createCommonjsModule(function (module, exports) {
    function __export(m) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    }
    Object.defineProperty(exports, "__esModule", { value: true });
    __export(guildPostApi);
    __export(guildGetApi);
    __export(slickInfoApi);
    __export(embedApi);
    __export(pricing);
    exports.GUILD_API_URL_SUFFIXES = {
        // Following are unauthenticated POSTs
        navCheckSite: "nav-check-site",
        googleSignIn: "google-sign-in",
        getAccount: "get-account",
        getEngagementReport: "get-engagement-report",
        // getSiteStats: "get-site-stats",
        signUpUsingEmail: "sign-up-using-email",
        confirmEmailAddress: "confirm-email-address",
        signInUsingEmail: "sign-in-using-email",
        requestResetPassword: "request-reset-password",
        resetPassword: "reset-password",
        signOut: "sign-out",
        requestContact: "request-contact",
        confirmSiteMembership: "confirm-site-membership",
        // embedStartSession: 'embed-start-session',
        // embedPingSession: 'embed-ping-session',
        embedEndSession: 'embed-end-session',
        embedWidgetAction: 'embed-widget-action',
        embedPageAction: 'embed-page-action',
        // embedSubmitQuestion: 'embed-submit-question',
        // embedSearch: 'embed-search',
        // getPublicSites: "get-public-sites",
        // searchPublicSites: "search-public-sites",
        // Following are POSTs that may or may not be authenticated using a cookie (based on google-sign-in)
        // navSiteRegister: "nav-site-register",
        // Following are POSTs that are authenticated using cookie
        getSiteInfo: "get-site-info",
        getSiteMembers: "get-site-members",
        getSiteConfigurations: "get-site-configurations",
        deleteSiteConfiguration: "delete-site-configuration",
        updateSiteConfiguration: "update-site-configuration",
        addSiteConfiguration: "add-site-configuration",
        updateSiteCss: "update-site-css",
        updateSiteExcludePageUrls: "update-site-exclude-page-urls",
        setSiteAdmins: "set-site-admins",
        getSiteRealtimeAnalytics: "get-site-realtime-analytics",
        getSiteDailySummaryAnalytics: "get-site-daily-summary-analytics",
        getSiteWeeklySummaryAnalytics: "get-site-weekly-summary-analytics",
        getSitePeriodPageAnalytics: "get-site-period-page-analytics",
        getSitePeriodReferrerAnalytics: "get-site-period-referrer-analytics",
        getSitePeriodCountryAnalytics: "get-site-period-country-analytics",
        getLinkIssues: "get-link-issues",
        getSiteRealtime: "get-site-realtime",
        getSiteChartData: "get-site-chart-data",
        getSiteSearches: "get-site-searches",
        getSiteBasicAnalytics: "get-site-basic-analytics",
        getSlickstreamFeed: "get-slickstream-feed",
        getSlickstreamFeedUpdates: "get-slickstream-feed-updates",
        adminCreateOrganization: "admin-create-organization",
        getOrganization: "get-organization",
        purchaseSubscription: "purchase-subscription",
        cancelSubscription: "cancel-subscription",
        deletePaymentMethod: "delete-payment-method",
        setDefaultPaymentMethod: "set-default-payment-method",
        addPaymentMethod: "add-payment-method",
        updateOrganizationEmails: "update-organization-emails",
        // Following are unauthenticated GETs
        addNavSite: "add-nav-site",
        // searchNavPages: "search-nav-pages",
        getSiteImages: "site-images",
        getImageInfo: "site-image-info",
        getSiteImage: "site-image",
        embedSiteInfo: 'embed-site-info',
        // embedSearchPages: 'embed-search-pages',  // obsolete
        // Following are authenticated GETs
        startSiteIndex: "start-site-index",
        getSitesTable: "get-sites-table",
        // Following are form-encoded upload POSTs
        upload: "upload",
        // Following is for websocket
        socket: "socket"
    };
    exports.GUILD_API_VERSION = 3;
    });

    unwrapExports(guildApis);
    var guildApis_1 = guildApis.GUILD_API_URL_SUFFIXES;
    var guildApis_2 = guildApis.GUILD_API_VERSION;

    const ENGLISH_PHRASES = new Map([
        ['search', 'Search'],
        ['favorites', 'Favorites'],
        ['recommended', 'Recommended'],
        ['browse', 'Browse'],
        ['explore', 'Explore'],
        ['offline', 'Offline'],
        ['mute', 'mute'],
        ['unmute', 'unmute'],
        ['sync', 'sync'],
        ['save', 'save'],
        ['saving...', 'Saving...'],
        ['confirm', 'confirm'],
        ['my-favorite-pages', 'My Favorite Pages'],
        ['related', 'Related'],
        ['popular', 'Popular'],
        ['latest', 'Latest'],
        ['no-matches-found', 'No matches found'],
        ['heartbeat-description', 'Clicking on a page\'s heart ♡ shows appreciation. Everyone viewing that page at the time will see your fluttering hearts and may choose to join you and do the same. Also, any page you heart is added to your Favorites so you can easily find them again later.'],
        ['favorites-description', 'We remember your favorites for you within your browser. If you\'re worried about them getting lost, or you want to share them between devices or browsers, turn SYNC on. No password required.'],
        ['code-verification-message', 'To verify your address, we have emailed you a confirmation code. Enter your code here:'],
        ['no-recommendations', 'You do not have any recommendations.'],
        ['no-favorites', 'You do not have any favorites.'],
        ['search-text', 'search text'],
        ['favorite-added', 'Favorite Added'],
        ['loading', 'loading...'],
        ['no-related-content', ' No related content']
    ]);
    const GERMAN_PHRASES = new Map([
        ['search', 'Suche'],
        ['favorites', 'Favoriten'],
        ['recommended', 'Empfohlen'],
        ['browse', 'Durchsuche'],
        ['explore', 'Erkunden'],
        ['offline', 'Offline'],
        ['mute', 'stumm'],
        ['unmute', 'stummschalten'],
        ['sync', 'sync'],
        ['save', 'Speichern'],
        ['saving...', 'Speichern...'],
        ['confirm', 'Bestätigen'],
        ['my-favorite-pages', 'Meine Lieblingsseiten'],
        ['related', 'Ähnlich'],
        ['popular', 'Beliebt'],
        ['latest', 'Neueste'],
        ['no-matches-found', 'Es wurden keine Inhalte gefunden'],
        ['heartbeat-description', 'Ein Klick auf das Herz ♡ einer Seite zeigt deine Wertschätzung. Jeder, der diese Seite zur Zeit betrachtet, wird deine flatternden Herzen sehen und kann sich dir anzuschließen und Herzen zurücksenden. Außerdem wird jede Seite, die du mit einem Herz markierst, zu deinen Favoriten hinzugefügt, so dass du sie später leicht wiederfinden kannst.'],
        ['favorites-description', 'Wir speichern deine Favoriten für dich in deinem Browser. Wenn du deine Favoriten sichern möchtest, und sie auf anderen Geräten oder Browsern nutzen möchtest, dann aktiviere SYNC. Kein Passwort erforderlich.'],
        ['code-verification-message', 'Zur Bestätigung Ihrer Adresse haben wir Ihnen einen Bestätigungscode per E-Mail gesendet. Geben Sie hier Ihren Code ein:'],
        ['no-recommendations', 'Sie haben keine Empfehlungen.'],
        ['no-favorites', 'Sie haben keine Favoriten.'],
        ['search-text', 'suchtext'],
        ['favorite-added', 'Favorit hinzugefügt'],
        ['loading', 'Wird geladen...'],
        ['no-related-content', 'Kein verwandter Inhalt'],
    ]);
    const CZECH_PHRASES = new Map([
        ['search', 'Vyhledávání'],
        ['favorites', 'Oblíbené'],
        ['recommended', 'Doporučeno'],
        ['browse', 'Procházet'],
        ['explore', 'Prozkoumat'],
        ['offline', 'Offline'],
        ['mute', 'ztlumit'],
        ['unmute', 'zapnout'],
        ['sync', 'sync'],
        ['save', 'Uložit'],
        ['saving...', 'Ukládání...'],
        ['confirm', 'Potvrdit'],
        ['my-favorite-pages', 'Moje oblíbené stránky'],
        ['related', 'Příbuzný'],
        ['popular', 'Oblíbený'],
        ['latest', 'Nejnovější'],
        ['no-matches-found', 'Nebyly nalezeny žádné shody'],
        ['heartbeat-description', 'Kliknutí na srdce stránky ciation ukazuje uznání. Každý, kdo si tu stránku prohlíží, uvidí vaše vlající srdce a může se rozhodnout, že se k vám připojí a udělá totéž. K oblíbeným položkám se přidají také všechny stránky, které jste si vybrali, abyste je mohli později snadno najít.'],
        ['favorites-description', 'Vaše oblíbené si pamatujeme ve vašem prohlížeči. Pokud se obáváte, že se ztratí, nebo je chcete sdílet mezi zařízeními a prohlížeči, zapněte SYNC. Není vyžadováno žádné heslo.'],
        ['code-verification-message', 'Chcete-li ověřit svou adresu, e-mailem vám zašleme potvrzovací kód. Sem zadejte svůj kód:'],
        ['no-recommendations', 'Nemáte žádná doporučení.'],
        ['no-favorites', 'Nemáte žádné oblíbené.'],
        ['search-text', 'vyhledávací text'],
        ['favorite-added', 'Oblíbené Přidáno'],
        ['loading', 'Načítání......'],
        ['no-related-content', 'Žádný související obsah'],
    ]);
    const PORTUGUESE_PHRASES = new Map([
        ['search', 'Buscar'],
        ['favorites', 'Favoritos'],
        ['recommended', 'Recomendado'],
        ['browse', 'Procurar'],
        ['explore', 'Explorar'],
        ['offline', 'Offline'],
        ['mute', 'mudo'],
        ['unmute', 'mudo'],
        ['sync', 'sync'],
        ['save', 'Loja'],
        ['saving...', 'Salvar...'],
        ['confirm', 'confirme'],
        ['my-favorite-pages', 'Minhas páginas favoritas'],
        ['related', 'Relacionado'],
        ['popular', 'Popular'],
        ['latest', 'Recentes'],
        ['no-matches-found', 'Nenhuma equivalência encontrada'],
        ['heartbeat-description', 'Clicando no coração de uma página ♡ mostra apreciação. Todo mundo vendo aquela página na hora verá seus corações esvoaçantes e poderá escolher se juntar a você e fazer o mesmo. Além disso, qualquer página do seu coração é adicionada aos seus Favoritos para que você possa encontrá-los facilmente mais tarde.'],
        ['favorites-description', 'Lembramos seus favoritos para você no seu navegador. Se estiver preocupado com a possibilidade de se perder ou se quiser compartilhá-los entre dispositivos ou navegadores, ative o SYNC. Nenhuma senha é necessária.'],
        ['code-verification-message', 'Para confirmar seu endereço, enviamos a você um código de confirmação por e-mail. Coloque o seu código aqui:'],
        ['no-recommendations', 'Você não tem nenhuma recomendação.'],
        ['no-favorites', 'Você não tem favoritos.'],
        ['search-text', 'digite aqui'],
        ['favorite-added', 'Favorito Adicionado'],
        ['loading', 'Carregando...'],
        ['no-related-content', 'Nenhum conteúdo relacionado'],
    ]);
    const SPANISH_PHRASES = new Map([
        ['search', 'Buscar'],
        ['favorites', 'Favoritos'],
        ['recommended', 'Recomendado'],
        ['browse', 'Vistazo'],
        ['explore', 'Explorar'],
        ['offline', 'Offline'],
        ['mute', 'mudo'],
        ['unmute', 'mudo'],
        ['sync', 'sync'],
        ['save', 'Salvar'],
        ['saving...', 'Salvar...'],
        ['confirm', 'confirmar'],
        ['my-favorite-pages', 'Mis paginas favoritas'],
        ['related', 'Relacionado'],
        ['popular', 'Popular'],
        ['latest', 'Recientes'],
        ['no-matches-found', 'No se encontraron coincidencias'],
        ['heartbeat-description', 'Al hacer clic en el corazón de una página, ♡ muestra aprecio. Todos los que vean esa página en ese momento verán sus corazones revoloteando y pueden elegir unirse a ustedes y hacer lo mismo. Además, cualquier página que desee se agrega a sus Favoritos para que pueda encontrarlas fácilmente más tarde.'],
        ['favorites-description', 'Recordamos tus favoritos para ti dentro de tu navegador. Si le preocupa que se pierdan o si desea compartirlos entre dispositivos o navegadores, active SYNC. No se requiere contraseña.'],
        ['code-verification-message', 'Para verificar su dirección, le hemos enviado un código de confirmación por correo electrónico. Ingrese su código aquí:'],
        ['no-recommendations', 'No tienes ninguna recomendación.'],
        ['no-favorites', 'No tienes favoritos.'],
        ['search-text', 'escriba aquí'],
        ['favorite-added', 'Favorito Añadido'],
        ['loading', 'Cargando...'],
        ['no-related-content', 'No hay contenido relacionado'],
    ]);
    class PhraseDictionary {
        constructor(language) {
            switch (language) {
                case 'cs':
                    this.phrases = CZECH_PHRASES;
                    break;
                case 'de':
                    this.phrases = GERMAN_PHRASES;
                    break;
                case 'pt':
                    this.phrases = PORTUGUESE_PHRASES;
                    break;
                case 'es':
                    this.phrases = SPANISH_PHRASES;
                    break;
                case 'en':
                default:
                    this.phrases = ENGLISH_PHRASES;
                    break;
            }
        }
        getPhrase(type) {
            return this.phrases.get(type) || type;
        }
    }

    const version="0.14.3";

    const STORE_KEY_NAVINFO = 'slick-navigation-info';
    const PING_SESSION_INTERVAL = 10000;
    class EmbedCore extends CoreBase {
        constructor() {
            super();
            this.sessionTimestamp = Date.now();
            this.firstEngagementTimestamp = 0;
            this.lastEnagementTimestamp = 0;
            this.lastPollTimestamp = Date.now();
            this.widgetActionDebounceMap = new Map();
            this.prebidMonitor = new PrebidMonitor(this);
            this.userAuthenticated = false;
            this.authenticatedUser = null;
            this.dictionary = new PhraseDictionary('en');
            // init sitecode
            this.siteCode = window.slickSiteCode || (window.slick && window.slick.site) || '';
            // Unload listener
            window.addEventListener('beforeunload', () => {
                if (this.currentSession) {
                    this.endSession();
                }
            }, false);
            // FoodBloggerPro used user-authenticated tag rather than authenticated-user, so we check for both variants
            let userAuthenticatedTag = document.querySelector('meta[name="user-authenticated"]');
            if (!userAuthenticatedTag) {
                userAuthenticatedTag = document.querySelector('meta[property="user-authenticated"]');
            }
            let authenticatedUserTag = document.querySelector('meta[name="authenticated-user"]');
            if (!authenticatedUserTag) {
                authenticatedUserTag = document.querySelector('meta[property="authenticated-user"]');
            }
            const userAuthenticatedContent = userAuthenticatedTag ? userAuthenticatedTag.getAttribute('content') : null;
            if (userAuthenticatedContent === 'true') {
                this.userAuthenticated = true;
            }
            else if (userAuthenticatedContent === 'false') {
                this.userAuthenticated = false;
            }
            else if (userAuthenticatedContent && userAuthenticatedContent.length > 0) {
                this.userAuthenticated = true;
                this.authenticatedUser = userAuthenticatedContent;
            }
            this.userAuthenticated = userAuthenticatedContent ? userAuthenticatedContent === 'true' : false;
            const authenticatedUserContent = authenticatedUserTag ? authenticatedUserTag.getAttribute('content') : null;
            if (authenticatedUserContent && authenticatedUserContent.length > 0) {
                this.userAuthenticated = true;
                this.authenticatedUser = authenticatedUserContent;
            }
            // other init
            try {
                this.prebidMonitor.run();
            }
            catch (err) {
                console.error('Failed to initialize prebid', err);
            }
        }
        isConnected() {
            if (this.socket) {
                return this.socket.isConnected();
            }
            return false;
        }
        get socket() {
            return this.socketManager;
        }
        get lastEngaged() {
            return this.lastEnagementTimestamp;
        }
        get session() {
            return this.currentSession;
        }
        phrase(phrase) {
            return this.dictionary.getPhrase(phrase) || '';
        }
        async ensureSession() {
            if (this.currentSession) {
                return this.currentSession;
            }
            // initialize socket manager
            if (!this.socketManager) {
                const url = window.location.href;
                const canonicalLink = document.querySelector('link[rel="canonical"]');
                let canonical = (canonicalLink && canonicalLink.href);
                if (!canonical) {
                    canonical = url;
                }
                const publishedTag = document.querySelector('meta[property="article:published_time"]');
                const publishedTime = publishedTag && publishedTag.getAttribute('content');
                let updatedTimeTag = document.querySelector('meta[property="article:modified_time"]');
                if (!updatedTimeTag) {
                    updatedTimeTag = document.querySelector('meta[property="og:updated_time"]');
                }
                const updatedTime = updatedTimeTag && updatedTimeTag.getAttribute('content');
                const display = {
                    w: window.innerWidth,
                    h: window.innerHeight
                };
                let originTimestamp = 0;
                let navStartTimestamp = 0;
                let contentLoadedTimestamp = 0;
                if (window.performance) {
                    originTimestamp = window.performance.timeOrigin;
                    const timing = window.performance.timing;
                    if (timing) {
                        navStartTimestamp = timing.fetchStart || timing.navigationStart;
                        contentLoadedTimestamp = timing.domContentLoadedEventStart || timing.domContentLoadedEventEnd;
                    }
                }
                const payload = {
                    site: this.siteCode,
                    reader: this.readerId,
                    start: this.sessionTimestamp,
                    url,
                    canonical,
                    publishedTime,
                    updatedTime,
                    referer: document.referrer,
                    display,
                    originTimestamp,
                    navStartTimestamp,
                    contentLoadedTimestamp,
                    scriptLoadTimestamp: (window.slickScriptStartTime) || Date.now(),
                    currentTimestamp: contentLoadedTimestamp,
                    clientVersion: version,
                    userAuthenticated: this.userAuthenticated
                };
                if (this.authenticatedUser) {
                    payload.authenticatedUser = this.authenticatedUser;
                }
                const prevNavInfo = this.loadNavigationInfo();
                if (prevNavInfo) {
                    payload.priorPageInfo = {
                        pageUrl: prevNavInfo.pageUrl,
                        navType: prevNavInfo.navType
                    };
                }
                this.socketManager = new SocketManager(payload, this);
            }
            // start session
            this.currentSession = await this.socketManager.ensureSession();
            this.dictionary = new PhraseDictionary(this.currentSession.language);
            return this.currentSession;
        }
        saveNavigatingAwayInfo(navType) {
            if (navType && this.currentSession) {
                const pageUrl = this.currentSession.configuration.url || window.location.href;
                const data = { pageUrl, navType, timestamp: Date.now() };
                store.set(STORE_KEY_NAVINFO, data);
            }
        }
        loadNavigationInfo() {
            const data = store.get(STORE_KEY_NAVINFO, true);
            if (data) {
                const diff = Date.now() - data.timestamp;
                store.delete(STORE_KEY_NAVINFO);
                if (diff < 30000) {
                    return data;
                }
            }
            return null;
        }
        onEngagement(event) {
            if (event && event.type === 'click') {
                const target = event.srcElement || event.target;
                if (target) {
                    let a = null;
                    let current = target;
                    const breakTags = ['body', 'head', 'html'];
                    while (current && current.tagName) {
                        const tag = current.tagName.toLowerCase();
                        if (breakTags.indexOf(tag) >= 0) {
                            break;
                        }
                        if (tag === 'a') {
                            a = current;
                            break;
                        }
                        current = current.parentElement;
                    }
                    if (a) {
                        const me = event;
                        const button = me.button || 0;
                        if (!button) {
                            const modifier = me.shiftKey || me.ctrlKey || me.altKey || me.metaKey || false;
                            if (a.href && (!modifier)) {
                                this.saveNavigatingAwayInfo('link-click');
                            }
                            this.reportPageAction('link-click', a.href, { modifier });
                            return;
                        }
                    }
                }
            }
            this.lastEnagementTimestamp = Date.now();
            if (!this.firstEngagementTimestamp) {
                this.firstEngagementTimestamp = this.lastEnagementTimestamp;
                const activity = Math.min(PING_SESSION_INTERVAL, this.lastEnagementTimestamp - (this.lastPollTimestamp || this.sessionTimestamp));
                setTimeout(async () => {
                    this.pingSession(activity);
                    setTimeout(() => {
                        this.lastEnagementTimestamp = 0;
                        setInterval(() => {
                            this.pingSession(PING_SESSION_INTERVAL);
                        }, PING_SESSION_INTERVAL);
                    }, 1000);
                });
            }
            bus.dispatch('engagement');
        }
        pingSession(activity) {
            if (this.currentSession && this.lastEnagementTimestamp > this.lastPollTimestamp) {
                const payload = {
                    activity
                };
                this.lastPollTimestamp = Date.now();
                this.socket.send('notify', 'activity', payload);
            }
        }
        reportPageAction(action, url, data) {
            if (this.currentSession) {
                const payload = { action, url, data };
                this.socket.send('notify', 'page-action', payload);
            }
        }
        async widgetAction(type, action, debounce, url, variant, data) {
            const actionKey = `${type}-${action}`;
            const now = Date.now();
            if (debounce > 0) {
                const last = this.widgetActionDebounceMap.get(actionKey) || 0;
                if ((now - last) <= debounce) {
                    return;
                }
            }
            this.widgetActionDebounceMap.set(actionKey, now);
            if (this.currentSession) {
                if (action === 'nav') {
                    this.saveNavigatingAwayInfo('widget-click');
                }
                else if (action === 'link-nav') {
                    this.saveNavigatingAwayInfo('link-click');
                }
                const payload = { action, type, data, url, variant };
                this.socket.send('notify', 'widget-action', payload);
            }
        }
        getUnrepoertedActivity() {
            return Math.max(0, Math.min(PING_SESSION_INTERVAL, this.lastEnagementTimestamp - (this.lastPollTimestamp || this.sessionTimestamp)));
        }
        async endSession() {
            const activity = this.getUnrepoertedActivity();
            if (activity) {
                const details = {
                    site: this.siteCode,
                    reader: this.readerId,
                    start: this.sessionTimestamp,
                    activity,
                    currentTimestamp: Date.now()
                };
                if (this.firstEngagementTimestamp) {
                    details.firstActivityTimestamp = this.firstEngagementTimestamp;
                }
                const restUrl = this.dUrl(guildApis_1.embedEndSession, { site: this.siteCode });
                if (!beacon(restUrl, details)) {
                    await post(restUrl, details, this.includeCredentials);
                }
            }
        }
        // Rest P api
        getEpoch() {
            if (this.currentSession) {
                return `${this.currentSession.siteEpoch}`;
            }
            return '0';
        }
        async getSiteInfo() {
            if (this.pendingSiteInfo) {
                return Promise.resolve(this.pendingSiteInfo);
            }
            if (this.siteInfo) {
                return this.siteInfo;
            }
            const params = {
                site: this.siteCode,
                epoch: this.getEpoch(),
            };
            if (this.userAuthenticated) {
                params.auth = 'true';
            }
            const restUrl = this.pUrl(guildApis_1.embedSiteInfo, params);
            this.pendingSiteInfo = get(restUrl, this.includeCredentials);
            try {
                this.siteInfo = await Promise.resolve(this.pendingSiteInfo);
                this.pendingSiteInfo = undefined;
                return this.siteInfo;
            }
            catch (err) {
                this.pendingSiteInfo = undefined;
                throw err;
            }
        }
        async getStripPages() {
            const currentPageId = this.currentSession && this.currentSession.currentPage && this.currentSession.currentPage.id;
            const recPages = await this.getRecommendedPages();
            const allPages = (await this.getSiteInfo()).pages;
            const recIds = new Set();
            recPages.forEach((p) => recIds.add(p.id));
            const otherPages = allPages.filter((p) => !recIds.has(p.id));
            let result = recPages.concat(otherPages);
            if (currentPageId) {
                result = result.filter((d) => d.id !== currentPageId);
            }
            return result;
        }
        thumbnailUrl(page, width, height) {
            if (!page.noImg) {
                const id = page.id;
                return this.thumbnailByPageId(id, width, height);
            }
            return null;
        }
        thumbnailByPageId(id, width, height) {
            const params = { site: this.siteCode };
            if (width) {
                params['w'] = `${width}`;
            }
            if (height) {
                params['h'] = `${height}`;
            }
            return this.pUrl(`pageimg/${this.siteCode}/${id}`, params);
        }
        // Widget API
        async getRecommendedPages() {
            if (this.session) {
                return [...this.session.recommendedPages];
            }
            return [];
        }
        async addHearts(count, pageId) {
            const payload = { count };
            if (pageId) {
                payload.pageId = pageId;
            }
            if (this.currentSession && this.currentSession.currentPage && this.currentSession.currentPage.id === pageId) {
                this.currentSession.currentPage.totalFavorites = (this.currentSession.currentPage.totalFavorites || 0) + 1;
                this.currentSession.currentPage.isFavorite = true;
                setTimeout(() => {
                    bus.dispatch('session-updated', this.currentSession);
                });
            }
            return this.socket.request('heart', payload);
        }
        async removeFavorite(pageId) {
            const payload = { pageId };
            await this.socket.request('delete-favorite', payload);
            if (this.currentSession && this.currentSession.currentPage && this.currentSession.currentPage.id === pageId) {
                this.currentSession.currentPage.totalFavorites = Math.max(0, (this.currentSession.currentPage.totalFavorites || 1) - 1);
                this.currentSession.currentPage.isFavorite = false;
                setTimeout(() => {
                    bus.dispatch('session-updated', this.currentSession);
                });
            }
        }
        async search(q) {
            const payload = {
                search: q
            };
            return this.socketManager.request('search', payload);
        }
        async getFavorites() {
            const payload = { maxCount: 300 };
            const resp = await this.socket.request('list-favorites', payload);
            return resp.favorites || [];
        }
        async getPopular() {
            const payload = {};
            const resp = await this.socket.request('list-recommended-popular', payload);
            return resp.pages || [];
        }
        async getLatest() {
            const payload = {};
            const resp = await this.socket.request('list-recommended-new', payload);
            return resp.pages || [];
        }
        async getRelated() {
            const payload = {};
            const resp = await this.socket.request('list-recommended-related', payload);
            return resp.pages || [];
        }
        async browseStart() {
            return await this.socket.request('browse-start', {}, 60000);
        }
        async browseChange(ids) {
            const payload = { ids };
            return await this.socket.request('browse-change', payload, 60000);
        }
        // RqBrowseStart
        async setMembership(emailAddress) {
            const payload = { emailAddress };
            const resp = await this.socket.request('set-membership', payload);
            if (this.currentSession) {
                if (emailAddress) {
                    this.currentSession.readerEmailStatus = resp.confirmationRequired ? 'pending-confirmation' : 'first-time';
                    this.currentSession.readerEmail = emailAddress;
                }
                else {
                    this.currentSession.readerEmailStatus = 'none';
                    this.currentSession.readerEmail = undefined;
                }
            }
            return resp;
        }
        async confirmMembership(confirmationCode) {
            const payload = { confirmationCode };
            const resp = await this.socket.request('confirm-membership', payload);
            if (this.currentSession) {
                this.currentSession.readerEmailStatus = 'identity-confirmed';
            }
            return resp;
        }
    }
    const core = new EmbedCore();

    var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    const fetchedImages = new Set();
    let FilmStripOGCard = class FilmStripOGCard extends GuildElement {
        constructor() {
            super();
            this.data = { id: -1, at: 0, url: '', title: '', noImg: true, imageIds: [], description: null, totalHearts: 0, readerHearts: 0, isFavorite: false, totalFavorites: 0, categoryColor: 0, segment: '' };
            this.widgetname = 'filmstrip';
            this.cardwidth = 192;
            this.index = 0;
            this.compactMode = false;
            this.pendingImage = false;
            this.pendingImageTimer = 0;
            const userAgent = window.navigator ? window.navigator.userAgent : '';
            this.mobile = (userAgent.toLowerCase().indexOf('mobi') >= 0) && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
        }
        render() {
            let imageCellStyle = '';
            this.pendingImage = false;
            if (this.pendingImageTimer) {
                window.clearTimeout(this.pendingImageTimer);
                this.pendingImageTimer = 0;
            }
            if (this.site) {
                if (!this.data.noImg) {
                    if (!this.data.smallImageUrl) {
                        this.data.smallImageUrl = core.thumbnailUrl(this.data, this.compactMode ? 110 : 64, this.compactMode ? 39 : 64) || undefined;
                    }
                    if (this.data.smallImageUrl) {
                        if ((fetchedImages.size === 0) || fetchedImages.has(this.data.smallImageUrl)) {
                            imageCellStyle = `background-image: url("${this.data.smallImageUrl}");`;
                            fetchedImages.add(this.data.smallImageUrl);
                        }
                        else {
                            this.pendingImage = true;
                        }
                    }
                }
                if (!this.data.fullUrl) {
                    this.data.fullUrl = (new URL(this.data.url, this.site.homePageUrl)).toString();
                }
            }
            const target = window.guildNavOpenInNewTab ? '_blank' : '_self';
            const cardContentStyle = `width: ${this.cardwidth}px;`;
            const contentClass = `film-strip-card-content${this.mobile ? '' : ' hoverable'}`;
            return html `
    <style>
      :host {
        display: block;
        padding: 0 5px;
      }

      :host(.disabled) {
        opacity: 0;
        pointer-events: none;
      }

      .film-strip-card-content {
        background: #fff;
        border-radius: var(--film-strip-card-radius, 5px);
        display: -ms-flexbox;
        display: -webkit-flex;
        display: flex;
        -ms-flex-direction: row;
        -webkit-flex-direction: row;
        flex-direction: row;
        overflow: hidden;
      }

      .film-strip-card-content .imageCell {
        border-radius: var(--film-strip-card-image-radius, 5px);
        transition: border-radius 0.28s ease-in;
      }

      .film-strip-card-content.hoverable {
        transition: box-shadow 0.28s ease-in;
      }

      .film-strip-card-content.hoverable:hover {
        box-shadow: 0 3px 10px -3px rgba(0,0,0,0.6);
      }

      .film-strip-card-content.hoverable:hover .imageCell {
        border-radius: var(--film-strip-card-image-hover-radius, 0);
      }

      .imageCell {
        height: 64px;
        width: 64px;
        background-color: #f0f0f0;
        background-size: cover;
        background-origin: border-box;
        background-position: 50% 50%;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
      }

      .imageOverlay {
        overflow: hidden;
        padding: 5px 5px 5px 8px;
        font-size: 13px;
        box-sizing: border-box;
        line-height: 1.3;
        display: -ms-flexbox;
        display: -webkit-flex;
        display: flex;
        -ms-flex-direction: row;
        -webkit-flex-direction: row;
        flex-direction: row;
        -ms-flex-align: center;
        -webkit-align-items: center;
        align-items: center;
        letter-spacing: 0.08em;
        font-weight: 400;
        -ms-flex: 1 1 0.000000001px;
        -webkit-flex: 1;
        flex: 1;
        -webkit-flex-basis: 0.000000001px;
        flex-basis: 0.000000001px;
      }

      .imageOverlayText {
        max-height: 3.7em;
        overflow: hidden;
        width: 100%;
        box-sizing: border-box;
      }

      a, a:visited, a:hover {
        color: inherit;
        text-decoration: none;
      }

      :host(.compactCard) .film-strip-card-content {
        -ms-flex-direction: column;
        -webkit-flex-direction: column;
        flex-direction: column;
        height: 70px;
        border-radius: var(--film-strip-card-radius, 2px);
      }
      :host(.compactCard) .imageCell {
        height: 39px;
        width: 100%;
      }
      :host(.compactCard) .imageOverlay {
        overflow: unset;
        padding: 2px 2px 0;
        font-size: 10.5px;
        box-sizing: border-box;
        line-height: 1.3;
        display: block;
        -ms-flex-direction: unset;
        -webkit-flex-direction: unset;
        flex-direction: unset;
        -ms-flex-align: unset;
        -webkit-align-items: unset;
        align-items: unset;
        letter-spacing: unset;
        font-weight: 400;
        -ms-flex: 1 1 0.000000001px;
        -webkit-flex: 1;
        flex: 1;
        -webkit-flex-basis: 0.000000001px;
        flex-basis: 0.000000001px;
        font-family: var(--slick-film-strip-font, system-ui, sans-serif);
      }
      :host(.compactCard) .imageOverlayText {
        max-height: 2.58em;
      }
      :host(.compactCard) .film-strip-card-content .imageCell {
        border-radius: var(--film-strip-card-image-radius, 2px);
      }
    </style>
    <a href="${this.data.fullUrl || this.data.url}" target="${target}" @click="${this.onNavigate}">
      <div class="${contentClass}" style="${cardContentStyle}">
        <div class="imageCell" style="${imageCellStyle}"></div>
        <div class="imageOverlay">
          <div class="imageOverlayText">${this.data.title}</div>
        </div>
      </div>
    </a>
    `;
        }
        updated() {
            if (this.data.id === -100) {
                this.classList.add('disabled');
            }
            else {
                this.classList.remove('disabled');
            }
            if (this.pendingImage) {
                this.pendingImageTimer = window.setTimeout(() => {
                    if (this.pendingImage && this.data.smallImageUrl) {
                        this.$$('.imageCell').style.backgroundImage = `url("${this.data.smallImageUrl}")`;
                        fetchedImages.add(this.data.smallImageUrl);
                    }
                    this.pendingImage = false;
                }, 100);
            }
        }
        onNavigate(e) {
            e.stopPropagation();
            core.widgetAction(this.widgetname, 'nav', 0, this.data.fullUrl || this.data.url, 'og-card', { index: this.index });
            return true;
        }
    };
    __decorate([
        property({ type: Object }),
        __metadata("design:type", Object)
    ], FilmStripOGCard.prototype, "site", void 0);
    __decorate([
        property({ type: Object }),
        __metadata("design:type", Object)
    ], FilmStripOGCard.prototype, "data", void 0);
    __decorate([
        property({ type: String }),
        __metadata("design:type", String)
    ], FilmStripOGCard.prototype, "widgetname", void 0);
    __decorate([
        property({ type: Number }),
        __metadata("design:type", Object)
    ], FilmStripOGCard.prototype, "cardwidth", void 0);
    FilmStripOGCard = __decorate([
        element('film-strip-og-card'),
        __metadata("design:paramtypes", [])
    ], FilmStripOGCard);

    var __decorate$1 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$1 = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let FilmStripTextCard = class FilmStripTextCard extends GuildElement {
        constructor() {
            super(...arguments);
            this.data = { id: -1, at: 0, url: '', title: '', noImg: true, imageIds: [], description: null, totalHearts: 0, readerHearts: 0, isFavorite: false, totalFavorites: 0, categoryColor: 0, segment: '' };
            this.widgetname = 'filmstrip';
            this.cardwidth = 192;
            this.index = 0;
        }
        render() {
            if (this.site) {
                if (!this.data.fullUrl) {
                    this.data.fullUrl = (new URL(this.data.url, this.site.homePageUrl)).toString();
                }
            }
            const target = window.guildNavOpenInNewTab ? '_blank' : '_self';
            const cardContentStyle = `width: ${this.cardwidth}px;`;
            const contentClass = `film-strip-card-content`;
            return html `
    <style>
      :host {
        display: block;
        padding: 0 5px;
      }

      :host(.disabled) {
        opacity: 0;
        pointer-events: none;
      }

      .film-strip-card-content {
        position: relative;
        background: #fff;
        border-radius: var(--film-strip-card-radius, 0);
        display: -ms-flexbox;
        display: -webkit-flex;
        display: flex;
        -ms-flex-direction: row;
        -webkit-flex-direction: row;
        flex-direction: row;
        overflow: hidden;
        box-shadow: 0 3px 1px -2px rgba(0,0,0,.2), 0 2px 2px 0 rgba(0,0,0,.14), 0 1px 5px 0 rgba(0,0,0,.12);
        height: 62px;
        margin-top: 2px;
        text-align: var(--film-strip-text-align, center);
        box-sizing: border-box;
        transition: box-shadow 0.3s ease;
      }

      .film-strip-card-content:hover {
        box-shadow: 0 2px 4px -1px rgba(0,0,0,.2), 0 4px 5px 0 rgba(0,0,0,.14), 0 1px 10px 0 rgba(0,0,0,.12);
      }

      #segmentBar {
        width: 36px;
        position: relative;
        background: var(--filmstrip-border-color, transparent);
        box-sizing: border-box;
      }

      .imageOverlay {
        overflow: hidden;
        padding: 5px 5px 5px 8px;
        font-size: 13px;
        box-sizing: border-box;
        line-height: 1.3;
        display: -ms-flexbox;
        display: -webkit-flex;
        display: flex;
        -ms-flex-direction: row;
        -webkit-flex-direction: row;
        flex-direction: row;
        -ms-flex-align: center;
        -webkit-align-items: center;
        align-items: center;
        letter-spacing: 0.08em;
        font-weight: 400;
        -ms-flex: 1 1 0.000000001px;
        -webkit-flex: 1;
        flex: 1;
        -webkit-flex-basis: 0.000000001px;
        flex-basis: 0.000000001px;
      }

      .imageOverlayText {
        max-height: 3.7em;
        overflow: hidden;
        width: 100%;
        box-sizing: border-box;
      }

      a, a:visited, a:hover {
        color: inherit;
        text-decoration: none;
      }
      #segmentIcon {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 24px;
        height: auto;
        display: block;
        margin-left: -12px;
        margin-top: -12px;
      }
      #segmentIcon.hidden {
        display: none !important;
      }
    </style>
    <a href="${this.data.fullUrl || this.data.url}" target="${target}" @click="${this.onNavigate}">
      <div class="${contentClass}" style="${cardContentStyle}">
        <div id="segmentBar">
          <img id="segmentIcon" class="${this.icon ? '' : 'hidden'}" src="${this.icon}">
        </div>
        <div class="imageOverlay">
          <div class="imageOverlayText">${this.data.title}</div>
        </div>
      </div>
    </a>
    `;
        }
        updated() {
            if (this.data.id === -100) {
                this.classList.add('disabled');
            }
            else {
                this.classList.remove('disabled');
            }
        }
        onNavigate(e) {
            e.stopPropagation();
            core.widgetAction(this.widgetname, 'nav', 0, this.data.fullUrl || this.data.url, 'og-card', { index: this.index });
            return true;
        }
    };
    __decorate$1([
        property({ type: Object }),
        __metadata$1("design:type", Object)
    ], FilmStripTextCard.prototype, "site", void 0);
    __decorate$1([
        property({ type: Object }),
        __metadata$1("design:type", Object)
    ], FilmStripTextCard.prototype, "data", void 0);
    __decorate$1([
        property({ type: String }),
        __metadata$1("design:type", String)
    ], FilmStripTextCard.prototype, "widgetname", void 0);
    __decorate$1([
        property({ type: Number }),
        __metadata$1("design:type", Object)
    ], FilmStripTextCard.prototype, "cardwidth", void 0);
    __decorate$1([
        property({ type: String }),
        __metadata$1("design:type", String)
    ], FilmStripTextCard.prototype, "icon", void 0);
    FilmStripTextCard = __decorate$1([
        element('film-strip-text-card')
    ], FilmStripTextCard);

    class ColorUtils {
        constructor() {
            this.map = new Map();
            this.hue = 0;
        }
        createNewColor() {
            const GOLDEN_RATIO = 0.618033988749895;
            this.hue += GOLDEN_RATIO;
            this.hue %= 1;
            return `hsl(${Math.floor(this.hue * 360)}, 50%, 50%)`;
        }
        getColor(key) {
            if (this.map.has(key)) {
                return this.map.get(key);
            }
            const c = this.createNewColor();
            this.map.set(key, c);
            return c;
        }
    }
    const colorUtils = new ColorUtils();

    class HorizVirtualList {
        constructor(container, scrollElement) {
            this.itemwidth = 100;
            this.buffer = 4;
            this.resizeDebounceInterval = 250;
            this.endpadding = false;
            this.count = 0;
            this.cells = [];
            this.scrollHandler = () => this.position();
            this.currentRenderRange = [-1, -1];
            this.renderRanegDirty = false;
            this.container = container;
            this.scrollElement = scrollElement;
        }
        set delegate(value) {
            this._delegate = value;
            this.refresh();
        }
        get scroller() {
            return this.scrollElement || this.container.parentElement || document.body;
        }
        clear() {
            while (this.container.hasChildNodes() && this.container.lastChild) {
                this.container.removeChild(this.container.lastChild);
            }
            this.cells = [];
            this.scroller.removeEventListener('scroll', this.scrollHandler);
            if (this.resizeHandler) {
                window.removeEventListener('resize', this.resizeHandler);
            }
        }
        refresh() {
            this.clear();
            this.count = this._delegate ? this._delegate.length : 0;
            const totalWidth = this.count * this.itemwidth;
            this.container.style.minWidth = `${totalWidth}px`;
            this.renderRanegDirty = true;
            this.position();
            this.scroller.addEventListener('scroll', this.scrollHandler);
            this.resizeHandler = debounce(this.position.bind(this), this.resizeDebounceInterval, false, this);
            window.addEventListener('resize', this.resizeHandler);
        }
        position() {
            if (!this._delegate) {
                return;
            }
            const ranges = this.computeRanges();
            const renderRange = ranges[1];
            if (!this.renderRanegDirty) {
                if (renderRange[0] === this.currentRenderRange[0] && renderRange[1] === this.currentRenderRange[1]) {
                    return;
                }
            }
            if (this.endpadding) {
                const itemsPerView = Math.max(1, Math.ceil(this.scroller.getBoundingClientRect().width / this.itemwidth));
                const totalWidth = (this.count + itemsPerView - 1) * this.itemwidth;
                this.container.style.minWidth = `${totalWidth}px`;
            }
            this.renderRanegDirty = false;
            this.currentRenderRange = renderRange;
            const doNotTouchCells = new Map();
            const spareCells = this.cells.filter((c) => {
                if (c.index < renderRange[0] || c.index > renderRange[1]) {
                    return true;
                }
                doNotTouchCells.set(c.index, c);
                return false;
            });
            const indicesToRender = [];
            for (let i = renderRange[0]; i <= renderRange[1]; i++) {
                if (!doNotTouchCells.has(i)) {
                    indicesToRender.push(i);
                }
            }
            while (indicesToRender.length && spareCells.length) {
                const i = indicesToRender.shift();
                const cell = spareCells.shift();
                cell.index = i;
                this._delegate.updateElement(cell.node, i);
                this.positionCell(cell.node, i);
                doNotTouchCells.set(i, cell);
            }
            while (spareCells.length) {
                const cell = spareCells.shift();
                this.container.removeChild(cell.node);
            }
            while (indicesToRender.length) {
                const i = indicesToRender.shift();
                const node = this._delegate.createElement();
                node.style.position = 'absolute';
                this.container.appendChild(node);
                this._delegate.updateElement(node, i);
                this.positionCell(node, i);
                doNotTouchCells.set(i, { index: i, node });
            }
            this.cells = Array.from(doNotTouchCells.values());
        }
        positionCell(cell, index) {
            cell.style.transform = `translate(${Math.round(index * this.itemwidth)}px, 0)`;
        }
        computeRanges() {
            const swidth = (this.count * this.itemwidth) || 1;
            const min = Math.max(0, Math.min(this.count - 1, Math.floor((this.scroller.scrollLeft / (swidth || 1)) * this.count)));
            const max = Math.max(0, Math.min(this.count - 1, Math.floor(((this.scroller.scrollLeft + this.scroller.getBoundingClientRect().width) / (swidth || 1)) * this.count)));
            const pre = Math.max(0, min - Math.floor(this.buffer / 2));
            const post = Math.min(this.count - 1, max + this.buffer - (min - pre));
            return [[min, max], [pre, post]];
        }
        scrollToIndex(index) {
            if (this._delegate && Number.isFinite(index)) {
                index = Math.min(this._delegate.length, Math.max(0, index));
                this.scroller.scrollLeft = index * this.itemwidth;
            }
        }
    }

    var __decorate$2 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$2 = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let VirtualListElement = class VirtualListElement extends GuildElement {
        constructor() {
            super(...arguments);
            this.itemwidth = 100;
            this.buffer = 2;
            this.endpadding = false;
        }
        render() {
            return html `
    <style>
      :host {
        display: block;
        overflow: auto;
        box-sizing: border-box;
        width: 100%;
        height: var(--slick-virtual-list-height, 100px);
      }
      #container {
        position: relative;
        height: var(--slick-virtual-list-height, 100px);
        box-sizing: border-box;
      }
    </style>
    <div id="container"></div>
    `;
        }
        updated() {
            if (!this.vl) {
                this.vl = new HorizVirtualList(this.shadowRoot.querySelector('#container'), this);
            }
            this.vl.itemwidth = this.itemwidth;
            this.vl.buffer = this.buffer;
            this.vl.endpadding = this.endpadding;
            if (this._delegate) {
                this.vl.delegate = this._delegate;
            }
        }
        disconnectedCallback() {
            super.disconnectedCallback();
            if (this.vl) {
                this.vl.clear();
                delete this.vl;
            }
        }
        set delegate(value) {
            this._delegate = value;
            if (this.vl) {
                this.vl.delegate = value;
            }
        }
        refresh() {
            if (this.vl) {
                this.vl.position();
            }
        }
        scrollToIndex(index) {
            if (this.vl) {
                this.vl.scrollToIndex(index);
            }
        }
        get container() {
            return this.shadowRoot.querySelector('#container');
        }
    };
    __decorate$2([
        property({ type: Number }),
        __metadata$2("design:type", Object)
    ], VirtualListElement.prototype, "itemwidth", void 0);
    __decorate$2([
        property({ type: Number }),
        __metadata$2("design:type", Object)
    ], VirtualListElement.prototype, "buffer", void 0);
    __decorate$2([
        property({ type: Boolean }),
        __metadata$2("design:type", Object)
    ], VirtualListElement.prototype, "endpadding", void 0);
    VirtualListElement = __decorate$2([
        element('virtual-list')
    ], VirtualListElement);

    var __decorate$3 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$3 = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let HorizSliderView = class HorizSliderView extends GuildElement {
        constructor() {
            super(...arguments);
            this.cellheight = 80;
            this.cellwidth = 80;
            this.arrows = false;
            this.firstVisibleIndex = -1;
            this.lastVisibleIndex = -1;
            this.animating = false;
            this.animationStart = 0;
            this.scrollAnimationData = [0, 0];
        }
        render() {
            const style = `--slick-virtual-list-height: ${this.cellheight}px;`;
            return html `
    <style>
      :host {
        display: block;
      }
      #hs {
        -webkit-overflow-scrolling: touch;
        overflow-x: auto;
        overflow-y: hidden;
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      #hs::-webkit-scrollbar {
        width: 0px;
        height: 0px;
        background: transparent;
      }
    </style>
    <virtual-list endpadding id="hs" .itemwidth="${this.cellwidth}" style="${style}" @scroll="${() => this.onScroll()}"></virtual-list>
    `;
        }
        firstUpdated() {
            super.firstUpdated();
            this.refreshSliderDelegate();
        }
        set delegate(d) {
            this._delegate = d;
            this.refreshSliderDelegate();
        }
        refreshSliderDelegate() {
            if (this.connected && this._delegate) {
                this.$('hs').delegate = this._delegate;
                this.slideToValue(0);
                this.refreshVisibilityWindow(true);
            }
        }
        slideToValue(value) {
            if (this._delegate) {
                const hs = this.$('hs');
                if (hs.getBoundingClientRect().width) {
                    hs.scrollLeft = value * this.cellwidth;
                }
                else {
                    window.setTimeout(() => {
                        this.slideToValue(value);
                    }, 1000);
                }
            }
        }
        onScroll() {
            this.refreshVisibilityWindow();
            const hs = this.$('hs');
            this.fireEvent('scrolled', {
                range: [this.firstVisibleIndex, this.lastVisibleIndex],
                scrollWidth: hs.scrollWidth,
                scrollLeft: hs.scrollLeft
            });
        }
        refreshVisibilityWindow(forceEvent = false) {
            const hs = this.$('hs');
            const cellCount = Math.floor(hs.scrollWidth / this.cellwidth);
            const min = Math.max(0, Math.min(cellCount - 1, Math.floor(((hs.scrollLeft + 5) / hs.scrollWidth) * cellCount)));
            const max = Math.max(0, Math.min(cellCount - 1, Math.floor(((hs.scrollLeft + hs.getBoundingClientRect().width - 5) / hs.scrollWidth) * cellCount)));
            if (isNaN(min) || isNaN(max)) {
                return;
            }
            if (forceEvent || (min !== this.firstVisibleIndex) || (max !== this.lastVisibleIndex)) {
                this.firstVisibleIndex = min;
                this.lastVisibleIndex = max;
                this.fireEvent('range-change', { range: [min, max] });
            }
        }
        nextScrollPage() {
            this.animateToValue(this.lastVisibleIndex);
        }
        prevScrollPage() {
            const newPage = this.firstVisibleIndex - (this.lastVisibleIndex - this.firstVisibleIndex);
            this.animateToValue(Math.max(0, newPage));
        }
        animateToValue(value) {
            if (!this.animating) {
                this.animating = true;
                this.animationStart = 0;
                const hs = this.$('hs');
                this.scrollAnimationData[0] = hs.scrollLeft;
                this.scrollAnimationData[1] = value * this.cellwidth - hs.scrollLeft;
                requestAnimationFrame(this.nextScrollAnimationFrame.bind(this));
            }
        }
        nextScrollAnimationFrame(timestamp) {
            if (!this.animationStart) {
                this.animationStart = timestamp;
            }
            const progress = Math.max(0, Math.min(1, (timestamp - this.animationStart) / 500));
            const hs = this.$('hs');
            hs.scrollLeft = this.scrollAnimationData[0] + (this.scrollAnimationData[1] * progress);
            if (progress < 1) {
                requestAnimationFrame(this.nextScrollAnimationFrame.bind(this));
            }
            else {
                this.animating = false;
            }
        }
    };
    __decorate$3([
        property({ type: Number }),
        __metadata$3("design:type", Number)
    ], HorizSliderView.prototype, "cellheight", void 0);
    __decorate$3([
        property({ type: Number }),
        __metadata$3("design:type", Number)
    ], HorizSliderView.prototype, "cellwidth", void 0);
    __decorate$3([
        property({ type: Boolean }),
        __metadata$3("design:type", Boolean)
    ], HorizSliderView.prototype, "arrows", void 0);
    HorizSliderView = __decorate$3([
        element('horiz-slider-view')
    ], HorizSliderView);

    var __decorate$4 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$4 = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let SlickTextFilmStrip = class SlickTextFilmStrip extends GuildElement {
        constructor() {
            super(...arguments);
            this.widgetname = 'filmstrip';
            this.mode = 'og-card';
            this.cellHeight = 70;
            this.cellWidth = 202;
            this._pages = [];
        }
        render() {
            if (this.mode === 'compact-og') {
                this.cellHeight = 70;
                this.cellWidth = 120;
            }
            return html `
    <style>
      :host {
        display: block;
        clear: both;
        position: relative;
        text-align: left;
      }
      .hidden {
        display: none !important;
      }
    </style>
    <horiz-slider-view id="scroller" .cellheight="${this.cellHeight}" .cellwidth="${this.cellWidth}" @scrolled="${() => this.reportScroll()}"></horiz-slider-view>
    `;
        }
        set pages(value) {
            this._pages = value;
            this.resetDelegate();
        }
        resetDelegate() {
            if (this.$('scroller')) {
                this.$('scroller').delegate = this;
            }
        }
        firstUpdated() {
            super.firstUpdated();
            this.resetDelegate();
        }
        createElement() {
            if (this.mode === 'text') {
                return new FilmStripTextCard();
            }
            return new FilmStripOGCard();
        }
        updateElement(child, index) {
            if (this.mode === 'text') {
                const sp = child;
                sp.cardwidth = this.cellWidth - 10;
                sp.widgetname = this.widgetname;
                sp.site = this.site;
                sp.data = this._pages[index];
                sp.index = index;
                sp.icon = sp.data.iconImageUrl;
                const color = sp.data.categoryColor;
                sp.style.setProperty('--filmstrip-border-color', (typeof color === 'string') ? color : colorUtils.getColor(`${color}`));
            }
            else {
                const sp = child;
                if (this.mode === 'compact-og') {
                    sp.classList.add('compactCard');
                    sp.compactMode = true;
                }
                sp.cardwidth = this.cellWidth - 10;
                sp.widgetname = this.widgetname;
                sp.site = this.site;
                sp.data = this._pages[index];
                sp.index = index;
            }
        }
        get length() {
            return this._pages.length;
        }
        reportScroll() {
            core.widgetAction(this.widgetname, 'scroll', 5000, undefined, this.mode);
        }
        nextScrollPage() {
            this.$('scroller').nextScrollPage();
        }
        prevScrollPage() {
            this.$('scroller').prevScrollPage();
        }
    };
    __decorate$4([
        property({ type: String }),
        __metadata$4("design:type", String)
    ], SlickTextFilmStrip.prototype, "widgetname", void 0);
    __decorate$4([
        property({ type: String }),
        __metadata$4("design:type", String)
    ], SlickTextFilmStrip.prototype, "mode", void 0);
    __decorate$4([
        property(),
        __metadata$4("design:type", Object)
    ], SlickTextFilmStrip.prototype, "cellHeight", void 0);
    __decorate$4([
        property(),
        __metadata$4("design:type", Object)
    ], SlickTextFilmStrip.prototype, "cellWidth", void 0);
    SlickTextFilmStrip = __decorate$4([
        element('slick-text-film-strip')
    ], SlickTextFilmStrip);

    var __decorate$5 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$5 = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    const fetchedImages$1 = new Set();
    let FilmStripCard = class FilmStripCard extends GuildElement {
        constructor() {
            super(...arguments);
            this.data = { id: -1, at: 0, url: '', title: '', noImg: true, description: null, totalHearts: 0, readerHearts: 0, isFavorite: false, totalFavorites: 0, categoryColor: 0, segment: '' };
            this.compact = false;
            this.widgetname = 'filmstrip';
            this.pendingImage = false;
            this.pendingImageTimer = 0;
            this.index = 0;
            this.thumbnailSize = { width: 96, height: 64 };
        }
        render() {
            let imageCellStyle = '';
            this.pendingImage = false;
            if (this.pendingImageTimer) {
                window.clearTimeout(this.pendingImageTimer);
                this.pendingImageTimer = 0;
            }
            if (this.site) {
                if (!this.data.noImg) {
                    if (!this.data.smallImageUrl) {
                        this.data.smallImageUrl = core.thumbnailUrl(this.data, this.thumbnailSize.width || 96, this.thumbnailSize.height || 64) || undefined;
                    }
                    if (this.data.smallImageUrl) {
                        if ((fetchedImages$1.size === 0) || fetchedImages$1.has(this.data.smallImageUrl)) {
                            imageCellStyle = `background-image: url("${this.data.smallImageUrl}");`;
                            fetchedImages$1.add(this.data.smallImageUrl);
                        }
                        else {
                            this.pendingImage = true;
                        }
                    }
                }
                if (!this.data.fullUrl) {
                    this.data.fullUrl = (new URL(this.data.url, this.site.homePageUrl)).toString();
                }
            }
            const target = window.guildNavOpenInNewTab ? '_blank' : '_self';
            const tipStyle = this.compact ? 'display: none;' : '';
            return html `
    <style>
      :host {
        display: block;
        padding: 0 5px;
      }

      :host(.disabled) {
        opacity: 0;
        pointer-events: none;
      }

      .film-strip-card-content {
        width: var(--film-strip-card-width, 96px);
        background: #fff;
        border-radius: 5px;
        box-shadow: 0 3px 10px -3px rgba(0,0,0,0.6);
      }

      .imageCell {
        height: var(--film-strip-card-height, 64px);
        background-color: #f0f0f0;
        background-size: cover;
        background-origin: border-box;
        background-position: 50% 50%;
        width: 100%;
        box-sizing: border-box;
        border-radius: 5px;
      }

      a, a:visited, a:hover {
        color: inherit;
        text-decoration: none;
      }

      .tooltip {
        position: absolute;
        top: var(--film-strip-tooltip-top, 72px);
        left: 0;
        font-size: 10px;
        letter-spacing: 0.05em;
        line-height: 1.15;
        white-space: nowrap;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        display: none;
      }

      .film-strip-card-content:hover .tooltip {
        display: block;
      }
    </style>
    <a href="${this.data.fullUrl || this.data.url}" target="${target}" @click="${this.onNavigate}">
      <div class="film-strip-card-content">
        <div class="imageCell" style="${imageCellStyle}"></div>
        <div class="tooltip" style="${tipStyle}">${this.data.title}</div>
      </div>
    </a>
    `;
        }
        updated() {
            if (this.data.id === -100) {
                this.classList.add('disabled');
            }
            else {
                this.classList.remove('disabled');
            }
            if (this.pendingImage) {
                this.pendingImageTimer = window.setTimeout(() => {
                    if (this.pendingImage && this.data.smallImageUrl) {
                        this.$$('.imageCell').style.backgroundImage = `url("${this.data.smallImageUrl}")`;
                        fetchedImages$1.add(this.data.smallImageUrl);
                    }
                    this.pendingImage = false;
                }, 100);
            }
        }
        onNavigate(e) {
            e.stopPropagation();
            core.widgetAction(this.widgetname, 'nav', 0, this.data.fullUrl || this.data.url, 'thumbnails', { index: this.index });
            return true;
        }
    };
    __decorate$5([
        property({ type: Object }),
        __metadata$5("design:type", Object)
    ], FilmStripCard.prototype, "site", void 0);
    __decorate$5([
        property({ type: Object }),
        __metadata$5("design:type", Object)
    ], FilmStripCard.prototype, "data", void 0);
    __decorate$5([
        property({ type: Boolean }),
        __metadata$5("design:type", Boolean)
    ], FilmStripCard.prototype, "compact", void 0);
    __decorate$5([
        property({ type: String }),
        __metadata$5("design:type", String)
    ], FilmStripCard.prototype, "widgetname", void 0);
    FilmStripCard = __decorate$5([
        element('film-strip-card')
    ], FilmStripCard);

    var __decorate$6 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$6 = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let ThumbnailFilmStrip = class ThumbnailFilmStrip extends GuildElement {
        constructor() {
            super();
            this.compact = false;
            this.widgetname = 'filmstrip';
            this.thumbnailSize = { width: 96, height: 64 };
            this.recommendationKeywords = [];
            this._pages = [];
            this.currentCardTitle = '';
            this.prevCardTitle = '';
            const userAgent = window.navigator ? window.navigator.userAgent : '';
            this.mobile = (userAgent.toLowerCase().indexOf('mobi') >= 0) && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
        }
        render() {
            const h = this.thumbnailSize.height || 64;
            const w = this.thumbnailSize.width || 96;
            const cellHeight = (this.mobile || this.compact) ? (h + 6) : h + 26;
            const cellwidth = w + 10;
            return html `
    <style>
      :host {
        display: block;
        clear: both;
        position: relative;
        text-align: left;
      }
      #overlay {
        position: relative;
        padding: 0 0 0 25px;
      }
      #title {
        position: relative;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0 0 10px 5px;
        font-size: 13px;
        letter-spacing: 0.05em;
        line-height: 1;
        min-height: 13px;
      }
      svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 30px;
        height: 23px;
      }
      path {
        fill: none;
        stroke: #d8d8d8;
        stroke-linejoin: round;
        stroke-width: 2px;
      }
    </style>
    <div id="overlay">
      <div id="title"></div>
      <svg><path d="M10,23 v-17 h15"></path></svg>
    </div>
    <horiz-slider-view id="scroller" .cellheight="${cellHeight}" .cellwidth="${cellwidth}" @range-change="${(e) => this.onRangeChange(e)}" @scrolled="${() => this.reportScroll()}"></horiz-slider-view>
    `;
        }
        set pages(value) {
            this._pages = value;
            this.resetDelegate();
        }
        resetDelegate() {
            if (this.$('scroller')) {
                this.$('scroller').delegate = this;
            }
        }
        firstUpdated() {
            super.firstUpdated();
            this.resetDelegate();
            this.updateCardTitle();
            this.style.setProperty('--film-strip-card-height', `${this.thumbnailSize.height || 64}px`);
            this.style.setProperty('--film-strip-card-width', `${this.thumbnailSize.width || 96}px`);
            this.style.setProperty('--film-strip-tooltip-top', `${(this.thumbnailSize.height || 64) + 8}px`);
        }
        updateCardTitle() {
            if (this.connected) {
                const overlayTitle = this.currentCardTitle || this.getBlankCardTitle();
                this.$('title').textContent = overlayTitle;
                this.$('overlay').style.opacity = overlayTitle ? '1' : '0';
            }
        }
        getBlankCardTitle() {
            if (this.compact && this.site) {
                if (this.recommendationKeywords.length) {
                    return `More ${this.recommendationKeywords.join(', ').trim()}...`;
                }
                return `More from ${this.site.name}`;
            }
            return '';
        }
        createElement() {
            return new FilmStripCard();
        }
        updateElement(child, index) {
            const sp = child;
            sp.widgetname = this.widgetname;
            sp.compact = this.compact;
            sp.site = this.site;
            sp.data = this._pages[index];
            sp.index = index;
            sp.thumbnailSize = this.thumbnailSize;
        }
        get length() {
            return this._pages.length;
        }
        onRangeChange(event) {
            const range = event.detail.range;
            if (range.length !== 2) {
                this.cardTitle = this.getBlankCardTitle();
                return;
            }
            if (this._pages.length && range[0] >= 0 && range[0] < this._pages.length) {
                if (this.compact) {
                    if (!this.prevCardTitle) {
                        this.prevCardTitle = this._pages[range[0]].title || '';
                        this.cardTitle = this.getBlankCardTitle();
                    }
                    else {
                        this.cardTitle = this._pages[range[0]].title || '';
                    }
                }
                else {
                    this.cardTitle = this._pages[range[0]].title || '';
                }
            }
            else {
                this.cardTitle = this.getBlankCardTitle();
            }
        }
        set cardTitle(value) {
            this.currentCardTitle = value || '';
            this.updateCardTitle();
        }
        reportScroll() {
            core.widgetAction(this.widgetname, 'scroll', 5000, undefined, 'thumbnails');
        }
        nextScrollPage() {
            this.$('scroller').nextScrollPage();
        }
        prevScrollPage() {
            this.$('scroller').prevScrollPage();
        }
    };
    __decorate$6([
        property({ type: Boolean }),
        __metadata$6("design:type", Object)
    ], ThumbnailFilmStrip.prototype, "compact", void 0);
    __decorate$6([
        property({ type: String }),
        __metadata$6("design:type", String)
    ], ThumbnailFilmStrip.prototype, "widgetname", void 0);
    __decorate$6([
        property(),
        __metadata$6("design:type", Object)
    ], ThumbnailFilmStrip.prototype, "thumbnailSize", void 0);
    ThumbnailFilmStrip = __decorate$6([
        element('thumbnail-film-strip'),
        __metadata$6("design:paramtypes", [])
    ], ThumbnailFilmStrip);

    var __decorate$7 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$7 = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    const MAP_REF = '__x_icon_map__';
    let XIcon = class XIcon extends GuildElement {
        render() {
            const icon = this.icon || '';
            let path = '';
            const mapRef = icon && window[MAP_REF];
            if (mapRef) {
                path = mapRef[icon] || '';
            }
            return html `
    <style>
      :host {
        display: -ms-inline-flexbox;
        display: -webkit-inline-flex;
        display: inline-flex;
        -ms-flex-align: center;
        -webkit-align-items: center;
        align-items: center;
        -ms-flex-pack: center;
        -webkit-justify-content: center;
        justify-content: center;
        position: relative;
        vertical-align: middle;
        fill: currentColor;
        stroke: none;
        width: 24px;
        height: 24px;
        box-sizing: initial;
      }
    
      svg {
        pointer-events: none;
        display: block;
        width: 100%;
        height: 100%;
      }
    </style>
    <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false">
      <g>
        <path d="${path}"></path>
      </g>
    </svg>
    `;
        }
    };
    __decorate$7([
        property({ type: String }),
        __metadata$7("design:type", String)
    ], XIcon.prototype, "icon", void 0);
    XIcon = __decorate$7([
        element('x-icon')
    ], XIcon);

    var __decorate$8 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$8 = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let NavFilmStrip = class NavFilmStrip extends GuildElement {
        constructor() {
            super(...arguments);
            this.siteCode = '';
            this.pageUrl = '';
            this.collapsedMode = false;
            this.widgetname = 'filmstrip';
            this.search = false;
            this.thumbnailSize = { width: 96, height: 64 };
            this.intersectionObserverAttached = false;
            this.intersectionNotified = false;
            this.pages = [];
            this.intersectionHandler = (entries) => {
                const entry = entries[0];
                if ((!this.intersectionNotified) && entry && entry.isIntersecting) {
                    if (entry.intersectionRatio >= 0.5) {
                        core.widgetAction(this.widgetname, 'impression', 0, undefined, this.mode);
                        this.intersectionNotified = true;
                    }
                }
            };
        }
        render() {
            if (!this.modeInfo) {
                return html ``;
            }
            if (!this.mode) {
                const compactSize = window.innerWidth <= 600;
                if (compactSize) {
                    this.mode = this.modeInfo.mobileMode || this.modeInfo.mode || 'compact-og';
                }
                else {
                    this.mode = this.modeInfo.mode || 'og-card';
                }
            }
            const stripClassName = (this.mode === 'thumbnails') ? 'hidden' : '';
            const strip2ClassName = (this.mode === 'thumbnails') ? '' : 'hidden';
            return html `
    <style>
      :host {
        display: block;
        clear: both;
        position: relative;
      }
      :host(.withSearch) {
        padding-right: 60px !important;
      }
      .hidden {
        display: none;
      }
      #searchPanel {
        position: absolute;
        top: 10px;
        right: 8px;
        border-radius: 50%;
        box-shadow: 0px 2px 5px -2px rgba(0,0,0,0.4);
        background: var(--slick-icon-bgcolor, #f4f4f5);
        color: var(--slick-icon-color, #000);
        display: none;
      }
      #searchPanel x-icon {
        padding: 8px;
        width: 28px;
        height: 28px;
        cursor: pointer;
      }
      :host(.withSearch) #searchPanel {
        display: block;
      }
      #chevPanel x-icon {
        position: absolute;
        top: var(--slick-film-strip-overlay-top, 0);
        height: var(--slick-film-strip-overlay-height, 64px);
        background: var(--slick-nav-icon-bg, white);
        color: var(--slick-nav-icon-fg, #000000);
        opacity: 0.9;
        padding: 0 5px;
        cursor: pointer;
      }
      #chevPanel{
        opacity: 0;
      }
      :host(:hover) #chevPanel {
        opacity: 1;
      }
      #chevL {
        left: 0;
      }
      #chevR {
        right: 0;
      }
      #chevL:hover {
        opacity: 1;
      }
      #chevR:hover {
        opacity: 1;
      }

      @media (max-width: 600px) {
        :host(.withSearch) {
          padding-right: 51px;
        }
        #searchPanel {
          right: 3px;
        }
      }

      @media (max-width: 700px) {
        #chevPanel {
          display: none;
        }
      }
    </style>
    <div style="position: relative;">
      <slick-text-film-strip class="${stripClassName}" id="strip" .mode="${this.mode}" .widgetname="${this.widgetname}" @scrolled="${this.onScroll}"></slick-text-film-strip>
      <thumbnail-film-strip class="${strip2ClassName}" id="strip2" .thumbnailSize="${this.thumbnailSize}" .compact="${this.collapsedMode}" .widgetname="${this.widgetname}" @scrolled="${this.onScroll}"></thumbnail-film-strip>
      <div id="chevPanel">
        <x-icon id="chevL" icon="chevron-left" class="hidden" @click="${this.prevPage}"></x-icon>
        <x-icon id="chevR" icon="chevron-right" @click="${this.nextPage}"></x-icon>
      </div>
    </div>
    <div id="searchPanel">
      <x-icon icon="search" @click="${this.onSearch}"></x-icon>
    </div>
    `;
        }
        updated(changedProperties) {
            if (changedProperties.has('search')) {
                if (this.search) {
                    this.classList.add('withSearch');
                }
                else {
                    this.classList.remove('withSearch');
                }
            }
            const chevPanel = this.$('chevPanel');
            const searchPanel = this.$('searchPanel');
            if (this.mode === 'thumbnails') {
                searchPanel.style.top = `${23 + (((this.thumbnailSize.height || 64) - 44) / 2)}px`;
                chevPanel.style.setProperty('--slick-film-strip-overlay-top', '23px');
                chevPanel.style.setProperty('--slick-film-strip-overlay-height', `${(this.thumbnailSize.height || 64) + 6}px`);
            }
            else {
                searchPanel.style.top = null;
                chevPanel.style.removeProperty('--slick-film-strip-overlay-top');
                chevPanel.style.removeProperty('--slick-film-strip-overlay-height');
            }
            this.loadData();
        }
        async loadData() {
            if (this.siteCode && this.pageUrl) {
                const site = (await core.getSiteInfo()).site;
                this.pages = await core.getStripPages();
                if (this.mode === 'thumbnails') {
                    const strip = this.$('strip2');
                    strip.site = site,
                        strip.pages = this.pages;
                }
                else {
                    const strip = this.$('strip');
                    strip.site = site;
                    strip.pages = this.pages;
                }
                this.attachIntersectionObserver();
                this.fireEvent('pages-loaded', { count: this.pages.length, filterCount: 0 });
            }
        }
        attachIntersectionObserver() {
            if (!this.intersectionObserverAttached) {
                this.intersectionObserverAttached = true;
                if ('IntersectionObserver' in window) {
                    const options = {
                        threshold: 0.5
                    };
                    (new IntersectionObserver(this.intersectionHandler, options)).observe(this);
                }
                else {
                    if (!this.intersectionNotified) {
                        core.widgetAction(this.widgetname, 'impression', 0, undefined, this.mode);
                        this.intersectionNotified = true;
                    }
                }
            }
        }
        onSearch() {
            core.widgetAction(this.widgetname, 'open-search', 0);
            document.dispatchEvent(SlickCustomEvent('slick-show-search'));
        }
        onScroll(e) {
            if (!this.scrollPending) {
                setTimeout(() => {
                    if (this.scrollPending) {
                        if (this.scrollPending.scrollLeft > 0) {
                            this.$('chevL').classList.remove('hidden');
                        }
                        else {
                            this.$('chevL').classList.add('hidden');
                        }
                        if (this.scrollPending.range[1] < (this.pages.length - 1)) {
                            this.$('chevR').classList.remove('hidden');
                        }
                        else {
                            this.$('chevR').classList.add('hidden');
                        }
                        this.scrollPending = undefined;
                    }
                }, 300);
            }
            this.scrollPending = e.detail;
        }
        nextPage() {
            if (this.mode === 'thumbnails') {
                const strip = this.$('strip2');
                strip.nextScrollPage();
            }
            else {
                const strip = this.$('strip');
                strip.nextScrollPage();
            }
        }
        prevPage() {
            if (this.mode === 'thumbnails') {
                const strip = this.$('strip2');
                strip.prevScrollPage();
            }
            else {
                const strip = this.$('strip');
                strip.prevScrollPage();
            }
        }
    };
    __decorate$8([
        property({ type: String }),
        __metadata$8("design:type", String)
    ], NavFilmStrip.prototype, "siteCode", void 0);
    __decorate$8([
        property({ type: String }),
        __metadata$8("design:type", String)
    ], NavFilmStrip.prototype, "pageUrl", void 0);
    __decorate$8([
        property({ type: Boolean }),
        __metadata$8("design:type", Boolean)
    ], NavFilmStrip.prototype, "collapsedMode", void 0);
    __decorate$8([
        property({ type: String }),
        __metadata$8("design:type", String)
    ], NavFilmStrip.prototype, "widgetname", void 0);
    __decorate$8([
        property({ type: String }),
        __metadata$8("design:type", Object)
    ], NavFilmStrip.prototype, "modeInfo", void 0);
    __decorate$8([
        property({ type: Boolean }),
        __metadata$8("design:type", Object)
    ], NavFilmStrip.prototype, "search", void 0);
    __decorate$8([
        property(),
        __metadata$8("design:type", Object)
    ], NavFilmStrip.prototype, "thumbnailSize", void 0);
    NavFilmStrip = __decorate$8([
        element('nav-film-strip')
    ], NavFilmStrip);

    const flexStyles = html `
  <style>
    .layout.horizontal,
    .layout.vertical {
      display: -ms-flexbox;
      display: -webkit-flex;
      display: flex;
    }
    .layout.horizontal {
      -ms-flex-direction: row;
      -webkit-flex-direction: row;
      flex-direction: row;
    }
    .layout.vertical {
      -ms-flex-direction: column;
      -webkit-flex-direction: column;
      flex-direction: column;
    }
    .layout.center {
      -ms-flex-align: center;
      -webkit-align-items: center;
      align-items: center;
    }
    .layout.wrap {
      -ms-flex-wrap: wrap;
      -webkit-flex-wrap: wrap;
      flex-wrap: wrap;
    }
    .flex {
      -ms-flex: 1 1 0.000000001px;
      -webkit-flex: 1;
      flex: 1;
      -webkit-flex-basis: 0.000000001px;
      flex-basis: 0.000000001px;
    }
  </style>
`;

    class LinkHighlightAgent {
        constructor() {
            this.siteCode = '';
            this.pageUrl = '';
            this.activated = false;
            this.linksAttached = false;
            this.anchors = [];
            this.processedLinks = new Map();
            this.prevScrollValue = 0;
        }
        initialize(siteCode, pageUrl, delegate) {
            this.siteCode = siteCode;
            this.pageUrl = pageUrl;
            this.delegate = delegate;
        }
        activate() {
            this.activated = true;
            this.attachLinks();
        }
        deactivate() {
            this.activated = false;
        }
        onScroll(value) {
            if (this.activated && this.delegate) {
                const st = value;
                if (!this.prevScrollValue) {
                    this.prevScrollValue = st;
                }
                else {
                    const diff = st - this.prevScrollValue;
                    this.prevScrollValue = st;
                    this.anchors.forEach((a) => {
                        const rect = a.getBoundingClientRect();
                        const pct = (rect.top + rect.height) / (window.innerHeight || 1);
                        const offSreen = (pct < 0) || (pct > 1);
                        const state = a.dataset.slickstate || 'unknown';
                        switch (state) {
                            case 'unknown':
                                if (offSreen) {
                                    a.dataset.slickstate = 'activated';
                                    a.style.transition = 'background-color 0.3s ease';
                                }
                                else {
                                    a.dataset.slickstate = 'unknown';
                                }
                                break;
                            case 'activated': {
                                const highlight = (pct < 0.66) && (pct >= 0.15);
                                if (highlight) {
                                    a.dataset.slickstate = 'highlighted';
                                    this.highlightLink(a, true);
                                    if (diff > 0) {
                                        this.showLinkPopup(a.href);
                                    }
                                }
                                break;
                            }
                            case 'highlighted':
                                const removeHighlight = (pct >= 0.66) || (pct < 0.15);
                                if (removeHighlight) {
                                    a.dataset.slickstate = 'activated';
                                    this.highlightLink(a, false);
                                    this.hideLinkPopup(a.href);
                                }
                                break;
                        }
                    });
                }
            }
        }
        highlightLink(a, highlighted) {
            if (highlighted) {
                a.classList.add('slick-link-highlighted');
                a.style.backgroundColor = 'var(--slick-link-highlight, #FFEB3B)';
            }
            else {
                a.classList.remove('slick-link-highlighted');
                a.style.removeProperty('background-color');
            }
        }
        showLinkPopup(url) {
            if (this.delegate && this.processedLinks.has(url)) {
                this.delegate.showPopup(this.processedLinks.get(url), 'link-highlighter');
            }
        }
        hideLinkPopup(url) {
            if (this.delegate && this.processedLinks.has(url)) {
                this.delegate.hidePopup(this.processedLinks.get(url).id);
            }
        }
        async attachLinks() {
            if ((!this.linksAttached) && this.siteCode && this.pageUrl) {
                const currentPage = core.session.currentPage;
                this.processedLinks.clear();
                if (currentPage && currentPage.links && currentPage.links.length) {
                    currentPage.links.forEach((link) => {
                        this.processedLinks.set(link.hrefOnPage, {
                            id: link.resolvedUrl,
                            href: link.resolvedUrl,
                            finalUrl: link.canonicalUrl || link.finalUrl,
                            image: link.thumbnailImageUrl,
                            text: link.title || link.description || link.resolvedUrl,
                            description: link.description || '',
                            widgetType: 'link-highlighter',
                            intrasite: link.intraSite
                        });
                    });
                }
                const anchors = [];
                const nl = document.querySelectorAll('.post');
                if (nl && nl.length) {
                    for (let i = 0; i < nl.length; i++) {
                        const node = nl[i];
                        if (!node.classList.contains('post-summary')) {
                            const links = this.getLinks(node);
                            links.forEach((a) => anchors.push(a));
                        }
                    }
                }
                this.anchors = anchors.filter((a) => {
                    let has = this.processedLinks.has(a.href);
                    if (!has && a.getAttribute('href')) {
                        has = this.processedLinks.has(a.getAttribute('href'));
                    }
                    return has;
                });
                this.anchors.forEach((a) => {
                    if (!a._slickAttached) {
                        a.addEventListener('click', (e) => {
                            const alink = e.currentTarget;
                            if (alink && (alink.dataset.slickstate === 'highlighted')) {
                                e.stopPropagation();
                                core.widgetAction('link-highlighter', 'link-nav', 0, alink.href);
                            }
                        });
                        a._slickAttached = true;
                    }
                });
                this.linksAttached = true;
            }
        }
        getLinks(node, siteHost) {
            const ret = [];
            const links = node.querySelectorAll('a');
            for (let i = 0; i < links.length; i++) {
                const a = links[i];
                const href = a.href;
                if (href && a.textContent && a.textContent.trim()) {
                    if (siteHost) {
                        const url = new URL(href, window.location.href);
                        const host = url.host;
                        if (host.indexOf(siteHost.replace('/', '')) >= 0) {
                            ret.push(a);
                        }
                    }
                    else {
                        ret.push(a);
                    }
                }
            }
            return ret;
        }
    }

    class RecommendationAgent {
        constructor() {
            this.activated = false;
            this.prevScrollValue = 0;
            this.bottomTimer = 0;
            this.scrollUpTimer = 0;
            this.recommendationIndex = 0;
            this.lastTimestamp = 0;
            this.engagementTimer = 0;
            this.activationTime = 0;
        }
        initialize(_siteCode, _pageUrl, delegate) {
            this.delegate = delegate;
        }
        activate() {
            this.activated = true;
            this.activationTime = Date.now();
            this.fetchRecommendations();
            this.pollEngagement();
        }
        deactivate() {
            this.activated = false;
            this.stopEngagementPoll();
        }
        async fetchRecommendations() {
            if (!this.pages) {
                this.pages = await core.getRecommendedPages();
                const nl = document.querySelectorAll('.post');
                if (nl && nl.length) {
                    for (let i = 0; i < nl.length; i++) {
                        const node = nl[i];
                        if (!node.classList.contains('post-summary')) {
                            this.postNode = node;
                            break;
                        }
                    }
                }
            }
        }
        pollEngagement() {
            this.stopEngagementPoll();
            this.engagementTimer = window.setInterval(() => {
                const now = Date.now();
                const diff = now - Math.max(this.lastTimestamp, (core.lastEngaged || this.activationTime));
                if (diff > 25000 && (diff < 90000)) {
                    this.showRecommendation();
                }
            }, 10000);
        }
        stopEngagementPoll() {
            if (this.engagementTimer) {
                window.clearInterval(this.engagementTimer);
                this.engagementTimer = 0;
            }
        }
        onScroll(value) {
            if (this.activated && this.delegate) {
                this.checkPostPosition(value);
            }
        }
        checkPostPosition(st) {
            if (this.postNode) {
                const rect = this.postNode.getBoundingClientRect();
                const pct = (rect.top + rect.height) / (window.innerHeight || 1);
                if ((pct <= 1) && (!this.bottomTimer)) {
                    this.bottomTimer = window.setTimeout(() => {
                        this.showRecommendation();
                    }, 15000);
                }
                if (!this.prevScrollValue) {
                    this.prevScrollValue = st;
                }
                else {
                    const diff = st - this.prevScrollValue;
                    if (diff < 0 && (rect.height >= window.innerHeight / 2)) {
                        if (Math.abs(diff) >= Math.min(window.innerHeight, (0.5 * rect.height))) {
                            if (!this.scrollUpTimer) {
                                this.scrollUpTimer = window.setTimeout(() => {
                                    this.scrollUpTimer = 0;
                                    this.showRecommendation();
                                }, 10000);
                            }
                            this.prevScrollValue = st;
                        }
                    }
                    else {
                        this.prevScrollValue = st;
                    }
                }
            }
        }
        showRecommendation() {
            if (this.bottomTimer) {
                window.clearTimeout(this.bottomTimer);
            }
            if (this.scrollUpTimer) {
                window.clearTimeout(this.scrollUpTimer);
                this.scrollUpTimer = 0;
            }
            const now = Date.now();
            if ((now - this.lastTimestamp) < 15000) {
                return;
            }
            if (this.delegate && this.pages && this.pages.length) {
                if (this.recommendationIndex >= this.pages.length) {
                    this.recommendationIndex = 0;
                }
                const page = this.pages[this.recommendationIndex];
                const shown = this.delegate.showPopup({
                    id: `${page.id}`,
                    annotation: 'Recommended',
                    href: page.url,
                    finalUrl: page.url,
                    text: page.title || page.url,
                    image: page.noImg ? undefined : (core.thumbnailUrl(page, 64) || undefined),
                    widgetType: 'link-recommender',
                    description: page.description || '',
                    intrasite: true
                }, 'link-recommender');
                if (shown) {
                    this.lastTimestamp = now;
                    this.recommendationIndex++;
                    setTimeout(() => {
                        this.delegate.hidePopup(`${page.id}`);
                    }, 8000);
                }
            }
        }
    }

    const KEY = 'slick-welcome-agent-2';
    class WelcomeAgent {
        constructor(config) {
            this.pageUrl = '';
            this.engaged = false;
            this.showing = false;
            this.engagementHandle = 0;
            this.showOnEngagement = false;
            this.engagementBlocked = false;
            this.config = config;
        }
        initialize(_siteCode, pageUrl, delegate) {
            this.delegate = delegate;
            this.pageUrl = pageUrl;
        }
        onScroll(value) {
            if (value) {
                this.onEngaged();
            }
        }
        activate() {
            if (this.config && this.config.message) {
                this.info = this.info || store.get(KEY, true) || { shown: false };
                if (!this.info.shown) {
                    this.showOnEngagement = true;
                    this.engagementBlocked = true;
                    this.attachEngagementListener();
                }
            }
        }
        deactivate() {
            this.hideMessage();
            this.detachEngagementListener();
        }
        attachEngagementListener() {
            if (!this.engagementHandle) {
                this.engagementHandle = bus.subscribe('engagement', () => this.onEngaged());
            }
        }
        detachEngagementListener() {
            if (this.engagementHandle) {
                bus.unsubscrive('engagement', this.engagementHandle);
                this.engagementHandle = 0;
            }
        }
        onEngaged() {
            if (this.showOnEngagement) {
                this.showOnEngagement = false;
                setTimeout(() => this.showMessage());
                return;
            }
            if (this.engagementBlocked) {
                return;
            }
            if (!this.engaged) {
                this.engaged = true;
                setTimeout(() => this.hideMessage(), 1200);
            }
            this.detachEngagementListener();
        }
        hideMessage() {
            if (this.showing) {
                this.showing = false;
                if (this.delegate) {
                    this.delegate.hidePopup(this.pageUrl);
                }
                if (this.engaged && this.info) {
                    this.info.shown = true;
                    store.set(KEY, this.info);
                }
            }
        }
        showMessage() {
            if (this.delegate && !this.showing) {
                const shown = this.delegate.showPopup({
                    id: this.pageUrl,
                    text: this.config.message,
                    image: this.config.imageUrl,
                    href: this.config.url,
                    finalUrl: this.config.url,
                    description: '',
                    widgetType: 'greeting',
                    intrasite: true
                }, 'greeting');
                if (shown) {
                    this.showing = true;
                    this.engagementBlocked = true;
                    setTimeout(() => {
                        this.engagementBlocked = false;
                    }, 2000);
                }
                else {
                    setTimeout(() => {
                        if (!this.engaged) {
                            this.showMessage();
                        }
                    }, 5000);
                }
            }
        }
    }

    var __decorate$9 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$9 = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    var DacTabBar_1;
    let DacTabBar = DacTabBar_1 = class DacTabBar extends GuildElement {
        constructor() {
            super(...arguments);
            this.selected = '';
        }
        render() {
            return html `
    <style>
      :host {
        display: block;
        text-transform: uppercase;
        width: 100%;
        box-sizing: border-box;
      }
      #container {
        position: relative;
        width: 100%;
        box-sizing: border-box;
      }
      #container ::slotted(*) {
        transform: translateY(1px);
      }
    </style>
    <div id="container"><slot></slot></div>
    `;
        }
        updated() {
            if (this.selected) {
                const matches = this.$$('slot').assignedNodes().filter((d) => {
                    if (d.nodeType === Node.ELEMENT_NODE) {
                        return d.getAttribute('name') === this.selected;
                    }
                    return false;
                });
                if (matches.length) {
                    const selectedTab = matches[0];
                    if (selectedTab !== this.prevSelectedTab) {
                        if (this.prevSelectedTab) {
                            this.prevSelectedTab.classList.remove(DacTabBar_1.selectedClass);
                        }
                        selectedTab.classList.add(DacTabBar_1.selectedClass);
                        this.prevSelectedTab = selectedTab;
                    }
                    return;
                }
            }
            if (this.prevSelectedTab) {
                this.prevSelectedTab.classList.remove(DacTabBar_1.selectedClass);
                this.prevSelectedTab = undefined;
            }
        }
    };
    DacTabBar.selectedClass = 'tab-selected';
    __decorate$9([
        property({ type: String }),
        __metadata$9("design:type", Object)
    ], DacTabBar.prototype, "selected", void 0);
    DacTabBar = DacTabBar_1 = __decorate$9([
        element('tab-bar')
    ], DacTabBar);

    var __decorate$a = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    let DacTab = class DacTab extends GuildElement {
        render() {
            return html `
    <style>
      :host {
        display: inline-block;
        position: relative;
        border-top: 3px solid transparent;
        border-left: 1px solid transparent;
        border-right: 1px solid transparent;
        border-bottom: 1px solid var(--slick-tab-gray, #e5e5e5);
        transition: border .1s ease-in;
      }
      :host(:hover) {
        border-top: 3px solid var(--medium-grey);
      }
      :host(.tab-selected) {
        background: white;
        border-color: var(--highlight-pink);
        border-left: 1px solid var(--slick-tab-gray, #e5e5e5);
        border-right: 1px solid var(--slick-tab-gray, #e5e5e5);
        border-bottom: 1px solid transparent;
        color: #000;
      }
      :host ::slotted(*) {
        display: inline-block;
        background: transparent;
        border: none;
        padding: 10px 5px;
        font-size: 12px;
        letter-spacing: 1px;
        font-weight: 500;
        text-decoration: none;
        text-transform: uppercase;
        color: inherit;
        margin: 0 8px;
        outline: none;
        cursor: pointer;
      }
    </style>
    <slot></slot>
    `;
        }
    };
    DacTab = __decorate$a([
        element('x-tab')
    ], DacTab);

    var __decorate$b = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$a = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let XPages = class XPages extends GuildElement {
        constructor() {
            super(...arguments);
            this.currentPage = null;
        }
        render() {
            return html `
    <style>
      :host {
        display: block;
      }
    
      .hidden {
        display: none !important;
      }
    
      ::slotted(.hidden) {
        display: none !important;
      }
    </style>
    <slot id="slot" @slotchange="${this.slotChange}"></slot>
    `;
        }
        updated() {
            this.refresh();
        }
        async refresh() {
            const pages = await this.getPages();
            const path = this.selected || '';
            let newPage = this.findPage(pages, path);
            if (!newPage) {
                newPage = pages[0];
            }
            const samePage = newPage === this.currentPage;
            if (this.currentPage && (!samePage) && this.currentPage.onDeactivate) {
                try {
                    this.currentPage.onDeactivate();
                }
                catch (err) {
                    console.error(err);
                }
            }
            for (let i = 0; i < pages.length; i++) {
                const p = pages[i];
                if (p === newPage) {
                    p.classList.remove('hidden');
                }
                else {
                    p.classList.add('hidden');
                }
            }
            this.currentPage = newPage;
            if (this.currentPage.onActivate) {
                try {
                    this.currentPage.onActivate();
                }
                catch (err) {
                    console.error(err);
                }
            }
        }
        slotChange() {
            if (this.pendingSlotResolve) {
                this.pendingSlotResolve(this.slotElements);
                delete this.pendingSlotResolve;
            }
        }
        get pageSlot() {
            return this.$('slot');
        }
        get slotElements() {
            const list = [];
            const assigned = this.pageSlot.assignedNodes();
            if (assigned && assigned.length) {
                for (let i = 0; i < assigned.length; i++) {
                    const n = assigned[i];
                    if (n.nodeType === Node.ELEMENT_NODE) {
                        list.push(n);
                    }
                }
            }
            return list;
        }
        async getPages() {
            return new Promise((resolve) => {
                const list = this.slotElements;
                if (list.length) {
                    resolve(list);
                    return;
                }
                this.pendingSlotResolve = resolve;
                setTimeout(() => {
                    this.slotChange();
                }, 2000);
            });
        }
        findPage(pages, name) {
            for (const page of pages) {
                if (page.getAttribute('name') === name) {
                    return page;
                }
            }
            return null;
        }
    };
    __decorate$b([
        property(),
        __metadata$a("design:type", String)
    ], XPages.prototype, "selected", void 0);
    XPages = __decorate$b([
        element('x-pages')
    ], XPages);

    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    // Helper functions for manipulating parts
    // TODO(kschaaf): Refactor into Part API?
    const createAndInsertPart = (containerPart, beforePart) => {
        const container = containerPart.startNode.parentNode;
        const beforeNode = beforePart === undefined ? containerPart.endNode :
            beforePart.startNode;
        const startNode = container.insertBefore(createMarker(), beforeNode);
        container.insertBefore(createMarker(), beforeNode);
        const newPart = new NodePart(containerPart.options);
        newPart.insertAfterNode(startNode);
        return newPart;
    };
    const updatePart = (part, value) => {
        part.setValue(value);
        part.commit();
        return part;
    };
    const insertPartBefore = (containerPart, part, ref) => {
        const container = containerPart.startNode.parentNode;
        const beforeNode = ref ? ref.startNode : containerPart.endNode;
        const endNode = part.endNode.nextSibling;
        if (endNode !== beforeNode) {
            reparentNodes(container, part.startNode, endNode, beforeNode);
        }
    };
    const removePart = (part) => {
        removeNodes(part.startNode.parentNode, part.startNode, part.endNode.nextSibling);
    };
    // Helper for generating a map of array item to its index over a subset
    // of an array (used to lazily generate `newKeyToIndexMap` and
    // `oldKeyToIndexMap`)
    const generateMap = (list, start, end) => {
        const map = new Map();
        for (let i = start; i <= end; i++) {
            map.set(list[i], i);
        }
        return map;
    };
    // Stores previous ordered list of parts and map of key to index
    const partListCache = new WeakMap();
    const keyListCache = new WeakMap();
    /**
     * A directive that repeats a series of values (usually `TemplateResults`)
     * generated from an iterable, and updates those items efficiently when the
     * iterable changes based on user-provided `keys` associated with each item.
     *
     * Note that if a `keyFn` is provided, strict key-to-DOM mapping is maintained,
     * meaning previous DOM for a given key is moved into the new position if
     * needed, and DOM will never be reused with values for different keys (new DOM
     * will always be created for new keys). This is generally the most efficient
     * way to use `repeat` since it performs minimum unnecessary work for insertions
     * amd removals.
     *
     * IMPORTANT: If providing a `keyFn`, keys *must* be unique for all items in a
     * given call to `repeat`. The behavior when two or more items have the same key
     * is undefined.
     *
     * If no `keyFn` is provided, this directive will perform similar to mapping
     * items to values, and DOM will be reused against potentially different items.
     */
    const repeat = directive((items, keyFnOrTemplate, template) => {
        let keyFn;
        if (template === undefined) {
            template = keyFnOrTemplate;
        }
        else if (keyFnOrTemplate !== undefined) {
            keyFn = keyFnOrTemplate;
        }
        return (containerPart) => {
            if (!(containerPart instanceof NodePart)) {
                throw new Error('repeat can only be used in text bindings');
            }
            // Old part & key lists are retrieved from the last update
            // (associated with the part for this instance of the directive)
            const oldParts = partListCache.get(containerPart) || [];
            const oldKeys = keyListCache.get(containerPart) || [];
            // New part list will be built up as we go (either reused from
            // old parts or created for new keys in this update). This is
            // saved in the above cache at the end of the update.
            const newParts = [];
            // New value list is eagerly generated from items along with a
            // parallel array indicating its key.
            const newValues = [];
            const newKeys = [];
            let index = 0;
            for (const item of items) {
                newKeys[index] = keyFn ? keyFn(item, index) : index;
                newValues[index] = template(item, index);
                index++;
            }
            // Maps from key to index for current and previous update; these
            // are generated lazily only when needed as a performance
            // optimization, since they are only required for multiple
            // non-contiguous changes in the list, which are less common.
            let newKeyToIndexMap;
            let oldKeyToIndexMap;
            // Head and tail pointers to old parts and new values
            let oldHead = 0;
            let oldTail = oldParts.length - 1;
            let newHead = 0;
            let newTail = newValues.length - 1;
            // Overview of O(n) reconciliation algorithm (general approach
            // based on ideas found in ivi, vue, snabbdom, etc.):
            //
            // * We start with the list of old parts and new values (and
            // arrays of
            //   their respective keys), head/tail pointers into each, and
            //   we build up the new list of parts by updating (and when
            //   needed, moving) old parts or creating new ones. The initial
            //   scenario might look like this (for brevity of the diagrams,
            //   the numbers in the array reflect keys associated with the
            //   old parts or new values, although keys and parts/values are
            //   actually stored in parallel arrays indexed using the same
            //   head/tail pointers):
            //
            //      oldHead v                 v oldTail
            //   oldKeys:  [0, 1, 2, 3, 4, 5, 6]
            //   newParts: [ ,  ,  ,  ,  ,  ,  ]
            //   newKeys:  [0, 2, 1, 4, 3, 7, 6] <- reflects the user's new
            //   item order
            //      newHead ^                 ^ newTail
            //
            // * Iterate old & new lists from both sides, updating,
            // swapping, or
            //   removing parts at the head/tail locations until neither
            //   head nor tail can move.
            //
            // * Example below: keys at head pointers match, so update old
            // part 0 in-
            //   place (no need to move it) and record part 0 in the
            //   `newParts` list. The last thing we do is advance the
            //   `oldHead` and `newHead` pointers (will be reflected in the
            //   next diagram).
            //
            //      oldHead v                 v oldTail
            //   oldKeys:  [0, 1, 2, 3, 4, 5, 6]
            //   newParts: [0,  ,  ,  ,  ,  ,  ] <- heads matched: update 0
            //   and newKeys:  [0, 2, 1, 4, 3, 7, 6]    advance both oldHead
            //   & newHead
            //      newHead ^                 ^ newTail
            //
            // * Example below: head pointers don't match, but tail pointers
            // do, so
            //   update part 6 in place (no need to move it), and record
            //   part 6 in the `newParts` list. Last, advance the `oldTail`
            //   and `oldHead` pointers.
            //
            //         oldHead v              v oldTail
            //   oldKeys:  [0, 1, 2, 3, 4, 5, 6]
            //   newParts: [0,  ,  ,  ,  ,  , 6] <- tails matched: update 6
            //   and newKeys:  [0, 2, 1, 4, 3, 7, 6]    advance both oldTail
            //   & newTail
            //         newHead ^              ^ newTail
            //
            // * If neither head nor tail match; next check if one of the
            // old head/tail
            //   items was removed. We first need to generate the reverse
            //   map of new keys to index (`newKeyToIndexMap`), which is
            //   done once lazily as a performance optimization, since we
            //   only hit this case if multiple non-contiguous changes were
            //   made. Note that for contiguous removal anywhere in the
            //   list, the head and tails would advance from either end and
            //   pass each other before we get to this case and removals
            //   would be handled in the final while loop without needing to
            //   generate the map.
            //
            // * Example below: The key at `oldTail` was removed (no longer
            // in the
            //   `newKeyToIndexMap`), so remove that part from the DOM and
            //   advance just the `oldTail` pointer.
            //
            //         oldHead v           v oldTail
            //   oldKeys:  [0, 1, 2, 3, 4, 5, 6]
            //   newParts: [0,  ,  ,  ,  ,  , 6] <- 5 not in new map; remove
            //   5 and newKeys:  [0, 2, 1, 4, 3, 7, 6]    advance oldTail
            //         newHead ^           ^ newTail
            //
            // * Once head and tail cannot move, any mismatches are due to
            // either new or
            //   moved items; if a new key is in the previous "old key to
            //   old index" map, move the old part to the new location,
            //   otherwise create and insert a new part. Note that when
            //   moving an old part we null its position in the oldParts
            //   array if it lies between the head and tail so we know to
            //   skip it when the pointers get there.
            //
            // * Example below: neither head nor tail match, and neither
            // were removed;
            //   so find the `newHead` key in the `oldKeyToIndexMap`, and
            //   move that old part's DOM into the next head position
            //   (before `oldParts[oldHead]`). Last, null the part in the
            //   `oldPart` array since it was somewhere in the remaining
            //   oldParts still to be scanned (between the head and tail
            //   pointers) so that we know to skip that old part on future
            //   iterations.
            //
            //         oldHead v        v oldTail
            //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
            //   newParts: [0, 2,  ,  ,  ,  , 6] <- stuck; update & move 2
            //   into place newKeys:  [0, 2, 1, 4, 3, 7, 6]    and advance
            //   newHead
            //         newHead ^           ^ newTail
            //
            // * Note that for moves/insertions like the one above, a part
            // inserted at
            //   the head pointer is inserted before the current
            //   `oldParts[oldHead]`, and a part inserted at the tail
            //   pointer is inserted before `newParts[newTail+1]`. The
            //   seeming asymmetry lies in the fact that new parts are moved
            //   into place outside in, so to the right of the head pointer
            //   are old parts, and to the right of the tail pointer are new
            //   parts.
            //
            // * We always restart back from the top of the algorithm,
            // allowing matching
            //   and simple updates in place to continue...
            //
            // * Example below: the head pointers once again match, so
            // simply update
            //   part 1 and record it in the `newParts` array.  Last,
            //   advance both head pointers.
            //
            //         oldHead v        v oldTail
            //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
            //   newParts: [0, 2, 1,  ,  ,  , 6] <- heads matched; update 1
            //   and newKeys:  [0, 2, 1, 4, 3, 7, 6]    advance both oldHead
            //   & newHead
            //            newHead ^        ^ newTail
            //
            // * As mentioned above, items that were moved as a result of
            // being stuck
            //   (the final else clause in the code below) are marked with
            //   null, so we always advance old pointers over these so we're
            //   comparing the next actual old value on either end.
            //
            // * Example below: `oldHead` is null (already placed in
            // newParts), so
            //   advance `oldHead`.
            //
            //            oldHead v     v oldTail
            //   oldKeys:  [0, 1, -, 3, 4, 5, 6] // old head already used;
            //   advance newParts: [0, 2, 1,  ,  ,  , 6] // oldHead newKeys:
            //   [0, 2, 1, 4, 3, 7, 6]
            //               newHead ^     ^ newTail
            //
            // * Note it's not critical to mark old parts as null when they
            // are moved
            //   from head to tail or tail to head, since they will be
            //   outside the pointer range and never visited again.
            //
            // * Example below: Here the old tail key matches the new head
            // key, so
            //   the part at the `oldTail` position and move its DOM to the
            //   new head position (before `oldParts[oldHead]`). Last,
            //   advance `oldTail` and `newHead` pointers.
            //
            //               oldHead v  v oldTail
            //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
            //   newParts: [0, 2, 1, 4,  ,  , 6] <- old tail matches new
            //   head: update newKeys:  [0, 2, 1, 4, 3, 7, 6]   & move 4,
            //   advance oldTail & newHead
            //               newHead ^     ^ newTail
            //
            // * Example below: Old and new head keys match, so update the
            // old head
            //   part in place, and advance the `oldHead` and `newHead`
            //   pointers.
            //
            //               oldHead v oldTail
            //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
            //   newParts: [0, 2, 1, 4, 3,   ,6] <- heads match: update 3
            //   and advance newKeys:  [0, 2, 1, 4, 3, 7, 6]    oldHead &
            //   newHead
            //                  newHead ^  ^ newTail
            //
            // * Once the new or old pointers move past each other then all
            // we have
            //   left is additions (if old list exhausted) or removals (if
            //   new list exhausted). Those are handled in the final while
            //   loops at the end.
            //
            // * Example below: `oldHead` exceeded `oldTail`, so we're done
            // with the
            //   main loop.  Create the remaining part and insert it at the
            //   new head position, and the update is complete.
            //
            //                   (oldHead > oldTail)
            //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
            //   newParts: [0, 2, 1, 4, 3, 7 ,6] <- create and insert 7
            //   newKeys:  [0, 2, 1, 4, 3, 7, 6]
            //                     newHead ^ newTail
            //
            // * Note that the order of the if/else clauses is not important
            // to the
            //   algorithm, as long as the null checks come first (to ensure
            //   we're always working on valid old parts) and that the final
            //   else clause comes last (since that's where the expensive
            //   moves occur). The order of remaining clauses is is just a
            //   simple guess at which cases will be most common.
            //
            // * TODO(kschaaf) Note, we could calculate the longest
            // increasing
            //   subsequence (LIS) of old items in new position, and only
            //   move those not in the LIS set. However that costs O(nlogn)
            //   time and adds a bit more code, and only helps make rare
            //   types of mutations require fewer moves. The above handles
            //   removes, adds, reversal, swaps, and single moves of
            //   contiguous items in linear time, in the minimum number of
            //   moves. As the number of multiple moves where LIS might help
            //   approaches a random shuffle, the LIS optimization becomes
            //   less helpful, so it seems not worth the code at this point.
            //   Could reconsider if a compelling case arises.
            while (oldHead <= oldTail && newHead <= newTail) {
                if (oldParts[oldHead] === null) {
                    // `null` means old part at head has already been used
                    // below; skip
                    oldHead++;
                }
                else if (oldParts[oldTail] === null) {
                    // `null` means old part at tail has already been used
                    // below; skip
                    oldTail--;
                }
                else if (oldKeys[oldHead] === newKeys[newHead]) {
                    // Old head matches new head; update in place
                    newParts[newHead] =
                        updatePart(oldParts[oldHead], newValues[newHead]);
                    oldHead++;
                    newHead++;
                }
                else if (oldKeys[oldTail] === newKeys[newTail]) {
                    // Old tail matches new tail; update in place
                    newParts[newTail] =
                        updatePart(oldParts[oldTail], newValues[newTail]);
                    oldTail--;
                    newTail--;
                }
                else if (oldKeys[oldHead] === newKeys[newTail]) {
                    // Old head matches new tail; update and move to new tail
                    newParts[newTail] =
                        updatePart(oldParts[oldHead], newValues[newTail]);
                    insertPartBefore(containerPart, oldParts[oldHead], newParts[newTail + 1]);
                    oldHead++;
                    newTail--;
                }
                else if (oldKeys[oldTail] === newKeys[newHead]) {
                    // Old tail matches new head; update and move to new head
                    newParts[newHead] =
                        updatePart(oldParts[oldTail], newValues[newHead]);
                    insertPartBefore(containerPart, oldParts[oldTail], oldParts[oldHead]);
                    oldTail--;
                    newHead++;
                }
                else {
                    if (newKeyToIndexMap === undefined) {
                        // Lazily generate key-to-index maps, used for removals &
                        // moves below
                        newKeyToIndexMap = generateMap(newKeys, newHead, newTail);
                        oldKeyToIndexMap = generateMap(oldKeys, oldHead, oldTail);
                    }
                    if (!newKeyToIndexMap.has(oldKeys[oldHead])) {
                        // Old head is no longer in new list; remove
                        removePart(oldParts[oldHead]);
                        oldHead++;
                    }
                    else if (!newKeyToIndexMap.has(oldKeys[oldTail])) {
                        // Old tail is no longer in new list; remove
                        removePart(oldParts[oldTail]);
                        oldTail--;
                    }
                    else {
                        // Any mismatches at this point are due to additions or
                        // moves; see if we have an old part we can reuse and move
                        // into place
                        const oldIndex = oldKeyToIndexMap.get(newKeys[newHead]);
                        const oldPart = oldIndex !== undefined ? oldParts[oldIndex] : null;
                        if (oldPart === null) {
                            // No old part for this value; create a new one and
                            // insert it
                            const newPart = createAndInsertPart(containerPart, oldParts[oldHead]);
                            updatePart(newPart, newValues[newHead]);
                            newParts[newHead] = newPart;
                        }
                        else {
                            // Reuse old part
                            newParts[newHead] =
                                updatePart(oldPart, newValues[newHead]);
                            insertPartBefore(containerPart, oldPart, oldParts[oldHead]);
                            // This marks the old part as having been used, so that
                            // it will be skipped in the first two checks above
                            oldParts[oldIndex] = null;
                        }
                        newHead++;
                    }
                }
            }
            // Add parts for any remaining new values
            while (newHead <= newTail) {
                // For all remaining additions, we insert before last new
                // tail, since old pointers are no longer valid
                const newPart = createAndInsertPart(containerPart, newParts[newTail + 1]);
                updatePart(newPart, newValues[newHead]);
                newParts[newHead++] = newPart;
            }
            // Remove any remaining unused old parts
            while (oldHead <= oldTail) {
                const oldPart = oldParts[oldHead++];
                if (oldPart !== null) {
                    removePart(oldPart);
                }
            }
            // Save order of new parts for next round
            partListCache.set(containerPart, newParts);
            keyListCache.set(containerPart, newKeys);
        };
    });

    var __decorate$c = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$b = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let SlickLinkDetails = class SlickLinkDetails extends GuildElement {
        render() {
            if (!this.details)
                return html ``;
            const imageStyle = this.details.image ? `background-image: url("${this.details.image}");` : 'display: none;';
            const annotationStyle = this.details.annotation ? '' : 'display: none;';
            let host = '';
            if (this.details.href && !this.details.intrasite) {
                try {
                    host = (new URL(this.details.finalUrl || this.details.href)).hostname;
                }
                catch (err) {
                    host = '';
                }
            }
            const hostStyle = host ? '' : 'display: none;';
            return html `
    <style>
      :host {
        display: block;
      }
      .link {
        display: block;
        padding: 6px 0;
        text-decoration: none;
        color: inherit;
        position: relative;
        min-height: 40px;
        line-height: 1.5;
      }
      .link:hover {
        background: var(--slick-highlight-hover-color, rgba(97, 129, 229, 0.1));
      }
      .imagePanel {
        display: block;
        width: 64px;
        background-color: #f0f0f0;
        background-size: cover;
        background-origin: border-box;
        background-position: 50% 50%;
        border:  none;
        text-decoration: none;
        color: inherit;
        position: absolute;
        left: 0;
        top: 6px;
        height: calc(100% - 12px);
        min-height: 40px;
        max-height: 64px;
        border-radius: 5px;
      }
      .annotation {
        font-size: 10px;
        opacity: 0.8;
        font-style: italic;
        letter-spacing: 0.08em;
      }
      .name {
        font-size: 14px;
      }
      .description {
        color: #808080;
        font-size: 12px;
      }
      .hostname {
        font-size: 10px;
        color: #808080;
      }
      .single-line {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    </style>
    <a href="${this.details.href}" class="link" @click="${this.onLinkClick}">
      <div class="imagePanel" style="${imageStyle}"></div>
      <div style="padding-left: 72px;">
        <div class="annotation" style="${annotationStyle}">${this.details.annotation}</div>
        <div class="name">${this.details.title}</div>
        <div class="description">${this.details.description || ''}</div>
        <div class="hostname" style="${hostStyle}">${host}</div>
      </div>
    </a>
    `;
        }
        updated() {
            if (this.details) {
                if (this.details.intrasite) {
                    this.$$('.description').classList.remove('single-line');
                    this.$$('.name').classList.remove('single-line');
                }
                else {
                    this.$$('.description').classList.add('single-line');
                    this.$$('.name').classList.add('single-line');
                }
            }
        }
        onLinkClick(e) {
            e.stopPropagation();
            core.widgetAction(this.details.widgetType, (this.details.intrasite === false) ? 'ext-nav' : 'nav', 0, this.details.href, this.details.variant);
        }
    };
    __decorate$c([
        property(),
        __metadata$b("design:type", Object)
    ], SlickLinkDetails.prototype, "details", void 0);
    SlickLinkDetails = __decorate$c([
        element('slick-link-details')
    ], SlickLinkDetails);

    var __decorate$d = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$c = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    const KEEY_MESSAGES = 'slick-recent-messages';
    let SlickMessagesCard = class SlickMessagesCard extends GuildElement {
        constructor() {
            super(...arguments);
            this.links = [];
        }
        render() {
            return html `
    <style>
      :host {
        display: block;
        padding: 10px;
      }
      .hidden {
        display: none;
      }
      #nonePanel {
        text-align: center;
        padding: 20px 0;
        color: #808080;
        font-size: 14px;
      }
    </style>
    <div id="nonePanel" class="${this.links.length ? 'hidden' : ''}">
      You don't have any messages.
    </div>
    <div>
      ${repeat(this.links, (d) => d.href || `${Date.now()}`, (d) => html `<slick-link-details .details="${d}"></slick-link-details>`)}
    </div>
    `;
        }
        firstUpdated() {
            if (!this.links.length) {
                const cached = sessionStore.get(KEEY_MESSAGES, true);
                if (cached && cached.length) {
                    this.links = [...cached];
                }
            }
        }
        addMessage(d) {
            if (d.href) {
                let match = -1;
                for (let i = 0; i < this.links.length; i++) {
                    if (d.finalUrl && (this.links[i].finalUrl === d.finalUrl)) {
                        match = i;
                        break;
                    }
                    if (this.links[i].href === d.href) {
                        match = i;
                        break;
                    }
                }
                if (match === 0) {
                    return;
                }
                if (match > 0) {
                    const removed = this.links.splice(match, 1);
                    this.links = [...removed, ...this.links];
                }
                else {
                    const link = {
                        href: d.href,
                        finalUrl: d.finalUrl,
                        title: d.text,
                        annotation: d.annotation,
                        description: d.description || '',
                        image: d.image,
                        variant: 'messages',
                        widgetType: d.widgetType,
                        intrasite: d.intrasite
                    };
                    this.links = [link, ...this.links];
                }
                const toStore = [...this.links];
                if (toStore.length > 15) {
                    toStore.splice(15);
                }
                sessionStore.set(KEEY_MESSAGES, toStore);
            }
        }
    };
    __decorate$d([
        property({ type: Array }),
        __metadata$c("design:type", Array)
    ], SlickMessagesCard.prototype, "links", void 0);
    SlickMessagesCard = __decorate$d([
        element('slick-messages-card')
    ], SlickMessagesCard);

    var __decorate$e = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$d = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let PilotPopup = class PilotPopup extends GuildElement {
        render() {
            const d = Object.assign({
                id: '',
                href: '',
                finalUrl: '',
                image: '',
                text: '',
                description: '',
                annotation: '',
                actions: [],
                widgetType: 'link-recommender',
                intrasite: true
            }, this.data || {});
            const imageStyle = d.image ? `background-image: url("${d.image}");` : 'display: none;';
            const textPanelStyle = d.text ? '' : 'display: none;';
            const annotationStyle = d.annotation ? '' : 'display: none;';
            return html `
    <style>
      :host {
        display: block;
        line-height: 1.4;
      }
      .horizontal {
        display: -ms-flexbox;
        display: -webkit-flex;
        display: flex;
        -ms-flex-direction: row;
        -webkit-flex-direction: row;
        flex-direction: row;
      }
      .flex {
        -ms-flex: 1 1 0.000000001px;
        -webkit-flex: 1;
        flex: 1;
        -webkit-flex-basis: 0.000000001px;
        flex-basis: 0.000000001px;
      }
      #lpImagePanel {
        display: block;
        width: 64px;
        background-color: #f0f0f0;
        background-size: cover;
        background-origin: border-box;
        background-position: 50% 50%;
        border:  none;
        text-decoration: none;
        color: inherit;
      }
      .hidden {
        display: none;
      }
      a, a:hover, a:visited {
        text-decoration: none;
        color: inherit;
      }
      .textPanel {
        padding: 5px 5px 5px 8px;
        min-height: 38px;
        display: -ms-flexbox;
        display: -webkit-flex;
        display: flex;
        -ms-flex-direction: column;
        -webkit-flex-direction: column;
        flex-direction: column;
        -ms-flex-pack: center;
        -webkit-justify-content: center;
        justify-content: center;
      }
      .textLabel {
        font-size: 14px;
        max-height: 54px;
      }
      .annotation {
        font-size: 10px;
        opacity: 0.8;
        font-style: italic;
        letter-spacing: 0.08em;
        margin-bottom: 3px;
      }
    </style>
    <a href="${d.href}" class="horizontal" @click="${this.onLinkClick}">
      <div id="lpImagePanel" style="${imageStyle}"></div>
      <div class="flex textPanel" style="${textPanelStyle}">
        <div class="annotation" style="${annotationStyle}">${d.annotation}</div>
        <div class="textLabel">${d.text}</div>
      </div>
    </a>
    `;
        }
        onLinkClick(e) {
            const hasLink = this.data && this.data.href && this.data.href.trim();
            if (!hasLink) {
                e.preventDefault();
                e.stopPropagation();
                setTimeout(() => this.fireEvent('unhandled-link'));
                this.action('drill');
            }
            else {
                e.stopPropagation();
                this.action((this.data && (this.data.intrasite === false)) ? 'ext-nav' : 'nav');
            }
        }
        action(action) {
            if (this.data) {
                core.widgetAction(this.data.widgetType, action, 0, this.data.href);
            }
        }
    };
    __decorate$e([
        property(),
        __metadata$d("design:type", Object)
    ], PilotPopup.prototype, "data", void 0);
    PilotPopup = __decorate$e([
        element('pilot-popup')
    ], PilotPopup);

    var __decorate$f = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$e = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let SlickPilot = class SlickPilot extends GuildElement {
        constructor() {
            super(...arguments);
            this.siteCode = '';
            this.pageUrl = '';
            this.selectedTab = 'messages';
            this.messageIcon = 'message';
            this.active = false; // Pilot is Active/enabled
            this.open = false; // Pilot dialog is open
            this.popupShowing = false;
            this.scrollListener = this.onScroll.bind(this);
            this.agents = [];
            this.tabActivated = false;
            this.tabFixed = false;
        }
        render() {
            return html `
    ${flexStyles}
    <style>
      :host {
        --highlight-pink: transparent;
        --medium-grey: rgba(255,255,255,0.3);
        --slick-tab-gray: transparent;
        --slick-pilot-top: 10px;
      }
      #tab {
        position: absolute;
        right: 0;
        top: var(--slick-pilot-top, 10px);
        z-index: var(--slick-pilot-zindex, 100002);
        background: var(--slick-pilot-bg-color, #567cf4);
        color: var(--slick-pilot-color, white);
        border-radius: 3px 0 0 3px;
        cursor: pointer;
        box-shadow: 0 3px 4px 0 rgba(0, 0, 0, 0.14), 0 1px 8px 0 rgba(0, 0, 0, 0.12), 0 3px 3px -2px rgba(0, 0, 0, 0.4);
        transition: opacity 0.28s ease;
      }
      #tab.fixed {
        position: fixed;
      }
      #tab.inactive {
        opacity: 0.1;
        pointer-events: none;
      }
      #tab x-icon {
        padding: 6px;
      }
      #fullPanel {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        display: none;
        z-index: var(--slick-pilot-zindex, 100002);
      }
      .fillContainer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }
      #glassPane {
        background: rgba(0,0,0,0.35);
        opacity: 0;
        transition: opacity 0.3s ease-in;
      }
      main {
        overflow: hidden;
        background: white;
        color: #000;
        position: absolute;
        top: 0;
        right: 0;
        height: 100%;
        width: 100%;
        max-width: 500px;
        box-sizing: border-box;
        box-shadow: -3px 0 10px -2px rgba(0,0,0,0.4);
        transform: translateX(110%);
        will-change: transform;
        transition: transform 0.3s ease-out;
      }
      main.visible {
        transform: translateX(0);
      }
      tab-bar {
        padding: 8px 0 0 16px;
        background: var(--slick-pilot-bg-color, #567cf4);
        color: var(--slick-pilot-color, white);
      }
      x-tab {
        border-bottom: 1px solid transparent;
      }
      button x-icon {
        padding-right: 8px;
        width: 20px;
        height: 20px;
      }
      #btnClose {
        position: absolute;
        top: 0;
        right: 0;
        padding: 14px 10px;
        cursor: pointer;
        color: var(--slick-pilot-color, white);
      }
      .hidden {
        display: none !important;
      }
      .barCotent {
        overflow: hidden;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        position: relative;
      }
      #popup {
        position: absolute;
        top: 0;
        right: 100%;
        background: var(--slick-link-popup-background, white);
        color: var(--slick-link-popup-color, currentColor);
        box-shadow: var(--slick-link-popup-shadow, 0 1px 6px 0 rgba(0,0,0,0.16),0 2px 32px 0 rgba(0,0,0,0.16));
        box-sizing: border-box;
        border-radius: 5px;
        line-height: 1.5;
        min-width: 200px;
        max-width: 290px;
        width: calc(100vw - 80px);
        margin: 0 8px 0 0;
        overflow: hidden;
        opacity: 0;
        transform: scale(0.2) translateX(100%);
        transition: transform 0.2s ease-in, opacity 0.2s ease-in;
        color: #000;
      }
      #popup.visible {
        opacity: 1;
        transform: scale(1) translateX(0);
      }
    </style>
    <div id="fullPanel">
      <div id="glassPane" class="fillContainer" @click="${this.closePanel}"></div>
      <main class="vertical layout">
        <tab-bar .selected="${this.selectedTab}">
          <x-tab name="messages" @click="${this.tabClick}">
            <button><x-icon icon="message"></x-icon>Messages</button>
          </x-tab>
        </tab-bar>
        <x-icon id="btnClose" icon="close" @click="${this.closePanel}"></x-icon>
        <x-pages class="flex barCotent" .selected="${this.selectedTab}">
          <slick-messages-card name="messages" .siteCode="${this.siteCode}" .pageUrl="${this.pageUrl}"></slick-messages-card>
        </x-pages>
      </main>
    </div>
    <div id="tab" class="vertical layout inactive">
      <x-icon name="messages" .icon="${this.messageIcon}" style="border-bottom: 1px solid;" @click="${this.toggleOpen}"></x-icon>
      <x-icon name="search" icon="search" @click="${this.onSearch}"></x-icon>
      <div id="popup" class="hidden">
        <pilot-popup @unhandled-link="${() => this.openPanel()}"></pilot-popup>
      </div>
    </div>
    `;
        }
        firstUpdated() {
            super.firstUpdated();
            document.addEventListener('scroll', this.scrollListener);
            setTimeout(() => this.updateTabPosition(), 10);
        }
        disconnectedCallback() {
            super.disconnectedCallback();
            document.removeEventListener('scroll', this.scrollListener);
        }
        updated() {
            this.checkActivation();
        }
        async checkActivation() {
            if (!this.active) {
                this.active = true;
                this.initializeAgents();
            }
        }
        initializeAgents() {
            if (this.agents.length) {
                return;
            }
            this.agents.push(new LinkHighlightAgent(), new RecommendationAgent(), new WelcomeAgent((this.config && this.config.greeting) || { message: '' }));
            this.agents.forEach((a) => {
                a.initialize(this.siteCode, this.pageUrl, this);
                a.activate();
            });
        }
        onSearch() {
            core.widgetAction('pilot', 'open-search', 0);
            document.dispatchEvent(SlickCustomEvent('slick-show-search'));
        }
        toggleOpen(e) {
            if (this.open) {
                this.closePanel();
            }
            else {
                this.selectedTab = e.currentTarget.getAttribute('name') || 'messages';
                this.openPanel(this.selectedTab);
            }
        }
        openPanel(variant) {
            this.messageIcon = 'message';
            this.setPopupVisible(false);
            this.$('fullPanel').style.display = 'block';
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
            this.$('tab').classList.add('hidden');
            setTimeout(() => {
                if (this.open) {
                    this.$$('main').scrollTop = 0;
                    this.$('glassPane').style.opacity = '1';
                    this.$$('main').classList.add('visible');
                }
            }, 10);
            this.open = true;
            core.widgetAction('pilot', 'drill', 0, undefined, variant);
        }
        closePanel() {
            this.$('glassPane').style.opacity = '0';
            this.$$('main').classList.remove('visible');
            setTimeout(() => {
                if (!this.open) {
                    this.$('fullPanel').style.display = '';
                    this.$('tab').classList.remove('hidden');
                    setTimeout(() => {
                        if (!this.open) {
                            document.body.style.overflow = null;
                            document.documentElement.style.overflow = null;
                        }
                    });
                }
            }, 310);
            this.open = false;
            core.widgetAction('pilot', 'clear', 0);
        }
        tabClick(e) {
            this.selectedTab = e.currentTarget.getAttribute('name') || 'messages';
            core.widgetAction('pilot', 'select', 2000, undefined, this.selectedTab);
        }
        onScroll() {
            const sv = this.scrollValue;
            this.agents.forEach((a) => {
                a.onScroll(sv);
            });
            this.updateTabPosition();
        }
        get scrollValue() {
            return (window.pageYOffset !== undefined) ? window.pageYOffset : ((document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop);
        }
        updateTabPosition() {
            const tab = this.$('tab');
            let ip = (this.config && this.config.pilot.initialTopOffset);
            if (typeof ip !== 'number') {
                ip = 10;
            }
            let rp = (this.config && this.config.pilot.restingTopOffset);
            if (typeof ip !== 'number') {
                rp = 10;
            }
            rp = rp;
            ip = ip;
            if (rp > ip) {
                rp = ip;
            }
            const sv = this.scrollValue + rp;
            const fixed = (sv >= ip) || (rp === ip);
            if ((!this.tabActivated) || (fixed !== this.tabFixed)) {
                this.tabFixed = fixed;
                if (fixed) {
                    tab.classList.add('fixed');
                    this.style.setProperty('--slick-pilot-top', `${rp}px`);
                }
                else {
                    tab.classList.remove('fixed');
                    this.style.setProperty('--slick-pilot-top', `${ip}px`);
                }
            }
            if (!this.tabActivated) {
                this.tabActivated = true;
                tab.classList.remove('inactive');
            }
        }
        setPopupVisible(visible) {
            if (this.popupShowing !== visible) {
                const popup = this.$('popup');
                this.popupShowing = visible;
                if (visible) {
                    popup.classList.remove('hidden');
                    setTimeout(() => {
                        if (this.popupShowing) {
                            popup.classList.add('visible');
                        }
                    }, 100);
                }
                else {
                    popup.classList.remove('visible');
                    setTimeout(() => {
                        if (!this.popupShowing) {
                            popup.classList.add('hidden');
                        }
                    }, 210);
                }
                const body = document.body || document.querySelector('body');
                if (body) {
                    if (visible) {
                        body.classList.add('slick-pilot-notification-showing');
                    }
                    else {
                        body.classList.remove('slick-pilot-notification-showing');
                    }
                }
            }
        }
        isOpen() {
            return this.open;
        }
        isShowingPopup() {
            return this.popupShowing;
        }
        showPopup(data) {
            if (this.isOpen()) {
                return false;
            }
            if (data) {
                this.registerPopupMessage(data);
                const now = Date.now();
                if (this.currentPopup && ((now - this.currentPopup.time) < 8000)) {
                    return false;
                }
                this.$$('pilot-popup').data = data;
                this.currentPopup = { time: now, data };
                this.setPopupVisible(true);
                core.widgetAction(data.widgetType, 'impression', 0, data.href);
                return true;
            }
            return false;
        }
        hidePopup(id) {
            if (this.currentPopup && this.currentPopup.data.id === id) {
                this.setPopupVisible(false);
                this.currentPopup = undefined;
            }
        }
        registerPopupMessage(data) {
            this.$$('slick-messages-card').addMessage(data);
            if (!this.isOpen()) {
                this.messageIcon = 'message-full';
            }
        }
    };
    __decorate$f([
        property({ type: String }),
        __metadata$e("design:type", String)
    ], SlickPilot.prototype, "siteCode", void 0);
    __decorate$f([
        property({ type: String }),
        __metadata$e("design:type", String)
    ], SlickPilot.prototype, "pageUrl", void 0);
    __decorate$f([
        property(),
        __metadata$e("design:type", Object)
    ], SlickPilot.prototype, "config", void 0);
    __decorate$f([
        property(),
        __metadata$e("design:type", Object)
    ], SlickPilot.prototype, "selectedTab", void 0);
    __decorate$f([
        property(),
        __metadata$e("design:type", Object)
    ], SlickPilot.prototype, "messageIcon", void 0);
    SlickPilot = __decorate$f([
        element('slick-pilot')
    ], SlickPilot);

    var __decorate$g = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$f = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let XFab = class XFab extends GuildElement {
        render() {
            return html `
    <style>
      :host {
        display: inline-block;
        padding: 12px;
        --slick-fab-icon-size: 24px;
        border-radius: 50%;
        box-shadow: 0 4px 5px 0 rgba(0, 0, 0, 0.14), 0 1px 10px 0 rgba(0, 0, 0, 0.12), 0 2px 4px -1px rgba(0, 0, 0, 0.4);
        background: #567cf4;
        color: white;
        cursor: pointer;
        line-height: 1;
      }
      x-icon {
        width: var(--slick-fab-icon-size, 24px);
        height: var(--slick-fab-icon-size, 24px);
      }
      @media (min-width: 850px) {
        :host { padding: 14px; }
      }
      @media (min-width: 1100px) {
        :host { padding: 16px; }
      }
    </style>
    <x-icon .icon="${this.icon}"></x-icon>
    `;
        }
    };
    __decorate$g([
        property({ type: String }),
        __metadata$f("design:type", String)
    ], XFab.prototype, "icon", void 0);
    XFab = __decorate$g([
        element('x-fab')
    ], XFab);

    // @ts-ignore
    const Bezier = function (t) { function r(i) { if (n[i])
        return n[i].exports; var e = n[i] = { exports: {}, id: i, loaded: !1 }; return t[i].call(e.exports, e, e.exports, r), e.loaded = !0, e.exports; } var n = {}; return r.m = t, r.c = n, r.p = "", r(0); }([function (t, r, n) {
            t.exports = n(1);
        }, function (t, r, n) {
            var i = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (t) { return typeof t; } : function (t) { return t && "function" == typeof Symbol && t.constructor === Symbol ? "symbol" : typeof t; };
            !function () { function r(t, r, n, i, e) { "undefined" == typeof e && (e = .5); var o = l.projectionratio(e, t), s = 1 - o, u = { x: o * r.x + s * i.x, y: o * r.y + s * i.y }, a = l.abcratio(e, t), f = { x: n.x + (n.x - u.x) / a, y: n.y + (n.y - u.y) / a }; return { A: f, B: n, C: u }; } var e = Math.abs, o = Math.min, s = Math.max, u = Math.cos, a = Math.sin, f = Math.acos, c = Math.sqrt, h = Math.PI, x = { x: 0, y: 0, z: 0 }, l = n(2), y = n(3), p = function (t) { var r = t && t.forEach ? t : [].slice.call(arguments), n = !1; if ("object" === i(r[0])) {
                n = r.length;
                var o = [];
                r.forEach(function (t) { ["x", "y", "z"].forEach(function (r) { "undefined" != typeof t[r] && o.push(t[r]); }); }), r = o;
            } var s = !1, u = r.length; if (n) {
                if (n > 4) {
                    if (1 !== arguments.length)
                        throw new Error("Only new Bezier(point[]) is accepted for 4th and higher order curves");
                    s = !0;
                }
            }
            else if (6 !== u && 8 !== u && 9 !== u && 12 !== u && 1 !== arguments.length)
                throw new Error("Only new Bezier(point[]) is accepted for 4th and higher order curves"); var a = !s && (9 === u || 12 === u) || t && t[0] && "undefined" != typeof t[0].z; this._3d = a; for (var f = [], c = 0, h = a ? 3 : 2; u > c; c += h) {
                var x = { x: r[c], y: r[c + 1] };
                a && (x.z = r[c + 2]), f.push(x);
            } this.order = f.length - 1, this.points = f; var y = ["x", "y"]; a && y.push("z"), this.dims = y, this.dimlen = y.length, function (t) { for (var r = t.order, n = t.points, i = l.align(n, { p1: n[0], p2: n[r] }), o = 0; o < i.length; o++)
                if (e(i[o].y) > 1e-4)
                    return void (t._linear = !1); t._linear = !0; }(this), this._t1 = 0, this._t2 = 1, this.update(); }, v = n(4); p.SVGtoBeziers = function (t) { return v(p, t); }, p.quadraticFromPoints = function (t, n, i, e) { if ("undefined" == typeof e && (e = .5), 0 === e)
                return new p(n, n, i); if (1 === e)
                return new p(t, n, n); var o = r(2, t, n, i, e); return new p(t, o.A, i); }, p.cubicFromPoints = function (t, n, i, e, o) { "undefined" == typeof e && (e = .5); var s = r(3, t, n, i, e); "undefined" == typeof o && (o = l.dist(n, s.C)); var u = o * (1 - e) / e, a = l.dist(t, i), f = (i.x - t.x) / a, c = (i.y - t.y) / a, h = o * f, x = o * c, y = u * f, v = u * c, d = { x: n.x - h, y: n.y - x }, m = { x: n.x + y, y: n.y + v }, g = s.A, z = { x: g.x + (d.x - g.x) / (1 - e), y: g.y + (d.y - g.y) / (1 - e) }, b = { x: g.x + (m.x - g.x) / e, y: g.y + (m.y - g.y) / e }, _ = { x: t.x + (z.x - t.x) / e, y: t.y + (z.y - t.y) / e }, w = { x: i.x + (b.x - i.x) / (1 - e), y: i.y + (b.y - i.y) / (1 - e) }; return new p(t, _, w, i); }; var d = function () { return l; }; p.getUtils = d, p.PolyBezier = y, p.prototype = { getUtils: d, valueOf: function () { return this.toString(); }, toString: function () { return l.pointsToString(this.points); }, toSVG: function (t) { if (this._3d)
                    return !1; for (var r = this.points, n = r[0].x, i = r[0].y, e = ["M", n, i, 2 === this.order ? "Q" : "C"], o = 1, s = r.length; s > o; o++)
                    e.push(r[o].x), e.push(r[o].y); return e.join(" "); }, update: function () { this._lut = [], this.dpoints = l.derive(this.points, this._3d), this.computedirection(); }, computedirection: function () { var t = this.points, r = l.angle(t[0], t[this.order], t[1]); this.clockwise = r > 0; }, length: function () { return l.length(this.derivative.bind(this)); }, _lut: [], getLUT: function (t) { if (t = t || 100, this._lut.length === t)
                    return this._lut; this._lut = [], t--; for (var r = 0; t >= r; r++)
                    this._lut.push(this.compute(r / t)); return this._lut; }, on: function (t, r) { r = r || 5; for (var n, i = this.getLUT(), e = [], o = 0, s = 0; s < i.length; s++)
                    n = i[s], l.dist(n, t) < r && (e.push(n), o += s / i.length); return e.length ? o /= e.length : !1; }, project: function (t) { var r = this.getLUT(), n = r.length - 1, i = l.closest(r, t), e = i.mdist, o = i.mpos; if (0 === o || o === n) {
                    var s = o / n, u = this.compute(s);
                    return u.t = s, u.d = e, u;
                } var a, s, f, c, h = (o - 1) / n, x = (o + 1) / n, y = .1 / n; for (e += 1, s = h, a = s; x + y > s; s += y)
                    f = this.compute(s), c = l.dist(t, f), e > c && (e = c, a = s); return f = this.compute(a), f.t = a, f.d = e, f; }, get: function (t) { return this.compute(t); }, point: function (t) { return this.points[t]; }, compute: function (t) { return l.compute(t, this.points, this._3d); }, raise: function () { for (var t, r, n, i = this.points, e = [i[0]], o = i.length, t = 1; o > t; t++)
                    r = i[t], n = i[t - 1], e[t] = { x: (o - t) / o * r.x + t / o * n.x, y: (o - t) / o * r.y + t / o * n.y }; return e[o] = i[o - 1], new p(e); }, derivative: function (t) { var r, n, i = 1 - t, e = 0, o = this.dpoints[0]; 2 === this.order && (o = [o[0], o[1], x], r = i, n = t), 3 === this.order && (r = i * i, n = i * t * 2, e = t * t); var s = { x: r * o[0].x + n * o[1].x + e * o[2].x, y: r * o[0].y + n * o[1].y + e * o[2].y }; return this._3d && (s.z = r * o[0].z + n * o[1].z + e * o[2].z), s; }, curvature: function (t) { return l.curvature(t, this.points, this._3d); }, inflections: function () { return l.inflections(this.points); }, normal: function (t) { return this._3d ? this.__normal3(t) : this.__normal2(t); }, __normal2: function (t) { var r = this.derivative(t), n = c(r.x * r.x + r.y * r.y); return { x: -r.y / n, y: r.x / n }; }, __normal3: function (t) { var r = this.derivative(t), n = this.derivative(t + .01), i = c(r.x * r.x + r.y * r.y + r.z * r.z), e = c(n.x * n.x + n.y * n.y + n.z * n.z); r.x /= i, r.y /= i, r.z /= i, n.x /= e, n.y /= e, n.z /= e; var o = { x: n.y * r.z - n.z * r.y, y: n.z * r.x - n.x * r.z, z: n.x * r.y - n.y * r.x }, s = c(o.x * o.x + o.y * o.y + o.z * o.z); o.x /= s, o.y /= s, o.z /= s; var u = [o.x * o.x, o.x * o.y - o.z, o.x * o.z + o.y, o.x * o.y + o.z, o.y * o.y, o.y * o.z - o.x, o.x * o.z - o.y, o.y * o.z + o.x, o.z * o.z], a = { x: u[0] * r.x + u[1] * r.y + u[2] * r.z, y: u[3] * r.x + u[4] * r.y + u[5] * r.z, z: u[6] * r.x + u[7] * r.y + u[8] * r.z }; return a; }, hull: function (t) { var r, n = this.points, i = [], e = [], o = 0, s = 0, u = 0; for (e[o++] = n[0], e[o++] = n[1], e[o++] = n[2], 3 === this.order && (e[o++] = n[3]); n.length > 1;) {
                    for (i = [], s = 0, u = n.length - 1; u > s; s++)
                        r = l.lerp(t, n[s], n[s + 1]), e[o++] = r, i.push(r);
                    n = i;
                } return e; }, split: function (t, r) { if (0 === t && r)
                    return this.split(r).left; if (1 === r)
                    return this.split(t).right; var n = this.hull(t), i = { left: new p(2 === this.order ? [n[0], n[3], n[5]] : [n[0], n[4], n[7], n[9]]), right: new p(2 === this.order ? [n[5], n[4], n[2]] : [n[9], n[8], n[6], n[3]]), span: n }; if (i.left._t1 = l.map(0, 0, 1, this._t1, this._t2), i.left._t2 = l.map(t, 0, 1, this._t1, this._t2), i.right._t1 = l.map(t, 0, 1, this._t1, this._t2), i.right._t2 = l.map(1, 0, 1, this._t1, this._t2), !r)
                    return i; r = l.map(r, t, 1, 0, 1); var e = i.right.split(r); return e.left; }, extrema: function () { var t, r, n = this.dims, i = {}, e = []; return n.forEach(function (n) { r = function (t) { return t[n]; }, t = this.dpoints[0].map(r), i[n] = l.droots(t), 3 === this.order && (t = this.dpoints[1].map(r), i[n] = i[n].concat(l.droots(t))), i[n] = i[n].filter(function (t) { return t >= 0 && 1 >= t; }), e = e.concat(i[n].sort(l.numberSort)); }.bind(this)), e = e.sort(l.numberSort).filter(function (t, r) { return e.indexOf(t) === r; }), i.values = e, i; }, bbox: function () { var t = this.extrema(), r = {}; return this.dims.forEach(function (n) { r[n] = l.getminmax(this, n, t[n]); }.bind(this)), r; }, overlaps: function (t) { var r = this.bbox(), n = t.bbox(); return l.bboxoverlap(r, n); }, offset: function (t, r) { if ("undefined" != typeof r) {
                    var n = this.get(t), i = this.normal(t), e = { c: n, n: i, x: n.x + i.x * r, y: n.y + i.y * r };
                    return this._3d && (e.z = n.z + i.z * r), e;
                } if (this._linear) {
                    var o = this.normal(0), s = this.points.map(function (r) { var n = { x: r.x + t * o.x, y: r.y + t * o.y }; return r.z && i.z && (n.z = r.z + t * o.z), n; });
                    return [new p(s)];
                } var u = this.reduce(); return u.map(function (r) { return r.scale(t); }); }, simple: function () { if (3 === this.order) {
                    var t = l.angle(this.points[0], this.points[3], this.points[1]), r = l.angle(this.points[0], this.points[3], this.points[2]);
                    if (t > 0 && 0 > r || 0 > t && r > 0)
                        return !1;
                } var n = this.normal(0), i = this.normal(1), o = n.x * i.x + n.y * i.y; this._3d && (o += n.z * i.z); var s = e(f(o)); return h / 3 > s; }, reduce: function () { var t, r, n = 0, i = 0, o = .01, s = [], u = [], a = this.extrema().values; for (-1 === a.indexOf(0) && (a = [0].concat(a)), -1 === a.indexOf(1) && a.push(1), n = a[0], t = 1; t < a.length; t++)
                    i = a[t], r = this.split(n, i), r._t1 = n, r._t2 = i, s.push(r), n = i; return s.forEach(function (t) { for (n = 0, i = 0; 1 >= i;)
                    for (i = n + o; 1 + o >= i; i += o)
                        if (r = t.split(n, i), !r.simple()) {
                            if (i -= o, e(n - i) < o)
                                return [];
                            r = t.split(n, i), r._t1 = l.map(n, 0, 1, t._t1, t._t2), r._t2 = l.map(i, 0, 1, t._t1, t._t2), u.push(r), n = i;
                            break;
                        } 1 > n && (r = t.split(n, 1), r._t1 = l.map(n, 0, 1, t._t1, t._t2), r._t2 = t._t2, u.push(r)); }), u; }, scale: function (t) { var r = this.order, n = !1; if ("function" == typeof t && (n = t), n && 2 === r)
                    return this.raise().scale(n); var i = this.clockwise, e = n ? n(0) : t, o = n ? n(1) : t, s = [this.offset(0, 10), this.offset(1, 10)], u = l.lli4(s[0], s[0].c, s[1], s[1].c); if (!u)
                    throw new Error("cannot scale this curve. Try reducing it first."); var a = this.points, f = []; return [0, 1].forEach(function (t) { var n = f[t * r] = l.copy(a[t * r]); n.x += (t ? o : e) * s[t].n.x, n.y += (t ? o : e) * s[t].n.y; }.bind(this)), n ? ([0, 1].forEach(function (e) { if (2 !== this.order || !e) {
                    var o = a[e + 1], s = { x: o.x - u.x, y: o.y - u.y }, h = n ? n((e + 1) / r) : t;
                    n && !i && (h = -h);
                    var x = c(s.x * s.x + s.y * s.y);
                    s.x /= x, s.y /= x, f[e + 1] = { x: o.x + h * s.x, y: o.y + h * s.y };
                } }.bind(this)), new p(f)) : ([0, 1].forEach(function (t) { if (2 !== this.order || !t) {
                    var n = f[t * r], i = this.derivative(t), e = { x: n.x + i.x, y: n.y + i.y };
                    f[t + 1] = l.lli4(n, e, u, a[t + 1]);
                } }.bind(this)), new p(f)); }, outline: function (t, r, n, i) { function e(t, r, n, i, e) { return function (o) { var s = i / n, u = (i + e) / n, a = r - t; return l.map(o, 0, 1, t + s * a, t + u * a); }; } r = "undefined" == typeof r ? t : r; var o, s = this.reduce(), u = s.length, a = [], f = [], c = 0, h = this.length(), x = "undefined" != typeof n && "undefined" != typeof i; s.forEach(function (o) { _ = o.length(), x ? (a.push(o.scale(e(t, n, h, c, _))), f.push(o.scale(e(-r, -i, h, c, _)))) : (a.push(o.scale(t)), f.push(o.scale(-r))), c += _; }), f = f.map(function (t) { return o = t.points, o[3] ? t.points = [o[3], o[2], o[1], o[0]] : t.points = [o[2], o[1], o[0]], t; }).reverse(); var p = a[0].points[0], v = a[u - 1].points[a[u - 1].points.length - 1], d = f[u - 1].points[f[u - 1].points.length - 1], m = f[0].points[0], g = l.makeline(d, p), z = l.makeline(v, m), b = [g].concat(a).concat([z]).concat(f), _ = b.length; return new y(b); }, outlineshapes: function (t, r, n) { r = r || t; for (var i = this.outline(t, r).curves, e = [], o = 1, s = i.length; s / 2 > o; o++) {
                    var u = l.makeshape(i[o], i[s - o], n);
                    u.startcap.virtual = o > 1, u.endcap.virtual = s / 2 - 1 > o, e.push(u);
                } return e; }, intersects: function (t, r) { return t ? t.p1 && t.p2 ? this.lineIntersects(t) : (t instanceof p && (t = t.reduce()), this.curveintersects(this.reduce(), t, r)) : this.selfintersects(r); }, lineIntersects: function (t) { var r = o(t.p1.x, t.p2.x), n = o(t.p1.y, t.p2.y), i = s(t.p1.x, t.p2.x), e = s(t.p1.y, t.p2.y), u = this; return l.roots(this.points, t).filter(function (t) { var o = u.get(t); return l.between(o.x, r, i) && l.between(o.y, n, e); }); }, selfintersects: function (t) { var r, n, i, e, o = this.reduce(), s = o.length - 2, u = []; for (r = 0; s > r; r++)
                    i = o.slice(r, r + 1), e = o.slice(r + 2), n = this.curveintersects(i, e, t), u = u.concat(n); return u; }, curveintersects: function (t, r, n) { var i = []; t.forEach(function (t) { r.forEach(function (r) { t.overlaps(r) && i.push({ left: t, right: r }); }); }); var e = []; return i.forEach(function (t) { var r = l.pairiteration(t.left, t.right, n); r.length > 0 && (e = e.concat(r)); }), e; }, arcs: function (t) { t = t || .5; var r = []; return this._iterate(t, r); }, _error: function (t, r, n, i) { var o = (i - n) / 4, s = this.get(n + o), u = this.get(i - o), a = l.dist(t, r), f = l.dist(t, s), c = l.dist(t, u); return e(f - a) + e(c - a); }, _iterate: function (t, r) { var n, i = 0, e = 1; do {
                    n = 0, e = 1;
                    var o, s, f, c, h, x = this.get(i), y = !1, p = !1, v = e, d = 1;
                    do {
                        p = y, c = f, v = (i + e) / 2, o = this.get(v), s = this.get(e), f = l.getccenter(x, o, s), f.interval = { start: i, end: e };
                        var g = this._error(f, x, i, e);
                        if (y = t >= g, h = p && !y, h || (d = e), y) {
                            if (e >= 1) {
                                if (f.interval.end = d = 1, c = f, e > 1) {
                                    var z = { x: f.x + f.r * u(f.e), y: f.y + f.r * a(f.e) };
                                    f.e += l.angle({ x: f.x, y: f.y }, z, this.get(1));
                                }
                                break;
                            }
                            e += (e - i) / 2;
                        }
                        else
                            e = v;
                    } while (!h && n++ < 100);
                    if (n >= 100)
                        break;
                    c = c ? c : f, r.push(c), i = d;
                } while (1 > e); return r; } }, t.exports = p; }();
        }, function (t, r, n) {
            !function () { var r = Math.abs, i = Math.cos, e = Math.sin, o = Math.acos, s = Math.atan2, u = Math.sqrt, a = Math.pow, f = function (t) { return 0 > t ? -a(-t, 1 / 3) : a(t, 1 / 3); }, c = Math.PI, h = 2 * c, x = c / 2, l = 1e-6, y = Number.MAX_SAFE_INTEGER || 9007199254740991, p = Number.MIN_SAFE_INTEGER || -9007199254740991, v = { x: 0, y: 0, z: 0 }, d = { Tvalues: [-.06405689286260563, .06405689286260563, -.1911188674736163, .1911188674736163, -.3150426796961634, .3150426796961634, -.4337935076260451, .4337935076260451, -.5454214713888396, .5454214713888396, -.6480936519369755, .6480936519369755, -.7401241915785544, .7401241915785544, -.820001985973903, .820001985973903, -.8864155270044011, .8864155270044011, -.9382745520027328, .9382745520027328, -.9747285559713095, .9747285559713095, -.9951872199970213, .9951872199970213], Cvalues: [.12793819534675216, .12793819534675216, .1258374563468283, .1258374563468283, .12167047292780339, .12167047292780339, .1155056680537256, .1155056680537256, .10744427011596563, .10744427011596563, .09761865210411388, .09761865210411388, .08619016153195327, .08619016153195327, .0733464814110803, .0733464814110803, .05929858491543678, .05929858491543678, .04427743881741981, .04427743881741981, .028531388628933663, .028531388628933663, .0123412297999872, .0123412297999872], arcfn: function (t, r) { var n = r(t), i = n.x * n.x + n.y * n.y; return "undefined" != typeof n.z && (i += n.z * n.z), u(i); }, compute: function (t, r, n) { if (0 === t)
                    return r[0]; var i = r.length - 1; if (1 === t)
                    return r[i]; var e = r, o = 1 - t; if (0 === i)
                    return r[0]; if (1 === i)
                    return x = { x: o * e[0].x + t * e[1].x, y: o * e[0].y + t * e[1].y }, n && (x.z = o * e[0].z + t * e[1].z), x; if (4 > i) {
                    var s, u, a, f = o * o, c = t * t, h = 0;
                    2 === i ? (e = [e[0], e[1], e[2], v], s = f, u = o * t * 2, a = c) : 3 === i && (s = f * o, u = f * t * 3, a = o * c * 3, h = t * c);
                    var x = { x: s * e[0].x + u * e[1].x + a * e[2].x + h * e[3].x, y: s * e[0].y + u * e[1].y + a * e[2].y + h * e[3].y };
                    return n && (x.z = s * e[0].z + u * e[1].z + a * e[2].z + h * e[3].z), x;
                } for (var l = JSON.parse(JSON.stringify(r)); l.length > 1;) {
                    for (var y = 0; y < l.length - 1; y++)
                        l[y] = { x: l[y].x + (l[y + 1].x - l[y].x) * t, y: l[y].y + (l[y + 1].y - l[y].y) * t }, "undefined" != typeof l[y].z && (l[y] = l[y].z + (l[y + 1].z - l[y].z) * t);
                    l.splice(l.length - 1, 1);
                } return l[0]; }, derive: function (t, r) { for (var n = [], i = t, e = i.length, o = e - 1; e > 1; e--, o--) {
                    for (var s, u = [], a = 0; o > a; a++)
                        s = { x: o * (i[a + 1].x - i[a].x), y: o * (i[a + 1].y - i[a].y) }, r && (s.z = o * (i[a + 1].z - i[a].z)), u.push(s);
                    n.push(u), i = u;
                } return n; }, between: function (t, r, n) { return t >= r && n >= t || d.approximately(t, r) || d.approximately(t, n); }, approximately: function (t, n, i) { return r(t - n) <= (i || l); }, length: function (t) { var r, n, i = .5, e = 0, o = d.Tvalues.length; for (r = 0; o > r; r++)
                    n = i * d.Tvalues[r] + i, e += d.Cvalues[r] * d.arcfn(n, t); return i * e; }, map: function (t, r, n, i, e) { var o = n - r, s = e - i, u = t - r, a = u / o; return i + s * a; }, lerp: function (t, r, n) { var i = { x: r.x + t * (n.x - r.x), y: r.y + t * (n.y - r.y) }; return r.z && n.z && (i.z = r.z + t * (n.z - r.z)), i; }, pointToString: function (t) { var r = t.x + "/" + t.y; return "undefined" != typeof t.z && (r += "/" + t.z), r; }, pointsToString: function (t) { return "[" + t.map(d.pointToString).join(", ") + "]"; }, copy: function (t) { return JSON.parse(JSON.stringify(t)); }, angle: function (t, r, n) { var i = r.x - t.x, e = r.y - t.y, o = n.x - t.x, u = n.y - t.y, a = i * u - e * o, f = i * o + e * u; return s(a, f); }, round: function (t, r) { var n = "" + t, i = n.indexOf("."); return parseFloat(n.substring(0, i + 1 + r)); }, dist: function (t, r) { var n = t.x - r.x, i = t.y - r.y; return u(n * n + i * i); }, closest: function (t, r) { var n, i, e = a(2, 63); return t.forEach(function (t, o) { i = d.dist(r, t), e > i && (e = i, n = o); }), { mdist: e, mpos: n }; }, abcratio: function (t, n) { if (2 !== n && 3 !== n)
                    return !1; if ("undefined" == typeof t)
                    t = .5;
                else if (0 === t || 1 === t)
                    return t; var i = a(t, n) + a(1 - t, n), e = i - 1; return r(e / i); }, projectionratio: function (t, r) { if (2 !== r && 3 !== r)
                    return !1; if ("undefined" == typeof t)
                    t = .5;
                else if (0 === t || 1 === t)
                    return t; var n = a(1 - t, r), i = a(t, r) + n; return n / i; }, lli8: function (t, r, n, i, e, o, s, u) { var a = (t * i - r * n) * (e - s) - (t - n) * (e * u - o * s), f = (t * i - r * n) * (o - u) - (r - i) * (e * u - o * s), c = (t - n) * (o - u) - (r - i) * (e - s); return 0 == c ? !1 : { x: a / c, y: f / c }; }, lli4: function (t, r, n, i) { var e = t.x, o = t.y, s = r.x, u = r.y, a = n.x, f = n.y, c = i.x, h = i.y; return d.lli8(e, o, s, u, a, f, c, h); }, lli: function (t, r) { return d.lli4(t, t.c, r, r.c); }, makeline: function (t, r) { var i = n(1), e = t.x, o = t.y, s = r.x, u = r.y, a = (s - e) / 3, f = (u - o) / 3; return new i(e, o, e + a, o + f, e + 2 * a, o + 2 * f, s, u); }, findbbox: function (t) { var r = y, n = y, i = p, e = p; return t.forEach(function (t) { var o = t.bbox(); r > o.x.min && (r = o.x.min), n > o.y.min && (n = o.y.min), i < o.x.max && (i = o.x.max), e < o.y.max && (e = o.y.max); }), { x: { min: r, mid: (r + i) / 2, max: i, size: i - r }, y: { min: n, mid: (n + e) / 2, max: e, size: e - n } }; }, shapeintersections: function (t, r, n, i, e) { if (!d.bboxoverlap(r, i))
                    return []; var o = [], s = [t.startcap, t.forward, t.back, t.endcap], u = [n.startcap, n.forward, n.back, n.endcap]; return s.forEach(function (r) { r.virtual || u.forEach(function (i) { if (!i.virtual) {
                    var s = r.intersects(i, e);
                    s.length > 0 && (s.c1 = r, s.c2 = i, s.s1 = t, s.s2 = n, o.push(s));
                } }); }), o; }, makeshape: function (t, r, n) { var i = r.points.length, e = t.points.length, o = d.makeline(r.points[i - 1], t.points[0]), s = d.makeline(t.points[e - 1], r.points[0]), u = { startcap: o, forward: t, back: r, endcap: s, bbox: d.findbbox([o, t, r, s]) }, a = d; return u.intersections = function (t) { return a.shapeintersections(u, u.bbox, t, t.bbox, n); }, u; }, getminmax: function (t, r, n) { if (!n)
                    return { min: 0, max: 0 }; var i, e, o = y, s = p; -1 === n.indexOf(0) && (n = [0].concat(n)), -1 === n.indexOf(1) && n.push(1); for (var u = 0, a = n.length; a > u; u++)
                    i = n[u], e = t.get(i), e[r] < o && (o = e[r]), e[r] > s && (s = e[r]); return { min: o, mid: (o + s) / 2, max: s, size: s - o }; }, align: function (t, r) { var n = r.p1.x, o = r.p1.y, u = -s(r.p2.y - o, r.p2.x - n), a = function (t) { return { x: (t.x - n) * i(u) - (t.y - o) * e(u), y: (t.x - n) * e(u) + (t.y - o) * i(u) }; }; return t.map(a); }, roots: function (t, r) { r = r || { p1: { x: 0, y: 0 }, p2: { x: 1, y: 0 } }; var n = t.length - 1, e = d.align(t, r), s = function (t) { return t >= 0 && 1 >= t; }; if (2 === n) {
                    var a = e[0].y, c = e[1].y, x = e[2].y, l = a - 2 * c + x;
                    if (0 !== l) {
                        var y = -u(c * c - a * x), p = -a + c, v = -(y + p) / l, m = -(-y + p) / l;
                        return [v, m].filter(s);
                    }
                    return c !== x && 0 === l ? [(2 * c - x) / (2 * c - 2 * x)].filter(s) : [];
                } var g = e[0].y, z = e[1].y, b = e[2].y, _ = e[3].y, l = -g + 3 * z - 3 * b + _, a = 3 * g - 6 * z + 3 * b, c = -3 * g + 3 * z, x = g; if (d.approximately(l, 0)) {
                    if (d.approximately(a, 0))
                        return d.approximately(c, 0) ? [] : [-x / c].filter(s);
                    var w = u(c * c - 4 * a * x), E = 2 * a;
                    return [(w - c) / E, (-c - w) / E].filter(s);
                } a /= l, c /= l, x /= l; var M, v, S, k, j, e = (3 * c - a * a) / 3, O = e / 3, w = (2 * a * a * a - 9 * a * c + 27 * x) / 27, T = w / 2, C = T * T + O * O * O; if (0 > C) {
                    var L = -e / 3, N = L * L * L, A = u(N), B = -w / (2 * A), F = -1 > B ? -1 : B > 1 ? 1 : B, I = o(F), q = f(A), P = 2 * q;
                    return S = P * i(I / 3) - a / 3, k = P * i((I + h) / 3) - a / 3, j = P * i((I + 2 * h) / 3) - a / 3, [S, k, j].filter(s);
                } if (0 === C)
                    return M = 0 > T ? f(-T) : -f(T), S = 2 * M - a / 3, k = -M - a / 3, [S, k].filter(s); var Q = u(C); return M = f(-T + Q), v = f(T + Q), [M - v - a / 3].filter(s); }, droots: function (t) { if (3 === t.length) {
                    var r = t[0], n = t[1], i = t[2], e = r - 2 * n + i;
                    if (0 !== e) {
                        var o = -u(n * n - r * i), s = -r + n, a = -(o + s) / e, f = -(-o + s) / e;
                        return [a, f];
                    }
                    return n !== i && 0 === e ? [(2 * n - i) / (2 * (n - i))] : [];
                } if (2 === t.length) {
                    var r = t[0], n = t[1];
                    return r !== n ? [r / (r - n)] : [];
                } }, curvature: function (t, r, n) { var i, e, o = d.derive(r), s = o[0], f = o[1], c = d.compute(t, s), h = d.compute(t, f); return n ? (i = u(a(c.y * h.z - h.y * c.z, 2) + a(c.z * h.x - h.z * c.x, 2) + a(c.x * h.y - h.x * c.y, 2)), e = a(c.x * c.x + c.y * c.y + c.z * c.z, 1.5)) : (i = c.x * h.y - c.y * h.x, e = a(c.x * c.x + c.y * c.y, 1.5)), 0 === i || 0 === e ? { k: 0, r: 0 } : { k: i / e, r: e / i }; }, inflections: function (t) { if (t.length < 4)
                    return []; var r = d.align(t, { p1: t[0], p2: t.slice(-1)[0] }), n = r[2].x * r[1].y, i = r[3].x * r[1].y, e = r[1].x * r[2].y, o = r[3].x * r[2].y, s = 18 * (-3 * n + 2 * i + 3 * e - o), u = 18 * (3 * n - i - 3 * e), a = 18 * (e - n); if (d.approximately(s, 0)) {
                    if (!d.approximately(u, 0)) {
                        var f = -a / u;
                        if (f >= 0 && 1 >= f)
                            return [f];
                    }
                    return [];
                } var c = u * u - 4 * s * a, h = Math.sqrt(c), o = 2 * s; return d.approximately(o, 0) ? [] : [(h - u) / o, -(u + h) / o].filter(function (t) { return t >= 0 && 1 >= t; }); }, bboxoverlap: function (t, n) { var i, e, o, s, u, a = ["x", "y"], f = a.length; for (i = 0; f > i; i++)
                    if (e = a[i], o = t[e].mid, s = n[e].mid, u = (t[e].size + n[e].size) / 2, r(o - s) >= u)
                        return !1; return !0; }, expandbox: function (t, r) { r.x.min < t.x.min && (t.x.min = r.x.min), r.y.min < t.y.min && (t.y.min = r.y.min), r.z && r.z.min < t.z.min && (t.z.min = r.z.min), r.x.max > t.x.max && (t.x.max = r.x.max), r.y.max > t.y.max && (t.y.max = r.y.max), r.z && r.z.max > t.z.max && (t.z.max = r.z.max), t.x.mid = (t.x.min + t.x.max) / 2, t.y.mid = (t.y.min + t.y.max) / 2, t.z && (t.z.mid = (t.z.min + t.z.max) / 2), t.x.size = t.x.max - t.x.min, t.y.size = t.y.max - t.y.min, t.z && (t.z.size = t.z.max - t.z.min); }, pairiteration: function (t, r, n) { var i = t.bbox(), e = r.bbox(), o = 1e5, s = n || .5; if (i.x.size + i.y.size < s && e.x.size + e.y.size < s)
                    return [(o * (t._t1 + t._t2) / 2 | 0) / o + "/" + (o * (r._t1 + r._t2) / 2 | 0) / o]; var u = t.split(.5), a = r.split(.5), f = [{ left: u.left, right: a.left }, { left: u.left, right: a.right }, { left: u.right, right: a.right }, { left: u.right, right: a.left }]; f = f.filter(function (t) { return d.bboxoverlap(t.left.bbox(), t.right.bbox()); }); var c = []; return 0 === f.length ? c : (f.forEach(function (t) { c = c.concat(d.pairiteration(t.left, t.right, s)); }), c = c.filter(function (t, r) { return c.indexOf(t) === r; })); }, getccenter: function (t, r, n) { var o, u = r.x - t.x, a = r.y - t.y, f = n.x - r.x, c = n.y - r.y, l = u * i(x) - a * e(x), y = u * e(x) + a * i(x), p = f * i(x) - c * e(x), v = f * e(x) + c * i(x), m = (t.x + r.x) / 2, g = (t.y + r.y) / 2, z = (r.x + n.x) / 2, b = (r.y + n.y) / 2, _ = m + l, w = g + y, E = z + p, M = b + v, S = d.lli8(m, g, _, w, z, b, E, M), k = d.dist(S, t), j = s(t.y - S.y, t.x - S.x), O = s(r.y - S.y, r.x - S.x), T = s(n.y - S.y, n.x - S.x); return T > j ? ((j > O || O > T) && (j += h), j > T && (o = T, T = j, j = o)) : O > T && j > O ? (o = T, T = j, j = o) : T += h, S.s = j, S.e = T, S.r = k, S; }, numberSort: function (t, r) { return t - r; } }; t.exports = d; }();
        }, function (t, r, n) {
            !function () { var r = n(2), i = function (t) { this.curves = [], this._3d = !1, t && (this.curves = t, this._3d = this.curves[0]._3d); }; i.prototype = { valueOf: function () { return this.toString(); }, toString: function () { return "[" + this.curves.map(function (t) { return r.pointsToString(t.points); }).join(", ") + "]"; }, addCurve: function (t) { this.curves.push(t), this._3d = this._3d || t._3d; }, length: function () { return this.curves.map(function (t) { return t.length(); }).reduce(function (t, r) { return t + r; }); }, curve: function (t) { return this.curves[t]; }, bbox: function e() { for (var t = this.curves, e = t[0].bbox(), n = 1; n < t.length; n++)
                    r.expandbox(e, t[n].bbox()); return e; }, offset: function o(t) { var o = []; return this.curves.forEach(function (r) { o = o.concat(r.offset(t)); }), new i(o); } }, t.exports = i; }();
        }, function (t, r, n) {
            function i(t, r, n) { if ("Z" !== r) {
                if ("M" === r)
                    return void (s = { x: n[0], y: n[1] });
                var i = [!1, s.x, s.y].concat(n), e = t.bind.apply(t, i), o = new e, u = n.slice(-2);
                return s = { x: u[0], y: u[1] }, o;
            } }
            function e(t, r) { for (var n, e, s, u = o(r).split(" "), a = new RegExp("[MLCQZ]", ""), f = [], c = { C: 6, Q: 4, L: 2, M: 2 }; u.length;)
                n = u.splice(0, 1)[0], a.test(n) && (s = u.splice(0, c[n]).map(parseFloat), e = i(t, n, s), e && f.push(e)); return new t.PolyBezier(f); }
            var o = n(5), s = { x: !1, y: !1 };
            t.exports = e;
        }, function (t, r) {
            function n(t) { t = t.replace(/,/g, " ").replace(/-/g, " - ").replace(/-\s+/g, "-").replace(/([a-zA-Z])/g, " $1 "); var r, n, i, e, o, s, u = t.replace(/([a-zA-Z])\s?/g, "|$1").split("|"), a = u.length, f = [], c = 0, h = 0, x = 0, l = 0, y = 0, p = 0, v = 0, d = 0, m = ""; for (r = 1; a > r; r++)
                if (n = u[r], i = n.substring(0, 1), e = i.toLowerCase(), f = n.replace(i, "").trim().split(" "), f = f.filter(function (t) { return "" !== t; }).map(parseFloat), o = f.length, "m" === e) {
                    if (m += "M ", "m" === i ? (x += f[0], l += f[1]) : (x = f[0], l = f[1]), c = x, h = l, m += x + " " + l + " ", o > 2)
                        for (s = 0; o > s; s += 2)
                            "m" === i ? (x += f[s], l += f[s + 1]) : (x = f[s], l = f[s + 1]), m += ["L", x, l, ""].join(" ");
                }
                else if ("l" === e)
                    for (s = 0; o > s; s += 2)
                        "l" === i ? (x += f[s], l += f[s + 1]) : (x = f[s], l = f[s + 1]), m += ["L", x, l, ""].join(" ");
                else if ("h" === e)
                    for (s = 0; o > s; s++)
                        "h" === i ? x += f[s] : x = f[s], m += ["L", x, l, ""].join(" ");
                else if ("v" === e)
                    for (s = 0; o > s; s++)
                        "v" === i ? l += f[s] : l = f[s], m += ["L", x, l, ""].join(" ");
                else if ("q" === e)
                    for (s = 0; o > s; s += 4)
                        "q" === i ? (y = x + f[s], p = l + f[s + 1], x += f[s + 2], l += f[s + 3]) : (y = f[s], p = f[s + 1], x = f[s + 2], l = f[s + 3]), m += ["Q", y, p, x, l, ""].join(" ");
                else if ("t" === e)
                    for (s = 0; o > s; s += 2)
                        y = x + (x - y), p = l + (l - p), "t" === i ? (x += f[s], l += f[s + 1]) : (x = f[s], l = f[s + 1]), m += ["Q", y, p, x, l, ""].join(" ");
                else if ("c" === e)
                    for (s = 0; o > s; s += 6)
                        "c" === i ? (y = x + f[s], p = l + f[s + 1], v = x + f[s + 2], d = l + f[s + 3], x += f[s + 4], l += f[s + 5]) : (y = f[s], p = f[s + 1], v = f[s + 2], d = f[s + 3], x = f[s + 4], l = f[s + 5]), m += ["C", y, p, v, d, x, l, ""].join(" ");
                else if ("s" === e)
                    for (s = 0; o > s; s += 4)
                        y = x + (x - v), p = l + (l - d), "s" === i ? (v = x + f[s], d = l + f[s + 1], x += f[s + 2], l += f[s + 3]) : (v = f[s], d = f[s + 1], x = f[s + 2], l = f[s + 3]), m += ["C", y, p, v, d, x, l, ""].join(" ");
                else
                    "z" === e && (m += "Z ", x = c, l = h); return m.trim(); }
            t.exports = n;
        }]);

    /**
    @license
    Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
    This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
    The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
    The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
    Code distributed by Google as part of the polymer project is also
    subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
    */

    /* eslint-disable no-unused-vars */
    /**
     * When using Closure Compiler, JSCompiler_renameProperty(property, object) is replaced by the munged name for object[property]
     * We cannot alias this function, so we have to use a small shim that has the same behavior when not compiling.
     *
     * @param {string} prop Property name
     * @param {?Object} obj Reference object
     * @return {string} Potentially renamed property name
     */
    window.JSCompiler_renameProperty = function(prop, obj) {
      return prop;
    };

    /**
    @license
    Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
    This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
    The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
    The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
    Code distributed by Google as part of the polymer project is also
    subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
    */

    // Microtask implemented using Mutation Observer
    let microtaskCurrHandle = 0;
    let microtaskLastHandle = 0;
    let microtaskCallbacks = [];
    let microtaskNodeContent = 0;
    let microtaskNode = document.createTextNode('');
    new window.MutationObserver(microtaskFlush).observe(microtaskNode, {characterData: true});

    function microtaskFlush() {
      const len = microtaskCallbacks.length;
      for (let i = 0; i < len; i++) {
        let cb = microtaskCallbacks[i];
        if (cb) {
          try {
            cb();
          } catch (e) {
            setTimeout(() => { throw e; });
          }
        }
      }
      microtaskCallbacks.splice(0, len);
      microtaskLastHandle += len;
    }

    /**
     * Async interface wrapper around `setTimeout`.
     *
     * @namespace
     * @summary Async interface wrapper around `setTimeout`.
     */
    const timeOut = {
      /**
       * Returns a sub-module with the async interface providing the provided
       * delay.
       *
       * @memberof timeOut
       * @param {number=} delay Time to wait before calling callbacks in ms
       * @return {!AsyncInterface} An async timeout interface
       */
      after(delay) {
        return {
          run(fn) { return window.setTimeout(fn, delay); },
          cancel(handle) {
            window.clearTimeout(handle);
          }
        };
      },
      /**
       * Enqueues a function called in the next task.
       *
       * @memberof timeOut
       * @param {!Function} fn Callback to run
       * @param {number=} delay Delay in milliseconds
       * @return {number} Handle used for canceling task
       */
      run(fn, delay) {
        return window.setTimeout(fn, delay);
      },
      /**
       * Cancels a previously enqueued `timeOut` callback.
       *
       * @memberof timeOut
       * @param {number} handle Handle returned from `run` of callback to cancel
       * @return {void}
       */
      cancel(handle) {
        window.clearTimeout(handle);
      }
    };

    /**
     * Async interface for enqueuing callbacks that run at microtask timing.
     *
     * Note that microtask timing is achieved via a single `MutationObserver`,
     * and thus callbacks enqueued with this API will all run in a single
     * batch, and not interleaved with other microtasks such as promises.
     * Promises are avoided as an implementation choice for the time being
     * due to Safari bugs that cause Promises to lack microtask guarantees.
     *
     * @namespace
     * @summary Async interface for enqueuing callbacks that run at microtask
     *   timing.
     */
    const microTask = {

      /**
       * Enqueues a function called at microtask timing.
       *
       * @memberof microTask
       * @param {!Function=} callback Callback to run
       * @return {number} Handle used for canceling task
       */
      run(callback) {
        microtaskNode.textContent = microtaskNodeContent++;
        microtaskCallbacks.push(callback);
        return microtaskCurrHandle++;
      },

      /**
       * Cancels a previously enqueued `microTask` callback.
       *
       * @memberof microTask
       * @param {number} handle Handle returned from `run` of callback to cancel
       * @return {void}
       */
      cancel(handle) {
        const idx = handle - microtaskLastHandle;
        if (idx >= 0) {
          if (!microtaskCallbacks[idx]) {
            throw new Error('invalid async handle: ' + handle);
          }
          microtaskCallbacks[idx] = null;
        }
      }

    };

    /**
    @license
    Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
    This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
    The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
    The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
    Code distributed by Google as part of the polymer project is also
    subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
    */
    /* eslint-enable valid-jsdoc */

    /**
    @license
    Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
    This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
    The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
    The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
    Code distributed by Google as part of the polymer project is also
    subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
    */

    /**
     * @summary Collapse multiple callbacks into one invocation after a timer.
     */
    class Debouncer {
      constructor() {
        this._asyncModule = null;
        this._callback = null;
        this._timer = null;
      }
      /**
       * Sets the scheduler; that is, a module with the Async interface,
       * a callback and optional arguments to be passed to the run function
       * from the async module.
       *
       * @param {!AsyncInterface} asyncModule Object with Async interface.
       * @param {function()} callback Callback to run.
       * @return {void}
       */
      setConfig(asyncModule, callback) {
        this._asyncModule = asyncModule;
        this._callback = callback;
        this._timer = this._asyncModule.run(() => {
          this._timer = null;
          debouncerQueue.delete(this);
          this._callback();
        });
      }
      /**
       * Cancels an active debouncer and returns a reference to itself.
       *
       * @return {void}
       */
      cancel() {
        if (this.isActive()) {
          this._cancelAsync();
          // Canceling a debouncer removes its spot from the flush queue,
          // so if a debouncer is manually canceled and re-debounced, it
          // will reset its flush order (this is a very minor difference from 1.x)
          // Re-debouncing via the `debounce` API retains the 1.x FIFO flush order
          debouncerQueue.delete(this);
        }
      }
      /**
       * Cancels a debouncer's async callback.
       *
       * @return {void}
       */
      _cancelAsync() {
        if (this.isActive()) {
          this._asyncModule.cancel(/** @type {number} */(this._timer));
          this._timer = null;
        }
      }
      /**
       * Flushes an active debouncer and returns a reference to itself.
       *
       * @return {void}
       */
      flush() {
        if (this.isActive()) {
          this.cancel();
          this._callback();
        }
      }
      /**
       * Returns true if the debouncer is active.
       *
       * @return {boolean} True if active.
       */
      isActive() {
        return this._timer != null;
      }
      /**
       * Creates a debouncer if no debouncer is passed as a parameter
       * or it cancels an active debouncer otherwise. The following
       * example shows how a debouncer can be called multiple times within a
       * microtask and "debounced" such that the provided callback function is
       * called once. Add this method to a custom element:
       *
       * ```js
       * import {microTask} from '@polymer/polymer/lib/utils/async.js';
       * import {Debouncer} from '@polymer/polymer/lib/utils/debounce.js';
       * // ...
       *
       * _debounceWork() {
       *   this._debounceJob = Debouncer.debounce(this._debounceJob,
       *       microTask, () => this._doWork());
       * }
       * ```
       *
       * If the `_debounceWork` method is called multiple times within the same
       * microtask, the `_doWork` function will be called only once at the next
       * microtask checkpoint.
       *
       * Note: In testing it is often convenient to avoid asynchrony. To accomplish
       * this with a debouncer, you can use `enqueueDebouncer` and
       * `flush`. For example, extend the above example by adding
       * `enqueueDebouncer(this._debounceJob)` at the end of the
       * `_debounceWork` method. Then in a test, call `flush` to ensure
       * the debouncer has completed.
       *
       * @param {Debouncer?} debouncer Debouncer object.
       * @param {!AsyncInterface} asyncModule Object with Async interface
       * @param {function()} callback Callback to run.
       * @return {!Debouncer} Returns a debouncer object.
       */
      static debounce(debouncer, asyncModule, callback) {
        if (debouncer instanceof Debouncer) {
          // Cancel the async callback, but leave in debouncerQueue if it was
          // enqueued, to maintain 1.x flush order
          debouncer._cancelAsync();
        } else {
          debouncer = new Debouncer();
        }
        debouncer.setConfig(asyncModule, callback);
        return debouncer;
      }
    }

    let debouncerQueue = new Set();

    /**
    @license
    Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
    This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
    The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
    The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
    Code distributed by Google as part of the polymer project is also
    subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
    */

    /**
     * Returns a path from a given `url`. The path includes the trailing
     * `/` from the url.
     *
     * @param {string} url Input URL to transform
     * @return {string} resolved path
     */
    function pathFromUrl(url) {
      return url.substring(0, url.lastIndexOf('/') + 1);
    }

    /**
    @license
    Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
    This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
    The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
    The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
    Code distributed by Google as part of the polymer project is also
    subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
    */
    const useShadow = !(window.ShadyDOM);
    const useNativeCSSProperties = Boolean(!window.ShadyCSS || window.ShadyCSS.nativeCss);
    const useNativeCustomElements = !(window.customElements.polyfillWrapFlushCallback);


    /**
     * Globally settable property that is automatically assigned to
     * `ElementMixin` instances, useful for binding in templates to
     * make URL's relative to an application's root.  Defaults to the main
     * document URL, but can be overridden by users.  It may be useful to set
     * `rootPath` to provide a stable application mount path when
     * using client side routing.
     */
    let rootPath = pathFromUrl(document.baseURI || window.location.href);

    /**
     * A global callback used to sanitize any value before inserting it into the DOM.
     * The callback signature is:
     *
     *  function sanitizeDOMValue(value, name, type, node) { ... }
     *
     * Where:
     *
     * `value` is the value to sanitize.
     * `name` is the name of an attribute or property (for example, href).
     * `type` indicates where the value is being inserted: one of property, attribute, or text.
     * `node` is the node where the value is being inserted.
     *
     * @type {(function(*,string,string,Node):*)|undefined}
     */
    let sanitizeDOMValue = window.Polymer && window.Polymer.sanitizeDOMValue || undefined;

    /**
     * Globally settable property to make Polymer Gestures use passive TouchEvent listeners when recognizing gestures.
     * When set to `true`, gestures made from touch will not be able to prevent scrolling, allowing for smoother
     * scrolling performance.
     * Defaults to `false` for backwards compatibility.
     */
    let passiveTouchGestures = false;

    /**
    @license
    Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
    This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
    The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
    The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
    Code distributed by Google as part of the polymer project is also
    subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
    */

    /* eslint-disable valid-jsdoc */
    /**
     * Node wrapper to ensure ShadowDOM safe operation regardless of polyfill
     * presence or mode. Note that with the introduction of `ShadyDOM.noPatch`,
     * a node wrapper must be used to access ShadowDOM API.
     * This is similar to using `Polymer.dom` but relies exclusively
     * on the presence of the ShadyDOM polyfill rather than requiring the loading
     * of legacy (Polymer.dom) API.
     * @type {function(Node):Node}
     */
    const wrap = (window['ShadyDOM'] && window['ShadyDOM']['noPatch'] && window['ShadyDOM']['wrap']) ?
      window['ShadyDOM']['wrap'] : (n) => n;

    /**
    @license
    Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
    This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
    The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
    The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
    Code distributed by Google as part of the polymer project is also
    subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
    */

    // detect native touch action support
    let HAS_NATIVE_TA = typeof document.head.style.touchAction === 'string';
    let GESTURE_KEY = '__polymerGestures';
    let HANDLED_OBJ = '__polymerGesturesHandled';
    let TOUCH_ACTION = '__polymerGesturesTouchAction';
    // radius for tap and track
    let TAP_DISTANCE = 25;
    let TRACK_DISTANCE = 5;
    // number of last N track positions to keep
    let TRACK_LENGTH = 2;

    // Disabling "mouse" handlers for 2500ms is enough
    let MOUSE_TIMEOUT = 2500;
    let MOUSE_EVENTS = ['mousedown', 'mousemove', 'mouseup', 'click'];
    // an array of bitmask values for mapping MouseEvent.which to MouseEvent.buttons
    let MOUSE_WHICH_TO_BUTTONS = [0, 1, 4, 2];
    let MOUSE_HAS_BUTTONS = (function() {
      try {
        return new MouseEvent('test', {buttons: 1}).buttons === 1;
      } catch (e) {
        return false;
      }
    })();

    /**
     * @param {string} name Possible mouse event name
     * @return {boolean} true if mouse event, false if not
     */
    function isMouseEvent(name) {
      return MOUSE_EVENTS.indexOf(name) > -1;
    }

    /* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
    // check for passive event listeners
    let SUPPORTS_PASSIVE = false;
    (function() {
      try {
        let opts = Object.defineProperty({}, 'passive', {get() {SUPPORTS_PASSIVE = true;}});
        window.addEventListener('test', null, opts);
        window.removeEventListener('test', null, opts);
      } catch(e) {}
    })();

    /**
     * Generate settings for event listeners, dependant on `passiveTouchGestures`
     *
     * @param {string} eventName Event name to determine if `{passive}` option is
     *   needed
     * @return {{passive: boolean} | undefined} Options to use for addEventListener
     *   and removeEventListener
     */
    function PASSIVE_TOUCH(eventName) {
      if (isMouseEvent(eventName) || eventName === 'touchend') {
        return;
      }
      if (HAS_NATIVE_TA && SUPPORTS_PASSIVE && passiveTouchGestures) {
        return {passive: true};
      } else {
        return;
      }
    }

    // Check for touch-only devices
    let IS_TOUCH_ONLY = navigator.userAgent.match(/iP(?:[oa]d|hone)|Android/);

    // keep track of any labels hit by the mouseCanceller
    /** @type {!Array<!HTMLLabelElement>} */
    const clickedLabels = [];

    /** @type {!Object<boolean>} */
    const labellable = {
      'button': true,
      'input': true,
      'keygen': true,
      'meter': true,
      'output': true,
      'textarea': true,
      'progress': true,
      'select': true
    };

    // Defined at https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#enabling-and-disabling-form-controls:-the-disabled-attribute
    /** @type {!Object<boolean>} */
    const canBeDisabled = {
      'button': true,
      'command': true,
      'fieldset': true,
      'input': true,
      'keygen': true,
      'optgroup': true,
      'option': true,
      'select': true,
      'textarea': true
    };

    /**
     * @param {HTMLElement} el Element to check labelling status
     * @return {boolean} element can have labels
     */
    function canBeLabelled(el) {
      return labellable[el.localName] || false;
    }

    /**
     * @param {HTMLElement} el Element that may be labelled.
     * @return {!Array<!HTMLLabelElement>} Relevant label for `el`
     */
    function matchingLabels(el) {
      let labels = Array.prototype.slice.call(/** @type {HTMLInputElement} */(el).labels || []);
      // IE doesn't have `labels` and Safari doesn't populate `labels`
      // if element is in a shadowroot.
      // In this instance, finding the non-ancestor labels is enough,
      // as the mouseCancellor code will handle ancstor labels
      if (!labels.length) {
        labels = [];
        let root = el.getRootNode();
        // if there is an id on `el`, check for all labels with a matching `for` attribute
        if (el.id) {
          let matching = root.querySelectorAll(`label[for = ${el.id}]`);
          for (let i = 0; i < matching.length; i++) {
            labels.push(/** @type {!HTMLLabelElement} */(matching[i]));
          }
        }
      }
      return labels;
    }

    // touch will make synthetic mouse events
    // `preventDefault` on touchend will cancel them,
    // but this breaks `<input>` focus and link clicks
    // disable mouse handlers for MOUSE_TIMEOUT ms after
    // a touchend to ignore synthetic mouse events
    let mouseCanceller = function(mouseEvent) {
      // Check for sourceCapabilities, used to distinguish synthetic events
      // if mouseEvent did not come from a device that fires touch events,
      // it was made by a real mouse and should be counted
      // http://wicg.github.io/InputDeviceCapabilities/#dom-inputdevicecapabilities-firestouchevents
      let sc = mouseEvent.sourceCapabilities;
      if (sc && !sc.firesTouchEvents) {
        return;
      }
      // skip synthetic mouse events
      mouseEvent[HANDLED_OBJ] = {skip: true};
      // disable "ghost clicks"
      if (mouseEvent.type === 'click') {
        let clickFromLabel = false;
        let path = getComposedPath(mouseEvent);
        for (let i = 0; i < path.length; i++) {
          if (path[i].nodeType === Node.ELEMENT_NODE) {
            if (path[i].localName === 'label') {
              clickedLabels.push(/** @type {!HTMLLabelElement} */ (path[i]));
            } else if (canBeLabelled(/** @type {!HTMLElement} */ (path[i]))) {
              let ownerLabels =
                  matchingLabels(/** @type {!HTMLElement} */ (path[i]));
              // check if one of the clicked labels is labelling this element
              for (let j = 0; j < ownerLabels.length; j++) {
                clickFromLabel = clickFromLabel || clickedLabels.indexOf(ownerLabels[j]) > -1;
              }
            }
          }
          if (path[i] === POINTERSTATE.mouse.target) {
            return;
          }
        }
        // if one of the clicked labels was labelling the target element,
        // this is not a ghost click
        if (clickFromLabel) {
          return;
        }
        mouseEvent.preventDefault();
        mouseEvent.stopPropagation();
      }
    };

    /**
     * @param {boolean=} setup True to add, false to remove.
     * @return {void}
     */
    function setupTeardownMouseCanceller(setup) {
      let events = IS_TOUCH_ONLY ? ['click'] : MOUSE_EVENTS;
      for (let i = 0, en; i < events.length; i++) {
        en = events[i];
        if (setup) {
          // reset clickLabels array
          clickedLabels.length = 0;
          document.addEventListener(en, mouseCanceller, true);
        } else {
          document.removeEventListener(en, mouseCanceller, true);
        }
      }
    }

    function ignoreMouse(e) {
      if (!POINTERSTATE.mouse.mouseIgnoreJob) {
        setupTeardownMouseCanceller(true);
      }
      let unset = function() {
        setupTeardownMouseCanceller();
        POINTERSTATE.mouse.target = null;
        POINTERSTATE.mouse.mouseIgnoreJob = null;
      };
      POINTERSTATE.mouse.target = getComposedPath(e)[0];
      POINTERSTATE.mouse.mouseIgnoreJob = Debouncer.debounce(
            POINTERSTATE.mouse.mouseIgnoreJob
          , timeOut.after(MOUSE_TIMEOUT)
          , unset);
    }

    /**
     * @param {MouseEvent} ev event to test for left mouse button down
     * @return {boolean} has left mouse button down
     */
    function hasLeftMouseButton(ev) {
      let type = ev.type;
      // exit early if the event is not a mouse event
      if (!isMouseEvent(type)) {
        return false;
      }
      // ev.button is not reliable for mousemove (0 is overloaded as both left button and no buttons)
      // instead we use ev.buttons (bitmask of buttons) or fall back to ev.which (deprecated, 0 for no buttons, 1 for left button)
      if (type === 'mousemove') {
        // allow undefined for testing events
        let buttons = ev.buttons === undefined ? 1 : ev.buttons;
        if ((ev instanceof window.MouseEvent) && !MOUSE_HAS_BUTTONS) {
          buttons = MOUSE_WHICH_TO_BUTTONS[ev.which] || 0;
        }
        // buttons is a bitmask, check that the left button bit is set (1)
        return Boolean(buttons & 1);
      } else {
        // allow undefined for testing events
        let button = ev.button === undefined ? 0 : ev.button;
        // ev.button is 0 in mousedown/mouseup/click for left button activation
        return button === 0;
      }
    }

    function isSyntheticClick(ev) {
      if (ev.type === 'click') {
        // ev.detail is 0 for HTMLElement.click in most browsers
        if (ev.detail === 0) {
          return true;
        }
        // in the worst case, check that the x/y position of the click is within
        // the bounding box of the target of the event
        // Thanks IE 10 >:(
        let t = _findOriginalTarget(ev);
        // make sure the target of the event is an element so we can use getBoundingClientRect,
        // if not, just assume it is a synthetic click
        if (!t.nodeType || /** @type {Element} */(t).nodeType !== Node.ELEMENT_NODE) {
          return true;
        }
        let bcr = /** @type {Element} */(t).getBoundingClientRect();
        // use page x/y to account for scrolling
        let x = ev.pageX, y = ev.pageY;
        // ev is a synthetic click if the position is outside the bounding box of the target
        return !((x >= bcr.left && x <= bcr.right) && (y >= bcr.top && y <= bcr.bottom));
      }
      return false;
    }

    let POINTERSTATE = {
      mouse: {
        target: null,
        mouseIgnoreJob: null
      },
      touch: {
        x: 0,
        y: 0,
        id: -1,
        scrollDecided: false
      }
    };

    function firstTouchAction(ev) {
      let ta = 'auto';
      let path = getComposedPath(ev);
      for (let i = 0, n; i < path.length; i++) {
        n = path[i];
        if (n[TOUCH_ACTION]) {
          ta = n[TOUCH_ACTION];
          break;
        }
      }
      return ta;
    }

    function trackDocument(stateObj, movefn, upfn) {
      stateObj.movefn = movefn;
      stateObj.upfn = upfn;
      document.addEventListener('mousemove', movefn);
      document.addEventListener('mouseup', upfn);
    }

    function untrackDocument(stateObj) {
      document.removeEventListener('mousemove', stateObj.movefn);
      document.removeEventListener('mouseup', stateObj.upfn);
      stateObj.movefn = null;
      stateObj.upfn = null;
    }

    // use a document-wide touchend listener to start the ghost-click prevention mechanism
    // Use passive event listeners, if supported, to not affect scrolling performance
    document.addEventListener('touchend', ignoreMouse, SUPPORTS_PASSIVE ? {passive: true} : false);

    /**
     * Returns the composedPath for the given event.
     * @param {Event} event to process
     * @return {!Array<!EventTarget>} Path of the event
     */
    const getComposedPath = window.ShadyDOM && window.ShadyDOM.noPatch ?
      window.ShadyDOM.composedPath :
      (event) => event.composedPath && event.composedPath() || [];

    /** @type {!Object<string, !GestureRecognizer>} */
    const gestures = {};

    /** @type {!Array<!GestureRecognizer>} */
    const recognizers = [];

    /**
     * Finds the element rendered on the screen at the provided coordinates.
     *
     * Similar to `document.elementFromPoint`, but pierces through
     * shadow roots.
     *
     * @param {number} x Horizontal pixel coordinate
     * @param {number} y Vertical pixel coordinate
     * @return {Element} Returns the deepest shadowRoot inclusive element
     * found at the screen position given.
     */
    function deepTargetFind(x, y) {
      let node = document.elementFromPoint(x, y);
      let next = node;
      // this code path is only taken when native ShadowDOM is used
      // if there is a shadowroot, it may have a node at x/y
      // if there is not a shadowroot, exit the loop
      while (next && next.shadowRoot && !window.ShadyDOM) {
        // if there is a node at x/y in the shadowroot, look deeper
        let oldNext = next;
        next = next.shadowRoot.elementFromPoint(x, y);
        // on Safari, elementFromPoint may return the shadowRoot host
        if (oldNext === next) {
          break;
        }
        if (next) {
          node = next;
        }
      }
      return node;
    }

    /**
     * a cheaper check than ev.composedPath()[0];
     *
     * @private
     * @param {Event|Touch} ev Event.
     * @return {EventTarget} Returns the event target.
     */
    function _findOriginalTarget(ev) {
      const path = getComposedPath(/** @type {?Event} */ (ev));
      // It shouldn't be, but sometimes path is empty (window on Safari).
      return path.length > 0 ? path[0] : ev.target;
    }

    /**
     * @private
     * @param {Event} ev Event.
     * @return {void}
     */
    function _handleNative(ev) {
      let handled;
      let type = ev.type;
      let node = ev.currentTarget;
      let gobj = node[GESTURE_KEY];
      if (!gobj) {
        return;
      }
      let gs = gobj[type];
      if (!gs) {
        return;
      }
      if (!ev[HANDLED_OBJ]) {
        ev[HANDLED_OBJ] = {};
        if (type.slice(0, 5) === 'touch') {
          ev = /** @type {TouchEvent} */(ev); // eslint-disable-line no-self-assign
          let t = ev.changedTouches[0];
          if (type === 'touchstart') {
            // only handle the first finger
            if (ev.touches.length === 1) {
              POINTERSTATE.touch.id = t.identifier;
            }
          }
          if (POINTERSTATE.touch.id !== t.identifier) {
            return;
          }
          if (!HAS_NATIVE_TA) {
            if (type === 'touchstart' || type === 'touchmove') {
              _handleTouchAction(ev);
            }
          }
        }
      }
      handled = ev[HANDLED_OBJ];
      // used to ignore synthetic mouse events
      if (handled.skip) {
        return;
      }
      // reset recognizer state
      for (let i = 0, r; i < recognizers.length; i++) {
        r = recognizers[i];
        if (gs[r.name] && !handled[r.name]) {
          if (r.flow && r.flow.start.indexOf(ev.type) > -1 && r.reset) {
            r.reset();
          }
        }
      }
      // enforce gesture recognizer order
      for (let i = 0, r; i < recognizers.length; i++) {
        r = recognizers[i];
        if (gs[r.name] && !handled[r.name]) {
          handled[r.name] = true;
          r[type](ev);
        }
      }
    }

    /**
     * @private
     * @param {TouchEvent} ev Event.
     * @return {void}
     */
    function _handleTouchAction(ev) {
      let t = ev.changedTouches[0];
      let type = ev.type;
      if (type === 'touchstart') {
        POINTERSTATE.touch.x = t.clientX;
        POINTERSTATE.touch.y = t.clientY;
        POINTERSTATE.touch.scrollDecided = false;
      } else if (type === 'touchmove') {
        if (POINTERSTATE.touch.scrollDecided) {
          return;
        }
        POINTERSTATE.touch.scrollDecided = true;
        let ta = firstTouchAction(ev);
        let shouldPrevent = false;
        let dx = Math.abs(POINTERSTATE.touch.x - t.clientX);
        let dy = Math.abs(POINTERSTATE.touch.y - t.clientY);
        if (!ev.cancelable) ; else if (ta === 'none') {
          shouldPrevent = true;
        } else if (ta === 'pan-x') {
          shouldPrevent = dy > dx;
        } else if (ta === 'pan-y') {
          shouldPrevent = dx > dy;
        }
        if (shouldPrevent) {
          ev.preventDefault();
        } else {
          prevent('track');
        }
      }
    }

    /**
     * Adds an event listener to a node for the given gesture type.
     *
     * @param {!EventTarget} node Node to add listener on
     * @param {string} evType Gesture type: `down`, `up`, `track`, or `tap`
     * @param {!function(!Event):void} handler Event listener function to call
     * @return {boolean} Returns true if a gesture event listener was added.
     */
    function addListener(node, evType, handler) {
      if (gestures[evType]) {
        _add(node, evType, handler);
        return true;
      }
      return false;
    }

    /**
     * Removes an event listener from a node for the given gesture type.
     *
     * @param {!EventTarget} node Node to remove listener from
     * @param {string} evType Gesture type: `down`, `up`, `track`, or `tap`
     * @param {!function(!Event):void} handler Event listener function previously passed to
     *  `addListener`.
     * @return {boolean} Returns true if a gesture event listener was removed.
     */
    function removeListener(node, evType, handler) {
      if (gestures[evType]) {
        _remove(node, evType, handler);
        return true;
      }
      return false;
    }

    /**
     * automate the event listeners for the native events
     *
     * @private
     * @param {!EventTarget} node Node on which to add the event.
     * @param {string} evType Event type to add.
     * @param {function(!Event)} handler Event handler function.
     * @return {void}
     */
    function _add(node, evType, handler) {
      let recognizer = gestures[evType];
      let deps = recognizer.deps;
      let name = recognizer.name;
      let gobj = node[GESTURE_KEY];
      if (!gobj) {
        node[GESTURE_KEY] = gobj = {};
      }
      for (let i = 0, dep, gd; i < deps.length; i++) {
        dep = deps[i];
        // don't add mouse handlers on iOS because they cause gray selection overlays
        if (IS_TOUCH_ONLY && isMouseEvent(dep) && dep !== 'click') {
          continue;
        }
        gd = gobj[dep];
        if (!gd) {
          gobj[dep] = gd = {_count: 0};
        }
        if (gd._count === 0) {
          node.addEventListener(dep, _handleNative, PASSIVE_TOUCH(dep));
        }
        gd[name] = (gd[name] || 0) + 1;
        gd._count = (gd._count || 0) + 1;
      }
      node.addEventListener(evType, handler);
      if (recognizer.touchAction) {
        setTouchAction(node, recognizer.touchAction);
      }
    }

    /**
     * automate event listener removal for native events
     *
     * @private
     * @param {!EventTarget} node Node on which to remove the event.
     * @param {string} evType Event type to remove.
     * @param {function(!Event): void} handler Event handler function.
     * @return {void}
     */
    function _remove(node, evType, handler) {
      let recognizer = gestures[evType];
      let deps = recognizer.deps;
      let name = recognizer.name;
      let gobj = node[GESTURE_KEY];
      if (gobj) {
        for (let i = 0, dep, gd; i < deps.length; i++) {
          dep = deps[i];
          gd = gobj[dep];
          if (gd && gd[name]) {
            gd[name] = (gd[name] || 1) - 1;
            gd._count = (gd._count || 1) - 1;
            if (gd._count === 0) {
              node.removeEventListener(dep, _handleNative, PASSIVE_TOUCH(dep));
            }
          }
        }
      }
      node.removeEventListener(evType, handler);
    }

    /**
     * Registers a new gesture event recognizer for adding new custom
     * gesture event types.
     *
     * @param {!GestureRecognizer} recog Gesture recognizer descriptor
     * @return {void}
     */
    function register(recog) {
      recognizers.push(recog);
      for (let i = 0; i < recog.emits.length; i++) {
        gestures[recog.emits[i]] = recog;
      }
    }

    /**
     * @private
     * @param {string} evName Event name.
     * @return {Object} Returns the gesture for the given event name.
     */
    function _findRecognizerByEvent(evName) {
      for (let i = 0, r; i < recognizers.length; i++) {
        r = recognizers[i];
        for (let j = 0, n; j < r.emits.length; j++) {
          n = r.emits[j];
          if (n === evName) {
            return r;
          }
        }
      }
      return null;
    }

    /**
     * Sets scrolling direction on node.
     *
     * This value is checked on first move, thus it should be called prior to
     * adding event listeners.
     *
     * @param {!EventTarget} node Node to set touch action setting on
     * @param {string} value Touch action value
     * @return {void}
     */
    function setTouchAction(node, value) {
      if (HAS_NATIVE_TA && node instanceof HTMLElement) {
        // NOTE: add touchAction async so that events can be added in
        // custom element constructors. Otherwise we run afoul of custom
        // elements restriction against settings attributes (style) in the
        // constructor.
        microTask.run(() => {
          node.style.touchAction = value;
        });
      }
      node[TOUCH_ACTION] = value;
    }

    /**
     * Dispatches an event on the `target` element of `type` with the given
     * `detail`.
     * @private
     * @param {!EventTarget} target The element on which to fire an event.
     * @param {string} type The type of event to fire.
     * @param {!Object=} detail The detail object to populate on the event.
     * @return {void}
     */
    function _fire(target, type, detail) {
      let ev = new Event(type, { bubbles: true, cancelable: true, composed: true });
      ev.detail = detail;
      wrap(/** @type {!Node} */(target)).dispatchEvent(ev);
      // forward `preventDefault` in a clean way
      if (ev.defaultPrevented) {
        let preventer = detail.preventer || detail.sourceEvent;
        if (preventer && preventer.preventDefault) {
          preventer.preventDefault();
        }
      }
    }

    /**
     * Prevents the dispatch and default action of the given event name.
     *
     * @param {string} evName Event name.
     * @return {void}
     */
    function prevent(evName) {
      let recognizer = _findRecognizerByEvent(evName);
      if (recognizer.info) {
        recognizer.info.prevent = true;
      }
    }

    /* eslint-disable valid-jsdoc */

    register({
      name: 'downup',
      deps: ['mousedown', 'touchstart', 'touchend'],
      flow: {
        start: ['mousedown', 'touchstart'],
        end: ['mouseup', 'touchend']
      },
      emits: ['down', 'up'],

      info: {
        movefn: null,
        upfn: null
      },

      /**
       * @this {GestureRecognizer}
       * @return {void}
       */
      reset: function() {
        untrackDocument(this.info);
      },

      /**
       * @this {GestureRecognizer}
       * @param {MouseEvent} e
       * @return {void}
       */
      mousedown: function(e) {
        if (!hasLeftMouseButton(e)) {
          return;
        }
        let t = _findOriginalTarget(e);
        let self = this;
        let movefn = function movefn(e) {
          if (!hasLeftMouseButton(e)) {
            downupFire('up', t, e);
            untrackDocument(self.info);
          }
        };
        let upfn = function upfn(e) {
          if (hasLeftMouseButton(e)) {
            downupFire('up', t, e);
          }
          untrackDocument(self.info);
        };
        trackDocument(this.info, movefn, upfn);
        downupFire('down', t, e);
      },
      /**
       * @this {GestureRecognizer}
       * @param {TouchEvent} e
       * @return {void}
       */
      touchstart: function(e) {
        downupFire('down', _findOriginalTarget(e), e.changedTouches[0], e);
      },
      /**
       * @this {GestureRecognizer}
       * @param {TouchEvent} e
       * @return {void}
       */
      touchend: function(e) {
        downupFire('up', _findOriginalTarget(e), e.changedTouches[0], e);
      }
    });

    /**
     * @param {string} type
     * @param {EventTarget} target
     * @param {Event|Touch} event
     * @param {Event=} preventer
     * @return {void}
     */
    function downupFire(type, target, event, preventer) {
      if (!target) {
        return;
      }
      _fire(target, type, {
        x: event.clientX,
        y: event.clientY,
        sourceEvent: event,
        preventer: preventer,
        prevent: function(e) {
          return prevent(e);
        }
      });
    }

    register({
      name: 'track',
      touchAction: 'none',
      deps: ['mousedown', 'touchstart', 'touchmove', 'touchend'],
      flow: {
        start: ['mousedown', 'touchstart'],
        end: ['mouseup', 'touchend']
      },
      emits: ['track'],

      info: {
        x: 0,
        y: 0,
        state: 'start',
        started: false,
        moves: [],
        /** @this {GestureInfo} */
        addMove: function(move) {
          if (this.moves.length > TRACK_LENGTH) {
            this.moves.shift();
          }
          this.moves.push(move);
        },
        movefn: null,
        upfn: null,
        prevent: false
      },

      /**
       * @this {GestureRecognizer}
       * @return {void}
       */
      reset: function() {
        this.info.state = 'start';
        this.info.started = false;
        this.info.moves = [];
        this.info.x = 0;
        this.info.y = 0;
        this.info.prevent = false;
        untrackDocument(this.info);
      },

      /**
       * @this {GestureRecognizer}
       * @param {MouseEvent} e
       * @return {void}
       */
      mousedown: function(e) {
        if (!hasLeftMouseButton(e)) {
          return;
        }
        let t = _findOriginalTarget(e);
        let self = this;
        let movefn = function movefn(e) {
          let x = e.clientX, y = e.clientY;
          if (trackHasMovedEnough(self.info, x, y)) {
            // first move is 'start', subsequent moves are 'move', mouseup is 'end'
            self.info.state = self.info.started ? (e.type === 'mouseup' ? 'end' : 'track') : 'start';
            if (self.info.state === 'start') {
              // if and only if tracking, always prevent tap
              prevent('tap');
            }
            self.info.addMove({x: x, y: y});
            if (!hasLeftMouseButton(e)) {
              // always fire "end"
              self.info.state = 'end';
              untrackDocument(self.info);
            }
            if (t) {
              trackFire(self.info, t, e);
            }
            self.info.started = true;
          }
        };
        let upfn = function upfn(e) {
          if (self.info.started) {
            movefn(e);
          }

          // remove the temporary listeners
          untrackDocument(self.info);
        };
        // add temporary document listeners as mouse retargets
        trackDocument(this.info, movefn, upfn);
        this.info.x = e.clientX;
        this.info.y = e.clientY;
      },
      /**
       * @this {GestureRecognizer}
       * @param {TouchEvent} e
       * @return {void}
       */
      touchstart: function(e) {
        let ct = e.changedTouches[0];
        this.info.x = ct.clientX;
        this.info.y = ct.clientY;
      },
      /**
       * @this {GestureRecognizer}
       * @param {TouchEvent} e
       * @return {void}
       */
      touchmove: function(e) {
        let t = _findOriginalTarget(e);
        let ct = e.changedTouches[0];
        let x = ct.clientX, y = ct.clientY;
        if (trackHasMovedEnough(this.info, x, y)) {
          if (this.info.state === 'start') {
            // if and only if tracking, always prevent tap
            prevent('tap');
          }
          this.info.addMove({x: x, y: y});
          trackFire(this.info, t, ct);
          this.info.state = 'track';
          this.info.started = true;
        }
      },
      /**
       * @this {GestureRecognizer}
       * @param {TouchEvent} e
       * @return {void}
       */
      touchend: function(e) {
        let t = _findOriginalTarget(e);
        let ct = e.changedTouches[0];
        // only trackend if track was started and not aborted
        if (this.info.started) {
          // reset started state on up
          this.info.state = 'end';
          this.info.addMove({x: ct.clientX, y: ct.clientY});
          trackFire(this.info, t, ct);
        }
      }
    });

    /**
     * @param {!GestureInfo} info
     * @param {number} x
     * @param {number} y
     * @return {boolean}
     */
    function trackHasMovedEnough(info, x, y) {
      if (info.prevent) {
        return false;
      }
      if (info.started) {
        return true;
      }
      let dx = Math.abs(info.x - x);
      let dy = Math.abs(info.y - y);
      return (dx >= TRACK_DISTANCE || dy >= TRACK_DISTANCE);
    }

    /**
     * @param {!GestureInfo} info
     * @param {?EventTarget} target
     * @param {Touch} touch
     * @return {void}
     */
    function trackFire(info, target, touch) {
      if (!target) {
        return;
      }
      let secondlast = info.moves[info.moves.length - 2];
      let lastmove = info.moves[info.moves.length - 1];
      let dx = lastmove.x - info.x;
      let dy = lastmove.y - info.y;
      let ddx, ddy = 0;
      if (secondlast) {
        ddx = lastmove.x - secondlast.x;
        ddy = lastmove.y - secondlast.y;
      }
      _fire(target, 'track', {
        state: info.state,
        x: touch.clientX,
        y: touch.clientY,
        dx: dx,
        dy: dy,
        ddx: ddx,
        ddy: ddy,
        sourceEvent: touch,
        hover: function() {
          return deepTargetFind(touch.clientX, touch.clientY);
        }
      });
    }

    register({
      name: 'tap',
      deps: ['mousedown', 'click', 'touchstart', 'touchend'],
      flow: {
        start: ['mousedown', 'touchstart'],
        end: ['click', 'touchend']
      },
      emits: ['tap'],
      info: {
        x: NaN,
        y: NaN,
        prevent: false
      },
      /**
       * @this {GestureRecognizer}
       * @return {void}
       */
      reset: function() {
        this.info.x = NaN;
        this.info.y = NaN;
        this.info.prevent = false;
      },
      /**
       * @this {GestureRecognizer}
       * @param {MouseEvent} e
       * @return {void}
       */
      mousedown: function(e) {
        if (hasLeftMouseButton(e)) {
          this.info.x = e.clientX;
          this.info.y = e.clientY;
        }
      },
      /**
       * @this {GestureRecognizer}
       * @param {MouseEvent} e
       * @return {void}
       */
      click: function(e) {
        if (hasLeftMouseButton(e)) {
          trackForward(this.info, e);
        }
      },
      /**
       * @this {GestureRecognizer}
       * @param {TouchEvent} e
       * @return {void}
       */
      touchstart: function(e) {
        const touch = e.changedTouches[0];
        this.info.x = touch.clientX;
        this.info.y = touch.clientY;
      },
      /**
       * @this {GestureRecognizer}
       * @param {TouchEvent} e
       * @return {void}
       */
      touchend: function(e) {
        trackForward(this.info, e.changedTouches[0], e);
      }
    });

    /**
     * @param {!GestureInfo} info
     * @param {Event | Touch} e
     * @param {Event=} preventer
     * @return {void}
     */
    function trackForward(info, e, preventer) {
      let dx = Math.abs(e.clientX - info.x);
      let dy = Math.abs(e.clientY - info.y);
      // find original target from `preventer` for TouchEvents, or `e` for MouseEvents
      let t = _findOriginalTarget((preventer || e));
      if (!t || (canBeDisabled[/** @type {!HTMLElement} */(t).localName] && t.hasAttribute('disabled'))) {
        return;
      }
      // dx,dy can be NaN if `click` has been simulated and there was no `down` for `start`
      if (isNaN(dx) || isNaN(dy) || (dx <= TAP_DISTANCE && dy <= TAP_DISTANCE) || isSyntheticClick(e)) {
        // prevent taps from being generated if an event has canceled them
        if (!info.prevent) {
          _fire(t, 'tap', {
            x: e.clientX,
            y: e.clientY,
            sourceEvent: e,
            preventer: preventer
          });
        }
      }
    }

    var __decorate$h = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$g = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let SosoButton = class SosoButton extends LitElement {
        constructor() {
            super(...arguments);
            this.outlined = false;
            this.solid = false;
            this.disabled = false;
        }
        static get styles() {
            return css `
    :host {
      display: inline-block;
      font-size: 14px;
      text-transform: uppercase;
    }
    button {
      cursor: pointer;
      outline: none;
      border-radius: 4px;
      overflow: hidden;
      color: inherit;
      user-select: none;
      position: relative;
      font-family: inherit;
      text-align: center;
      font-size: inherit;
      letter-spacing: 1.25px;
      padding: 1px 8px;
      min-height: 36px;
      text-transform: inherit;
      width: 100%;
      box-sizing: border-box;
    }
    button.flat {
      background: none;
      border: none;
    }
    button.outlined {
      background: none;
      border: 2px solid;
      padding: 1px 10px;
    }
    button.solid {
      background: currentColor;
      border: none;
      padding: 1px 10px;
      transition: box-shadow 0.3s ease;
      min-height: 40px;
    }

    button::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: currentColor;
      opacity: 0;
      pointer-events: none;
    }
    button:focus::before {
      opacity: 0.1;
    }
    button.solid::before {
      display: none;
    }
    button.solid:focus {
      box-shadow: 0 6px 10px 0 rgba(0, 0, 0, 0.14), 0 1px 18px 0 rgba(0, 0, 0, 0.12), 0 3px 5px -1px rgba(0, 0, 0, 0.4);
    }
    
    button.solid span {
      color: var(--soso-button-text-color, white);
    }
    button span {
      display: inline-block;
      transition: transform 0.2s ease;
    }
    button:active span {
      transform: scale(1.02);
    }

    button:disabled {
      opacity: 0.8;
      color: var(--soso-disabled-color, #808080);
      cursor: initial;
      pointer-events: none;
    }
    button:disabled::before {
      opacity: 0.2;
    }

    @media (hover: hover) {
      button:hover::before {
        opacity: 0.05;
      }
      button.solid:hover {
        box-shadow: 0 3px 4px 0 rgba(0, 0, 0, 0.14), 0 1px 8px 0 rgba(0, 0, 0, 0.12), 0 3px 3px -2px rgba(0, 0, 0, 0.4);
      }
      button:focus::before {
        opacity: 0.1;
      }
      button.solid:focus {
        box-shadow: 0 6px 10px 0 rgba(0, 0, 0, 0.14), 0 1px 18px 0 rgba(0, 0, 0, 0.12), 0 3px 5px -1px rgba(0, 0, 0, 0.4);
      }
    }
    `;
        }
        render() {
            const buttonClass = this.solid ? 'solid' : (this.outlined ? 'outlined' : 'flat');
            return html `
    <button class="${buttonClass}" ?disabled="${this.disabled}">
      <span>
        <slot></slot>
      </span>
    </button>`;
        }
        updated(changed) {
            if (changed.has('disabled')) {
                this.style.pointerEvents = this.disabled ? 'none' : null;
            }
        }
    };
    __decorate$h([
        property({ type: Boolean }),
        __metadata$g("design:type", Object)
    ], SosoButton.prototype, "outlined", void 0);
    __decorate$h([
        property({ type: Boolean }),
        __metadata$g("design:type", Object)
    ], SosoButton.prototype, "solid", void 0);
    __decorate$h([
        property({ type: Boolean }),
        __metadata$g("design:type", Object)
    ], SosoButton.prototype, "disabled", void 0);
    SosoButton = __decorate$h([
        customElement('soso-button')
    ], SosoButton);

    var __decorate$i = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$h = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    const BIG_CSIZE = { x: 400, y: 500 };
    const SMALL_CSIZE = { x: 200, y: 250 };
    const HSIZE = 30;
    const VARIANCE = 0.8;
    const GOLDEN_RATIO = 0.618033988749895;
    const STORAGE_KEY = 'slick-mute-hearts';
    const WIDGET = 'heartbeat';
    let SlickHeartbeat = class SlickHeartbeat extends GuildElement {
        constructor() {
            super();
            this.count = 0;
            this.visitors = 0;
            this.voted = false;
            this.icon = 'heart';
            this.heartsMuted = false;
            this.favsEnabled = false;
            this.location = '';
            this.disableAnimation = false;
            this.animating = false;
            this.hearts = new Set();
            this.hue = Math.random();
            this.downListener = this.onDown.bind(this);
            this.upListener = this.onUp.bind(this);
            this.hearting = false;
            this.heartCount = 0;
            this.colorMap = new Map();
            this.locationShownSet = new Set();
            this.heartingTimer = 0;
            this.heartDownTimer = 0;
            this.pendingCount = 0;
            this.iconsOpenPanelTimer = 0;
            this.bigCanvas = this.useBigCanvas();
        }
        render() {
            const CSIZE = this.bigCanvas ? BIG_CSIZE : SMALL_CSIZE;
            const canvasStyle = `width: ${CSIZE.x}px; height: ${CSIZE.y}px;`;
            return html `
    ${flexStyles}
    <style>
      :host {
        display: block;
        position: fixed;
        bottom: var(--slick-heartbeat-bottom, 16px);
        right: var(--slick-heartbeat-right, 0px);
        pointer-events: none;
        z-index: var(--slick-heartbeat-zindex, 100002);
        padding: 0 5px 17px 0;
        -moz-user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        -ms-user-select: none;
        user-select: none;
      }
      #canvas {
        position: absolute;
        right: 0;
        bottom: 17px;
        overflow: hidden;
      }
      x-icon.heart {
        height: 30px;
        width: 30px;
        position: absolute;
        margin-left: -15px;
        top: 0;
        left: 0;
        opacity: 0;
      }
      x-fab {
        color: var(--slick-heartbeat-color, #2196f3);
        --slick-fab-icon-size: 30px;
        padding: 7px;
        margin-right: 5px;
        box-shadow: none;
        background: none;
        background: var(--slick-heartbeat-background, rgba(255,255,255,0.9));
        cursor: pointer;
        -moz-user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
        -webkit-touch-callout: none;
        user-select: none;
      }
      #moreIcon {
        color: var(--slick-heartbeat-color, #2196f3);
        padding: 10px 0;
        transform: translateX(7px);
        cursor: pointer;
        display: none;
      }
      label {
        display: inline-block;
        line-height: 1;
        background: var(--slick-heartbeat-background, rgba(255,255,255,0.9));
        padding: 2px;
        border-radius: 2px;
        color: var(--slick-heartbeat-color, #2196f3);
        letter-spacing: 0.05em;
        font-family: sans-serif;
        position: absolute;
        right: 10px;
        width: 40px;
        text-align: center;
        -moz-user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        -ms-user-select: none;
        user-select: none;
      }
      .favoriteCount {
        font-size: 13px;
        height: 13px;
        bottom: 0;
      }
      .visitorCount {
        font-size: 10px;
        height: 10px;
        bottom: -14px;
      }
      #iconsPanel {
        line-height: 1;
        text-align: center;
        position: relative;
        pointer-events: auto;
      }
      #heartFab {
        pointer-events: auto;
      }
      .desktopHover {
        position: absolute;
        top: 0;
        right: 100%;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.5s ease;
      }
      #iconsPanel:hover .desktopHover {
        opacity: 1;
        pointer-events: auto;
      }
      #iconsPanel.open .desktopHover {
        opacity: 1;
        pointer-events: auto;
      }
      .transparent {
        opacity: 0;
      }
      .fillContainer {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }
      #muteLabel {
        position: absolute;
        bottom: 100%;
        right: 0;
        white-space: nowrap;
        margin-bottom: 5px;
        background: rgba(0,0,0,0.7);
        color: white;
        font-size: 13px;
        font-weight: 300;
        font-family: sans-serif;
        padding: 5px;
        border-radius: 3px;
        pointer-events: none;
        transition: opacity 0.3s ease;
        letter-spacing: 1.15px;
        opacity: 0;
      }
      .hidden {
        display: none !important;
      }
      soso-button {
        background: var(--slick-heartbeat-background, rgba(255,255,255,0.9));
        text-transform: lowercase;
        color: var(--slick-heartbeat-color, #2196f3);
        border-radius: 4px;
        white-space: nowrap;
        margin-right: 6px;
        transform: translate3d(0,0,0);
      }
      .fabPopup {
        position: absolute;
        white-space: nowrap;
        top: 100%;
        right: 0;
        color: white;
        margin: 4px 8px 0;
        padding: 6px 8px;
        font-size: 11px;
        text-transform: uppercase;
        background: rgba(0,0,0,0.8);
        border-radius: 2px;
        box-shadow: 0 3px 1px -2px rgba(0,0,0,.2), 0 2px 2px 0 rgba(0,0,0,.14), 0 1px 5px 0 rgba(0,0,0,.12);
        line-height: 1;
        font-family: system-ui, sans-serif;
        transform: translate3d(30px,-37px,0) scale(0.1);
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
        will-change: transform;
      }
      .fabPopup.showing {
        opacity: 1;
        transform: translate3d(0,0,0) scale(1);
      }
      .fabPopup::after {
        content: "";
        position: absolute;
        bottom: 100%;
        left: 100%;
        transform: translateX(-175%);
        border: 8px solid rgba(0,0,0,0.8);
        border-left-color: transparent;
        border-right-color: transparent;
        border-top-color: transparent;
        border-bottom-color: rgba(0,0,0,0.8);
        width: 0;
        height: 0;
        margin: 0 auto;
      }
      #locationPopup {
        z-index: 1;
        display: var(--slick-location-popup-display, block);
      }

      @media (max-width: 600px) {
        #moreIcon {
          display: flex;
        }
        #iconsPanel {
          background: var(--slick-heartbeat-background, rgba(255,255,255,0.9));
          border-radius: 5px;
        }
        #iconsPanel:hover .desktopHover {
          pointer-events: none;
          opacity: 0;
        }
        #heartFab {
          background: none;
        }
        #iconsPanel.open #moreIcon {
          display: none;
        }
        #iconsPanel.open:hover .desktopHover {
          opacity: 1;
          pointer-events: auto;
        }
      }
      
    </style>
    <div id="canvas" style="${canvasStyle}"></div>
    <div id="iconsPanel" class="horizontal layout center">
      <div class="desktopHover horizontal layout center">
        <soso-button @click="${this.toggleMute}">${this.heartsMuted ? core.phrase('unmute') : core.phrase('mute')}</soso-button>
        <x-fab icon="search" @click="${this.openSearch}"></x-fab>
        <div style="position: relative;" class="${this.favsEnabled ? '' : 'hidden'}">
          <x-fab icon="list" @click="${this.openList}"></x-fab>
          <div id="favPopup" class="fabPopup">${core.phrase('favorite-added')}</div>
        </div>
      </div>
      <x-icon id="moreIcon" icon="more-vert" @click="${this.onMoreClick}"></x-icon>
      <div style="position: relative;">
        <x-fab id="heartFab" .icon="${this.icon}${(this.voted && (!this.heartsMuted)) ? '' : '-outline'}"></x-fab>
        <div class="fillContainer${this.heartsMuted ? '' : ' hidden'}">
          <svg>
            <line x1="8" y1="8" x2="34" y2="34" style="stroke: var(--slick-heartbeat-color, #2196f3); stroke-width: 2px;"></line>
          </svg>
        </div>
        <div id="locationPopup" class="fabPopup">${this.location}</div>
      </div>
    </div>
    <label class="favoriteCount ${this.count > 0 ? '' : 'transparent'}">${this.countString(this.count)}</label></div>
    <label class="visitorCount ${this.visitors > 1 ? '' : 'transparent'}">${this.visitors}</label></div>
    `;
        }
        firstUpdated() {
            const props = store.get(STORAGE_KEY, true);
            if (props) {
                this.heartsMuted = !!(props.muted);
            }
            this.attachTouchListeners();
            bus.subscribe('notification-hearts-added', (_, data) => {
                const d = data && data.payload;
                if (d && d.addedHeartsByReader && (!this.heartsMuted)) {
                    for (const key in d.addedHeartsByReader) {
                        const count = Math.min(5, d.addedHeartsByReader[key]);
                        this.addHearts(count, key);
                        if (count) {
                            this.showLocation(key, d.location);
                        }
                    }
                }
                this.updateCount(d.totalFavorites, true);
            });
            bus.subscribe('session-updated', (_, data) => {
                const cp = data.currentPage;
                if (cp) {
                    this.updateCount(cp.totalFavorites);
                    this.voted = cp.isFavorite || false;
                    if (data.isSuperAdmin) {
                        this.visitors = data.activeVisitors;
                    }
                }
            });
            bus.subscribe('notification-visitor-arrived', (_, data) => {
                const payload = data && data.payload;
                if (payload && payload.activeVisitors) {
                    if (core.session && core.session.isSuperAdmin) {
                        this.visitors = payload.activeVisitors;
                    }
                }
            });
            bus.subscribe('notification-visitor-departed', (_, data) => {
                const payload = data && data.payload;
                if (payload && payload.activeVisitors) {
                    if (core.session && core.session.isSuperAdmin) {
                        this.visitors = payload.activeVisitors;
                    }
                }
            });
            window.addEventListener('resize', () => {
                this.bigCanvas = this.useBigCanvas();
            });
            this.refresh();
            core.widgetAction(WIDGET, 'impression', 0);
        }
        useBigCanvas() {
            return (window.innerWidth > 750 && window.innerHeight > 750);
        }
        async refresh() {
            const ss = core.session;
            if (ss && ss.currentPage) {
                this.updateCount(ss.currentPage.totalFavorites);
                this.visitors = ss.isSuperAdmin ? ss.activeVisitors : 0;
                this.voted = ss.currentPage.isFavorite || false;
                this.favsEnabled = ss.enableFavorites;
            }
        }
        updateCount(value, enhance) {
            const newCount = value || 0;
            if (newCount !== this.count) {
                if (enhance) {
                    const pending = this.pendingCount > 0;
                    this.pendingCount = newCount;
                    if (!pending) {
                        setTimeout(() => {
                            this.count = this.pendingCount > 0 ? this.pendingCount : this.count;
                            this.pendingCount = 0;
                        }, 1500);
                    }
                }
                else {
                    this.count = newCount;
                }
            }
        }
        attachTouchListeners() {
            this.detachTouchListeners();
            if (this.fab) {
                addListener(this.fab, 'down', this.downListener);
                addListener(this.fab, 'up', this.upListener);
            }
        }
        detachTouchListeners() {
            if (this.fab) {
                removeListener(this.fab, 'down', this.downListener);
                removeListener(this.fab, 'up', this.upListener);
            }
        }
        clearHeartDownTimer() {
            if (this.heartDownTimer) {
                window.clearTimeout(this.heartDownTimer);
                this.heartingTimer = 0;
            }
        }
        onDown() {
            if (!this.hearting) {
                this.clearHeartDownTimer();
                this.fab.style.background = 'transparent';
                this.iconsPanel.style.background = 'transparent';
                this.hearting = true;
                this.addLocalHeart();
                this.nextHeartTick();
                this.heartDownTimer = window.setTimeout(() => {
                    if (this.hearting) {
                        this.hearting = false;
                    }
                    this.heartingTimer = 0;
                }, 10000);
            }
        }
        onUp() {
            this.clearHeartDownTimer();
            this.hearting = false;
            this.notifyHearts();
            if (this.heartingTimer) {
                window.clearTimeout(this.heartingTimer);
            }
            this.heartingTimer = window.setTimeout(() => {
                if (!this.hearting) {
                    this.fab.style.background = null;
                    this.iconsPanel.style.background = null;
                }
                this.heartingTimer = 0;
            }, 2000);
        }
        notifyHearts() {
            if (this.heartCount) {
                core.addHearts(this.heartCount);
                this.heartCount = 0;
            }
        }
        heartTick() {
            if (this.hearting) {
                this.addLocalHeart();
                this.nextHeartTick();
            }
        }
        nextHeartTick() {
            window.setTimeout(() => this.heartTick(), 250);
        }
        addLocalHeart() {
            if (this.heartsMuted) {
                this.toggleMute();
                return;
            }
            this.heartCount++;
            this.addHeart();
            if (!this.voted) {
                this.voted = true;
                this.updateCount(this.count + 1);
                if (this.favPopup) {
                    this.favPopup.classList.add('showing');
                    setTimeout(() => {
                        this.favPopup.classList.remove('showing');
                    }, 4500);
                }
            }
            if (this.heartCount > 3) {
                this.notifyHearts();
            }
            this.showIconsForAwhile();
        }
        heartColor(user) {
            if (user) {
                if (!this.colorMap.has(user)) {
                    this.colorMap.set(user, this.createNewColor());
                }
                return this.colorMap.get(user);
            }
            return 'var(--slick-heartbeat-color, #2196f3)';
        }
        showLocation(user, location) {
            if (this.locationPopup && location && user) {
                if (!this.locationShownSet.has(user)) {
                    this.location = location;
                    this.locationPopup.classList.add('showing');
                    setTimeout(() => {
                        this.hideLocation();
                    }, 3000);
                    this.locationShownSet.add(user);
                }
            }
        }
        hideLocation() {
            if (this.locationPopup) {
                this.locationPopup.classList.remove('showing');
            }
        }
        createNewColor() {
            this.hue += GOLDEN_RATIO;
            this.hue %= 1;
            return `hsl(${Math.floor(this.hue * 360)}, 50%, 60%)`;
        }
        countString(count) {
            if (count <= 0) {
                return '';
            }
            else if (count >= 1000000) {
                return `${(count / 1000000).toFixed(1)}M`;
            }
            else if (count >= 10000) {
                return `${(count / 1000).toFixed(1)}k`;
            }
            else {
                return count.toLocaleString();
            }
        }
        async addHearts(count, user) {
            if (!this.disableAnimation) {
                for (let i = 0; i < count; i++) {
                    await delay(250 + Math.round(Math.random() * 250));
                    this.addHeart(user);
                }
            }
        }
        addHeart(user) {
            // do not render heart if tab not visible or 
            // there are already too many hearts on the screen
            // Do not throttle hearts created by the current user.
            if (this.disableAnimation || document.hidden || (user && this.hearts.size >= 30)) {
                return;
            }
            const CSIZE = this.bigCanvas ? BIG_CSIZE : SMALL_CSIZE;
            const ep = { x: Math.round(((1 - VARIANCE) / 2 + Math.random() * VARIANCE) * CSIZE.x), y: 0 };
            const p1 = { x: Math.round((0.8 - VARIANCE / 4 + Math.random() * VARIANCE / 2) * CSIZE.x), y: Math.round((0.5 + (Math.random() * 0.2)) * (CSIZE.y - HSIZE)) };
            const p2 = { x: Math.round((0.25 - VARIANCE / 4 + Math.random() * VARIANCE / 2) * CSIZE.x), y: Math.round((0.2 + (Math.random() * 0.2)) * (CSIZE.y - HSIZE)) };
            const sp = { x: CSIZE.x - 32, y: CSIZE.y - HSIZE - 7 };
            const swap = Math.random() > 0.75;
            const curve = new Bezier(sp.x, sp.y, swap ? p2.x : p1.x, p1.y, swap ? p1.x : p2.x, p2.y, ep.x, ep.y);
            const node = new XIcon();
            node.classList.add('heart');
            node.icon = this.icon;
            node.style.color = this.heartColor(user);
            const h = {
                node,
                points: curve.getLUT(10),
                duration: Math.round((Math.random() * (this.bigCanvas ? 4 : 2) + (this.bigCanvas ? 0.75 : 0.5)) * 1000)
            };
            this.canvas.appendChild(h.node);
            this.hearts.add(h);
            this.animateHearts();
        }
        animateHearts() {
            if (this.animating) {
                return;
            }
            this.animating = true;
            window.requestAnimationFrame(this.tick.bind(this));
        }
        tick(timestamp) {
            if (!this.animating) {
                return;
            }
            const toRemove = [];
            for (const h of this.hearts) {
                if (!h.start) {
                    h.start = timestamp;
                }
                const pct = Math.min(1, (timestamp - h.start) / h.duration);
                // update position
                const current = Math.max(0, Math.ceil(pct * (h.points.length - 1)) - 1);
                const src = h.points[current];
                const dst = h.points[current + 1];
                const ep = (pct * 9) - Math.floor(pct * 9);
                const x = src.x + (dst.x - src.x) * ep;
                const y = src.y + (dst.y - src.y) * ep;
                h.node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                // update opacity
                let opacity = 1;
                if (pct > 0.6) {
                    opacity = 2.5 * (1 - pct);
                }
                h.node.style.opacity = `${opacity.toFixed(2)}`;
                // check if processed
                if (pct === 1) {
                    toRemove.push(h);
                }
            }
            toRemove.forEach((h) => {
                if (h.node.parentElement) {
                    h.node.parentElement.removeChild(h.node);
                }
                this.hearts.delete(h);
            });
            if (this.hearts.size === 0) {
                this.animating = false;
            }
            else {
                window.requestAnimationFrame(this.tick.bind(this));
            }
        }
        onMoreClick() {
            this.showIconsForAwhile();
        }
        showIconsForAwhile() {
            if (this.iconsPanel) {
                if (this.iconsOpenPanelTimer) {
                    window.clearTimeout(this.iconsOpenPanelTimer);
                    this.iconsOpenPanelTimer = 0;
                }
                this.iconsPanel.classList.add('open');
                this.iconsOpenPanelTimer = window.setTimeout(() => {
                    this.iconsPanel.classList.remove('open');
                }, 5000);
            }
        }
        openSearch() {
            core.widgetAction(WIDGET, 'open-search', 0);
            this.openDiscovery('search');
        }
        openList() {
            core.widgetAction(WIDGET, 'open-favorites', 0);
            this.openDiscovery('favorites');
        }
        openDiscovery(page) {
            this.dispatchEvent(SlickCustomEvent('slick-show-discovery', { page }));
        }
        toggleMute() {
            this.heartsMuted = !this.heartsMuted;
            const props = {
                muted: this.heartsMuted
            };
            store.set(STORAGE_KEY, props);
            this.showIconsForAwhile();
            core.widgetAction(WIDGET, this.heartsMuted ? 'mute' : 'unmute', 0);
        }
    };
    __decorate$i([
        property(),
        __metadata$h("design:type", Object)
    ], SlickHeartbeat.prototype, "count", void 0);
    __decorate$i([
        property(),
        __metadata$h("design:type", Object)
    ], SlickHeartbeat.prototype, "visitors", void 0);
    __decorate$i([
        property(),
        __metadata$h("design:type", Object)
    ], SlickHeartbeat.prototype, "voted", void 0);
    __decorate$i([
        property(),
        __metadata$h("design:type", String)
    ], SlickHeartbeat.prototype, "icon", void 0);
    __decorate$i([
        property(),
        __metadata$h("design:type", Object)
    ], SlickHeartbeat.prototype, "heartsMuted", void 0);
    __decorate$i([
        property(),
        __metadata$h("design:type", Object)
    ], SlickHeartbeat.prototype, "favsEnabled", void 0);
    __decorate$i([
        property(),
        __metadata$h("design:type", Object)
    ], SlickHeartbeat.prototype, "location", void 0);
    __decorate$i([
        property(),
        __metadata$h("design:type", Boolean)
    ], SlickHeartbeat.prototype, "bigCanvas", void 0);
    __decorate$i([
        property(),
        __metadata$h("design:type", Object)
    ], SlickHeartbeat.prototype, "disableAnimation", void 0);
    __decorate$i([
        query('#canvas'),
        __metadata$h("design:type", HTMLDivElement)
    ], SlickHeartbeat.prototype, "canvas", void 0);
    __decorate$i([
        query('#heartFab'),
        __metadata$h("design:type", XFab)
    ], SlickHeartbeat.prototype, "fab", void 0);
    __decorate$i([
        query('#iconsPanel'),
        __metadata$h("design:type", HTMLDivElement)
    ], SlickHeartbeat.prototype, "iconsPanel", void 0);
    __decorate$i([
        query('#favPopup'),
        __metadata$h("design:type", HTMLDivElement)
    ], SlickHeartbeat.prototype, "favPopup", void 0);
    __decorate$i([
        query('#locationPopup'),
        __metadata$h("design:type", HTMLDivElement)
    ], SlickHeartbeat.prototype, "locationPopup", void 0);
    SlickHeartbeat = __decorate$i([
        element('slick-heartbeat'),
        __metadata$h("design:paramtypes", [])
    ], SlickHeartbeat);

    var __decorate$j = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$i = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let FilmStripToolbar = class FilmStripToolbar extends GuildElement {
        constructor() {
            super();
            this.scrollListener = this.onScroll.bind(this);
            this.headerHeight = 125;
            this.prevScrollValue = 0;
            this.barOffset = -1;
            this.pendingBarOffset = false;
            this.siteCode = '';
            this.pageUrl = '';
            this.search = false;
            this.thumbnailSize = { width: 96, height: 64 };
            const userAgent = window.navigator ? window.navigator.userAgent : '';
            this.mobile = (userAgent.toLowerCase().indexOf('mobi') >= 0) && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
        }
        render() {
            const barStyle = this.mobile ? 'padding: 8px 0;' : 'padding: 8px 0 0;';
            return html `
    <style>
      #stripToolbar {
        position: fixed;
        top: 0;
        right: 0;
        left: 0;
        z-index: var(--slick-toolbar-zindex, 100);
        background: var(--slick-toolbar-background, white);
        box-shadow: var(--slick-toolbar-shadow, 0px 5px 6px -3px rgba(0, 0, 0, 0.4));
        transform: var(--film-strip-toolbar-initial-transform,  translate3d(0,-125px,0));
      }
      #stripToolbar.showing {
        top: var(--film-strip-toolbar-top, 0px);
      }
    </style>
    <div id="stripToolbar" style="${barStyle}">
      <nav-film-strip .modeInfo="${this.modeInfo}" .siteCode="${this.siteCode}" .pageUrl="${this.pageUrl}" widgetname="filmstrip-toolbar" .search="${this.search}" .thumbnailSize="${this.thumbnailSize}" compact></nav-film-strip>
    </div>
    `;
        }
        firstUpdated() {
            super.firstUpdated();
            document.addEventListener('scroll', this.scrollListener);
            this.headerHeight = (this.thumbnailSize.height || 64) + 65;
            this.style.setProperty('--film-strip-toolbar-initial-transform', `translate3d(0, ${-this.headerHeight}px, 0)`);
            bus.subscribe('disocvery-open', () => {
                if (this.headerHeight) {
                    this.pendingBarOffset = this.barOffset >= 0 && this.barOffset < 10;
                    this.setOffset(this.headerHeight);
                }
            });
            bus.subscribe('disocvery-close', () => {
                if (this.pendingBarOffset) {
                    this.pendingBarOffset = false;
                    this.setOffset(0);
                }
            });
        }
        disconnectedCallback() {
            super.disconnectedCallback();
            document.removeEventListener('scroll', this.scrollListener);
        }
        get scrollValue() {
            return (window.pageYOffset !== undefined) ? window.pageYOffset : ((document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop);
        }
        onScroll() {
            const st = this.scrollValue;
            if (!this.prevScrollValue) {
                this.prevScrollValue = st;
            }
            else {
                if (st <= this.headerHeight) {
                    this.setOffset(this.headerHeight);
                    return;
                }
                const diff = st - this.prevScrollValue;
                this.prevScrollValue = st;
                if (diff < 0) {
                    this.setOffset(Math.max(0, this.barOffset + diff));
                }
                else {
                    this.setOffset(this.barOffset + diff);
                }
            }
        }
        setOffset(value) {
            const y = Math.max(0, Math.min(this.headerHeight, value));
            if (this.barOffset !== y) {
                if (y < 64) {
                    this.setBodyClass(true);
                    this.$('stripToolbar').classList.add('showing');
                }
                else {
                    this.setBodyClass(false);
                    this.$('stripToolbar').classList.remove('showing');
                }
                this.barOffset = y;
                this.$('stripToolbar').style.transform = `translate3d(0, ${-this.barOffset}px, 0)`;
            }
        }
        setBodyClass(showing) {
            const body = document.body || document.querySelector('body');
            if (body) {
                if (showing) {
                    body.classList.add('slick-filmstrip-toolbar-showing');
                }
                else {
                    body.classList.remove('slick-filmstrip-toolbar-showing');
                }
            }
        }
    };
    __decorate$j([
        property({ type: String }),
        __metadata$i("design:type", String)
    ], FilmStripToolbar.prototype, "siteCode", void 0);
    __decorate$j([
        property({ type: String }),
        __metadata$i("design:type", String)
    ], FilmStripToolbar.prototype, "pageUrl", void 0);
    __decorate$j([
        property({ type: String }),
        __metadata$i("design:type", Object)
    ], FilmStripToolbar.prototype, "modeInfo", void 0);
    __decorate$j([
        property({ type: Boolean }),
        __metadata$i("design:type", Object)
    ], FilmStripToolbar.prototype, "search", void 0);
    __decorate$j([
        property(),
        __metadata$i("design:type", Object)
    ], FilmStripToolbar.prototype, "thumbnailSize", void 0);
    FilmStripToolbar = __decorate$j([
        element('film-strip-toolbar'),
        __metadata$i("design:paramtypes", [])
    ], FilmStripToolbar);

    var __decorate$k = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$j = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let LitHighlighterPopup = class LitHighlighterPopup extends GuildElement {
        constructor() {
            super(...arguments);
            this.popupShowing = false;
            this.pages = [];
            this.href = '';
            this.currentIndex = -1;
            this.mode = 'top';
        }
        render() {
            const current = (this.currentIndex >= 0 && this.currentIndex < this.pages.length) ? this.pages[this.currentIndex] : null;
            const imageStyle = (current && current.image) ? `background-image: url("${current.image}");` : 'display: none;';
            const arrows = this.pages.length > 1 ? true : false;
            this.href = (current && current.url) || '';
            return html `
    <style>
      :host {
        display: block;
        position: fixed;
        top: 10px;
        right: 0;
        z-index: var(--slick-link-popup-zindex, 100);
        background: var(--slick-link-popup-background, white);
        box-shadow: var(--slick-link-popup-shadow, 0px 5px 6px -3px rgba(0, 0, 0, 0.4));
        width: 290px;
        box-sizing: border-box;
        border-radius: 10px 0 0 10px;
        overflow: hidden;
        transform: translate3d(300px,0,0);
        transition: transform 0.3s ease;
        line-height: 1.5;
      }
      .horizontal {
        display: -ms-flexbox;
        display: -webkit-flex;
        display: flex;
        -ms-flex-direction: row;
        -webkit-flex-direction: row;
        flex-direction: row;
        -ms-flex-align: center;
        -webkit-align-items: center;
        align-items: center;
      }
      .flex {
        -ms-flex: 1 1 0.000000001px;
        -webkit-flex: 1;
        flex: 1;
        -webkit-flex-basis: 0.000000001px;
        flex-basis: 0.000000001px;
      }
      #lpImagePanel {
        display: block;
        width: 64px;
        height: 64px;
        background-color: #f0f0f0;
        background-size: cover;
        background-origin: border-box;
        background-position: 50% 50%;
        border:  none;
        text-decoration: none;
        color: inherit;
      }
      .title {
        font-size: 15px;
        line-height: 1.5;
        box-sizing: border-box;
        -moz-user-select: none;
        -ms-user-select: none;
        -webkit-user-select: none;
        user-select: none;
        word-break: break-word;
        letter-spacing: 0.03em;
        font-weight: inherit;
        padding: 5px 8px;
        font-family: var(--slick-link-popup-font, inherit);
        color: var(--slick-link-popup-color, #555555);
        font-weight: 400;
        max-height: 50px;
        overflow: hidden;
      }
      .gutter{
        width: 8px;
        height: 64px;
        background: var(--slick-link-popup-highlight, #FFEB3B);
      }
      .hidden {
        display: none;
      }
      x-icon {
        padding: 10px 3px;
        cursor: pointer;
        color: var(--slick-icon-color, #808080);
      }
      a, a:hover, a:visited {
        text-decoration: none;
        color: inherit;
      }
    </style>
    <div class="horizontal">
      <a href="${this.href}" id="lpImagePanel" style="${imageStyle}" @click="${this.onLinkClick}"></a>
      <x-icon icon="chevron-left" class="${arrows ? '' : 'hidden'}" @click="${() => this.previousCard()}"></x-icon>
      <a href="${this.href}" class="flex title" @click="${this.onLinkClick}">${current ? current.text : ''}</a>
      <x-icon icon="chevron-right" class="${arrows ? '' : 'hidden'}" @click="${() => this.nextCard()}"></x-icon>
      <div class="gutter"></div>
    </div>
    `;
        }
        updated() {
            if (this.currentIndex >= 0) {
                this.showPopup();
            }
            else {
                this.hidePopup();
            }
        }
        onLinkClick(e) {
            e.stopPropagation();
            core.widgetAction('link-highlighter', 'nav', 0, this.href, this.mode);
        }
        showPopup() {
            if (!this.popupShowing) {
                this.style.transform = 'translate3d(0,0,0)';
                this.popupShowing = true;
                core.widgetAction('link-highlighter', 'impression', 0, undefined, this.mode);
            }
        }
        hidePopup() {
            if (this.popupShowing) {
                this.style.removeProperty('transform');
                this.popupShowing = false;
            }
        }
        hasLink(link) {
            return this.pages.some((d) => (d.url === link.url));
        }
        previousCard() {
            let index = this.currentIndex - 1;
            if (index < 0) {
                index = this.pages.length - 1;
            }
            this.currentIndex = index;
        }
        nextCard() {
            let index = this.currentIndex + 1;
            if (index >= this.pages.length) {
                index = this.pages.length ? 0 : -1;
            }
            this.currentIndex = index;
        }
        pushLink(link) {
            if (link && (!this.hasLink(link))) {
                this.pages.push(link);
                this.currentIndex = this.pages.length - 1;
            }
        }
        popLink(url) {
            this.pages = this.pages.filter((d) => (!(d.url === url)));
            if (this.pages.length) {
                this.currentIndex = this.pages.length - 1;
            }
            else {
                this.currentIndex = -1;
            }
            this.requestUpdate();
        }
    };
    __decorate$k([
        property(),
        __metadata$j("design:type", Object)
    ], LitHighlighterPopup.prototype, "currentIndex", void 0);
    __decorate$k([
        property({ type: String }),
        __metadata$j("design:type", Object)
    ], LitHighlighterPopup.prototype, "mode", void 0);
    LitHighlighterPopup = __decorate$k([
        element('link-highlighter-popup')
    ], LitHighlighterPopup);

    var __decorate$l = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$k = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let LinkHighlighter = class LinkHighlighter extends GuildElement {
        constructor() {
            super();
            this.siteCode = '';
            this.pageUrl = '';
            this.linksAttached = false;
            this.anchors = [];
            this.processedLinks = new Map();
            this.scrollListener = this.onScroll.bind(this);
            this.prevScrollValue = 0;
            this.mode = 'middle'; // Math.random() >= 0.5 ? 'top' : 'middle';
        }
        render() {
            return html `
    <style>
      #highlighterPopup {
        transform: translate3d(300px,0,0);
      }
    </style>
    <link-highlighter-popup id="highlighterPopup" .mode="${this.mode}"></link-highlighter-popup>
    `;
        }
        updated() {
            this.attachLinks();
        }
        async attachLinks() {
            if ((!this.linksAttached) && this.siteCode && this.pageUrl) {
                const siteInfo = await core.getSiteInfo();
                const currentPage = core.session.currentPage;
                this.processedLinks.clear();
                if (currentPage && currentPage.links && currentPage.links.length) {
                    currentPage.links.forEach((link) => {
                        if (link.intraSite) {
                            this.processedLinks.set(link.hrefOnPage, {
                                url: link.resolvedUrl,
                                image: link.thumbnailImageUrl || '',
                                text: link.title || link.description || link.resolvedUrl
                            });
                        }
                    });
                }
                const anchors = [];
                const nl = document.querySelectorAll('.post');
                if (nl && nl.length) {
                    for (let i = 0; i < nl.length; i++) {
                        const node = nl[i];
                        if (!node.classList.contains('post-summary')) {
                            const links = this.getLinks(node, siteInfo.site.host);
                            links.forEach((a) => anchors.push(a));
                        }
                    }
                }
                this.anchors = anchors.filter((a) => this.processedLinks.has(a.href));
                this.anchors.forEach((a) => {
                    if (!a._slickAttached) {
                        a.addEventListener('click', (e) => {
                            const alink = e.currentTarget;
                            if (alink && (alink.dataset.slickstate === 'highlighted')) {
                                e.stopPropagation();
                                core.widgetAction('link-highlighter', 'link-nav', 0, alink.href, this.mode);
                            }
                        });
                        a._slickAttached = true;
                    }
                });
                this.linksAttached = true;
            }
        }
        getLinks(node, siteHost) {
            const ret = [];
            const links = node.querySelectorAll('a');
            for (let i = 0; i < links.length; i++) {
                const a = links[i];
                const href = a.href;
                if (href && a.textContent && a.textContent.trim()) {
                    const url = new URL(href, window.location.href);
                    const host = url.host;
                    if (host.indexOf(siteHost.replace('/', '')) >= 0) {
                        ret.push(a);
                    }
                }
            }
            return ret;
        }
        firstUpdated() {
            super.firstUpdated();
            document.addEventListener('scroll', this.scrollListener);
        }
        disconnectedCallback() {
            super.disconnectedCallback();
            document.removeEventListener('scroll', this.scrollListener);
        }
        get scrollValue() {
            return (window.pageYOffset !== undefined) ? window.pageYOffset : ((document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop);
        }
        onScroll() {
            const st = this.scrollValue;
            if (!this.prevScrollValue) {
                this.prevScrollValue = st;
            }
            else {
                const diff = st - this.prevScrollValue;
                this.prevScrollValue = st;
                this.anchors.forEach((a) => {
                    const rect = a.getBoundingClientRect();
                    const pct = (rect.top + rect.height) / (window.innerHeight || 1);
                    const offSreen = (pct < 0) || (pct > 1);
                    const state = a.dataset.slickstate || 'unknown';
                    switch (state) {
                        case 'unknown':
                            if (offSreen) {
                                a.dataset.slickstate = 'activated';
                                a.style.transition = 'background-color 0.3s ease';
                            }
                            else {
                                a.dataset.slickstate = 'unknown';
                            }
                            break;
                        case 'activated': {
                            const highlight = (this.mode === 'top') ? (!offSreen && (pct <= 0.33)) : (pct < 0.66 && pct >= 0.33);
                            if (highlight) {
                                a.dataset.slickstate = 'highlighted';
                                this.highlightLink(a, true);
                                if (diff > 0) {
                                    this.$('highlighterPopup').pushLink(this.processedLinks.get(a.href));
                                }
                            }
                            break;
                        }
                        case 'highlighted':
                            const removeHighlight = (this.mode === 'top') ? ((pct > 0.33) || (pct <= -0.15)) : ((pct >= 0.66) || (pct < 0.33));
                            if (removeHighlight) {
                                a.dataset.slickstate = 'activated';
                                this.highlightLink(a, false);
                                this.$('highlighterPopup').popLink(this.processedLinks.get(a.href).url);
                            }
                            break;
                    }
                });
            }
        }
        highlightLink(a, highlighted) {
            if (highlighted) {
                a.classList.add('slick-link-highlighted');
                a.style.backgroundColor = 'var(--slick-link-popup-highlight, #FFEB3B)';
            }
            else {
                a.classList.remove('slick-link-highlighted');
                a.style.removeProperty('background-color');
            }
        }
    };
    __decorate$l([
        property({ type: String }),
        __metadata$k("design:type", String)
    ], LinkHighlighter.prototype, "siteCode", void 0);
    __decorate$l([
        property({ type: String }),
        __metadata$k("design:type", String)
    ], LinkHighlighter.prototype, "pageUrl", void 0);
    LinkHighlighter = __decorate$l([
        element('link-highlighter'),
        __metadata$k("design:paramtypes", [])
    ], LinkHighlighter);

    var __decorate$m = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$l = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let SlickCarouselCard = class SlickCarouselCard extends GuildElement {
        render() {
            const currentImageStyle = this.data ? `background-image: url(${this.getThumbnail(this.data)})` : '';
            return html `
    ${flexStyles}
    <style>
      :host {
        pointer-events: none;
      }
      .card {
        background: white;
        max-width: 512px;
        min-height: 88px;
        margin: 0 auto;
        box-sizing: border-box;
        overflow: hidden;
        border-radius: 5px;
        box-shadow: 0 19px 38px rgba(0, 0, 0, 0.3), 0 15px 12px rgba(0, 0, 0, 0.2);
        font-size: 15px;
        font-family: inherit;
        font-weight: 400;
        line-height: 1.5;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        cursor: pointer;
        pointer-events: auto;
      }
      .card .cell {
        width: 50%;
        box-sizing: border-box;
      }
      .cellText {
        padding: 10px;
      }
      .imageCell {
        background-size: cover;
        background-origin: border-box;
        background-position: 50% 50%;
        position: relative;
      }
      .description {
        color: #555;
        font-size: 13px;
        margin-top: 5px;
      }
      svg {
        display: block;
        max-width: 100%;
        max-height: 100%;
        box-sizing: border-box;
        overflow: hidden;
        position: absolute;
        top: 0;
        left: -2px;
        height: 100%;
        width: 40px;
      }

      @media (max-width: 500px) {
        .description {
          display: none;
        }
      }
    </style>
    <div class="card horizontal layout">
      <div class="cell">
        <div class="cellText">
          <div class="name">${(this.data && this.data.title) || ''}</div>
          <div class="description">${(this.data && this.data.description) || ''}</div>
        </div>
      </div>
      <div class="cell imageCell" style="${currentImageStyle}">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon fill="#ffffff" points="0,0 100,0 20,100 0,100"></polygon>
        </svg>
      </div>
    </div>
    `;
        }
        getThumbnail(page) {
            return core.thumbnailUrl(page, 256) || '';
        }
    };
    __decorate$m([
        property(),
        __metadata$l("design:type", Object)
    ], SlickCarouselCard.prototype, "data", void 0);
    SlickCarouselCard = __decorate$m([
        element('slick-carousel-card')
    ], SlickCarouselCard);

    var __decorate$n = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$m = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let SlickCarousel = class SlickCarousel extends GuildElement {
        constructor() {
            super(...arguments);
            this.siteCode = '';
            this.pageUrl = '';
            this.showing = [];
            this.current = 0;
            this.label = 'Next up...';
            this.widgetName = 'nextup';
            this.pages = [];
            this.cursor = 0;
            this.animating = false;
            this.animationStart = 0;
            this.animateForward = true;
            this.animationDuration = 400;
            this.tracking = false;
            this.intersectionObserverAttached = false;
            this.intersectionNotified = false;
            this.indexMap = new Map();
            this.intersectionHandler = (entries) => {
                const entry = entries[0];
                if ((!this.intersectionNotified) && entry && entry.isIntersecting) {
                    if (entry.intersectionRatio >= 0.5) {
                        core.widgetAction(this.widgetName, 'impression', 0);
                        this.intersectionNotified = true;
                    }
                }
            };
        }
        render() {
            const imageStyles = ['', ''];
            if (this.showing[0]) {
                imageStyles[0] = `background-image: url(${this.getThumbnail(this.showing[0])})`;
            }
            if (this.showing[1]) {
                imageStyles[1] = `background-image: url(${this.getThumbnail(this.showing[1])})`;
            }
            return html `
    ${flexStyles}
    <style>
      :host {
        display: block;
        overflow: hidden;
      }
      #container {
        min-height: 363px;
        position: relative;
      }
      .fill-container {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
      }
      .imagePanel {
        background-size: cover;
        background-origin: border-box;
        background-position: 50% 50%;
        -webkit-filter: blur(10px);
        -moz-filter: blur(7px);
        -ms-filter: blur(7px);
        filter: blur(7px);
        opacity: 0;
      }
      .imagePanel.current {
        opacity: 1;
      }
      .glassPanel {
        background: var(--slick-nextup-glass-color, rgba(0,0,0,0.32));
        color: var(--slick-nextup-glass-text-color, white);
      }
      #glassText {
        padding: 8px 47px 8px 16px;
        font-weight: 400;
        font-family: var(--slick-nextup-glass-text-font, sans-serif);
        background: var(--slick-nextup-bar-background, none);
        letter-spacing: 0.05em;
        font-size: 18px;
        opacity: 1;
        overflow: hidden;
        line-height: 28px;
        min-height: 28px;
      }
      x-icon {
        cursor: pointer;
        color: var(--slick-nextup-glass-text-color, white);
        padding: 7px;
        height: 30px;
        width: 30px;
        border-radius: 50%;
        margin: 0 3px;
        transition: background 0.28s ease;
      }
      x-icon:hover {
        background: rgba(0,0,0,0.15);
      }
      slick-carousel-card {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        box-sizing: border-box;
        transform: translate3d(-100vw, -50%, 0);
        will-change: transform;
      }
      slick-carousel-card.current {
        position: relative;
        transform: translate3d(0, 0, 0);
      }
      .cardCell {
        position: relative;
      }
      .spacer {
        width: 16px;
        display: none;
      }
      #searchIcon {
        position: absolute;
        top: 0;
        right: 0;
        margin: 0;
      }
      
      @media (max-width: 500px) {
        .iconCell {
          position: absolute;
          bottom: 3px;
        }
        #arrowLeft {
          left: 0;
        }
        #arrowRight {
          right: 0;
        }
        #container {
          min-height: 310px;
        }
        .spacer {
          display: block;
        }
      }
    </style>
    <div id="container">
      <div id="bg0" class="imagePanel fill-container ${this.current ? '' : 'current'}" style="${imageStyles[0]}"></div>
      <div id="bg1" class="imagePanel fill-container ${this.current ? 'current' : ''}" style="${imageStyles[1]}"></div>
      <div class="glassPanel fill-container">
        <div id="glassText">${this.label}</div>
      </div>
      <div id="overlayPanel" class="fill-container horizontal layout center">
        <div class="spacer"></div>
        <div class="iconCell" id="arrowLeft">
          <x-icon icon="chevron-left" @click="${this.prevPage}"></x-icon>
        </div>
        <div class="flex cardCell">
          <slick-carousel-card id="card0" class="${this.current ? '' : 'current'}" .data="${this.showing[0]}"></slick-carousel-card>
          <slick-carousel-card id="card1" class="${this.current ? 'current' : ''}" .data="${this.showing[1]}"></slick-carousel-card>
        </div>
        <div class="iconCell" id="arrowRight">
          <x-icon icon="chevron-right" @click="${this.nextPage}"></x-icon>
        </div>
        <div class="spacer"></div>
      </div>
      <x-icon id="searchIcon" icon="search" @click="${this.onSearch}"></x-icon>
    </div>
    `;
        }
        firstUpdated() {
            addListener(this.$('card0'), 'track', (e) => this.onTrack(e));
            addListener(this.$('card1'), 'track', (e) => this.onTrack(e));
            addListener(this.$('card0'), 'tap', (e) => this.onTap(e));
            addListener(this.$('card1'), 'tap', (e) => this.onTap(e));
        }
        updated(changedProperties) {
            if (changedProperties.has('siteCode') || changedProperties.has('pageUrl')) {
                this.loadData();
                return;
            }
        }
        async loadData() {
            if (this.siteCode && this.pageUrl) {
                this.indexMap.clear();
                this.pages = await core.getRecommendedPages();
                if (this.pages.length < 3) {
                    this.pages = await core.getStripPages();
                }
                this.pages.forEach((p, i) => {
                    this.indexMap.set(p, i);
                });
                this.pages = [...this.pages].reverse();
                this.showing = [];
                this.cursor = this.pages.length - 1;
                if (this.pages.length > 1) {
                    this.showing.push(this.pages[this.pages.length - 1]);
                    this.showing.push(this.pages[this.pages.length - 2]);
                }
                this.attachIntersectionObserver();
            }
        }
        getThumbnail(page) {
            return core.thumbnailUrl(page, 256) || '';
        }
        async onTap(e) {
            const card = e.target;
            const url = card && card.data && card.data.url;
            if (url) {
                await core.widgetAction(this.widgetName, 'nav', 0, url, undefined, { index: this.indexMap.get(card.data) || 0 });
                let modifier = false;
                const me = e.detail.sourceEvent;
                if (me) {
                    modifier = me.shiftKey || me.ctrlKey || me.altKey || me.metaKey || false;
                }
                if (modifier) {
                    window.open(url);
                }
                else {
                    window.location.assign(url);
                }
            }
        }
        onTrack(e) {
            if (!this.animating) {
                const event = e;
                event.stopPropagation();
                switch (event.detail.state) {
                    case 'start':
                        if (!this.tracking) {
                            this.tracking = true;
                        }
                        break;
                    case 'end':
                        if (this.tracking) {
                            this.tracking = false;
                            const dx = event.detail.dx;
                            const dy = event.detail.dy;
                            if (Math.abs(dx) > Math.abs(dy)) {
                                if (dx < -15) {
                                    setTimeout(() => this.nextPage());
                                }
                                else if (dx > 15) {
                                    setTimeout(() => this.prevPage());
                                }
                            }
                        }
                        break;
                    default:
                        break;
                }
            }
        }
        nextPage() {
            let nextCursor = this.cursor - 1;
            if (nextCursor < 0) {
                nextCursor = this.pages.length - 1;
            }
            this.cursor = nextCursor;
            if (this.current) {
                this.showing[0] = this.pages[this.cursor];
            }
            else {
                this.showing[1] = this.pages[this.cursor];
            }
            this.requestUpdate();
            this.startAnimation(false);
            core.widgetAction(this.widgetName, 'next-page', 1500);
        }
        prevPage() {
            let nextCursor = this.cursor + 1;
            if (nextCursor >= this.pages.length) {
                nextCursor = 0;
            }
            this.cursor = nextCursor;
            if (this.current) {
                this.showing[0] = this.pages[this.cursor];
            }
            else {
                this.showing[1] = this.pages[this.cursor];
            }
            this.requestUpdate();
            this.startAnimation(true);
            core.widgetAction(this.widgetName, 'prev-page', 1500);
        }
        startAnimation(forward) {
            if (this.animating) {
                return;
            }
            this.animating = true;
            this.animationStart = 0;
            this.animateForward = forward;
            this.animationSrcCard = this.current ? this.$('card1') : this.$('card0');
            this.animationDstCard = this.current ? this.$('card0') : this.$('card1');
            this.animationSrcBg = this.current ? this.$('bg1') : this.$('bg0');
            this.animationDstBg = this.current ? this.$('bg0') : this.$('bg1');
            this.animationDuration = window.innerWidth < 600 ? 400 : 700;
            window.requestAnimationFrame((t) => this.tick(t));
        }
        tick(timestamp) {
            if (this.animating) {
                if (!this.animationStart) {
                    this.animationStart = timestamp;
                }
                const progress = Math.min(1, (timestamp - this.animationStart) / this.animationDuration);
                this.animationSrcCard.style.position = 'absolute';
                if (this.animateForward) {
                    this.animationSrcCard.style.transform = `translate3d(${(progress * 100).toFixed(2)}vw, -50%, 0)`;
                    this.animationDstCard.style.transform = `translate3d(${((progress - 1) * 100).toFixed(2)}vw, -50%, 0)`;
                }
                else {
                    this.animationSrcCard.style.transform = `translate3d(${-(progress * 100).toFixed(2)}vw, -50%, 0)`;
                    this.animationDstCard.style.transform = `translate3d(${((1 - progress) * 100).toFixed(2)}vw, -50%, 0)`;
                }
                this.animationSrcBg.style.opacity = `${1 - progress}`;
                this.animationDstBg.style.opacity = `${progress}`;
                if (progress === 1) {
                    this.current = this.current ? 0 : 1;
                    this.requestUpdate().then(() => {
                        this.animationSrcCard.style.position = '';
                        this.animationSrcCard.style.transform = '';
                        this.animationDstCard.style.transform = '';
                        this.animationSrcBg.style.opacity = '';
                        this.animationDstBg.style.opacity = '';
                        this.animating = false;
                    });
                }
                else {
                    window.requestAnimationFrame((t) => this.tick(t));
                }
            }
        }
        attachIntersectionObserver() {
            if (!this.intersectionObserverAttached) {
                this.intersectionObserverAttached = true;
                if ('IntersectionObserver' in window) {
                    const options = {
                        threshold: 0.5
                    };
                    (new IntersectionObserver(this.intersectionHandler, options)).observe(this);
                }
                else {
                    if (!this.intersectionNotified) {
                        core.widgetAction(this.widgetName, 'impression', 0);
                        this.intersectionNotified = true;
                    }
                }
            }
        }
        onSearch() {
            core.widgetAction(this.widgetName, 'open-search', 0);
            document.dispatchEvent(SlickCustomEvent('slick-show-search'));
        }
    };
    __decorate$n([
        property({ type: String }),
        __metadata$m("design:type", String)
    ], SlickCarousel.prototype, "siteCode", void 0);
    __decorate$n([
        property({ type: String }),
        __metadata$m("design:type", String)
    ], SlickCarousel.prototype, "pageUrl", void 0);
    __decorate$n([
        property(),
        __metadata$m("design:type", Array)
    ], SlickCarousel.prototype, "showing", void 0);
    __decorate$n([
        property(),
        __metadata$m("design:type", Object)
    ], SlickCarousel.prototype, "current", void 0);
    __decorate$n([
        property(),
        __metadata$m("design:type", Object)
    ], SlickCarousel.prototype, "label", void 0);
    SlickCarousel = __decorate$n([
        element('slick-carousel')
    ], SlickCarousel);

    var __decorate$o = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    let PoweredBy = class PoweredBy extends GuildElement {
        render() {
            return html `
    ${flexStyles}
    <style>
      :host {
        display: inline-block;
        font-size: 11px;
      }
      a {
        text-decoration: none;
        outline: none;
        color: inherit;
      }
      svg {
        display: block;
        max-width: 100%;
        max-height: 100%;
        box-sizing: border-box;
        overflow: hidden;
      }
      #logoImage {
        width: 2.5em;
        height: 2.5em;
      }
      .name {
        letter-spacing: 0.2em;
        text-transform: uppercase;
        font-family: Raleway, system-ui, sans-serif;
        font-weight: 400;
        padding-left: 8px;
        line-height: 1.5;
      }
    </style>
    <a class="horizontal layout center" href="https://slickstream.com" target="_blank" rel="noopener">
      <div id="logoImage">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 205.86 176.1">
          <g fill="currentColor">
            <path d="M123.75,80.25l44.89-14.08c12.6-4,26.19-17.13,23.05-27.14L108.53,65.1Z" />
            <path d="M150.15,106.52c11.61-4.93,22.84-16.79,20-26l-35,11Z" />
            <path d="M82.11,95.85,37.23,109.93c-12.6,3.95-26.2,17.13-23.06,27.14L97.33,111Z" />
            <path d="M55.71,69.58c-11.61,4.93-22.84,16.79-20,26l35-11Z" />
            <path d="M140.75,112.21,85.68,57.44l96.66-30.3C194.94,23.19,208.55,10,205.41,0L70.47,42.3,55.18,47.1a3.3,3.3,0,0,0-1.35,5.48L65.11,63.89l55.07,54.77L23.52,149C10.92,152.91-2.68,166.08.46,176.1l134.93-42.3,15.29-4.8a3.3,3.3,0,0,0,1.35-5.48Z" />
          </g>
        </svg>
      </div>
      <div class="name">
        <div style="text-transform: none;">Powered by</div>
        <div>Slickstream</div>
      </div>
    </a>
    `;
        }
    };
    PoweredBy = __decorate$o([
        element('powered-by')
    ], PoweredBy);

    class IconMap {
        constructor() {
            this.map = new Map();
            this.maps = new Map();
        }
        get(icon, key) {
            const map = key ? this.maps.get(key) : this.map;
            if (map && map.has(icon)) {
                return map.get(icon);
            }
            return '';
        }
        define(icons, key) {
            let map = this.map;
            if (key) {
                if (!this.maps.has(key)) {
                    this.maps.set(key, new Map());
                }
                map = this.maps.get(key);
            }
            for (const icon in icons) {
                map.set(icon, icons[icon]);
            }
        }
    }
    const iconMap = new IconMap();

    var __decorate$p = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$n = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let SosoIcon = class SosoIcon extends LitElement {
        static get styles() {
            return css `
      :host {
        display: -ms-inline-flexbox;
        display: -webkit-inline-flex;
        display: inline-flex;
        -ms-flex-align: center;
        -webkit-align-items: center;
        align-items: center;
        -ms-flex-pack: center;
        -webkit-justify-content: center;
        justify-content: center;
        position: relative;
        vertical-align: middle;
        fill: currentColor;
        stroke: none;
        width: 24px;
        height: 24px;
        box-sizing: initial;
      }
      svg {
        pointer-events: none;
        display: block;
        width: 100%;
        height: 100%;
      }
    `;
        }
        render() {
            const icon = this.icon || '';
            const path = iconMap.get(icon, this.iconkey);
            return html `
    <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false">
      <g>
        <path d="${path}"></path>
      </g>
    </svg>
    `;
        }
    };
    __decorate$p([
        property({ type: String }),
        __metadata$n("design:type", String)
    ], SosoIcon.prototype, "icon", void 0);
    __decorate$p([
        property({ type: String }),
        __metadata$n("design:type", String)
    ], SosoIcon.prototype, "iconkey", void 0);
    SosoIcon = __decorate$p([
        customElement('soso-icon')
    ], SosoIcon);

    var __decorate$q = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$o = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let SosoIconButton = class SosoIconButton extends LitElement {
        static get styles() {
            return css `
    :host {
      display: inline-block;
    }
    button {
      background: none;
      cursor: pointer;
      outline: none;
      border: none;
      border-radius: 50%;
      overflow: hidden;
      padding: 10px;
      color: inherit;
      user-select: none;
      position: relative;
    }
    button::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: currentColor;
      opacity: 0;
      pointer-events: none;
    }
    button:focus::before {
      opacity: 0.1;
    }
    button soso-icon {
      transition: transform 0.3s ease;
    }
    button:active soso-icon {
      transform: scale(1.15);
    }

    @media (hover: hover) {
      button:hover::before {
        opacity: 0.05;
      }
      button:focus::before {
        opacity: 0.1;
      }
    }
    `;
        }
        render() {
            return html `
    <button>
      <soso-icon .icon="${this.icon}" .iconkey="${this.iconkey}"></soso-icon>
    </button>`;
        }
    };
    __decorate$q([
        property({ type: String }),
        __metadata$o("design:type", String)
    ], SosoIconButton.prototype, "icon", void 0);
    __decorate$q([
        property({ type: String }),
        __metadata$o("design:type", String)
    ], SosoIconButton.prototype, "iconkey", void 0);
    SosoIconButton = __decorate$q([
        customElement('soso-icon-button')
    ], SosoIconButton);

    var __decorate$r = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$p = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    const GOLDEN_RATIO$1 = 0.618033988749895;
    let DiscoveryListView = class DiscoveryListView extends GuildElement {
        constructor() {
            super(...arguments);
            this.pages = [];
            this.noMatchesText = 'No matches';
            this.hideContent = false;
            this.hideLikes = false;
            this.hideBranding = false;
        }
        render() {
            const favIcon = (core.session && core.session.favoriteIconType) || 'heart';
            return html `
    ${flexStyles}
    <style>
      :host {
        display: block;
      }
      #matchesPanel {
        max-width: 800px;
        margin: 0 auto;
        padding: 10px;
      }
      .hidden {
        display: none !important;
      }
      #noMatches {
        font-size: 13px;
        color: var(--slick-discovery-color, #000);
      }
      .link {
        display: block;
        padding: 6px 0;
        text-decoration: none;
        color: inherit;
        font-size: 13px;
        position: relative;
        min-height: 40px;
        line-height: 1.5;
        overflow: hidden;
      }
      .imagePanel {
        display: block;
        width: 64px;
        background-color: #f0f0f0;
        background-size: cover;
        background-origin: border-box;
        background-position: 50% 50%;
        border: none;
        text-decoration: none;
        color: inherit;
        position: absolute;
        top: 0;
        min-height: 40px;
        bottom: 0;
      }
      .description, .name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .description {
        color: #808080;
      }
      #bottomBranding {
        position: fixed;
        bottom: 5px;
        left: 50%;
        margin-left: -67px;
        color: var(--slick-discovery-highlight-color, #2196f3);
      }
      #listBranding {
        color: var(--slick-discovery-highlight-color, #2196f3);
        margin-top: 6px;
      }
      .linkCard {
        border-radius: 3px;
        margin-bottom: 5px;
        background: white;
        box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -2px rgba(0, 0, 0, 0.2);
        overflow: hidden;
      }
      soso-icon-button {
        color: var(--slick-discovery-highlight-color, #2196f3);
        margin: 0 2px 0 10px;
      }
      #segmentIcon {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 24px;
        height: auto;
        display: block;
        margin-left: -12px;
        margin-top: -12px;
      }
      #segmentIcon.hidden {
        display: none !important;
      }
      #titleLabel {
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1.25px;
        opacity: 0.8;
        padding: 0 0 16px;
      }
    </style>
    <div id="matchesPanel" class="${this.hideContent ? 'hidden' : ''}">
      <div id="noMatches" class="${this.pages.length ? 'hidden' : ''}">${this.noMatchesText}</div>
      <div style="padding-bottom: var(--slick-discoverly-list-bottom-padding, 100px);">
        <div id="titleLabel" class="${(this.headline && this.pages.length) ? '' : 'hidden'}">${this.headline || ''}</div>

        ${repeat(this.pages, (d) => this.getPageId(d), (d) => {
            const imageStyle = d.noImg ? `background-color: ${this.getPageColor(d)}` : `background-image: url("${core.thumbnailUrl(d, 64) || ''}");`;
            const iconImage = d.noImg ? d.iconImageUrl : undefined;
            return html `
        <div class="horizontal layout center linkCard">
          <a href="${d.url}" class="link flex" @click="${this.onLinkClick}">
            <div class="imagePanel" style="${imageStyle}">
              <img id="segmentIcon" class="${iconImage ? '' : 'hidden'}" src="${iconImage}">
            </div>
            <div style="padding-left: 72px;">
              <div class="name">${d.title}</div>
              <div class="description">${d.description || ''}</div>
            </div>
          </a>
          <soso-icon-button class="${this.hideLikes ? 'hidden' : ''}"
            .icon="${favIcon}${d.isFavorite ? '' : '-outline'}"
            title="${d.isFavorite ? 'Favorite' : 'Click to favorite'}"
            @click="${() => this.toggleFav(d)}">
          </soso-icon-button>
        </div>
      `;
        })}
        <div style="text-align: right;">
          <powered-by id="listBranding" class="${(this.hideBranding || (!this.pages.length)) ? 'hidden' : ''}"></powered-by>
        </div>
      </div>
    </div>
    <powered-by id="bottomBranding" class="${(this.hideBranding || this.pages.length) ? 'hidden' : ''}"></powered-by>
    `;
        }
        getPageId(d) {
            return d.id;
        }
        onLinkClick(e) {
            const alink = e.currentTarget;
            if (alink && alink.href) {
                e.stopPropagation();
                this.fireEvent('nav', { href: alink.href });
            }
        }
        toggleFav(p) {
            const pid = this.getPageId(p);
            if (p.isFavorite) {
                core.removeFavorite(pid);
            }
            else {
                core.addHearts(1, pid);
            }
            p.isFavorite = !p.isFavorite;
            this.requestUpdate();
        }
        getPageColor(page) {
            if (page.categoryColor) {
                if (typeof page.categoryColor === 'string') {
                    return page.categoryColor;
                }
                else {
                    return this.createColor(page.categoryColor);
                }
            }
            else {
                return 'white';
            }
        }
        createColor(colorNumber) {
            const hue = (GOLDEN_RATIO$1 * colorNumber) % 1;
            return `hsl(${Math.floor(hue * 360)}, 70%, 50%)`;
        }
    };
    __decorate$r([
        property(),
        __metadata$p("design:type", Array)
    ], DiscoveryListView.prototype, "pages", void 0);
    __decorate$r([
        property(),
        __metadata$p("design:type", Object)
    ], DiscoveryListView.prototype, "noMatchesText", void 0);
    __decorate$r([
        property(),
        __metadata$p("design:type", Object)
    ], DiscoveryListView.prototype, "hideContent", void 0);
    __decorate$r([
        property(),
        __metadata$p("design:type", Object)
    ], DiscoveryListView.prototype, "hideLikes", void 0);
    __decorate$r([
        property(),
        __metadata$p("design:type", Object)
    ], DiscoveryListView.prototype, "hideBranding", void 0);
    __decorate$r([
        property(),
        __metadata$p("design:type", String)
    ], DiscoveryListView.prototype, "headline", void 0);
    DiscoveryListView = __decorate$r([
        element('discovery-list-view')
    ], DiscoveryListView);

    var __decorate$s = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$q = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    const WIDGET$1 = 'search';
    let SlickSearchView = class SlickSearchView extends GuildElement {
        constructor() {
            super(...arguments);
            this.siteCode = '';
            this.pageUrl = '';
            this.matchingPages = [];
            this.hideLikes = false;
            this.searching = false;
            this.pendingSearch = false;
            this.cancelSearch = false;
            this.currentSearchText = '';
            this.searchTextToReport = '';
            this.impressionFired = false;
        }
        render() {
            const noMatchesText = (this.searchConfig && this.searchConfig.noMatchesText) || core.phrase('no-matches-found') || 'No matches found';
            const hasPrimary = !!(this.primaryResults && this.primaryResults.pages.length);
            return html `
    <style>
      .hidden {
        display: none !important;
      }
    </style>
    <discovery-list-view class="${hasPrimary ? '' : 'hidden'}" style="--slick-discoverly-list-bottom-padding: 0;"
      .hideLikes="${this.hideLikes}" .pages="${this.primaryResults ? this.primaryResults.pages : []}" .noMatchesText="${noMatchesText}"
      .headline="${hasPrimary ? this.primaryResults.title : ''}" .hideContent="${this.currentSearchText ? false : true}" .hideBranding="${true}" @nav="${this.onNav}"></discovery-list-view>
    <discovery-list-view .hideLikes="${this.hideLikes}" .pages="${this.matchingPages}" .noMatchesText="${hasPrimary ? '' : noMatchesText}"
      .headline="${(hasPrimary && this.matchingPages.length) ? 'Other' : ''}" .hideContent="${this.currentSearchText ? false : true}" @nav="${this.onNav}"></discovery-list-view>
    `;
        }
        search(text) {
            this.currentSearchText = text.trim();
            this.doSearch();
            if (!this.impressionFired) {
                core.widgetAction(WIDGET$1, 'impression', 0);
                this.impressionFired = true;
            }
            this.refreshLikes();
        }
        refreshLikes() {
            this.hideLikes = !core.session.enableFavorites;
        }
        async doSearch() {
            const text = this.currentSearchText;
            if (text) {
                this.cancelSearch = false;
                if (this.searching) {
                    this.pendingSearch = true;
                }
                else {
                    this.searching = true;
                    let resultPages = [];
                    try {
                        const result = await core.search(text);
                        resultPages = result.pages;
                        this.primaryResults = result.primaryResults;
                    }
                    catch (err) {
                        console.error(err);
                        resultPages = [];
                        this.primaryResults = undefined;
                    }
                    if (this.cancelSearch) {
                        this.searching = false;
                        return;
                    }
                    if (this.pendingSearch) {
                        this.pendingSearch = false;
                        this.searching = false;
                        this.doSearch();
                        return;
                    }
                    this.matchingPages = resultPages;
                    this.reportSearch(text);
                    this.searching = false;
                }
            }
            else {
                this.cancelSearch = true;
                this.searching = false;
                this.pendingSearch = false;
                this.matchingPages = [];
                this.primaryResults = undefined;
            }
        }
        reportSearch(text) {
            if (!text) {
                return;
            }
            if (this.searchTextToReport) {
                this.searchTextToReport = text;
            }
            else {
                this.searchTextToReport = text;
                setTimeout(() => {
                    if (this.searchTextToReport) {
                        core.widgetAction(WIDGET$1, 'search', 0, undefined, this.searchTextToReport);
                        this.searchTextToReport = '';
                    }
                }, 3000);
            }
        }
        onNav(event) {
            core.widgetAction(WIDGET$1, 'nav', 0, event.detail.href, undefined, { query: this.currentSearchText });
        }
    };
    __decorate$s([
        property({ type: Object }),
        __metadata$q("design:type", Object)
    ], SlickSearchView.prototype, "searchConfig", void 0);
    __decorate$s([
        property({ type: String }),
        __metadata$q("design:type", String)
    ], SlickSearchView.prototype, "siteCode", void 0);
    __decorate$s([
        property({ type: String }),
        __metadata$q("design:type", String)
    ], SlickSearchView.prototype, "pageUrl", void 0);
    __decorate$s([
        property({ type: Array }),
        __metadata$q("design:type", Array)
    ], SlickSearchView.prototype, "matchingPages", void 0);
    __decorate$s([
        property(),
        __metadata$q("design:type", Object)
    ], SlickSearchView.prototype, "primaryResults", void 0);
    __decorate$s([
        property({ type: Boolean }),
        __metadata$q("design:type", Object)
    ], SlickSearchView.prototype, "hideLikes", void 0);
    SlickSearchView = __decorate$s([
        element('slick-search-view')
    ], SlickSearchView);

    var __decorate$t = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$r = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let SlickSearchToolbar = class SlickSearchToolbar extends GuildElement {
        constructor() {
            super(...arguments);
            this.searchIcon = 'search';
        }
        render() {
            const placeholder = (this.searchConfig && this.searchConfig.placeholderText) || core.phrase('search-text') || 'search text';
            return html `
    ${flexStyles}
    <style>
      input {
        width: 100%;
        box-sizing: border-box;
        outline: none;
        border: none;
        font-size: 20px;
        color: inherit;
        background: none;
        border-bottom: 2px solid;
        font-family: system-ui, sans-serif;
        padding: 4px 2px;
        font-weight: 300;
        letter-spacing: 0.04em;
        border-radius: 0;
      }
      input::placeholder {
        color: inherit;
        opacity: 1;
      }
      input::-moz-placeholder {
        color: inherit;
        opacity: 1;
      }
      input:focus {
        border-color: var(--slick-discovery-highlight-color, #2196f3);
      }
      x-icon {
        width: 32px;
        height: 32px;
        cursor: pointer;
        color: var(--slick-discovery-highlight-color, #2196f3);
      }
      @media (max-width: 600px) {
        input {
          font-size: 16px;
        }
      }
    </style>
    <div class="horizontal layout ceter">
      <div class="flex">
        <input id="searchText" placeholder="${placeholder}" @input="${this.onTextInput}" @keydown="${this.onKeyDown}">
      </div>
      <x-icon id="btnSearch" .icon="${this.searchIcon}" @click="${this.onClear}"></x-icon>
    </div>
    `;
        }
        clearText() {
            this.searchIcon = 'search';
            const input = this.$('searchText');
            if (input) {
                input.value = '';
            }
        }
        focus() {
            const input = this.$('searchText');
            if (input) {
                input.focus();
                setTimeout(() => input.focus);
            }
        }
        get value() {
            const input = this.$('searchText');
            if (input) {
                return input.value.trim();
            }
            return '';
        }
        onClear() {
            this.fireEvent('clear');
            this.$('searchText').value = '';
            this.onTextInput();
            setTimeout(() => {
                this.$('searchText').focus();
            });
        }
        onTextInput() {
            const text = this.value;
            this.searchIcon = text ? 'close' : 'search';
            this.fireEvent('search', { text });
        }
        onKeyDown(e) {
            if (e.keyCode === 27) {
                e.preventDefault();
                e.stopPropagation();
                this.fireEvent('close');
            }
        }
    };
    __decorate$t([
        property({ type: String }),
        __metadata$r("design:type", String)
    ], SlickSearchToolbar.prototype, "searchIcon", void 0);
    __decorate$t([
        property({ type: Object }),
        __metadata$r("design:type", Object)
    ], SlickSearchToolbar.prototype, "searchConfig", void 0);
    SlickSearchToolbar = __decorate$t([
        element('slick-search-toolbar')
    ], SlickSearchToolbar);

    var __decorate$u = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$s = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    const WIDGET$2 = 'favorites';
    let SlickFavortiesView = class SlickFavortiesView extends GuildElement {
        constructor() {
            super(...arguments);
            this.pages = [];
            this.loading = false;
            this.supportsHearts = false;
            this.memStatus = 'identity-confirmed';
            this.syncAllowed = false;
            this.impressionFired = false;
        }
        render() {
            return html `
    <style>
      #loading {
        max-width: 800px;
        margin: 0 auto;
        padding: 10px;
      }
      .hidden {
        display: none !important;
      }
      section {
        max-width: 800px;
        margin: 0 auto;
        font-size: 13px;
        line-height: 1.35;
        padding: 16px 8px;
        box-sizing: border-box;
      }
      h4 {
        margin: 0;
        font-weight: bold;
        letter-spacing: 1.25px;
        font-size: 14px;
        text-transform: uppercase;
      }
      section x-icon {
        height: 1.4em;
        width: 1.4em;
        margin: 0 3px;
      }
      soso-button {
        color: var(--slick-discovery-highlight-color, #2196f3);
      }
      powered-by {
        color: var(--slick-discovery-highlight-color, #2196f3);
      }
    </style>
    <div id="loading" class="${this.loading ? '' : 'hidden'}">${core.phrase('loading')}</div>
    <main class="${this.loading ? 'hidden' : ''}">
      <discovery-list-view .hideBranding="${true}" .pages="${this.pages}" .noMatchesText="${core.phrase('no-favorites')}" @nav="${this.onNav}"></discovery-list-view>
      <section class="${this.supportsHearts ? '' : 'hidden'}">
        <h4>Heartbeat</h4>
        <p>
          ${core.phrase('heartbeat-description')}
        </p>
      </section>
      <section class="${this.syncAllowed && (this.memStatus === 'none') ? '' : 'hidden'}">
        <h4>${core.phrase('favorites')}</h4>
        <p>
          ${core.phrase('favorites-description')}
        </p>
      </section>
      <section>
        <powered-by></powered-by>
      </section>
      
    </main>
    `;
        }
        onNav(event) {
            core.widgetAction(WIDGET$2, 'nav', 0, event.detail.href);
        }
        refreshMeta() {
            const session = core.session;
            const heartbeat = session.configuration.heartbeat;
            this.supportsHearts = !!(heartbeat && heartbeat.state === 'enabled');
            this.memStatus = session.readerEmailStatus || 'none';
            this.syncAllowed = session.enableMembership;
        }
        async reset() {
            this.refreshMeta();
            this.loading = true;
            try {
                this.pages = await core.getFavorites();
            }
            catch (err) {
                console.error(err);
                this.pages = [];
            }
            this.loading = false;
            if (!this.impressionFired) {
                core.widgetAction(WIDGET$2, 'impression', 0);
                this.impressionFired = true;
            }
        }
    };
    __decorate$u([
        property({ type: Array }),
        __metadata$s("design:type", Array)
    ], SlickFavortiesView.prototype, "pages", void 0);
    __decorate$u([
        property({ type: Boolean }),
        __metadata$s("design:type", Object)
    ], SlickFavortiesView.prototype, "loading", void 0);
    __decorate$u([
        property({ type: Boolean }),
        __metadata$s("design:type", Object)
    ], SlickFavortiesView.prototype, "supportsHearts", void 0);
    __decorate$u([
        property(),
        __metadata$s("design:type", String)
    ], SlickFavortiesView.prototype, "memStatus", void 0);
    __decorate$u([
        property(),
        __metadata$s("design:type", Object)
    ], SlickFavortiesView.prototype, "syncAllowed", void 0);
    SlickFavortiesView = __decorate$u([
        element('slick-favorites-view')
    ], SlickFavortiesView);

    function fire(element, name, detail, bubbles = true, composed = true) {
        if (name) {
            const init = {
                bubbles: (typeof bubbles === 'boolean') ? bubbles : true,
                composed: (typeof composed === 'boolean') ? composed : true
            };
            if (detail) {
                init.detail = detail;
            }
            const CE = (window.SlickCustomEvent || CustomEvent);
            element.dispatchEvent(new CE(name, init));
        }
    }

    var __decorate$v = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$t = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let SosoSwitch = class SosoSwitch extends LitElement {
        constructor() {
            super(...arguments);
            this.checked = false;
        }
        static get styles() {
            return css `
    :host {
      display: inline-block;
    }
    button {
      background: none;
      cursor: pointer;
      outline: none;
      border: none;
      padding: 10px;
      color: inherit;
      user-select: none;
      position: relative;
    }
    #track {
      box-sizing: border-box;
      width: 32px;
      height: 14px;
      opacity: 0.38;
      border-width: 1px;
      border-style: solid;
      border-color: initial;
      border-image: initial;
      border-radius: 7px;
      transition: opacity 90ms cubic-bezier(0.4, 0, 0.2, 1) 0s, background-color 90ms cubic-bezier(0.4, 0, 0.2, 1) 0s, border-color 90ms cubic-bezier(0.4, 0, 0.2, 1) 0s;
      background-color: var(--soso-switch-track-color, rgb(0, 0, 0));
      border-color: var(--soso-switch-track-color, rgb(0, 0, 0));
      pointer-events: none;
    }
    #thumb {
      position: relative;
      box-shadow: rgba(0, 0, 0, 0.2) 0px 3px 1px -2px, rgba(0, 0, 0, 0.14) 0px 2px 2px 0px, rgba(0, 0, 0, 0.12) 0px 1px 5px 0px;
      box-sizing: border-box;
      width: 20px;
      height: 20px;
      pointer-events: none;
      border-width: 10px;
      border-style: solid;
      border-color: initial;
      border-image: initial;
      border-radius: 50%;
      background-color: var(--soso-switch-thumb-off-color, rgb(255, 255, 255));
      border-color: var(--soso-switch-thumb-off-color, rgb(255, 255, 255));
      transition: background-color 90ms cubic-bezier(0.4, 0, 0.2, 1) 0s, border-color 90ms cubic-bezier(0.4, 0, 0.2, 1) 0s;
    }
    #thumbPanel {
      position: absolute;
      top: 7px;
      left: 0;
      transition: transform 90ms cubic-bezier(0.4, 0, 0.2, 1) 0s;
      transform: translateX(0px);
      will-change: transform;
    }
    #thumbPanel::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 40px;
      height: 40px;
      background-color: var(--soso-switch-track-color, rgb(0, 0, 0));
      opacity: 0;
      border-radius: 50%;
      transition: opacity 90ms cubic-bezier(0.4, 0, 0.2, 1) 0s, background-color 90ms cubic-bezier(0.4, 0, 0.2, 1) 0s;
      pointer-events: none;
    }

    button:focus #thumbPanel::before {
      opacity: 0.08;
    }
    button:active #thumbPanel::before {
      opacity: 0.22;
    }

    button.checked  #track {
      background-color: var(--soso-highlight-color, #018786);
      border-color: var(--soso-highlight-color, #018786);
      opacity: 0.54;
    }
    button.checked #thumb {
      background-color: var(--soso-highlight-color, #018786);
      border-color: var(--soso-highlight-color, #018786);
    }
    button.checked #thumbPanel {
      transform: translateX(32px);
    }
    button.checked #thumbPanel::before {
      background-color: var(--soso-highlight-color, #018786);
    }

    @media (hover: hover) {
      button:hover #thumbPanel::before {
        opacity: 0.06;
      }
      button:focus #thumbPanel::before {
        opacity: 0.08;
      }
      button:active #thumbPanel::before {
        opacity: 0.22;
      }
    }
    `;
        }
        render() {
            return html `
    <button role="switch" class="${this.checked ? 'checked' : 'unchecked'}" @click="${this.toggle}">
      <div id="track"></div>
      <div id="thumbPanel">
        <div id="thumb"></div>
      </div>
    </button>
    `;
        }
        toggle() {
            this.checked = !this.checked;
            fire(this, 'change', { checked: this.checked });
        }
    };
    __decorate$v([
        property({ type: Boolean }),
        __metadata$t("design:type", Object)
    ], SosoSwitch.prototype, "checked", void 0);
    SosoSwitch = __decorate$v([
        customElement('soso-switch')
    ], SosoSwitch);

    var __decorate$w = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$u = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    const WIDGET$3 = 'favorites';
    let SlickFavoritesToolbar = class SlickFavoritesToolbar extends GuildElement {
        constructor() {
            super(...arguments);
            this.popupShowing = false;
            this.state = 'email';
            this.synced = false;
            this.syncAllowed = false;
            this.savingMessage = '';
        }
        render() {
            const emailClass = this.state !== 'code' ? '' : 'hidden';
            const codeClass = this.state === 'code' ? '' : 'hidden';
            return html `
    ${flexStyles}
    <style>
      :host {
        display: block;
        position: relative;
        --soso-highlight-color: var(--slick-discovery-highlight-color, #2196f3);
      }
      h3 {
        margin: 0;
        padding: 0;
        font-weight: 400;
        font-size: 18px;
        text-transform: capitalize;
        color: var(--slick-discovery-highlight-color, #2196f3);
      }
      label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1.25px;
        font-weight: bold;
        opacity: 0.5;
        margin-right: 5px;
      }
      #popup {
        position: absolute;
        right: 0;
        top: 100%;
        background: white;
        box-shadow: 0 5px 5px -3px rgba(0,0,0,.2), 0 8px 10px 1px rgba(0,0,0,.14), 0 3px 14px 2px rgba(0,0,0,.12);
        border-radius: 4px;
        margin-top: 8px;
        z-index: 1;
        opacity: 0;
        pointer-events: none;
        transform: scale(0.2);
        transition: transform 0.3s ease, opacity 0.3s ease;
      }
      #popup.open {
        opacity: 1;
        transform: none;
        pointer-events: auto;
      }
      #emailForm {
        position: relative;
        padding: 0 5px 0 0;
        border-radius: 4px;
      }
      input {
        font-family: sans-serif;
        font-size: 14px;
        padding: 16px 8px;
        font-weight: 400;
        letter-spacing: 1px;
        border: none;
        border-radius: 4px 0 0 4px;
        outline: none;
        width: 170px;
      }
      #code {
        width: 150px;
      }
      soso-button {
        color: var(--slick-discovery-highlight-color, #2196f3);
      }
      #progress {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 4px;
        background: white;
        color: #000;
        display: none;
      }
      #progress.pending {
        display: flex;
      }
      #progress span {
        width: 100%;
        display: block;
        text-align: center;
        text-transform: uppercase;
        font-size: 13px;
        letter-spacing: 1.25px;
      }
      .hidden {
        display: none !important;
      }
      #notice {
        max-width: 243px;
        padding: 8px;
        box-sizing: border-box;
        border-radius: 4px 4px 0 0;
        font-size: 13px;
        margin-bottom: 5px;
        border-bottom: 1px solid #e5e5e5;
        font-family: system-ui, sans-serif;
        color: #777;
      }
    </style>
    <div class="horizontal layout center">
      <h3 class="flex">${core.phrase('my-favorite-pages')}</h3>
      <div class="horizontal layout center ${this.syncAllowed ? '' : 'hidden'}">
        <label>${core.phrase('sync')}</label>
        <soso-switch .checked="${this.synced}" @change="${this.syncChange}"></soso-switch>
      </div>
    </div>
    <div id="popup" class="${this.popupShowing ? 'open' : ''}">
      <div id="notice" class="${codeClass}">${core.phrase('code-verification-message')}</div>
      <div id="emailForm" class="horizontal layout center">
        <input class="${emailClass}" id="email" placeholder="Email" type="email" autocomplete="off" @keydown="${this.onKeyDown}" @input="${this.onTextInput}">
        <input class="${codeClass}" id="code" placeholder="Code" autocomplete="off" @keydown="${this.onKeyDown}" @input="${this.onTextInput}">
        <soso-button id="saveButton" disabled @click="${this.submit}">${this.state === 'code' ? core.phrase('confirm') : core.phrase('save')}</soso-button>
        <div id="progress" class="horizontal layout center ${this.savingMessage ? 'pending' : ''}">
          <span>${this.savingMessage}</span>
        </div>
      </div>
    </div>
    `;
        }
        syncChange() {
            setTimeout(() => {
                const checked = this.switch.checked;
                if (!checked) {
                    this.clear();
                }
                else {
                    this.state = 'email';
                    this.popupShowing = true;
                    this.updateComplete.then(() => {
                        setTimeout(() => {
                            if (this.popupShowing) {
                                this.email.focus();
                            }
                        });
                    });
                }
                core.widgetAction(WIDGET$3, 'sync', 0, undefined, undefined, { sync: checked });
            });
        }
        async refreshMeta() {
            const session = core.session;
            this.syncAllowed = session.enableMembership;
            this.synced = !!(session.readerEmailStatus && (session.readerEmailStatus === 'first-time' || session.readerEmailStatus === 'identity-confirmed'));
        }
        reset() {
            if (this.popupShowing) {
                this.popupShowing = false;
                this.synced = false;
                if (this.switch) {
                    this.switch.checked = false;
                }
            }
            if (this.email) {
                this.email.value = '';
            }
            if (this.code) {
                this.code.value = '';
                this.onTextInput();
            }
            this.refreshMeta();
            this.requestUpdate();
        }
        async clear() {
            if (this.synced) {
                await core.setMembership('');
                this.synced = false;
                this.fireEvent('update');
            }
            if (this.email) {
                this.email.value = '';
            }
            if (this.code) {
                this.code.value = '';
                this.onTextInput();
            }
            this.popupShowing = false;
        }
        onKeyDown(e) {
            e.stopPropagation();
            switch (e.keyCode) {
                case 27:
                    this.switch.checked = false;
                    this.clear();
                    break;
                case 13:
                    this.submit();
                    break;
            }
        }
        onTextInput() {
            if (this.saveButton) {
                let disabled = true;
                switch (this.state) {
                    case 'email': {
                        const text = this.email.value.trim();
                        if (text) {
                            if (validateEmail(text)) {
                                disabled = false;
                            }
                        }
                        break;
                    }
                    case 'code': {
                        const text = this.code.value.trim();
                        if (text) {
                            disabled = false;
                        }
                        break;
                    }
                }
                this.saveButton.disabled = disabled;
                return !disabled;
            }
            return false;
        }
        async submit() {
            if (!this.onTextInput()) {
                return;
            }
            switch (this.state) {
                case 'email': {
                    const text = this.email.value.trim();
                    try {
                        this.savingMessage = core.phrase('saving...');
                        const response = await core.setMembership(text);
                        this.savingMessage = '';
                        if (response.confirmationRequired) {
                            this.state = 'code';
                            this.email.value = '';
                            this.code.value = '';
                            this.onTextInput();
                            setTimeout(() => {
                                this.code.focus();
                            }, 10);
                        }
                        else {
                            this.popupShowing = false;
                            this.synced = true;
                            this.fireEvent('update');
                        }
                    }
                    catch (err) {
                        console.error(err);
                        this.savingMessage = '';
                        this.popupShowing = false;
                        this.synced = false;
                        this.switch.checked = false;
                        this.state = 'email';
                        this.email.value = '';
                        this.code.value = '';
                        this.onTextInput();
                    }
                    core.widgetAction(WIDGET$3, 'submit', 0, undefined, 'email', { email: text });
                    break;
                }
                case 'code': {
                    const text = this.code.value.trim();
                    try {
                        this.savingMessage = 'Confirming...';
                        await core.confirmMembership(text);
                        this.savingMessage = '';
                        this.popupShowing = false;
                        this.synced = true;
                        this.fireEvent('update');
                    }
                    catch (err) {
                        console.error(err);
                        this.savingMessage = '';
                        this.popupShowing = false;
                        this.synced = false;
                        this.switch.checked = false;
                        this.state = 'email';
                        this.email.value = '';
                        this.code.value = '';
                        this.onTextInput();
                        if (err.message) {
                            window.alert(err.message);
                        }
                    }
                    core.widgetAction(WIDGET$3, 'submit', 0, undefined, 'confirm', { email: text });
                    break;
                }
            }
        }
    };
    __decorate$w([
        property(),
        __metadata$u("design:type", Object)
    ], SlickFavoritesToolbar.prototype, "popupShowing", void 0);
    __decorate$w([
        property(),
        __metadata$u("design:type", String)
    ], SlickFavoritesToolbar.prototype, "state", void 0);
    __decorate$w([
        property(),
        __metadata$u("design:type", Object)
    ], SlickFavoritesToolbar.prototype, "synced", void 0);
    __decorate$w([
        property(),
        __metadata$u("design:type", Object)
    ], SlickFavoritesToolbar.prototype, "syncAllowed", void 0);
    __decorate$w([
        property(),
        __metadata$u("design:type", Object)
    ], SlickFavoritesToolbar.prototype, "savingMessage", void 0);
    __decorate$w([
        query('soso-switch'),
        __metadata$u("design:type", SosoSwitch)
    ], SlickFavoritesToolbar.prototype, "switch", void 0);
    __decorate$w([
        query('#email'),
        __metadata$u("design:type", HTMLInputElement)
    ], SlickFavoritesToolbar.prototype, "email", void 0);
    __decorate$w([
        query('#code'),
        __metadata$u("design:type", HTMLInputElement)
    ], SlickFavoritesToolbar.prototype, "code", void 0);
    __decorate$w([
        query('#saveButton'),
        __metadata$u("design:type", SosoButton)
    ], SlickFavoritesToolbar.prototype, "saveButton", void 0);
    SlickFavoritesToolbar = __decorate$w([
        element('slick-favorites-toolbar')
    ], SlickFavoritesToolbar);

    var __decorate$x = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$v = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let SlickCardListItem = class SlickCardListItem extends GuildElement {
        constructor() {
            super(...arguments);
            this.data = { label: '', id: '' };
        }
        render() {
            const imageStyle = this.data.image ? `background-image: url(${this.data.image});` : '';
            if (imageStyle) {
                this.style.removeProperty('--slick-category-card-selected-bg');
            }
            else {
                this.style.setProperty('--slick-category-card-selected-bg', 'none');
            }
            return html `
    ${flexStyles}
    <style>
      :host {
        display: block;
        position: relative;
        width: 120px;
        height: 50px;
        overflow: hidden;
        border-radius: 3px;
        transform: translate3d(0,0,0);
        margin: 0 4px;
        transition: transform 0.3s ease, box-shadow 0.3s ease, margin 0.3s ease;
      }
      #imagePanel {
        background-color: var(--slick-discovery-highlight-color, #2196f3);
        background-size: cover;
        background-origin: border-box;
        background-position: 50% 50%;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        opacity: 0;
        filter: blur(3px);
        transition: filter 0.3s ease, opacity 0.3s ease;
      }
      #label {
        position: relative;
        height: 100%;
        transition: color 0.3s ease, background-color 0.3s ease;
      }
      #labelCell {
        width: 100%;
        box-sizing: border-box;
        text-align: center;
        text-transform: uppercase;
        font-size: 12px;
        letter-spacing: 0.75px;
        font-family: sans-serif;
        opacity: 0.8;
        transition: opacity 0.3s ease;
        white-space: initial;
        line-height: 1.25;
        padding: 0 3px;
        max-height: 3.6em;
        overflow: hidden;
      }
      :host(.selected) {
        margin: 0 12px;
        transform: translate3d(0,0,0) scale(1.1);
        box-shadow: 0 3px 10px -3px rgba(0,0,0,0.6);
      }
      :host(.selected) #label {
        background-color: var(--slick-category-card-selected-bg, rgba(0,0,0,0.4));
        color: white;
      }
      :host(.selected) #labelCell {
        opacity: 1;
      }
      :host(.selected) #imagePanel {
        filter: blur(0);
        opacity: 1;
      }

      @media (hover: hover) {
        :host(:hover) #imagePanel {
          opacity: 0.25;
        }
        :host(.selected) #imagePanel {
          opacity: 1;
        }
      }
    </style>
    <div id="imagePanel" style="${imageStyle}"></div>
    <div id="label" class="horizontal layout center">
      <div id="labelCell">${this.data.label}</div>
    </div>
    `;
        }
    };
    __decorate$x([
        property(),
        __metadata$v("design:type", Object)
    ], SlickCardListItem.prototype, "data", void 0);
    SlickCardListItem = __decorate$x([
        element('slick-card-list-item')
    ], SlickCardListItem);

    var __decorate$y = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$w = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let SlickCardList = class SlickCardList extends GuildElement {
        constructor() {
            super(...arguments);
            this.data = [];
            this.selected = '';
            this.scrollPending = false;
        }
        render() {
            return html `
    <style>
      :host {
        display: block;
        position: relative;
        text-align: center;
      }
      #scrollPanel {
        display: block;
        overflow: auto;
        box-sizing: border-box;
        width: 100%;
        -webkit-overflow-scrolling: touch;
        overflow-x: auto;
        overflow-y: hidden;
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      #scrollPanel::-webkit-scrollbar {
        width: 0px;
        height: 0px;
        background: transparent;
      }
      slick-card-list-item {
        display: inline-block;
        vertical-align: middle;
        cursor: pointer;
      }
      
      #contentPanel {
        white-space: nowrap;
        padding: 10px 0px 15px;
      }

      #chevPanel{
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      :host(:hover) #chevPanel {
        opacity: 1;
      }
      #chevL {
        left: 0px;
      }
      #chevR {
        right: 0px;
      }
      #chevL:hover {
        opacity: 1;
      }
      #chevR:hover {
        opacity: 1;
      }
      #chevPanel x-icon {
        position: absolute;
        top: 0;
        height: 100%;
        background: white;
        color: var(--slick-discovery-highlight-color, #2196f3);
        opacity: 0.9;
        padding: 0 5px;
        cursor: pointer;
      }
      .hidden {
        display: none !important;
      }

      @media (max-width: 700px) {
        #chevPanel {
          display: none;
        }
      }
    </style>
    <div id="scrollPanel" @scroll="${this.updateScrollPosition}">
      <div id="contentPanel">
        ${repeat(this.data, (d) => d.id || d.label, (d, i) => html `<slick-card-list-item .data="${d}" class="${d.id === this.selected ? 'selected' : ''}" @click="${() => this.onClick(d, i)}"></slick-card-list-item>`)}
      </div>
    </div>
    <div id="chevPanel">
      <x-icon id="chevL" icon="chevron-left" class="hidden" @click="${this.scrollPrev}"></x-icon>
      <x-icon id="chevR" icon="chevron-right" class="hidden" @click="${this.scrollNext}"></x-icon>
    </div>
    `;
        }
        onClick(d, index) {
            if (this.selected !== d.id) {
                this.selected = d.id;
                this.fireEvent('select', { data: d, index: index });
            }
        }
        updated() {
            if (this.shadowRoot) {
                const selectedNode = this.shadowRoot.querySelector('slick-card-list-item.selected');
                if (selectedNode) {
                    setTimeout(() => {
                        const sp = this.$('scrollPanel');
                        const rect = selectedNode.getBoundingClientRect();
                        const dx = rect.left + rect.width - (sp.offsetWidth + sp.scrollLeft);
                        if (dx > 0) {
                            sp.scrollLeft += dx + (rect.width / 2);
                        }
                    }, 100);
                }
                this.updateScrollPosition();
            }
        }
        updateScrollPosition() {
            if (!this.scrollPending) {
                this.scrollPending = true;
                setTimeout(() => {
                    const sp = this.$('scrollPanel');
                    const w = sp.getBoundingClientRect().width;
                    const sl = sp.scrollLeft;
                    const sw = sp.scrollWidth;
                    if ((sl + w) >= sw) {
                        this.$('chevR').classList.add('hidden');
                    }
                    else {
                        this.$('chevR').classList.remove('hidden');
                    }
                    if (sl > 0) {
                        this.$('chevL').classList.remove('hidden');
                    }
                    else {
                        this.$('chevL').classList.add('hidden');
                    }
                    this.scrollPending = false;
                }, 300);
            }
        }
        scrollListTo(sp, left) {
            if (sp.scrollTo) {
                sp.scrollTo({
                    top: 0,
                    left: left,
                    behavior: 'smooth'
                });
            }
            else {
                sp.scrollLeft = left;
            }
        }
        scrollNext() {
            const sp = this.$('scrollPanel');
            const w = sp.getBoundingClientRect().width;
            this.scrollListTo(sp, sp.scrollLeft + w - 80);
        }
        scrollPrev() {
            const sp = this.$('scrollPanel');
            const w = sp.getBoundingClientRect().width;
            this.scrollListTo(sp, Math.max(0, sp.scrollLeft - w + 80));
        }
    };
    __decorate$y([
        property(),
        __metadata$w("design:type", Array)
    ], SlickCardList.prototype, "data", void 0);
    __decorate$y([
        property(),
        __metadata$w("design:type", Object)
    ], SlickCardList.prototype, "selected", void 0);
    SlickCardList = __decorate$y([
        element('slick-card-list')
    ], SlickCardList);

    var __decorate$z = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$x = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let BrowsePageListItem = class BrowsePageListItem extends GuildElement {
        constructor() {
            super(...arguments);
            this.favs = true;
            this.favIcon = 'heart';
            this.widget = 'explore';
        }
        render() {
            if (!this.page) {
                return html ``;
            }
            const publishDate = this.page.at ? ((new Date(this.page.at)).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })) : '';
            return html `
    <style>
      .pageDescription {
        font-size: 13px;
        opacity: 0.7;
      }
      .pageName {
        font-size: 18px;
        font-weight: 300;
        margin-bottom: 8px;
        opacity: 0.8;
        letter-spacing: 0.25px;
        display: block;
        color: inherit;
        text-decoration: none;
      }
      .hidden {
        display: none !important;
      }
      .favCell {
        display: inline-block;
        text-align: center;
        margin-left: -10px;
      }
      .favCount {
        color: var(--slick-discovery-highlight-color, #2196f3);
        font-size: 12px;
        font-family: sans-serif;
        line-height: 1;
      }
      .date {
        opacity: 0.5;
        font-size: 12px;
        margin-bottom: 5px;
        font-weight: 400;
      }
      soso-icon-button {
        color: var(--slick-discovery-highlight-color, #2196f3);
      }

      @media(hover:hover) {
        .pageName:hover {
          color: var(--slick-discovery-highlight-color, #2196f3);
        }
      }
    </style>
    <div class="date">${publishDate}</div>
    <a href="${this.page.url}" class="pageName" @click="${() => this.onNav(this.page.url)}">${this.page.title || ''}</a>
    <div class="pageDescription">${this.page.description || ''}</div>
    <div class="favContainer${this.favs ? '' : ' hidden'}">
      <div class="favCell">
        <soso-icon-button
          .icon="${this.favIcon}${this.page.isFavorite ? '' : '-outline'}"
          title="${this.page.isFavorite ? 'In your favorites' : 'Add to favorites'}"
          @click="${this.toggleFav}"></soso-icon-button>
        <div class="favCount">${this.page.totalFavorites}</div>
      </div>
    </div>
    `;
        }
        toggleFav() {
            if (this.page) {
                if (this.page.isFavorite) {
                    core.removeFavorite(this.page.id);
                    this.page.totalFavorites--;
                }
                else {
                    core.addHearts(1, this.page.id);
                    this.page.totalFavorites++;
                }
                this.page.isFavorite = !this.page.isFavorite;
                this.requestUpdate();
            }
        }
        onNav(href) {
            core.widgetAction(this.widget, 'nav', 0, href);
        }
    };
    __decorate$z([
        property(),
        __metadata$x("design:type", Object)
    ], BrowsePageListItem.prototype, "page", void 0);
    __decorate$z([
        property(),
        __metadata$x("design:type", Object)
    ], BrowsePageListItem.prototype, "favs", void 0);
    __decorate$z([
        property(),
        __metadata$x("design:type", String)
    ], BrowsePageListItem.prototype, "favIcon", void 0);
    __decorate$z([
        property(),
        __metadata$x("design:type", String)
    ], BrowsePageListItem.prototype, "widget", void 0);
    BrowsePageListItem = __decorate$z([
        element('browse-page-list-item')
    ], BrowsePageListItem);

    var __decorate$A = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$y = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    let BrowsePageList = class BrowsePageList extends GuildElement {
        constructor() {
            super(...arguments);
            this.pages = [];
            this.maxImageWidth = 550;
            this.favs = true;
            this.favIcon = 'heart';
            this.widget = 'explore';
        }
        render() {
            return html `
    ${flexStyles}
    <style>
      :host {
        display: block;
        text-align: center;
      }
      .pageItem.horizontal.layout {
        display: -ms-inline-flexbox;
        display: -webkit-inline-flex;
        display: inline-flex;
        box-sizing: border-box;
        max-width: 100%;
        vertical-align: middle;
        text-align: left;
        padding: 50px;
      }
      .textCell {
        width: 180px;
        padding: 10px 0 10px 16px;
        box-sizing: border-box;
      }
      .imageCell {
        background-color: transparent;
        background-size: cover;
        background-origin: border-box;
        background-position: 50% 50%;
        border-radius: 10px;
        box-shadow: 0 16px 24px 2px rgba(0, 0, 0, 0.14), 0 6px 30px 5px rgba(0, 0, 0, 0.12), 0 8px 10px -5px rgba(0, 0, 0, 0.4);
        overflow: hidden;
        transition: transform 0.3s ease;
      }
      .hidden {
        display: none !important;
      }
      a, a:hover, a:visited {
        outline: none;
        cursor: pointer;
        text-decoration: none;
        color: inherit;
        border: none;
      }

      @media (max-width: 1680px) {
        .pageItem.horizontal.layout {
          padding: 45px;
        }
      }

      @media (max-width: 1200px) {
        .pageItem.horizontal.layout {
          padding: 35px;
        }
      }

      @media (max-width: 1480px) {
        .pageItem.horizontal.layout {
          padding: 25px;
        }
      }

      @media (max-width: 700px) {
        .pageItem.horizontal.layout {
          padding: 12px;
        }
      }

      @media (max-width: 600px) {
        .pageItem.horizontal.layout {
          padding: 16px 10px;
          display: -ms-flexbox;
          display: -webkit-flex;
          display: flex;
          -ms-flex-align: unset;
          -webkit-align-items: unset;
          align-items: unset;
        }
        .pageName {
          font-size: 15px;
        }
        .pageDescription {
          font-size: 11px;
        }
      }

      @media (hover: hover) {
        .imageCell:hover {
          transform: translateY(-15px) scale(1.05);
        }
      }
    </style>
    ${repeat(this.pages, (d) => d.id, (d) => {
            const imageUrl = d.imageUrl || '';
            let imw = 0;
            let imh = 0;
            let imageStyle = '';
            if (imageUrl && d.imageWidth && d.imageHeight) {
                imw = Math.min(this.maxImageWidth, d.imageWidth);
                imh = (d.imageHeight / d.imageWidth) * imw;
                if (this.maxImageWidth > 250) {
                    imh = ((Math.random() * 0.4) + 0.7) * imh;
                    imw = ((Math.random() * 0.4) + 0.7) * imw;
                    imageStyle = `width: ${imw}px; height: ${imh}px; background-image: url(${imageUrl});`;
                }
                else {
                    imageStyle = `width: 40%; background-image: url(${imageUrl});`;
                }
            }
            let cardStyle = 'vertical-align: middle;';
            const rand = Math.random();
            if (rand < 0.25) {
                cardStyle = 'vertical-align: top';
            }
            else if (rand < 0.5) {
                cardStyle = 'vertical-align: bottom';
            }
            else if (rand < 0.75) {
                cardStyle = 'vertical-align: baseline';
            }
            return html `
      <div class="horizontal layout center pageItem" style="${cardStyle}">
        <a href="${d.url}" class="${imageUrl ? 'imageCell' : 'hidden'}" style="${imageStyle}" @click="${() => this.onNav(d.url)}"></a>
        <div class="textCell">
          <browse-page-list-item .page="${d}" .favs="${this.favs}" .favIcon="${this.favIcon}" .widget="${this.widget}"></browse-page-list-item>
        </div>
      </div>
    `;
        })}
    `;
        }
        firstUpdated() {
            this.adjustMaxCellSize();
            window.addEventListener('resize', () => this.adjustMaxCellSize());
        }
        adjustMaxCellSize() {
            const w = window.innerWidth;
            if (w <= 600) {
                this.maxImageWidth = 240;
            }
            else if (w <= 1200) {
                this.maxImageWidth = 280;
            }
            else if (w <= 1450) {
                this.maxImageWidth = 360;
            }
            else if (w <= 1680) {
                this.maxImageWidth = 440;
            }
            else {
                this.maxImageWidth = 550;
            }
        }
        onNav(href) {
            core.widgetAction(this.widget, 'nav', 0, href);
        }
    };
    __decorate$A([
        property(),
        __metadata$y("design:type", Array)
    ], BrowsePageList.prototype, "pages", void 0);
    __decorate$A([
        property(),
        __metadata$y("design:type", Object)
    ], BrowsePageList.prototype, "maxImageWidth", void 0);
    __decorate$A([
        property(),
        __metadata$y("design:type", Object)
    ], BrowsePageList.prototype, "favs", void 0);
    __decorate$A([
        property(),
        __metadata$y("design:type", String)
    ], BrowsePageList.prototype, "favIcon", void 0);
    __decorate$A([
        property(),
        __metadata$y("design:type", String)
    ], BrowsePageList.prototype, "widget", void 0);
    BrowsePageList = __decorate$A([
        element('browse-page-list')
    ], BrowsePageList);

    var __decorate$B = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$z = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    const GRAYS = ['#fafafa', '#f5f5f5', '#eeeeee', '#e0e0e0', '#bdbdbd'];
    let SlickBrowseView = class SlickBrowseView extends GuildElement {
        constructor() {
            super(...arguments);
            this.loading = false;
            this.categoryRows = [];
            this.pages = [];
            this.exploreSupported = true;
            this.favsSupported = true;
            this.favIcon = 'heart';
            this.topTabs = [];
            this.widget = 'explore';
            this.browseStyle = 'image-layout';
            this.noneText = '';
            this.selectedTopTab = 'explore';
            this.impressionFired = new Set();
        }
        render() {
            return html `
    ${flexStyles}
    <style>
      :host {
        display: block;
      }
      browse-page-list {
        padding: 40px 0px;
        text-align: center;
      }
      #loading {
        padding: 16px;
        letter-spacing: 1.25px;
        font-size: 15px;
        text-align: center;
      }
      .hidden {
        display: none !important;
      }
      powered-by {
        color: var(--slick-discovery-highlight-color, #2196f3);
      }
      #branding {
        padding: 80px 0 100px;
        text-align: center;
      }
      #noMatches {
        font-size: 13px;
        color: var(--slick-discovery-color, #000);
        text-align: center;
        padding: 16px;
      }
      discovery-list-view {
        margin-top: 20px;
      }
    </style>
    <slick-card-list id="topTabs" .data="${this.topTabs}" .selected="${this.selectedTopTab}" @select="${this.onTabSet}"></slick-card-list>
    ${repeat(this.categoryRows, (d) => d.id, (d, i) => {
            const style = `background: ${GRAYS[i % GRAYS.length]};`;
            const selected = d.selectedIndex < 0 ? '' : d.groups[d.selectedIndex].id;
            const data = d.groups.map((item) => {
                return {
                    id: item.id,
                    label: item.name,
                    image: item.pageId ? core.thumbnailByPageId(item.pageId, 120, 50) : undefined
                };
            });
            return html `<slick-card-list style="${style}" .data="${data}" .selected="${selected}" @select="${(event) => this.onCategorySelect(event.detail.index, i)}"></slick-card-list>`;
        })}
    <div id="loading" class="${this.loading ? '' : 'hidden'}">${core.phrase('loading')}</div>
    <browse-page-list class="${(this.loading || this.browseStyle === 'list') ? 'hidden' : ''}" .pages="${this.pages}" .favIcon="${this.favIcon}" .favs="${this.favsSupported}" .widget="${this.widget}"></browse-page-list>
    <discovery-list-view class="${this.loading || this.browseStyle !== 'list' ? 'hidden' : ''}" .hideBranding="${true}" .pages="${this.pages}" .noMatchesText="${''}" @nav="${this.onNav}"></discovery-list-view>
    <div id="noMatches" class="${this.pages.length ? 'hidden' : ''}">${this.noneText}</div>
    <div id="branding">
      <powered-by></powered-by>
    </div>
    `;
        }
        onNav(event) {
            core.widgetAction(this.widget, 'nav', 0, event.detail.href);
        }
        onTabSet(event) {
            this.selectedTopTab = event.detail.data.id;
            this.reset();
        }
        async reset() {
            this.noneText = '';
            this.categoryRows = [];
            this.pages = [];
            this.loading = true;
            try {
                const session = core.session;
                if (!session) {
                    return;
                }
                this.browseStyle = session.browseStyle || 'image-layout';
                this.favIcon = session.favoriteIconType;
                this.favsSupported = session.enableFavorites;
                this.exploreSupported = session.enableBrowse;
                const TABS = [
                    {
                        id: 'explore',
                        label: core.phrase('explore')
                    },
                    {
                        id: 'related',
                        label: core.phrase('related')
                    },
                    {
                        id: 'popular',
                        label: core.phrase('popular')
                    },
                    {
                        id: 'latest',
                        label: core.phrase('latest')
                    }
                ];
                if (this.exploreSupported) {
                    this.topTabs = TABS;
                }
                else {
                    if (this.selectedTopTab === 'explore') {
                        this.selectedTopTab = 'related';
                    }
                    this.topTabs = TABS.slice(1);
                }
                switch (this.selectedTopTab) {
                    case 'explore': {
                        const bstart = await core.browseStart();
                        this.categoryRows = (bstart.rows || []).map((d) => {
                            d.id = `${Date.now()}`;
                            return d;
                        });
                        this.pages = bstart.pages || [];
                        this.widget = 'explore';
                        break;
                    }
                    case 'related':
                        if (!this.relatedList) {
                            this.relatedList = await core.getRelated();
                        }
                        this.noneText = core.phrase('no-related-content');
                        this.pages = this.relatedList;
                        this.widget = 'related';
                        break;
                    case 'latest':
                        if (!this.latestList) {
                            this.latestList = await core.getLatest();
                        }
                        this.pages = this.latestList;
                        this.widget = 'latest';
                        break;
                    case 'popular':
                        if (!this.popularList) {
                            this.popularList = await core.getPopular();
                        }
                        this.pages = this.popularList;
                        this.widget = 'popular';
                        break;
                }
                if (!this.impressionFired.has(this.selectedTopTab)) {
                    this.impressionFired.add(this.selectedTopTab);
                    core.widgetAction(this.widget, 'impression', 0);
                }
            }
            catch (err) {
                console.error(err);
                this.pages = [];
            }
            this.loading = false;
        }
        async onCategorySelect(selectedIndex, categoryIndex) {
            this.loading = true;
            try {
                this.categoryRows[categoryIndex].selectedIndex = selectedIndex;
                const selectionCategories = [];
                for (let i = 0; i <= categoryIndex; i++) {
                    selectionCategories.push(this.categoryRows[i].groups[this.categoryRows[i].selectedIndex].id);
                }
                if (selectionCategories.length) {
                    const response = await core.browseChange(selectionCategories);
                    this.categoryRows.splice(categoryIndex + 1);
                    response.rows.forEach((d) => {
                        d.id = `${Date.now()}`;
                        this.categoryRows.push(d);
                    });
                    this.pages = response.pages || [];
                }
                core.widgetAction(this.widget, 'select', 0, undefined, undefined, { keywords: selectionCategories });
            }
            catch (err) {
                console.error(err);
                this.pages = [];
            }
            this.loading = false;
        }
    };
    __decorate$B([
        property({ type: Boolean }),
        __metadata$z("design:type", Object)
    ], SlickBrowseView.prototype, "loading", void 0);
    __decorate$B([
        property(),
        __metadata$z("design:type", Array)
    ], SlickBrowseView.prototype, "categoryRows", void 0);
    __decorate$B([
        property(),
        __metadata$z("design:type", Array)
    ], SlickBrowseView.prototype, "pages", void 0);
    __decorate$B([
        property(),
        __metadata$z("design:type", Object)
    ], SlickBrowseView.prototype, "exploreSupported", void 0);
    __decorate$B([
        property(),
        __metadata$z("design:type", Object)
    ], SlickBrowseView.prototype, "favsSupported", void 0);
    __decorate$B([
        property(),
        __metadata$z("design:type", String)
    ], SlickBrowseView.prototype, "favIcon", void 0);
    __decorate$B([
        property(),
        __metadata$z("design:type", Array)
    ], SlickBrowseView.prototype, "topTabs", void 0);
    __decorate$B([
        property(),
        __metadata$z("design:type", String)
    ], SlickBrowseView.prototype, "widget", void 0);
    __decorate$B([
        property(),
        __metadata$z("design:type", String)
    ], SlickBrowseView.prototype, "browseStyle", void 0);
    SlickBrowseView = __decorate$B([
        element('slick-browse-view')
    ], SlickBrowseView);

    var __decorate$C = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$A = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    const WIDGET$4 = 'discovery';
    let SlickDiscovery = class SlickDiscovery extends GuildElement {
        constructor() {
            super(...arguments);
            this.currentTab = 'search';
            this.showFavs = false;
            this.online = true;
            this.showing = false;
            this.openListener = this.onOpen.bind(this);
            this.keydownListener = this.onKeydown.bind(this);
        }
        render() {
            return html `
    ${flexStyles}
    <style>
      :host {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        z-index: var(--slick-discovery-zindex, var(--slick-toolbar-zindex, 200002));
        display: none;
      }
      .fillContainer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }
      #glassPane {
        background: var(--slick-discovery-bgcolor, rgba(255,255,255,1));
        opacity: 0;
        transition: opacity 0.3s ease-in;
      }
      #mainPanel {
        opacity: 0;
        transform: translate3d(0,100px,0);
        transition: opacity 0.3s ease, transform 0.3s ease;
        color: var(--slick-discovery-color, #000);
      }
      x-icon {
        color: var(--slick-discovery-highlight-color, #2196f3);
      }
      #mainPanel.showing {
        opacity: 1;
        transform: none;
      }
      #header {
        padding: 0 12px;
        position: relative;
      }
      #headerContent {
        box-sizing: border-box;
      }
      #btnClose {
        padding: 3px;
        border: 3px solid;
        border-radius: 50%;
        margin: 0 20px 0 0;
        width: 28px;
        height: 28px;
        cursor: pointer;
      }
      button.tab {
        font-family: inherit;
        text-transform: uppercase;
        background: none;
        font-size: 14px;
        border: none;
        outline: none;
        padding: 8px;
        letter-spacing: 0.05em;
        line-height: 1;
        cursor: pointer;
        border-radius: 0;
        margin-right: 8px;
        color: inherit;
      }
      button.tab.selected {
        background: var(--slick-discovery-highlight-color, #2196f3);
        color: var(--slick-discovery-bgcolor, rgba(255,255,255,1));
        border-radius: 3px;
      }
      button.tab:hover {
        box-shadow: 0 2px var(--slick-discovery-highlight-color, #2196f3);
      }
      button.tab.selected:hover {
        box-shadow: none;
      }
      .toolbar {
        padding: 8px 0;
        min-height: 40px;
      }
      .toolbar2 {
        padding: 4px 0 12px 0;
        max-width: 800px;
        margin: 0 auto;
      }
      .hidden {
        display: none !important;
      }
      .toolbar label {
        display: none;
      }
      .toolbar label span {
        text-transform: uppercase;
        font-size: 13px;
        color: white;
        padding: 5px;
        border-radius: 2px;
        background: #aaa;
        letter-spacing: 1.5px;
      }
      .toolbar.offline label {
        text-align: center;
        display: block;
      }
      .toolbar.offline button {
        display: none;
      }
      .scrollPanel {
        overflow: hidden;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        position: relative;
      }

      @media (max-width: 600px) {
        button.tab {
          padding: 8px 5px;
          letter-spacing: initial;
          margin-right: 5px;
        }
      }

      @media (max-width: 370px) {
        button.tab {
          padding: 8px 7px;
          letter-spacing: initial;
          margin-right: 0px;
          font-size: 12px;
        }
        #header {
          padding: 0 6px;
        }
        #btnClose {
          margin: 0 10px 0 0;
        }
      }
    </style>
    <div id="glassPane" class="fillContainer"></div>
    <div id="mainPanel" class="fillContainer vertical layout">
      <div id="header">
        <div id="headerContent">
          <div class="toolbar horizontal layout center${this.online ? '' : ' offline'}">
            <x-icon id="btnClose" icon="back" @click="${this.closePanel}"></x-icon>
            <button class="tab${this.currentTab === 'search' ? ' selected' : ''}" @click="${() => this.setTab('search')}">${core.phrase('search')}</button>
            <button class="tab${this.currentTab === 'favorites' ? ' selected' : ''}${this.showFavs ? '' : ' hidden'}" @click="${() => this.setTab('favorites')}">${core.phrase('favorites')}</button>
            <button class="tab${this.currentTab === 'browse' ? ' selected' : ''}" @click="${() => this.setTab('browse')}">${core.phrase('browse')}</button>
            <label class="flex"><span>${core.phrase('offline')}</span></label>
          </div>
          <div class="toolbar2">
            <slick-search-toolbar 
              .searchConfig="${this.embedInfo && this.embedInfo.search}"
              @clear="${() => this.searchView.search('')}"
              @search="${(e) => this.searchView.search(e.detail.text || '')}"
              @close="${this.closePanel}"
              class="${this.currentTab === 'search' ? '' : 'hidden'}"></slick-search-toolbar>
            <slick-favorites-toolbar @update="${this.onFavoritesUpdate}" class="${this.currentTab === 'favorites' ? '' : 'hidden'}"></slick-favorites-toolbar>
          </div>
        </div>
      </div>
      <div class="flex scrollPanel">
        <slick-search-view 
          .searchConfig="${this.embedInfo && this.embedInfo.search}" 
          class="${this.currentTab === 'search' ? '' : 'hidden'}"></slick-search-view>
        <slick-favorites-view class="${this.currentTab === 'favorites' ? '' : 'hidden'}"></slick-favorites-view>
        <slick-browse-view class="${this.currentTab === 'browse' ? '' : 'hidden'}"></slick-browse-view>
      </div>
    </div>
    `;
        }
        connectedCallback() {
            super.connectedCallback();
            document.addEventListener('slick-show-search', this.openListener);
            document.addEventListener('slick-show-discovery', this.openListener);
        }
        disconnectedCallback() {
            super.disconnectedCallback();
            document.removeEventListener('slick-show-search', this.openListener);
            document.removeEventListener('slick-show-discovery', this.openListener);
            this.removeKeyListener();
        }
        firstUpdated() {
            bus.subscribe('socked-closed', () => {
                this.refreshOnlineState();
            });
            bus.subscribe('session-updated', () => {
                this.refreshOnlineState();
            });
            this.refreshOnlineState();
        }
        refreshOnlineState() {
            this.online = core.isConnected();
        }
        removeKeyListener() {
            document.removeEventListener('keydown', this.keydownListener);
        }
        addKeyListner() {
            this.removeKeyListener();
            document.addEventListener('keydown', this.keydownListener);
        }
        onKeydown(event) {
            if (this.showing && event.keyCode === 27) {
                this.closePanel();
            }
        }
        async onOpen(event) {
            const detail = event.detail;
            this.currentTab = (detail && detail.page) || 'search';
            this.showFavs = (core.session).enableFavorites;
            await this.openPanel();
            this.refreshTab();
        }
        setTab(tab) {
            if (this.currentTab !== tab) {
                this.currentTab = tab;
                this.refreshTab();
            }
        }
        refreshTab() {
            switch (this.currentTab) {
                case 'search':
                    if (this.searchToolbar) {
                        this.searchToolbar.clearText();
                        this.searchView.search('');
                        setTimeout(() => {
                            if (this.showing) {
                                this.searchToolbar.focus();
                            }
                        });
                    }
                    break;
                case 'favorites':
                    if (this.showing) {
                        this.favoritesView.reset();
                        this.favoriteToolbar.reset();
                    }
                    break;
                case 'browse':
                    if (this.showing) {
                        this.browseView.reset();
                    }
                    break;
            }
        }
        onFavoritesUpdate() {
            this.favoritesView.reset();
        }
        async openPanel() {
            return new Promise((resolve) => {
                this.style.display = 'block';
                document.body.style.overflow = 'hidden';
                document.documentElement.style.overflow = 'hidden';
                setTimeout(() => {
                    if (this.showing) {
                        this.$('glassPane').style.opacity = '1';
                        this.$('mainPanel').classList.add('showing');
                    }
                    setTimeout(() => resolve());
                }, 16);
                this.showing = true;
                core.widgetAction(WIDGET$4, 'impression', 0);
                this.addKeyListner();
                bus.dispatch('disocvery-open');
            });
        }
        async closePanel() {
            return new Promise((resolve) => {
                this.$('glassPane').style.opacity = '0';
                this.$('mainPanel').classList.remove('showing');
                setTimeout(() => {
                    if (!this.showing) {
                        this.style.display = '';
                        setTimeout(() => {
                            if (!this.showing) {
                                document.body.style.overflow = null;
                                document.documentElement.style.overflow = null;
                            }
                            setTimeout(() => resolve());
                        });
                    }
                }, 310);
                this.showing = false;
                core.widgetAction(WIDGET$4, 'clear', 0);
                this.removeKeyListener();
                bus.dispatch('disocvery-close');
            });
        }
    };
    __decorate$C([
        property(),
        __metadata$A("design:type", String)
    ], SlickDiscovery.prototype, "currentTab", void 0);
    __decorate$C([
        property(),
        __metadata$A("design:type", Object)
    ], SlickDiscovery.prototype, "showFavs", void 0);
    __decorate$C([
        property(),
        __metadata$A("design:type", Object)
    ], SlickDiscovery.prototype, "online", void 0);
    __decorate$C([
        query('slick-search-view '),
        __metadata$A("design:type", SlickSearchView)
    ], SlickDiscovery.prototype, "searchView", void 0);
    __decorate$C([
        query('slick-search-toolbar'),
        __metadata$A("design:type", SlickSearchToolbar)
    ], SlickDiscovery.prototype, "searchToolbar", void 0);
    __decorate$C([
        query('slick-favorites-view'),
        __metadata$A("design:type", SlickFavortiesView)
    ], SlickDiscovery.prototype, "favoritesView", void 0);
    __decorate$C([
        query('slick-browse-view'),
        __metadata$A("design:type", SlickBrowseView)
    ], SlickDiscovery.prototype, "browseView", void 0);
    __decorate$C([
        query('slick-favorites-toolbar'),
        __metadata$A("design:type", SlickFavoritesToolbar)
    ], SlickDiscovery.prototype, "favoriteToolbar", void 0);
    SlickDiscovery = __decorate$C([
        element('slick-discovery')
    ], SlickDiscovery);

    var __decorate$D = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$B = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    const WIDGET$5 = 'search-button';
    let SlickSearchButton = class SlickSearchButton extends GuildElement {
        render() {
            const type = (this.config && this.config.buttonType) || 'box-right-icon';
            let buttonClass = 'hidden';
            switch (type) {
                case 'box-left-icon':
                    buttonClass = 'lefticon';
                    break;
                case 'box-right-icon':
                    buttonClass = 'righticon';
                    break;
                case 'box-no-icon':
                    buttonClass = 'noicon';
                    break;
                default:
                    buttonClass = 'hidden';
                    break;
            }
            return html `
    ${flexStyles}
    <style>
      :host {
        display: inline-block;
        cursor: pointer;
        background: #f4f4f5;
        outline: none;
        width: 140px;
        height: 36px;
        padding: 2px 8px;
        box-sizing: border-box;
        font-size: 13px;
      }
      .hidden {
        display: none !important;
      }
      #innerPanel {
        height: 100%;
      }
      #innerPanel.noicon soso-icon {
        display: none;
      }
      #innerPanel.righticon soso-icon {
        margin-left: 10px;
      }
      #innerPanel.lefticon soso-icon {
        margin-right: 10px;
      }
      #innerPanel.lefticon {
        -ms-flex-direction: row-reverse;
        -webkit-flex-direction: row-reverse;
        flex-direction: row-reverse;
      }
      soso-icon {
        width: var(--slick-search-button-icon-size, 24px);
        height: var(--slick-search-button-icon-size, 24px);
        color: var(--slick-search-button-icon-color, currentColor);
      }
    </style>
    <div id="innerPanel" class="horizontal layout center ${buttonClass}">
      <span class="flex">${(this.config && this.config.placeholder) || ''}</span>
      <soso-icon icon="search"></soso-icon>
    </div>
    `;
        }
        firstUpdated() {
            this.addEventListener('click', () => {
                core.widgetAction(WIDGET$5, 'open-search', 0);
                document.dispatchEvent(SlickCustomEvent('slick-show-search'));
            });
        }
    };
    __decorate$D([
        property(),
        __metadata$B("design:type", Object)
    ], SlickSearchButton.prototype, "config", void 0);
    SlickSearchButton = __decorate$D([
        element('slick-search-button')
    ], SlickSearchButton);

    var __decorate$E = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata$C = (undefined && undefined.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    const WIDGET$6 = 'search-button';
    let SlickSearchIconButton = class SlickSearchIconButton extends GuildElement {
        render() {
            return html `
    ${flexStyles}
    <style>
      :host {
        display: inline-block;
        cursor: pointer;
        background: #f4f4f5;
        outline: none;
        width: 36px;
        height: 36px;
        padding: 4px;
        box-sizing: border-box;
        border-radius: 50%;
      }
      #innerPanel {
        height: 100%;
      }
      soso-icon {
        width: var(--slick-search-button-icon-size, 24px);
        height: var(--slick-search-button-icon-size, 24px);
        color: var(--slick-search-button-icon-color, currentColor);
      }
    </style>
    <div id="innerPanel" class="horizontal layout center">
      <div class="flex"></div>
      <soso-icon icon="search"></soso-icon>
      <div class="flex"></div>
    </div>
    `;
        }
        firstUpdated() {
            this.addEventListener('click', () => {
                core.widgetAction(WIDGET$6, 'open-search', 0);
                document.dispatchEvent(SlickCustomEvent('slick-show-search'));
            });
        }
    };
    __decorate$E([
        property(),
        __metadata$C("design:type", Object)
    ], SlickSearchIconButton.prototype, "config", void 0);
    SlickSearchIconButton = __decorate$E([
        element('slick-search-icon-button')
    ], SlickSearchIconButton);

    const WIDGET_CLASSES = {
        filmStrip: 'slick-film-strip',
        linkPopup: 'slick-link-popup',
        carousel: 'slick-next-up',
        searchButton: 'slick-search-button'
    };

    function selectorInject(embedInfo, omitWidgetTypes, callback) {
        if (omitWidgetTypes.indexOf('filmstrip') < 0) {
            if (embedInfo.filmstrips && embedInfo.filmstrips.length) {
                embedInfo.filmstrips.forEach((d) => {
                    inject(d, WIDGET_CLASSES.filmStrip, d).then((count) => callback(count));
                });
            }
            else if (embedInfo.filmStrip) {
                inject(embedInfo.filmStrip, WIDGET_CLASSES.filmStrip, embedInfo.filmStrip).then((count) => callback(count));
            }
        }
        if (omitWidgetTypes.indexOf('nextup') < 0) {
            if (embedInfo.carousels && embedInfo.carousels.length) {
                embedInfo.carousels.forEach((d) => {
                    inject(d, WIDGET_CLASSES.carousel, d).then((count) => callback(count));
                });
            }
            else if (embedInfo.carousel) {
                inject(embedInfo.carousel, WIDGET_CLASSES.carousel, embedInfo.carousel).then((count) => callback(count));
            }
        }
        if (omitWidgetTypes.indexOf('search-button') < 0) {
            if (embedInfo.searchButtons && embedInfo.searchButtons.length) {
                embedInfo.searchButtons.forEach((d) => {
                    inject(d, WIDGET_CLASSES.searchButton, d).then((count) => callback(count));
                });
            }
            else if (embedInfo.searchButton) {
                inject(embedInfo.searchButton, WIDGET_CLASSES.searchButton, embedInfo.searchButton).then((count) => callback(count));
            }
        }
    }
    async function inject(widgetInfo, widgetClass, config) {
        const nodes = await findWidget(widgetInfo.selector, 0);
        if (nodes && nodes.length) {
            for (const node of nodes) {
                const div = document.createElement('div');
                div.classList.add(widgetClass);
                div.slickWidgetConfig = config;
                switch (widgetInfo.position) {
                    case 'after selector':
                        node.insertAdjacentElement('afterend', div);
                        break;
                    case 'before selector':
                        node.insertAdjacentElement('beforebegin', div);
                        break;
                    case 'first child of selector':
                        node.insertAdjacentElement('afterbegin', div);
                        break;
                    case 'last child of selector':
                        node.insertAdjacentElement('beforeend', div);
                        break;
                }
            }
            return nodes.length;
        }
        return 0;
    }
    async function findWidget(selector, count) {
        const ret = [];
        if ((!selector) || (count > 8)) {
            return ret;
        }
        const nodes = document.querySelectorAll(selector);
        if (nodes && nodes.length) {
            for (let i = 0; i < nodes.length; i++) {
                ret.push(nodes[i]);
            }
            return ret;
        }
        await wait(1000);
        return findWidget(selector, count + 1);
    }
    async function wait(delay) {
        return new Promise((resolve) => {
            window.setTimeout(() => resolve(), delay);
        });
    }

    window[MAP_REF] = {
        close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
        check: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
        menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
        add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
        edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
        'checkbox-filled': 'M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
        'checkbox-unfilled': 'M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z',
        'radio-unchecked': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z',
        'radio-checked': 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z',
        search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
        openTab: 'M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
        'chevron-left': 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z',
        'chevron-right': 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
        description: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
        split: 'M14 4l2.29 2.29-2.88 2.88 1.42 1.42 2.88-2.88L20 10V4zm-4 0H4v6l2.29-2.29 4.71 4.7V20h2v-8.41l-5.29-5.3z',
        explore: 'M19,2 L5,2 C3.9,2 3,2.9 3,4 L3,18 C3,19.1 3.9,20 5,20 L9,20 L12,23 L15,20 L19,20 C20.1,20 21,19.1 21,18 L21,4 C21,2.9 20.1,2 19,2 L19,2 Z M13.88,12.88 L12,17 L10.12,12.88 L6,11 L10.12,9.12 L12,5 L13.88,9.12 L18,11 L13.88,12.88 L13.88,12.88 Z',
        more: 'M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z',
        'more-vert': 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
        'message-full': 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 14H6v-2h2v2zm0-3H6V9h2v2zm0-3H6V6h2v2zm7 6h-5v-2h5v2zm3-3h-8V9h8v2zm0-3h-8V6h8v2z',
        message: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z',
        back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
        qa: 'M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z',
        lightbulb: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z',
        org: 'M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z',
        heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
        'heart-outline': 'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z',
        star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
        'star-outline': 'M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z',
        list: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
        delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
        clone: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
        download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
        upload: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
    };
    iconMap.define(window[MAP_REF]);

    const currentScript = document.currentScript || (function () {
        const scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
    })();
    const currentScriptUrl = (currentScript && currentScript.src) || '';
    class GuildEmbed {
        constructor() {
            this.processedNodes = new Set();
            this.cssInjected = false;
            this.linkHighlighterAdded = false;
            this.engagementHandler = (event) => core.onEngagement(event);
            this.pageStamped = false;
            core.scriptUrl = currentScriptUrl;
        }
        async start() {
            if (!this.session) {
                this.session = await core.ensureSession();
                this.attachEngagementEvents();
                this.initializeWidgets();
                this.stampPage();
            }
        }
        initializeWidgets() {
            if (this.session && this.session.activate) {
                const omitWidgetTypes = [];
                if (this.session && this.session.directives) {
                    for (const directive of this.session.directives) {
                        if (directive.type === 'hide-widgets') {
                            const data = directive.data;
                            if (data && data.widgetTypes) {
                                for (const wt of data.widgetTypes) {
                                    omitWidgetTypes.push(wt);
                                }
                            }
                        }
                    }
                }
                selectorInject(this.session.configuration, omitWidgetTypes, (count) => {
                    if (count) {
                        this.doEmbed(omitWidgetTypes);
                    }
                });
                this.doEmbed(omitWidgetTypes);
                this.injectCSS();
            }
        }
        injectCSS() {
            if (this.cssInjected) {
                return;
            }
            if (this.session) {
                this.cssInjected = true;
                this.injectCSSNode(this.session.css);
                const si = this.session.configuration;
                if (si) {
                    this.injectCSSNode(si.css);
                    if (si.filmStripToolbar) {
                        this.injectCSSNode(si.filmStripToolbar.css);
                    }
                    if (si.linkHighlighter) {
                        this.injectCSSNode(si.linkHighlighter.css);
                    }
                    if (si.explorer) {
                        this.injectCSSNode(si.explorer.css);
                    }
                    if (si.pilot) {
                        this.injectCSSNode(si.pilot.css);
                    }
                    if (si.greeting) {
                        this.injectCSSNode(si.greeting.css);
                    }
                    if (si.search) {
                        this.injectCSSNode(si.search.css);
                    }
                    if (si.heartbeat) {
                        this.injectCSSNode(si.heartbeat.css);
                    }
                    (si.filmstrips || []).forEach((d) => {
                        this.injectCSSNode(d.css);
                    });
                    (si.searchButtons || []).forEach((d) => {
                        this.injectCSSNode(d.css);
                    });
                    (si.carousels || []).forEach((d) => {
                        this.injectCSSNode(d.css);
                    });
                }
            }
        }
        injectCSSNode(css) {
            if (css && css.trim()) {
                const styleNode = document.createElement('style');
                styleNode.innerHTML = css;
                document.body.appendChild(styleNode);
            }
        }
        doEmbed(omitWidgetTypes) {
            const embedInfo = this.session && this.session.configuration;
            if (!embedInfo) {
                return;
            }
            let embedDiscovery = false;
            let nodes = null;
            // embed film strip
            if (omitWidgetTypes.indexOf('filmstrip')) {
                nodes = document.querySelectorAll(`.${WIDGET_CLASSES.filmStrip}`);
                if (nodes && nodes.length) {
                    for (let i = 0; i < nodes.length; i++) {
                        const n = nodes[i];
                        if (!this.processedNodes.has(n)) {
                            while (n.hasChildNodes() && n.lastChild) {
                                n.removeChild(n.lastChild);
                            }
                            const config = n.slickWidgetConfig || embedInfo.filmStrip || (embedInfo.filmstrips && embedInfo.filmstrips[0]) || {};
                            const strip = new NavFilmStrip();
                            strip.modeInfo = config;
                            n.appendChild(strip);
                            strip.siteCode = embedInfo.site;
                            strip.pageUrl = embedInfo.url || window.location.href;
                            strip.search = !!(config.search);
                            if (config.thumbnailSize) {
                                strip.thumbnailSize = config.thumbnailSize;
                            }
                            this.stampWidget(strip);
                            this.processedNodes.add(n);
                            if (strip.search) {
                                embedDiscovery = true;
                            }
                        }
                    }
                }
            }
            // embed carousel
            nodes = document.querySelectorAll(`.${WIDGET_CLASSES.carousel}`);
            if (nodes && nodes.length) {
                for (let i = 0; i < nodes.length; i++) {
                    const n = nodes[i];
                    if (!this.processedNodes.has(n)) {
                        while (n.hasChildNodes() && n.lastChild) {
                            n.removeChild(n.lastChild);
                        }
                        const config = n.slickWidgetConfig || embedInfo.carousel || (embedInfo.carousels && embedInfo.carousels[0]) || {};
                        const carousel = new SlickCarousel();
                        n.appendChild(carousel);
                        carousel.siteCode = embedInfo.site;
                        carousel.pageUrl = embedInfo.url || window.location.href;
                        if (config.label) {
                            carousel.label = config.label;
                        }
                        this.stampWidget(carousel);
                        this.processedNodes.add(n);
                        embedDiscovery = true;
                    }
                }
            }
            // embed search button
            nodes = document.querySelectorAll(`.${WIDGET_CLASSES.searchButton}`);
            if (nodes && nodes.length) {
                for (let i = 0; i < nodes.length; i++) {
                    const n = nodes[i];
                    if (!this.processedNodes.has(n)) {
                        while (n.hasChildNodes() && n.lastChild) {
                            n.removeChild(n.lastChild);
                        }
                        const config = n.slickWidgetConfig || embedInfo.searchButton || (embedInfo.searchButtons && embedInfo.searchButtons[0]) || {};
                        const button = (config.buttonType === 'icon' || config.buttonType === 'fab') ? new SlickSearchIconButton() : new SlickSearchButton();
                        n.appendChild(button);
                        button.config = config;
                        this.stampWidget(button);
                        this.processedNodes.add(n);
                        embedDiscovery = true;
                    }
                }
            }
            if (omitWidgetTypes.indexOf('pilot') < 0) {
                if (embedInfo.pilot && embedInfo.pilot.state === 'enabled') {
                    this.embedPilot(embedInfo);
                    embedDiscovery = true;
                }
            }
            if (omitWidgetTypes.indexOf('heartbeat') < 0) {
                if (this.session && this.session.currentPage && embedInfo.heartbeat && embedInfo.heartbeat.state === 'enabled') {
                    this.embedHeartbeat(embedInfo.heartbeat);
                    embedDiscovery = true;
                }
            }
            if (omitWidgetTypes.indexOf('filmstrip-toolbar') < 0) {
                if (embedInfo.filmStripToolbar && embedInfo.filmStripToolbar.state === 'enabled') {
                    this.embedFilmStripToolbar(embedInfo);
                    embedDiscovery = embedDiscovery || this.filmstripToolbar.search;
                }
            }
            if (omitWidgetTypes.indexOf('link-highlighter') < 0) {
                if (embedInfo.linkHighlighter && embedInfo.linkHighlighter.state === 'enabled') {
                    this.embedLinkHighlighter(embedInfo);
                }
            }
            if (embedDiscovery) {
                this.embedDiscovery(embedInfo);
            }
        }
        embedLinkHighlighter(embedInfo) {
            if (!this.linkHighlighterAdded) {
                const popper = new LinkHighlighter();
                popper.classList.add(WIDGET_CLASSES.linkPopup);
                popper.siteCode = embedInfo.site;
                popper.pageUrl = embedInfo.url || window.location.href;
                document.body.appendChild(popper);
                this.linkHighlighterAdded = true;
            }
        }
        embedFilmStripToolbar(embedInfo) {
            if (!this.filmstripToolbar) {
                const stripBar = new FilmStripToolbar();
                stripBar.modeInfo = embedInfo.filmStripToolbar || embedInfo.filmStrip || {};
                document.body.appendChild(stripBar);
                stripBar.siteCode = embedInfo.site;
                stripBar.pageUrl = embedInfo.url || window.location.href;
                stripBar.search = !!(embedInfo.filmStripToolbar && embedInfo.filmStripToolbar.search);
                if (embedInfo.filmStripToolbar && embedInfo.filmStripToolbar.thumbnailSize) {
                    stripBar.thumbnailSize = embedInfo.filmStripToolbar.thumbnailSize;
                }
                this.filmstripToolbar = stripBar;
                this.stampWidget(this.filmstripToolbar);
            }
            return this.filmstripToolbar;
        }
        embedPilot(embedInfo) {
            if (!this.pilot) {
                this.pilot = new SlickPilot();
                this.pilot.siteCode = embedInfo.site;
                this.pilot.pageUrl = embedInfo.url || window.location.href;
                this.pilot.config = embedInfo;
                this.stampWidget(this.pilot);
                document.body.appendChild(this.pilot);
            }
        }
        embedHeartbeat(heartConfig) {
            if (!this.heartbeat) {
                this.heartbeat = new SlickHeartbeat();
                this.heartbeat.icon = heartConfig.type || 'heart';
                this.heartbeat.disableAnimation = heartConfig.disableAnimation === true;
                this.stampWidget(this.heartbeat);
                document.body.appendChild(this.heartbeat);
            }
        }
        embedDiscovery(embedInfo) {
            if (!this.discovery) {
                this.discovery = new SlickDiscovery();
                this.discovery.embedInfo = embedInfo;
                this.stampWidget(this.discovery);
                document.body.appendChild(this.discovery);
            }
        }
        stampWidget(e) {
            e.dataset.contact = 'https://slickstream.com/';
        }
        stampPage() {
            if (!this.pageStamped) {
                const stampText = `
**************************************************
Content discovery widgets provided by Slickstream.
https://slickstream.com/
**************************************************
      `;
                console.log(stampText);
                const comment = document.createComment(stampText);
                document.documentElement.appendChild(comment);
                this.pageStamped = true;
            }
        }
        attachEngagementEvents() {
            this.detachEngagementEvents();
            window.addEventListener('scroll', this.engagementHandler);
            window.addEventListener('keydown', this.engagementHandler);
            window.addEventListener('mousedown', this.engagementHandler);
            window.addEventListener('click', this.engagementHandler);
            window.addEventListener('touchstart', this.engagementHandler);
            window.addEventListener('touchmove', this.engagementHandler);
            window.addEventListener('mousewheel', this.engagementHandler);
            window.addEventListener('DOMMouseScroll', this.engagementHandler);
        }
        detachEngagementEvents() {
            window.removeEventListener('scroll', this.engagementHandler);
            window.removeEventListener('keydown', this.engagementHandler);
            window.removeEventListener('mousedown', this.engagementHandler);
            window.removeEventListener('click', this.engagementHandler);
            window.removeEventListener('touchstart', this.engagementHandler);
            window.removeEventListener('touchmove', this.engagementHandler);
            window.removeEventListener('mousewheel', this.engagementHandler);
            window.removeEventListener('DOMMouseScroll', this.engagementHandler);
        }
    }
    // Main script that initializaed the GuildEmbed object
    // when DOM is ready;
    (() => {
        // check for polyfills
        try {
            const event = (new CustomEvent('dummy-event', { bubbles: true, composed: true }));
            if (!(event.composed || event.__composed || event._composed)) {
                console.warn('Detected CustomEvent polyfill', event, window.CustomEvent);
                const iframe = document.createElement('iframe');
                iframe.src = 'about:blank';
                const style = iframe.style;
                style.border = 'none';
                style.width = '0px';
                style.height = '0px';
                style.opacity = '0';
                style.position = 'absolute';
                document.body.appendChild(iframe);
                const origCE = iframe.contentWindow.CustomEvent;
                document.body.removeChild(iframe);
                window.SlickCustomEvent = origCE;
                window.CustomEvent = origCE;
            }
            else {
                window.SlickCustomEvent = CustomEvent;
            }
        }
        catch (err) {
            console.warn('Error recovering polyfills in Slick initialization. This is mostly benign.', err);
        }
        const initialize = () => {
            if (window._slickEmbedder) {
                return;
            }
            const ge = new GuildEmbed();
            window._slickEmbedder = ge;
            ge.start();
        };
        const pollForLoaded = () => {
            const readyState = document && document.readyState;
            if (readyState === 'interactive' || readyState === 'complete') {
                initialize();
            }
            else {
                window.setTimeout(() => pollForLoaded(), 300);
            }
        };
        const readyState = document && document.readyState;
        if (readyState === 'interactive' || readyState === 'complete') {
            initialize();
        }
        else {
            // adding multiple event listeners and polling because if the site is using
            // script scheduling services like "rocket-loader", it still works properly
            document.addEventListener('DOMContentLoaded', () => initialize());
            window.addEventListener('DOMContentLoaded', () => initialize());
            window.addEventListener('load', () => initialize());
            pollForLoaded();
        }
    })();

}());
