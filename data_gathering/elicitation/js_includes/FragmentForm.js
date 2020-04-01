/* This software is licensed under a BSD license; see the LICENSE file for details. */


define_ibex_controller({
name: "FragmentForm",

jqueryWidget: {
    _init: function () {
        this.cssPrefix = this.options._cssPrefix;
        this.finishedCallback = this.options._finishedCallback;
        this.utils = this.options._utils;
        this.type = dget(this.options, "type");
        window.phase = dget(this.options, "phase");

        window.excerpt_id = dget(this.options, "excerpt_id");
        window.cutoff_points = dget(this.options, "cutoff_points");
        window.current_chunk = dget(this.options, "current_chunk");

        window.training = dget(this.options, "training");

        var new_text = dget(this.options, "text");

        var new_speakers = []

        // get speaker attributes if present
        for (var i = 0; i < new_text.length; i++) {
            if (new_text[i].startsWith("##0##")) {
                new_speakers.push(0);
                new_text[i] = new_text[i].substring(6, new_text[i].length)
            } else if (new_text[i].startsWith("##1##")) {
                new_speakers.push(1);
                new_text[i] = new_text[i].substring(6, new_text[i].length)
            } else {
                new_speakers.push(-1);
                new_text[i] = new_text[i] + ' ';
            }
        }

        // TODO Communicating these through global vars is probably not the proper way
        if (window.phase == "start") {
            window.text = new_text;
            window.speakers = new_speakers;
            window.new_from_idx = 0
            window.answers_thusfar = [];
            window.questions_thusfar = [];
            window.increment = false;
        } else if (new_text.length != 0) {
            window.new_from_idx = window.text.length;
            window.text = window.text.concat(new_text);
            window.speakers = window.speakers.concat(new_speakers);
            window.increment = true;
        } else {
            window.increment = false;
        }

        if (this.type == "question") {
            window.current_color_idx = nextFreeColorIdx();
        } else if (this.type == "answer") {
            if (window.current_question_idx >= 0) {
                window.current_color_idx = window.questions_thusfar[window.current_question_idx][4];
            }
        }

        window.showFirstInstructions = false;
        if (this.type == "question") {
            this.html = { include: "fragment_question.html" };
            window.showInstructions = (window.numQuestionsDone < 2);
            window.showFirstInstructions = ((window.numQuestionsDone < 2) && (window.numAnswersDone < 2));
        } else if (this.type == "answer") {
            this.html = { include: "fragment_answer.html" };
            window.showInstructions = (window.numAnswersDone < 2);
            window.showFirstInstructions = ((window.numQuestionsDone < 2) && (window.numAnswersDone < 2));
        } else if (this.type == "end") {
            this.html = { include: "fragment_end.html" };
            window.showInstructions = (window.numTextsDone < 1);
        }

        this.continueOnReturn = dget(this.options, "continueOnReturn", false);
        this.continueMessage = dget(this.options, "continueMessage", "Click here to continue");
        this.checkedValue = dget(this.options, "checkedValue", "yes");
        this.uncheckedValue = dget(this.options, "uncheckedValue", "no");
        this.validators = dget(this.options, "validators", { });
        this.errorCSSClass = dget(this.options, "errorCSSClass", "error");
        this.saveReactionTime = dget(this.options, "saveReactionTime", false);
        this.obligatoryErrorGenerator =
            dget(this.options, "obligatoryErrorGenerator",
                 function (field) { return "The \u2018" + field + "\u2019 field is obligatory."; });
        this.obligatoryCheckboxErrorGenerator =
            dget(this.options, "obligatoryCheckboxErrorGenerator",
                 function (field) { return "You must check the " + field + " checkbox to continue."; });
        this.obligatoryRadioErrorGenerator =
            dget(this.options, "obligatoryRadioErrorGenerator",
                 function (field) { return "You must select an option for \u2018" + field + "\u2019."; });

        var t = this;

        function alertOrAddError(name, error) {
            var ae = $("label." + escape(t.errorCSSClass) + "[for=__ALL_FIELDS__]");
            if (ae.length > 0) {
                ae.addClass(t.cssPrefix + "error-text").text(error);
                return;
            }

            var e = $("label." + escape(t.errorCSSClass) + "[for=" + escape(name) + "]");
            if (e.length > 0)
                e.addClass(t.cssPrefix + "error-text").text(error);
            else
                alert(error);
        }

        var HAS_LOADED = false;

        function handleClick(dom) {
            return function (e) {
                if ( !quality_check() ) return false;    // TODO This is probably ugly: it refers to the a function defined in the form's html file...

                var answerTime = new Date().getTime();

                e.preventDefault();
                if (! HAS_LOADED) return;

                // Get rid of any previous errors.
                $("." + t.cssPrefix + "error-text").empty();

                var rlines = [];

                var inps = $(dom).find("input[type=text]");
                var tas = $(dom).find("textarea");
                for (var i = 0; i < tas.length; ++i) { inps.push(tas[i]); }

                for (var i = 0; i < inps.length; ++i) {
                    var inp = $(inps[i]);

                    if (inp.hasClass("obligatory") && ((! inp.attr('value')) || inp.attr('value').match(/^\s*$/))) {
                        alertOrAddError(inp.attr('name'), t.obligatoryErrorGenerator(inp.attr('name')));
                        return;
                    }

                    if (t.validators[inp.attr('name')]) {
                        var er = t.validators[inp.attr('name')](inp.attr('value'));
                        if (typeof(er) == "string") {
                            alertOrAddError(inp.attr('name'), er);
                            return;
                        }
                    }

                    rlines.push([["Field name", csv_url_encode(inp.attr('name'))],
                                 ["Field value", csv_url_encode(inp.attr('value'))]]);
                }

                var checks = $(dom).find("input[type=checkbox]");
                for (var i = 0; i < checks.length; ++i) {
                    var check = $(checks[i]);

                    // Checkboxes with the 'obligatory' class must be checked.
                    if (! check.attr('checked') && check.hasClass('obligatory')) {
                        alertOrAddError(check.attr('name'), t.obligatoryCheckboxErrorGenerator(check.attr('name')));
                        return;
                    }

                    rlines.push([["Field name", check.attr('name')],
                                 ["Field value", check.attr('checked') ? t.checkedValue : t.uncheckedValue]]);
                }

                var rads = $(dom).find("input[type=radio]");
                // Sort by name.
                var rgs = { };
                for (var i = 0; i < rads.length; ++i) {
                    var rad = $(rads[i]);
                    if (rad.attr('name')) {
                        if (! rgs[rad.attr('name')])
                            rgs[rad.attr('name')] = [];
                        rgs[rad.attr('name')].push(rad);
                    }
                }
                for (k in rgs) {
                    // Check if it's oblig.
                    var oblig = false;
                    var oneIsSelected = false;
                    var oneThatWasSelected;
                    var val;
                    for (var i = 0; i < rgs[k].length; ++i) {
                        if (rgs[k][i].hasClass('obligatory')) oblig = true;
                        if (rgs[k][i].attr('checked')) {
                            oneIsSelected = true;
                            oneThatWasSelected = i;
                            val = rgs[k][i].attr('value');
                        }
                    }
                    if (oblig && (! oneIsSelected)) {
                        alertOrAddError(rgs[k][0].attr('name'), t.obligatoryRadioErrorGenerator(rgs[k][0].attr('name')));
                        return;
                    }
                    if (oneIsSelected) {
                        rlines.push([["Field name", rgs[k][0].attr('name')],
                                     ["Field value", rgs[k][oneThatWasSelected].attr('value')]]);
                    }
                }

                if (t.saveReactionTime) {
                    rlines.push([["Field name", "_REACTION_TIME_"],
                                 ["Field value", answerTime - t.creationTime]]);
                }
                t.finishedCallback(rlines);
            }
        }

        var dom = htmlCodeToDOM(this.html, function (dom) {
            HAS_LOADED = true;

            if (t.continueOnReturn) {
                t.safeBind($(dom).find("input[type=text]"), 'keydown', function (e) { if (e.keyCode == 13) { console.log("H"); return handler(e);  } });
            }
        });
        var handler = handleClick(dom);

        this.element.append(dom);

        if (this.continueMessage) {
            this.element.append($('<div id="div_containing_continue-link" style="visibility: hidden"><p>').append($('<a id="continue_link">').attr('href', '').text("\u2192 " + this.continueMessage)
                                                .addClass(ibex_controller_name_to_css_prefix("Message") + "continue-link")
                                                .click(handler)));
        }

        this.creationTime = new Date().getTime();
    }
},

properties: {
    obligatory: ["phase", "text"],
    countsForProgressBar: true,
    htmlDescription: function (opts) {
        return htmlCodeToDOM(opts.html);
    }
}
});


