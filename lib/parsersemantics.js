
/*
 * class DJSParserSemantics
 *
 * This class arbitrates the rules of insertion when Dominate attempts to
 * add content captured from document.write
 */

    var DJSParserSemantics = {};

/*
 * DJSUtil.htmlSemanticRules
 *
 * Based on HTML5 semantics: 
 * http://dev.w3.org/html5/spec/Overview.html#semantics
 *
 * Each tag has one or more of these attributes
 *  which define its possible valid relationship to other tags.
 *
 * @contentCategories (required) = the set of content model categories
 *   to which this tag belongs
 *
 * @contentModel (optional) = all valid children must belong to this 
 *   content model category
 *
 * @inclusive (optional) = tags explicitly allowed as valid children,
 *   regardless of content model rules
 *
 * @exclusive (optional) = tags explicitly disallowed as valid children,
 *   regardless of content model rules.  A tag mentioned with value 'recursive'
 *   implies that this tag cannot even be an indirect descenant of this tag.
 */
    DJSParserSemantics.elementSemantics = {
        'head': {
            contentCategories: {},
            contentModel: 'metadata'
         },
        'title': {
            contentCategories: {
                'metadata': 1
            },
            contentModel: 'text'
        },
        'base': {
            contentCategories: {
                'metadata': 1
            },
            contentModel: 'empty'
        },
        'link': {
            contentCategories: {
                'metadata': 1
            },
            contentModel: 'empty'
        },
        'meta': {
            contentCategories: {
                'metadata': 1
            },
            contentModel: 'empty'
        },
        'style': {
            contentCategories: {
                'metadata': 1,
                'flow': 1
            },
            contentModel: 'text'
        },
        'script': {
            contentCategories: {
                'metadata': 1,
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'text'
        },
        'noscript': {
            contentCategories: {
                'metadata': 1,
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'transparent',
            // noscript cannot be a descendant of noscript, even indirectly:
            exclusive: {
                'noscript': 'recursive' 
            }
        },
        'body': {
            contentCategories: {
                'sectioning': 1
            },
            contentModel: 'flow'
        },
        'section': {
            contentCategories: {
                'flow': 1,
                'sectioning': 1
            },
            contentModel: 'flow'
        },
        'nav': {
            contentCategories: {
                'flow': 1,
                'sectioning': 1
            },
            contentModel: 'flow'
        },
        'article': {
            contentCategories: {
                'flow': 1,
                'sectioning': 1
            },
            contentModel: 'flow'
        },
        'aside': {
            contentCategories: {
                'flow': 1,
                'sectioning': 1
            },
            contentModel: 'flow'
        },
        'h1': {
            contentCategories: {
                'flow': 1,
                'heading': 1
            },
            contentModel: 'phrasing'
        },
        'h2': {
            contentCategories: {
                'flow': 1,
                'heading': 1
            },
            contentModel: 'phrasing'
        },
        'h3': {
            contentCategories: {
                'flow': 1,
                'heading': 1
            },
            contentModel: 'phrasing'
        },
        'h4': {
            contentCategories: {
                'flow': 1,
                'heading': 1
            },
            contentModel: 'phrasing'
        },
        'h5': {
            contentCategories: {
                'flow': 1,
                'heading': 1
            },
            contentModel: 'phrasing'
        },
        'h6': {
            contentCategories: {
                'flow': 1,
                'heading': 1
            },
            contentModel: 'phrasing'
        },
        'hgroup': {
            contentCategories: {
                'flow': 1,
                'heading': 1
            },
            // hgroup can only contain hX elements as children
            contentModel: 'empty',
            inclusive: {
                'h1': 1,
                'h2': 1,
                'h3': 1,
                'h4': 1,
                'h5': 1,
                'h6': 1
            }
        },
        'header': {
            contentCategories: {
                'flow': 1
            },
            contentModel: 'flow',
            exclusive: {
                'header': 'recursive',
                'footer': 'recursive'
            }
        },
        'footer': {
            contentCategories: {
                'flow': 1
            },
            contentModel: 'flow',
            exclusive: {
                'header': 'recursive',
                'footer': 'recursive'
            }
        },
        'address': {
            contentCategories: {
                'flow': 1
            },
            contentModel: 'flow',
            exclusive: {
                'address': 'recursive',
                'header': 'recursive',
                'footer': 'recursive'
            } // TODO: in theory, all heading and sectioning elements are also disallowed
        },
        'p': {
            contentCategories: {
                'flow': 1
            },
            contentModel: 'phrasing'
        },
        'hr': {
            contentCategories: {
                'flow': 1
            },
            contentModel: 'empty'
        },
        'pre': {
            contentCategories: {
                'flow': 1
            },
            contentModel: 'phrasing'
        },
        'blockquote': {
            contentCategories: {
                'flow': 1,
                'sectioning': 1
            },
            contentModel: 'flow'
        },
        'ol': {
            contentCategories: {
                'flow': 1
            },
            contentModel: 'empty',
            inclusive: {
                'li': 1
            }
        },
        'ul': {
            contentCategories: {
                'flow': 1
            },
            // NOTE: All browsers consistently defy the HTML spec here:
            // browsers treat UL as a valid parent of flow content
            // when the spec says it can only have LI children
            //contentModel: 'empty',
            contentModel: 'flow',
            inclusive: {
                'li': 1
            }
        },
        'li': {
            // LI lives outside content model rules
            // LI is only allowed where explicily allowed
            contentCategories: {},
            contentModel: 'flow'
        },
        'dl': {
            contentCategories: {
                'flow': 1
            },
            contentModel: 'empty',
            inclusive: {
                'dt': 1,
                'dd': 1
            }
        },
        'dt': {
            // DT lives outside content model rules
            // DT is only allowed where explicily allowed
            contentCategories: {},
            contentModel: 'phrasing'
        },
        'dd': {
            // DD lives outside content model rules
            // DD is only allowed where explicily allowed
            contentCategories: {},
            contentModel: 'flow'
        },
        'figure': {
            contentCategories: {
                'flow': 1,
                'sectioning': 1
            },
            contentModel: 'flow',
            inclusive: {
                'figcaption': 1
            }
        },
        'figcaption': {
            contentCategories: {},
            contentModel: 'flow'
        },
        'div': {
            contentCategories: {
                'flow': 1
            },
            contentModel: 'flow'
        },
        'a': {
            contentCategories: {
                // A is sometimes not Phrasing, if it has a Flow child
                'flow': 1,
                'phrasing': 1,
                'interactive': 1
            },
            contentModel: 'transparent',
            exclusive: {
                // TODO: all interactive content
            }
        },
        'em': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'strong': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'small': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        's': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'cite': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'q': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'dfn': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing',
            exclusive: {
                'dfn': 'recursive'
            }
        },
        'abbr': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'time': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'code': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'var': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'abbr': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'samp': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'kbd': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'sub': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'sup': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'i': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'b': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'mark': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'ruby': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing',
            inclusive: {
                'rt': 1,
                'rp': 1
            }
        },
        'rt': {
            contentCategories: {},
            contentModel: 'phrasing'
        },
        'rp': {
            contentCategories: {},
            contentModel: 'phrasing'
        },
        'bdi': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'bdo': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'span': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'br': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'empty'
        },
        'wbr': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'empty'
        },
        'ins': {
            // TODO: ins becomes Flow type when it has Flow children
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'transparent'
        },
        'del': {
            // TODO: del become Flow type when it has Flow children
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'transparent'
        },
        'img': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1,
                'embedded': 1
            },
            contentModel: 'empty'
        },
        'iframe': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1,
                'embedded': 1,
                'interactive': 1
            },
            contentModel: 'transparent'
        },
        'embed': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1,
                'embedded': 1,
                'interactive': 1
            },
            contentModel: 'empty'
        },
        'object': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1,
                'embedded': 1,
                'interactive': 1
            }, // TODO: Object is Interactive only with attribute @usemap
            contentModel: 'transparent',
            inclusive: {
                'param': 1
            }
        },
        'param': {
            contentCategories: { },
            contentModel: 'empty'
        },
        'video': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1,
                'embedded': 1
            },
            contentModel: 'transparent'
            // TODO: "media elements" are disallowed as children of <video>
            // http://dev.w3.org/html5/spec/Overview.html#media-element
        },
        'audio': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1,
                'embedded': 1,
                'interactive': 1
                // TODO: audio tag is interactive only with @controls
            },
            contentModel: 'transparent'
            // TODO: "media elements" are disallowed as children of <audio>
            // http://dev.w3.org/html5/spec/Overview.html#media-element
        },
        'source': {
            contentCategories: { },
            contentModel: 'empty'
        },
        'track': {
            contentCategories: { },
            contentModel: 'empty'
        },
        'canvas': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1,
                'embedded': 1
            },
            contentModel: 'transparent'
        },
        'map': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'transparent'
        },
        'area': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'empty'
        },
        'table': {
            contentCategories: {
                'flow': 1
            },
            contentModel: 'empty',
            inclusive: {
                'caption': 1,
                'colgroup': 1,
                'thead': 1,
                'tfoot': 1,
                'tbody': 1,
                'tr': 1 // TODO: spec is inconsistent about how parser should
                // handle table > tr - does it insert a tbody or call it OK?
            }
        },
        'caption': {
            contentCategories: { },
            contentModel: 'flow',
            exclusive: {
                'table': 'recursive'
            }
        },
        'colgroup': {
            contentCategories: { },
            contentModel: 'empty',
            inclusive: {
                'col': 1
            } // technically col tag is only allowed with @span
        },
        'col': {
            contentCategories: { },
            contentModel: 'empty'
        },
        'tbody': {
            contentCategories: { },
            contentModel: 'empty',
            inclusive: {
                'tr': 1
            }
        },
        'thead': {
            contentCategories: { },
            contentModel: 'empty',
            inclusive: {
                'tr': 1
            }
        },
        'tfoot': {
            contentCategories: { },
            contentModel: 'empty',
            inclusive: {
                'tr': 1
            }
        },
        'tr': {
            contentCategories: { },
            contentModel: 'empty',
            inclusive: {
                'td': 1,
                'th': 1
            }
        },
        'td': {
            contentCategories: {
                'sectioning': 1
            },
            contentModel: 'flow'
        },
        'th': {
            contentCategories: { },
            contentModel: 'phrasing'
        },
        'form': {
            contentCategories: {
                'flow': 1
            },
            contentModel: 'flow',
            exclusive: {
                'form': 'recursive'
            }
        },
        'fieldset': {
            contentCategories: {
                'flow': 1,
                'sectioning': 1
            },
            contentModel: 'flow',
            inclusive: {
                'legend': 1
            } // <legend> is only allowed as first child of <fieldset>
        },
        'legend': {
            contentCategories: { },
            contentModel: 'phrasing'
        },
        'label': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1,
                'interactive': 1
            },
            contentModel: 'phrasing'
            // label can have only one labelable decendant, and it must
            // be linked to that decendant
            // http://dev.w3.org/html5/spec/Overview.html#category-label
        },
        'input': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1,
                'interactive': 1
            },
            contentModel: 'empty'
            // @type=hidden -> non-interactive
        },
        'button': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1,
                'interactive': 1
            },
            contentModel: 'phrasing'
            // TODO: 'interactive'-type decendents disallowed
        },
        'select': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1,
                'interactive': 1
            },
            contentModel: 'empty',
            inclusive: {
                'option': 1,
                'optgroup': 1
            }
        },
        'datalist': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing',
            inclusive: {
                'option': 1
            }
        },
        'optgroup': {
            contentCategories: { },
            contentModel: 'empty',
            inclusive: {
                'option': 1
            }
        },
        'option': {
            contentCategories: { },
            contentModel: 'text'
        },
        'textarea': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1,
                'interactive': 1
            },
            contentModel: 'text'
        },
        'keygen': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1,
                'interactive': 1
            },
            contentModel: 'empty'
        },
        'output': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing'
        },
        'progress': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing',
            exclusive: {
                'progress': 'recursive'
            }
        },
        'meter': {
            contentCategories: {
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'phrasing',
            exclusive: {
                'meter': 'recursive'
            }
        },
        'details': {
            contentCategories: {
                'flow': 1,
                'sectioning': 1,
                'interactive': 1
            },
            contentModel: 'flow',
            inclusive: {
                'summary': 1
            }
        },
        'summary': {
            contentCategories: { },
            contentModel: 'phrasing'
        },
        'command': {
            contentCategories: {
                'metadata': 1,
                'flow': 1,
                'phrasing': 1
            },
            contentModel: 'empty'
        },
        'menu': {
            contentCategories: {
                'flow': 1,
                'interactive': 1
            },
            contentModel: 'flow',
            inclusive: {
                'li': 1
            }
        }
    };

