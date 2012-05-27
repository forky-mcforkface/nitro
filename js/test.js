/* Nitro Core
 *
 * Copyright (C) 2012 Caffeinated Code <http://caffeinatedco.de>
 * Copyright (C) 2012 Jono Cooper
 * Copyright (C) 2012 George Czabania
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * Neither the name of Caffeinated Code nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

//Session Vars
sessionStorage.setItem('selected', sessionStorage.getItem('selected') || 'today');

//When everything is ready
$(document).ready(function() {
	//Cache Selectors
	ui.initLoad();
	ui.reload();
});

var ui = {
	initLoad: function() {
		//Buttons
		$('#smartlists').html('<h2>Focus</h2><ul></ul>');
		ui.lists.draw('today');
		ui.lists.draw('next');
		ui.lists.draw('all');

		$$.document.append(ui.buttons.taskAddBTN, $('#tasks .panel'));

		//Splitter
		$('#content').splitter({sizeLeft: true});
		var height = $(window).height(),
			width = $(window).width()

		$(window).resize(function() {
			//Causes lag without it?
			if (height != $(window).height() || width != $(window).width()) {
				//Redefines
				height = $(window).height(),
				width = $(window).width()

				$('#content').trigger('resize');
			}
		});
	},
	reload: function() {
		//Populates Template
		$('#lists').html('<h2>Lists</h2><ul></ul>');
		$$.document.append(ui.buttons.listAddBTN, $('#lists h2'));
		for (var i=0; i<core.storage.lists.order.length; i++) {
			ui.lists.draw(core.storage.lists.order[i]);
		}
		//Simulates Click on selected list
		$('#L' + sessionStorage.getItem('selected')).click();
	},
	lists: {
		//Draws a list to the DOM
		draw: function(listId) {
			if (typeof(listId) == 'string') {
				var obj = $$(ui.templates.listTemplate, {id: listId, name: listId});
				$$.document.append(obj, $('#smartlists ul'));
			} else {
				var obj = $$(ui.templates.listTemplate, {id: listId, name: core.storage.lists.items[listId].name});
				$$.document.append(obj, $('#lists ul'));
			}
						
			$(obj.view.$()).attr('id', 'L' + obj.model.get('id'))
		}
	},
	templates: {
		taskTemplate: $$(new Object, '<li data-bind="content"></li>', {
			'click &': function() {
				$('#tasks .selected').removeClass('selected');
				$(this.view.$()).addClass('selected');
			},
			'dblclick &': function() {
				//Cache the selector
				var view = $(this.view.$()); 

				//Checks if it's expanded & if it isn't expand it.
				if (!view.hasClass('expanded')) {
					view.addClass('expanded').height(view.height() + view.removeClass('selected').html('New Task<br><div class="hidden">Something<br>Something Else<br>Bleh</div>').children('.hidden').show(0).height());
				} else {
					//Collapses
					view.removeClass('expanded').css('height', '');
					setTimeout(function() {
						view.children('.hidden').remove()
					}, 150);
				}
			}
		}),
		listTemplate: $$(new Object, '<li data-bind="name"></li>', {
			'click &': function() {
				//Selected List
				sessionStorage.setItem('selected', this.model.get('id'));
				$('#sidebar .selected').removeClass('selected');
				$(this.view.$()).addClass('selected');

				//Gets list id & populates
				$('#tasks .content').html('<h2>' + this.model.get('name') + '</h2><ul></ul>')
				var tasks = core.list(this.model.get('id')).populate();

				//Loops and adds each task to a tmp view
				var tmpView = $$(new Object);
				for (var i=0; i<tasks.length; i++) {
					tmpView.append($$(ui.templates.taskTemplate, {id: tasks[i], content: core.storage.tasks[tasks[i]].content}));
				}
				$$.document.append(tmpView, $('#tasks ul'));
			}
		})
	}, 
	buttons: {
		//Buttons
		listAddBTN: $$({name: 'Add List'}, '<button data-bind="name"/>', {
			'click &': function() {
				//Adds a list with the core
				var listId = core.list().add('New List');
				ui.lists.draw(listId);

				//Selects List
				$('#L' + listId).click();
			}
		}),
		taskAddBTN: $$({name: 'Add Task'}, '<button data-bind="name"/>', {
			'click &': function() {
				if (sessionStorage.getItem('selected') != 'all') {
					//Adds a task with the core
					var taskId = core.task().add('New Task', sessionStorage.getItem('selected'));
					$$.document.append($$(ui.templates.taskTemplate, {id: taskId, content: core.storage.tasks[taskId].content}), $('#tasks ul'));
				}		
			}
		})
	}
}