// Some more custom code:

// Helper function for delayed hiding/showing
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function for flashing an element and then displaying
async function flashMessage(e) {
    e.style.visibility = "visible";
    await sleep(500);
    e.style.visibility = "hidden";
    await sleep(300);
    e.style.visibility = "visible";
    await sleep(500);
}

//async function addTypedText(e, s) {
//    for ( var i = 0; i < s.length; i++ ) {
//        e.innerHTML += s.charAt(i);
//        await sleep(3);
//    }
//}

async function addTypedText(e, s) {
    split_string = s.split(" ");
    for ( var i = 0; i < split_string.length; i++ ) {
        if (i > 0) {
            e.innerHTML += " ";
        }
        e.innerHTML += split_string[i];
        // pause only for pre-last items
        if (i < split_string.length - 1) {
            if (split_string[i].endsWith("<br>")) { // extra pause for linebreak
                await sleep(50);
            }
            await sleep(20);
        }
    }
}

// From https://stackoverflow.com/a/11762728/11056813
function getElementIndex(node) {
    var index = 0;
    while ( node = node.previousElementSibling ) {
        index++;
    }
    return index;
}

// returns selection, but only when it exists wholly inside the "selector" field, and later than from_idx
function getSelection() {

    var selection = document.getSelection();

    if (selection.anchorNode == null) return null;

    anchorParent = selection.anchorNode.parentNode
    anchorParentId = anchorParent.id
    focusParent = selection.focusNode.parentNode
    focusParentId = focusParent.id

    // Check if it's an appropriate selection:
    if (
        anchorParentId.startsWith("selector") && focusParentId.startsWith("selector") &&
        (anchorParent != focusParent || selection.anchorOffset != selection.focusOffset)
    ) {

        document.getElementById("highlight_error").style.visibility = "hidden";

        anchorParentId = Number(anchorParentId.substring(8, anchorParentId.length));
        focusParentId = Number(focusParentId.substring(8, focusParentId.length));

        // determine start and end character based on anchor (where you click) and focus (where you release)
        startParent = anchorParent;
        startOffset = selection.anchorOffset;
        startParentId = anchorParentId;
        endParent = focusParent;
        endOffset = selection.focusOffset;
        endParentId = focusParentId;
        if (anchorParentId == focusParentId) {
            startOffset = Math.min(selection.anchorOffset, selection.focusOffset);
            endOffset = Math.max(selection.anchorOffset, selection.focusOffset);
        } else if (anchorParentId > focusParentId) {
            endParent = anchorParent;
            endOffset = selection.anchorOffset;
            endParentId = anchorParentId;
            startParent = focusParent;
            startOffset = selection.focusOffset;
            startParentId = focusParentId;
        }

        // Select only whole words.
        startOffset += 1;
        while (startOffset > 0) {
            character = startParent.innerHTML[startOffset-1]
            if (character == " " || character == "’") {
                break;
            }
            startOffset -= 1;
        }
        endOffset -= 1;
        while (endOffset < endParent.innerHTML.length) {
            character = endParent.innerHTML[endOffset]
            if (character == " " || character == "," || character == "." || character == ";" || character == ":" || character == ")" || character == "'" || character == '"' || character == "’" || character == "”") {
                break;
            }
            endOffset += 1;
        }

        // clear selection:
        if (selection.removeAllRanges) {
            selection.removeAllRanges();
        } else if (selection.empty) {
            selection.empty();
        }

        // Select only in appropriate region.
        if (startParentId < window.new_from_idx) {
            return null;
        };

        // Weird case (found once in pre-pilot_2):
        if (startParentId > endParentId || (startParentId == endParentId && startOffset >= endOffset)) {
            return null;
        };

        var sel = [startParentId, startOffset, endParentId, endOffset]

        if (sel[0] == sel[2]) {
            selected_text = window.text[sel[0]].substring(sel[1], sel[3]);
        } else {
            selected_text = window.text[sel[0]].substring(sel[1], window.text[sel[0]].length);
            for (var i=sel[0]+1; i < sel[2]; i++) {
                selected_text += ' '  + window.text[i];
            }
            selected_text += ' ' + window.text[sel[2]].substring(0, sel[3])
        }

        if (selected_text.split(" ").length > 10) {
            flashMessage(document.getElementById("highlight_error"));
            return null;
        };

        return sel;

    }
    return null;
};