/*
 * DJSParserSemantics.isValidParent
 *
 * This helper function returns true if node can be inserted into parentNode
 * according to HTML5 semantic rules.
 *
 *
 * Notes on content model processing:
 *
 * > We only care about content model rules which could cause an invalid
 *   parent-child pairing.  Our objective is to predict when an HTML parser
 *   will perform a parse recovery action (closing a parent tag), not to
 *   fully validate an HTML document.
 *
 * > HTML Directives, HTML Comments and text nodes are all assigned to the
 *   'text' content category, for simplicity.
 *
 * > 'transparent', 'empty'  and 'text' are treated as content models
 *
 */
    DJSParserSemantics.isValidParent = function(node, parentNode) {

        var checkExplicitRules = function(parentRules, nodeName) {

                if (parentRules.inclusive && nodeName in parentRules.inclusive) {

                    return true;

                } else if (parentRules.exclusive && nodeName in parentRules.exclusive) {

                    return false;

                }

                return null;

            },

            checkContentModel = function(parentRules, nodeRules) {

                var conclusion;

                switch (parentRules.contentModel) {

                    case "transparent" :

                        conclusion = true;

                        break;

                    case "empty" :

                        conclusion = false;

                        break;

                    default:

                        conclusion = parentRules.contentModel in nodeRules.contentCategories;

                }

                return conclusion;
            };

        var rules = DJSParserSemantics.elementSemantics,

            nodeName = node.nodeName.toLowerCase(),

            parentNodeName = parentNode.nodeName.toLowerCase(),

            parentRules, conclusion;


        // No rules defined for parent?  Call it good.

        if (!rules[parentNodeName]) {

            return true;

        }

        parentRules = rules[parentNodeName];


        // First, try explicit rules

        conclusion = checkExplicitRules(rules[parentNodeName], nodeName);

        if (conclusion !== null) {

            return conclusion;

        }


        // Now try content model / content category correspondance.
        // We can't proceed without child content category data, or parent
        //  content model data, so let those cases slide

        if (!rules[nodeName] || !rules[nodeName].contentCategories

            || !parentRules.contentModel) {

            return true;

        }

        return checkContentModel(parentRules, rules[nodeName]);

    };

    // Return the streamCursor for the current document, 
    // or the most immediate non-Closed parent
    // in the event that the streamCursor is closed.
    DJSParserSemantics.getEffectiveStreamCursor = function(rawParent) {

        // Search begins at the first defined insertion point:
        // 1 parent (for recursive group insertion)
        // 2 streamCursor.executingScript.parentNode
        // (if script parent was not know)
        // 3 document.body (if script did not attach
        // successfully)
        var self = this,
            rawCursor = {

            parent: null,
            sibling: null
        };

        if (rawParent) {

            rawCursor.parent = rawParent;

        } else if (self.streamCursor) {

            rawCursor.parent = self.streamCursor.parentNode;

            rawCursor.sibling = self.streamCursor;

        } else {

            rawCursor.parent = document.body;

        }

        return (function getFirstNonClosedParent(cursor) {

            var finalCursor;

            if (!cursor.parent.closed) {

                // Current cursor is fine
                finalCursor = cursor;

            } else if (cursor.parent.parentNode) {

                // Climb up the tree
                finalCursor = getFirstNonClosedParent({

                    parent: cursor.parent.parentNode,

                    sibling: cursor.parent
                });

            } else {
                
                // Fallback: use document.body if
                // everything is closed
                finalCursor = {

                    parent: document.body,

                    sibling: null
                };
            }

            return finalCursor;

        })(rawCursor);
    };


    // Find the ancestor of 'cursor' for which 'node' is a 
    // valid child, i.e. <div> cannot be a child of <p>.  
    // Search begins with 'cursor'.
    //
    // Closes all invalid nodes encountered during the
    // search.
    DJSParserSemantics.popTagStackUntilValid = function(node, cursor) {

        var parent = cursor.parent;

        if (DJSParserSemantics.isValidParent(node, parent)) {

            return cursor;

        } else {

            parent.closed = true;

            if (parent.parentNode) {

                return DJSParserSemantics.popTagStackUntilValid(node, {
                    parent: parent.parentNode,
                    sibling: parent
                });

            } else {

                return document.body;

            }
        }
    };
    
    DJSParserSemantics.insertAfter = function(node, target) {

        if (target.nextSibling) {

            target.parentNode.insertBefore(node, target.nextSibling);
        } else {

            target.parentNode.appendChild(node);
        }
    };

    DJSParserSemantics.decodeEntities = function(text) {

        var span = document.createElement('span')

        span.innerHTML = text;

        return span.textContent;
    };



    DJSParserSemantics.mixins = {

/*
 * DJSParserSemantics.mixins.convertAbstractElement
 *
 * Given abstract data for an element as generated by the HTML parser, this
 * method will return a DOM element. This method is 
 */
         convertAbstractElement: function(abstractElement) {
            
            var self = this,
                document = self.target,
                setNodeAttributes = function(node, attributes) {
                    
                    if(attributes) {
                        DJSUtil.forEach(
                            attributes,
                            function(value, key) {

                                if(DJSUtil.navigator.IE && !DJSUtil.navigator.ModernIE) {

                                    // Deal with insane browsers...
                                    
                                    // Set event handlers dynamically...
                                    if(key.indexOf('on') == 0) {

                                        node.attachEvent(
                                            key,
                                            function() {

                                                (function() {

                                                    eval(value);
                                                }).call(node);
                                            }
                                        )
                                    } else {

                                        switch(key) {
                                            case 'class':
                                                node.className += " " + value;
                                                break;
                                            case 'id':
                                            case 'src':
                                                node[key] = value;
                                                break;
                                            case 'frameborder':
                                                node.frameBorder = value;
                                                break;
                                            case 'style':
                                                node.style.cssText = value;
                                                break;
                                            default:
                                                DJSUtil.setAttribute.call(node, key, value);
                                                break;
                                        }
                                    }
                                } else {

                                    // Setting attributes in sane browsers...
                                    switch(key) {
                                        case 'class':
                                            node.className += " " + value;
                                            break;
                                        default:
                                            DJSUtil.setAttribute.call(node, key, value);
                                            break;
                                    }
                                }
                            }
                        );
                    }
                };
                
            switch(abstractElement.type) {
                
                case 'text':
                    
                    return document.createTextNode(
                        DJSParserSemantics.decodeEntities(abstractElement.data));

                case 'comment':
                    
                    var comment;

                    try {

                        comment = document.createComment(abstractElement.data);
                    } catch(e) {

                        comment = document.createComment("error: malformed comment");
                    }
                         
                    return comment;

                case 'script':
                    
                    var script = document.createElement(abstractElement.name);
                    
                    setNodeAttributes(script, abstractElement.attribs);

                    return script;

                case 'style':
                case 'tag':
                    
                    var node = document.createElement(abstractElement.name);
                    
                    setNodeAttributes(node, abstractElement.attribs);
                    
                    return node;

                case 'directive':
                    DJSUtil.log('Ignoring an HTML directive found in document.write stream ' + abstractElement.raw);
                    return false;

                default: 
                    DJSUtil.error('WARNING: unexpected element type found: ' + abstractElement.raw);
                    return false;
            }
        },

/*
 * DJSParserSemantics.mixins.insert
 *
 * Given abstract DOM data as generated by the HTML parser, and optionally a
 * parent node, this method will iterate over the data and ensure that it is
 * properly inserted into the DOM.
 *
 * In all browsers in Standards mode, tags inserted with document.write
 * cannot bring the DOM into an invalid structure (i.e. <p><div></div></p>).
 * So, the browser will close open tags until a valid structure is reached
 * (i.e. <p></p><div></div>).  To simulate this behavior, inserted nodes
 * can "bubble" up the dom until a vaild structure is found.  Bubble events
 * will permanently adjust the insertion cursor until a new script.
 */
        insert: function(abstractDOM, rawParent, depth) {
             
            // Implementation notes:
            //
            // Basically we are performing a depth-first traversal
            // of the tag tree given as abstractDOM, with one enhancement:
            // Closed Nodes.
            //
            // For any node, we may encounter an Invalid Insertion, such
            // as insert(<div>, <p>) or insert(<div>) when the stream cursor
            // is a <p> tag.  In this situation, we move up the tree until we
            // find a valid parent.  All candidate parents tried along the way
            // are marked Closed.
            //
            // Insert must not insert any nodes into a Closed Node.
            // insert(nodeA, nodeB) where nodeB is Closed will attach
            // nodeA to nodeB's most immediate non-Closed parent.
            //
            // Closedness is a property of HTML Elements which must persist
            // after this function completes.
            //
            // Finally, the abstractDOM may contain Seen Nodes, marked
            //  by .seen == true.  These nodes should not be processed, but 
            //  they may have new children
            var self = this,
                document = self.target,
                depth = depth || 0;

            DJSUtil.forEach(
                abstractDOM,
                function(data, i) {

                    // Each node in the abstractDOM tree falls into 3 classes:
                    //
                    // 1 unseen, unclosed node with unseen children
                    //   > element reference is fresh from insertion
                    //   > insertion cursor will be this element
                    //
                    // 2 seen, unclosed node with unseen children
                    //   > look up element reference
                    //     > A: maintain a DOM tree -> element mapping
                    //       (e.g. /0/2/0 -> HTMLDivElement)
                    //     > B: compute element reference like this:
                    //       0 take note of tree position (/0/2/0)
                    //       1 begin at the effective insertion cursor (based on the script node position)
                    //       2 walk down the DOM tree and document tree to /0/2/0, ignoring closed nodes
                    //       3 element reference found
                    //   > insertion cursor will be this element
                    //
                    // 3 closed node with unseen children
                    //   > insertion cursor will be parent element
                    //

                    if (data.seen) {

                        if (data.children) {

                            //var liveNode = self.nodeCache[treePath.join('-')];
                            var liveNode = data.liveNode;

                            self.insert(data.children, liveNode, depth+1);
                        }
                    } else {

                        var cursor = DJSParserSemantics.getEffectiveStreamCursor.call(self, rawParent),
                            node = self.convertAbstractElement(data),
                            name = node.nodeName.toLowerCase();

                        data.seen = true;
                        DJSUtil.log('created new node:');
                        DJSUtil.inspect(node);

                        
                        // Cursor will be either
                        // > the parent node in the the insertion group
                        // > the parent node of document.write's callee script node
                        // > the nearest non-closed parent node of one of the above
                        try {

                            if (cursor.parent.nodeName.toLowerCase() == "script" && name == "#text") {

                                var script = cursor.parent,
                                    inlineText = slaveScripts.handleInlineScriptText(
                                        script, node.nodeValue);

                                if(!DJSUtil.navigator.IE && !script.src) {

                                    script.type = "text/noexecute";
                                    DJSUtil.globalEval(inlineText);
                                }

                                script.text = inlineText;

                            } else {

                                var parent, sibling;

                                cursor = DJSParserSemantics.popTagStackUntilValid.apply(
                                    this, [node, cursor]);

                                parent = cursor.parent, sibling = cursor.sibling;

                                if (sibling) {

                                    DJSParserSemantics.insertAfter(node, sibling);

                                } else {

                                    parent.appendChild(node);
                                }

                                // StreamCursor points to the newest top-level node
                                if (depth == 0) {

                                    self.streamCursor = node;
                                }
                            }

                            // store node in nodecache for later passes
                            // when this node will be already "seen"
                            //self.nodeCache[treePath.join('-')] = node;
                            data.liveNode = node;

                            if (data.children) {

                                self.insert(data.children, node, depth+1);
                            }

                        } catch(e) {

                            DJSUtil.log('Insert failed');
                            DJSUtil.error(e);
                        }
                    }
                }
            );
        }, 

/*
 * DJSParserSemantics.mixins.afterInsert
 * 
 * React to a parser callback by manipulating
 * flags within the internal HTMLParser DOM tree
 */
        afterInsert: function(error, dom) {

            // recursively mark all DOM nodes "seen"
            var markSeen = function markSeen(nodelist) {
                DJSUtil.forEach(nodelist, function(node) {
                    node.seen = true;
                    node.children && markSeen(node.children);
                });
            },
            // prune nodes which will never have new children
                pruneDOM = function pruneDOM(nodeList) {
                    // TODO: perfopt - prune nodes where 
                    // next sibling is seen
            };
            // TODO we don't need this anymore
            markSeen(this.dom);
        },

/*
 * DJSParserSemantics.mixins.withParserDocwrite
 * 
 * Parse HTML chunk,  peek at the DOM and amend
 * the live DOM with new nodes. Parsing must pause
 * as soon as </script.*?> appears, so we force this
 * by breaking the markup into chunks.
 */
        withParserDocwrite: function(parser, out) {

            var chunks = out.split(/<\/script[^>]*>/);

            DJSUtil.forEach(chunks, function(chunk, index){

                if (index < (chunks.length - 1)) {

                    chunk += "</script>";
                } else if (chunk == "") {

                    return;
                }

                DJSUtil.log('Parsing document.write content: ' + chunk);
                parser.parseChunk(chunk);
                parser.peek();
            });
        }

    };
