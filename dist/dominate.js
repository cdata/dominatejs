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

(function(window, document, options, html) {

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

        if(options.verbose) {

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

        if(options.verbose) {

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

        if(options.verbose) {

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
        
        IE: window.navigator.userAgent.indexOf('MSIE') !== -1,
        Chrome: window.navigator.userAgent.indexOf('Chrome/') !== -1,
        Opera: window.navigator.userAgent.indexOf('Opera') !== -1,
        Webkit: window.navigator.userAgent.indexOf('AppleWebKit') !== -1,
        Firefox: window.navigator.userAgent.indexOf('Firefox/') !== -1
    },

/*
 * DJSUtil.feature
 *
 * TODO: Document me
 */
    DJSUtil.feature = {

        createElementCallApply: !!(document.createElement.call),
        attachEventCallApply: !!(window.attachEvent && window.attachEvent.call),
        standardEvents: !!(window.addEventListener)
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

        if(self.setAttribute) {

            self.setAttribute(attribute, value);
        } else {
            
            self.attributes[attribute] = value;
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
 * TODO: Document me
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
     * DJSUtil.htmlSemanticRules
     *
     * Based on HTML5 semantics: 
     * http://dev.w3.org/html5/spec/Overview.html
     */
    DJSUtil.htmlSemanticRules = {
        'head': {
            inclusive: {
                'html': 1
            }
         },
        'title': {
            inclusive: {
                'head': 1
            }
        },
        'base': {
            inclusive: {
                'head': 1
            }
        },
        'link': {
            exclusive: { }
        },
        'meta': {
            exclusive: { }
        },
        'style': {
            exclusive: { }
        },
        'script': {
            exclusive: { }
        },
        'noscript': {
            exclusive: {
                'noscript': 1
            } //TODO: noscript cannot be a descendant of noscript, even indirectly
        },
        'body': {
            inclusive: {
                'html': 1
            }
        },
        'div': { // this is a hack until proper flow / phrasing classes are used
            exclusive: {
                'p': 1
            }
        }
        // TODO: define rules in terms of content models (tag classes), i.e. flow content vs phrasing content
    };

    DJSUtil.isValidParent = function(node, parentNode) {

        var rules = DJSUtil.htmlSemanticRules,
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

/*
 * class DJSDocument
 *
 * This class wraps the document object. It ensures that all calls to the
 * document's write and writeln properties are handled in a safe way.
 */
    var DJSDocument = function(document) {
        
        var self = this;
        self.document = document;

        self.subscriptQueue = [];

        self.nativeMethods = {
            
            write: document.write,
            writeln: document.writeln,
            createElement: document.createElement,
            addEventListener: document.addEventListener,
            attachEvent: document.attachEvent
        };

        self.handlers = {
            
            DOMContentLoaded: [],
            readystatechange: []
        };
        
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

    DJSDocument.prototype = {

/*
 * DJSDocument.restore
 *
 * This method will restore the native document.write and document.writeln
 * properties originally over-written by the DJSDocument.
 */
        restore: function() {
            
            var self = this,
                document = self.document,
                nativeMethods = self.nativeMethods;

            document.createElement = nativeMethods.createElement;
            document.write = nativeMethods.write;
            document.writeln = nativeMethods.writeln;
            document.addEventListener = nativeMethods.addEventListener;
            document.attachEvent = nativeMethods.attachEvent;
        },

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
                document = self.document,
                nativeMethods = self.nativeMethods,
                handlers = self.handlers;

            document.write = document.writeln = function(out) {
            
                self.write(out);
            };

            document.createElement = function(type) {

                var args = arguments,
                    element = DJSUtil.feature.createElementCallApply ? nativeMethods.createElement.apply(document, args) : nativeMethods.createElement(type);

                if(type.indexOf('script') != -1) {

                    self.queueSubscript(element);
                }

                return element;
            };
            
            // TODO: See about unifying this functionality with the almost
            // identical stuff in DJSWindow.dominate...
            if(document.__defineSetter__ && document.__defineGetter__) {
                
                window.__defineSetter__(
                    'onreadystatechange',
                    function(handler) {
                        
                        self.onreadystatechange = handler;
                    }
                );

                window.__defineGetter__(
                    'onreadystatechange',
                    function() {
                        
                        return self.onreadystatechange;
                    }
                );
            } else {
                
                self.fallback = true;
            }

            if(document.addEventListener) {
                document.addEventListener = function(event, handler) {
                    
                    if(handlers[event]) {
                        
                        // TODO: See similar comment in DJSWindow.dominate
                        handlers[event].push(handler);
                    } else {
                        
                        nativeMethods.addEventListener.apply(document, arguments);
                    }
                }

                DJSUtil.forEach(

                    handlers,
                    function(handlerArray, eventName) {

                        nativeMethods.addEventListener.call(

                            document,
                            eventName,
                            function(event) {

                                self[eventName + 'Event'] = event;
                            },
                            true
                        );
                    }
                );
            } else if(document.attachEvent) {

                document.attachEvent = function(event, handler) {

                    var trimmedEvent = event.substring(2);

                    if(handlers[trimmedEvent]) {

                        handlers[trimmedEvent].push(handler);
                    } else {

                        nativeMethods.attachEvent(event, handler);
                    }
                };

                DJSUtil.forEach(

                    handlers,
                    function(handlerArray, eventName) {
                        
                        nativeMethods.attachEvent(

                            'on' + eventName,
                            function(event) {

                                self[eventName + 'Event'] = event;
                            }
                        );
                    }
                );
            }
        },

 /*
  * DJSDocument.ready
  *
  * When called, this simulates the dispatching of the DOMContentLoaded event.
  */
        ready: function() {
            
            var self = this,
                document = self.document,
                handlers = self.handlers;

            // TODO: Figure out if we need to simulate readystatechange...
            // NOTE: I think we do - see this:
            if(self.readystatechangeEvent) {
                
                DJSUtil.forEach(
                    handlers.readystatechange,
                    function(handler) {

                        handler(self.readystatechangeEvent);
                    }
                );
            }
            
            // TODO: Honor event propagation rules etc (see DJSWindow.load)...
            // TODO: We need to figure out how to best simulate the
            // DOMContentLoaded event when we don't get the real one.
            if(self.DOMContentLoadedEvent || true) {

                DJSUtil.forEach(
                    handlers.DOMContentLoaded,
                    function(handler) {

                        handler(self.DOMContentLoadedEvent);
                    }
                );
            }
        },

/*
 * DJSDocument.queueSubscript
 *
 * TODO: Document me
 */
        queueSubscript: function(element) {

            DJSUtil.log('Queueing a subscript of the current execution: ');
            DJSUtil.inspect(element);
            
            var self = this,
                subscriptQueue = self.subscriptQueue,
                parentStreamCursor = self.streamCursor,
                popQueue = function() {
                    
                    subscriptQueue.pop();

                    if(subscriptQueue.length == 0) {

                        slaveScripts.resume();
                    }
                },
                removeHandlers = function() {

                    DJSUtil.removeEventListener.call(element, 'load', loadHandler, true);
                    DJSUtil.removeEventListener.call(element, 'readystatechange', loadHandler, true);
                    DJSUtil.removeEventListener.call(element, 'error', errorHandler, true);
                },
                loadHandler = function() {

                    var readyState = element.readyState;

                    clearTimeout(timeout);

                    if(readyState && readyState != 'complete' && readyState != 'loaded') {

                        return;
                    }
                   
                    self.flush();
                    self.streamCursor = parentStreamCursor;
                    removeHandlers();
                    popQueue();
                },
                errorHandler = function() {

                    self.streamCursor = parentStreamCursor;
                    removeHandlers();
                    popQueue();
                },
                // TODO: Mega hack to make sure queued subscripts don't pause
                // us indefinitely. We MUST to find a better way around this.
                timeout = setTimeout(
                    function() {
                        
                        if(!element.parentNode) {

                            DJSUtil.log('Subscript took too long to be inserted. Bailing out!');
                            errorHandler();
                        }
                    }, 
                    30
                );


            slaveScripts.pause();
                    
            self.streamCursor = { 
                executingScript: element || document.body.firstChild
            };

            if(DJSUtil.navigator.IE) {

                DJSUtil.addEventListener.call(element, 'readystatechange', loadHandler, true);
            } else {

                DJSUtil.addEventListener.call(element, 'load', loadHandler, true);
            }

            DJSUtil.addEventListener.call(element, 'error', errorHandler, true);

        },

/*
 * DJSDocument.write
 *
 * This method captures write output, presumably on a script-by-script basis,
 * fills a buffer with it, and then parses / inserts it when the script is done
 * executing.
 */
        write: function(out) {
            
            var self = this,
                parser = self.parser;

			DJSUtil.log('Buffering document.write content: ' + out);
			
            if(parser) {

                self.hasWriteBuffer = true;
                parser.parseChunk(out);
            } else {
                
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
 */
        convertAbstractElement: function(abstractElement) {
            
            // TODO: Review whether we're reading the abstractElement properly

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
 * DJSDocument.insert
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
            /*
             * Implementation notes:
             *
             * Basically we are performing a depth-first traversal
             * of the tag tree given as abstractDOM, with one enhancement:
             * Closed Nodes.
             *
             * For any node, we may encounter an Invalid Insertion, such
             * as insert(<div>, <p>) or insert(<div>) when the stream cursor
             * is a <p> tag.  In this situation, we move up the tree until we
             * find a valid parent.  All candidate parents tried along the way
             * are marked Closed.
             *
             * Insert must not insert any nodes into a Closed Node.
             * insert(nodeA, nodeB) where nodeB is Closed will attach
             * nodeA to nodeB's most immediate non-Closed parent.
             *
             * Closedness is a property of HTML Elements which must persist
             * after this function completes.
             */
            
            var self = this,
                document = self.document;

            DJSUtil.forEach(
                abstractDOM,
                function(data) {

                    /*
                     * Return the streamCursor for the current document,
                     * or the most immediate non-Closed parent
                     * in the event that the streamCursor is closed.
                     */
                    var getEffectiveStreamCursor = function() {

                        /*
                         * Search begins at the first defined insertion point:
                         * 1 parent (for recursive group insertion)
                         * 2 streamCursor.executingScript.parentNode
                         *   (if script parent was not know)
                         * 3 document.body (if script did not attach
                         *   successfully)
                         */
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

                                /*
                                 * Current cursor is fine
                                 */
                                finalCursor = cursor;

                            } else if (cursor.parent.parentNode) {

                                /*
                                 * Climb up the tree
                                 */
                                finalCursor = getFirstNonClosedParent({

                                    parent: cursor.parent.parentNode,

                                    sibling: cursor.parent
                                });

                            } else {

                                /*
                                 * Fallback: use document.body if
                                 * everything is closed
                                 */
                                finalCursor = {

                                    parent: document.body,

                                    sibling: null

                                };

                            }

                            return finalCursor;

                        })(rawCursor);
                    };

                    /*
                     * Given HTMLElements node, cursor, find the most immediate
                     * ancestor of 'cursor' for which 'node' is a valid child,
                     * i.e. <div> cannot be a child of <p>.  Search begins
                     * with 'cursor'.
                     *
                     * Closes all invalid nodes encountered during the
                     * search.
                     */
                    var findValidAncestorAndCloseNodes = function(node, cursor) {

                        var parent = cursor.parent;

                        if (DJSUtil.isValidParent(node, parent)) {

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

                    /*
                     * Cursor will be either
                     * > the parent node in the the insertion group
                     * > the parent node of document.write's callee script node
                     * > the nearest non-closed parent node of one of the above
                     */
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
    
/*
 * class DJSWindow
 *
 * This class wraps the window object. It takes over for native event handling
 * of the 'load' event in a browser-transparent way.
 */
    var DJSWindow = function(window) {
        
        var self = this;
        self.window = window;

        self.nativeMethods = {
            
            addEventListener: window.addEventListener,
            attachEvent: window.attachEvent 
        };

        self.handlers = {
            
            load: []
        };
    };
    
    DJSWindow.prototype = {

/*
 * DJSWindow.restore
 *
 * This method restores all native methods wrapped by DJSWindow back to their
 * original state.
 */
        restore: function() {

            var self = this,
                window = self.window,
                nativeMethods = self.nativeMethods;

            window.addEventListener = nativeMethods.addEventListener;
            window.attachEvent = nativeMethods.attachEvent;

            if(self.onload) {
                window.onload = self.onload;
            }
        },

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
                window = self.window,
                nativeMethods = self.nativeMethods,
                handlers = self.handlers;

            if(window.__defineSetter__ && window.__defineGetter__) {
                
                var windowOnloadHandler;

                window.__defineSetter__(
                    'onload',
                    function(handler) {
                        
                        self.onload = handler;
                    }
                );

                window.__defineGetter__(
                    'onload',
                    function() {
                        
                        return self.onload;
                    }
                );
            } else {
                
                self.fallback = true;
            }
            
            if(window.addEventListener) {
                window.addEventListener = function(event, handler) {

                    if(handlers[event]) {
                        
                        // TODO: It would be nice if we could properly handle
                        // the 'captures' argument as well. Should be doable.
                        handlers[event].push(handler);
                    } else {
                        
                        nativeMethods.addEventListener.apply(window, arguments);
                    }
                };

                nativeMethods.addEventListener.call(
                    window,
                    'load',
                    function(event) {
                        
                        self.loadEvent = event;
                    },
                    true
                );

            } else if(window.attachEvent) {
                window.attachEvent = function(event, handler) {

                    var trimmedEvent = event.substring(2);

                    if(handlers[trimmedEvent]) {
                    
                        handlers[trimmedEvent].push(handler);
                    } else {
                        
                        if(DJSUtil.feature.attachEventCallApply) {

                            nativeMethods.attachEvent.apply(window, arguments);
                        } else {

                            nativeMethods.attachEvent(event, handler);
                        }
                    }
                };

                nativeMethods.attachEvent(
                    'onload',
                    function(event) {

                        self.loadEvent = event;
                    }
                );
            }
        },

/*
 * DJSWindow.whenLoaded
 *
 * Manually insert an event listener for the 'load' event on the dominated window
 */
        whenLoaded: function(callback) {

            var self = this,
                window = self.window,
                nativeMethods = self.nativeMethods;

            if(nativeMethods.addEventListener) {

                nativeMethods.addEventListener.call(window, 'load', callback, true);
            } else {

                nativeMethods.attachEvent('onload', callback);
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
                window = self.window,
                handlers = self.handlers;
            

            if(self.onload) {
                
                self.onload(self.loadEvent);
            }

            // TODO: Need to properly honor propagation-related properties on
            // the event.
            DJSUtil.forEach(
                handlers.load,
                function(handler) {

                    handler(self.loadEvent);
                }
            );

            if(self.fallback && window.onload) {
                
                setTimeout(
                    function() {
                        
                        window.onload(self.loadEvent);
                    },
                    10
                );
            }
        }
    };

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

            slaveDocument.streamCursor = {
                executingScript: script || document.body.firstChild
            };
			
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

        self.urlCache = {};
        self.executing = false;
        self.currentExecution = null;
        self.paused = self.breakExecution = false;
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
        }
    };

    var slaveDocument = new DJSDocument(document),
        slaveWindow = new DJSWindow(window),
        slaveScripts = new DJSScriptManager();

    DJSUtil.log('Dominating the window and any appropriate scripts!');

    slaveWindow.dominate();
    slaveScripts.dominate();

    slaveWindow.whenLoaded(

        function() {

            DJSUtil.log('Show time. Dominating the document and executing scripts!');
            
            slaveDocument.dominate();

            slaveScripts.execute(

                function() {

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
    typeof DJS != "undefined" ? DJS : {}, 
    typeof exports != "undefined" ? exports : false
);


})(window, document);