// Called whenever mouse is released, used only for grabbing selection
document.onmouseup = document.onkeyup = function() {

    var sel = getSelection();
    // Only do something if you've actually selected something (in the proper field):
    if ( sel != null ) {

        var text = window.selector.innerHTML;

        document.getElementById("selection_start").value = sel[0] + "," + sel[1];
        document.getElementById("selection_end").value = sel[2] + "," + sel[3];

        // Clear all previous highlighting
        for (var i=0; i < window.text.length; i++) {
            document.getElementById("highlighter"+i).innerHTML = window.text[i]
        }
        // Add new highlighting
        var selector0 = document.getElementById("selector"+sel[0]);
        if (sel[0] == sel[2]) {
            selected_text = window.text[sel[0]].substring(sel[1], sel[3]);
            document.getElementById("highlighter"+sel[0]).innerHTML = window.text[sel[0]].substring(0, sel[1]) + '<mark style="color: transparent; background-color: '+ colors[window.current_color_idx] + '">' + window.text[sel[0]].substring(sel[1], sel[3]) + "</mark>" + window.text[sel[0]].substring(sel[3], window.text[sel[0]].length);
        } else {
            selected_text = window.text[sel[0]].substring(sel[1], window.text[sel[0]].length);
            document.getElementById("highlighter"+sel[0]).innerHTML = window.text[sel[0]].substring(0, sel[1]) + '<mark style="color: transparent; background-color: '+ colors[window.current_color_idx] + '">' + window.text[sel[0]].substring(sel[1], window.text[sel[0]].length) + "</mark>";
            for (var i=sel[0]+1; i < sel[2]; i++) {
                document.getElementById("highlighter"+i).innerHTML = '<mark style="color: transparent; background-color: '+ colors[window.current_color_idx] + '">' + window.text[i] + "</mark>"
                selected_text += ' '  + window.text[i];
            }
            document.getElementById("highlighter"+sel[2]).innerHTML = '<mark style="color: transparent; background-color: '+ colors[window.current_color_idx] + '">' + window.text[sel[2]].substring(0, sel[3]) + "</mark>" + window.text[sel[2]].substring(sel[3], window.text[sel[2]].length);
            selected_text += ' ' + window.text[sel[2]].substring(0, sel[3])
        }

        document.getElementById("selection_text").value = selected_text;

    }
};

