// @flow
import SyncQueue from '../models/syncQueue.js'
import SyncGet from '../models/syncGet.js'
import Events from './events.js'
import { ListsCollection } from './listsCollection.js'
import { TasksCollection } from './tasksCollection.js'
import authenticationStore from '../stores/auth.js'
import { log } from '../helpers/logger.js'

const systemLists = ['inbox', 'today', 'next', 'all']

// helpers
export class combined extends Events {
  constructor() {
    super()
    // sets up the syncs here, just for greater control
    // also reduces dependencies
    this.listsQueue = new SyncQueue({
      identifier: 'lists',
      endpoint: 'lists',
      arrayParam: 'lists',
      model: ListsCollection,
      serverParams: ['name', 'notes']
    })
    ListsCollection.setSync(this.listsQueue)
    this.tasksQueue = new SyncQueue({
      identifier: 'tasks',
      endpoint: 'lists',
      arrayParam: 'tasks',
      parentModel: ListsCollection,
      model: TasksCollection,
      serverParams: ['name', 'notes']
    })
    TasksCollection.setSync(this.tasksQueue)

    this.syncGet = new SyncGet({
      lists: ListsCollection,
      tasks: TasksCollection
    })

    const handleProcess = function() {
      if (authenticationStore.isSignedIn()) {
        log('requested process: implement scheduler')
        this.processQueue()
      }
    }

    this.listsQueue.bind('request-process', handleProcess)
    this.tasksQueue.bind('request-process', handleProcess)

    authenticationStore.bind('token', this.downloadData)
    TasksCollection.bind('update', this._updateEvent('tasks'))
    ListsCollection.bind('update', this._updateEvent('lists'))
  }
  _updateEvent(key: string) {
    return () => {
      this.trigger('update', key)
    }
  }
  downloadData = () => {
    this.syncGet.downloadLists().then(data => {
      this.syncGet.updateLocal(data)
    })
  }
  addTask(task: Object): Object | null {
    const list = ListsCollection.find(task.list)
    if (list === null) {
      throw new Error('List could not be found')
    }
    const order = list.localOrder
    const id = TasksCollection.add(task)
    order.unshift(id)
    this.updateOrder(task.list, order, false)
    return this.getTask(id)
  }
  getTask(id: string, server: ?boolean): Object | null {
    const task = TasksCollection.find(id, server)
    if (task === null) {
      return null
    }
    return task.toObject()
  }
  getTasks() {}
  updateTask(id: string, newProps: Object): Object {
    const task = TasksCollection.update(id, newProps)
    if (task === null) {
      throw new Error('Task could not be found')
    }
    return task
  }
  deleteTask(id: string, server: ?boolean) {
    const task = this.getTask(id, server)
    if (task === null) {
      throw new Error('Task could not be found')
    }
    const order = ListsCollection.find(task.list).localOrder
    order.splice(order.indexOf(task.id), 1)
    this.updateOrder(task.list, order, false)
    TasksCollection.delete(task.id)
  }
  updateOrder(id: string, order: Array<string>, sync: bool = true) {
    const resource = ListsCollection.find(id)

    // updates the local order, then the server order
    resource.localOrder = order
    resource.order = order
      .map(localId => {
        return TasksCollection.find(localId).serverId
      })
      .filter(item => item !== null)

    ListsCollection.trigger('order')
    ListsCollection.saveLocal()
    if (sync) ListsCollection.sync.patch(id)
  }
  addList(props: Object, sync: ?bool): Object {
    const newList = ListsCollection.add(props, sync)
    return newList.toObject()
  }
  getList(listId: string, serverId: ?bool): Object | null {
    let list = ListsCollection.find(listId, serverId)
    if (list === null) {
      return null
    }
    list = list.toObject()
    list.name = ListsCollection.escape(list.name)
    return list
  }
  getLists(): Array<Object> {
    const lists = []
    ListsCollection.all().forEach(list => {
      list = list.toObject()
      list.name = ListsCollection.escape(list.name)
      list.count = TasksCollection.findListCount(list.id)
      lists.push(list)
    })
    return lists
  }
  deleteList(listId: string, serverId: ?bool) {
    if (systemLists.indexOf(listId) !== -1) {
      throw new Error('Not allowed to delete system lists.')
    }
    const list = this.getList(listId, serverId)
    if (list === null) {
      throw new Error('List could not be found.')
    }
    TasksCollection.deleteAllFromList(list.id)
    ListsCollection.delete(list.id)
  }
}
export let CombinedCollection = new combined()
