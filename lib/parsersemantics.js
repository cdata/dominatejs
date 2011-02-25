
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
            contentModel: 'empty',
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
            // TODO: ins become Flow type when it has Flow children
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
     * > 'transparent' and 'text' are treated as content models
     *
     */
    DJSParserSemantics.isValidParent = function(node, parentNode) {

        var rules = DJSParserSemantics.elementSemantics,
            nodeName = node.nodeName.toLowerCase(),
            parentNodeName = parentNode.nodeName.toLowerCase();

        if (!rules[nodeName]) {
            return true;
        }

        if (rules[nodeName].inclusive) {
            return !!rules[nodeName].inclusive[parentNodeName];
        } else if (rules[nodeName].exclusive) {
            return !rules[nodeName].exclusive[parentNodeName];
        }

        return !(rules[nodeName]) ||
            (rules[nodeName].inclusive && !!rules[nodeName].inclusive[parentNodeName]) || 
            (rules[nodeName].exclusive && !rules[nodeName].exclusive[parentNodeName]);
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
                document = self.document,
                setNodeAttributes = function(node, attributes) {
                    
                    if(attributes) {
                        DJSUtil.forEach(
                            attributes,
                            function(value, key) {

                                switch(key) {

                                    case 'class':
                                        node.className += value;
                                        break;
                                    default:
                                        DJSUtil.setAttribute.call(node, key, value);
                                        break;
                                }
                            }
                        );
                    }
                };
                
            switch(abstractElement.type) {
                
                case 'text':
                    
                    return document.createTextNode(abstractElement.data);

                case 'comment':
                    
                    return document.createComment(abstractElement.data);

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
        insert: function(abstractDOM, rawParent) {
             
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
            var self = this,
                document = self.document;

            DJSUtil.forEach(
                abstractDOM,
                function(data) {

                    // Return the streamCursor for the current document, 
                    // or the most immediate non-Closed parent
                    // in the event that the streamCursor is closed.
                    var getEffectiveStreamCursor = function() {

                        // Search begins at the first defined insertion point:
                        // 1 parent (for recursive group insertion)
                        // 2 streamCursor.executingScript.parentNode
                        // (if script parent was not know)
                        // 3 document.body (if script did not attach
                        // successfully)
                        var rawCursor = {

                            parent: null,
                            sibling: null
                        };

                        if (rawParent) {

                            rawCursor.parent = rawParent;

                        } else if (self.streamCursor.executingScript) {

                            rawCursor.parent = self.streamCursor.executingScript.parentNode;

                            rawCursor.sibling = self.streamCursor.executingScript;

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
                    var findValidAncestorAndCloseNodes = function(node, cursor) {

                        var parent = cursor.parent;

                        if (DJSParserSemantics.isValidParent(node, parent)) {

                            return cursor;

                        } else {

                            parent.closed = true;

                            if (parent.parentNode) {

                                return findValidAncestorAndCloseNodes(node, {
                                    parent: parent.parentNode,
                                    sibling: parent
                                });

                            } else {

                                return document.body;

                            }
                        }
                    };

                    var cursor = getEffectiveStreamCursor(),
                        node = self.convertAbstractElement(data),
                        name = node.nodeName.toLowerCase();

                    
                    // Cursor will be either
                    // > the parent node in the the insertion group
                    // > the parent node of document.write's callee script node
                    // > the nearest non-closed parent node of one of the above
                    try {

                        if (cursor.parent.nodeName.toLowerCase() == "script" && name == "#text") {

                            cursor.parent.text = node.nodeValue;

                        } else {

                            var parent, sibling;

                            cursor = findValidAncestorAndCloseNodes(node, cursor);

                            parent = cursor.parent, sibling = cursor.sibling;

                            if (sibling) {

                                parent.insertBefore(node, sibling);

                            } else {

                                parent.appendChild(node);
                            }
                        }

                        if (data.children) {

                            self.insert(data.children, node);
                        }

                    } catch(e) {

                        DJSUtil.log('Insert failed');
                        DJSUtil.error(e);
                    }
                }
            );
        }
    };