// To be defined in form htmls
var selector = null;
var selector_fromidx = null;
var radio_buttons_yesno = [];
var radio_buttons_5 = [];

// For keyboard shortcuts of radio buttons
window.onkeyup = function(e) {
    var key = e.keyCode ? e.keyCode : e.which;

    var name = document.activeElement.name;

    if (isInArray(name, radio_buttons_5)) {
        if (key >= 49 && key <= 53) {

            key = key - 48;

            document.getElementById(name + key).click();
        }
    } else if (isInArray(name, radio_buttons_yesno)) {
        if (key == 49 || key == 89) {
            key = "yes"
        } else if (key == 50 || key == 48 || key == 78) {
            key = "no"
        }
        if (key == "yes" || key == "no") {
            document.getElementById(name + "_" + key).click()
        }
    }
}

function isInArray(value, array) {
  return array.indexOf(value) > -1;
}


// yellow, green, purple, teal, red, blue
colors = ['#ffff66', '#66ff66', '#cc99ff', '#66ffff', '#ff8080', '#3399ff'];
colors_dimmed = ['#ffffb3', '#b3ffb3', '#e6ccff', '#ccffff', '#ffcccc', '#99ccff'];

function nextFreeColorIdx() {
    most_recent_positions = [-1,-1,-1,-1,-1,-1];
    for (var i = 0; i < window.questions_thusfar.length; i++) {
        color = window.questions_thusfar[i][4];
        most_recent_positions[color] = i;
    }
    return argMin(most_recent_positions);
}

