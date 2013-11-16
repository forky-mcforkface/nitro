Base         = require 'base'
Lists        = require '../views/lists'
TaskItem     = require '../views/task_item'
Task         = require '../models/task'
List         = require '../models/list'
Setting      = require '../models/setting'
keys         = require '../utils/keys'
dateDetector = require '../utils/date'
delay        = require '../utils/timer'

class Tasks extends Base.View

  template:
    item:     require '../templates/task'
    message: require '../templates/tasks'

  elements:
    'ul.tasks': 'tasks'
    'input.new-task': 'input'

  events:
    'click': 'collapseOnClick'
    'scroll': 'scrollbars'
    'keydown input.new-task': 'createNew'

  constructor: ->
    Base.touchify @events
    super

    @bind $ '.main'

    # Store currently loaded tasks
    @views = []
    @timers = {}

    @currentTask

    @listen [
      Task,
        'refresh': @refresh
        'create:model': @addOne
      List,
        'select:model': @render
      Setting,
        'change:sort': @render
    ]

  # Listen to events on the task item view
  bindTask: (view) =>
    view.on 'select', =>
      # Collapse the last open view
      @collapse()
      @currentTask = view

  # Add a single task to the DOM
  addOne: (task) =>
    # return unless List.current.id in [task.list, 'all']

    # Create a new view
    view = new TaskItem
      task: task

    # Add to dom
    @tasks.prepend view.render().el

    # Bind events
    @bindTask(view)

    # TODO: Can we do this in the template?
    # view.el.addClass 'new'

    @views.push view

    # TODO: Set up a method for this
    @el.removeClass 'empty'


  # Render the current list
  refresh: =>
    @render List.current if List.current


  # Display a list of tasks
  render: (list) =>

    # TODO: Move this somewhere else. Going to ignore it for now.
    @el.removeClass 'empty'
    @el.find('.message').remove()

    # TODO: Re-implement sorting
    # if @list.disabled
    #     $(@el[1]).sortable({ disabled: true })
    # else
    #   if not Setting.sort
    #     $(@el[1]).sortable({ disabled: false })

    # Disable task input box
    @input.toggle not list.disabled

    # Keep a copy of the old views
    oldViews = @views.slice()
    @views = []

    # Unbind existing tasks
    delay 1000, ->
      item.release() for item in oldViews

    # Holds html
    html = ''

    # Special list
    if list.id is 'filter'
      tasks = list.tasks
      @el.append @template.message.special

    # Standard list
    else if list?.tasks
      tasks = list.tasks
      @el.append @template.message.standard

    # Empty list
    else
      tasks = Task.list(list.id)
      @el.append @template.message.empty

    # TODO: Ignore this for now
    # Sorting tasks
    # if list.id in ['all', 'completed'] or Setting.sort
    if false

      tasks = Task.sortTasks(tasks)
      last = tasks[0]?.priority
      completed = tasks[0]?.completed

      for task in tasks

        # Add seperator if it is completed and the last one wasn't
        if completed and not task.completed
          completed = false
          task.group = yes

        # Add seperator if it is a different priority to the last one
        if not completed and task.priority isnt last
          task.group = yes

        last = task.priority

        if list.id is 'all'
          task.listName = List.get(task.list).name

        # Append html
        html = @template(task) + html

    # Not sorting
    else
      tasks.forEach (task) =>
        # if list.id is 'all' then task.listName = List.get(task.list).name
        html += @template.item task

    @tasks.html html

    delay 400,  =>
      tasks.forEach (task) =>
        view = new TaskItem
          task: task
          el: @tasks.find "#task-#{ task.id }"
        @bindTask view
        @views.push view

    # Handles Empty List
    if tasks.length is 0
      @el.addClass 'empty'

    # Focuses input if not on a touchscreen (virtual keyboard)
    # TODO: Don't make is_touch_device a global
    @input.focus() if !is_touch_device()

  # Create a new task
  createNew: (e) =>
    if e.keyCode is keys.enter and @input.val().length
      name = @input.val()
      @input.val ''
      Task.create
        name: name
        list: @currentList?.id
        date: dateDetector.parse name

  # ------------
  # COLLAPSE ALL
  # ------------

  collapse: =>
    @currentTask.collapse() if @currentTask

    # TODO: fix
    # if not List.current.disabled
    #   if Setting.sort
    #     @el.find('.expanded').draggable({ disabled: false })
    #   else
    #     @el.find('.expanded').parent().sortable({ disabled: false })

  # Collapsing of tasks
  collapseOnClick: (e) =>
    if e.target.className is 'main tasks'
      @collapse()

  # TODO: Check
  scrollbars: (e) =>
    target = $(e.currentTarget)
    target.addClass('show')

    clearTimeout(@scrollbarTimeout)
    @scrollbarTimeout = setTimeout ->
      target.removeClass('show')
    , 1000

  # TODO: Refactor this
  setupDraggable: ->
    $('body').on 'mouseover', '.main .task', ->
      if Setting.sort and
      not $(this).hasClass('ui-draggable') and
      not List.current.disabled

        $(this).draggable
          distance: 10
          scroll: false
          cursorAt:
            top: 15
            left: 30
          helper: (event, task) ->
            id = $(task).attr('id')
            element = "<div data-id=\'#{
              id }\' class=\'helper\'>#{
              $(this).find('.name').text() }</div>"
            $('body').append(element)
            $("[data-id=#{ id }]")


  # TODO: Refactor this
  setupSortable: ->
    self = this
    $(this.el[1]).sortable
      distance: 10
      scroll: false
      cursorAt:
        top: 15
        left: 30
      helper: (event, task) ->
        id = $(task).attr('id')
        element = "<div data-id=\'#{
          id }\' class=\'helper\'>#{
          $(task).find('.name').text() }</div>"
        $('body').append(element)
        $("[data-id=#{ id }]")
      update: ( event, ui ) ->
        arr = []
        $(this).children().each (index) ->
          arr.unshift $(this).attr('id').slice(5)
        self.list.updateAttribute('tasks', arr)

module.exports = Tasks
