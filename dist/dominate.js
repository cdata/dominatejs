(function(window, document, undefined) {
    
    var require = function(){},
        exports = {},
        module = {},
        __filename = "",
        __dirname = "";
/***********************************************
Copyright 2010, Chris Winberry <chris@winberry.net>. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
***********************************************/
/* v1.7.2 */

(function () {

function runningInNode () {
	return(
		(typeof require) == "function"
		&&
		(typeof exports) == "object"
		&&
		(typeof module) == "object"
		&&
		(typeof __filename) == "string"
		&&
		(typeof __dirname) == "string"
		);
}

if (!runningInNode()) {
	if (!this.Tautologistics)
		this.Tautologistics = {};
	else if (this.Tautologistics.NodeHtmlParser)
		return; //NodeHtmlParser already defined!
	this.Tautologistics.NodeHtmlParser = {};
	exports = this.Tautologistics.NodeHtmlParser;
}

//Types of elements found in the DOM
var ElementType = {
	  Text: "text" //Plain text
	, Directive: "directive" //Special tag <!...>
	, Comment: "comment" //Special tag <!--...-->
	, Script: "script" //Special tag <script>...</script>
	, Style: "style" //Special tag <style>...</style>
	, Tag: "tag" //Any tag that isn't special
}

function Parser (handler, options) {
	this._options = options ? options : { };
	if (this._options.includeLocation == undefined) {
		this._options.includeLocation = false; //Do not track element position in document by default
	}

	this.validateHandler(handler);
	this._handler = handler;
	this.reset();
}

	//**"Static"**//
	//Regular expressions used for cleaning up and parsing (stateless)
	Parser._reTrim = /(^\s+|\s+$)/g; //Trim leading/trailing whitespace
	Parser._reTrimComment = /(^\!--|--$)/g; //Remove comment tag markup from comment contents
	Parser._reWhitespace = /\s/g; //Used to find any whitespace to split on
	Parser._reTagName = /^\s*(\/?)\s*([^\s\/]+)/; //Used to find the tag name for an element

	//Regular expressions used for parsing (stateful)
	Parser._reAttrib = //Find attributes in a tag
		/([^=<>\"\'\s]+)\s*=\s*"([^"]*)"|([^=<>\"\'\s]+)\s*=\s*'([^']*)'|([^=<>\"\'\s]+)\s*=\s*([^'"\s]+)|([^=<>\"\'\s\/]+)/g;
	Parser._reTags = /[\<\>]/g; //Find tag markers

	//**Public**//
	//Methods//
	//Parses a complete HTML and pushes it to the handler
	Parser.prototype.parseComplete = function Parser$parseComplete (data) {
		this.reset();
		this.parseChunk(data);
		this.done();
	}

	//Parses a piece of an HTML document
	Parser.prototype.parseChunk = function Parser$parseChunk (data) {
		if (this._done)
			this.handleError(new Error("Attempted to parse chunk after parsing already done"));
		this._buffer += data; //FIXME: this can be a bottleneck
		this.parseTags();
	}

	//Tells the parser that the HTML being parsed is complete
	Parser.prototype.done = function Parser$done () {
		if (this._done)
			return;
		this._done = true;
	
		//Push any unparsed text into a final element in the element list
		if (this._buffer.length) {
			var rawData = this._buffer;
			this._buffer = "";
			var element = {
				  raw: rawData
				, data: (this._parseState == ElementType.Text) ? rawData : rawData.replace(Parser._reTrim, "")
				, type: this._parseState
				};
			if (this._parseState == ElementType.Tag || this._parseState == ElementType.Script || this._parseState == ElementType.Style)
				element.name = this.parseTagName(element.data);
			this.parseAttribs(element);
			this._elements.push(element);
		}
	
		this.writeHandler();
		this._handler.done();
	}

	//Send DOM state to handlers without terminating parsing
	Parser.prototype.peek = function Parser$peek () {
		this._handler.peek();
	}

	//Resets the parser to a blank state, ready to parse a new HTML document
	Parser.prototype.reset = function Parser$reset () {
		this._buffer = "";
		this._done = false;
		this._elements = [];
		this._elementsCurrent = 0;
		this._current = 0;
		this._next = 0;
		this._location = {
			  row: 0
			, col: 0
			, charOffset: 0
			, inBuffer: 0
		};
		this._parseState = ElementType.Text;
		this._prevTagSep = '';
		this._tagStack = [];
		this._handler.reset();
	}
	
	//**Private**//
	//Properties//
	Parser.prototype._options = null; //Parser options for how to behave
	Parser.prototype._handler = null; //Handler for parsed elements
	Parser.prototype._buffer = null; //Buffer of unparsed data
	Parser.prototype._done = false; //Flag indicating whether parsing is done
	Parser.prototype._elements =  null; //Array of parsed elements
	Parser.prototype._elementsCurrent = 0; //Pointer to last element in _elements that has been processed
	Parser.prototype._current = 0; //Position in data that has already been parsed
	Parser.prototype._next = 0; //Position in data of the next tag marker (<>)
	Parser.prototype._location = null; //Position tracking for elements in a stream
	Parser.prototype._parseState = ElementType.Text; //Current type of element being parsed
	Parser.prototype._prevTagSep = ''; //Previous tag marker found
	//Stack of element types previously encountered; keeps track of when
	//parsing occurs inside a script/comment/style tag
	Parser.prototype._tagStack = null;

	//Methods//
	//Takes an array of elements and parses any found attributes
	Parser.prototype.parseTagAttribs = function Parser$parseTagAttribs (elements) {
		var idxEnd = elements.length;
		var idx = 0;
	
		while (idx < idxEnd) {
			var element = elements[idx++];
			if (element.type == ElementType.Tag || element.type == ElementType.Script || element.type == ElementType.style)
				this.parseAttribs(element);
		}
	
		return(elements);
	}

	//Takes an element and adds an "attribs" property for any element attributes found 
	Parser.prototype.parseAttribs = function Parser$parseAttribs (element) {
		//Only parse attributes for tags
		if (element.type != ElementType.Script && element.type != ElementType.Style && element.type != ElementType.Tag)
			return;
	
		var tagName = element.data.split(Parser._reWhitespace, 1)[0];
		var attribRaw = element.data.substring(tagName.length);
		if (attribRaw.length < 1)
			return;
	
		var match;
		Parser._reAttrib.lastIndex = 0;
		while (match = Parser._reAttrib.exec(attribRaw)) {
			if (element.attribs == undefined)
				element.attribs = {};
	
			if (typeof match[1] == "string" && match[1].length) {
				element.attribs[match[1]] = match[2];
			} else if (typeof match[3] == "string" && match[3].length) {
				element.attribs[match[3].toString()] = match[4].toString();
			} else if (typeof match[5] == "string" && match[5].length) {
				element.attribs[match[5]] = match[6];
			} else if (typeof match[7] == "string" && match[7].length) {
				element.attribs[match[7]] = match[7];
			}
		}
	}

	//Extracts the base tag name from the data value of an element
	Parser.prototype.parseTagName = function Parser$parseTagName (data) {
		if (data == null || data == "")
			return("");
		var match = Parser._reTagName.exec(data);
		if (!match)
			return("");
		return((match[1] ? "/" : "") + match[2]);
	}

	//Parses through HTML text and returns an array of found elements
	//I admit, this function is rather large but splitting up had an noticeable impact on speed
	Parser.prototype.parseTags = function Parser$parseTags () {
		var bufferEnd = this._buffer.length - 1;
		while (Parser._reTags.test(this._buffer)) {
			this._next = Parser._reTags.lastIndex - 1;
			var tagSep = this._buffer.charAt(this._next); //The currently found tag marker
			var rawData = this._buffer.substring(this._current, this._next); //The next chunk of data to parse
	
			//A new element to eventually be appended to the element list
			var element = {
				  raw: rawData
				, data: (this._parseState == ElementType.Text) ? rawData : rawData.replace(Parser._reTrim, "")
				, type: this._parseState
			};
	
			var elementName = this.parseTagName(element.data);
	
			//This section inspects the current tag stack and modifies the current
			//element if we're actually parsing a special area (script/comment/style tag)
			if (this._tagStack.length) { //We're parsing inside a script/comment/style tag
				if (this._tagStack[this._tagStack.length - 1] == ElementType.Script) { //We're currently in a script tag
					if (elementName == "/script") //Actually, we're no longer in a script tag, so pop it off the stack
						this._tagStack.pop();
					else { //Not a closing script tag
						if (element.raw.indexOf("!--") != 0) { //Make sure we're not in a comment
							//All data from here to script close is now a text element
							element.type = ElementType.Text;
							//If the previous element is text, append the current text to it
							if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Text) {
								var prevElement = this._elements[this._elements.length - 1];
								prevElement.raw = prevElement.data = prevElement.raw + this._prevTagSep + element.raw;
								element.raw = element.data = ""; //This causes the current element to not be added to the element list
							}
						}
					}
				}
				else if (this._tagStack[this._tagStack.length - 1] == ElementType.Style) { //We're currently in a style tag
					if (elementName == "/style") //Actually, we're no longer in a style tag, so pop it off the stack
						this._tagStack.pop();
					else {
						if (element.raw.indexOf("!--") != 0) { //Make sure we're not in a comment
							//All data from here to style close is now a text element
							element.type = ElementType.Text;
							//If the previous element is text, append the current text to it
							if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Text) {
								var prevElement = this._elements[this._elements.length - 1];
								if (element.raw != "") {
									prevElement.raw = prevElement.data = prevElement.raw + this._prevTagSep + element.raw;
									element.raw = element.data = ""; //This causes the current element to not be added to the element list
								} else { //Element is empty, so just append the last tag marker found
									prevElement.raw = prevElement.data = prevElement.raw + this._prevTagSep;
								}
							} else { //The previous element was not text
								if (element.raw != "") {
									element.raw = element.data = element.raw;
								}
							}
						}
					}
				}
				else if (this._tagStack[this._tagStack.length - 1] == ElementType.Comment) { //We're currently in a comment tag
					var rawLen = element.raw.length;
					if (element.raw.charAt(rawLen - 2) == "-" && element.raw.charAt(rawLen - 1) == "-" && tagSep == ">") {
						//Actually, we're no longer in a style tag, so pop it off the stack
						this._tagStack.pop();
						//If the previous element is a comment, append the current text to it
						if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Comment) {
							var prevElement = this._elements[this._elements.length - 1];
							prevElement.raw = prevElement.data = (prevElement.raw + element.raw).replace(Parser._reTrimComment, "");
							element.raw = element.data = ""; //This causes the current element to not be added to the element list
							element.type = ElementType.Text;
						}
						else //Previous element not a comment
							element.type = ElementType.Comment; //Change the current element's type to a comment
					}
					else { //Still in a comment tag
						element.type = ElementType.Comment;
						//If the previous element is a comment, append the current text to it
						if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Comment) {
							var prevElement = this._elements[this._elements.length - 1];
							prevElement.raw = prevElement.data = prevElement.raw + element.raw + tagSep;
							element.raw = element.data = ""; //This causes the current element to not be added to the element list
							element.type = ElementType.Text;
						}
						else
							element.raw = element.data = element.raw + tagSep;
					}
				}
			}
	
			//Processing of non-special tags
			if (element.type == ElementType.Tag) {
				element.name = elementName;
				
				if (element.raw.indexOf("!--") == 0) { //This tag is really comment
					element.type = ElementType.Comment;
					delete element["name"];
					var rawLen = element.raw.length;
					//Check if the comment is terminated in the current element
					if (element.raw.charAt(rawLen - 1) == "-" && element.raw.charAt(rawLen - 2) == "-" && tagSep == ">")
						element.raw = element.data = element.raw.replace(Parser._reTrimComment, "");
					else { //It's not so push the comment onto the tag stack
						element.raw += tagSep;
						this._tagStack.push(ElementType.Comment);
					}
				}
				else if (element.raw.indexOf("!") == 0 || element.raw.indexOf("?") == 0) {
					element.type = ElementType.Directive;
					//TODO: what about CDATA?
				}
				else if (element.name == "script") {
					element.type = ElementType.Script;
					//Special tag, push onto the tag stack if not terminated
					if (element.data.charAt(element.data.length - 1) != "/")
						this._tagStack.push(ElementType.Script);
				}
				else if (element.name == "/script")
					element.type = ElementType.Script;
				else if (element.name == "style") {
					element.type = ElementType.Style;
					//Special tag, push onto the tag stack if not terminated
					if (element.data.charAt(element.data.length - 1) != "/")
						this._tagStack.push(ElementType.Style);
				}
				else if (element.name == "/style")
					element.type = ElementType.Style;
				if (element.name && element.name.charAt(0) == "/")
					element.data = element.name;
			}
	
			//Add all tags and non-empty text elements to the element list
			if (element.raw != "" || element.type != ElementType.Text) {
				if (this._options.includeLocation && !element.location) {
					element.location = this.getLocation(element.type == ElementType.Tag);
				}
				this.parseAttribs(element);
				this._elements.push(element);
				//If tag self-terminates, add an explicit, separate closing tag
				if (
					element.type != ElementType.Text
					&&
					element.type != ElementType.Comment
					&&
					element.type != ElementType.Directive
					&&
					element.data.charAt(element.data.length - 1) == "/"
					)
					this._elements.push({
						  raw: "/" + element.name
						, data: "/" + element.name
						, name: "/" + element.name
						, type: element.type
					});
			}
			this._parseState = (tagSep == "<") ? ElementType.Tag : ElementType.Text;
			this._current = this._next + 1;
			this._prevTagSep = tagSep;
		}

		if (this._options.includeLocation) {
			this.getLocation();
			this._location.row += this._location.inBuffer;
			this._location.inBuffer = 0;
			this._location.charOffset = 0;
		}
		this._buffer = (this._current <= bufferEnd) ? this._buffer.substring(this._current) : "";
		this._current = 0;
	
		this.writeHandler();
	}

	Parser.prototype.getLocation = function Parser$getLocation (startTag) {
		var c,
			l = this._location,
			end = this._current - (startTag ? 1 : 0),
			chunk = startTag && l.charOffset == 0 && this._current == 0;
		
		for (; l.charOffset < end; l.charOffset++) {
			c = this._buffer.charAt(l.charOffset);
			if (c == '\n') {
				l.inBuffer++;
				l.col = 0;
			} else if (c != '\r') {
				l.col++;
			}
		}
		return {
			  line: l.row + l.inBuffer + 1
			, col: l.col + (chunk ? 0: 1)
		};
	}

	//Checks the handler to make it is an object with the right "interface"
	Parser.prototype.validateHandler = function Parser$validateHandler (handler) {
		if ((typeof handler) != "object")
			throw new Error("Handler is not an object");
		if ((typeof handler.reset) != "function")
			throw new Error("Handler method 'reset' is invalid");
		if ((typeof handler.done) != "function")
			throw new Error("Handler method 'done' is invalid");
		if ((typeof handler.writeTag) != "function")
			throw new Error("Handler method 'writeTag' is invalid");
		if ((typeof handler.writeText) != "function")
			throw new Error("Handler method 'writeText' is invalid");
		if ((typeof handler.writeComment) != "function")
			throw new Error("Handler method 'writeComment' is invalid");
		if ((typeof handler.writeDirective) != "function")
			throw new Error("Handler method 'writeDirective' is invalid");
	}

	//Writes parsed elements out to the handler
	Parser.prototype.writeHandler = function Parser$writeHandler (forceFlush) {
		forceFlush = !!forceFlush;
		if (this._tagStack.length && !forceFlush)
			return;
		while (this._elements.length) {
			var element = this._elements.shift();
			switch (element.type) {
				case ElementType.Comment:
					this._handler.writeComment(element);
					break;
				case ElementType.Directive:
					this._handler.writeDirective(element);
					break;
				case ElementType.Text:
					this._handler.writeText(element);
					break;
				default:
					this._handler.writeTag(element);
					break;
			}
		}
	}

	Parser.prototype.handleError = function Parser$handleError (error) {
		if ((typeof this._handler.error) == "function")
			this._handler.error(error);
		else
			throw error;
	}

//TODO: make this a trully streamable handler
function RssHandler (callback) {
	RssHandler.super_.call(this, callback, { ignoreWhitespace: true, verbose: false, enforceEmptyTags: false });
}
inherits(RssHandler, DefaultHandler);

	RssHandler.prototype.done = function RssHandler$done () {
		var feed = { };
		var feedRoot;

		var found = DomUtils.getElementsByTagName(function (value) { return(value == "rss" || value == "feed"); }, this.dom, false);
		if (found.length) {
			feedRoot = found[0];
		}
		if (feedRoot) {
			if (feedRoot.name == "rss") {
				feed.type = "rss";
				feedRoot = feedRoot.children[0]; //<channel/>
				feed.id = "";
				try {
					feed.title = DomUtils.getElementsByTagName("title", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.link = DomUtils.getElementsByTagName("link", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.description = DomUtils.getElementsByTagName("description", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.updated = new Date(DomUtils.getElementsByTagName("lastBuildDate", feedRoot.children, false)[0].children[0].data);
				} catch (ex) { }
				try {
					feed.author = DomUtils.getElementsByTagName("managingEditor", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				feed.items = [];
				DomUtils.getElementsByTagName("item", feedRoot.children).forEach(function (item, index, list) {
					var entry = {};
					try {
						entry.id = DomUtils.getElementsByTagName("guid", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.title = DomUtils.getElementsByTagName("title", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.link = DomUtils.getElementsByTagName("link", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.description = DomUtils.getElementsByTagName("description", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.pubDate = new Date(DomUtils.getElementsByTagName("pubDate", item.children, false)[0].children[0].data);
					} catch (ex) { }
					feed.items.push(entry);
				});
			} else {
				feed.type = "atom";
				try {
					feed.id = DomUtils.getElementsByTagName("id", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.title = DomUtils.getElementsByTagName("title", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.link = DomUtils.getElementsByTagName("link", feedRoot.children, false)[0].attribs.href;
				} catch (ex) { }
				try {
					feed.description = DomUtils.getElementsByTagName("subtitle", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.updated = new Date(DomUtils.getElementsByTagName("updated", feedRoot.children, false)[0].children[0].data);
				} catch (ex) { }
				try {
					feed.author = DomUtils.getElementsByTagName("email", feedRoot.children, true)[0].children[0].data;
				} catch (ex) { }
				feed.items = [];
				DomUtils.getElementsByTagName("entry", feedRoot.children).forEach(function (item, index, list) {
					var entry = {};
					try {
						entry.id = DomUtils.getElementsByTagName("id", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.title = DomUtils.getElementsByTagName("title", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.link = DomUtils.getElementsByTagName("link", item.children, false)[0].attribs.href;
					} catch (ex) { }
					try {
						entry.description = DomUtils.getElementsByTagName("summary", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.pubDate = new Date(DomUtils.getElementsByTagName("updated", item.children, false)[0].children[0].data);
					} catch (ex) { }
					feed.items.push(entry);
				});
			}

			this.dom = feed;
		}
		RssHandler.super_.prototype.done.call(this);
	}

///////////////////////////////////////////////////

function DefaultHandler (callback, options) {
	this.reset();
	this._options = options ? options : { };
	if (this._options.ignoreWhitespace == undefined)
		this._options.ignoreWhitespace = false; //Keep whitespace-only text nodes
	if (this._options.verbose == undefined)
		this._options.verbose = true; //Keep data property for tags and raw property for all
	if (this._options.enforceEmptyTags == undefined)
		this._options.enforceEmptyTags = true; //Don't allow children for HTML tags defined as empty in spec
	if ((typeof callback) == "function")
		this._callback = callback;
}

	//**"Static"**//
	//HTML Tags that shouldn't contain child nodes
	DefaultHandler._emptyTags = {
		  area: 1
		, base: 1
		, basefont: 1
		, br: 1
		, col: 1
		, frame: 1
		, hr: 1
		, img: 1
		, input: 1
		, isindex: 1
		, link: 1
		, meta: 1
		, param: 1
		, embed: 1
	}
	//Regex to detect whitespace only text nodes
	DefaultHandler.reWhitespace = /^\s*$/;

	//**Public**//
	//Properties//
	DefaultHandler.prototype.dom = null; //The hierarchical object containing the parsed HTML
	//Methods//
	//Resets the handler back to starting state
	DefaultHandler.prototype.reset = function DefaultHandler$reset() {
		this.dom = [];
		this._done = false;
		this._tagStack = [];
		this._tagStack.last = function DefaultHandler$_tagStack$last () {
			return(this.length ? this[this.length - 1] : null);
		}
	}
	//Signals the handler that parsing is done
	DefaultHandler.prototype.done = function DefaultHandler$done () {
		this._done = true;
		this.handleCallback(null);
	}
	DefaultHandler.prototype.peek = function DefaultHandler$peek () {
		this.handleCallback(null);
	}
	DefaultHandler.prototype.writeTag = function DefaultHandler$writeTag (element) {
		this.handleElement(element);
	} 
	DefaultHandler.prototype.writeText = function DefaultHandler$writeText (element) {
		if (this._options.ignoreWhitespace)
			if (DefaultHandler.reWhitespace.test(element.data))
				return;
		this.handleElement(element);
	} 
	DefaultHandler.prototype.writeComment = function DefaultHandler$writeComment (element) {
		this.handleElement(element);
	} 
	DefaultHandler.prototype.writeDirective = function DefaultHandler$writeDirective (element) {
		this.handleElement(element);
	}
	DefaultHandler.prototype.error = function DefaultHandler$error (error) {
		this.handleCallback(error);
	}

	//**Private**//
	//Properties//
	DefaultHandler.prototype._options = null; //Handler options for how to behave
	DefaultHandler.prototype._callback = null; //Callback to respond to when parsing done
	DefaultHandler.prototype._done = false; //Flag indicating whether handler has been notified of parsing completed
	DefaultHandler.prototype._tagStack = null; //List of parents to the currently element being processed
	//Methods//
	DefaultHandler.prototype.handleCallback = function DefaultHandler$handleCallback (error) {
			if ((typeof this._callback) != "function")
				if (error)
					throw error;
				else
					return;
			this._callback(error, this.dom);
	}
	
	DefaultHandler.prototype.isEmptyTag = function(element) {
		var name = element.name.toLowerCase();
		if (name.charAt(0) == '/') {
			name = name.substring(1);
		}
		return this._options.enforceEmptyTags && !!DefaultHandler._emptyTags[name];
	};
	
	DefaultHandler.prototype.handleElement = function DefaultHandler$handleElement (element) {
		if (this._done)
			this.handleCallback(new Error("Writing to the handler after done() called is not allowed without a reset()"));
		if (!this._options.verbose) {
//			element.raw = null; //FIXME: Not clean
			//FIXME: Serious performance problem using delete
			delete element.raw;
			if (element.type == "tag" || element.type == "script" || element.type == "style")
				delete element.data;
		}
		if (!this._tagStack.last()) { //There are no parent elements
			//If the element can be a container, add it to the tag stack and the top level list
			if (element.type != ElementType.Text && element.type != ElementType.Comment && element.type != ElementType.Directive) {
				if (element.name.charAt(0) != "/") { //Ignore closing tags that obviously don't have an opening tag
					this.dom.push(element);
					if (!this.isEmptyTag(element)) { //Don't add tags to the tag stack that can't have children
						this._tagStack.push(element);
					}
				}
			}
			else //Otherwise just add to the top level list
				this.dom.push(element);
		}
		else { //There are parent elements
			//If the element can be a container, add it as a child of the element
			//on top of the tag stack and then add it to the tag stack
			if (element.type != ElementType.Text && element.type != ElementType.Comment && element.type != ElementType.Directive) {
				if (element.name.charAt(0) == "/") {
					//This is a closing tag, scan the tagStack to find the matching opening tag
					//and pop the stack up to the opening tag's parent
					var baseName = element.name.substring(1);
					if (!this.isEmptyTag(element)) {
						var pos = this._tagStack.length - 1;
						while (pos > -1 && this._tagStack[pos--].name != baseName) { }
						if (pos > -1 || this._tagStack[0].name == baseName)
							while (pos < this._tagStack.length - 1)
								this._tagStack.pop();
					}
				}
				else { //This is not a closing tag
					if (!this._tagStack.last().children)
						this._tagStack.last().children = [];
					this._tagStack.last().children.push(element);
					if (!this.isEmptyTag(element)) //Don't add tags to the tag stack that can't have children
						this._tagStack.push(element);
				}
			}
			else { //This is not a container element
				if (!this._tagStack.last().children)
					this._tagStack.last().children = [];
				this._tagStack.last().children.push(element);
			}
		}
	}

	var DomUtils = {
		  testElement: function DomUtils$testElement (options, element) {
			if (!element) {
				return false;
			}
	
			for (var key in options) {
				if (key == "tag_name") {
					if (element.type != "tag" && element.type != "script" && element.type != "style") {
						return false;
					}
					if (!options["tag_name"](element.name)) {
						return false;
					}
				} else if (key == "tag_type") {
					if (!options["tag_type"](element.type)) {
						return false;
					}
				} else if (key == "tag_contains") {
					if (element.type != "text" && element.type != "comment" && element.type != "directive") {
						return false;
					}
					if (!options["tag_contains"](element.data)) {
						return false;
					}
				} else {
					if (!element.attribs || !options[key](element.attribs[key])) {
						return false;
					}
				}
			}
		
			return true;
		}
	
		, getElements: function DomUtils$getElements (options, currentElement, recurse, limit) {
			recurse = (recurse === undefined || recurse === null) || !!recurse;
			limit = isNaN(parseInt(limit)) ? -1 : parseInt(limit);

			if (!currentElement) {
				return([]);
			}
	
			var found = [];
			var elementList;

			function getTest (checkVal) {
				return(function (value) { return(value == checkVal); });
			}
			for (var key in options) {
				if ((typeof options[key]) != "function") {
					options[key] = getTest(options[key]);
				}
			}
	
			if (DomUtils.testElement(options, currentElement)) {
				found.push(currentElement);
			}

			if (limit >= 0 && found.length >= limit) {
				return(found);
			}

			if (recurse && currentElement.children) {
				elementList = currentElement.children;
			} else if (currentElement instanceof Array) {
				elementList = currentElement;
			} else {
				return(found);
			}
	
			for (var i = 0; i < elementList.length; i++) {
				found = found.concat(DomUtils.getElements(options, elementList[i], recurse, limit));
				if (limit >= 0 && found.length >= limit) {
					break;
				}
			}
	
			return(found);
		}
		
		, getElementById: function DomUtils$getElementById (id, currentElement, recurse) {
			var result = DomUtils.getElements({ id: id }, currentElement, recurse, 1);
			return(result.length ? result[0] : null);
		}
		
		, getElementsByTagName: function DomUtils$getElementsByTagName (name, currentElement, recurse, limit) {
			return(DomUtils.getElements({ tag_name: name }, currentElement, recurse, limit));
		}
		
		, getElementsByTagType: function DomUtils$getElementsByTagType (type, currentElement, recurse, limit) {
			return(DomUtils.getElements({ tag_type: type }, currentElement, recurse, limit));
		}
	}

	function inherits (ctor, superCtor) {
		var tempCtor = function(){};
		tempCtor.prototype = superCtor.prototype;
		ctor.super_ = superCtor;
		ctor.prototype = new tempCtor();
		ctor.prototype.constructor = ctor;
	}

exports.Parser = Parser;

exports.DefaultHandler = DefaultHandler;

exports.RssHandler = RssHandler;

exports.ElementType = ElementType;

exports.DomUtils = DomUtils;

})();

(function(window, document, DJS, html) {

/*
 * DJSUtil
 *
 * Contains helpers and cross-browser wrappers to aide in other DJS functions
 */
    var DJSUtil = window._ || {};

/*
 * DJSUtil.epoch
 *
 * Marking the DominateJS epoch
 */
    DJSUtil.epoch = (new Date()).getTime();

/*
 * DJSUtil.log
 *
 * Attempt to write output to the console using an externally defined 
 * console.log
 */
    DJSUtil.log = function(out) {

        if(DJS.options.verbose) {

            try {

                console.log('[ DJS ] ' + out);
            } catch(e) {}
        }
    };

/*
 * DJSUtil.error
 *
 * Attempt to write output to the console using an externally defined
 * console.error. Falls back to console.log.
 */
    DJSUtil.error = function(out) {

        if(DJS.options.verbose) {

            try {

                console.error('[ DJS ] ' + out);
            } catch(e) {

                DJSUtil.log('[ DJS ] ' + out);
            }
        }
    };

/*
 * DJSUtil.inspect
 *
 * Attempt to inspect an object in the console using an externally defined 
 * console.inspect
 */
    DJSUtil.inspect = function(object) {

        if(DJS.options.verbose) {

            try {

                console.info(object);
            } catch(e) {
                
                DJSUtil.log(object);
            }
        }
    };

/*
 * DJSUtil.globalEval
 *
 * Enables evaluating a JavaScript string in the global scope in a browser-
 * transparent way.
 */
    DJSUtil.globalEval = function(string) {

        if(window.execScript) {
                
            window.execScript(string);
        } else {
            
            window.eval.call(window, string);
        }
    };

/*
 * DJSUtil.forEach
 *
 * Emulates the behavior of forEach in modern browsers, if a native property is
 * not already available.
 */
    DJSUtil.forEach = DJSUtil.forEach || function(list, callback, context) {
        
        if(list.forEach) {
            
            list.forEach(callback, context);
        } else {
            
            if(typeof list.length == 'number') {
                
                for(var index = 0, item; item = list[index]; index++) {

                    if(callback.call(context, item, index, list) === false) return;
                }
            } else {
    
                for(var j in list) {
                    
                    if(list.hasOwnProperty(j)) {
                        
                        if(callback.call(context, list[j], j, list) === false) return;
                    }
                }
            }
        }
    };

/*
 * DJSUtil.navigator
 *
 * This object contains boolean values that indicate which browser is likely
 * being served. This should probably be upgrade to some kind of feature
 * detection for caching methods and other things. If possible.
 */
    DJSUtil.navigator = {
        
        ModernIE: window.navigator.userAgent.indexOf('MSIE 8') !== -1 || window.navigator.userAgent.indexOf('MSIE 9') !== -1,
        IE: window.navigator.userAgent.indexOf('MSIE') !== -1,
        Chrome: window.navigator.userAgent.indexOf('Chrome/') !== -1,
        Opera: window.navigator.userAgent.indexOf('Opera') !== -1,
        Webkit: window.navigator.userAgent.indexOf('AppleWebKit') !== -1,
        Firefox: window.navigator.userAgent.indexOf('Firefox/') !== -1
    },

/*
 * DJSUtil.feature
 *
 * This is a hash of boolean values corresponding to the existance of various
 * browser-level features. Features detected are:
 *
 *      - Native call and apply properties on Element.createElement
 *      - Native call and apply properties on Element.attachEvent
 *      - Existance of the standard Element.addEventListener property
 *      - Support for __defineSetter__ and __defineGetter__ on native elements
 */
    DJSUtil.feature = {

        createElementCallApply: !!(document.createElement.call),
        attachEventCallApply: !!(window.attachEvent && window.attachEvent.call),
        standardEvents: !!(window.addEventListener),
        defineSetterGetter: !!(document.__defineSetter__ && document.__defineGetter__)
    },
/*
 * DJSUtil.getAttribute / DJSUtil.setAttribute
 *
 * Enable browser-transparent manipulation of standard attributes.
 */
    DJSUtil.getAttribute = function(attribute) {
        
        var self = this;

        if(self.getAttribute) {
            
            return self.getAttribute(attribute);
        } else {
            
            return self.attributes[attribute];
        }
    };

    DJSUtil.setAttribute = function(attribute, value) {
        
        var self = this;

        try {

            if(self.setAttribute) {

                self.setAttribute(attribute, value);
            } else {
                
                self.attributes[attribute] = value;
            }
        } catch(e) {
            DJSUtil.log(e);
        }
    };

/*
 * DJSUtil.getData / DJSUtil.setData
 *
 * Enable browser-transparent manipulation of data-* attribute data.
 */
    DJSUtil.getData = function(key) {
        
        var self = this;

        if(self.dataset) {
            
            return self.dataset[key];
        } else {
            
            return DJSUtil.getAttribute.call(self, 'data-' + key);
        }
    };

    DJSUtil.setData = function(key, value) {
        
        var self = this;

        if(self.dataset) {
            
            self.dataset[key] = value;
        } else {
            
            DJSUtil.setAttribute.call(self, 'data-' + key);
        }
    };

/*
 * DJSUtil.addEventListener / DJSUtil.removeEventListener
 *
 * These helper functions wrap the native event attachment properties in order
 * to transparently enable event handling across browsers.
 */
    DJSUtil.addEventListener = function(event, listener, captures) {

        var self = this;

        if(DJSUtil.feature.standardEvents) {

            self.addEventListener(event, listener, captures);
        } else {

            self.attachEvent('on' + event, listener);
        }
    };

    DJSUtil.removeEventListener = function(event, listener, captures) {

        var self = this;

        if(DJSUtil.feature.standardEvents) {

            self.removeEventListener(event, listener, captures);
        } else {

            self.detachEvent('on' + event, listener);
        }
    };

/*
 * DJSUtil.subclass
 *
 * Provides an interface for creating simple class inheritance.
 */
    DJSUtil.subclass = function(superConstructor, constructor, prototype) {

        constructor.prototype = new superConstructor();

        DJSUtil.forEach(
            prototype,
            function(value, property) {

                constructor.prototype[property] = prototype[property]
            }
        );

        return constructor;
    };

/*
 * class DJSDominatrix
 *
 * This class serves as the core ancestor for any DominateJS classes that take
 * over manual operation of native DOM elements.
 */
    var DJSDominatrix = function(sub) {

        var self = this;

        self.target = sub;
        self.deferredEventHandlers = {};
        self.capturedEvents = {};
        self.nativeMethods = {};

    };

    DJSDominatrix.prototype = {

/*
 * DJSDominatrix.dominate
 *
 * This method handles basic element domination. It wraps the event handling
 * entry points on the target element, and listens for any handlers being
 * attached to deferred events. These handlers are then cached for deferred
 * execution. Subclasses should override this method when performing custom
 * domination of an element.
 */
        dominate: function() {

            var self = this,
                nativeMethods = self.nativeMethods,
                deferredEventHandlers = self.deferredEventHandlers,
                wrapNativeMethod = self.wrapNativeMethod,
                target = self.target,
                addEventWrapper = function(event, handler) {

                    // TODO: The specification and documents specify that this
                    // method will be smart enough not to add the same handler
                    // twice. The same handler means same event, same function
                    // and same captures value. Currently we don't respect this
                    var args = arguments,
                        attachEventUsed = event.indexOf('on') == 0,
                        eventType = attachEventUsed ? event.substring(2) : event,
                        handlerQueue = deferredEventHandlers[eventType];

                    if(handlerQueue) {
                        
                        handlerQueue.push(args);
                    } else {

                        if(attachEventUsed) {

                            if(DJSUtil.feature.attachEventCallApply) {

                                nativeMethods.attachEvent.apply(target, args);
                            } else {

                                nativeMethods.attachEvent(event, handler);
                            }
                        } else {

                            nativeMethods.addEventListener.apply(target, args);
                        }
                    }
                },




                /*
                 * removeEventWrapper
                 * 
                 * Simulates native removeEventListener / detachEvent
                 *
                 * Given eventType, function, captures?,
                 * 
                 * If the user previously called
                 *
                 *   addEventWrapper(type, function, captures?) 
                 *   (as addEventListener(...) or attachEvent(...) )
                 *
                 * and hasn't yet removed the event handler, calling
                 *
                 *   removeEventWrapper(type, function, captures?)
                 *   (as removeEventListener(...) or detachEvent(...) )
                 *
                 * will remove that listener from the list.
                 *
                 * Note that each (type, function, captures?) triple defines
                 * a unique "handler".  Therefore, 
                 *
                 *   addEventListener("load", myhandler, true)
                 *   removeEventListener("load", myhandler, false)
                 *
                 * will NOT remove the handler.
                 */
                removeEventWrapper = function(event) {

                    // Notes: check if the set (event, handler, useCapture)
                    // or (event, handler) given by 'arguments' exists in our
                    // deferredEventHandlers set

                    var args = arguments,
                        eventType = event.indexOf('on') == 0 ? event.substring(2) : event,
                        handlerFound = false,
                        handlerQueue = deferredEventHandlers[eventType];

                    // For each handler registered to eventType,
                    // find the first handler that matches all arguments
                    // passed to removeEventWrapper.  Remove that handler.
                    DJSUtil.forEach(

                        handlerQueue,
                        function(queuedArgs, queueIndex) {

                            var argsLength = queuedArgs.length;

                            // don't bother if args length doesn't match
                            if (argsLength != args.length) {
                                return false;
                            }

                            DJSUtil.forEach(
                                queuedArgs,
                                function(queuedArg, argIndex) {

                                    if(queuedArg !== args[argIndex]) {

                                        return false;
                                    }

                                    // if all args have matched, this is it
                                    if(argIndex == argsLength-1) {

                                        handlerQueue.splice(queueIndex, 1);
                                        handlerFound = true;
                                    }
                                }
                            );

                            return !handlerFound;
                        }
                    );
                };

            wrapNativeMethod.call(self, 'addEventListener', addEventWrapper);
            wrapNativeMethod.call(self, 'attachEvent', addEventWrapper);
            wrapNativeMethod.call(self, 'removeEventListener', removeEventWrapper);
            wrapNativeMethod.call(self, 'detachEvent', removeEventWrapper);
        },

/*
 * DJSDominatrix.restore
 *
 * This method returns the domination target to its "natural" state. Override
 * this method to restore any modifications to the target element.
 */
        restore: function() {

            var self = this;
            
            self.restoreNativeMethods();
        },

/*
 * DJSDominatrix.deferEvent
 *
 * This method registers an event to be deferred. When fired in the DOM, the
 * actual event object will be cached. All handlers listening for that event
 * will have already been redirect away from the DOM into a the DJSDominatrix
 * queue. See DJSDominatrix.fireEvent for re-firing cached events.
 */
        deferEvent: function(eventType) {

            var self = this,
                target = self.target,
                deferredEventHandlers = self.deferredEventHandlers,
                capturedEvents = self.capturedEvents,
                nativeMethods = self.nativeMethods,
                addEventListener = nativeMethods.addEventListener || nativeMethods.attachEvent,
                captureHandler = function(event) {
                    
                    event.captureHandler = arguments.callee;
                    capturedEvents[eventType] = event;
                };

            if(addEventListener) {

                if(!deferredEventHandlers[eventType]) {

                    deferredEventHandlers[eventType] = [];
                }

                if(DJSUtil.feature.standardEvents || DJSUtil.feature.attachEventCallApply) {

                    addEventListener.call(target, eventType, captureHandler, true);
                } else {

                    addEventListener(target, eventType, captureHandler);
                }
            }
        },

/*
 * DJSDominatrix.fireEvent
 *
 * This method re-dispatches deferred events. Queued handlers receive the event
 * in the appropriate order. Finally, "on" event properties are checked and
 * executed if they exist. After DJSDominatrix.fireEvent is called, the fired
 * event will no longer be captured by the DJSDominatrix instance.
 */
        fireEvent: function(eventType) {

            var self = this,
                target = self.target,
                capturedEvents = self.capturedEvents,
                deferredEventHandlers = self.deferredEventHandlers,
                nativeMethods = self.nativeMethods,
                removeEventListener = nativeMethods.removeEventListener || nativeMethods.detachEvent,
                event = capturedEvents[eventType];

            // Sometimes we miss DOMContentLoaded, but we still need the event
            if(eventType == "DOMContentLoaded" && deferredEventHandlers[eventType].length && !event) {

                event = document.createEvent("HTMLEvents");
                
                event.initEvent("DOMContentLoaded", false, false);
            }

            if(event) {

                var nativeStopPropagation = event.stopPropagation,
                    nativeStopImmediatePropagation = event.stopImmediatePropagation;

                if(nativeStopPropagation) {

                    event.stopPropagation = function() {

                        event.propagationStopped = true;
                        nativeStopPropagation.apply(event, arguments);
                    };
                }

                if(nativeStopImmediatePropagation) {

                    event.stopImmediatePropgation = function() {

                        event.propagationStopped = true;
                        nativeStopImmediatePropagation.apply(event, arguments);
                    };
                }

                DJSUtil.forEach(

                    deferredEventHandlers[eventType],
                    function(args, index) {

                        var context = nativeMethods.attachEvent ? window : target,
                            handler = args[1];

                        handler.call(context, event);

                        if(event.propagationStopped) {

                            return false;
                        }
                    }
                );

                if(!event.propagationStopped) {

                    var onHandler = target["on" + eventType.toLowerCase()];

                    if(onHandler) {

                        // TODO: Verify that the context should be window here
                        // it might be the element on which the property was
                        // set. This seems to vary between IE and others.
                        onHandler.call(window, event);
                    }
                }

                if(DJSUtil.feature.standardEvents || DJSUtil.feature.attachEventCallApply) {

                    removeEventListener.call(target, eventType, event.captureHandler, true);
                } else {

                    removeEventListener(target, eventType, event.captureHandler);
                }
            }
        },

/*
 * DJSDominatrix.wrapNativeMethod
 *
 * This method enables the wrapping of native methods in a consistant way. Native
 * methods are cached properly in a way that the DJSDominatrix instance can
 * reference consistently.
 */
        wrapNativeMethod: function(propertyString, wrapper) {

            var self = this,
                target = self.target,
                nativeMethods = self.nativeMethods;

            if(target[propertyString]) {

                nativeMethods[propertyString] = target[propertyString];
                target[propertyString] = wrapper;
            }
        },

/*
 * DJSDominatrix.restoreNativeMethods
 *
 * This method restores all native methods wrapped using 
 * DJSDominatrix.wrapNativeMethod. It is automatically called by the basic
 * DJSDominatrix.restore method.
 */
        restoreNativeMethods: function() {

            var self = this,
                target = self.target,
                nativeMethods = self.nativeMethods;

            DJSUtil.forEach(

                nativeMethods,
                function(method, propertyString) {

                    target[propertyString] = method;
                }
            );
        }
    };



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

/*
 * class DJSDocument
 *
 * This class wraps the document object. It ensures that all calls to the
 * document's write and writeln properties are handled in a safe way.
 */
    var DJSDocument = function(document) {
        
        var self = this;

        DJSDominatrix.call(self, document);
        
        if(html) {
            self.hasWriteBuffer = false;
            self.parser = new html.Parser(
                new html.DefaultHandler(
                    function(error, dom) {
                        
                        if(error) {
                            
                            DJSUtil.error('PARSER ERROR: ' + error);
                        } else {

                            self.insert(dom);
                        }
                    }
                )
            );
        } else {
        	
        	DJSUtil.error('Warning: no HTML parser detected. Document.write will be disabled!');
        }
    };

    DJSUtil.subclass(
        DJSDominatrix, 
        DJSDocument,
        {

/*
 * DJSDocument.dominate
 *
 * This method replaces the native document.write and document.writeln properties
 * with an asynchronous-load-safe alternative. Additionally, it captures the
 * DOMContentReady event if it is dispatched, and forwards it to any handlers at
 * the appropriate time.
 */
            dominate: function() {

                var self = this,
                    writeWrapper = function(out) {
                        
                        self.write(out);
                    };

                DJSDominatrix.prototype.dominate.apply(this);

                self.wrapNativeMethod("write", writeWrapper);
                self.wrapNativeMethod("writeln", writeWrapper);
                self.wrapNativeMethod(
                    "createElement",
                    function(type) {

                        var args = arguments,
                            caller = arguments.callee.caller || {},
                            nativeMethods = self.nativeMethods,
                            element = DJSUtil.feature.createElementCallApply ? nativeMethods.createElement.apply(document, args) : nativeMethods.createElement(type);

                        if(type.indexOf('script') != -1) {

                            slaveScripts.pushSubscript(element, caller);
                        }

                        return element;
                    }
                );

                self.deferEvent("DOMContentLoaded");
                self.deferEvent("readystatechange");
            },

/*
 * DJSDocument.ready
 *
 * When called, this simulates the dispatching of the DOMContentLoaded event
 * and the readystatechange event.
 */
            ready: function() {

                var self = this;
                self.fireEvent("DOMContentLoaded");
                self.fireEvent("readystatechange");
            },

/*
 * DJSDocument.write
 *
 * Let scripts execute document.write post-onload without clobbering the page
 *
 * This method inserts nodes into the DOM given a fragment of HTML. Ideally,
 * a call to DJSDocument.write(html) post-onload and document.write(html)
 * pre-onload would yeild the same DOM structure.
 * 
 * General approach: use an HTML parser and HTML semantics engine to simulate
 * the browser's native behavior.
 *
 */

            write: function(out) {
                
                var self = this,
                    parser = self.parser;

                DJSUtil.log('Buffering document.write content: ' + out);
                
                if(parser && DJSParserSemantics) {

                    self.hasWriteBuffer = true;
                    DJSParserSemantics.mixins.withParserDocwrite.apply(self, [parser, out]);
                } else {
                    
                    DJSUtil.log('Ignoring document.write content: ' + out);
                    // TODO: Fallback to the span / innerHtml option?
                }
            },

/*
 * DJSDocument.flush
 *
 * Cuts off the current buffer and asks the parser to attempt to parse it.
 */
            flush: function() {
            
                var self = this;
                
                DJSUtil.log('Flushing document.write buffer!');
                
                if(self.hasWriteBuffer) {

                    self.parser.done();
                    self.parser.reset();
                    self.hasWriteBuffer = false;
                }
            },

/*
 * DJSDocument.convertAbstractElement
 *
 * Given abstract data for an element as generated by the HTML parser, this
 * method will return a DOM element.
 * 
 * This method forwards to the DJSParserSemantics mixin if available. Otherwise
 * it does nothing.
 */

            convertAbstractElement: function(abstractElement) {
             
                var self = this;

                // TODO: Look into a more elegant method for incorporating mixins..
                if(DJSParserSemantics) {

                    return DJSParserSemantics.mixins.convertAbstractElement.apply(self, arguments);
                }
            },

/*
 * DJSDocument.insert
 *
 * Inserts parsed document.write content into the DOM. Utilizes the
 * DJSParserSemantics.insertionMixin to do this if it is available, otherwise
 * does nothing.
 * 
 * This method forwards calls to the DJSParserSemantics mixin if available.
 * Otherwise it does nothing.
 */
            insert: function(abstractDOM, rawParent) {
                
                var self = this;
                
                if(DJSParserSemantics) {

                    return DJSParserSemantics.mixins.insert.apply(self, arguments);
                }
            }

        }
    );

/*
 * class DJSWindow
 *
 * This class wraps the window object. It takes over for native event handling
 * of the 'load' event in a browser-transparent way.
 */
    var DJSWindow = function(window) {
        
        var self = this;

        DJSDominatrix.call(self, window);
    };

    DJSUtil.subclass(
        DJSDominatrix, 
        DJSWindow,
        {

/*
 * DJSWindow.dominate
 *
 * This method manipulates the window object in the following ways:
 *
 *     -  If possible, wraps window.onload in a getter / setter pair in order to
 *        capture assignments to it.
 *     -  If possible, wraps window.addEventListener in order to capture all
 *        'load' event handlers for deferred execution.
 *     -  Alternatively, attempts to wrap window.attachEvent in a similar way.
 *     -  As a last resort, makes a note to manually execute whatever is assigned
 *        to window.onload at the appropriate time.
 *        
 * Additionally, this method captures the actual 'load' event for proper
 * distribution later on.
 */
            dominate: function() {
                
                var self = this,
                    window = self.target,
                    nativeMethods = self.nativeMethods,
                    handlers = self.handlers,
                    options = {};

                /* First time dominate runs, DJS will be an array of
                 * commands and onload listeners.
                 * Process all commands and replace DJS with a hash.
                 * DJS.push() remains.
                 */
                if (DJS instanceof Array) {

                    var withValidArgs = function(args, cb) {

                        if (args[0] instanceof Function ||
                           (args[0] instanceof Array
                            && args[0].length)) {

                            return cb();
                        }
                    };

                    DJSUtil.forEach(DJS, function(pushed) {

                        withValidArgs(arguments, function() {

                            if (pushed instanceof Function ||

                                 pushed[0] == "defer") {

                                self.whenLoaded(pushed[1]);

                            } else if (pushed[0] == "option") {

                                // format is ["option", keyname, value]
                                var key = pushed[1],
                                    value = pushed[2];

                                options[key] = value;
                            }
                        });
                    });

                    DJS = window.__CF.DJS = {

                        inlineScripts: [],

                        inlineScriptDone: function(code) {

                            var done = window.__CF.DJS.inlineScripts[code];
                            delete window.__CF.DJS.inlineScripts[code];
                            slaveScripts.fireSubscriptDone(done);
                        },

                        options: options,

                        push: self.whenLoaded

                    };

                };

                DJSDominatrix.prototype.dominate.call(self);
                
                self.deferEvent('load');
            },

/*
 * DJSWindow.whenLoaded
 *
 * Manually insert an event listener for the 'load' event on the dominated window
 */
            whenLoaded: function(callback) {

                var self = this,
                    window = self.target,
                    nativeMethods = self.nativeMethods;

                if (document.readyState === "complete") {

                    callback();
                } else {

                    if(nativeMethods.addEventListener) {

                        nativeMethods.addEventListener.call(window, 'load', callback, true);
                    } else {

                        nativeMethods.attachEvent('onload', callback);
                    }
                }
            },
/*
 * DJSWindow.load
 *
 * This method enables simulation of the window's load event. It calls all
 * deferred handlers, and gracefully handles un-wrappable onload assignments.
 */
            load: function() {
                
                var self = this,
                    window = self.target,
                    handlers = self.handlers;
                
                self.fireEvent('load');
            }
        }
    );


/*
 * class DJSScript
 *
 * This class wraps DOM script objects. It provides a helper interface for
 * pre-caching scripts asynchronously and then executing them synchronously 
 */
    var DJSScript = function(script) {
        
        var self = this;
        
        self.originalScript = script;
        self.src = DJSUtil.getData.call(script, 'djssrc');
        self.external = !!self.src;
        self.loadHandlers = [];
        
        script.dominated = true;
    };

    DJSScript.prototype = {

/*
 * DJSScript.precache
 *
 * Performs precache-ing of the script if necessary. In IE and Opera, scripts
 * are precached with an image, and in all other browsers an object is used.
 */
        precache: function(callback) {
            
            var self = this,
                loadHandlers = self.loadHandlers;

            if(self.external) {
                
                var precacheObject,
                    loadHandler = function() {

                        // TODO: Investigate whether or not we need to be
                        // checking the readyState here for IE
                        
                        // Handler cache complete..
                        DJSUtil.log('Finished precache-ing resource at ' + self.src);

                        self.ready = true;

                        DJSUtil.forEach(
                            self.loadHandlers,
                            function(handler) {

                                handler(self);
                            }
                        );

                        if(callback) {

                            callback(self.src);
                        }

                        detachHandlers();
                    },
                    errorHandler = function() {

                        // Handle cache error..
                        DJSUtil.log('Failed to precache resource at ' + self.src);

                        if(callback) {

                            callback(false);
                        }

                        detachHandlers();
                    },
                    attachHandlers = function() {
                        
                        precacheObject.onload = loadHandler;
                        precacheObject.onerror = errorHandler;
                    },
                    detachHandlers = function() {
                     
                        precacheObject.onload = precacheObject.onerror = null;
                    };
                
                DJSUtil.log('Precache-ing script at ' + self.src);
                
                if(DJSUtil.navigator.IE || DJSUtil.navigator.Opera) {
                    
                    // Precache the element as an Image...
                    precacheObject = new Image();

                    attachHandlers();
                    
                    precacheObject.src = self.src;
                } else {

                    // Precache the element as an Object...
                    var appendTarget = DJSUtil.navigator.Firefox ? document.getElementsByTagName('head')[0] : document.body;                        

                    precacheObject = document.createElement('object'),
                    
                    attachHandlers();

                    precacheObject.data = self.src;
                    precacheObject.width = 0;
                    precacheObject.height = 0;
                    precacheObject.style.position = "absolute";
                    precacheObject.style.left = "-999";

                    appendTarget.appendChild(precacheObject);
                }
            } else {

                self.ready = true;

                DJSUtil.forEach(
                    self.loadHandlers,
                    function(handler) {

                        handler(self);
                    }
                );

                if(callback) {
                    
                    callback(true);
                }
            }
        },

/*
 * DJSScript.execute
 *
 * Executes the script using the appropriate method. External scripts are
 * attached a s properly formatted script tag, and inline scripts are eval'd
 * in the global scope.
 */
        execute: function(callback) {
            
            var self = this,
                script = self.originalScript;

            slaveDocument.streamCursor = script || document.body.firstChild;
			
            if(self.external) {

                var createElement = slaveDocument.nativeMethods.createElement,
                    newScript = DJSUtil.feature.createElementCallApply ? createElement.call(document, 'script') : createElement('script'),
                    detachHandlers = function() {
                     
                        newScript.onload = newScript.onreadystatechange = newScript.onerror = null;
                    };

                DJSUtil.log('Executing external script from ' + self.src + '...');

                newScript.onload = newScript.onreadystatechange = function() {

                    var readyState = newScript.readyState;

                    if(readyState && readyState != 'complete' && readyState != 'loaded') {

                        return;
                    }
                    
                    slaveDocument.flush();

                    detachHandlers();

                    callback(self.src);
                };

                newScript.onerror = function() {

                    DJSUtil.error('Error while attempting to execute this external script: ' + self.src);
                    
                    detachHandlers();

                    callback(false);
                };

                newScript.src = self.src;
                
                script.parentNode.insertBefore(newScript, script);
            } else {

                DJSUtil.log('Executing an inline script...');

                try {

                    DJSUtil.globalEval(script.text);
                    slaveDocument.flush();
                } catch(e) {
                    
                    DJSUtil.error(e + ' while attempting to execute this inline script: ');
                    DJSUtil.inspect(script);

                    callback(false);
                    // TODO: Reset slave document buffer without a flush..
                }

                callback(true);
            }
        },

        whenLoaded: function(callback) {

            var self = this,
                loadHandlers = self.loadHandlers;
            
            if(self.ready) {

                callback(self);
            } else {

                loadHandlers.push(callback);
            }
        } 
    };


/*
 * class DJSScriptManager
 *
 * This class handles the queueing, asynchronous loading and synchronous 
 * execution of all appropriately formatted script tags in the document.
 */
    DJSScriptManager = function() {

        var self = this;

        self.slaves = [];
        self.captives = [];
        self.subscriptStack = [];

        self.urlCache = {};
        self.executing = false;
        self.currentExecution = null;
        self.paused = self.breakExecution = false;

        // After every subscript finishes, 
        self.subscriptDoneHandlers = [];
        self.onSubscriptDone(function popScriptStack(done) {
                    
            self.subscriptStack.pop();

            DJSUtil.log("Script completed: ");
            DJSUtil.inspect(done);

            if(self.subscriptStack.length == 0) {

                self.resume();
            }
        });
    };

    DJSScriptManager.prototype = {
 
/*
 * DJSScriptManager.dominate
 *
 * TODO: Document me
 */
        dominate: function(once) {

            var self = this,
                urlCache = self.urlCache,
                captives = self.captives,
                scripts = document.getElementsByTagName('script'),
                enslavedCount = 0,
                passCount = 0,
                complete = function() {
                 
                    DJSUtil.log('Detected a total of ' + enslavedCount + ' undominated scripts...');
                },
                search = function() {

                    passCount++;

                    DJSUtil.forEach(

                        scripts,
                        function(script, index) {

                            if(!script.dominated && DJSUtil.getAttribute.call(script, 'type') === 'text/djs') {

                                var slave = new DJSScript(script);

                                captives.push(slave);

                                if(!self.executing) {

                                    setTimeout(
                                        function() {
                                            
                                            slave.precache();
                                        },
                                        1
                                    );
                                } else {

                                    slave.ready = true;
                                }

                                enslavedCount++;
                            }
                        }
                    );

                    if(passCount > 2 || once) {

                        clearInterval(searchLoop);
                        complete();
                    }
                },
                searchLoop = setInterval(
                    search,
                    25
                );

            search();
        },

 /*
  * DJSScriptManager.handleInlineScriptText
  *
  * Inject exection flow mamangement snippet
  */
        handleInlineScriptText: function(scriptElement, scriptText) {

            var code = window.DJS.inlineScripts.push(scriptElement) - 1;
                snippet = "\n(function(){window.__CF.DJS.inlineScriptDone("+code+")})();";

            DJSUtil.log("Pushing script to inline script stack:");
            DJSUtil.inspect(scriptText + snippet);

            return scriptText + snippet;
        },
 
/*
 * DJSScriptManager.execute
 *
 * TODO: Document me
 */
        execute: function(callback) {

            var self = this,
                paused = self.paused;

            if(!paused) {

                var captives = self.captives,
                    slaves = self.slaves,
                    executionCallback = self.executionCallback,
                    executeNext = function() {
                     
                        if(self.breakExecution) {

                            DJSUtil.log('Pausing execution...');
                            self.paused = true;
                        } else {
                            
                            self.execute();
                        }
                    };

                self.executionCallback = callback || self.executionCallback;
                self.executing = !!self.executionCallback

                if(captives.length) {

                    var slave = captives[0];

                    if(!self.currentExecution && self.executing) {

                        DJSUtil.log('Queueing execution of next script...');

                        self.currentExecution = captives.shift();

                        slave.whenLoaded(

                            function() {

                                slave.execute(

                                    function(success) {

                                        if(success) {

                                            slaves.push(slave);
                                            
                                            DJSUtil.log('Execution finished for this script: ');
                                            DJSUtil.inspect(slave);

                                            self.currentExecution = null;

                                            DJSUtil.log('Executed ' + slaves.length + ' scripts so far; ' + captives.length + ' scripts left in the queue...');
                                        } else {

                                            DJSUtil.error('Failed execution!');
                                        }

                                        executeNext();
                                    }
                                );
                            }
                        );
                    }

                    return;
                } else {

                    DJSUtil.log('Performing fallback scan for scripts..');

                    self.dominate(true);

                    if(captives.length) {

                        executeNext();
                        return;
                    }
                }

                if(!captives.length && self.executionCallback) {

                    if(!self.executionFinished) {
                        
                        DJSUtil.log('Looks like we are done dominating!');
                        self.executionCallback();
                        self.executionFinished = true;
                    }

                    return;
                }
            }
        },

/*
 * DJSScriptManager.pause
 *
 * TODO: Document me
 */
        pause: function() {

            var self = this;
            self.breakExecution = true;
        },

/*
 * DJSScriptManager.resume
 *
 * TODO: Document me
 */
        resume: function() {

            var self = this;

            self.breakExecution = false;

            if(self.paused) {

                DJSUtil.log('Resuming execution...');
                self.paused = false;
                self.execute();
            }
        },
/*
 * DJSScriptManager.pushSubscript
 *
 * Push a new script onto our execution stack.  Top-level
 *  script execution cannot resume until this stack
 *  reaches 0
 *
 * For online scripts, track onload by injecting a callback
 */
        pushSubscript: function(element, chaperone) {

            var self = this,
                subscriptStack = self.subscriptStack,
                stackLevel,
                parentStreamCursor = slaveDocument.streamCursor,
                popStack = function() {
                    
                    subscriptStack.pop();

                    if(subscriptStack.length == 0) {

                        self.resume();
                    }
                },
                loadEventHandler = function() {

                    var readyState = element.readyState;

                    clearTimeout(timeout);

                    if(readyState && readyState != 'complete' && readyState != 'loaded') {

                        return;
                    }
                   
                    //self.flush();
                    slaveDocument.streamCursor = parentStreamCursor;
                    removeHandlers();
                    // TODO: this part should become the global script-complete handler:
                    //popStack();
                    self.fireSubscriptDone(element);
                },
                removeHandlers = function() {

                    DJSUtil.removeEventListener.call(element, 'load', loadEventHandler, true);
                    DJSUtil.removeEventListener.call(element, 'readystatechange', loadEventHandler, true);
                    DJSUtil.removeEventListener.call(element, 'error', errorHandler, true);
                },
                errorHandler = function() {

                    slaveDocument.streamCursor = parentStreamCursor;
                    removeHandlers();
                    self.fireSubscriptDone(element);
                    //popStack();
                },
                // TODO: Mega hack to make sure pushed subscripts don't pause
                // us indefinitely. We MUST to find a better way around this.
                // (this is in case a script node is created but never added to the live DOM)
                timeout = setTimeout(
                    function() {
                        
                        if(!element.parentNode) {

                            DJSUtil.log('Subscript took too long to be inserted. Bailing out!');
                            DJSUtil.inspect(element);
                            DJSUtil.inspect(chaperone);
                            errorHandler();
                        }
                    }, 
                    30
                );


            stackLevel = subscriptStack.push(element);
            DJSUtil.log('Pushing a subscript of the current execution (level '+stackLevel+'): ');
            DJSUtil.inspect(element);

            self.pause();
                    

            // external only
            // inline scripts can't modify the streamCursor as external
            // scripts can (or can they?)
            slaveDocument.streamCursor = element || document.body.firstChild;

            // external only - use text hack here for internal
            if(DJSUtil.navigator.IE) {

                DJSUtil.addEventListener.call(element, 'readystatechange', loadEventHandler, true);
            } else {

                DJSUtil.addEventListener.call(element, 'load', loadEventHandler, true);
            }

            DJSUtil.addEventListener.call(element, 'error', errorHandler, true);

        },

        fireSubscriptDone: function(element) {
            var self = this;

            DJSUtil.forEach(self.subscriptDoneHandlers, function(handler) {

                handler.call(self, element);
            });
        },

/*
 * DJSScriptManager.onSubscriptDone
 *
 * Attach a callback which will run whenever a subscript finishes
 */
        onSubscriptDone: function(callback) {
            var self = this;

            self.subscriptDoneHandlers.push(callback);
        }
    };


    var slaveDocument = new DJSDocument(document),
        slaveWindow = new DJSWindow(window),
        slaveScripts = new DJSScriptManager();


    slaveWindow.dominate();
    DJSUtil.log('Window dominated, moving on to all appropriate scripts!');
    slaveScripts.dominate();

    slaveWindow.whenLoaded(

        function() {

            DJSUtil.log('Show time. Dominating the document and executing scripts!');
            
            slaveDocument.dominate();

            slaveScripts.execute(

                function() {

                    slaveDocument.flush();
                    DJSUtil.log('Finished executing. Simulating load, ready and readystatechange events!');

                    slaveDocument.ready();
                    slaveWindow.load();

                    DJSUtil.log('Restoring native DOM methods!');

                    slaveDocument.restore();
                    slaveWindow.restore();

                    DJSUtil.log('Took ' + (((new Date()).getTime()) - DJSUtil.epoch) + 'ms for total domination!');
                    DJSUtil.log('Fin.');
                }
            );
        }
    );

})(
    window,
    document,
    typeof __CF == "undefined" ? {} : (__CF.DJS || []),
    typeof exports != "undefined" ? exports : false,
    typeof DJSParserSemantics != "undefined" ? DJSParserSemantics : false
);


})(window, document);