function argMin(array) {
  return array.map((x, i) => [x, i]).reduce((r, a) => (a[0] < r[0] ? a : r))[1];
}

function add_highlights(id, highlights) {

    // It's crucial that highlights is ordered by starting index...
    highlights = jQuery.extend([], highlights);
    highlights.sort(function(a, b) {
        return (1000*(a[0] - b[0]) + 1*(a[1] - b[1]));
    });

    var charindex = 0;
    var fieldindex = 0;
    for (var i = 0; i < highlights.length; i++) {
        highlight = highlights[i];

        startfield = highlight[0]
        start = highlight[1];
        endfield = highlight[2];
        end = highlight[3];

        if (i < highlights.length-1) {  // there is a next element
            if (highlights[i+1][0] < endfield || (highlights[i+1][0] == endfield && highlights[i+1][1] < start)) {
                endfield = highlights[i+1][0];
                end = highlights[i+1][1];   // TODO This may suffice, though it will not work for nested highlights like [ [ ]   ]
            }
        }
        if (startfield < window.new_from_idx) {
            highlightcolor = colors_dimmed[highlight[4]];
        } else {
            highlightcolor = colors[highlight[4]];
        }

        // First add any normal text up to this highlight
        if (fieldindex == startfield) {
            document.getElementById(id+fieldindex).innerHTML += window.text[fieldindex].substring(charindex, start);
        } else {
            document.getElementById(id+fieldindex).innerHTML += window.text[fieldindex].substring(charindex, window.text[fieldindex].length);
            fieldindex++;
            for (var j = fieldindex; j < startfield; j++) {
                document.getElementById(id+j).innerHTML = window.text[j];
                fieldindex++;
            }
            document.getElementById(id+fieldindex).innerHTML += window.text[fieldindex].substring(0, start);
        }

        // Now add highlight
        if (startfield == endfield) {
            document.getElementById(id+startfield).innerHTML += '<mark style="color: transparent; background-color: '+ highlightcolor + '">' + window.text[startfield].substring(start, end) + "</mark>";
        } else {
            document.getElementById(id+startfield).innerHTML += '<mark style="color: transparent; background-color: '+ highlightcolor + '">' + window.text[startfield].substring(start, window.text[startfield].length) + "</mark>";
            fieldindex++;
            for (var j = fieldindex; j < endfield; j++) {
                document.getElementById(id+j).innerHTML = '<mark style="color: transparent; background-color: '+ highlightcolor + '">' + window.text[j] + "</mark>"
                fieldindex++;
            }
            document.getElementById(id+endfield).innerHTML = '<mark style="color: transparent; background-color: '+ highlightcolor + '">' + window.text[endfield].substring(0,end) + "</mark>"
        }
        charindex = end;
    }

    // Add remaining unhighlighted text:
    document.getElementById(id+fieldindex).innerHTML += window.text[fieldindex].substring(charindex, window.text[fieldindex].length);
    fieldindex++;
    for (var j = fieldindex; j < window.text.length; j++) {
        document.getElementById(id+j).innerHTML = window.text[j];
        fieldindex++;
    }
}

function previous_unanswered_question_idx() {
    for (var i = window.current_question_idx-1; i >= 0; i--) {
        if (!window.questions_thusfar[i][4]) {
            return i;
        }
    }
}


function pasted(s) {
    if (document.getElementById("pasted").value != '') {
        document.getElementById("pasted").value += ',';
    }
    document.getElementById("pasted").value += s;
}

