// Html.js (c) 2012 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node_monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('monitor'),
      UI = Monitor.UI,
      Backbone = Monitor.Backbone,
      Template = UI.Template,
      base = UI.app.base = UI.app.base || {},
      localStorage = root.localStorage || {},
      STORAGE_KEY_CONSOLE = 'base.replConsole',
      STORAGE_KEY_MACROS = 'base.replMacros',
      _ = Monitor._;

  // Statics
  var INTERNALS = ['.run','.edit','.list', '.sh','.help', '.history','.clear', '.exit'],
      PROMPT = '> ',
      CONTINUE_PROMPT = '... ',
      MAX_HISTORY_ITEMS = 50,
      UNDEFINED_TYPE = 'undefined';

  /**
  * A REPL console to a server
  *
  * @class Repl
  * @extends Backbone.View
  * @constructor
  * @param options {Object} View initialization options (See others in Backbone.View)
  */
  var Repl = base.Repl = Backbone.View.extend({

    // Define the view
    name: 'REPL Console',
    icon: 'image/Console.png',
    description: 'REPL JavaScript console into the server',
    website: 'http://node_monitor.github.com/button.html',
    defaultOptions: {
      title: 'Console',
      background: true
    },

    // Constructor
    initialize: function(options) {
      var t = this;
      t.options = options;
      t.component = options.component;
      t.monitor = options.monitor;
      t.viewOptions = t.options.viewOptions;
      t.connected = false;
      t.template = new Template();
      options.component.setDefaultSize({
        width: 600,
        height: 400
      });

      // Define the monitor if blank
      if (!t.monitor.get('probeClass')) {
        t.monitor.set({
          probeClass: 'Repl',
          hostName: 'localhost'
        });
      }

      // Assure we have a unique probe instance
      t.priorUniqueInstance = t.monitor.get('initParams').uniqueInstance;
      t.monitor.set({initParams:{uniqueInstance:Math.random()}},{silent:true});
    },

    events: {
      'click':  function(){this.input.focus();},
      'keypress': 'formKeyPress'
    },

    render: function() {
      var t = this;

      // Create the monitor in the loading state
      t.body = $('<ul class="nm-base-rp"></ul>').appendTo(t.$el);
      t.input = $('<input class="nm-base-rp-input" type="text"/>')
        .appendTo(t.body)
        .keydown(function(e){
          // Process special keys on keydown vs. keypress
          if ([4,8,9,13,27,37,38,39,40].indexOf(e.keyCode) >= 0) {
            e.preventDefault();
            t.keypress(e, true);
          }
          e.stopPropagation();})
        .keypress(function(e){t.keypress(e);});
      t.suggestLine = $('<li class="nm-base-rp-suggest-line"></li>').appendTo(t.body);
      t.suggestLede = $('<span class="nm-base-rp-lede"></span>').appendTo(t.suggestLine);
      t.suggestTail = $('<span class="nm-base-rp-tail"></span>').appendTo(t.suggestLine);
      t.clearSuggestions();
      t.mergeHistory('');
      t.sessionHistoryItems = t.suggestions;

      // Add tabindex to the view so it can capture keypress events
      t.$el.attr('tabindex','1');

      // Load the macro list
      t.loadMacros();

      // Listen for monitor events
      t.monitor.on('connect', t._onConnect, t);
      t.monitor.on('change', t._onChange, t);
      t.monitor.on('disconnect', t._onDisconnect, t);

    },

    // The monitor has connected
    _onConnect: function(){
      var t = this;
      t.connected = true;

      // Reset the prior uniqueInstance so it doesn't look like the monitor changed
      var params = t.monitor.get('initParams');
      params.uniqueInstance = t.priorUniqueInstance;
      t.monitor.set({initParams: params}, {silent:true});

      // Present the greeting
      t.consoleOut('Console ' + (new Date()));
      t.consoleOut('? for help');
    },

    // Process output from the backend
    _onChange: function(monitorEvent){
      var t = this,
          output = t.monitor.get('output');
      if (output) {
        t.consoleOut(output);
      }
    },

    // The remote probe disconnected for some reason
    _onDisconnect: function(reason){
      var t = this;
      if (reason === "manual_disconnect") {
        reason = "user exit";
      }
      t.connected = false;
      t.consoleOut('Disconnect: ' + reason + ' - [^R] to reconnect');
      t.$el.focus();
    },

    // This is captured at the form vs. the input
    formKeyPress: function(e) {
      var t = this;

      // If ^R is captured while disconnected, reconnect
      if (e.keyCode == 18 && !t.connected) {
        t.monitor.connect();
      }

      // If ^C is captured at the form, cancel any outstanding
      // request and bring back the prompt.
      if (e.keyCode == 3) {
        t.runningMacro = null;
        t.monitor.control('input', '.break');
      }
    },

    // Process keypress events on the input field
    keypress: function(e, keydown){
      var t = this,
          key = e.keyCode,
          val = t.input.val();

      // Process special keys on keydown
      if (keydown) {
        switch (key) {
          case 4: // Ctrl-d
            break;
          case 8: // backspace
            t.getSuggestions(val.substr(0, val.length - 1));
            break;
          case 9: // tab
            if (t.currentSuggestion) {
              var newVal = val + t.suggestTail.text();
              t.suggest(newVal, t.suggestIndex);
            }
            break;
          case 13: // enter
            t.submitInput();
            break;
          case 27: // esc
            t.clearSuggestions();
            break;
          case 37: // left arrow
            var lede = t.suggestLede.text(),
                tail = t.suggestTail.text();
            if (val.length) {
              var newVal = val.substr(0, val.length -1);
              t.suggest(newVal, t.suggestIndex);
            }
            break;
          case 38: // up arrow
            t.suggest(val, t.suggestIndex + 1);
            break;
          case 39: // right arrow
            var lede = t.suggestLede.text(),
                tail = t.suggestTail.text();
            if (tail.length) {
              var newVal = val + tail.substr(0,1);
              t.suggest(newVal, t.suggestIndex);
            }
            break;
          case 40: // down arrow
            t.suggest(val, t.suggestIndex - 1);
            break;
        }

      } else {

        // Special keys processed from keypress vs. keydown
        switch (key) {
          case 63: // ?
            if (val == '') {
              e.preventDefault();
              t.input.val('.help');
              t.submitInput()
            }
            break;
          case 3: // Ctrl-c
            t.input.val('.break');
            t.submitInput();
            break;
          default:
            // No need to get suggestion from the backend if
            // this character is the suggestion character
            var keyStr = String.fromCharCode(key),
                tail = t.suggestTail.text();
            if (tail.length && keyStr === tail.substr(0,1)) {
              e.preventDefault();
              t.suggest(val + keyStr, t.suggestIndex);
            } else {
              t.getSuggestions(val + String.fromCharCode(key));
            }
            break;
        }
      }

      // No need to propagate above here
      e.stopPropagation();
    },

    // Output a line (or lines) to the console
    consoleOut: function(out){
      var t = this, lines = out.split('\n'), lastLine, i;
      t.input.hide();
      t.suggestLine.hide();

      // Send the output to the screen
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        // Don't output a trailing newline
        if (line === '' && i == lines.length - 1) {
          continue;
        }

        // Don't print stack trace output (it's meaningless in the console)
        if (i > 0 && line.indexOf('    at ') == 0) {
          continue;
        }

        // Output the macro name as part of the prompt
        if (t.runningMacro && i == lines.length - 1 && line === PROMPT) {
          line = '(' + t.runningMacro.id + ')' + PROMPT;
        }

        // Generate the output
        lastLine = $('<li class="output_line"><span class="nm-base-rp-out"></span></li>')
          .appendTo(t.body);
        lastLine.find('.nm-base-rp-out').text(line);
      }

      // Process a prompt > output
      if (out == PROMPT || out == CONTINUE_PROMPT) {
        t.makeInput(lastLine);

        // Auto-run the next line if we're in a macro
        if (t.runningMacro) {
          var lines = t.runningMacro.getLines();
          var line = lines[t.nextMacroLine++];
          if(t.nextMacroLine == lines.length) {
            // Don't process any lines after this one
            t.runningMacro = null;
          }

          // Apply macro arguments if available
          if (t.macroArgs) {
            t.template.set({text:line});
            line = t.template.apply(t.macroArgs);
          }

          // Run the macro line
          t.input.val(line);
          t.xferInput();
          t.submitInput(line);
        }
      }

      t.viewInputArea();
    },

    // Create an input area within the last line
    makeInput: function(lastLine){
      var t = this;
      t.input.show().appendTo(lastLine).focus();
      t.suggestLine.show().appendTo(t.body);
      t.resize();
    },

    // Resize the elements in the viewport
    resize: function(){
      var t = this, parent = t.input.parent(),
          promptWidth = $('.nm-base-rp-out', parent).width();
      t.input.width(parent.width() - promptWidth);
      t.viewInputArea();
    },

    // Scroll the input area into view
    viewInputArea: function(){
      var t = this;
      t.$el.scrollTop(1000000);
    },

    printHelp: function(){
      var t = this;
      t.consoleOut('[tab key]\tSelect the current suggestion');
      t.consoleOut('[arrow keys]\tScroll through suggestions');
      t.consoleOut('.history\tPrint the console input history');
      t.consoleOut('.clear\t\tClear the console input history');
      t.consoleOut('.run {macro}\tRun the javascript macro');
      t.consoleOut('.edit {macro}\tEdit (or add) the javascript macro');
      t.consoleOut('.list [macro]\tPrint a javascript macro (or list all)');
      t.consoleOut('.sh {command}\tExecute the shell command on the host');
      t.consoleOut('.load {file}\tLoad a .js file into the REPL context');
      t.consoleOut('.save {file}\tSave the REPL session into a file');
      t.consoleOut('.break [^C]\tSometimes you get stuck, this gets you out');
      t.consoleOut('.help [?]\tShow console options');
      t.consoleOut('.exit\t\tExit the console');
    },

    printHistory: function(){
      var t = this;
      for (var a = t.sessionHistoryItems.length - 1; a >= 0; a--) {
        t.consoleOut(t.sessionHistoryItems[a]);
      }
    },

    printMacros: function(macroName){
      var t = this, macro;
      // Print one macro or all macros
      if (macroName.length) {
        macro = t.macros.get(macroName);
        if (macro) {
          t.consoleOut(macroName + ':');
          macro.getLines().forEach(function(line){
            t.consoleOut('  ' + line);
          });
        }
        else {
          t.consoleOut('Unknown macro: ' + macroName);
        }
      }
      else {
        var tabs = null;
        t.macros.forEach(function(macro) {
          var id = macro.get('id');
          tabs = id.length < 7 ? '\t\t' : '\t';
          t.consoleOut(id + tabs + macro.get('description'));
        });
        if (tabs == null) {
          t.consoleOut('No macros defined.\nUse .edit {macro} to create a new macro.');
        }
      }
    },

    // Gather macros
    loadMacros: function(){
      var t = this;
      t.macros = new base.Macro.List();
      try {
        t.macros.add(JSON.parse(localStorage[STORAGE_KEY_MACROS]));
      } catch (e) {}
    },

    // Persist macros
    saveMacros: function(){
      var t = this;
      // Remove macros without any lines, then store
      t.macros.remove(t.macros.filter(function(macro) {return macro.get('lines').trim().length === 0;}));
      localStorage[STORAGE_KEY_MACROS] = JSON.stringify(t.macros);
    },

    // Gather suggestions & present results
    getSuggestions: function(line){
      var t = this;

      // On a blank line, set suggestions to history only,
      // but don't display them unless the user presses up/down.
      if (line.length === 0) {
        t.clearSuggestions();
        t.mergeHistory('');
        t.input.val('');
        return;
      }

      // Send to backend for autocomplete, then display first suggestion.
      t.monitor.control('autocomplete', line, function(err, data){

        if (err) {
          console.error('autocomplete error',err);
          return;
        }

        // Initialize a new set of suggestions
        t.clearSuggestions();
        t.currentSuggestionLine = line;

        // Fix-up the backend suggestions to include the full line
        var partialPrefix = data[1] ? data[1] : '',
            prefix = line.substr(0, line.lastIndexOf(partialPrefix));
        data[0].forEach(function(item) {
          if (item.length) {
            t.suggestions.push(prefix + item);
          }
        });

        // Add internals
        INTERNALS.forEach(function(internal){
          if (internal.length > line.length && internal.indexOf(line) == 0) {
            t.suggestions.push(internal);
          }
        });

        // Add macro command suggestions
        var firstWord = line.split(' ')[0];
        if (['.run', '.edit', '.list'].indexOf(firstWord) >= 0) {
          t.macros.forEach(function(macro) {
            var macroLine = firstWord + ' ' + macro.get('id');
            if (macroLine.length > line.length && macroLine.indexOf(line) == 0) {
              t.suggestions.push(macroLine);
            }
          });
        }

        // Merge history items into suggestions, and display
        t.mergeHistory(line);
        t.suggest(line, 0);
      });
    },

    // Add any matching history items to current suggestions
    mergeHistory: function(line){
      var t = this,
          dupCheck = {};

      // Clean up current suggestion list (dedupe, no blanks, sort)
      for (var i = 0; i < t.suggestions.length; i++) {
        var val = t.suggestions[i];
        if (val == '' || dupCheck[val]) t.suggestions.splice(i,1);
        else dupCheck[val] = 1;
      }
      t.suggestions.sort();

      // Create all the history items that match
      var historyItems = [];
      function mergeItems(items) {
        if (!items) return;
        items.forEach(function(item) {
          if(item.length > line.length && item.indexOf(line) === 0 && !dupCheck[item]) {
            historyItems.push(item);
            dupCheck[item] = 1;
          }
        });
      }
      mergeItems(t.sessionHistoryItems);
      mergeItems(t.getHistoryItems());

      // Prepend history items onto suggestions
      t.suggestions = historyItems.concat(t.suggestions);
    },

    // Present the suggestion at the specified index
    suggest: function(inputVal, index){
      var t = this,
          last = t.suggestions.length - 1,
          lede = inputVal,
          tail = '',
          parent = t.input.parent(),
          promptWidth = $('.nm-base-rp-out', parent).width();

      // Alter the left margin to include different size prompts
      t.suggestLine.css('marginLeft', promptWidth);

      // Refresh suggestions if scrolling up/down and the suggestions don't match
      if (t.suggestIndex >= 0 && index !== t.suggestIndex && inputVal !== t.currentSuggestionLine) {
        t.clearSuggestions();
        return t.getSuggestions(inputVal);
      }

      // Produce a suggestion tail if there are any suggestions
      if (last >= 0) {
        t.suggestIndex = Math.max(0, Math.min(index, last));
        t.currentSuggestion = t.suggestions[t.suggestIndex];
        tail = t.currentSuggestion.substr(inputVal.length);
      }

      // Place the lede and tails
      t.input.val(lede);
      t.suggestLede.text(lede);
      t.suggestTail.text(tail);
    },

    // Clear the current suggestion line
    clearSuggestions: function() {
      var t = this;
      t.suggestLede.text('');
      t.suggestTail.text('');
      t.suggestions = [];
      t.suggestIndex = -1;
      t.currentSuggestion = '';
      t.currentSuggestionLine = '';
    },

    // Transfer the input string into console output
    xferInput: function(){
      var t = this, value = t.input.val();
      $('<span class="nm-base-rp-entered"></span>')
        .text(value)
        .appendTo(t.input.parent());
      t.input.val('').hide();
    },

    // Submit the input line to the backend
    submitInput: function(value){
      var t = this;
      if (typeof value == UNDEFINED_TYPE) {
        // Get value from user input
        value = $.trim(t.input.val());
        t.xferInput();
        t.clearSuggestions();

        // If no input, output the prompt
        if (value === '') {
          t.consoleOut(PROMPT);
          return;
        }

        // Add to history
        if (value.length) {
          var items = t.sessionHistoryItems,
              max = MAX_HISTORY_ITEMS;
          if (value != items[0]) {
            items.splice(0,0,value);
            if (items.length > max) items.splice(max - 1, 1);
            t.addHistoryItem(value);
          }
        }
        t.mergeHistory('');
      }

      // Process the internal or external command
      var internalCmd = null;
      INTERNALS.forEach(function(internal) {
        if (value.indexOf(internal) == 0)
          internalCmd = internal;
      });
      if (internalCmd) {
        t.processInternal(internalCmd, value);
      }
      else {
        t.monitor.control('input', value, function(error) {
          if (error) {
            console.error('REPL console error: ', error);
          }
        });
      }
    },

    runMacro: function(name) {
      var t = this,
          allArgs = name.split(' '),
          name = allArgs[0],
          macro = t.macros.get(name);
      if (!macro) {
        t.consoleOut("Unknown macro: '" + name + "'");
        t.consoleOut(PROMPT);
        return;
      }
      t.macroArgs = allArgs.length > 1 ? allArgs : null;
      t.runningMacro = macro;
      t.nextMacroLine = 0;
      t.consoleOut(PROMPT); // This kicks off the next macro line
    },

    editMacro: function(name) {
      var t = this,
          macro = t.macros.get(name);

      // Add the macro if undefined
      if (!macro) {
        macro = new base.Macro({id:name});
        t.macros.add(macro);
      }

      // Open the macro editor
      var editor = new base.MacroEditor({
        model: t.macros.get(name),
        onSave: function() {t.saveMacros();},
        onClose: function() {t.loadMacros(); t.input.focus();},
        el:$('#canvas')
      });
      editor.render();
    },

    // Process an internal command
    processInternal: function(cmd, line){
      var t = this;
      switch (cmd) {
        case '.help':
          t.printHelp();
          break;
        case '.history':
          t.printHistory();
          break;
        case '.exit':
          t.monitor.disconnect();
          break;
        case '.sh':
          t.monitor.control('sh', line.substr(4));
          return;
        case '.run':
          t.runMacro(line.substr(5));
          return;
        case '.clear':
          delete localStorage[STORAGE_KEY_CONSOLE];
          t.sessionHistoryItems = [];
          break;
        case '.edit':
          t.editMacro(line.substr(6));
          break;
        case '.list':
          t.printMacros(line.substr(6));
          break;
      }
      // Bring back the cursor
      t.consoleOut(PROMPT);
    },

    // Add the specified item to shared history
    addHistoryItem: function(item){
      var t = this;

      // No need to add .history to history
      if (item === '.history') {
        return;
      }

      // Fetch the current model and remove the existing item
      var items = t.getHistoryItems();
      for (var i = 0, l = items.length; i < l; i++) {
        if (items[i] === item) {
          items.splice(i--,1);
        }
      }

      // Add and assure max length
      items.splice(0,0,item);
      if (items.length > MAX_HISTORY_ITEMS) {
        items.splice(MAX_HISTORY_ITEMS - 1, 1);
      }
      localStorage[STORAGE_KEY_CONSOLE] = JSON.stringify(items);
    },

    // Get all history items
    getHistoryItems: function() {
      var items_str = localStorage[STORAGE_KEY_CONSOLE] || '[]';
      try {
        var items = JSON.parse(items_str);
        if (!Array.isArray(items)) {
          items = [];
        }
      } catch (e){
        items = [];
      }
      return items;
    },

  });

  // Custom settings form for the Text view
  Repl.SettingsView = Backbone.View.extend({

    initialize: function(options) {
      var t = this;
    },

    render: function() {
      var t = this;
      t.monitor = t.options.monitor;
      t.$el.html('' +
        '<div class="nm-base-probe-input">' +
          '<label>Server</label>' +
          '<div class="server nm-base-probe-sel"></div>' +
        '</div>');

      // Append a server picker
      t.serverPicker = new UI.MonitorPicker.ServerView({
        el: t.$el.find('.server'),
        model: t.monitor
      });
      t.serverPicker.render();

    },

  });

}(this));