async function init() {

    window.onfocus = function() {
        var d = new Date();
        var endblur = d.getTime();
        if (document.getElementById("blurred").value != '') {
            document.getElementById("blurred").value += ',';
        }
        document.getElementById("blurred").value += window.startblur + '-' + endblur;
    }

    window.onblur = function() {
        var d = new Date();
        window.startblur = d.getTime();
    }

    // show instructions
//    if (window.showInstructions) {
//        $('body').scrollTop(0);     // needed because pages are longer with instructions
//        $(".instruction").each(function(){
//            this.style.display = "block";
//        })
//    }
//    if (window.showFirstInstructions) {
//        document.getElementById("instruction1").style.display = "block";
//    } else {
//        document.getElementById("instruction1").style.display = "none";
//    }

    // store excerpt id etc.
    document.getElementById("excerpt_id").value = window.excerpt_id;
    document.getElementById("cutoff_points").value = window.cutoff_points;
    document.getElementById("current_chunk").value = window.current_chunk;

    if (window.speakers[0] != -1) {
        document.getElementById("speaker_labels").style.display = "block";
    }

    if (window.training) {
        document.getElementById("training").style.display = "block";
    }

    for (var i=0; i < window.text.length; i++) {

        if (window.speakers[i] == -1) {
            var fieldtype = 'span';   // no dialogue
            var fieldclose = 'span';
        } else {
            var fieldtype = 'div';
            var fieldclose = 'div';
            if (window.speakers[i] == window.speakers[0]) {
                fieldtype += ' class=dialeft';
            } else {
                fieldtype += ' class=diaright';
            }
        }

        document.getElementById("fragment_selector").innerHTML += '<'+fieldtype+' id="selector'+i+'">' + window.text[i] + '</'+fieldclose+'>';
        document.getElementById("fragment_highlighter").innerHTML += '<'+fieldtype+' id="highlighter'+i+'">' + window.text[i] + '</'+fieldclose+'>';
        document.getElementById("question_highlighter_prev").innerHTML += '<'+fieldtype+' id="qhighlighter'+i+'"></'+fieldclose+'>'
        document.getElementById("answer_highlighter_prev").innerHTML += '<'+fieldtype+' id="ahighlighter'+i+'"></'+fieldclose+'>'
        if (i < window.new_from_idx) {
            document.getElementById("fragment_colorizer").innerHTML += '<'+fieldtype+' id="colorizer'+i+'" style="color:#888888">' + window.text[i] + '</'+fieldclose+'>';
            if (fieldclose == 'div') {
                document.getElementById("ahighlighter"+i).style.backgroundColor = "#f3f3f3"
            }
        }

        // Scroll to the bottom unless it's the first item
        if ( window.phase != "start" ) {
            document.getElementById("fragment_scroller").scrollTo(0,document.getElementById("fragment_scroller").scrollHeight);
        }
    }

    // TODO Add previous highlights
    add_highlights('qhighlighter', window.questions_thusfar);
    add_highlights('ahighlighter', window.answers_thusfar);

    // Add readable text
    for (var i = window.new_from_idx; i < window.text.length; i++) {

        if (window.speakers[i] == -1) {
            var fieldtype = 'span';   // no dialogue
            var fieldclose = 'span';
        } else {
            var fieldtype = 'div';
            var fieldclose = 'div';
            if (window.speakers[i] == window.speakers[0]) {
                fieldtype += ' class=dialeft';
            } else {
                fieldtype += ' class=diaright';
            }
        }

        document.getElementById("fragment_colorizer").innerHTML += '<'+fieldtype+' id="colorizer'+i+'"></'+fieldclose+'>'
        if (window.phase == "start" || window.increment) {
            if (fieldclose == 'div') {
                await sleep(100);
                document.getElementById("ahighlighter"+i).style.backgroundColor = "#e0e0e0"
            }
            await addTypedText(document.getElementById("colorizer"+i), window.text[i]);
        } else {
            document.getElementById("colorizer"+i).innerHTML = window.text[i];
            if (fieldclose == 'div') {
                document.getElementById("ahighlighter"+i).style.backgroundColor = "#e0e0e0"
            }
        }
    }

    if (!window.increment) {    // Needed to avoid error due to following element not yet existing?!
        await sleep(100);
    }

    document.getElementById("div_containing_continue-link").style.visibility = "visible";

    revealForm();

};
